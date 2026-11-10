import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDemandVisitorsPerSecond,
  calculateFeatureVisitorsPerSecond,
  calculateGlobalTrafficFactor,
  calculateServerLoad,
  calculateVisitorsPerSecond,
  createInitialGameState,
  getNextHostingTier,
  advanceEra,
  getEraHostingTiers,
  getHostingTier,
  isEraGateComplete,
  HOSTING_TIERS,
  isSiteDown,
  TRAFFIC_SPIKE_DURATION_MS,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';

const QUIET_HAZARDS = { popup: 9e9, virus: 9e9, spam: 9e9, 'sql-injection': 9e9, 'traffic-spike': 9e9 };
const fresh = (): GameState => ({ ...createInitialGameState(1), hazardCountdownsMs: QUIET_HAZARDS });
/** A 2005 blog big enough to keep shared hosting busy. */
const busyBlog = (upgrades: readonly UpgradeId[] = [], extra: Partial<GameState> = {}): GameState => ({
  ...fresh(),
  eraId: 'web2-2005',
  purchasedUpgradeIds: ['learn-php', ...upgrades],
  featureLevels: { ...fresh().featureLevels, blog: 4 },
  ...extra,
});

const ladder2005 = getEraHostingTiers('web2-2005');
const ladder2011 = getEraHostingTiers('social-2011');

function climbsSteadily(ladder: typeof ladder2005): void {
  ladder.slice(1).forEach((tier, index) => {
    const previous = ladder[index];
    assert.ok(previous !== undefined);
    assert.ok(tier.capacityVisitorsPerSecond > previous.capacityVisitorsPerSecond, tier.id);
    assert.ok(tier.cost > previous.cost, tier.id);
  });
}

describe('the 2005 hosting ladder', () => {
  it('every step carries more and costs more than the one before', () => climbsSteadily(ladder2005));

  it('follows history: no step is dated before the one it replaces, and none is the cloud', () => {
    ladder2005.slice(1).forEach((tier, index) => assert.ok(tier.year >= (ladder2005[index]?.year ?? 0), tier.id));
    assert.ok(ladder2005.every((tier) => tier.year <= 2009 && !tier.name.toLowerCase().includes('cloud')));
  });

  it('always has a next step for anyone who can still pay: there is no ceiling to run into', () => {
    const lateGame: GameState = { ...busyBlog(), hostingTier: 30 };
    assert.notEqual(getNextHostingTier(lateGame), null);
  });
});

describe('the 2011 cloud', () => {
  it('replaces the racks: every 2011 step is the cloud, and it keeps scaling', () => {
    assert.ok(ladder2011.length > 20);
    assert.ok(ladder2011.every((tier) => tier.name.startsWith('The cloud')));
    climbsSteadily(ladder2011);
  });

  it('comes with the relaunch: the first step is free, and the relaunch starts at the bottom of it', () => {
    assert.equal(ladder2011[0]?.cost, 0);
    const everyFeatureBuilt = Object.fromEntries(Object.keys(fresh().featureLevels).map((featureId) => [featureId, 30])) as GameState['featureLevels'];
    const finished2005: GameState = { ...busyBlog(), hostingTier: 9, money: 2e9, featureLevels: { ...everyFeatureBuilt, 'share-buttons': 0, 'video-player': 0, 'activity-feed': 0 } };
    assert.ok(isEraGateComplete(finished2005), 'the fixture should pass the 2005 gate');
    const relaunched = advanceEra(finished2005);
    assert.equal(relaunched.eraId, 'social-2011');
    assert.equal(relaunched.hostingTier, 0);
    assert.equal(getHostingTier(relaunched).id, ladder2011[0]?.id);
  });
});

describe('server load per visitor', () => {
  it('memcached and a CDN each halve the load the same visitors put on the server', () => {
    const plain = calculateServerLoad(busyBlog());
    const cached = calculateServerLoad(busyBlog(['memcached']));
    const cachedAndCdn = calculateServerLoad(busyBlog(['memcached', 'cdn']));
    assert.ok(Math.abs(cached - plain / 2) < 1e-9);
    assert.ok(Math.abs(cachedAndCdn - plain / 4) < 1e-9);
  });

  it('caching raises the ceiling on how many visitors you can earn from', () => {
    const overloaded = busyBlog([], { featureLevels: { ...fresh().featureLevels, blog: 30 } });
    const withCaching = busyBlog(['memcached'], { featureLevels: { ...fresh().featureLevels, blog: 30 } });
    assert.ok(calculateVisitorsPerSecond(withCaching) > calculateVisitorsPerSecond(overloaded));
  });
});

describe('a traffic spike', () => {
  const spiking = (upgrades: readonly UpgradeId[]): GameState => busyBlog(upgrades, { trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS });

  it('takes an unprepared site down', () => {
    assert.ok(isSiteDown(spiking([])));
  });

  it('puts no load on the server once you have a page cache', () => {
    assert.equal(calculateServerLoad(spiking(['page-cache'])), calculateServerLoad(busyBlog(['page-cache'])));
    assert.equal(isSiteDown(spiking(['page-cache'])), false);
  });

  it('is protection, not a jackpot: you still only earn from what your hosting carries', () => {
    const cachedSpike = spiking(['page-cache']);
    assert.ok(calculateDemandVisitorsPerSecond(cachedSpike) > calculateVisitorsPerSecond(cachedSpike));
    assert.ok(calculateVisitorsPerSecond(cachedSpike) <= (HOSTING_TIERS[0]?.capacityVisitorsPerSecond ?? 0));
  });
});

describe('CAPTCHA', () => {
  const withComments = (defenses: GameState['enabledDefenseIds']): GameState =>
    busyBlog(['learn-ajax'], {
      featureLevels: { ...fresh().featureLevels, blog: 4, comments: 2 },
      ownedDefenseIds: defenses,
      enabledDefenseIds: defenses,
    });

  it('costs only the comments some visitors, because only commenters meet it', () => {
    const off = withComments([]);
    const on = withComments(['captcha']);
    assert.equal(calculateGlobalTrafficFactor(on), calculateGlobalTrafficFactor(off));
    assert.equal(calculateFeatureVisitorsPerSecond(on, 'blog'), calculateFeatureVisitorsPerSecond(off, 'blog'));
    assert.ok(calculateFeatureVisitorsPerSecond(on, 'comments') < calculateFeatureVisitorsPerSecond(off, 'comments'));
  });
});
