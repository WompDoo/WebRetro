import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  BUFFS_BY_ID,
  calculateKeystrokeValue,
  calculateUsualVisitorsPerSecond,
  calculateVisitorsPerSecond,
  coolDown,
  createPlaytestState,
  findBuff,
  HEAT_COOLING_PER_SECOND,
  HEAT_IDLE_GRACE_MS,
  HEAT_LOST_PER_TYPO,
  HEAT_PER_CLEAN_KEYSTROKE,
  heatUp,
  isBuffActive,
  startBuff,
  tickBuffs,
} from '../src/engine';
import type { GameState } from '../src/engine';
import { renderBuffChips } from '../src/ui/render-buffs';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 67;
const ALMOST_FULL = 1 - HEAT_PER_CLEAN_KEYSTROKE / 2;
const ON_FIRE_MS = BUFFS_BY_ID['on-fire'].durationMs;

const playing = (): GameState => ({ ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] });

describe('the heat meter', () => {
  it('warms with every clean keystroke and cools with a typo', () => {
    const warmer = heatUp(playing(), 'clean-line');
    assert.equal(warmer.typingHeat, HEAT_PER_CLEAN_KEYSTROKE);
    const cooled = heatUp({ ...playing(), typingHeat: 0.5 }, 'bugged-line');
    assert.equal(cooled.typingHeat, 0.5 - HEAT_LOST_PER_TYPO);
    assert.equal(heatUp(playing(), 'bugged-line').typingHeat, 0, 'never below empty');
  });

  it('sets you on fire when it fills, and empties', () => {
    const lit = heatUp({ ...playing(), typingHeat: ALMOST_FULL }, 'clean-line');
    assert.ok(isBuffActive(lit, 'on-fire'));
    assert.equal(lit.typingHeat, 0);
  });

  it('doesn’t feed the fire while you’re on fire', () => {
    const burning = startBuff(playing(), 'on-fire');
    assert.equal(heatUp(burning, 'clean-line').typingHeat, 0);
  });

  it('cools only after a breath without typing', () => {
    const warm = { ...playing(), typingHeat: 0.5, msSinceKeystroke: 0 };
    assert.equal(coolDown(warm, HEAT_IDLE_GRACE_MS).typingHeat, 0.5, 'a pause is fine');
    const cooled = coolDown(warm, HEAT_IDLE_GRACE_MS + 1_000);
    assert.ok(Math.abs(cooled.typingHeat - (0.5 - HEAT_COOLING_PER_SECOND)) < 1e-9);
  });
});

describe('buffs', () => {
  it('on fire triples what a keystroke pays', () => {
    const base = playing();
    assert.ok(Math.abs(calculateKeystrokeValue(startBuff(base, 'on-fire')) - calculateKeystrokeValue(base) * 3) < 1e-6);
  });

  it('starting one again starts it over, never stacks', () => {
    const twice = startBuff(tickBuffs(startBuff(playing(), 'on-fire'), 10_000), 'on-fire');
    assert.equal(twice.buffs.length, 1);
    assert.equal(findBuff(twice, 'on-fire')?.remainingMs, ON_FIRE_MS);
  });

  it('run down while you play', () => {
    const after = advanceSimulation(startBuff(playing(), 'on-fire'), ON_FIRE_MS, 'live').state;
    assert.equal(isBuffActive(after, 'on-fire'), false);
  });

  it('never pay for time away: an offline catch-up drops them', () => {
    const boosted = startBuff(playing(), 'quick-fix');
    const away = advanceSimulation(boosted, 60 * 60_000, 'offline');
    const plain = advanceSimulation({ ...boosted, buffs: [] }, 60 * 60_000, 'offline');
    assert.equal(away.state.money, plain.state.money);
    assert.equal(away.state.buffs.length, 0);
  });

  it('are luck, not size: the checklist’s usual-day visitors ignore them', () => {
    const base = playing();
    const boosted = startBuff(base, 'quick-fix');
    assert.ok(calculateVisitorsPerSecond(boosted) > calculateVisitorsPerSecond(base));
    assert.equal(calculateUsualVisitorsPerSecond(boosted), calculateUsualVisitorsPerSecond(base));
  });
});

describe('the buff chips', () => {
  it('say what each buff does and how long it has left', () => {
    const html = renderBuffChips(startBuff(startBuff(playing(), 'on-fire'), 'quick-fix'));
    assert.match(html, /<b>On fire<\/b> ×3 typing · <span data-buff-time="on-fire">30 s<\/span>/);
    assert.match(html, /<b>Quick fix<\/b> \+15% visitors · <span data-buff-time="quick-fix">60 s<\/span>/);
    assert.equal(renderBuffChips(playing()), '');
  });
});
