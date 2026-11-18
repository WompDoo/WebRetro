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

/** The path's specialization for this era, while the site doesn't hold it yet. */
export function findPathTarget(state: GameState, path: readonly TreeSpecializationId[]): TreeSpecializationId | null {
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  return path.find((id) => SPECIALIZATIONS_BY_ID[id].eraId === eraId && !state.specializationIds.includes(id)) ?? null;
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

type ConditionStep<K extends SpecializationCondition['kind']> = (state: GameState, condition: Extract<SpecializationCondition, { readonly kind: K }>) => GameState | null;

/** One step towards each kind of condition, or null when there's nothing to do about it right now. */
const STEPS: { readonly [K in SpecializationCondition['kind']]: ConditionStep<K> } = {
  'feature-level': (state, condition) => buildTowards(state, condition.featureId),
  skill: (state, condition) => buyIfAffordable(state, condition.upgradeId),
  'spending-share': (state, condition) => buildTowards(state, condition.featureId),
  'switched-off': (state, condition) => switchOff(state, condition.featureId),
  'max-ads': (state, condition) => (state.adCount > condition.count ? removeAd(state) : null),
  'ad-free-minutes': (state) => (state.adCount > 0 ? removeAd(state) : null),
  consent: (state, condition) => (state.consentBanner === condition.banner ? null : chooseConsentBanner(state, condition.banner)),
  'era-stat': () => null,
  'mobile-friendly': (state) => MOBILE_FRIENDLY_IDS.map((upgradeId) => buyIfAffordable(state, upgradeId)).find((bought) => bought !== null) ?? null,
  'phone-load-under': () => null,
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

/**
 * The path's move before the usual shopping: a step towards the next specialization's unlock, or one of the held
 * specializations' items. Null leaves the choice to the bot.
 */
export function steerOnPath(state: GameState, path: readonly TreeSpecializationId[]): GameState | null {
  const target = findPathTarget(state, path);
  const unmet = target === null ? [] : calculateSpecializationProgress(state, target).filter((progress) => !progress.isMet);
  const stepped = unmet.map((progress) => stepTowards(state, progress.condition)).find((next) => next !== null);
  return stepped ?? buyHeldItems(state);
}

function findUnmetLean(state: GameState, path: readonly TreeSpecializationId[]): FeatureId | null {
  const target = findPathTarget(state, path);
  const leans = target === null ? [] : SPECIALIZATIONS_BY_ID[target].unlock.flatMap((condition) => (condition.kind === 'spending-share' ? [condition] : []));
  return leans.find((condition) => calculateSpendingShare(state, condition.featureId) < condition.share)?.featureId ?? null;
}

const DILUTING_PREFIXES: readonly string[] = ['feature:', 'boost:', 'skill:', 'ops:'];

/**
 * While a lean is short, spending anywhere else pushes it further away: the bot holds off on other features, boosts,
 * skills and ops. Ads, hosting and switches stay, so the site keeps running.
 */
export function avoidsOffPath(state: GameState, path: readonly TreeSpecializationId[]): (option: PurchaseOption) => boolean {
  const lean = findUnmetLean(state, path);
  if (lean === null) return () => false;
  const leanSkill = FEATURES_BY_ID[lean].requiredSkillId;
  const onPath = [`feature:${lean}`, `skill:${leanSkill ?? ''}`];
  return (option) => DILUTING_PREFIXES.some((prefix) => option.label.startsWith(prefix)) && !onPath.includes(option.label);
}

const SHARE_PERCENT = 100;
const TOP_SHARES = 4;

/** Where this era's money went, biggest first: what a lean would have to beat. */
export function describeSpendingShares(state: GameState): string {
  const shares = FEATURE_IDS.map((featureId) => ({ featureId, share: calculateSpendingShare(state, featureId) })).filter((entry) => entry.share > 0);
  const top = [...shares].sort((first, second) => second.share - first.share).slice(0, TOP_SHARES);
  return top.map((entry) => `${entry.featureId} ${Math.round(entry.share * SHARE_PERCENT)}%`).join(', ');
}
