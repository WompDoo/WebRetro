import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  breakNewsOnFire,
  buyUpgrade,
  calculateAdValuePerAd,
  calculateAiAnswerShare,
  calculateAutoKeystrokesPerSecond,
  calculateBaseVisitorsPerSecond,
  calculateDirectRevenuePerVisitor,
  calculateEconomySnapshot,
  calculateFeatureVisitorsPerSecond,
  calculateKeystrokeValue,
  calculateLoadTimeSeconds,
  calculateNetRevenuePerSecond,
  calculateNextFeatureCost,
  calculateOfferFrequencyFactor,
  calculatePrivacyFineFactor,
  calculateRevenuePerVisitor,
  calculateSpecializationTrafficFactor,
  calculateSpikeFrequencyFactor,
  calculateSubscriptionTarget,
  calculateUpkeepShare,
  cleanInfection,
  countOnFire,
  createPlaytestState,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  findBestValueFeature,
  findItemOwner,
  findSmallestFeature,
  getAvailableSkillIds,
  getCoreFeatureIdsOfEra,
  getUnlockedFeatureIds,
  INFECTION_MINIGAMES,
  isFeatureBuildable,
  isFeatureOnPage,
  isUpgradeAvailable,
  MAX_GOES_PER_STEP,
  SPECIALIZATION_FEATURE_IDS,
  SPECIALIZATION_ITEMS,
  SPECIALIZATION_UPGRADE_IDS,
  SPECIALIZATIONS_BY_ID,
  startBuff,
  SUBSCRIBER_CHURN_MS,
  SUBSCRIBER_RISE_MS,
  TRAFFIC_SPIKE_DURATION_MS,
  updateSubscriptions,
  UPGRADES_BY_ID,
  writeCode,
} from '../src/engine';
import type { EraId, FeatureId, GameState, InfectionKind, SpecializationUpgradeId, TreeSpecializationId, UpgradeId } from '../src/engine';
import { renderShopBody } from '../src/ui/render-shop';
import { renderSpecializationChoiceScreen } from '../src/ui/render-specializations';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 41;
const NOW = 0;
const BUILT_LEVEL = 10;
const PRECISION = 6;
const MINUTE_MS = 60_000;
const NO_VIEW = { isScrollJackingOn: false, foundSpecializationIds: [] } as const;

/** The test build's second site, quiet: no hazards, no buffs, no spike. */
const at = (eraId: EraId): GameState => ({
  ...createPlaytestState(eraId, 'end', SEED, 'react'),
  edition: 'webspecialization',
  runNumber: 2,
  hazardCountdownsMs: QUIET_HAZARDS,
  infections: [],
  popups: [],
  buffs: [],
  trafficSpikeRemainingMs: 0,
});

const eraOf = (specializationId: TreeSpecializationId): EraId => SPECIALIZATIONS_BY_ID[specializationId].eraId;

const withUpgrades = (state: GameState, upgradeIds: readonly UpgradeId[]): GameState => ({ ...state, purchasedUpgradeIds: [...state.purchasedUpgradeIds, ...upgradeIds] });
const withoutUpgrade = (state: GameState, upgradeId: UpgradeId): GameState => ({ ...state, purchasedUpgradeIds: state.purchasedUpgradeIds.filter((id) => id !== upgradeId) });
const withLevel = (state: GameState, featureId: FeatureId, level: number): GameState => ({ ...state, featureLevels: { ...state.featureLevels, [featureId]: level } });

/** A site that holds the specialization in its own era: its skill learned, its feature built, these boosts bought. */
function holding(specializationId: TreeSpecializationId, boosts: readonly UpgradeId[] = []): GameState {
  const items = SPECIALIZATION_ITEMS[specializationId];
  const state = { ...at(eraOf(specializationId)), specializationIds: [specializationId] };
  return withLevel(withUpgrades(state, [items.learn, ...boosts]), items.build, BUILT_LEVEL);
}

function infected(state: GameState, kind: InfectionKind, featureId: FeatureId): GameState {
  const [minigameId] = INFECTION_MINIGAMES[kind];
  return { ...state, infections: [{ id: 1, kind, featureId, minigameId, ageMs: 0 }] };
}

// ---------- The moments that show each boost at work ----------

type Scenario = (state: GameState) => GameState;

const played = (ms: number): Scenario => (state) => advanceSimulation(state, ms, 'live').state;
const onFire: Scenario = (state) => startBuff(state, 'on-fire');
const inSpike: Scenario = (state) => ({ ...state, trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS });
const idle: Scenario = (state) => ({ ...state, msSinceKeystroke: MINUTE_MS });
const typing: Scenario = (state) => ({ ...state, msSinceKeystroke: 0 });
/** One keystroke that lands on a multiple of every keystroke count in the game. */
const typedThousandth: Scenario = (state) => writeCode({ ...state, keystrokes: 2_999, hasPendingBug: false }).state;
const caughtFire: Scenario = (state) => breakNewsOnFire(state, countOnFire(startBuff(state, 'on-fire')));
const cleanedUp = (kind: InfectionKind, featureId: FeatureId): Scenario => (state) => cleanInfection(infected(withLevel(state, featureId, Math.max(1, state.featureLevels[featureId])), kind, featureId), 1).state;
const grownSinceEraBegan: Scenario = (state) => ({ ...state, eraStats: { ...state.eraStats, startBaseVisitors: calculateBaseVisitorsPerSecond(state) / 8 } });
const withoutAds: Scenario = (state) => ({ ...state, adCount: 0 });
const subscribedFor = (ms: number): Scenario => (state) => updateSubscriptions(state, ms);
const afterSubscribing: Scenario = (state) => updateSubscriptions(updateSubscriptions(state, SUBSCRIBER_RISE_MS * 5), SUBSCRIBER_RISE_MS);
const stackedWith = (others: readonly TreeSpecializationId[]): Scenario => (state) => ({ ...state, specializationIds: [...others, ...state.specializationIds] });
const richFor = (scenario: Scenario): Scenario => (state) => scenario({ ...state, money: state.money + 1e18 });
const longIntoEra: Scenario = (state) => ({ ...state, eraStats: { ...state.eraStats, elapsedMs: 20 * MINUTE_MS } });
const asIs: Scenario = (state) => state;

/** How each boost shows itself. Every boost needs one: a new boost can't ship without a moment that proves it. */
const SCENARIOS: Readonly<Record<SpecializationUpgradeId, Scenario>> = {
  'learn-multi-user-blogs': asIs,
  'write-every-day': typedThousandth,
  'long-tail': longIntoEra,
  'learn-exif': asIs,
  'users-upload': played(30_000),
  'explore-page': asIs,
  'learn-flash-video': asIs,
  'going-viral': inSpike,
  'embed-anywhere': asIs,
  'learn-mod-tools': asIs,
  'volunteer-mods': cleanedUp('spam', 'comments'),
  'post-counts': onFire,
  'learn-wiki-markup': asIs,
  'edit-a-thon': played(20_000),
  'donation-drive': withoutAds,
  'learn-social-graph': asIs,
  'network-effect': grownSinceEraBegan,
  'people-you-may-know': asIs,
  'learn-hashtags': asIs,
  'live-posting': onFire,
  'fail-whale': inSpike,
  'learn-live-video': asIs,
  'live-events': played(3 * MINUTE_MS),
  'subs-and-tips': subscribedFor(MINUTE_MS),
  'learn-headline-testing': asIs,
  clickbait: inSpike,
  'breaking-news': caughtFire,
  'learn-geolocation': asIs,
  'elite-reviewers': asIs,
  'fake-review-filter': cleanedUp('spam', 'comments'),
  'learn-shopping-cart': asIs,
  'customers-also-bought': asIs,
  'black-friday': played(5 * MINUTE_MS),
  'learn-vertical-video': asIs,
  'disappearing-stories': typing,
  influencers: played(10_000),
  'learn-adaptive-streaming': asIs,
  subscriptions: subscribedFor(MINUTE_MS),
  'binge-autoplay': asIs,
  'learn-deliverability': asIs,
  'writers-fund': typedThousandth,
  'tracking-pixels': asIs,
  'learn-escrow': asIs,
  'take-rate': asIs,
  'surge-pricing': inSpike,
  'learn-recruiting-tools': asIs,
  endorsements: stackedWith(['photos', 'social']),
  'premium-messages': subscribedFor(MINUTE_MS),
  'learn-bots-and-webhooks': asIs,
  'server-boosts': grownSinceEraBegan,
  'mod-bots': cleanedUp('virus', 'servers'),
  'learn-remixing': asIs,
  'the-algorithm': asIs,
  'infinite-scroll': asIs,
  'learn-citations': asIs,
  'answer-dont-link': asIs,
  'sponsored-answers': asIs,
  'learn-style-models': asIs,
  'gpu-farm': played(8_000),
  credits: subscribedFor(MINUTE_MS),
  'learn-fine-tuning': asIs,
  'it-remembers-you': afterSubscribing,
  'talks-while-you-sleep': asIs,
  'learn-tool-calling': asIs,
  'agents-buy-for-you': richFor(played(5_000)),
  'tool-use-fees': asIs,
};

/** Everything a boost could change that a player would notice. */
function observe(state: GameState): string {
  const economy = calculateEconomySnapshot(state);
  return JSON.stringify({
    economy,
    levels: state.featureLevels,
    buffs: state.buffs.map((buff) => buff.id),
    subscriptions: state.subscriptionRevenuePerSecond,
    spike: state.trafficSpikeRemainingMs,
    nextSpikeMs: state.hazardCountdownsMs['traffic-spike'],
    nextOfferMs: state.opportunityCountdownMs,
    fines: calculatePrivacyFineFactor(state),
    nextLevelCost: calculateNextFeatureCost(state, 'blog'),
    skills: getAvailableSkillIds(state),
    features: getUnlockedFeatureIds(state),
  });
}

describe('each specialization’s own items', () => {
  (Object.keys(SPECIALIZATION_ITEMS) as readonly TreeSpecializationId[]).forEach((specializationId) => {
    it(`${specializationId} has a skill, a feature and boosts of its own, all of its era`, () => {
      const items = SPECIALIZATION_ITEMS[specializationId];
      const eraId = eraOf(specializationId);
      assert.equal(UPGRADES_BY_ID[items.learn].kind, 'skill');
      assert.equal(UPGRADES_BY_ID[items.learn].eraId, eraId);
      assert.equal(FEATURES_BY_ID[items.build].eraId, eraId);
      assert.equal(FEATURES_BY_ID[items.build].requiredSkillId, items.learn);
      assert.ok(items.upgrades.length >= 1);
      items.upgrades.forEach((upgradeId) => {
        assert.equal(UPGRADES_BY_ID[upgradeId].kind, 'boost', upgradeId);
        assert.equal(UPGRADES_BY_ID[upgradeId].eraId, eraId, upgradeId);
        assert.equal(findItemOwner(upgradeId), specializationId);
      });
    });
  });

  it('are offered only to a site that holds the specialization, and never in the classic game', () => {
    const video = holding('video');
    assert.ok(getAvailableSkillIds(withoutUpgrade(video, 'learn-flash-video')).includes('learn-flash-video'));
    assert.ok(isFeatureBuildable(video, 'channels'));
    assert.ok(isUpgradeAvailable(video, 'going-viral'));
    const homepage = { ...video, specializationIds: [] };
    assert.ok(!getAvailableSkillIds(withoutUpgrade(homepage, 'learn-flash-video')).includes('learn-flash-video'));
    assert.ok(!getUnlockedFeatureIds(homepage).includes('channels'));
    assert.ok(!isUpgradeAvailable(homepage, 'going-viral'));
    const classic: GameState = { ...video, edition: 'classic' };
    assert.ok(!getUnlockedFeatureIds(classic).includes('channels'));
    assert.ok(!isUpgradeAvailable(classic, 'going-viral'));
  });

  it('stay for good once held: a later specialization keeps the earlier one’s items', () => {
    const later = { ...withUpgrades(at('social-2011'), ['learn-flash-video']), specializationIds: ['video', 'social'] as const };
    assert.ok(getUnlockedFeatureIds(later).includes('channels'));
    assert.ok(getAvailableSkillIds(later).includes('learn-social-graph'));
  });

  it('are never on an era’s checklist: a homepage can still finish every era', () => {
    SPECIALIZATION_FEATURE_IDS.forEach((featureId) => assert.ok(!getCoreFeatureIdsOfEra(FEATURES_BY_ID[featureId].eraId).includes(featureId), featureId));
  });

  it('wear the specialization’s icon in the shop', () => {
    const video = withoutUpgrade(holding('video'), 'learn-flash-video');
    const { icon, name } = SPECIALIZATIONS_BY_ID.video;
    assert.ok(renderShopBody(video, 'learn', NO_VIEW).includes(`${icon} ${name}</span>`));
  });

  it('are named on the choice screen, before you commit', () => {
    const screen = renderSpecializationChoiceScreen(at('web2-2005'), 'video');
    assert.match(screen, /Only for sites like this: learn Flash video, build Channels, and get Going viral and Embed anywhere\./);
  });

  it('show on the page from the first level, with a list that grows', () => {
    const photos = holding('photos');
    const page = (level: number): string => renderSite(withLevel(photos, 'photo-groups', level), NOW);
    assert.doesNotMatch(page(0), /data-feature="photo-groups"/);
    assert.match(page(1), /data-feature="photo-groups"[\s\S]*Rusty Doors/);
    assert.ok((page(3).match(/<li>📷/g) ?? []).length > (page(1).match(/<li>📷/g) ?? []).length);
  });

  SPECIALIZATION_UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'boost').forEach((upgradeId) => {
    it(`${upgradeId} keeps its promise in a site that holds its specialization`, () => {
      const owner = findItemOwner(upgradeId);
      assert.ok(owner !== null);
      const scenario = SCENARIOS[upgradeId];
      const site = holding(owner, [upgradeId]);
      assert.notEqual(observe(scenario(site)), observe(scenario(withoutUpgrade(site, upgradeId))));
    });
  });

  SPECIALIZATION_UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill').forEach((skillId) => {
    it(`${skillId} unlocks its feature and writes its own code`, () => {
      const owner = findItemOwner(skillId);
      assert.ok(owner !== null);
      const site = holding(owner);
      assert.ok(isFeatureBuildable(site, SPECIALIZATION_ITEMS[owner].build));
      assert.ok(!isFeatureBuildable(withoutUpgrade(site, skillId), SPECIALIZATION_ITEMS[owner].build));
    });
  });
});

describe('features that level themselves', () => {
  it('users upload: the gallery gains a level every half minute, and offline too', () => {
    const site = holding('photos', ['users-upload']);
    const gallery = site.featureLevels['photo-gallery'];
    assert.equal(advanceSimulation(site, 30_000, 'live').state.featureLevels['photo-gallery'], gallery + 1);
    assert.equal(advanceSimulation(site, 10 * MINUTE_MS, 'offline').state.featureLevels['photo-gallery'], gallery + 20);
  });

  it('keeps the part of a half minute that hasn’t come round yet', () => {
    const site = holding('photos', ['users-upload']);
    const twice = advanceSimulation(advanceSimulation(site, 20_000, 'live').state, 20_000, 'live').state;
    assert.equal(twice.featureLevels['photo-gallery'], site.featureLevels['photo-gallery'] + 1);
    assert.equal(twice.itemClocksMs['users-upload'], 10_000);
  });

  it('never goes off more than its cap in one step, however long the night', () => {
    const site = holding('photos', ['users-upload']);
    const night = advanceSimulation(site, 1_000 * 30_000 * 2, 'offline').state;
    assert.equal(night.featureLevels['photo-gallery'], site.featureLevels['photo-gallery'] + MAX_GOES_PER_STEP);
  });

  it('edit-a-thon: this era’s smallest feature gains a level', () => {
    const site = holding('wiki', ['edit-a-thon']);
    const smallest = findSmallestFeature(site);
    assert.ok(smallest !== null);
    assert.equal(ERAS_BY_ID[FEATURES_BY_ID[smallest].eraId].baseEraId, 'web2-2005');
    assert.equal(advanceSimulation(site, 20_000, 'live').state.featureLevels[smallest], site.featureLevels[smallest] + 1);
  });

  it('finds no smallest feature on a site with nothing of its era built', () => {
    const empty = { ...at('web2-2005'), featureLevels: Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'] };
    assert.equal(findSmallestFeature(empty), null);
    assert.equal(advanceSimulation(withUpgrades({ ...empty, specializationIds: ['wiki'] }, ['edit-a-thon']), 20_000, 'live').state.featureLevels, empty.featureLevels);
  });

  it('GPU farm builds every eight seconds, and its power bill takes a quarter of revenue', () => {
    const site = holding('ai-studio', ['gpu-farm']);
    assert.equal(calculateUpkeepShare(site) - calculateUpkeepShare(withoutUpgrade(site, 'gpu-farm')), 0.25);
    const smallest = findSmallestFeature(site);
    assert.ok(smallest !== null);
    assert.equal(advanceSimulation(site, 8_000, 'live').state.featureLevels[smallest], site.featureLevels[smallest] + 1);
  });

  it('agents buy the affordable level with the most visitors for the money, and nothing when broke', () => {
    const rich = { ...holding('agent-store', ['agents-buy-for-you']), money: 1e18 };
    const choice = findBestValueFeature(rich);
    assert.ok(choice !== null);
    assert.equal(advanceSimulation(rich, 5_000, 'live').state.featureLevels[choice], rich.featureLevels[choice] + 1);
    const broke = { ...rich, money: 0 };
    assert.equal(findBestValueFeature(broke), null);
  });

  it('typing publishes: every 300th keystroke is a blog level, every 250th a paid newsletter', () => {
    const blogs = holding('blog-network', ['write-every-day']);
    assert.equal(writeCode({ ...blogs, keystrokes: 299, hasPendingBug: false }).state.featureLevels.blog, blogs.featureLevels.blog + 1);
    assert.equal(writeCode({ ...blogs, keystrokes: 300, hasPendingBug: false }).state.featureLevels.blog, blogs.featureLevels.blog);
    const letters = holding('newsletter', ['writers-fund']);
    assert.equal(writeCode({ ...letters, keystrokes: 249, hasPendingBug: false }).state.featureLevels['paid-newsletters'], BUILT_LEVEL + 1);
  });

  it('gives no levels to a feature that has gone from the page', () => {
    const blogs = withLevel(holding('blog-network', ['write-every-day']), 'blog', 0);
    assert.equal(writeCode({ ...blogs, keystrokes: 299, hasPendingBug: false }).state.featureLevels.blog, 0);
  });
});

describe('moderation pays', () => {
  it('volunteer mods: every cleanup grows the forum, and spam clears itself, which counts too', () => {
    const site = holding('forum', ['volunteer-mods']);
    assert.equal(cleanedUp('virus', 'blog')(site).featureLevels.forum, site.featureLevels.forum + 2);
    const spam = infected(withLevel(site, 'comments', 5), 'spam', 'comments');
    const cleaned = advanceSimulation(spam, 21_000, 'live').state;
    assert.deepEqual(cleaned.infections, []);
    assert.equal(cleaned.featureLevels.forum, site.featureLevels.forum + 2);
  });

  it('the fake-review filter learns from spam only', () => {
    const site = holding('reviews', ['fake-review-filter']);
    assert.equal(cleanedUp('spam', 'comments')(site).featureLevels['check-ins'], BUILT_LEVEL + 3);
    assert.equal(cleanedUp('virus', 'blog')(site).featureLevels['check-ins'], BUILT_LEVEL);
  });
});

describe('traffic that depends on the moment, the era and the site', () => {
  const ratio = (withIt: number, withoutIt: number): number => Number((withIt / withoutIt).toFixed(PRECISION));
  const featureRatio = (site: GameState, upgradeId: UpgradeId, featureId: FeatureId): number =>
    ratio(calculateFeatureVisitorsPerSecond(site, featureId), calculateFeatureVisitorsPerSecond(withoutUpgrade(site, upgradeId), featureId));

  it('post counts double the forum while you’re on fire, and only then', () => {
    const site = holding('forum', ['post-counts']);
    assert.equal(featureRatio(onFire(site), 'post-counts', 'forum'), 2);
    assert.equal(featureRatio(site, 'post-counts', 'forum'), 1);
  });

  it('disappearing stories: filters triple while you type and halve when you stop', () => {
    const site = holding('stories', ['disappearing-stories']);
    assert.equal(featureRatio(typing(site), 'disappearing-stories', 'filters-and-lenses'), 3);
    assert.equal(featureRatio(idle(site), 'disappearing-stories', 'filters-and-lenses'), 0.5);
  });

  it('the long tail grows member blogs a twentieth a minute, up to three times', () => {
    const site = holding('blog-network', ['long-tail']);
    const after = (minutes: number): GameState => ({ ...site, eraStats: { ...site.eraStats, elapsedMs: minutes * MINUTE_MS } });
    assert.equal(featureRatio(after(10), 'long-tail', 'member-blogs'), 1.5);
    assert.equal(featureRatio(after(90), 'long-tail', 'member-blogs'), 3);
  });

  it('counts the era’s minutes offline too', () => {
    const site = holding('blog-network');
    assert.equal(advanceSimulation(site, MINUTE_MS, 'offline').state.eraStats.elapsedMs, site.eraStats.elapsedMs + MINUTE_MS);
  });

  it('network effect: each doubling since the era began, up to a quarter more', () => {
    const site = holding('social', ['network-effect']);
    const base = calculateBaseVisitorsPerSecond(site);
    const since = (anchor: number): number => calculateSpecializationTrafficFactor({ ...site, eraStats: { ...site.eraStats, startBaseVisitors: anchor } });
    assert.equal(Number(since(base / 4).toFixed(PRECISION)), Number((1.05 ** 2).toFixed(PRECISION)));
    assert.equal(since(base / 1e9), 1.25);
    assert.equal(since(base * 2), 1, 'a site smaller than it began gets nothing');
    assert.equal(since(0), 1, 'nothing to count from');
  });

  it('people you may know: every share-buttons level adds half a percent to all traffic', () => {
    const site = holding('social', ['people-you-may-know']);
    assert.equal(Number(calculateSpecializationTrafficFactor(site).toFixed(PRECISION)), Number((1 + 0.005 * site.featureLevels['share-buttons']).toFixed(PRECISION)));
  });

  it('the algorithm: the busiest feature triples, every other one drops to 0.7', () => {
    const site = holding('short-video', ['the-algorithm']);
    const without = withoutUpgrade(site, 'the-algorithm');
    const busiest = [...FEATURE_IDS].sort((first, second) => calculateFeatureVisitorsPerSecond(without, second) - calculateFeatureVisitorsPerSecond(without, first));
    const [top, next] = busiest;
    assert.ok(top !== undefined && next !== undefined);
    assert.equal(featureRatio(site, 'the-algorithm', top), 3);
    assert.equal(featureRatio(site, 'the-algorithm', next), 0.7);
  });

  it('live-posting: on fire, all traffic half again', () => {
    assert.equal(calculateSpecializationTrafficFactor(onFire(holding('microblog', ['live-posting']))), 1.5);
  });
});

describe('spikes, offers and events', () => {
  it('going viral and clickbait each bring spikes half again as often, and stack', () => {
    assert.equal(calculateSpikeFrequencyFactor(holding('video', ['going-viral'])), 1.5);
    const both = withUpgrades(holding('news', ['clickbait']), ['going-viral']);
    assert.equal(calculateSpikeFrequencyFactor(both), 2.25);
  });

  it('surge pricing: every visitor pays half again during a spike', () => {
    const site = holding('marketplace', ['surge-pricing']);
    assert.equal(Number((calculateRevenuePerVisitor(inSpike(site)) / calculateRevenuePerVisitor(site)).toFixed(PRECISION)), 1.5);
  });

  it('breaking news: catching fire starts a spike, but never a second one on top', () => {
    const site = holding('news', ['breaking-news']);
    assert.equal(caughtFire(site).trafficSpikeRemainingMs, TRAFFIC_SPIKE_DURATION_MS);
    assert.equal(caughtFire(withoutUpgrade(site, 'breaking-news')).trafficSpikeRemainingMs, 0);
    assert.equal(caughtFire({ ...site, trafficSpikeRemainingMs: 1_000 }).trafficSpikeRemainingMs, 1_000);
    assert.equal(breakNewsOnFire(site, site).trafficSpikeRemainingMs, 0, 'no fire, no news');
  });

  it('influencers: offers count down twice as fast', () => {
    const site = { ...holding('stories', ['influencers']), opportunity: null, opportunityCountdownMs: MINUTE_MS };
    assert.equal(calculateOfferFrequencyFactor(site), 2);
    assert.equal(advanceSimulation(site, 10_000, 'live').state.opportunityCountdownMs, MINUTE_MS - 20_000);
  });

  it('live events start themselves every three minutes, at the keyboard only', () => {
    const site = holding('live-streaming', ['live-events']);
    assert.ok(advanceSimulation(site, 3 * MINUTE_MS, 'live').state.buffs.some((buff) => buff.id === 'live-event'));
    assert.deepEqual(advanceSimulation(site, 10 * MINUTE_MS, 'offline').state.buffs, []);
  });

  it('Black Friday: every five minutes, ads pay triple', () => {
    const site = holding('shop', ['black-friday']);
    const sale = advanceSimulation(site, 5 * MINUTE_MS, 'live').state;
    assert.ok(sale.buffs.some((buff) => buff.id === 'black-friday'));
    assert.equal(Number((calculateAdValuePerAd(sale) / calculateAdValuePerAd({ ...sale, buffs: [] })).toFixed(PRECISION)), 3);
  });
});

describe('money that isn’t banners', () => {
  it('subscribers grow towards their share over a few minutes, and stay a while when the site goes down', () => {
    const site = holding('streaming-service', ['subscriptions']);
    const target = calculateSubscriptionTarget(site);
    assert.ok(target > 0);
    const risen = updateSubscriptions(site, SUBSCRIBER_RISE_MS);
    assert.equal(Number((risen.subscriptionRevenuePerSecond / target).toFixed(PRECISION)), Number((1 - Math.exp(-1)).toFixed(PRECISION)));
    assert.ok(calculateNetRevenuePerSecond(risen) > calculateNetRevenuePerSecond(site));
    const down = { ...risen, featureLevels: Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'] };
    const churned = updateSubscriptions(down, SUBSCRIBER_CHURN_MS);
    assert.equal(Number((churned.subscriptionRevenuePerSecond / risen.subscriptionRevenuePerSecond).toFixed(PRECISION)), Number(Math.exp(-1).toFixed(PRECISION)));
  });

  it('it remembers you: subscribers leave ten times slower', () => {
    const site = afterSubscribing(holding('ai-companion', ['it-remembers-you']));
    const down = { ...site, featureLevels: Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, 0])) as GameState['featureLevels'] };
    const churned = updateSubscriptions(down, SUBSCRIBER_CHURN_MS * 10);
    assert.equal(Number((churned.subscriptionRevenuePerSecond / site.subscriptionRevenuePerSecond).toFixed(PRECISION)), Number(Math.exp(-1).toFixed(PRECISION)));
  });

  it('leaves a site without subscribers alone', () => {
    const site = holding('video');
    assert.equal(updateSubscriptions(site, MINUTE_MS), site);
  });

  it('donations pay most on a site without ads: a quarter less for each one', () => {
    const site = holding('wiki', ['donation-drive']);
    const added = (ads: number): number => calculateDirectRevenuePerVisitor({ ...site, adCount: ads }) - calculateDirectRevenuePerVisitor(withoutUpgrade({ ...site, adCount: ads }, 'donation-drive'));
    const pace = ERAS_BY_ID['web2-2005'].revenuePace;
    assert.equal(Number(added(0).toFixed(PRECISION)), Number((0.3 / pace).toFixed(PRECISION)));
    assert.equal(Number(added(2).toFixed(PRECISION)), Number((0.15 / pace).toFixed(PRECISION)));
    assert.equal(added(5), 0);
  });

  it('elite reviewers: phone visitors pay half again, so every visitor pays more by the phone share', () => {
    const site = holding('reviews', ['elite-reviewers']);
    const gain = calculateRevenuePerVisitor(site) / calculateRevenuePerVisitor(withoutUpgrade(site, 'elite-reviewers'));
    assert.ok(gain > 1.1 && gain < 1.5, String(gain));
  });

  it('customers also bought: every level of this era’s features adds a fifth of a percent, not the levels of 1997', () => {
    const site = holding('shop', ['customers-also-bought']);
    const ofThisEra = FEATURE_IDS.filter((featureId) => isFeatureOnPage(site, featureId) && ERAS_BY_ID[FEATURES_BY_ID[featureId].eraId].baseEraId === 'social-2011');
    const levels = ofThisEra.reduce((total, featureId) => total + site.featureLevels[featureId], 0);
    assert.ok(site.featureLevels.guestbook > 0, 'old levels on the page that don’t count');
    const gain = calculateRevenuePerVisitor(site) / calculateRevenuePerVisitor(withoutUpgrade(site, 'customers-also-bought'));
    assert.equal(Number(gain.toFixed(PRECISION)), Number((1 + 0.002 * levels).toFixed(PRECISION)));
  });

  it('endorsements: ads pay 15% more for every specialization held', () => {
    const site = stackedWith(['photos', 'social'])(holding('professional', ['endorsements']));
    assert.equal(Number((calculateAdValuePerAd(site) / calculateAdValuePerAd(withoutUpgrade(site, 'endorsements'))).toFixed(PRECISION)), 1.45);
  });

  it('answer, don’t link: the visitors AI answers keep away still pay most of their way', () => {
    const site = holding('ai-answers', ['answer-dont-link']);
    assert.ok(calculateNetRevenuePerSecond(site) > calculateNetRevenuePerSecond(withoutUpgrade(site, 'answer-dont-link')));
  });

  it('sponsored answers: everyone pays, and answers keep more visitors away', () => {
    const site = holding('ai-answers', ['sponsored-answers']);
    const without = withoutUpgrade(site, 'sponsored-answers');
    assert.equal(Number((calculateAiAnswerShare(site) / calculateAiAnswerShare(without)).toFixed(PRECISION)), 1.3);
    assert.ok(calculateDirectRevenuePerVisitor(site) > calculateDirectRevenuePerVisitor(without));
  });

  it('take rate: every feature level costs 15% less', () => {
    const site = holding('marketplace', ['take-rate']);
    const cost = calculateNextFeatureCost(site, 'seller-dashboards');
    assert.ok(Math.abs(cost / calculateNextFeatureCost(withoutUpgrade(site, 'take-rate'), 'seller-dashboards') - 0.85) < 0.001);
  });

  it('talks while you sleep: hired help types twice as fast', () => {
    const site = holding('ai-companion', ['talks-while-you-sleep']);
    const hired = calculateAutoKeystrokesPerSecond(withoutUpgrade(site, 'talks-while-you-sleep'));
    assert.ok(hired > 0);
    assert.equal(calculateAutoKeystrokesPerSecond(site), hired * 2);
  });

  it('binge autoplay and infinite scroll cut the wait', () => {
    const streaming = holding('streaming-service', ['binge-autoplay']);
    assert.ok(calculateLoadTimeSeconds(streaming) < calculateLoadTimeSeconds(withoutUpgrade(streaming, 'binge-autoplay')));
  });

  it('hired typing stays the same without the boost: typing pay isn’t touched', () => {
    const site = holding('ai-companion', ['talks-while-you-sleep']);
    assert.equal(calculateKeystrokeValue(site), calculateKeystrokeValue(withoutUpgrade(site, 'talks-while-you-sleep')));
  });
});

describe('buying them', () => {
  it('a held specialization’s skill can be bought with money, like any other', () => {
    const site = { ...withoutUpgrade(holding('video'), 'learn-flash-video'), money: 1e12 };
    assert.ok(buyUpgrade(site, 'learn-flash-video').purchasedUpgradeIds.includes('learn-flash-video'));
    assert.ok(!buyUpgrade({ ...site, specializationIds: [] }, 'learn-flash-video').purchasedUpgradeIds.includes('learn-flash-video'));
  });
});
