import { ERAS_BY_ID } from './content/eras';
import {
  calculateFeatureLevelsNetVisitors,
  calculateNextFeatureCost,
  calculateVisitorsPerSecond,
  getActiveUpgradeIds,
  isEraUnlocked,
  isFeatureOnPage,
} from './economy';
import type { EraId, FeatureId, GameState, UpgradeId } from './types';

/**
 * Every level adds weight, so a big feature slows the whole page. Once its card says so, two ways out appear there:
 *
 * - Sunset a level (from 2005, once web analytics shows what nobody uses): it leaves the page, takes its visitors with
 *   it, and pays a trade-in back, the way a feature that goes out of fashion does at a relaunch.
 * - Refactor it (from 2011): developer time costs money; every level stays, each weighs half as much, and the bugs a
 *   rewrite ships drive some of its users off for good. Tests and reviews (QA, in the Ops tab) catch most of them.
 */

/** Offered from this level: below it there's too little of the feature to bother. */
export const HEAVY_FEATURE_FROM_LEVEL = 5;
/** The first refactor costs as much as this many of the feature's next level; each one after costs double the last. */
const REFACTOR_PRICE_IN_LEVELS = 3;
const REFACTOR_PRICE_GROWTH = 2;
/** A sunset level pays back this share of what that level costs now. */
export const SUNSET_TRADE_IN_SHARE = 0.5;
/** Refactoring arrives with 2011: test runners and build tools made rewriting part of a site routine. */
export const REFACTOR_FROM_ERA: EraId = 'social-2011';
/** Sunsetting needs to know what nobody uses: web analytics, a 2005 skill. */
export const SUNSET_SKILL: UpgradeId = 'web-analytics';

/** Its next level would cost more visitors in load time than it brings: the card already says so in red. */
function isNextLevelANetLoss(state: GameState, featureId: FeatureId): boolean {
  return calculateFeatureLevelsNetVisitors(state, featureId, 1) < 0;
}

function isSlowingThePage(state: GameState, featureId: FeatureId): boolean {
  return state.featureLevels[featureId] >= HEAVY_FEATURE_FROM_LEVEL && isNextLevelANetLoss(state, featureId);
}

/** Its weight slows the page: the card's red line. Only then do the ways out show, and only in eras that weigh pages. */
export function isFeatureTooHeavy(state: GameState, featureId: FeatureId): boolean {
  return ERAS_BY_ID[state.eraId].hasPageWeight && isFeatureOnPage(state, featureId) && isSlowingThePage(state, featureId);
}

export function isRefactorUnlocked(state: GameState): boolean {
  return isEraUnlocked(state, REFACTOR_FROM_ERA);
}

export function isSunsetUnlocked(state: GameState): boolean {
  return getActiveUpgradeIds(state).includes(SUNSET_SKILL);
}

export function isRefactorOffered(state: GameState, featureId: FeatureId): boolean {
  return isRefactorUnlocked(state) && isFeatureTooHeavy(state, featureId);
}

export function isSunsetOffered(state: GameState, featureId: FeatureId): boolean {
  return isSunsetUnlocked(state) && isFeatureTooHeavy(state, featureId);
}

// ---------- Refactor ----------

export function calculateRefactorCost(state: GameState, featureId: FeatureId): number {
  return calculateNextFeatureCost(state, featureId) * REFACTOR_PRICE_IN_LEVELS * REFACTOR_PRICE_GROWTH ** state.refactorCounts[featureId];
}

export function canRefactorFeature(state: GameState, featureId: FeatureId): boolean {
  return isRefactorOffered(state, featureId) && state.money >= calculateRefactorCost(state, featureId);
}

function withRefactor(state: GameState, featureId: FeatureId): GameState {
  return { ...state, refactorCounts: { ...state.refactorCounts, [featureId]: state.refactorCounts[featureId] + 1 } };
}

export function refactorFeature(state: GameState, featureId: FeatureId): GameState {
  if (!canRefactorFeature(state, featureId)) return state;
  return withRefactor({ ...state, money: state.money - calculateRefactorCost(state, featureId) }, featureId);
}

/** What a refactor does overall: the visitors a lighter page keeps, less the users its bugs drive off. Can be negative. */
export function calculateRefactorNetVisitors(state: GameState, featureId: FeatureId): number {
  return calculateVisitorsPerSecond(withRefactor(state, featureId)) - calculateVisitorsPerSecond(state);
}

// ---------- Sunset a level ----------

function withoutLastLevel(state: GameState, featureId: FeatureId): GameState {
  return { ...state, featureLevels: { ...state.featureLevels, [featureId]: state.featureLevels[featureId] - 1 } };
}

/** Half of what the level would cost to build again. */
export function calculateSunsetTradeIn(state: GameState, featureId: FeatureId): number {
  return calculateNextFeatureCost(withoutLastLevel(state, featureId), featureId) * SUNSET_TRADE_IN_SHARE;
}

export function canSunsetLevel(state: GameState, featureId: FeatureId): boolean {
  return isSunsetOffered(state, featureId);
}

export function sunsetLevel(state: GameState, featureId: FeatureId): GameState {
  if (!canSunsetLevel(state, featureId)) return state;
  const tradeIn = calculateSunsetTradeIn(state, featureId);
  return { ...withoutLastLevel(state, featureId), money: state.money + tradeIn };
}

/** What sunsetting a level does overall: its own visitors gone, and the ones a lighter page keeps. Can be either sign. */
export function calculateSunsetNetVisitors(state: GameState, featureId: FeatureId): number {
  return calculateFeatureLevelsNetVisitors(state, featureId, -1);
}
