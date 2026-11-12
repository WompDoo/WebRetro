import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buyUpgrade,
  calculateDemandVisitorsPerSecond,
  calculateLoadTimeSeconds,
  calculateUpgradeCost,
  createPlaytestState,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';

const SEED = 9;
const MONEY = 1e15;
const FRAMEWORK_SKILLS: readonly UpgradeId[] = ['learn-react', 'learn-angular', 'learn-vue', 'nextjs-ssr', 'angular-universal', 'nuxt-ssr'];
const in2018 = (skills: readonly UpgradeId[]): GameState => {
  const start = createPlaytestState('platform-2018', 'start', SEED, 'react');
  return { ...start, money: MONEY, purchasedUpgradeIds: [...start.purchasedUpgradeIds.filter((id) => !FRAMEWORK_SKILLS.includes(id)), ...skills] };
};
const price = (state: GameState, upgradeId: UpgradeId): number => calculateUpgradeCost(state, upgradeId) / UPGRADES_BY_ID[upgradeId].cost;

describe('2018: what sets each framework apart', () => {
  it('React: npm has a package for it, so 2018’s other skills and boosts cost a fifth less', () => {
    const react = in2018(['learn-react']);
    (['mobile-first', 'learn-payments', 'ci-pipeline', 'growth-hacking', 'nextjs-ssr'] as const).forEach((upgradeId) => assert.equal(price(react, upgradeId).toFixed(2), '0.80'));
    assert.equal(price(in2018(['learn-vue']), 'growth-hacking'), 1);
  });

  it('Angular: forms, HTTP, RxJS and the CLI are built in, so payments, logins, live updates and CI cost half, and nothing else does', () => {
    const angular = in2018(['learn-angular']);
    (['learn-payments', 'learn-oauth', 'learn-websockets', 'ci-pipeline'] as const).forEach((upgradeId) => assert.equal(price(angular, upgradeId).toFixed(2), '0.50'));
    assert.equal(price(angular, 'growth-hacking'), 1);
  });

  it('charges the framework’s price, not the list price', () => {
    const angular = in2018(['learn-angular']);
    const bought = buyUpgrade(angular, 'learn-payments');
    assert.equal(angular.money - bought.money, UPGRADES_BY_ID['learn-payments'].cost / 2);
  });

  it('Vue: progressive, so before server rendering it loads faster and loses fewer search visitors than React', () => {
    const vue = in2018(['learn-vue']);
    const react = in2018(['learn-react']);
    const loadPenalty = (state: GameState, ssr: UpgradeId): number => calculateLoadTimeSeconds(state) / calculateLoadTimeSeconds({ ...state, purchasedUpgradeIds: [...state.purchasedUpgradeIds, ssr] });
    const searchLoss = (state: GameState, ssr: UpgradeId): number =>
      1 - calculateDemandVisitorsPerSecond(state) / calculateDemandVisitorsPerSecond({ ...state, purchasedUpgradeIds: [...state.purchasedUpgradeIds, ssr] });
    assert.ok(loadPenalty(vue, 'nuxt-ssr') < loadPenalty(react, 'nextjs-ssr'));
    assert.ok(searchLoss(vue, 'nuxt-ssr') < searchLoss(react, 'nextjs-ssr'));
  });
});
