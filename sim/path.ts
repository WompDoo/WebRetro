import {
  buyFeature,
  buyUpgrade,
  calculateSpecializationProgress,
  calculateSpendingShare,
  canBuyFeature,
  canBuyUpgrade,
  canChooseSpecialization,
  chooseConsentBanner,
  chooseSpecialization,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  isFeatureSwitchedOff,
  isSpecializationOpen,
  LEAN_FLOOR_SHARE_OF_BUDGET,
  removeAd,
  SPECIALIZATION_ITEMS,
  SPECIALIZATIONS_BY_ID,
  SPECIALIZATIONS_FROM_RUN,
  toggleFeature,
  UPGRADE_IDS,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { FeatureId, GameState, SpecializationCondition, TreeSpecializationId, UpgradeId } from '../src/engine';
import type { PurchaseOption } from './bot';

/**
 * SIM_PATH=photos,social,stories,short-video plays the test build's second run chasing that path: in each era it
 * steers its spending at the path's next specialization, chooses it the moment it can, and buys its items first.
 * SIM_PATH=natural plays the second run with no path at all: what a player who never aims at one unlocks anyway.
 * Unset, the sim plays the classic game.
 */
export function readSimPath(value: string | undefined): readonly TreeSpecializationId[] | null {
  if (value === undefined || value === '') return null;
  return value.split(',').map((part) => part.trim()).filter((part): part is TreeSpecializationId => part in SPECIALIZATION_ITEMS);
}

export const SIM_PATH: readonly TreeSpecializationId[] | null = readSimPath(process.env['SIM_PATH']);

/** The test build's second run: specializations are on from 2005. */
export function startSecondRun(state: GameState): GameState {
  return { ...state, edition: 'webspecialization', runNumber: Math.max(state.runNumber, SPECIALIZATIONS_FROM_RUN) };
}

function isOfEra(id: TreeSpecializationId, state: GameState): boolean {
  return SPECIALIZATIONS_BY_ID[id].eraId === ERAS_BY_ID[state.eraId].baseEraId;
}

/** The path's specialization for this era: one the site doesn't hold yet, and whose door is open to it. */
export function findPathTarget(state: GameState, path: readonly TreeSpecializationId[]): TreeSpecializationId | null {
  return path.find((id) => isOfEra(id, state) && !state.specializationIds.includes(id) && isSpecializationOpen(state, id)) ?? null;
}

/** Chosen the moment it unlocks: the player who aims at a specialization doesn't wait. */
export function chooseOnPath(state: GameState, path: readonly TreeSpecializationId[]): GameState {
  const target = findPathTarget(state, path);
  return target !== null && canChooseSpecialization(state, target) ? chooseSpecialization(state, target).state : state;
}

/** A level of the feature, or the skill it needs first. Null when neither is affordable yet. */
function buildTowards(state: GameState, featureId: FeatureId): GameState | null {
  if (canBuyFeature(state, featureId)) return buyFeature(state, featureId);
  const skillId = FEATURES_BY_ID[featureId].requiredSkillId;
  return skillId !== null && canBuyUpgrade(state, skillId) ? buyUpgrade(state, skillId) : null;
}

function buyIfAffordable(state: GameState, upgradeId: UpgradeId): GameState | null {
  return canBuyUpgrade(state, upgradeId) ? buyUpgrade(state, upgradeId) : null;
}

/** A sacrifice: build the feature if it was never built, then switch it off. */
function switchOff(state: GameState, featureId: FeatureId): GameState | null {
  if (isFeatureSwitchedOff(state, featureId)) return null;
  return state.featureLevels[featureId] === 0 ? buildTowards(state, featureId) : toggleFeature(state, featureId);
}

const MOBILE_FRIENDLY_IDS: readonly UpgradeId[] = UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].effects.some((effect) => effect.kind === 'mobile-friendly'));
/** What makes a page load faster: lighter pages, a faster load. */
const LIGHTER_PAGE_IDS: readonly UpgradeId[] = UPGRADE_IDS.filter((upgradeId) =>
  UPGRADES_BY_ID[upgradeId].effects.some((effect) => (effect.kind === 'page-weight-multiplier' || effect.kind === 'load-time-multiplier') && effect.factor < 1),
);

type ConditionStep<K extends SpecializationCondition['kind']> = (state: GameState, condition: Extract<SpecializationCondition, { readonly kind: K }>) => GameState | null;

/** One step towards each kind of condition, or null when there's nothing to do about it right now. */
const STEPS: { readonly [K in SpecializationCondition['kind']]: ConditionStep<K> } = {
  'feature-level': (state, condition) => buildTowards(state, condition.featureId),
  skill: (state, condition) => buyIfAffordable(state, condition.upgradeId),
  'spending-share': (state, condition) => buildTowards(state, condition.featureId),
  'switched-off': (state, condition) => switchOff(state, condition.featureId),
  'max-ads': (state, condition) => (state.adCount > condition.count ? removeAd(state) : null),
  // Nothing to do once an ad went up: a path through it avoids ads from the start (see avoidsAdsAllRun).
  'never-an-ad': () => null,
  consent: (state, condition) => (state.consentBanner === condition.banner ? null : chooseConsentBanner(state, condition.banner)),
  'era-stat': () => null,
  'mobile-friendly': (state) => MOBILE_FRIENDLY_IDS.map((upgradeId) => buyIfAffordable(state, upgradeId)).find((bought) => bought !== null) ?? null,
  'phone-load-under': (state) => LIGHTER_PAGE_IDS.map((upgradeId) => buyIfAffordable(state, upgradeId)).find((bought) => bought !== null) ?? null,
  'ai-answer-share': () => null,
};

function stepTowards(state: GameState, condition: SpecializationCondition): GameState | null {
  const step = STEPS[condition.kind] as (current: GameState, value: SpecializationCondition) => GameState | null;
  return step(state, condition);
}

/** The held specializations' own items, cheapest first: the reason to have chosen them. */
function buyHeldItems(state: GameState): GameState | null {
  const items = state.specializationIds.flatMap((id) => (id === 'homepage' ? [] : [SPECIALIZATION_ITEMS[id]]));
  const upgrades = items.flatMap((item) => [item.learn, ...item.upgrades]).filter((upgradeId) => canBuyUpgrade(state, upgradeId));
  const unbuilt = items.map((item) => item.build).filter((featureId) => state.featureLevels[featureId] === 0 && canBuyFeature(state, featureId));
  const [upgradeId] = upgrades;
  const [featureId] = unbuilt;
  if (upgradeId !== undefined) return buyUpgrade(state, upgradeId);
  return featureId === undefined ? null : buyFeature(state, featureId);
}

/** What a committed player leaves for the end: the lean, and the sacrifices that would cost income all era. */
const LAST_KINDS: readonly SpecializationCondition['kind'][] = ['spending-share', 'switched-off', 'max-ads', 'consent'];

function isLeftForLast(condition: SpecializationCondition): boolean {
  return LAST_KINDS.includes(condition.kind);
}

function listUnmet(state: GameState, path: readonly TreeSpecializationId[]): readonly SpecializationCondition[] {
  const target = findPathTarget(state, path);
  return target === null ? [] : calculateSpecializationProgress(state, target).filter((progress) => !progress.isMet).map((progress) => progress.condition);
}

/** How much more the lean feature needs before its share reaches the target, the floor included. */
export function calculateLeanShortfall(state: GameState, featureId: FeatureId, share: number): number {
  const spent = state.eraStats.spentByFeature[featureId] ?? 0;
  const total = Object.values(state.eraStats.spentByFeature).reduce((sum, value) => sum + value, 0);
  const floor = ERAS_BY_ID[state.eraId].migrationCost * LEAN_FLOOR_SHARE_OF_BUDGET;
  return Math.max(0, (share * total - spent) / (1 - share), share * floor - spent);
}

function findShortfall(state: GameState, unmet: readonly SpecializationCondition[]): number {
  const lean = unmet.find((condition): condition is Extract<SpecializationCondition, { readonly kind: 'spending-share' }> => condition.kind === 'spending-share');
  return lean === undefined ? 0 : calculateLeanShortfall(state, lean.featureId, lean.share);
}

/** The lean is pumped once its shortfall is about this much income or less: a few minutes of holding back. */
export const PUMP_WINDOW_SECONDS = 180;

/**
 * A committed player builds the economy first, then pumps: once only the lean and the sacrifices are left, and the
 * lean's shortfall is a few minutes of income, it holds other features back and makes the sacrifices. Starting the lean
 * from an era's first second starved the site: 2005 took 87 minutes on the photos path, for 14 gallery levels.
 */
export function isPumping(state: GameState, path: readonly TreeSpecializationId[], incomePerSecond: number): boolean {
  const unmet = listUnmet(state, path);
  const isOnlyLastLeft = unmet.length > 0 && unmet.every(isLeftForLast);
  return isOnlyLastLeft && findShortfall(state, unmet) <= state.money + incomePerSecond * PUMP_WINDOW_SECONDS;
}

/**
 * The path's move before the usual shopping: a step towards the next specialization's unlock (the builds while
 * building, everything once pumping), or one of the held specializations' items. Null leaves the choice to the bot.
 */
export function steerOnPath(state: GameState, path: readonly TreeSpecializationId[], isPumpingNow: boolean): GameState | null {
  const due = listUnmet(state, path).filter((condition) => isPumpingNow || !isLeftForLast(condition));
  const stepped = [...due].sort(byLeanLast).map((condition) => stepTowards(state, condition)).find((next) => next !== null);
  return stepped ?? buyHeldItems(state);
}

/**
 * Everything else first, the lean last: levels, sacrifices and skills are features too, and building them after the
 * lean is met would pull the share back under. A player who means it builds them first and then pumps the lean.
 */
function byLeanLast(first: SpecializationCondition, second: SpecializationCondition): number {
  return Number(first.kind === 'spending-share') - Number(second.kind === 'spending-share');
}

function findUnmetLean(state: GameState, path: readonly TreeSpecializationId[]): FeatureId | null {
  const target = findPathTarget(state, path);
  const leans = target === null ? [] : SPECIALIZATIONS_BY_ID[target].unlock.flatMap((condition) => (condition.kind === 'spending-share' ? [condition] : []));
  return leans.find((condition) => calculateSpendingShare(state, condition.featureId) < condition.share)?.featureId ?? null;
}

const DILUTING_PREFIXES: readonly string[] = ['feature:'];

/**
 * While a lean is short, building anything else pushes it further away: the bot holds off on other features. A lean is
 * a share of what's built, so skills, boosts, ops, ads and hosting don't spoil it.
 */
export function avoidsOffPath(state: GameState, path: readonly TreeSpecializationId[]): (option: PurchaseOption) => boolean {
  const lean = findUnmetLean(state, path);
  if (lean === null) return () => false;
  const leanSkill = FEATURES_BY_ID[lean].requiredSkillId;
  const onPath = [`feature:${lean}`, `skill:${leanSkill ?? ''}`];
  return (option) => DILUTING_PREFIXES.some((prefix) => option.label.startsWith(prefix)) && !onPath.includes(option.label);
}

/** A path through a specialization that asks for a run without a single ad (the wiki) never places one, from 1997 on. */
export function avoidsAdsAllRun(path: readonly TreeSpecializationId[]): boolean {
  return path.some((id) => SPECIALIZATIONS_BY_ID[id].unlock.some((condition) => condition.kind === 'never-an-ad'));
}

const SHARE_PERCENT = 100;
const TOP_SHARES = 4;

/** Where this era's money went, biggest first: what a lean would have to beat. */
export function describeSpendingShares(state: GameState): string {
  const total = Object.values(state.eraStats.spentByFeature).reduce((sum, spent) => sum + spent, 0);
  const shares = FEATURE_IDS.map((featureId) => ({ featureId, share: (state.eraStats.spentByFeature[featureId] ?? 0) / Math.max(total, 1) })).filter((entry) => entry.share > 0);
  const top = [...shares].sort((first, second) => second.share - first.share).slice(0, TOP_SHARES);
  return top.map((entry) => `${entry.featureId} ${Math.round(entry.share * SHARE_PERCENT)}%`).join(', ');
}
