import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceHazards,
  buyFeature,
  buyFeatureLevels,
  calculateFeatureLevelsCost,
  calculateNextFeatureCost,
  calculateDemandVisitorsPerSecond,
  calculateLoadTimeSeconds,
  calculatePageWeightKb,
  calculatePerformanceTrafficFactor,
  calculatePhoneLoadTimeSeconds,
  calculateStayShare,
  calculateServerLoad,
  calculateVisitorsPerSecond,
  createInitialGameState,
  HOSTING_TIERS,
  isSiteDown,
  toggleFeature,
  upgradeHosting,
} from '../src/engine';
import type { GameState } from '../src/engine';
import { QUIET_HAZARDS } from './quiet-hazards';

const fresh = (): GameState => ({ ...createInitialGameState(1), hazardCountdownsMs: QUIET_HAZARDS });
const web2 = (blogLevel: number, extra: Partial<GameState> = {}): GameState => ({
  ...fresh(),
  eraId: 'web2-2005',
  purchasedUpgradeIds: ['learn-php'],
  featureLevels: { ...fresh().featureLevels, blog: blogLevel },
  ...extra,
});
/** About three times what shared hosting carries, and a fifth of what a VPS carries. */
const OVERLOADING_BLOG_LEVEL = 20;
const sharedCapacity = HOSTING_TIERS[0]?.capacityVisitorsPerSecond ?? 0;

describe('page load', () => {
  it('a Hello World page loads well within 1997 patience: next to nobody leaves', () => {
    assert.ok(calculateLoadTimeSeconds(fresh()) < 1);
    assert.ok(calculatePerformanceTrafficFactor(fresh()) > 0.999);
  });

  it('costs a little more with every second, never everyone', () => {
    const shares = [0, 1.5, 3, 6, 12, 1_000].map((seconds) => calculateStayShare(seconds, 3));
    shares.slice(1).forEach((share, index) => assert.ok(share < (shares[index] ?? 1)));
    assert.equal(shares[0], 1);
    assert.ok(Math.abs((shares[2] ?? 0) - 0.846) < 0.01, 'about 15% leave at the era’s patience');
    assert.ok((shares[5] ?? 0) > 0.5, 'some always wait');
  });

  it('is slower on a 2011 phone than on a desktop, and phone visitors pay for it', () => {
    const in2011: GameState = { ...fresh(), eraId: 'social-2011', purchasedUpgradeIds: ['responsive-design'], featureLevels: { ...fresh().featureLevels, blog: 10, 'photo-gallery': 10 }, adCount: 6 };
    const desktopOnly: GameState = { ...in2011, eraId: 'web2-2005' };
    assert.ok(calculatePhoneLoadTimeSeconds(in2011) > calculateLoadTimeSeconds(in2011) * 5);
    assert.ok(calculatePerformanceTrafficFactor(in2011) < calculateStayShare(calculateLoadTimeSeconds(in2011), 5));
    assert.ok(calculatePerformanceTrafficFactor(desktopOnly) > 0);
  });

  it('a tiled BODY BACKGROUND makes every page load heavier', () => {
    const withBackground: GameState = { ...fresh(), purchasedUpgradeIds: ['body-background'] };
    assert.ok(calculatePageWeightKb(withBackground) > calculatePageWeightKb(fresh()));
  });

  it('loses no visitors to a heavy page in 1997: load times only count from 2005', () => {
    const heavy: GameState = { ...fresh(), purchasedUpgradeIds: ['img-tag', 'embed-tag'], adCount: 6, featureLevels: { ...fresh().featureLevels, 'hit-counter': 1, 'midi-player': 40 } };
    assert.ok(calculateLoadTimeSeconds(heavy) > 30);
    assert.equal(calculatePerformanceTrafficFactor(heavy), 1);
    assert.ok(calculatePerformanceTrafficFactor({ ...heavy, eraId: 'web2-2005' }) < 1);
  });
});

describe('switching the Flash intro off', () => {
  const withIntro = (): GameState => web2(2, {
    purchasedUpgradeIds: ['learn-php', 'learn-flash'],
    featureLevels: { ...fresh().featureLevels, blog: 2, 'flash-intro': 1 },
  });

  it('removes its page weight and its visitors, and keeps its level', () => {
    const switchedOff = toggleFeature(withIntro(), 'flash-intro');
    assert.ok(calculatePageWeightKb(switchedOff) < calculatePageWeightKb(withIntro()));
    assert.equal(switchedOff.featureLevels['flash-intro'], 1);
  });

  it('can be switched back on', () => {
    const backOn = toggleFeature(toggleFeature(withIntro(), 'flash-intro'), 'flash-intro');
    assert.equal(calculatePageWeightKb(backOn), calculatePageWeightKb(withIntro()));
  });

  it('does nothing for a feature that is not switchable', () => {
    const state = withIntro();
    assert.equal(toggleFeature(state, 'blog'), state);
  });

  it('does nothing for an intro you have not built', () => {
    const notBuilt = fresh();
    assert.equal(toggleFeature(notBuilt, 'flash-intro'), notBuilt);
  });
});

describe('server load', () => {
  it('1997 has no server to overload', () => {
    assert.equal(calculateServerLoad(fresh()), 0);
  });

  it('shows the 503 page at twice the hosting capacity, but still serves what it can', () => {
    const overloaded = web2(OVERLOADING_BLOG_LEVEL);
    assert.ok(calculateServerLoad(overloaded) >= 2, `load was ${calculateServerLoad(overloaded)}`);
    assert.equal(isSiteDown(overloaded), true);
    assert.ok(calculateVisitorsPerSecond(overloaded) > 0, 'an overloaded server must never drop to zero');
    assert.ok(calculateVisitorsPerSecond(overloaded) <= sharedCapacity);
  });

  it('a hosting upgrade raises capacity and brings the site back', () => {
    const overloaded = { ...web2(OVERLOADING_BLOG_LEVEL), money: 1e9 };
    const upgraded = upgradeHosting(overloaded);
    assert.equal(upgraded.hostingTier, 1);
    assert.ok(calculateServerLoad(upgraded) < calculateServerLoad(overloaded));
    assert.equal(isSiteDown(upgraded), false);
  });

  it('a front-page spike multiplies demand', () => {
    const calm = web2(2);
    const spiking = { ...calm, trafficSpikeRemainingMs: 10_000 };
    assert.ok(calculateDemandVisitorsPerSecond(spiking) > calculateDemandVisitorsPerSecond(calm) * 4);
    assert.ok(sharedCapacity > 0);
  });
});

describe('SQL injection', () => {
  const due = (state: GameState): GameState => ({ ...state, hazardCountdownsMs: { ...QUIET_HAZARDS, 'sql-injection': 0 } });

  it('breaks a database feature when you never learned prepared statements', () => {
    const step = advanceHazards(due(web2(3)), 100);
    assert.equal(step.state.infections.filter((infection) => infection.kind === 'sql-injection').length, 1);
  });

  it('never happens once you use prepared statements', () => {
    const safe = due(web2(3, { purchasedUpgradeIds: ['learn-php', 'prepared-statements'] }));
    assert.equal(advanceHazards(safe, 100).state.infections.length, 0);
  });
});

describe('multi-buy', () => {
  const rich = (): GameState => ({ ...fresh(), money: 1e9, purchasedUpgradeIds: ['img-tag'], featureLevels: { ...fresh().featureLevels, 'hit-counter': 3 } });

  it('costs what the levels cost one at a time', () => {
    const singles = [0, 1, 2, 3, 4].reduce<{ state: GameState; total: number }>(
      (sum) => ({ state: buyFeature(sum.state, 'hit-counter'), total: sum.total + calculateNextFeatureCost(sum.state, 'hit-counter') }),
      { state: rich(), total: 0 },
    );
    assert.equal(calculateFeatureLevelsCost(rich(), 'hit-counter', 5), singles.total);
    assert.equal(buyFeatureLevels(rich(), 'hit-counter', 5).money, singles.state.money);
  });

  it('buys all the levels or none', () => {
    const tenCost = calculateFeatureLevelsCost(rich(), 'hit-counter', 10);
    const almost = { ...rich(), money: tenCost - 1 };
    assert.equal(buyFeatureLevels(almost, 'hit-counter', 10), almost);
    assert.equal(buyFeatureLevels({ ...rich(), money: tenCost }, 'hit-counter', 10).featureLevels['hit-counter'], 13);
  });

  it('respects the skill a feature needs', () => {
    const unskilled = { ...rich(), purchasedUpgradeIds: [] };
    assert.equal(buyFeatureLevels(unskilled, 'hit-counter', 5), unskilled);
  });
});
