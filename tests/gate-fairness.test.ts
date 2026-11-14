import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateGateChecks,
  calculateNextAdCost,
  calculateUsualVisitorsPerSecond,
  calculateVisitorsPerSecond,
  createInitialGameState,
  createPlaytestState,
  ERAS_BY_ID,
  isEraGateComplete,
  isVisitorsGoalBlockedByAds,
} from '../src/engine';
import type { GameState, Popup } from '../src/engine';
import { AI_ERA_ADS, BANNER_ADS, CONTEXTUAL_TEXT_ADS, PROGRAMMATIC_ADS, RETARGETED_ADS, SPONSORED_POSTS, TEXT_ADS } from '../src/ui/presentation';
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

describe('every ad slot has its own ad', () => {
  /** Found by the browser sweep: a full 2005 sidebar ran the same AJAX book twice. */
  it('has as many ad lines as the era that uses them has slots', () => {
    const lists: readonly (readonly [string, readonly unknown[], number])[] = [
      ['1997 banners', BANNER_ADS, ERAS_BY_ID['homepage-1997'].maxAds],
      ['2005 text ads', TEXT_ADS, ERAS_BY_ID['web2-2005'].maxAds],
      ['2005 contextual ads', CONTEXTUAL_TEXT_ADS, ERAS_BY_ID['web2-2005'].maxAds],
      ['2011 sponsored posts', SPONSORED_POSTS, ERAS_BY_ID['social-2011'].maxAds],
      ['2018 programmatic ads', PROGRAMMATIC_ADS, ERAS_BY_ID['platform-2018'].maxAds],
      ['retargeted ads, 2018 and 2024', RETARGETED_ADS, ERAS_BY_ID['ai-2024'].maxAds],
      ['2024 ads', AI_ERA_ADS, ERAS_BY_ID['ai-2024'].maxAds],
    ];
    lists.forEach(([name, ads, slots]) => assert.ok(ads.length >= slots, `${name}: ${ads.length} lines for ${slots} slots`));
  });
});
