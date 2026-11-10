import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { closePopup, createInitialGameState, fallForPopupScam, getAvailableSkillIds, POPUP_SCAM_MONEY_SHARE } from '../src/engine';
import type { GameState } from '../src/engine';

const MONEY = 1_000;
const withPopup = (): GameState => ({
  ...createInitialGameState(1),
  money: MONEY,
  popups: [{ id: 5, variantRoll: 0.1, anchorX: 0.2, anchorY: 0.3 }],
});

describe('pop-up scams', () => {
  it('costs a share of your money and closes the pop-up', () => {
    const result = fallForPopupScam(withPopup(), 5);
    assert.equal(result.moneyLost, MONEY * POPUP_SCAM_MONEY_SHARE);
    assert.equal(result.state.money, MONEY - MONEY * POPUP_SCAM_MONEY_SHARE);
    assert.equal(result.state.popups.length, 0);
  });

  it('does nothing for a pop-up that is already gone', () => {
    const state = withPopup();
    assert.deepEqual(fallForPopupScam(state, 99), { state, moneyLost: 0 });
  });

  it('closing a pop-up the safe way is free', () => {
    assert.equal(closePopup(withPopup(), 5).money, MONEY);
  });
});

describe('2005 curriculum', () => {
  it('starts with CSS, because you arrive knowing only tables', () => {
    const arrived: GameState = { ...createInitialGameState(1), eraId: 'web2-2005' };
    const skills = getAvailableSkillIds(arrived);
    assert.ok(skills.includes('learn-css'));
    assert.ok(skills.includes('web2-design'));
  });
});
