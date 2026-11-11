import {
  AD_BASE_COST,
  AD_COST_GROWTH,
  BASE_BUG_CHANCE,
  BASE_KEYSTROKE_VALUE,
  FEATURE_COST_GROWTH,
  MIN_BUG_CHANCE,
  POPUP_TRAFFIC_PENALTY,
  SITE_DOWN_SERVER_LOAD,
  QUICK_FIX_TRAFFIC_FACTOR,
  TRAFFIC_SPIKE_DEMAND_FACTOR,
  UPGRADE_REVEAL_EARNINGS_SHARE,
} from './constants';
import { DEFENSE_IDS, DEFENSES_BY_ID } from './content/defenses';
import { ERA_IDS, ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, FEATURES_BY_ID, getFeatureDisplayName } from './content/features';
import { getEraHostingTiers } from './content/hosting';
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
/** Before responsive design, about one phone visitor in four puts up with pinching and zooming. */
const MOBILE_STAY_SHARE_UNFRIENDLY = 0.25;
const FALLBACK_HOSTING_TIER: HostingTierDefinition = {
  id: 'shared-hosting',
  eraId: 'web2-2005',
  year: 2001,
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
  return state.purchasedUpgradeIds.flatMap((id) => UPGRADES_BY_ID[id].effects);
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

/** Defenses whose trade-off lands on one feature (null: on all traffic). */
function getDefenseTrafficFactors(state: GameState, featureId: FeatureId | null): readonly number[] {
  return getEnabledDefenses(state).flatMap((defense) => (defense.penalizedFeatureId === featureId ? [defense.trafficFactor] : []));
}

function calculateFeatureUpgradeFactor(state: GameState, featureId: FeatureId): number {
  const factors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'feature-traffic-multiplier' && effect.featureId === featureId ? [effect.factor] : [],
  );
  return multiplyAll(factors) * multiplyAll(getDefenseTrafficFactors(state, featureId));
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

export function isFeatureSwitchedOff(state: GameState, featureId: FeatureId): boolean {
  return state.switchedOffFeatureIds.includes(featureId);
}

/** Flash in 2011: the feature is still built, but browsers show a "missing plugin" box until you rebuild it. */
export function isFeaturePluginDead(state: GameState, featureId: FeatureId): boolean {
  const plugin = FEATURES_BY_ID[featureId].pluginDiesIn;
  return plugin !== null && isEraUnlocked(state, plugin.eraId) && !state.purchasedUpgradeIds.includes(plugin.rebuiltWith);
}

/** Gone out of fashion: retired at the relaunch into its sunset era. */
export function isFeatureRetired(state: GameState, featureId: FeatureId): boolean {
  const sunsetIn = FEATURES_BY_ID[featureId].sunsetIn;
  return sunsetIn !== null && isEraUnlocked(state, sunsetIn);
}

/** Built, and still on the page: not retired. */
export function isFeatureOnPage(state: GameState, featureId: FeatureId): boolean {
  return state.featureLevels[featureId] > 0 && !isFeatureRetired(state, featureId);
}

/** What a relaunch into this era will retire from your site. */
export function getFeaturesRetiringIn(state: GameState, eraId: EraId): readonly FeatureId[] {
  return FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].sunsetIn === eraId && state.featureLevels[featureId] > 0);
}

/**
 * The name a feature went by in its last era on the page, so the retired list says what players saw go.
 * A feature that never retires keeps the name from its own era.
 */
export function getRetiredFeatureName(featureId: FeatureId): string {
  const feature = FEATURES_BY_ID[featureId];
  const lastEraOnPage = ERA_IDS.find((eraId) => feature.sunsetIn !== null && ERAS_BY_ID[eraId].nextEraId === feature.sunsetIn) ?? feature.eraId;
  return getFeatureDisplayName(featureId, lastEraOnPage);
}

export function calculateFeatureVisitorsPerSecond(state: GameState, featureId: FeatureId): number {
  const isProducing = !isFeatureInfected(state, featureId) && !isFeatureSwitchedOff(state, featureId) && !isFeaturePluginDead(state, featureId) && !isFeatureRetired(state, featureId);
  return calculateFeatureVisitorsPerLevel(state, featureId) * state.featureLevels[featureId] * (isProducing ? NEUTRAL_FACTOR : NO_TRAFFIC);
}

function calculateBaseVisitorsPerSecond(state: GameState): number {
  return sumAll(FEATURE_IDS.map((featureId) => calculateFeatureVisitorsPerSecond(state, featureId)));
}

export function calculateGlobalTrafficFactor(state: GameState): number {
  const upgradeFactors = getPurchasedEffects(state).flatMap((effect) =>
    effect.kind === 'global-traffic-multiplier' ? [effect.factor] : [],
  );
  return multiplyAll(upgradeFactors) * multiplyAll(getDefenseTrafficFactors(state, null));
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

export function isMobileFriendly(state: GameState): boolean {
  return getPurchasedEffects(state).some((effect) => effect.kind === 'mobile-friendly');
}

/** Share of phone visitors who stay: almost none while the page needs pinching and sideways scrolling. */
export function calculateMobileStayShare(state: GameState): number {
  return isMobileFriendly(state) ? NEUTRAL_FACTOR : MOBILE_STAY_SHARE_UNFRIENDLY;
}

/** Desktop visitors all stay; phone visitors stay only once the page fits their screen. */
export function calculateMobileTrafficFactor(state: GameState): number {
  const mobileShare = ERAS_BY_ID[state.eraId].mobileShare;
  return NEUTRAL_FACTOR - mobileShare + mobileShare * calculateMobileStayShare(state);
}

/** Visitors notice a site that gets fixed fast. */
export function calculateQuickFixFactor(state: GameState): number {
  return state.quickFixBonusRemainingMs > 0 ? QUICK_FIX_TRAFFIC_FACTOR : NEUTRAL_FACTOR;
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
    calculateTrafficSpikeFactor(state) *
    calculateQuickFixFactor(state) *
    calculateMobileTrafficFactor(state)
  );
}

/** hostingTier is a step on the current era's ladder; a relaunch starts the new era's ladder at the bottom. */
export function getHostingTier(state: GameState): HostingTierDefinition {
  const ladder = getEraHostingTiers(state.eraId);
  return ladder[Math.min(state.hostingTier, ladder.length - 1)] ?? FALLBACK_HOSTING_TIER;
}

export function getNextHostingTier(state: GameState): HostingTierDefinition | null {
  const next = getEraHostingTiers(state.eraId)[state.hostingTier + 1];
  return next !== undefined && ERAS_BY_ID[state.eraId].hasServerLoad ? next : null;
}

/** Share of each visit that reaches your own server. Caching and a CDN answer the rest. */
export function calculateServerLoadPerVisitor(state: GameState): number {
  return multiplyAll(getPurchasedEffects(state).flatMap((effect) => (effect.kind === 'server-load-multiplier' ? [effect.factor] : [])));
}

export function hasTrafficSpikeCache(state: GameState): boolean {
  return getPurchasedEffects(state).some((effect) => effect.kind === 'traffic-spike-cache');
}

export function isTrafficSpikeCached(state: GameState): boolean {
  return state.trafficSpikeRemainingMs > 0 && hasTrafficSpikeCache(state);
}

/** Visitors per second a hosting tier can serve, once caching has taken its share. */
export function calculateHostingCapacity(state: GameState, tier: HostingTierDefinition): number {
  return tier.capacityVisitorsPerSecond / calculateServerLoadPerVisitor(state);
}

/** Visitors who reach your own server. During a cached spike the extra crowd gets the static copy instead. */
function calculateServerDemand(state: GameState): number {
  const servedFromCache = isTrafficSpikeCached(state) ? TRAFFIC_SPIKE_DEMAND_FACTOR : NEUTRAL_FACTOR;
  return calculateDemandVisitorsPerSecond(state) / servedFromCache;
}

/** Server demand divided by capacity. 0 in eras where hosting doesn't matter yet. */
export function calculateServerLoad(state: GameState): number {
  return ERAS_BY_ID[state.eraId].hasServerLoad ? calculateServerDemand(state) / calculateHostingCapacity(state, getHostingTier(state)) : 0;
}

function calculateFeaturePageWeightKb(state: GameState, featureId: FeatureId): number {
  const definition = FEATURES_BY_ID[featureId];
  const level = state.featureLevels[featureId];
  const isOnPage = isFeatureOnPage(state, featureId) && !isFeatureSwitchedOff(state, featureId) && !isFeaturePluginDead(state, featureId);
  return isOnPage ? definition.pageWeightKb + definition.pageWeightKbPerLevel * level : 0;
}

export function calculatePageWeightKb(state: GameState): number {
  const era = ERAS_BY_ID[state.eraId];
  const factors = getPurchasedEffects(state).flatMap((effect) => (effect.kind === 'page-weight-multiplier' ? [effect.factor] : []));
  const featuresKb = sumAll(FEATURE_IDS.map((featureId) => calculateFeaturePageWeightKb(state, featureId)));
  // Old assets come along: your 1997 stars.gif still loads on the 2005 page.
  const upgradesKb = sumAll(state.purchasedUpgradeIds.map((upgradeId) => UPGRADES_BY_ID[upgradeId].pageWeightKb));
  const rawKb = era.basePageWeightKb + featuresKb + upgradesKb + state.adCount * era.adPageWeightKb;
  return rawKb * multiplyAll(factors);
}

/** Page weight over the era's connection. An overloaded server makes everything slower still. */
export function calculateLoadTimeSeconds(state: GameState): number {
  const factors = getPurchasedEffects(state).flatMap((effect) => (effect.kind === 'load-time-multiplier' ? [effect.factor] : []));
  const transferSeconds = calculatePageWeightKb(state) / ERAS_BY_ID[state.eraId].connectionKbPerSecond;
  return transferSeconds * multiplyAll(factors) * Math.max(NEUTRAL_FACTOR, calculateServerLoad(state));
}

/** Past twice its capacity, most visitors get a 503 page. The server still serves what it can. */
export function isSiteDown(state: GameState): boolean {
  return calculateServerLoad(state) >= SITE_DOWN_SERVER_LOAD;
}

/** Share of visitors who wait for the page. Everyone waits up to the era's patience; after that they leave. */
export function calculatePerformanceTrafficFactor(state: GameState): number {
  const loadTime = calculateLoadTimeSeconds(state);
  return loadTime <= 0 ? NEUTRAL_FACTOR : Math.min(NEUTRAL_FACTOR, ERAS_BY_ID[state.eraId].patienceSeconds / loadTime);
}

function calculateServedLimit(state: GameState): number {
  // A cached spike keeps the site up, but you still only earn from what your setup can carry.
  return ERAS_BY_ID[state.eraId].hasServerLoad ? calculateHostingCapacity(state, getHostingTier(state)) : Number.POSITIVE_INFINITY;
}

/**
 * Visitors who actually get your page: those patient enough to wait, up to what the server can serve.
 * An overloaded server never drops to zero, so you can always earn your way to the next hosting tier.
 */
export function calculateVisitorsPerSecond(state: GameState): number {
  return Math.min(calculateDemandVisitorsPerSecond(state) * calculatePerformanceTrafficFactor(state), calculateServedLimit(state));
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
  return calculateFeatureLevelCost(featureId, state.featureLevels[featureId]);
}

function calculateFeatureLevelCost(featureId: FeatureId, level: number): number {
  return Math.ceil(FEATURES_BY_ID[featureId].baseCost * FEATURE_COST_GROWTH ** level);
}

/** The next `count` levels bought together: each costs what it would cost bought one at a time. */
export function calculateFeatureLevelsCost(state: GameState, featureId: FeatureId, count: number): number {
  const level = state.featureLevels[featureId];
  return Array.from({ length: count }, (_, offset) => calculateFeatureLevelCost(featureId, level + offset)).reduce((total, cost) => total + cost, 0);
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
  return isEraUnlocked(state, definition.eraId) && isSkillLearned(state, definition.requiredSkillId) && !isFeatureRetired(state, featureId);
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
  return FEATURE_IDS.filter((featureId) => isEraUnlocked(state, FEATURES_BY_ID[featureId].eraId) && !isFeatureRetired(state, featureId));
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
