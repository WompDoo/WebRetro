import {
  AD_BASE_COST,
  AD_COST_GROWTH,
  BASE_BUG_CHANCE,
  BASE_KEYSTROKE_VALUE,
  FEATURE_COST_GROWTH,
  MIN_BUG_CHANCE,
  POPUP_TRAFFIC_PENALTY,
  SITE_DOWN_SERVER_LOAD,
  TRAFFIC_SPIKE_DEMAND_FACTOR,
  UPGRADE_REVEAL_EARNINGS_SHARE,
} from './constants';
import { DEFENSE_IDS, DEFENSES_BY_ID } from './content/defenses';
import { ERA_IDS, ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, FEATURES_BY_ID } from './content/features';
import { HOSTING_TIERS } from './content/hosting';
import { UPGRADE_IDS, UPGRADES_BY_ID } from './content/upgrades';
import type {
  DefenseDefinition,
  DefenseId,
  EconomySnapshot,
  EraId,
  FeatureDefinition,
  FeatureId,
  GameState,
  HostingTierDefinition,
  UpgradeEffect,
  UpgradeId,
} from './types';

const NEUTRAL_FACTOR = 1;
const NO_TRAFFIC = 0;
const FALLBACK_HOSTING_TIER: HostingTierDefinition = {
  id: 'shared-hosting',
  eraId: 'web2-2005',
  name: 'Shared hosting',
  description: '',
  cost: 0,
  capacityVisitorsPerSecond: 1,
};

function multiplyAll(factors: readonly number[]): number {
  return factors.reduce((product, factor) => product * factor, NEUTRAL_FACTOR);
}

function sumAll(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function getPurchasedEffects(state: GameState): readonly UpgradeEffect[] {
  return state.purchasedUpgradeIds.map((id) => UPGRADES_BY_ID[id].effect);
}

export function getEnabledDefenses(state: GameState): readonly DefenseDefinition[] {
  return state.enabledDefenseIds.map((id) => DEFENSES_BY_ID[id]);
}

export function getEraIndex(eraId: EraId): number {
  return ERA_IDS.indexOf(eraId);
}

export function isEraUnlocked(state: GameState, eraId: EraId): boolean {
  return getEraIndex(eraId) <= getEraIndex(state.eraId);
}

function calculateKeystrokeRevenueShare(state: GameState): number {
  const shares = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'keystroke-revenue-share' ? [effect.share] : [],
  );
  return sumAll(shares);
}

/** Freelance pay per keystroke, plus a share of the site's revenue per second once you know enough to automate. */
export function calculateKeystrokeValue(state: GameState): number {
  const factors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'keystroke-value-multiplier' ? [effect.factor] : [],
  );
  const eraMultiplier = ERAS_BY_ID[state.eraId].keystrokeValueMultiplier;
  const freelancePay = BASE_KEYSTROKE_VALUE * eraMultiplier * multiplyAll(factors);
  return freelancePay + calculateKeystrokeRevenueShare(state) * calculateNetRevenuePerSecond(state);
}

export function calculateBugChance(state: GameState): number {
  const reductions = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'bug-chance-reduction' ? [effect.amount] : [],
  );
  return Math.max(MIN_BUG_CHANCE, BASE_BUG_CHANCE - sumAll(reductions));
}

export function isFeatureInfected(state: GameState, featureId: FeatureId): boolean {
  return state.infections.some((infection) => infection.featureId === featureId);
}

function calculateFeatureUpgradeFactor(state: GameState, featureId: FeatureId): number {
  const factors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'feature-traffic-multiplier' && effect.featureId === featureId ? [effect.factor] : [],
  );
  return multiplyAll(factors);
}

function calculateSynergyFactor(state: GameState, definition: FeatureDefinition): number {
  return definition.synergy === null
    ? NEUTRAL_FACTOR
    : NEUTRAL_FACTOR + state.featureLevels[definition.synergy.sourceFeatureId] * definition.synergy.bonusPerSourceLevel;
}

/** Visitors one more level of this feature would add, before ads and pop-ups. */
export function calculateFeatureVisitorsPerLevel(state: GameState, featureId: FeatureId): number {
  const definition = FEATURES_BY_ID[featureId];
  return (
    definition.visitorsPerSecondPerLevel *
    calculateFeatureUpgradeFactor(state, featureId) *
    calculateSynergyFactor(state, definition)
  );
}

export function calculateFeatureVisitorsPerSecond(state: GameState, featureId: FeatureId): number {
  const infectionFactor = isFeatureInfected(state, featureId) ? NO_TRAFFIC : NEUTRAL_FACTOR;
  return calculateFeatureVisitorsPerLevel(state, featureId) * state.featureLevels[featureId] * infectionFactor;
}

function calculateBaseVisitorsPerSecond(state: GameState): number {
  return sumAll(FEATURE_IDS.map((featureId) => calculateFeatureVisitorsPerSecond(state, featureId)));
}

export function calculateGlobalTrafficFactor(state: GameState): number {
  const upgradeFactors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'global-traffic-multiplier' ? [effect.factor] : [],
  );
  const defenseFactors = getEnabledDefenses(state).map((defense) => defense.trafficFactor);
  return multiplyAll(upgradeFactors) * multiplyAll(defenseFactors);
}

export function calculateAdAnnoyancePerAd(state: GameState): number {
  const factors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'ad-annoyance-multiplier' ? [effect.factor] : [],
  );
  return ERAS_BY_ID[state.eraId].adAnnoyancePerAd * multiplyAll(factors);
}

export function calculateAdTrafficFactor(state: GameState): number {
  return (NEUTRAL_FACTOR - calculateAdAnnoyancePerAd(state)) ** state.adCount;
}

export function calculatePopupTrafficFactor(state: GameState): number {
  return (NEUTRAL_FACTOR - POPUP_TRAFFIC_PENALTY) ** state.popups.length;
}

export function calculateTrafficSpikeFactor(state: GameState): number {
  return state.trafficSpikeRemainingMs > 0 ? TRAFFIC_SPIKE_DEMAND_FACTOR : NEUTRAL_FACTOR;
}

/** Visitors trying to reach the site, before slow pages and server trouble send some away. */
export function calculateDemandVisitorsPerSecond(state: GameState): number {
  return (
    calculateBaseVisitorsPerSecond(state) *
    calculateGlobalTrafficFactor(state) *
    calculateAdTrafficFactor(state) *
    calculatePopupTrafficFactor(state) *
    calculateTrafficSpikeFactor(state)
  );
}

export function getHostingTier(state: GameState): HostingTierDefinition {
  return HOSTING_TIERS[Math.min(state.hostingTier, HOSTING_TIERS.length - 1)] ?? FALLBACK_HOSTING_TIER;
}

export function getNextHostingTier(state: GameState): HostingTierDefinition | null {
  const next = HOSTING_TIERS[state.hostingTier + 1];
  return next !== undefined && isEraUnlocked(state, next.eraId) && ERAS_BY_ID[state.eraId].hasServerLoad ? next : null;
}

/** Demand divided by hosting capacity. 0 in eras where hosting doesn't matter yet. */
export function calculateServerLoad(state: GameState): number {
  return ERAS_BY_ID[state.eraId].hasServerLoad
    ? calculateDemandVisitorsPerSecond(state) / getHostingTier(state).capacityVisitorsPerSecond
    : 0;
}

function calculateFeaturePageWeightKb(state: GameState, featureId: FeatureId): number {
  const definition = FEATURES_BY_ID[featureId];
  const level = state.featureLevels[featureId];
  return level > 0 ? definition.pageWeightKb + definition.pageWeightKbPerLevel * level : 0;
}

export function calculatePageWeightKb(state: GameState): number {
  const era = ERAS_BY_ID[state.eraId];
  const factors = getPurchasedEffects(state).flatMap((effect) => (effect.kind === 'page-weight-multiplier' ? [effect.factor] : []));
  const rawKb = era.basePageWeightKb + sumAll(FEATURE_IDS.map((featureId) => calculateFeaturePageWeightKb(state, featureId))) + state.adCount * era.adPageWeightKb;
  return rawKb * multiplyAll(factors);
}

/** Page weight over the era's connection. An overloaded server makes everything slower still. */
export function calculateLoadTimeSeconds(state: GameState): number {
  const factors = getPurchasedEffects(state).flatMap((effect) => (effect.kind === 'load-time-multiplier' ? [effect.factor] : []));
  const transferSeconds = calculatePageWeightKb(state) / ERAS_BY_ID[state.eraId].connectionKbPerSecond;
  return transferSeconds * multiplyAll(factors) * Math.max(NEUTRAL_FACTOR, calculateServerLoad(state));
}

export function isSiteDown(state: GameState): boolean {
  return calculateServerLoad(state) >= SITE_DOWN_SERVER_LOAD;
}

/** Share of visitors who wait for the page. Everyone waits up to the era's patience; after that they leave. */
export function calculatePerformanceTrafficFactor(state: GameState): number {
  if (isSiteDown(state)) return NO_TRAFFIC;
  const loadTime = calculateLoadTimeSeconds(state);
  return loadTime <= 0 ? NEUTRAL_FACTOR : Math.min(NEUTRAL_FACTOR, ERAS_BY_ID[state.eraId].patienceSeconds / loadTime);
}

export function calculateVisitorsPerSecond(state: GameState): number {
  return calculateDemandVisitorsPerSecond(state) * calculatePerformanceTrafficFactor(state);
}

export function calculateAdValuePerAd(state: GameState): number {
  const upgradeFactors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'ad-value-multiplier' ? [effect.factor] : [],
  );
  const defenseFactors = getEnabledDefenses(state).map((defense) => defense.adValueFactor);
  return ERAS_BY_ID[state.eraId].adValuePerVisitor * multiplyAll(upgradeFactors) * multiplyAll(defenseFactors);
}

export function calculateRevenuePerVisitor(state: GameState): number {
  return state.adCount * calculateAdValuePerAd(state);
}

export function calculateUpkeepShare(state: GameState): number {
  return sumAll(getEnabledDefenses(state).map((defense) => defense.revenueUpkeepShare));
}

export function calculateNetRevenuePerSecond(state: GameState): number {
  return (
    calculateVisitorsPerSecond(state) *
    calculateRevenuePerVisitor(state) *
    (NEUTRAL_FACTOR - calculateUpkeepShare(state))
  );
}

export function calculateEconomySnapshot(state: GameState): EconomySnapshot {
  return {
    demandVisitorsPerSecond: calculateDemandVisitorsPerSecond(state),
    visitorsPerSecond: calculateVisitorsPerSecond(state),
    pageWeightKb: calculatePageWeightKb(state),
    loadTimeSeconds: calculateLoadTimeSeconds(state),
    serverLoad: calculateServerLoad(state),
    isSiteDown: isSiteDown(state),
    performanceTrafficFactor: calculatePerformanceTrafficFactor(state),
    revenuePerVisitor: calculateRevenuePerVisitor(state),
    adValuePerAd: calculateAdValuePerAd(state),
    adAnnoyancePerAd: calculateAdAnnoyancePerAd(state),
    adTrafficFactor: calculateAdTrafficFactor(state),
    popupTrafficFactor: calculatePopupTrafficFactor(state),
    upkeepShare: calculateUpkeepShare(state),
    netRevenuePerSecond: calculateNetRevenuePerSecond(state),
    keystrokeValue: calculateKeystrokeValue(state),
    bugChance: calculateBugChance(state),
  };
}

export function calculateNextFeatureCost(state: GameState, featureId: FeatureId): number {
  return Math.ceil(FEATURES_BY_ID[featureId].baseCost * FEATURE_COST_GROWTH ** state.featureLevels[featureId]);
}

export function calculateNextAdCost(state: GameState): number {
  return Math.ceil(AD_BASE_COST * AD_COST_GROWTH ** state.adCount);
}

export function isSkillLearned(state: GameState, skillId: UpgradeId | null): boolean {
  return skillId === null || state.purchasedUpgradeIds.includes(skillId);
}

/** The feature's era has arrived and you've learned the skill it needs. */
export function isFeatureBuildable(state: GameState, featureId: FeatureId): boolean {
  const definition = FEATURES_BY_ID[featureId];
  return isEraUnlocked(state, definition.eraId) && isSkillLearned(state, definition.requiredSkillId);
}

export function canUseAds(state: GameState): boolean {
  return isSkillLearned(state, ERAS_BY_ID[state.eraId].adSkillId);
}

/** Every unlearned skill of the eras you've reached: the curriculum is always visible. */
export function getAvailableSkillIds(state: GameState): readonly UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill' && isUpgradeAvailable(state, upgradeId));
}

/** Visible features: their era has arrived, whether or not you know the skill yet. */
export function getUnlockedFeatureIds(state: GameState): readonly FeatureId[] {
  return FEATURE_IDS.filter((featureId) => isEraUnlocked(state, FEATURES_BY_ID[featureId].eraId));
}

function isRequiredFeatureOwned(state: GameState, upgradeId: UpgradeId): boolean {
  const requiredFeatureId = UPGRADES_BY_ID[upgradeId].requiredFeatureId;
  return requiredFeatureId === null || state.featureLevels[requiredFeatureId] > 0;
}

export function isUpgradeAvailable(state: GameState, upgradeId: UpgradeId): boolean {
  return (
    !state.purchasedUpgradeIds.includes(upgradeId) &&
    isEraUnlocked(state, UPGRADES_BY_ID[upgradeId].eraId) &&
    isRequiredFeatureOwned(state, upgradeId)
  );
}

/** Boosts appear once you've earned a share of their price. */
export function isBoostRevealed(state: GameState, upgradeId: UpgradeId): boolean {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  const revealThreshold = upgrade.cost * UPGRADE_REVEAL_EARNINGS_SHARE;
  return upgrade.kind === 'boost' && isUpgradeAvailable(state, upgradeId) && state.lifetimeEarnings >= revealThreshold;
}

export function getRevealedBoostIds(state: GameState): readonly UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => isBoostRevealed(state, upgradeId));
}

export function getUnlockedDefenseIds(state: GameState): readonly DefenseId[] {
  return DEFENSE_IDS.filter((defenseId) => isEraUnlocked(state, DEFENSES_BY_ID[defenseId].eraId));
}
