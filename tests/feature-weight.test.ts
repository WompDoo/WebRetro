import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateFeatureVisitorsPerLevel,
  calculateFeatureWeightPerLevelKb,
  calculateNextFeatureCost,
  calculatePageWeightKb,
  calculateRefactorChurnShare,
  calculateRefactorCost,
  calculateSunsetTradeIn,
  createPlaytestState,
  FEATURES_BY_ID,
  HEAVY_FEATURE_FROM_LEVEL,
  calculateFeatureLevelsNetVisitors,
  FEATURE_IDS,
  isFeatureTooHeavy,
  isRefactorOffered,
  isSunsetOffered,
  SUNSET_SKILL,
  REFACTOR_CHURN_SHARE,
  REFACTOR_WEIGHT_FACTOR,
  refactorFeature,
  restoreGameState,
  SAVE_VERSION,
  sunsetLevel,
} from '../src/engine';
import type { EraId, FeatureId, GameState } from '../src/engine';
import { renderTip } from '../src/ui/render-goal';
import { QUIET_HAZARDS } from './quiet-hazards';

/**
 * A slow page gets lighter the way real ones do. Refactor a heavy feature: every level stays and weighs half, and the
 * bugs a rewrite ships drive some of its users off for good, fewer with tests and reviews. Or sunset a level: it leaves
 * with its visitors and pays a trade-in back.
 */

const SEED = 41;
const RICH = 1e300;
const GALLERY: FeatureId = 'photo-gallery';
/** Enough photos that the first load is mostly gallery. */
const HUGE_GALLERY = 400;
const ONE_LEVEL = 1;

function withGallery(eraId: EraId, level: number, money = RICH): GameState {
  const state = { ...createPlaytestState(eraId, 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, money };
  return { ...state, featureLevels: { ...state.featureLevels, [GALLERY]: level } };
}

const heavy = (): GameState => withGallery('social-2011', HUGE_GALLERY);
const withoutQa = (state: GameState): GameState => ({
  ...state,
  purchasedUpgradeIds: state.purchasedUpgradeIds.filter((id) => !['unit-tests', 'code-review', 'e2e-tests', 'ai-written-tests'].includes(id)),
});

describe('refactoring a heavy feature', () => {
  it('keeps every level, halves what each weighs, and loses some of its users to the bugs', () => {
    const state = withoutQa(heavy());
    const refactored = refactorFeature(state, GALLERY);
    assert.equal(refactored.featureLevels[GALLERY], HUGE_GALLERY);
    assert.equal(calculateFeatureWeightPerLevelKb(refactored, GALLERY), FEATURES_BY_ID[GALLERY].pageWeightKbPerLevel * REFACTOR_WEIGHT_FACTOR);
    assert.ok(calculatePageWeightKb(refactored) < calculatePageWeightKb(state), 'a lighter page');
    const kept = calculateFeatureVisitorsPerLevel(refactored, GALLERY) / calculateFeatureVisitorsPerLevel(state, GALLERY);
    assert.ok(Math.abs(kept - (1 - REFACTOR_CHURN_SHARE)) < 1e-9, `kept ${kept}`);
  });

  it('costs three of its next level, then double each time', () => {
    const state = heavy();
    const first = calculateRefactorCost(state, GALLERY);
    assert.equal(first, calculateNextFeatureCost(state, GALLERY) * 3);
    const once = refactorFeature(state, GALLERY);
    assert.equal(once.money, state.money - first);
    assert.equal(calculateRefactorCost(once, GALLERY), first * 2);
  });

  it('waits until you can pay for it', () => {
    const poor = withGallery('social-2011', HUGE_GALLERY, 0);
    assert.equal(refactorFeature(poor, GALLERY), poor);
  });
});

describe('QA', () => {
  it('cuts the users a refactor drives off, and wins back some from refactors already done', () => {
    const refactored = refactorFeature(withoutQa(heavy()), GALLERY);
    const tested = { ...refactored, purchasedUpgradeIds: [...refactored.purchasedUpgradeIds, 'unit-tests' as const] };
    assert.ok(calculateRefactorChurnShare(tested) < calculateRefactorChurnShare(refactored));
    assert.ok(calculateFeatureVisitorsPerLevel(tested, GALLERY) > calculateFeatureVisitorsPerLevel(refactored, GALLERY), 'users come back');
  });

  it('stacks across the eras', () => {
    const state = withGallery('ai-2024', HUGE_GALLERY);
    const all = { ...state, purchasedUpgradeIds: [...withoutQa(state).purchasedUpgradeIds, 'unit-tests' as const, 'code-review' as const, 'e2e-tests' as const, 'ai-written-tests' as const] };
    assert.ok(calculateRefactorChurnShare(all) < REFACTOR_CHURN_SHARE / 4, `${calculateRefactorChurnShare(all)}`);
  });
});

describe('sunsetting a level', () => {
  it('takes one level off the page and pays half of what it costs back', () => {
    const state = heavy();
    const tradeIn = calculateSunsetTradeIn(state, GALLERY);
    const sunset = sunsetLevel(state, GALLERY);
    assert.equal(sunset.featureLevels[GALLERY], HUGE_GALLERY - ONE_LEVEL);
    assert.equal(tradeIn, calculateNextFeatureCost(sunset, GALLERY) / 2);
    assert.equal(sunset.money, state.money + tradeIn);
    assert.ok(calculatePageWeightKb(sunset) < calculatePageWeightKb(state), 'a lighter page');
  });
});

describe('when a feature counts as too heavy', () => {
  it('is exactly when its card says its weight slows the page, from level 5, in eras that weigh pages', () => {
    const state = heavy();
    assert.ok(isFeatureTooHeavy(state, GALLERY));
    FEATURE_IDS.filter((id) => state.featureLevels[id] >= HEAVY_FEATURE_FROM_LEVEL).forEach((id) => {
      assert.equal(isFeatureTooHeavy(state, id), calculateFeatureLevelsNetVisitors(state, id, 1) < 0, id);
    });
    assert.equal(isFeatureTooHeavy(withGallery('social-2011', HEAVY_FEATURE_FROM_LEVEL - 1), GALLERY), false, 'too little of it to bother');
    const homepage = createPlaytestState('homepage-1997', 'end', SEED, 'react');
    assert.ok(FEATURE_IDS.every((id) => !isFeatureTooHeavy(homepage, id)), '1997 never weighed a page');
  });

  it('offers neither refactor nor sunset on a light feature', () => {
    const light = withGallery('social-2011', HEAVY_FEATURE_FROM_LEVEL - 1);
    assert.equal(refactorFeature(light, GALLERY), light);
    assert.equal(sunsetLevel(light, GALLERY), light);
  });
});

describe('when the ways out arrive', () => {
  /** In 2005 the 1997 leftovers are what slows the page: a MIDI player brings next to nobody and still weighs. */
  const MIDI_PLAYER: FeatureId = 'midi-player';
  const in2005 = { ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, money: RICH };
  const withoutAnalytics = { ...in2005, purchasedUpgradeIds: in2005.purchasedUpgradeIds.filter((id) => id !== SUNSET_SKILL) };

  it('lets you sunset from 2005, once web analytics shows what nobody uses', () => {
    assert.ok(isFeatureTooHeavy(in2005, MIDI_PLAYER));
    assert.ok(isSunsetOffered(in2005, MIDI_PLAYER));
    assert.equal(isSunsetOffered(withoutAnalytics, MIDI_PLAYER), false);
    assert.equal(sunsetLevel(withoutAnalytics, MIDI_PLAYER), withoutAnalytics);
  });

  it('keeps refactoring for 2011', () => {
    assert.equal(isRefactorOffered(in2005, MIDI_PLAYER), false);
    assert.equal(refactorFeature(in2005, MIDI_PLAYER), in2005);
    assert.ok(isRefactorOffered(heavy(), GALLERY));
  });
});

describe('the tip for a slow page', () => {
  it('names the feature to refactor and where its button is', () => {
    assert.match(renderTip(heavy()), /Refactor your [^:]+: the button is on its Build card/);
  });
});

describe('a save from before refactoring', () => {
  it('starts every feature unrefactored', () => {
    const { refactorCounts: _dropped, ...older } = heavy();
    const restored = restoreGameState({ ...older, saveVersion: SAVE_VERSION }, SEED);
    assert.ok(restored !== null);
    assert.equal(restored.refactorCounts[GALLERY], 0);
  });
});
