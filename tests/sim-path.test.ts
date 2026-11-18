import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, FEATURE_IDS } from '../src/engine';
import type { GameState } from '../src/engine';
import type { PurchaseOption } from '../sim/bot';
import { avoidsOffPath, chooseOnPath, describeSpendingShares, findPathTarget, readSimPath, startSecondRun, steerOnPath } from '../sim/path';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 9;
const NO_LEVELS = Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'];
const at2005 = (): GameState => startSecondRun({ ...createPlaytestState('web2-2005', 'start', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS });
const option = (label: string): PurchaseOption => ({ label, cost: 1, isRequiredForGate: false, apply: (state) => state, canApply: () => true, valueCost: 1, valueApply: (state) => state });

describe('the sim player who chases a path', () => {
  it('reads SIM_PATH: a path, natural play, or the classic game', () => {
    assert.deepEqual(readSimPath('photos, social,nonsense'), ['photos', 'social']);
    assert.deepEqual(readSimPath('natural'), []);
    assert.equal(readSimPath(undefined), null);
    assert.equal(readSimPath(''), null);
  });

  it('plays the test build’s second run', () => {
    const state = startSecondRun(createPlaytestState('homepage-1997', 'start', SEED, 'react'));
    assert.equal(state.edition, 'webspecialization');
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

  it('meets the other conditions first and pumps the lean last, so building them doesn’t undo it', () => {
    const rich = { ...at2005(), money: 1e15, featureLevels: NO_LEVELS };
    const steps = Array.from({ length: 60 }).reduce<GameState>((state) => steerOnPath(state, ['photos']) ?? state, rich);
    assert.ok(steps.switchedOffFeatureIds.includes('flash-intro'), 'the sacrifice');
    assert.ok(steps.featureLevels['tag-cloud'] >= 1, 'the levels');
    const first = steerOnPath(rich, ['photos']);
    assert.ok(first !== null);
    assert.equal(first.featureLevels['photo-gallery'], 0, 'not the lean, not yet');
  });

  it('chooses the specialization the moment it unlocks, and buys its items first', () => {
    const unlocked = { ...at2005(), unlockedSpecializationIds: ['photos'] as const, money: 1e12 };
    const chosen = chooseOnPath(unlocked, ['photos']);
    assert.deepEqual(chosen.specializationIds, ['photos']);
    const shopping = steerOnPath(chosen, ['photos']);
    assert.ok(shopping !== null);
    assert.ok(shopping.purchasedUpgradeIds.includes('learn-exif'));
  });

  it('describes where the era’s money went, biggest first', () => {
    const state = { ...at2005(), eraStats: { ...at2005().eraStats, spentByFeature: { blog: 20, forum: 70, wiki: 10 } } };
    assert.equal(describeSpendingShares(state), 'forum 70%, blog 20%, wiki 10%');
  });
});
