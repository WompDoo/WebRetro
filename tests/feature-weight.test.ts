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
  isFeatureTooHeavy,
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
  it('needs more than a first screen of it, a real share of the page, and an era that weighs pages', () => {
    assert.ok(isFeatureTooHeavy(heavy(), GALLERY));
    assert.equal(isFeatureTooHeavy(withGallery('social-2011', HEAVY_FEATURE_FROM_LEVEL - 1), GALLERY), false, 'all of it fits on the first screen');
    const shareButtons: FeatureId = 'share-buttons';
    const light = { ...heavy(), featureLevels: { ...heavy().featureLevels, [shareButtons]: HEAVY_FEATURE_FROM_LEVEL * 4 } };
    assert.equal(isFeatureTooHeavy(light, shareButtons), false, 'a few KB of buttons');
    const homepage = createPlaytestState('homepage-1997', 'end', SEED, 'react');
    assert.ok(Object.values(FEATURES_BY_ID).every((feature) => !isFeatureTooHeavy(homepage, feature.id)), '1997 never weighed a page');
  });

  it('offers neither refactor nor sunset on a light feature', () => {
    const light = withGallery('social-2011', HEAVY_FEATURE_FROM_LEVEL - 1);
    assert.equal(refactorFeature(light, GALLERY), light);
    assert.equal(sunsetLevel(light, GALLERY), light);
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
