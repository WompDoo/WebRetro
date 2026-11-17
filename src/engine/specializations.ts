import { FEATURE_COST_GROWTH } from './constants';
import { ERAS_BY_ID } from './content/eras';
import { FEATURES_BY_ID } from './content/features';
import { SPECIALIZATION_IDS, SPECIALIZATIONS_BY_ID, SPECIALIZED_ERA_IDS } from './content/specializations';
import type { SpecializationCondition, SpecializationEraPlan } from './content/specializations';
import { UPGRADES_BY_ID } from './content/upgrades';
import type { EraGateRequirement, EraId, FeatureId, GameEvent, GameState, GameStep, SpecializationId, SpecializedEraId, UpgradeEffect } from './types';

/** Only the web specialization test build has them; the classic game stays a Homepage, with no specialization. */
export function areSpecializationsOn(state: GameState): boolean {
  return state.edition !== 'classic';
}

export function isSpecializedEra(eraId: EraId): eraId is SpecializedEraId {
  return (SPECIALIZED_ERA_IDS as readonly EraId[]).includes(eraId);
}

export interface ConditionProgress {
  readonly condition: SpecializationCondition;
  readonly label: string;
  readonly current: number;
  readonly target: number;
  readonly isMet: boolean;
}

const LEARNED = 1;
const NOT_LEARNED = 0;

const CONDITION_MEASURES: { readonly [K in SpecializationCondition['kind']]: (state: GameState, condition: Extract<SpecializationCondition, { kind: K }>) => ConditionProgress } = {
  'feature-level': (state, condition) => {
    const current = state.featureLevels[condition.featureId];
    return { condition, label: FEATURES_BY_ID[condition.featureId].name, current, target: condition.level, isMet: current >= condition.level };
  },
  skill: (state, condition) => {
    const current = state.purchasedUpgradeIds.includes(condition.upgradeId) ? LEARNED : NOT_LEARNED;
    return { condition, label: UPGRADES_BY_ID[condition.upgradeId].name, current, target: LEARNED, isMet: current === LEARNED };
  },
};

function measureCondition(state: GameState, condition: SpecializationCondition): ConditionProgress {
  const measure = CONDITION_MEASURES[condition.kind] as (current: GameState, value: SpecializationCondition) => ConditionProgress;
  return measure(state, condition);
}

/** Every condition of a specialization, with how far along it is this run. */
export function calculateSpecializationProgress(state: GameState, specializationId: SpecializationId): readonly ConditionProgress[] {
  return SPECIALIZATIONS_BY_ID[specializationId].unlock.map((condition) => measureCondition(state, condition));
}

function isReached(state: GameState, specializationId: SpecializationId): boolean {
  return calculateSpecializationProgress(state, specializationId).every((progress) => progress.isMet);
}

/** Homepage (no specialization) is always open; the others once reached this run. A new run starts with none. */
export function isSpecializationUnlocked(state: GameState, specializationId: SpecializationId): boolean {
  return specializationId === 'homepage' || state.unlockedSpecializationIds.includes(specializationId);
}

function announceUnlock(specializationId: SpecializationId): GameEvent {
  const { name } = SPECIALIZATIONS_BY_ID[specializationId];
  return { kind: 'milestone', message: `New specialization unlocked: ${name}. You can become one at your next relaunch.` };
}

/** Each step: a specialization reached this run is unlocked for good, with a news line. Levels lost later don't take it back. */
export function checkSpecializationUnlocks(state: GameState): GameStep {
  const newlyReached = SPECIALIZATION_IDS.filter((id) => !isSpecializationUnlocked(state, id) && isReached(state, id));
  if (!areSpecializationsOn(state) || newlyReached.length === 0) return { state, events: [] };
  return { state: { ...state, unlockedSpecializationIds: [...state.unlockedSpecializationIds, ...newlyReached] }, events: newlyReached.map(announceUnlock) };
}

/** The relaunch into this era is a moment to specialize, or specialize again: from 2011 on, in the test build. */
export function canSpecializeInto(state: GameState, nextEraId: EraId): boolean {
  return areSpecializationsOn(state) && isSpecializedEra(ERAS_BY_ID[nextEraId].baseEraId);
}

/** What the relaunch offers: every specialization unlocked this run, Homepage and the current one included. */
export function listSpecializationChoices(state: GameState): readonly SpecializationId[] {
  return SPECIALIZATION_IDS.filter((id) => isSpecializationUnlocked(state, id));
}

/** Becomes this specialization, if it's unlocked. The relaunch records where the site has been. */
export function specialize(state: GameState, specializationId: SpecializationId): GameState {
  const isAllowed = areSpecializationsOn(state) && isSpecializationUnlocked(state, specializationId);
  return isAllowed ? { ...state, specializationId } : state;
}

/**
 * This era's plan for the current specialization, or null before 2011 (everyone is a homepage then) and in the classic
 * game, which keeps the era's own checklist and money whatever a save says.
 */
export function findSpecializationPlan(state: GameState): SpecializationEraPlan | null {
  const baseEraId = ERAS_BY_ID[state.eraId].baseEraId;
  return areSpecializationsOn(state) && isSpecializedEra(baseEraId) ? SPECIALIZATIONS_BY_ID[state.specializationId].eras[baseEraId] : null;
}

/** How the specialization makes money this era: effects, summarized like any upgrade's. */
export function listSpecializationEffects(state: GameState): readonly UpgradeEffect[] {
  const plan = findSpecializationPlan(state);
  return plan === null ? [] : plan.effects;
}

/**
 * A route's focus may cost this many times what the checklist item it replaces costs, and no more. Focus features
 * cost very different amounts (2011's activity feed starts at 17 times the share buttons' price), so the level a
 * route asks for comes from this budget: a cheap focus at the era's usual level, a dear one at fewer levels.
 */
export const FOCUS_COST_ALLOWANCE = 4;
/** Even the dearest focus is worth a few levels. */
const MIN_FOCUS_LEVEL = 3;

/** What the first `levels` levels of a feature cost at list price, before any discount. */
function sumLevelCosts(featureId: FeatureId, levels: number): number {
  return (FEATURES_BY_ID[featureId].baseCost * (FEATURE_COST_GROWTH ** levels - 1)) / (FEATURE_COST_GROWTH - 1);
}

/** The highest level of the focus that fits the budget, never above the era's usual level. */
export function calculateFocusLevel(replacedFeatureId: FeatureId, usualLevel: number, focusFeatureId: FeatureId): number {
  const budget = sumLevelCosts(replacedFeatureId, usualLevel) * FOCUS_COST_ALLOWANCE;
  const affordable = Math.floor(Math.log((budget * (FEATURE_COST_GROWTH - 1)) / FEATURES_BY_ID[focusFeatureId].baseCost + 1) / Math.log(FEATURE_COST_GROWTH));
  return Math.max(MIN_FOCUS_LEVEL, Math.min(usualLevel, affordable));
}

function withFocus(requirement: EraGateRequirement, replacedFeatureId: FeatureId, plan: SpecializationEraPlan): EraGateRequirement {
  const target = calculateFocusLevel(replacedFeatureId, requirement.target, plan.focus);
  return { ...requirement, featureId: plan.focus, target, label: `${FEATURES_BY_ID[plan.focus].name} level ${target}` };
}

function focusRequirement(requirement: EraGateRequirement, plan: SpecializationEraPlan): EraGateRequirement {
  const { featureId } = requirement;
  return requirement.kind === 'feature-level' && featureId !== null ? withFocus(requirement, featureId, plan) : requirement;
}

/** The era's checklist, with its focus feature swapped for the specialization's: a video site's 2011 asks for the video player. */
export function listGateRequirements(state: GameState): readonly EraGateRequirement[] {
  const requirements = ERAS_BY_ID[state.eraId].gateRequirements;
  const plan = state.specializationId === 'homepage' ? null : findSpecializationPlan(state);
  return plan === null ? requirements : requirements.map((requirement) => focusRequirement(requirement, plan));
}
