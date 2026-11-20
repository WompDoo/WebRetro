import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, ERAS_BY_ID, FEATURE_IDS, LEAN_FLOOR_SHARE_OF_BUDGET } from '../src/engine';
import type { GameState } from '../src/engine';
import type { PurchaseOption } from '../sim/bot';
import { avoidsOffPath, calculateLeanShortfall, chooseOnPath, describeSpendingShares, findPathTarget, isPumping, readSimPath, startSecondRun, steerOnPath } from '../sim/path';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 9;
const NO_LEVELS = Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'];
const at2005 = (): GameState => startSecondRun({ ...createPlaytestState('web2-2005', 'start', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS });
const option = (label: string): PurchaseOption => ({ label, cost: 1, isRequiredForGate: false, apply: (state) => state, canApply: () => true, valueCost: 1, valueApply: (state) => state });

describe('the sim player who chases a path', () => {
  it('reads SIM_PATH: a path, natural play, or a first run', () => {
    assert.deepEqual(readSimPath('photos, social,nonsense'), ['photos', 'social']);
    assert.deepEqual(readSimPath('natural'), []);
    assert.equal(readSimPath(undefined), null);
    assert.equal(readSimPath(''), null);
  });

  it('plays the second run', () => {
    const state = startSecondRun(createPlaytestState('homepage-1997', 'start', SEED, 'react'));
    assert.equal(state.runNumber, 2);
  });

  it('aims at the path’s specialization for this era, until the site holds it', () => {
    const path = ['photos', 'social'] as const;
    assert.equal(findPathTarget(at2005(), path), 'photos');
    assert.equal(findPathTarget({ ...at2005(), specializationIds: ['photos'] }, path), null);
  });

  it('holds off on other features while a lean is short, and buys everything else as usual', () => {
    const state = { ...at2005(), eraStats: { ...at2005().eraStats, spentByFeature: { blog: 100 } } };
    const avoids = avoidsOffPath(state, ['photos']);
    assert.equal(avoids(option('feature:photo-gallery')), false);
    assert.equal(avoids(option('skill:learn-jquery')), false);
    assert.equal(avoids(option('feature:blog')), true);
    assert.equal(avoids(option('boost:cdn')), false);
    assert.equal(avoids(option('ad')), false);
    assert.equal(avoids(option('hosting:vps')), false);
    assert.equal(avoidsOffPath(at2005(), [])(option('feature:blog')), false, 'no path, no holding back');
  });

  it('builds first: levels and skills while the economy grows, no lean and no sacrifice yet', () => {
    const rich = { ...at2005(), money: 1e15, featureLevels: NO_LEVELS };
    const built = Array.from({ length: 30 }).reduce<GameState>((state) => steerOnPath(state, ['photos'], false) ?? state, rich);
    assert.ok(built.featureLevels['tag-cloud'] >= 1, 'the levels');
    assert.ok(!built.switchedOffFeatureIds.includes('flash-intro'), 'no sacrifice yet');
    assert.equal(built.featureLevels['photo-gallery'], 0, 'no lean yet');
  });

  it('pumps once only the lean and the sacrifices are left and the shortfall is a few minutes of income', () => {
    const ready = { ...at2005(), featureLevels: { ...NO_LEVELS, 'tag-cloud': 1 }, eraStats: { ...at2005().eraStats, spentByFeature: { 'tag-cloud': 1e8 } } };
    assert.equal(isPumping({ ...ready, money: 0 }, ['photos'], 1), false, 'too far to pump');
    assert.equal(isPumping({ ...ready, money: 1e12 }, ['photos'], 1), true);
    const pumped = Array.from({ length: 60 }).reduce<GameState>((state) => steerOnPath(state, ['photos'], true) ?? state, { ...ready, money: 1e15 });
    assert.ok(pumped.switchedOffFeatureIds.includes('flash-intro'), 'the sacrifice');
    assert.ok(pumped.featureLevels['photo-gallery'] > 0, 'the lean');
    assert.equal(isPumping(at2005(), [], 1), false, 'no path, nothing to pump');
  });

  it('works out the lean’s shortfall against the era’s building, and against the floor', () => {
    const state = { ...at2005(), eraStats: { ...at2005().eraStats, spentByFeature: { blog: 6e8, 'photo-gallery': 0 } } };
    assert.equal(calculateLeanShortfall(state, 'photo-gallery', 0.4), (0.4 * 6e8) / 0.6);
    const early = { ...at2005(), eraStats: { ...at2005().eraStats, spentByFeature: {} } };
    assert.equal(calculateLeanShortfall(early, 'photo-gallery', 0.4), 0.4 * ERAS_BY_ID['web2-2005'].migrationCost * LEAN_FLOOR_SHARE_OF_BUDGET);
  });

  it('chooses the specialization the moment it unlocks, and buys its items first', () => {
    const unlocked = { ...at2005(), unlockedSpecializationIds: ['photos'] as const, money: 1e12 };
    const chosen = chooseOnPath(unlocked, ['photos']);
    assert.deepEqual(chosen.specializationIds, ['photos']);
    const shopping = steerOnPath(chosen, ['photos'], false);
    assert.ok(shopping !== null);
    assert.ok(shopping.purchasedUpgradeIds.includes('learn-exif'));
  });

  it('describes where the era’s money went, biggest first', () => {
    const state = { ...at2005(), eraStats: { ...at2005().eraStats, spentByFeature: { blog: 20, forum: 70, wiki: 10 } } };
    assert.equal(describeSpendingShares(state), 'forum 70%, blog 20%, wiki 10%');
  });
});
