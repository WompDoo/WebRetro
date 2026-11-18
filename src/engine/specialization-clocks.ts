import { buyFeature, canBuyFeature } from './actions';
import { startBuff } from './buffs';
import { ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, FEATURES_BY_ID } from './content/features';
import { UPGRADES_BY_ID } from './content/upgrades';
import {
  calculateFeatureVisitorsPerLevel,
  calculateNextFeatureCost,
  calculateSubscriberChurnFactor,
  calculateSubscriptionTarget,
  getUnlockedFeatureIds,
  isFeatureOnPage,
  isFeatureSwitchedOff,
  isUpgradeRetired,
} from './economy';
import { addFeatureLevels } from './specialization-hooks';
import type { FeatureId, GameState, SimulationMode, UpgradeEffect, UpgradeId } from './types';

/**
 * The specializations' mechanics that run on a clock: features that level themselves, events on a schedule, agents
 * that shop for you, and the subscriber pool that follows the site slowly. Pure: state in, state out.
 */

type ScheduledKind = 'auto-level' | 'scheduled-buff' | 'auto-buyer';
type ScheduledEffect = Extract<UpgradeEffect, { readonly kind: ScheduledKind }>;

interface ScheduledItem {
  readonly upgradeId: UpgradeId;
  readonly effect: ScheduledEffect;
}

const SCHEDULED_KINDS: readonly UpgradeEffect['kind'][] = ['auto-level', 'scheduled-buff', 'auto-buyer'];

function isScheduled(effect: UpgradeEffect): effect is ScheduledEffect {
  return SCHEDULED_KINDS.includes(effect.kind);
}

/** The most times one item can go off in a single step: a night offline grows a feature a lot, not without end. */
export const MAX_GOES_PER_STEP = 1_000;

/** Bought things never change in place, so the list of what has a schedule is worked out once per purchase. */
const SCHEDULES = new WeakMap<readonly UpgradeId[], readonly ScheduledItem[]>();

function listScheduledItems(state: GameState): readonly ScheduledItem[] {
  const cached = SCHEDULES.get(state.purchasedUpgradeIds);
  if (cached !== undefined) return cached;
  const items = state.purchasedUpgradeIds.flatMap((upgradeId) => UPGRADES_BY_ID[upgradeId].effects.filter(isScheduled).map((effect) => ({ upgradeId, effect })));
  SCHEDULES.set(state.purchasedUpgradeIds, items);
  return items;
}

function isOfThisEra(state: GameState, featureId: FeatureId): boolean {
  return ERAS_BY_ID[FEATURES_BY_ID[featureId].eraId].baseEraId === ERAS_BY_ID[state.eraId].baseEraId;
}

/** Filling the gaps: this era's feature on the page with the fewest levels. Null when none is built yet. */
export function findSmallestFeature(state: GameState): FeatureId | null {
  const candidates = FEATURE_IDS.filter((featureId) => isFeatureOnPage(state, featureId) && isOfThisEra(state, featureId));
  return candidates.reduce<FeatureId | null>((smallest, featureId) => (smallest === null || state.featureLevels[featureId] < state.featureLevels[smallest] ? featureId : smallest), null);
}

function levelUpFeature(state: GameState, featureId: FeatureId | null): GameState {
  const target = featureId ?? findSmallestFeature(state);
  return target === null ? state : addFeatureLevels(state, target, 1);
}

function calculateVisitorsPerDollar(state: GameState, featureId: FeatureId): number {
  return calculateFeatureVisitorsPerLevel(state, featureId) / calculateNextFeatureCost(state, featureId);
}

/** What an agent would buy: the affordable feature level with the most visitors for the money. Null when none is. */
export function findBestValueFeature(state: GameState): FeatureId | null {
  const affordable = getUnlockedFeatureIds(state).filter((featureId) => canBuyFeature(state, featureId) && !isFeatureSwitchedOff(state, featureId));
  const ranked = affordable.map((featureId) => ({ featureId, value: calculateVisitorsPerDollar(state, featureId) }));
  return ranked.reduce<{ readonly featureId: FeatureId | null; readonly value: number }>((best, candidate) => (candidate.value > best.value ? candidate : best), { featureId: null, value: 0 }).featureId;
}

function buyBestValueFeature(state: GameState): GameState {
  const featureId = findBestValueFeature(state);
  return featureId === null ? state : buyFeature(state, featureId);
}

type ScheduledAction = (state: GameState, effect: ScheduledEffect) => GameState;

const SCHEDULED_ACTIONS: { readonly [K in ScheduledKind]: (state: GameState, effect: Extract<ScheduledEffect, { readonly kind: K }>) => GameState } = {
  'auto-level': (state, effect) => levelUpFeature(state, effect.featureId),
  'scheduled-buff': (state, effect) => startBuff(state, effect.buffId),
  'auto-buyer': (state) => buyBestValueFeature(state),
};

/** Buffs are for the player at the keyboard: a scheduled one waits for you, like every other buff. */
function runsIn(effect: ScheduledEffect, mode: SimulationMode): boolean {
  return mode === 'live' || effect.kind !== 'scheduled-buff';
}

function goOff(state: GameState, effect: ScheduledEffect, goes: number): GameState {
  const act = SCHEDULED_ACTIONS[effect.kind] as ScheduledAction;
  return Array.from({ length: goes }).reduce<GameState>((current) => act(current, effect), state);
}

function tickItem(state: GameState, item: ScheduledItem, deltaMs: number): GameState {
  const elapsedMs = (state.itemClocksMs[item.upgradeId] ?? 0) + deltaMs;
  const goes = Math.min(MAX_GOES_PER_STEP, Math.floor(elapsedMs / item.effect.everyMs));
  const clocked = { ...state, itemClocksMs: { ...state.itemClocksMs, [item.upgradeId]: elapsedMs % item.effect.everyMs } };
  return goOff(clocked, item.effect, goes);
}

/** Every bought item with a schedule moves its clock on, and goes off each time the clock comes round. */
export function tickItemClocks(state: GameState, deltaMs: number, mode: SimulationMode): GameState {
  const items = listScheduledItems(state).filter((item) => runsIn(item.effect, mode) && !isUpgradeRetired(state, item.upgradeId));
  return items.reduce((current, item) => tickItem(current, item, deltaMs), state);
}

/** Subscribers come over about three minutes and leave over about fifteen: they follow the site, slowly. */
export const SUBSCRIBER_RISE_MS = 180_000;
export const SUBSCRIBER_CHURN_MS = 900_000;

function findSubscriberTimeMs(state: GameState, target: number): number {
  return target > state.subscriptionRevenuePerSecond ? SUBSCRIBER_RISE_MS : SUBSCRIBER_CHURN_MS / calculateSubscriberChurnFactor(state);
}

/**
 * The subscriber pool moves towards what the site's visitors would pay, a little each step: up as the site grows,
 * down as subscribers churn. A site that goes down keeps them for a while; that's what they're for.
 */
export function updateSubscriptions(state: GameState, deltaMs: number): GameState {
  const target = calculateSubscriptionTarget(state);
  if (target === state.subscriptionRevenuePerSecond) return state;
  const step = 1 - Math.exp(-deltaMs / findSubscriberTimeMs(state, target));
  return { ...state, subscriptionRevenuePerSecond: state.subscriptionRevenuePerSecond + (target - state.subscriptionRevenuePerSecond) * step };
}
