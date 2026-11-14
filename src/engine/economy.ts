import {
  AD_BASE_COST,
  AD_COST_GROWTH,
  BASE_BUG_CHANCE,
  BASE_KEYSTROKE_VALUE,
  FEATURE_COST_GROWTH,
  MIN_BUG_CHANCE,
  POPUP_TRAFFIC_PENALTY,
  QUICK_FIX_WINDOW_MS,
  SITE_DOWN_SERVER_LOAD,
  QUICK_FIX_TRAFFIC_FACTOR,
  TRAFFIC_SPIKE_DEMAND_FACTOR,
  UPGRADE_REVEAL_EARNINGS_SHARE,
} from './constants';
import { CONSENT_BANNERS_BY_ID } from './content/consent-banners';
import { DEFENSE_IDS, DEFENSE_SUNSETS, DEFENSES_BY_ID } from './content/defenses';
import { ERA_IDS, ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, FEATURES_BY_ID, getFeatureDisplayName } from './content/features';
import { findFrameworkPickedBy, findFrameworkRenderedBy, FRAMEWORK_IDS, FRAMEWORKS_BY_ID } from './content/frameworks';
import type { ClientRenderingCost, PriceBreak } from './content/frameworks';
import { getEraHostingTiers } from './content/hosting';
import { UPGRADE_IDS, UPGRADE_SUNSETS, UPGRADES_BY_ID } from './content/upgrades';
import { listPerkEffects, PERK_IDS } from './content/perks';
import type {
  DefenseDefinition,
  DefenseId,
  EconomySnapshot,
  EraId,
  FeatureDefinition,
  FeatureId,
  FrameworkId,
  InfectionKind,
  GameState,
  HostingTierDefinition,
  UpgradeEffect,
  UpgradeId,
} from './types';

const NEUTRAL_FACTOR = 1;
const NO_TRAFFIC = 0;
/** Before responsive design, about one phone visitor in four puts up with pinching and zooming. */
const MOBILE_STAY_SHARE_UNFRIENDLY = 0.25;
/** A single-page app shows nothing until its bundle has loaded and run: the wait is this much longer. */
/** Visitors who arrive from search engines. Crawlers index a single-page app's empty page, so they never find it. */
const FALLBACK_HOSTING_TIER: HostingTierDefinition = {
  id: 'shared-hosting',
  eraId: 'web2-2005',
  year: 2001,
  name: 'Shared hosting',
  description: '',
  cost: 0,
  capacityVisitorsPerSecond: 1,
};

/**
 * Economy numbers are read many times a frame (stats, status bar, shop, checklist, tips, tickets) while the game
 * state changes ten times a second. A state is never changed in place, only replaced, so each one keys a cache:
 * the second read in a frame is free.
 */
function memoizeByState<T>(calculate: (state: GameState) => T): (state: GameState) => T {
  const cache = new WeakMap<GameState, T>();
  return (state) => {
    const cached = cache.get(state);
    if (cached !== undefined) return cached;
    const value = calculate(state);
    cache.set(state, value);
    return value;
  };
}

function multiplyAll(factors: readonly number[]): number {
  return factors.reduce((product, factor) => product * factor, NEUTRAL_FACTOR);
}

function sumAll(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Gone out of fashion, like the "Get our app!" banner in 2018: it stops working and leaves the page. */
export function isUpgradeRetired(state: GameState, upgradeId: UpgradeId): boolean {
  const sunsetIn = UPGRADE_SUNSETS[upgradeId];
  return sunsetIn !== undefined && isEraUnlocked(state, sunsetIn);
}

/** What you've learned and bought that still works. */
export function getActiveUpgradeIds(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => !isUpgradeRetired(state, upgradeId));
}

/** Upgrade effects that multiply one number of the economy. */
type FactorKind =
  | 'global-traffic-multiplier'
  | 'ad-value-multiplier'
  | 'ad-annoyance-multiplier'
  | 'page-weight-multiplier'
  | 'load-time-multiplier'
  | 'server-load-multiplier';
type FactorEffect = Extract<UpgradeEffect, { readonly kind: FactorKind }>;
type FeatureTrafficEffect = Extract<UpgradeEffect, { readonly kind: 'feature-traffic-multiplier' }>;

const FACTOR_KINDS: readonly FactorKind[] = [
  'global-traffic-multiplier',
  'ad-value-multiplier',
  'ad-annoyance-multiplier',
  'page-weight-multiplier',
  'load-time-multiplier',
  'server-load-multiplier',
];

/**
 * Everything the purchased upgrades do, added up once. The economy reads these numbers for every feature, many
 * times a frame and thousands of times a second in the balance sim; scanning a hundred effects each time was most
 * of the cost.
 */
interface EffectSummary {
  readonly factors: Readonly<Record<FactorKind, number>>;
  readonly featureFactors: ReadonlyMap<FeatureId, number>;
  readonly keystrokeRevenueShare: number;
  /** This era's typing skills only: what each keystroke's whole value is multiplied by. */
  readonly typingFactor: number;
  /** This era's typo reductions only. */
  readonly typoReduction: number;
  /** Shares of revenue that running things costs: blue-green's second production, and so on. */
  readonly upkeepShare: number;
  readonly quickFixWindowFactor: number;
  readonly overloadTolerance: number;
  readonly privacyFineFactor: number;
  readonly aiAnswerFactor: number;
  /** How long until each kind of infection clears up by itself, where something does that. */
  readonly autoCleanAfterMs: Readonly<Partial<Record<InfectionKind, number>>>;
  readonly kinds: ReadonlySet<UpgradeEffect['kind']>;
}

function isFactorEffect(effect: UpgradeEffect): effect is FactorEffect {
  return FACTOR_KINDS.some((kind) => kind === effect.kind);
}

/**
 * Ops multipliers are an edge for the era you set them up in: by the next relaunch everyone has a domain, https and
 * indexes, and what set you apart is the baseline. What ops keep doing for good is the resilience: https itself,
 * backups, monitoring, the process manager.
 */
export function isEraBoundEffect(upgradeId: UpgradeId, effect: UpgradeEffect): boolean {
  return UPGRADES_BY_ID[upgradeId].kind === 'ops' && isFactorEffect(effect);
}

function countsInEra(upgradeId: UpgradeId, effect: UpgradeEffect, eraId: EraId): boolean {
  return !isEraBoundEffect(upgradeId, effect) || UPGRADES_BY_ID[upgradeId].eraId === eraId;
}

function isFactorOfKind(effect: UpgradeEffect, kind: FactorKind): effect is FactorEffect {
  return effect.kind === kind;
}

function multiplyFactors(effects: readonly UpgradeEffect[], kind: FactorKind): number {
  return multiplyAll(effects.filter((effect): effect is FactorEffect => isFactorOfKind(effect, kind)).map((effect) => effect.factor));
}

function multiplyFeatureFactor(factors: ReadonlyMap<FeatureId, number>, effect: FeatureTrafficEffect): ReadonlyMap<FeatureId, number> {
  return new Map(factors).set(effect.featureId, (factors.get(effect.featureId) ?? NEUTRAL_FACTOR) * effect.factor);
}

function collectFeatureFactors(effects: readonly UpgradeEffect[]): ReadonlyMap<FeatureId, number> {
  return effects
    .filter((effect): effect is FeatureTrafficEffect => effect.kind === 'feature-traffic-multiplier')
    .reduce<ReadonlyMap<FeatureId, number>>(multiplyFeatureFactor, new Map());
}

function multiplyTypingFactors(effects: readonly UpgradeEffect[]): number {
  return multiplyAll(effects.flatMap((effect) => (effect.kind === 'keystroke-value-multiplier' ? [effect.factor] : [])));
}

function multiplyEffectFactors(
  effects: readonly UpgradeEffect[],
  kind: 'quick-fix-window-multiplier' | 'overload-tolerance-multiplier' | 'privacy-fine-multiplier' | 'ai-answer-share-multiplier',
): number {
  return multiplyAll(effects.flatMap((effect) => (effect.kind === kind ? [effect.factor] : [])));
}

/** The soonest each infection clears up on its own, when several things clean the same kind. */
function collectAutoCleans(effects: readonly UpgradeEffect[]): Readonly<Partial<Record<InfectionKind, number>>> {
  return effects.reduce<Partial<Record<InfectionKind, number>>>((soonest, effect) => {
    if (effect.kind !== 'auto-cleans-infection') return soonest;
    return { ...soonest, [effect.infection]: Math.min(effect.afterMs, soonest[effect.infection] ?? Number.POSITIVE_INFINITY) };
  }, {});
}

function sumTypoReductions(effects: readonly UpgradeEffect[]): number {
  return sumAll(effects.flatMap((effect) => (effect.kind === 'bug-chance-reduction' ? [effect.amount] : [])));
}

/**
 * Typing skills belong to their era's tools: Notepad's tricks don't speed up a 2018 editor. So typing pay and
 * typos read this era's purchases; everything else reads all of them.
 */
function summarizeEffects(effects: readonly UpgradeEffect[], thisEraEffects: readonly UpgradeEffect[]): EffectSummary {
  return {
    factors: Object.fromEntries(FACTOR_KINDS.map((kind) => [kind, multiplyFactors(effects, kind)])) as Record<FactorKind, number>,
    featureFactors: collectFeatureFactors(effects),
    keystrokeRevenueShare: sumAll(effects.flatMap((effect) => (effect.kind === 'keystroke-revenue-share' ? [effect.share] : []))),
    typingFactor: multiplyTypingFactors(thisEraEffects),
    typoReduction: sumTypoReductions(thisEraEffects),
    upkeepShare: sumAll(effects.flatMap((effect) => (effect.kind === 'revenue-upkeep-share' ? [effect.share] : []))),
    quickFixWindowFactor: multiplyEffectFactors(effects, 'quick-fix-window-multiplier'),
    overloadTolerance: multiplyEffectFactors(effects, 'overload-tolerance-multiplier'),
    privacyFineFactor: multiplyEffectFactors(effects, 'privacy-fine-multiplier'),
    aiAnswerFactor: multiplyEffectFactors(effects, 'ai-answer-share-multiplier'),
    autoCleanAfterMs: collectAutoCleans(effects),
    kinds: new Set(effects.map((effect) => effect.kind)),
  };
}

/**
 * The summary only changes when something is bought or the era moves on (what has retired), and purchasedUpgradeIds
 * is always replaced, never changed in place, so the array keys a cache, per era.
 */
const EFFECT_SUMMARIES = new WeakMap<readonly UpgradeId[], Map<string, EffectSummary>>();

function findSummariesByEra(upgradeIds: readonly UpgradeId[]): Map<string, EffectSummary> {
  const existing = EFFECT_SUMMARIES.get(upgradeIds);
  if (existing !== undefined) return existing;
  const created = new Map<string, EffectSummary>();
  EFFECT_SUMMARIES.set(upgradeIds, created);
  return created;
}

/** Perks count everywhere, typing included: they come with the developer, not with an era's tools. */
function summarizePurchases(state: GameState, byEra: Map<string, EffectSummary>): EffectSummary {
  const active = getActiveUpgradeIds(state);
  const thisEra = active.filter((id) => UPGRADES_BY_ID[id].eraId === state.eraId);
  const perks = listPerkEffects(state.legacyPerkLevels);
  const summary = summarizeEffects(
    [...active.flatMap((id) => UPGRADES_BY_ID[id].effects.filter((effect) => countsInEra(id, effect, state.eraId))), ...perks],
    [...thisEra.flatMap((id) => UPGRADES_BY_ID[id].effects), ...perks],
  );
  byEra.set(summaryKey(state), summary);
  return summary;
}

/** The era and the perks: two runs can share a purchases array (a test, a preset) but not their perks. */
function summaryKey(state: GameState): string {
  return `${state.eraId}|${PERK_IDS.map((perkId) => state.legacyPerkLevels[perkId]).join(',')}`;
}

function getEffectSummary(state: GameState): EffectSummary {
  const byEra = findSummariesByEra(state.purchasedUpgradeIds);
  const cached = byEra.get(summaryKey(state));
  return cached === undefined ? summarizePurchases(state, byEra) : cached;
}

function readFactor(state: GameState, kind: FactorKind): number {
  return getEffectSummary(state).factors[kind];
}

/** Retired with what it protected (CAPTCHA, once comments are gone): off the shelf, and its trade-off stops. */
export function isDefenseRetired(state: GameState, defenseId: DefenseId): boolean {
  const sunsetIn = DEFENSE_SUNSETS[defenseId];
  return sunsetIn !== undefined && isEraUnlocked(state, sunsetIn);
}

export function getEnabledDefenses(state: GameState): readonly DefenseDefinition[] {
  return state.enabledDefenseIds.filter((id) => !isDefenseRetired(state, id)).map((id) => DEFENSES_BY_ID[id]);
}

export function getEraIndex(eraId: EraId): number {
  return ERA_IDS.indexOf(eraId);
}

export function isEraUnlocked(state: GameState, eraId: EraId): boolean {
  return getEraIndex(eraId) <= getEraIndex(state.eraId);
}

function calculateKeystrokeRevenueShare(state: GameState): number {
  return getEffectSummary(state).keystrokeRevenueShare;
}

/**
 * Freelance pay per keystroke, plus a share of the site's revenue per second once you know enough to automate,
 * all of it times this era's typing skills. Each era's base pay already includes what the earlier eras' skills
 * were worth, so a relaunch starts where the last era left off.
 */
export function calculateKeystrokeValue(state: GameState): number {
  const eraMultiplier = ERAS_BY_ID[state.eraId].keystrokeValueMultiplier;
  const freelancePay = (BASE_KEYSTROKE_VALUE * eraMultiplier) / ERAS_BY_ID[state.eraId].typingPace;
  const revenueShare = calculateKeystrokeRevenueShare(state) * calculateNetRevenuePerSecond(state);
  return (freelancePay + revenueShare) * getEffectSummary(state).typingFactor;
}

export function calculateBugChance(state: GameState): number {
  return Math.max(MIN_BUG_CHANCE, BASE_BUG_CHANCE - getEffectSummary(state).typoReduction);
}

export function isFeatureInfected(state: GameState, featureId: FeatureId): boolean {
  return state.infections.some((infection) => infection.featureId === featureId);
}

/** Defenses whose trade-off lands on one feature (null: on all traffic). */
function getDefenseTrafficFactors(state: GameState, featureId: FeatureId | null): readonly number[] {
  return getEnabledDefenses(state).flatMap((defense) => (defense.penalizedFeatureId === featureId ? [defense.trafficFactor] : []));
}

function calculateFeatureUpgradeFactor(state: GameState, featureId: FeatureId): number {
  const upgradeFactor = getEffectSummary(state).featureFactors.get(featureId) ?? NEUTRAL_FACTOR;
  return upgradeFactor * multiplyAll(getDefenseTrafficFactors(state, featureId));
}

function calculateSynergyFactor(state: GameState, definition: FeatureDefinition): number {
  return definition.synergy === null
    ? NEUTRAL_FACTOR
    : NEUTRAL_FACTOR + state.featureLevels[definition.synergy.sourceFeatureId] * definition.synergy.bonusPerSourceLevel;
}

/** Visitors one more level of this feature would add, before ads and pop-ups. */
/**
 * What buying these levels really does to visitors: what they bring, less what their weight costs by slowing the
 * page. Late in an era a heavy feature can lose more than it brings.
 */
export function calculateFeatureLevelsNetVisitors(state: GameState, featureId: FeatureId, count: number): number {
  const after: GameState = { ...state, featureLevels: { ...state.featureLevels, [featureId]: state.featureLevels[featureId] + count } };
  return calculateVisitorsPerSecond(after) - calculateVisitorsPerSecond(state);
}

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
 * The trade-in for a retired feature: this share of everything it earned while it was on the page.
 * Half of what the 2011 retirees earned is about half the price of Bootstrap: a head start, not a shortcut.
 */
export const RETIREMENT_PAYOUT_SHARE = 0.5;

/** The trade-in for these features. */
export function calculateTradeIn(state: GameState, featureIds: readonly FeatureId[]): number {
  return sumAll(featureIds.map((featureId) => state.featureEarnings[featureId])) * RETIREMENT_PAYOUT_SHARE;
}

/** What a relaunch into this era pays back for the features it retires. */
export function calculateRetirementPayout(state: GameState, eraId: EraId): number {
  return calculateTradeIn(state, getFeaturesRetiringIn(state, eraId));
}

/** Credits visitor revenue to the features that brought the visitors, in proportion to how many each brought. */
export function creditFeatureEarnings(state: GameState, earned: number): Readonly<Record<FeatureId, number>> {
  const traffic = FEATURE_IDS.map((featureId) => ({ featureId, visitorsPerSecond: calculateFeatureVisitorsPerSecond(state, featureId) }));
  const totalVisitors = sumAll(traffic.map(({ visitorsPerSecond }) => visitorsPerSecond));
  const earnedPerVisitor = totalVisitors > 0 ? Math.max(0, earned) / totalVisitors : 0;
  const credited = traffic.map(({ featureId, visitorsPerSecond }) => [featureId, state.featureEarnings[featureId] + visitorsPerSecond * earnedPerVisitor]);
  return Object.fromEntries(credited) as Record<FeatureId, number>;
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

const calculateBaseVisitorsPerSecond = memoizeByState((state: GameState): number => {
  return sumAll(FEATURE_IDS.map((featureId) => calculateFeatureVisitorsPerSecond(state, featureId)));
});

export function calculateGlobalTrafficFactor(state: GameState): number {
  return readFactor(state, 'global-traffic-multiplier') * multiplyAll(getDefenseTrafficFactors(state, null));
}

export function calculateAdAnnoyancePerAd(state: GameState): number {
  return ERAS_BY_ID[state.eraId].adAnnoyancePerAd * readFactor(state, 'ad-annoyance-multiplier');
}

export function calculateAdTrafficFactor(state: GameState): number {
  return (NEUTRAL_FACTOR - calculateAdAnnoyancePerAd(state)) ** state.adCount;
}

export function calculatePopupTrafficFactor(state: GameState): number {
  return (NEUTRAL_FACTOR - POPUP_TRAFFIC_PENALTY) ** state.popups.length;
}

/** The framework this site picked in 2018's framework wars, if it has picked one. */
export function findChosenFramework(state: GameState): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => state.purchasedUpgradeIds.includes(FRAMEWORKS_BY_ID[frameworkId].skillId)) ?? null;
}

/** Picking a framework rules out the others: a site is a React shop, an Angular shop or a Vue shop. */
function isFrameworkPickOpen(state: GameState, upgradeId: UpgradeId): boolean {
  return findFrameworkPickedBy(upgradeId) === null || findChosenFramework(state) === null;
}

/** Each framework renders on the server its own way, so only the picked framework's way is on offer. */
function isServerRenderingOpen(state: GameState, upgradeId: UpgradeId): boolean {
  const framework = findFrameworkRenderedBy(upgradeId);
  return framework === null || findChosenFramework(state) === framework;
}

function isFrameworkUpgradeOpen(state: GameState, upgradeId: UpgradeId): boolean {
  return isFrameworkPickOpen(state, upgradeId) && isServerRenderingOpen(state, upgradeId);
}

function hasEffect(state: GameState, kind: UpgradeEffect['kind']): boolean {
  return getEffectSummary(state).kinds.has(kind);
}

/** A single-page app that only renders in the browser: blank until its JavaScript has run. */
export function isRenderedOnlyInBrowser(state: GameState): boolean {
  return hasEffect(state, 'client-side-rendering') && !hasEffect(state, 'server-side-rendering');
}

/** What the chosen framework pays for rendering only in the browser; nothing once it renders on the server. */
function findClientRenderingCost(state: GameState): ClientRenderingCost | null {
  const framework = findChosenFramework(state);
  return framework === null || !isRenderedOnlyInBrowser(state) ? null : FRAMEWORKS_BY_ID[framework].clientRendering;
}

/** Search engines read a browser-only app as an empty page, so the visitors they'd send never come. */
export function calculateRenderingTrafficFactor(state: GameState): number {
  const cost = findClientRenderingCost(state);
  return cost === null ? NEUTRAL_FACTOR : NEUTRAL_FACTOR - cost.searchVisitorsLost;
}

function calculateRenderingLoadTimeFactor(state: GameState): number {
  const cost = findClientRenderingCost(state);
  return cost === null ? NEUTRAL_FACTOR : cost.loadTimeFactor;
}

function findChosenPriceBreak(state: GameState): PriceBreak | null {
  const framework = findChosenFramework(state);
  return framework === null ? null : FRAMEWORKS_BY_ID[framework].priceBreak;
}

/** The chosen framework's price break on this upgrade, if it has one. */
export function findPriceBreak(state: GameState, upgradeId: UpgradeId): PriceBreak | null {
  const priceBreak = findChosenPriceBreak(state);
  return priceBreak !== null && priceBreak.upgradeIds.includes(upgradeId) ? priceBreak : null;
}

/** What an upgrade costs you: its price, less what your framework takes off. Everything that sells or prices one reads this. */
export function calculateUpgradeCost(state: GameState, upgradeId: UpgradeId): number {
  const priceBreak = findPriceBreak(state, upgradeId);
  return Math.ceil(UPGRADES_BY_ID[upgradeId].cost * (priceBreak === null ? NEUTRAL_FACTOR : priceBreak.factor));
}

export function isMobileFriendly(state: GameState): boolean {
  return hasEffect(state, 'mobile-friendly');
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
export const calculateDemandVisitorsPerSecond = memoizeByState((state: GameState): number => {
  return (
    calculateBaseVisitorsPerSecond(state) *
    calculateGlobalTrafficFactor(state) *
    calculateAdTrafficFactor(state) *
    calculatePopupTrafficFactor(state) *
    calculateTrafficSpikeFactor(state) *
    calculateQuickFixFactor(state) *
    calculateMobileTrafficFactor(state) *
    calculateRenderingTrafficFactor(state) *
    calculateSecurityTrafficFactor(state) *
    (NEUTRAL_FACTOR - calculateAiAnswerShare(state))
  );
});

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
  return readFactor(state, 'server-load-multiplier');
}

export function hasTrafficSpikeCache(state: GameState): boolean {
  return hasEffect(state, 'traffic-spike-cache');
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
export const calculateServerLoad = memoizeByState((state: GameState): number => {
  return ERAS_BY_ID[state.eraId].hasServerLoad ? calculateServerDemand(state) / calculateHostingCapacity(state, getHostingTier(state)) : 0;
});

function calculateFeaturePageWeightKb(state: GameState, featureId: FeatureId): number {
  const definition = FEATURES_BY_ID[featureId];
  const level = state.featureLevels[featureId];
  const isOnPage = isFeatureOnPage(state, featureId) && !isFeatureSwitchedOff(state, featureId) && !isFeaturePluginDead(state, featureId);
  return isOnPage ? definition.pageWeightKb + definition.pageWeightKbPerLevel * level : 0;
}

export const calculatePageWeightKb = memoizeByState((state: GameState): number => {
  const era = ERAS_BY_ID[state.eraId];
  const featuresKb = sumAll(FEATURE_IDS.map((featureId) => calculateFeaturePageWeightKb(state, featureId)));
  // Old assets come along: your 1997 stars.gif still loads on the 2005 page. Retired ones leave with their feature.
  const upgradesKb = sumAll(getActiveUpgradeIds(state).map((upgradeId) => UPGRADES_BY_ID[upgradeId].pageWeightKb));
  const rawKb = era.basePageWeightKb + featuresKb + upgradesKb + state.adCount * era.adPageWeightKb;
  return rawKb * readFactor(state, 'page-weight-multiplier');
});

/**
 * Page weight over a connection. An overloaded server makes everything slower still, and so does a single-page app
 * that has to load and run before it shows anything.
 */
function calculateLoadTimeOver(state: GameState, kbPerSecond: number): number {
  const transferSeconds = calculatePageWeightKb(state) / kbPerSecond;
  return transferSeconds * readFactor(state, 'load-time-multiplier') * calculateRenderingLoadTimeFactor(state) * Math.max(NEUTRAL_FACTOR, calculateServerLoad(state));
}

/** On a desktop visitor's connection. */
export const calculateLoadTimeSeconds = memoizeByState((state: GameState): number => calculateLoadTimeOver(state, ERAS_BY_ID[state.eraId].connectionKbPerSecond));

/** On a phone visitor's connection: 3G in 2011, 4G in 2018. */
export const calculatePhoneLoadTimeSeconds = memoizeByState((state: GameState): number => calculateLoadTimeOver(state, ERAS_BY_ID[state.eraId].mobileConnectionKbPerSecond));

/** Past twice its capacity, most visitors get a 503 page. The server still serves what it can. */
export function isSiteDown(state: GameState): boolean {
  return calculateServerLoad(state) >= SITE_DOWN_SERVER_LOAD * getEffectSummary(state).overloadTolerance;
}

/** At this many times the era's patience, half of the visitors who would ever give up have given up. */
const PATIENCE_HALF_LOSS = 1.5;
/** However slow the page, some visitors always wait: at most this share leaves. */
const MAX_SLOW_PAGE_LOSS = 0.5;

/**
 * Share of visitors who wait for a page that takes this long. Every second costs a little and none is fatal: about
 * 5% leave at half the era's patience, 15% at its patience, a third at twice it, and never more than half.
 */
export function calculateStayShare(loadTimeSeconds: number, patienceSeconds: number): number {
  const squaredRatio = (loadTimeSeconds / patienceSeconds) ** 2;
  return NEUTRAL_FACTOR - (MAX_SLOW_PAGE_LOSS * squaredRatio) / (squaredRatio + PATIENCE_HALF_LOSS ** 2);
}

/** Of the visitors still trying (after the pinch-and-zoom bounces), the share on a phone. */
function calculatePhoneShareOfDemand(state: GameState): number {
  const mobileShare = ERAS_BY_ID[state.eraId].mobileShare;
  const phones = mobileShare * calculateMobileStayShare(state);
  return phones / Math.max(Number.EPSILON, NEUTRAL_FACTOR - mobileShare + phones);
}

/** Share of visitors who wait for the page: desktop visitors on their connection, phone visitors on theirs. */
export const calculatePerformanceTrafficFactor = memoizeByState((state: GameState): number => {
  if (!ERAS_BY_ID[state.eraId].hasPageWeight) return NEUTRAL_FACTOR;
  const patience = ERAS_BY_ID[state.eraId].patienceSeconds;
  const phoneShare = calculatePhoneShareOfDemand(state);
  const desktopStay = calculateStayShare(calculateLoadTimeSeconds(state), patience);
  const phoneStay = calculateStayShare(calculatePhoneLoadTimeSeconds(state), patience);
  return (NEUTRAL_FACTOR - phoneShare) * desktopStay + phoneShare * phoneStay;
});

function calculateServedLimit(state: GameState): number {
  // A cached spike keeps the site up, but you still only earn from what your setup can carry.
  return ERAS_BY_ID[state.eraId].hasServerLoad ? calculateHostingCapacity(state, getHostingTier(state)) : Number.POSITIVE_INFINITY;
}

/**
 * Visitors who actually get your page: those patient enough to wait, up to what the server can serve.
 * An overloaded server never drops to zero, so you can always earn your way to the next hosting tier.
 */
export const calculateVisitorsPerSecond = memoizeByState((state: GameState): number => {
  return Math.min(calculateDemandVisitorsPerSecond(state) * calculatePerformanceTrafficFactor(state), calculateServedLimit(state));
});

/**
 * Visitors on a usual day: without the trouble of the moment (pop-ups, infections, an expired certificate) and without
 * the luck (a traffic spike, the quick-fix bonus). The era checklist counts these. It asks how big the site has grown,
 * and a pop-up left open for a minute shouldn't untick it: trouble costs income, not the checklist. Hosting stays in:
 * an overloaded server is the site's own size problem, not a passing one.
 */
export const calculateUsualVisitorsPerSecond = memoizeByState((state: GameState): number =>
  calculateVisitorsPerSecond({ ...state, popups: [], infections: [], isCertificateExpired: false, trafficSpikeRemainingMs: 0, quickFixBonusRemainingMs: 0 }),
);

export function calculateAdValuePerAd(state: GameState): number {
  const defenseFactors = getEnabledDefenses(state).map((defense) => defense.adValueFactor);
  const era = ERAS_BY_ID[state.eraId];
  const consentFactor = CONSENT_BANNERS_BY_ID[state.consentBanner].adValueFactor;
  return (era.adValuePerVisitor * readFactor(state, 'ad-value-multiplier') * multiplyAll(defenseFactors) * consentFactor) / era.revenuePace;
}

export function calculateRevenuePerVisitor(state: GameState): number {
  return state.adCount * calculateAdValuePerAd(state);
}

/** What defenses and the ops you run cost, as a share of revenue. */
export function calculateUpkeepShare(state: GameState): number {
  return sumAll(getEnabledDefenses(state).map((defense) => defense.revenueUpkeepShare)) + getEffectSummary(state).upkeepShare;
}

/**
 * 2024: the share of would-be visitors an AI answer keeps. They read your content in a summary above your link and
 * never come. Writing for AI answers gets you quoted with a link, and half of them through.
 */
export function calculateAiAnswerShare(state: GameState): number {
  return ERAS_BY_ID[state.eraId].aiAnswerShare * getEffectSummary(state).aiAnswerFactor;
}

/** Lawyers make the GDPR's fines smaller; retargeting everyone makes them bigger. */
export function calculatePrivacyFineFactor(state: GameState): number {
  return getEffectSummary(state).privacyFineFactor;
}

/** How long after an infection appears it still counts as a quick fix: longer when monitoring tells you sooner. */
export function calculateQuickFixWindowMs(state: GameState): number {
  return QUICK_FIX_WINDOW_MS * getEffectSummary(state).quickFixWindowFactor;
}

/** When an ops upgrade clears this kind of infection by itself: backups restore, blue-green rolls back. */
export function findOpsAutoCleanMs(state: GameState, kind: InfectionKind): number | null {
  return getEffectSummary(state).autoCleanAfterMs[kind] ?? null;
}

/** The ops you can set up now: they live in the Ops tab, like skills, always on show in their era. */
export function getAvailableOpsIds(state: GameState): readonly UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'ops' && isUpgradeAvailable(state, upgradeId));
}

// ---------- HTTPS ----------

/** From July 2018 browsers marked every plain http page "Not secure", and some visitors turned back. */
const NOT_SECURE_TRAFFIC_FACTOR = 0.9;
/** "Your connection is not private": most visitors leave rather than click through the warning. */
const EXPIRED_CERTIFICATE_TRAFFIC_FACTOR = 0.4;
const NOT_SECURE_FROM_ERA: EraId = 'platform-2018';

export function isServedSecurely(state: GameState): boolean {
  return hasEffect(state, 'secure-connection');
}

export function isCertificateRenewedAutomatically(state: GameState): boolean {
  return hasEffect(state, 'automatic-certificate-renewal');
}

/** A certificate renewed by hand runs out now and then; one renewed by a cron job never does. */
export function canCertificateExpire(state: GameState): boolean {
  return isServedSecurely(state) && !isCertificateRenewedAutomatically(state);
}

/** Plain http is marked "Not secure" from 2018 on. */
export function isMarkedNotSecure(state: GameState): boolean {
  return !isServedSecurely(state) && isEraUnlocked(state, NOT_SECURE_FROM_ERA);
}

function calculateSecurityTrafficFactor(state: GameState): number {
  if (state.isCertificateExpired) return EXPIRED_CERTIFICATE_TRAFFIC_FACTOR;
  return isMarkedNotSecure(state) ? NOT_SECURE_TRAFFIC_FACTOR : NEUTRAL_FACTOR;
}

export const calculateNetRevenuePerSecond = memoizeByState((state: GameState): number => {
  return (
    calculateVisitorsPerSecond(state) *
    calculateRevenuePerVisitor(state) *
    (NEUTRAL_FACTOR - calculateUpkeepShare(state))
  );
});

export const calculateEconomySnapshot = memoizeByState((state: GameState): EconomySnapshot => {
  return {
    demandVisitorsPerSecond: calculateDemandVisitorsPerSecond(state),
    visitorsPerSecond: calculateVisitorsPerSecond(state),
    pageWeightKb: calculatePageWeightKb(state),
    loadTimeSeconds: calculateLoadTimeSeconds(state),
    phoneLoadTimeSeconds: calculatePhoneLoadTimeSeconds(state),
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
});

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

/**
 * The first banner is free: 1997's banner exchanges ran yours on other sites in return for theirs on yours. It also
 * means nobody is ever stuck with visitors, no ads and nothing to pay for one.
 */
export function calculateNextAdCost(state: GameState): number {
  return state.adCount === 0 ? 0 : Math.ceil(AD_BASE_COST * AD_COST_GROWTH ** state.adCount);
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

function isUpgradeCurrent(state: GameState, upgradeId: UpgradeId): boolean {
  return isFrameworkUpgradeOpen(state, upgradeId) && !isUpgradeRetired(state, upgradeId);
}

function isUpgradeOnOffer(state: GameState, upgradeId: UpgradeId): boolean {
  return isRequiredFeatureOwned(state, upgradeId) && isUpgradeCurrent(state, upgradeId);
}

export function isUpgradeAvailable(state: GameState, upgradeId: UpgradeId): boolean {
  return (
    !state.purchasedUpgradeIds.includes(upgradeId) &&
    isEraUnlocked(state, UPGRADES_BY_ID[upgradeId].eraId) &&
    isUpgradeOnOffer(state, upgradeId)
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

/** An upgrade is offered once you own what it upgrades, and stays listed once it's yours. */
function isDefenseOnOffer(state: GameState, defenseId: DefenseId): boolean {
  const base = DEFENSES_BY_ID[defenseId].upgradesFrom;
  return base === null || state.ownedDefenseIds.includes(base) || state.ownedDefenseIds.includes(defenseId);
}

/** Bought over: the ad blocker once its strict version is yours. */
function isDefenseReplaced(state: GameState, defenseId: DefenseId): boolean {
  return state.ownedDefenseIds.some((owned) => DEFENSES_BY_ID[owned].upgradesFrom === defenseId);
}

export function getUnlockedDefenseIds(state: GameState): readonly DefenseId[] {
  return DEFENSE_IDS.filter((defenseId) => isEraUnlocked(state, DEFENSES_BY_ID[defenseId].eraId) && !isDefenseRetired(state, defenseId))
    .filter((defenseId) => isDefenseOnOffer(state, defenseId))
    .filter((defenseId) => !isDefenseReplaced(state, defenseId));
}
