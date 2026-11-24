import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  advanceSimulation,
  calculateRetirementPayout,
  calculateStartingFund,
  calculateUpgradeCost,
  createPlaytestState,
  ERAS_BY_ID,
  getAvailableSkillIds,
  isEraGateComplete,
  REDIRECT_MS,
  restoreGameState,
  SAVE_VERSION,
  STARTING_FUND_SHARE,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { GameState } from '../src/engine';
import { findEntryStory } from '../src/ui/presentation';
import { listChipTimes, renderBuffChips } from '../src/ui/render-buffs';
import { renderRelaunchStory } from '../src/ui/relaunch-story';
import { QUIET_HAZARDS } from './quiet-hazards';

/**
 * A relaunch used to keep everything you'd saved plus the trade-in in one lump, and the new era's first minutes were a
 * shopping spree. Now you start most of the way to the new era's first skill, and the trade-in arrives as the retired
 * features' old links redirect to the new site, over its first ten minutes.
 */

const SEED = 41;
const RICH = 1e18;
const HALF = 0.5;
const PRECISION = 1e-6;

/** What each feature earned: a playtest jump starts with no history, and the trade-in is a share of it. */
const EARNED_PER_FEATURE = 1e12;

function ready(money: number): GameState {
  const state = { ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS };
  const featureEarnings = Object.fromEntries(Object.keys(state.featureEarnings).map((id) => [id, EARNED_PER_FEATURE])) as GameState['featureEarnings'];
  return { ...state, featureEarnings, money: ERAS_BY_ID['web2-2005'].migrationCost + money };
}

function cheapestNewSkill(state: GameState): number {
  const prices = getAvailableSkillIds(state).filter((id) => UPGRADES_BY_ID[id].eraId === state.eraId).map((id) => calculateUpgradeCost(state, id));
  return Math.min(...prices);
}

const isClose = (actual: number, expected: number): boolean => Math.abs(actual - expected) <= Math.abs(expected) * PRECISION;

describe('the money a relaunch keeps', () => {
  it('is most of the way to the new era’s first skill, however much you saved', () => {
    const before = ready(RICH);
    assert.ok(isEraGateComplete(before));
    const after = advanceEra(before);
    assert.equal(after.eraId, 'social-2011');
    assert.ok(isClose(after.money, cheapestNewSkill(after) * STARTING_FUND_SHARE), `${after.money}`);
    assert.equal(calculateStartingFund(after), after.money);
  });

  it('is all of it when you saved less than that', () => {
    const entered = advanceEra(ready(0));
    const small = calculateStartingFund(entered) * HALF;
    assert.ok(isClose(advanceEra(ready(small)).money, small));
  });
});

describe('the trade-in', () => {
  const before = ready(0);
  const tradeIn = calculateRetirementPayout(before, 'social-2011');
  const after = advanceEra(before);

  it('arrives as the old links redirect, over the new era’s first ten minutes', () => {
    assert.ok(tradeIn > 0, 'something retires in 2011');
    assert.equal(after.redirects.remainingMs, REDIRECT_MS);
    assert.ok(isClose(after.redirects.perSecond * (REDIRECT_MS / 1000), tradeIn));
  });

  it('pays all of it and no more, live or away', () => {
    const quiet = { ...after, hazardCountdownsMs: QUIET_HAZARDS };
    const withoutRedirects = { ...quiet, redirects: { perSecond: 0, remainingMs: 0 } };
    const doubleWindow = REDIRECT_MS * 2;
    const paid = advanceSimulation(quiet, doubleWindow, 'offline').state.lifetimeEarnings - advanceSimulation(withoutRedirects, doubleWindow, 'offline').state.lifetimeEarnings;
    assert.ok(isClose(paid, tradeIn), `${paid} vs ${tradeIn}`);
    assert.equal(advanceSimulation(quiet, doubleWindow, 'offline').state.redirects.remainingMs, 0);
  });

  it('carries over to the next relaunch whatever it hadn’t paid yet', () => {
    const perSecond = 1e6;
    const endOf2011 = { ...createPlaytestState('social-2011', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS };
    const halfway = { ...endOf2011, money: ERAS_BY_ID['social-2011'].migrationCost + RICH, redirects: { perSecond, remainingMs: REDIRECT_MS / 2 } };
    assert.ok(isEraGateComplete(halfway));
    const owed = perSecond * (REDIRECT_MS / 2 / 1000);
    const again = advanceEra(halfway);
    assert.equal(again.eraId, 'platform-2018');
    assert.ok(isClose(again.redirects.perSecond * (REDIRECT_MS / 1000), owed + calculateRetirementPayout(halfway, 'platform-2018')));
  });
});

describe('a save from before redirects', () => {
  it('has none running', () => {
    const { redirects: _dropped, ...older } = ready(0);
    const restored = restoreGameState({ ...older, saveVersion: SAVE_VERSION }, SEED);
    assert.ok(restored !== null);
    assert.deepEqual(restored.redirects, { perSecond: 0, remainingMs: 0 });
  });
});

describe('the relaunch card', () => {
  it('says what you’ll start with, and that savings past it go into the move', () => {
    const story = findEntryStory('web2-2005', 'social-2011');
    assert.ok(story !== null);
    const card = renderRelaunchStory(ready(RICH), 'social-2011', story);
    assert.match(card, /You start 2011 with \$[\d.]+[KMBT]?\./);
    assert.match(card, /run over budget/);
    assert.doesNotMatch(renderRelaunchStory(ready(0), 'social-2011', story), /run over budget/, 'nothing saved past it: no warning');
  });
});

describe('the redirects chip', () => {
  it('shows what the old links pay and for how long, while they pay', () => {
    const state = { ...advanceEra(ready(0)), redirects: { perSecond: 2_500_000, remainingMs: REDIRECT_MS } };
    assert.match(renderBuffChips(state), /Old links redirect<\/b> \+\$2\.50M\/s/);
    assert.deepEqual(listChipTimes(state).find(([key]) => key === 'redirects'), ['redirects', '10:00']);
    assert.doesNotMatch(renderBuffChips({ ...state, redirects: { perSecond: 0, remainingMs: 0 } }), /Old links/);
  });
});
