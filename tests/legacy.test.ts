import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  bankBacklinks,
  buyPerk,
  calculateBacklinkSources,
  calculateGateChecks,
  FEATURES_BY_ID,
  getCoreFeatureIdsOfEra,
  getUnlockedFeatureIds,
  isFeatureBuildable,
  calculateBacklinksEarned,
  calculateDemandVisitorsPerSecond,
  calculateKeystrokeValue,
  calculatePerkCost,
  calculateNextFeatureCost,
  calculateUpgradeCost,
  findFrameworkPickedBy,
  findFrameworkRenderedBy,
  isPerkMaxed,
  canBuyPerk,
  createInitialGameState,
  createPlaytestState,
  EMPTY_LEGACY,
  NO_PERKS,
  restoreGameState,
  restoreLegacy,
  SAVE_VERSION,
  shouldProjectBacklinks,
  areBacklinksKnown,
  startNextRun,
} from '../src/engine';
import type { EraRecord, FeatureId, GameState, LegacyState, PerkId } from '../src/engine';
import { renderEndingAct } from '../src/ui/ending';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 57;
const MS_PER_MINUTE = 60_000;
const TOLERANCE = 1e-9;

/** A second site, finished: the first one earns no Backlinks, they open with the second. */
const finished = (): GameState => advanceEra({ ...createPlaytestState('ai-2024', 'end', SEED, 'react'), runNumber: 2 });
const withBacklinks = (backlinks: number): LegacyState => ({ ...EMPTY_LEGACY, backlinks });

describe('Backlinks: what a finished run is worth', () => {
  it('pays one for each order of magnitude of visitors past ten billion, so a longer run earns about the same', () => {
    const base = { ...createInitialGameState(SEED), eraRecords: [] };
    assert.equal(calculateBacklinkSources({ ...base, lifetimeVisitors: 5e9 }).fromVisitors, 0);
    assert.equal(calculateBacklinkSources({ ...base, lifetimeVisitors: 1e15 }).fromVisitors, 5);
    assert.equal(calculateBacklinkSources({ ...base, lifetimeVisitors: 9.9e15 }).fromVisitors, 5);
    assert.equal(calculateBacklinkSources({ ...base, lifetimeVisitors: 1e16 }).fromVisitors, 6);
  });

  it('pays one more for every era finished in under 45 minutes', () => {
    const [record] = finished().eraRecords;
    assert.ok(record !== undefined);
    const at = (minutes: number, eraId: EraRecord['eraId']): EraRecord => ({ ...record, eraId, endedAtPlayTimeMs: minutes * MS_PER_MINUTE });
    const state = { ...finished(), eraRecords: [at(30, 'homepage-1997'), at(90, 'web2-2005'), at(130, 'social-2011')] };
    assert.equal(calculateBacklinkSources(state).fromFastEras, 2);
  });

  it('counts from the second site but shows the count from the third, and at the second one’s ending', () => {
    assert.ok(!shouldProjectBacklinks(createInitialGameState(SEED)));
    const secondSite = startNextRun({ ...EMPTY_LEGACY, finishedRuns: 1 }, SEED);
    assert.equal(secondSite.runNumber, 2);
    assert.ok(!shouldProjectBacklinks(secondSite), 'the second site is about specializations');
    assert.ok(shouldProjectBacklinks(finished()), 'its ending pays them in');
    assert.ok(shouldProjectBacklinks(startNextRun({ ...EMPTY_LEGACY, finishedRuns: 2 }, SEED)));
    assert.ok(!areBacklinksKnown(secondSite, { finishedRuns: 1 }));
    assert.ok(areBacklinksKnown(secondSite, { finishedRuns: 2 }), 'met at an earlier second run’s ending');
  });
});

describe('the legacy: banking a run, buying perks, starting the next site', () => {
  it('banks a finished run once, and an unfinished one never', () => {
    const once = bankBacklinks(EMPTY_LEGACY, finished());
    assert.equal(once.legacy.backlinks, calculateBacklinksEarned(finished()));
    assert.equal(once.legacy.finishedRuns, 1);
    assert.deepEqual(bankBacklinks(once.legacy, once.state).legacy, once.legacy);
    assert.deepEqual(bankBacklinks(EMPTY_LEGACY, createInitialGameState(SEED)).legacy, EMPTY_LEGACY);
  });

  it('prices each level at twice the last, and never spends what it doesn’t have', () => {
    const one = buyPerk(withBacklinks(3), 'regulars');
    assert.equal(one.backlinks, 2);
    assert.equal(calculatePerkCost(one, 'regulars'), 2);
    const two = buyPerk(one, 'regulars');
    assert.equal(two.backlinks, 0);
    assert.equal(calculatePerkCost(two, 'regulars'), 4);
    assert.ok(!canBuyPerk(two, 'muscle-memory'));
    assert.deepEqual(buyPerk(two, 'muscle-memory'), two);
  });

  it('starts the next site in 1997 with every perk, numbered after the runs before it', () => {
    const legacy: LegacyState = { ...EMPTY_LEGACY, finishedRuns: 2, perkLevels: { ...NO_PERKS, 'muscle-memory': 1, regulars: 3 } };
    const next = startNextRun(legacy, SEED);
    assert.equal(next.eraId, 'homepage-1997');
    assert.equal(next.runNumber, 3);
    assert.deepEqual(next.legacyPerkLevels, legacy.perkLevels);
    assert.equal(next.money, 0);
  });
});

describe('perks: what they do', () => {
  const end2005 = (): GameState => ({ ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, popups: [], infections: [] });

  it('makes typing pay 10% more for each level of Muscle memory', () => {
    const plain = end2005();
    const practised = { ...plain, legacyPerkLevels: { ...NO_PERKS, 'muscle-memory': 2 } };
    assert.ok(Math.abs(calculateKeystrokeValue(practised) / calculateKeystrokeValue(plain) - 1.2) < 1e-6);
  });

  it('brings 5% more visitors for each level of Regulars', () => {
    const plain = end2005();
    const known = { ...plain, legacyPerkLevels: { ...NO_PERKS, regulars: 2 } };
    assert.ok(Math.abs(calculateDemandVisitorsPerSecond(known) / calculateDemandVisitorsPerSecond(plain) - 1.1) < 1e-6);
  });

  it('never reads a cached summary from a run with other perks, even with the same purchases', () => {
    const plain = end2005();
    const before = calculateKeystrokeValue(plain);
    const practised = { ...plain, legacyPerkLevels: { ...NO_PERKS, 'muscle-memory': 3 } };
    assert.ok(calculateKeystrokeValue(practised) > before);
    assert.ok(Math.abs(calculateKeystrokeValue(plain) - before) < TOLERANCE * before);
  });
});

describe('saves: the legacy can’t break the game', () => {
  it('restores a legacy of this version, filling what’s missing and rejecting nonsense', () => {
    assert.deepEqual(restoreLegacy(null), EMPTY_LEGACY);
    assert.deepEqual(restoreLegacy({ version: 99, backlinks: 5 }), EMPTY_LEGACY);
    const restored = restoreLegacy({ version: 1, backlinks: -4, finishedRuns: 2.7, perkLevels: { regulars: 2, unknown: 9 } });
    assert.equal(restored.backlinks, 0);
    assert.equal(restored.finishedRuns, 2);
    assert.deepEqual(restored.perkLevels, { ...NO_PERKS, regulars: 2 });
  });

  it('gives a game saved before perks existed none', () => {
    const { legacyPerkLevels: _dropped, ...older } = createInitialGameState(SEED);
    assert.deepEqual(restoreGameState({ ...older, saveVersion: SAVE_VERSION }, SEED)?.legacyPerkLevels, NO_PERKS);
  });
});

describe('the ending: a new site from the credits', () => {
  it('offers a new site with the Backlinks it would earn, then the legacy once paid in', () => {
    assert.match(renderEndingAct(finished(), 'credits', null), new RegExp(`Start a new site \\(\\+${calculateBacklinksEarned(finished())} Backlinks?\\)`));
    assert.match(renderEndingAct(bankBacklinks(EMPTY_LEGACY, finished()).state, 'credits', null), />Your legacy</);
  });

  it('lists every perk with its price, greys out what it can’t afford, and starts the new site', () => {
    const banked = bankBacklinks(EMPTY_LEGACY, finished());
    const html = renderEndingAct(banked.state, 'legacy', null, { ...banked.legacy, backlinks: 1, perkLevels: { ...NO_PERKS, 'muscle-memory': 1 } });
    assert.match(html, /data-id="regulars">1 Backlink</);
    assert.match(html, /data-id="muscle-memory" disabled>2 Backlinks</);
    assert.match(html, /data-action="start-new-run"/);
  });
});

describe('the second run: features the first never had', () => {
  const RUN_TWO: readonly FeatureId[] = ['webcam', 'wiki', 'deal-of-the-day', 'community-chat', 'agent-store'];
  const end2005 = (runNumber: number): GameState => ({ ...createPlaytestState('web2-2005', 'end', SEED, 'react'), runNumber });

  it('keeps them out of the first run: not in the shop, not buildable', () => {
    assert.ok(!getUnlockedFeatureIds(end2005(1)).includes('wiki'));
    assert.ok(!isFeatureBuildable(end2005(1), 'wiki'));
    assert.ok(getUnlockedFeatureIds(end2005(2)).includes('wiki'));
    assert.ok(isFeatureBuildable(end2005(2), 'wiki'));
  });

  it('never adds them to a checklist: they’re extras, and building one doesn’t stand in for a core feature', () => {
    RUN_TWO.forEach((featureId) => assert.ok(!getCoreFeatureIdsOfEra(FEATURES_BY_ID[featureId].eraId).includes(featureId), featureId));
    const withoutBlog = { ...end2005(2), featureLevels: { ...end2005(2).featureLevels, blog: 0, wiki: 5 } };
    const featuresCheck = calculateGateChecks(withoutBlog).find((check) => check.requirement.kind === 'era-features-built');
    assert.ok(featuresCheck !== undefined && !featuresCheck.isMet);
  });

  it('retires the 1997 webcam, the 2005 wiki and the 2011 deal at the next relaunch, as they faded', () => {
    assert.deepEqual(RUN_TWO.map((featureId) => FEATURES_BY_ID[featureId].sunsetIn), ['web2-2005', 'social-2011', 'platform-2018', null, null]);
  });

  it('says on the legacy screen what the next site gets', () => {
    const banked = bankBacklinks(EMPTY_LEGACY, finished());
    const html = renderEndingAct(banked.state, 'legacy', null, banked.legacy);
    assert.match(html, /New on your next site/);
    RUN_TWO.forEach((featureId) => assert.ok(html.includes(FEATURES_BY_ID[featureId].name), featureId));
    assert.match(renderEndingAct(banked.state, 'legacy', null, { ...banked.legacy, finishedRuns: 2 }), /the dot-com leftovers in 1997/);
    assert.doesNotMatch(renderEndingAct(banked.state, 'legacy', null, { ...banked.legacy, finishedRuns: 3 }), /New on your next site/);
  });
});

describe('more perks: what each one does', () => {
  const withPerks = (levels: Partial<Record<PerkId, number>>): LegacyState => ({ ...EMPTY_LEGACY, perkLevels: { ...NO_PERKS, ...levels } });
  const end2011 = (levels: Partial<Record<PerkId, number>>): GameState => ({ ...createPlaytestState('social-2011', 'end', SEED, 'react'), legacyPerkLevels: { ...NO_PERKS, ...levels } });

  it('makes every feature 10% cheaper for each level of Templates, compounding', () => {
    const plain = calculateNextFeatureCost(end2011({}), 'video-player');
    const templated = calculateNextFeatureCost(end2011({ templates: 2 }), 'video-player');
    assert.ok(Math.abs(templated / plain - 0.81) < 1e-3);
  });

  it('makes Ops items, and only Ops items, 20% cheaper for each level of the runbook', () => {
    const state = end2011({ 'ops-runbook': 1 });
    assert.ok(Math.abs(calculateUpgradeCost(state, 'staging-environment') / calculateUpgradeCost(end2011({}), 'staging-environment') - 0.8) < 1e-3);
    assert.equal(calculateUpgradeCost(state, 'learn-sass'), calculateUpgradeCost(end2011({}), 'learn-sass'));
  });

  it('starts a new site with $1,000 for each level of Old savings', () => {
    assert.equal(startNextRun(withPerks({ 'old-savings': 3 }), SEED).money, 3_000);
  });

  it('starts every era with its cheapest skills known, one per level of Known tags, never a framework', () => {
    const run = startNextRun(withPerks({ 'known-tags': 2 }), SEED);
    assert.equal(run.purchasedUpgradeIds.length, 2);
    const end2011State = { ...createPlaytestState('social-2011', 'end', SEED, 'react'), legacyPerkLevels: { ...NO_PERKS, 'known-tags': 3 } };
    const in2018 = advanceEra(end2011State);
    const learnedAtRelaunch = in2018.purchasedUpgradeIds.filter((upgradeId) => !end2011State.purchasedUpgradeIds.includes(upgradeId));
    assert.equal(learnedAtRelaunch.length, 3);
    assert.ok(learnedAtRelaunch.every((upgradeId) => findFrameworkPickedBy(upgradeId) === null && findFrameworkRenderedBy(upgradeId) === null));
  });

  it('holds every era’s first trouble back 2 minutes for each level of Early warning', () => {
    const plain = startNextRun(EMPTY_LEGACY, SEED);
    const warned = startNextRun(withPerks({ 'early-warning': 2 }), SEED);
    assert.equal(warned.hazardCountdownsMs.virus - plain.hazardCountdownsMs.virus, 4 * 60_000);
  });

  it('stops Known tags and Early warning at three levels, and says so', () => {
    const full = withPerks({ 'known-tags': 3 });
    assert.ok(isPerkMaxed(full, 'known-tags'));
    assert.ok(!canBuyPerk({ ...full, backlinks: 100 }, 'known-tags'));
    const html = renderEndingAct(bankBacklinks(EMPTY_LEGACY, finished()).state, 'legacy', null, { ...full, backlinks: 100 });
    assert.match(html, /level 3 of 3/);
    assert.match(html, /data-id="known-tags" disabled>Maxed</);
  });
});
