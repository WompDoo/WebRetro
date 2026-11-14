import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateGateChecks,
  calculateNextAdCost,
  calculateUsualVisitorsPerSecond,
  calculateVisitorsPerSecond,
  createInitialGameState,
  createPlaytestState,
  isEraGateComplete,
  isVisitorsGoalBlockedByAds,
} from '../src/engine';
import type { GameState, Popup } from '../src/engine';
import { renderTip } from '../src/ui/render-goal';
import { QUIET_HAZARDS } from './quiet-hazards';

/**
 * Found by playing the whole game as different kinds of player (sim/player-types.ts): a casual player, who takes half
 * a minute to close a pop-up, never left 1997. Late in an era traffic levels off, and the checklist counted live
 * visitors, so a pop-up or two held it under the goal for good. These are the rules that fixed it.
 */

const SEED = 54;
const end1997 = (): GameState => ({ ...createPlaytestState('homepage-1997', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, popups: [], infections: [] });

const FIRST_TEST_POPUP_ID = 900;

function openPopups(state: GameState, count: number): GameState {
  const popups: readonly Popup[] = Array.from({ length: count }, (_, index) => ({ id: FIRST_TEST_POPUP_ID + index, variantRoll: 0, anchorX: 0.5, anchorY: 0.5 }));
  return { ...state, popups };
}

/** The end of 1997 with one ad too many: the visitors goal just out of reach. */
function oneAdTooMany(): GameState {
  const target = calculateGateChecks(end1997()).find((check) => check.requirement.kind === 'visitors-per-second')?.requirement.target ?? 0;
  const counts = Array.from({ length: 40 }, (_, index) => end1997().adCount + index);
  const adCount = counts.find((count) => calculateUsualVisitorsPerSecond({ ...end1997(), adCount: count }) < target) ?? 0;
  return { ...end1997(), adCount };
}

describe('the checklist counts the site, not the moment', () => {
  it('counts visitors on a usual day: open pop-ups cost visitors, not the checklist', () => {
    const withPopups = openPopups(end1997(), 5);
    assert.ok(calculateVisitorsPerSecond(withPopups) < calculateVisitorsPerSecond(end1997()));
    assert.equal(calculateUsualVisitorsPerSecond(withPopups), calculateUsualVisitorsPerSecond(end1997()));
    assert.ok(isEraGateComplete(withPopups));
  });

  it('leaves out an expired certificate and a traffic spike too: trouble and luck both pass', () => {
    const usual = calculateUsualVisitorsPerSecond(end1997());
    assert.equal(calculateUsualVisitorsPerSecond({ ...end1997(), isCertificateExpired: true }), usual);
    assert.equal(calculateUsualVisitorsPerSecond({ ...end1997(), trafficSpikeRemainingMs: 30_000 }), usual);
  });
});

describe('an ad too many', () => {
  it('is spotted when one fewer ad would meet the visitors goal', () => {
    const state = oneAdTooMany();
    assert.ok(isVisitorsGoalBlockedByAds(state));
    assert.ok(!isVisitorsGoalBlockedByAds(end1997()));
    assert.ok(!isVisitorsGoalBlockedByAds({ ...state, adCount: 0 }));
  });

  it('gets a tip that says which button fixes it', () => {
    assert.match(renderTip(oneAdTooMany()), /with one fewer, you’d reach it/);
  });
});

describe('the first banner', () => {
  it('is free, as 1997’s banner exchanges were; the second costs money', () => {
    const fresh = createInitialGameState(SEED);
    assert.equal(calculateNextAdCost(fresh), 0);
    assert.ok(calculateNextAdCost({ ...fresh, adCount: 1 }) > 0);
  });
});
