import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  buyFeature,
  areBacklinksOn,
  calculateAdValuePerAd,
  calculateBacklinksEarned,
  calculatePerkCost,
  calculateServerLoad,
  calculateSpecializationProgress,
  calculateSpendingShare,
  calculateVisitorsPerSecond,
  canPlaceAd,
  checkSpecializationUnlocks,
  chooseSpecialization,
  cleanInfection,
  countOnFire,
  createEraRecord,
  createInitialGameState,
  createPlaytestState,
  EMPTY_LEGACY,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  findNextEraId,
  getUnlockedFeatureIds,
  isEraUnlocked,
  isSpecializationInView,
  isSpecializationOpen,
  listGateRequirements,
  listOpenedBy,
  listOutOfReach,
  listPerksOf,
  listSpecializationEffects,
  recordFoundSpecializations,
  SPECIALIZATIONS_BY_ID,
  tickAdFree,
  toggleFeature,
  TREE_IDS,
  upgradeHosting,
} from '../src/engine';
import type { EraId, FeatureId, GameState, SpecializationId } from '../src/engine';
import { describeSpecializationPath, isSpecializeTabShown, renderRelaunchWarning, renderSpecializationChoiceScreen, renderSpecializeTab } from '../src/ui/render-specializations';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 77;
/** Below this a focus is a token; above it, a grind. */
const MIN_FOCUS_LEVEL = 5;
const MAX_FOCUS_LEVEL = 30;

/** The test build's second site: specializations are on. */
const secondRun = (state: GameState): GameState => ({ ...state, edition: 'webspecialization', runNumber: 2 });
const at = (eraId: EraId, stage: 'start' | 'end' = 'end'): GameState =>
  secondRun({ ...createPlaytestState(eraId, stage, SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] });
const holding = (state: GameState, ids: readonly SpecializationId[]): GameState => ({ ...state, specializationIds: ids });
const NO_LEVELS = Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'];
/** Only these features, at these levels: a site that leaned on purpose. */
const leaning = (state: GameState, levels: Partial<GameState['featureLevels']>): GameState => ({ ...state, featureLevels: { ...NO_LEVELS, ...levels } });
const switchedOff = (state: GameState, featureIds: readonly FeatureId[]): GameState => ({ ...state, switchedOffFeatureIds: featureIds });

/** This era's spending: what went into each feature, out of a total. */
const spending = (state: GameState, byFeature: Partial<Record<FeatureId, number>>): GameState => ({ ...state, eraStats: { ...state.eraStats, spentByFeature: byFeature } });
/** A 2005 photo-sharing site in the making: half the era's money went into the gallery, tags are up, the Flash intro is off. */
const photosReady = (): GameState => switchedOff(spending(leaning(at('web2-2005'), { 'photo-gallery': 40, 'tag-cloud': 3, 'flash-intro': 1, blog: 16 }), { 'photo-gallery': 500, blog: 500 }), ['flash-intro']);

describe('the specialization tree: when it opens', () => {
  it('is the second site’s draw: off in the first run and in the classic game', () => {
    assert.ok(isSpecializationOpen(at('web2-2005'), 'photos'));
    assert.ok(!isSpecializationOpen({ ...at('web2-2005'), runNumber: 1 }, 'photos'));
    assert.ok(!isSpecializationOpen({ ...at('web2-2005'), edition: 'classic' }, 'photos'));
  });

  it('shows its tab from the start of 2005, not in 1997', () => {
    assert.ok(isSpecializeTabShown(at('web2-2005', 'start')));
    assert.ok(!isSpecializeTabShown(at('homepage-1997')));
    assert.ok(!isSpecializeTabShown({ ...at('web2-2005'), runNumber: 1 }));
  });
});

describe('unlocking a specialization', () => {
  it('takes a lean, a sacrifice or a skill: a site that leaned unlocks, with a news line', () => {
    const step = checkSpecializationUnlocks(photosReady());
    assert.ok(step.state.unlockedSpecializationIds.includes('photos'));
    assert.match(step.events.map((event) => event.message).join(' '), /New specialization unlocked: Photo sharing/);
    assert.deepEqual(checkSpecializationUnlocks(step.state).events, [], 'once');
  });

  it('is out of reach of a player who buys everything: a usual end of 2005 has unlocked nothing', () => {
    assert.deepEqual(checkSpecializationUnlocks(at('web2-2005')).state.unlockedSpecializationIds, []);
  });

  it('shows how far along each condition is: the lean as a share of this era’s spending', () => {
    const [lean, flash, tags] = calculateSpecializationProgress(photosReady(), 'photos');
    assert.equal(lean?.unit, 'share');
    assert.equal(lean?.current, 0.5);
    assert.match(lean?.label ?? '', /40% of what you build this era into Photo gallery/);
    assert.deepEqual([tags?.current, tags?.target, flash?.isMet], [3, 3, true]);
  });

  it('measures the lean in what you build: a feature’s levels count for it, and nothing else spoils it', () => {
    const state = { ...at('web2-2005'), money: 1e12 };
    const bought = buyFeature(state, 'photo-gallery');
    assert.ok((bought.eraStats.spentByFeature['photo-gallery'] ?? 0) > 0);
    assert.equal(calculateSpendingShare(bought, 'photo-gallery'), 1);
    const hosted = upgradeHosting(bought);
    assert.equal(calculateSpendingShare(hosted, 'photo-gallery'), 1, 'hosting is something every site needs');
  });

  it('comes into view half way to its lean, or straight away once found in an earlier run', () => {
    const halfway = spending(at('web2-2005'), { 'photo-gallery': 200, blog: 800 });
    assert.ok(isSpecializationInView(halfway, 'photos', []));
    assert.ok(!isSpecializationInView(at('web2-2005'), 'photos', []));
    assert.ok(isSpecializationInView(at('web2-2005'), 'photos', ['photos']), 'found before');
  });

  it('counts what an era does: catching fire, riding out spikes, sorting spam, a stretch without ads', () => {
    const state = at('web2-2005');
    assert.equal(countOnFire(state).eraStats.onFireStarts, 1);
    const spam: GameState = { ...state, infections: [{ id: 1, kind: 'spam', featureId: 'comments', ageMs: 0, minigameId: 'spam-sort' }] };
    assert.equal(cleanInfection(spam, 1).state.eraStats.cleanedByKind.spam, 1);
    assert.equal(tickAdFree({ ...state, adCount: 0 }, 1000).eraStats.adFreeMs, 1000);
    assert.equal(tickAdFree({ ...state, adCount: 1, eraStats: { ...state.eraStats, adFreeMs: 9000 } }, 1000).eraStats.adFreeMs, 0, 'an ad starts the clock over');
  });

  it('is checked as the game runs', () => {
    assert.ok(advanceSimulation(photosReady(), 100, 'live').state.unlockedSpecializationIds.includes('photos'));
  });

  it('joins a collection that lasts across runs, once', () => {
    const legacy = recordFoundSpecializations(EMPTY_LEGACY, ['photos']);
    assert.deepEqual(legacy.foundSpecializationIds, ['photos']);
    assert.equal(recordFoundSpecializations(legacy, ['photos']), legacy);
  });
});

describe('choosing a specialization', () => {
  const unlocked = (): GameState => checkSpecializationUnlocks(photosReady()).state;

  it('is free, at once, for good, and one per era', () => {
    const step = chooseSpecialization(unlocked(), 'photos');
    assert.deepEqual(step.state.specializationIds, ['photos']);
    assert.equal(step.state.money, unlocked().money);
    assert.match(step.events[0]?.message ?? '', /Your site is now a photo sharing/);
    assert.ok(!isSpecializationOpen(step.state, 'video'), 'no second 2005 specialization');
    assert.equal(chooseSpecialization(at('web2-2005'), 'video').state.specializationIds.length, 0, 'not unlocked: nothing happens');
  });

  it('keeps its sacrifice: the Flash intro stays off', () => {
    const chosen = chooseSpecialization(unlocked(), 'photos').state;
    assert.equal(toggleFeature(chosen, 'flash-intro'), chosen);
    assert.ok(chosen.switchedOffFeatureIds.includes('flash-intro'));
  });

  it('keeps ads few on a shop', () => {
    const shop = { ...holding(at('social-2011'), ['shop']), adCount: 2, money: 1e30 };
    assert.ok(!canPlaceAd(shop));
  });

  it('follows lineage: a 2011 social network grows out of photo sharing or a blog network', () => {
    assert.ok(!isSpecializationOpen(holding(at('social-2011'), ['video']), 'social'));
    assert.ok(isSpecializationOpen(holding(at('social-2011'), ['photos']), 'social'));
    assert.ok(isSpecializationOpen(at('social-2011'), 'shop'), 'the open door needs no parent');
    const founder = { ...holding(at('social-2011'), ['video']), legacyPerkLevels: { ...at('social-2011').legacyPerkLevels, 'serial-founder': 1 } };
    assert.ok(isSpecializationOpen(founder, 'social'), 'Serial founder ignores lineage');
  });

  it('says what it closes and what it opens', () => {
    const state = at('web2-2005');
    assert.ok(listOutOfReach(state, 'video').includes('social'), 'a video site never becomes a social network');
    assert.ok(listOpenedBy('video').includes('live-streaming'));
    const screen = renderSpecializationChoiceScreen(state, 'video');
    assert.match(screen, /No other 2005 specialization this run/);
    assert.match(screen, /Out of reach later:[^<]*Social network/);
    assert.match(screen, /Still possible this era instead/);
    assert.match(screen, /data-action="confirm-specialization" data-id="video"/);
  });

  it('warns at the relaunch when one was unlocked and not chosen', () => {
    assert.match(renderRelaunchWarning(unlocked()), /You haven’t specialized this era/);
    assert.equal(renderRelaunchWarning(at('web2-2005')), '');
  });
});

describe('what a specialization does', () => {
  it('asks the checklist for its focus, and pays its own way; older ones add a little', () => {
    const video = holding(at('social-2011'), ['video']);
    const focus = listGateRequirements(video).find((requirement) => requirement.kind === 'feature-level');
    assert.equal(focus?.label, 'Video player level 8');
    assert.ok(calculateAdValuePerAd(video) > calculateAdValuePerAd(at('social-2011')));
    const stacked = holding(at('platform-2018'), ['video', 'live-streaming']);
    assert.ok(listSpecializationEffects(stacked).some((effect) => effect.kind === 'feature-traffic-multiplier'), 'the video site keeps a little');
  });

  it('gives every specialization a focus of its own era’s features, at a level that means building it', () => {
    TREE_IDS.forEach((id) =>
      Object.entries(SPECIALIZATIONS_BY_ID[id].eras).forEach(([eraId, plan]) => {
        assert.equal(FEATURES_BY_ID[plan.focus].eraId, eraId, `${id} in ${eraId}`);
        assert.ok(plan.level >= MIN_FOCUS_LEVEL && plan.level <= MAX_FOCUS_LEVEL, `${id} in ${eraId}: level ${plan.level}`);
      }),
    );
  });

  it('plans every era from its own on', () => {
    TREE_IDS.forEach((id) => {
      const { eraId, eras } = SPECIALIZATIONS_BY_ID[id];
      const later = (['web2-2005', 'social-2011', 'platform-2018', 'ai-2024'] as const).filter((era) => ERAS_BY_ID[era].year >= ERAS_BY_ID[eraId].year);
      assert.deepEqual(Object.keys(eras).sort(), [...later].sort(), id);
    });
  });

  it('ends with what the homepage became', () => {
    assert.equal(describeSpecializationPath(holding(at('ai-2024'), ['video', 'live-streaming'])), 'Your homepage became a video site in 2005, then a live streaming in 2011.');
    assert.equal(describeSpecializationPath(at('ai-2024')), '');
  });
});

describe('staying a homepage', () => {
  const classic = (state: GameState): GameState => ({ ...state, edition: 'classic' });
  const shapedEras = ['web2-2005', 'social-2011', 'platform-2018', 'ai-2024'] as const;

  it('is the classic game: the same checklist, the same money and the same page', () => {
    shapedEras.forEach((eraId) => {
      const homepage = at(eraId);
      assert.deepEqual(listGateRequirements(homepage), ERAS_BY_ID[eraId].gateRequirements, eraId);
      assert.deepEqual(listSpecializationEffects(homepage), [], eraId);
      assert.equal(calculateVisitorsPerSecond(homepage), calculateVisitorsPerSecond(classic(homepage)), eraId);
      assert.equal(calculateServerLoad(homepage), calculateServerLoad(classic(homepage)), eraId);
      assert.equal(renderSite(homepage, 0), `<div class="site-theme">${renderSite(classic(homepage), 0)}</div>`, `${eraId}: the page, unthemed`);
    });
  });
});

describe('the Specialize tab', () => {
  it('explains itself and counts what’s been found, showing only what’s in view', () => {
    const empty = renderSpecializeTab(at('web2-2005'), []);
    assert.match(empty, /Found 0\/19/);
    assert.match(empty, /Nothing in view yet/);
    assert.doesNotMatch(empty, /data-specialization=/);
    const near = renderSpecializeTab(photosReady(), []);
    assert.match(near, /data-specialization="photos"/);
    assert.doesNotMatch(near, /data-specialization="wiki"/, 'secrets stay hidden until near');
  });

  it('offers Choose… once unlocked', () => {
    assert.match(renderSpecializeTab(checkSpecializationUnlocks(photosReady()).state, []), /data-action="open-specialization" data-id="photos"/);
  });
});

describe('the test build’s runs', () => {
  it('skips the 2000 crash and brings its content into 1997 from the third run', () => {
    const third = { ...createInitialGameState(SEED), edition: 'webspecialization' as const, runNumber: 3 };
    assert.equal(findNextEraId(third), 'web2-2005');
    assert.ok(isEraUnlocked(third, 'crash-2000'));
    assert.ok(getUnlockedFeatureIds(third).includes('e-cards'));
    const classicThird = { ...third, edition: 'classic' as const };
    assert.equal(findNextEraId(classicThird), 'crash-2000');
  });

  it('opens Backlinks with the third site: nothing earned at the end of the first', () => {
    const finished = { ...createPlaytestState('ai-2024', 'end', SEED, 'react'), isGameFinished: true };
    assert.ok(!areBacklinksOn({ ...finished, edition: 'webspecialization', runNumber: 1 }));
    assert.equal(calculateBacklinksEarned({ ...finished, edition: 'webspecialization', runNumber: 1 }), 0);
    assert.ok(areBacklinksOn({ ...finished, edition: 'webspecialization', runNumber: 2 }));
    assert.ok(areBacklinksOn({ ...finished, edition: 'classic', runNumber: 1 }));
  });

  it('sells Serial founder for its own price, in the test build only', () => {
    assert.equal(calculatePerkCost(EMPTY_LEGACY, 'serial-founder'), 50);
    assert.ok(listPerksOf({ edition: 'webspecialization' }).includes('serial-founder'));
    assert.ok(!listPerksOf({ edition: 'classic' }).includes('serial-founder'));
  });

  it('keeps its specializations in the Web Attic', () => {
    assert.deepEqual(createEraRecord(holding(at('social-2011'), ['video', 'live-streaming'])).site.specializationIds, ['video', 'live-streaming']);
  });
});
