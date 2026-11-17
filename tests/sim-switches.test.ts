import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, offerPlaytestOpportunity, startBuff } from '../src/engine';
import { applySwitches, isSwitchedOffPurchase, readSwitchedOff } from '../sim/switches';

const busy = () => offerPlaytestOpportunity(startBuff(startBuff({ ...createPlaytestState('web2-2005', 'end', 5, 'react'), typingHeat: 0.5 }, 'on-fire'), 'sponsor-slot'), 'launch-day');

describe('the sim’s switches for measuring a system', () => {
  it('read SIM_WITHOUT, ignoring what isn’t a system', () => {
    assert.deepEqual([...readSwitchedOff(' fire,hires , nonsense')].sort(), ['fire', 'hires']);
    assert.equal(readSwitchedOff(undefined).size, 0);
  });

  it('without fire: no heat and no on-fire buff, the rest untouched', () => {
    const state = applySwitches(busy(), readSwitchedOff('fire'));
    assert.equal(state.typingHeat, 0);
    assert.deepEqual(state.buffs.map((buff) => buff.id), ['sponsor-slot']);
    assert.notEqual(state.opportunity, null);
  });

  it('without offers: no offer, none coming, and no offer buffs', () => {
    const state = applySwitches(busy(), readSwitchedOff('offers'));
    assert.equal(state.opportunity, null);
    assert.ok(state.opportunityCountdownMs > 1e12);
    assert.deepEqual(state.buffs.map((buff) => buff.id), ['on-fire']);
  });

  it('without hires: the bot never sees one in the shop', () => {
    assert.equal(isSwitchedOffPurchase('hire-junior-developer', readSwitchedOff('hires')), true);
    assert.equal(isSwitchedOffPurchase('view-source', readSwitchedOff('hires')), false);
    assert.equal(isSwitchedOffPurchase('hire-junior-developer', readSwitchedOff('')), false);
  });
});
