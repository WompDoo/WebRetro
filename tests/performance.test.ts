import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceHazards,
  calculateDemandVisitorsPerSecond,
  calculateLoadTimeSeconds,
  calculatePageWeightKb,
  calculatePerformanceTrafficFactor,
  calculateServerLoad,
  calculateVisitorsPerSecond,
  createInitialGameState,
  HOSTING_TIERS,
  isSiteDown,
  toggleFeature,
  upgradeHosting,
} from '../src/engine';
import type { GameState } from '../src/engine';

const QUIET_HAZARDS = { popup: 9e9, virus: 9e9, spam: 9e9, 'sql-injection': 9e9, 'traffic-spike': 9e9 };
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
  it('a Hello World page loads well within 1997 patience', () => {
    assert.ok(calculateLoadTimeSeconds(fresh()) < 1);
    assert.equal(calculatePerformanceTrafficFactor(fresh()), 1);
  });

  it('a tiled BODY BACKGROUND makes every page load heavier', () => {
    const withBackground: GameState = { ...fresh(), purchasedUpgradeIds: ['body-background'] };
    assert.ok(calculatePageWeightKb(withBackground) > calculatePageWeightKb(fresh()));
  });

  it('a heavy 1997 page over the modem loses visitors', () => {
    const heavy: GameState = { ...fresh(), purchasedUpgradeIds: ['img-tag', 'embed-tag'], adCount: 6, featureLevels: { ...fresh().featureLevels, 'hit-counter': 1, 'midi-player': 40 } };
    assert.ok(calculateLoadTimeSeconds(heavy) > 30);
    assert.ok(calculatePerformanceTrafficFactor(heavy) < 1);
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

  it('goes down at twice the hosting capacity and serves nobody', () => {
    const overloaded = web2(OVERLOADING_BLOG_LEVEL);
    assert.ok(calculateServerLoad(overloaded) >= 2, `load was ${calculateServerLoad(overloaded)}`);
    assert.equal(isSiteDown(overloaded), true);
    assert.equal(calculateVisitorsPerSecond(overloaded), 0);
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
