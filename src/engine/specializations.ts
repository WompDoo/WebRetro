import { CONSENT_BANNERS_BY_ID } from './content/consent-banners';
import { ERA_IDS } from './content/era-ids';
import { ERAS_BY_ID } from './content/eras';
import { FEATURES_BY_ID } from './content/features';
import { SPECIALIZATION_IDS, SPECIALIZATIONS_BY_ID, SPECIALIZED_ERA_IDS } from './content/specializations';
import type { EraStatId, SpecializationCondition, SpecializationDefinition, SpecializationEraPlan } from './content/specializations';
import { UPGRADES_BY_ID } from './content/upgrades';
import {
  calculateAiAnswerShare,
  calculateBaseVisitorsPerSecond,
  calculateFeatureVisitorsPerSecond,
  calculatePhoneLoadTimeSeconds,
  isFeatureSwitchedOff,
  isMobileFriendly,
} from './economy';
import { countCleanedOf } from './era-stats';
import type { EraGateRequirement, EraId, FeatureId, GameEvent, GameState, GameStep, SpecializationId, SpecializedEraId, UpgradeEffect } from './types';

/**
 * The specialization tree's rules (content/specializations.ts has the tree). From the second run, in the test
 * build: each era from 2005 has its own specializations, unlocked by what you do in that era and chosen there and
 * then, one per era, for good. They stack; the newest leads.
 */

/** The second run opens specializations; the first is the game as it has always been. */
export const SPECIALIZATIONS_FROM_RUN = 2;

export function areSpecializationsOn(state: GameState): boolean {
  return state.edition !== 'classic' && state.runNumber >= SPECIALIZATIONS_FROM_RUN;
}

export function isSpecializedEra(eraId: EraId): eraId is SpecializedEraId {
  return (SPECIALIZED_ERA_IDS as readonly EraId[]).includes(eraId);
}

/** Every specialization but the Homepage, which is no specialization. */
export const TREE_IDS: readonly SpecializationId[] = SPECIALIZATION_IDS.filter((id) => id !== 'homepage');

/** What the site is now: its newest specialization, or a homepage. */
export function findCurrentSpecialization(state: GameState): SpecializationId {
  return state.specializationIds[state.specializationIds.length - 1] ?? 'homepage';
}

function eraIndex(eraId: EraId): number {
  return ERA_IDS.indexOf(eraId);
}

function currentBaseEra(state: GameState): EraId {
  return ERAS_BY_ID[state.eraId].baseEraId;
}

/** The specialization this era has given the site, if it has. */
export function findSpecializationOfEra(state: GameState, eraId: EraId): SpecializationId | null {
  return state.specializationIds.find((id) => SPECIALIZATIONS_BY_ID[id].eraId === eraId) ?? null;
}

// ---------- Conditions ----------

/** How a condition's numbers read: a level, a share of visitors, a count, a yes or no, seconds, minutes. */
export type ConditionUnit = 'level' | 'share' | 'count' | 'flag' | 'seconds' | 'minutes' | 'ads';

export interface ConditionProgress {
  readonly condition: SpecializationCondition;
  readonly label: string;
  readonly unit: ConditionUnit;
  readonly current: number;
  readonly target: number;
  readonly isMet: boolean;
  /** How far along, from 0 to 1: what brings a specialization into view. */
  readonly ratio: number;
}

const YES = 1;
const NO = 0;
const MS_PER_MINUTE = 60_000;

function towards(current: number, target: number): number {
  return target <= 0 ? YES : Math.min(YES, Math.max(NO, current / target));
}

function progress(condition: SpecializationCondition, label: string, unit: ConditionUnit, current: number, target: number): ConditionProgress {
  const isMet = current >= target;
  return { condition, label, unit, current, target, isMet, ratio: isMet ? YES : towards(current, target) };
}

function flag(condition: SpecializationCondition, label: string, isMet: boolean): ConditionProgress {
  return progress(condition, label, 'flag', isMet ? YES : NO, YES);
}

const STAT_LABELS: Readonly<Record<EraStatId, string>> = {
  'on-fire': 'Catch fire while typing',
  'spikes-ridden-out': 'Ride out a traffic spike without going down',
  'spam-cleaned': 'Sort the spam',
  'ddos-cleaned': 'Fend off a DDoS',
};

function readStat(state: GameState, statId: EraStatId): number {
  const stats: Readonly<Record<EraStatId, number>> = {
    'on-fire': state.eraStats.onFireStarts,
    'spikes-ridden-out': state.eraStats.spikesRiddenOut,
    'spam-cleaned': countCleanedOf(state, 'spam'),
    'ddos-cleaned': countCleanedOf(state, 'ddos'),
  };
  return stats[statId];
}

/** A feature's share of every visitor the site's features bring right now. */
export function calculateVisitorShare(state: GameState, featureId: FeatureId): number {
  const total = calculateBaseVisitorsPerSecond(state);
  return total > 0 ? calculateFeatureVisitorsPerSecond(state, featureId) / total : 0;
}

/** Fewer is the goal: at most this many ads. */
function measureAds(state: GameState, condition: SpecializationCondition, count: number): ConditionProgress {
  const label = count === 0 ? 'No ads' : `At most ${count} ads`;
  const isMet = state.adCount <= count;
  return { condition, label, unit: 'ads', current: state.adCount, target: count, isMet, ratio: isMet ? YES : towards(count + 1, state.adCount + 1) };
}

/** Faster is the goal: the page on a phone loads within this many seconds. */
function measurePhoneLoad(state: GameState, condition: SpecializationCondition, seconds: number): ConditionProgress {
  const current = calculatePhoneLoadTimeSeconds(state);
  const isMet = current <= seconds;
  return { condition, label: `Loads in under ${seconds} s on a phone`, unit: 'seconds', current, target: seconds, isMet, ratio: isMet ? YES : towards(seconds, current) };
}

type Measures = { readonly [K in SpecializationCondition['kind']]: (state: GameState, condition: Extract<SpecializationCondition, { kind: K }>) => ConditionProgress };

const MEASURES: Measures = {
  'feature-level': (state, condition) => progress(condition, FEATURES_BY_ID[condition.featureId].name, 'level', state.featureLevels[condition.featureId], condition.level),
  skill: (state, condition) => flag(condition, UPGRADES_BY_ID[condition.upgradeId].name, state.purchasedUpgradeIds.includes(condition.upgradeId)),
  'visitor-share': (state, condition) =>
    progress(condition, `${FEATURES_BY_ID[condition.featureId].name} brings ${Math.round(condition.share * 100)}% of your visitors`, 'share', calculateVisitorShare(state, condition.featureId), condition.share),
  'switched-off': (state, condition) => flag(condition, `${FEATURES_BY_ID[condition.featureId].name} switched off`, isFeatureSwitchedOff(state, condition.featureId)),
  'max-ads': (state, condition) => measureAds(state, condition, condition.count),
  'ad-free-minutes': (state, condition) => progress(condition, `No ads for ${condition.minutes} minutes in a row`, 'minutes', state.eraStats.adFreeMs / MS_PER_MINUTE, condition.minutes),
  consent: (state, condition) => flag(condition, `${CONSENT_BANNERS_BY_ID[condition.banner].name} on the site`, state.consentBanner === condition.banner),
  'era-stat': (state, condition) => progress(condition, STAT_LABELS[condition.stat], 'count', readStat(state, condition.stat), condition.count),
  'mobile-friendly': (state, condition) => flag(condition, 'Works on phones', isMobileFriendly(state)),
  'phone-load-under': (state, condition) => measurePhoneLoad(state, condition, condition.seconds),
  'ai-answer-share': (state, condition) => progress(condition, `AI answers take ${Math.round(condition.share * 100)}% of the clicks`, 'share', calculateAiAnswerShare(state), condition.share),
};

function measureCondition(state: GameState, condition: SpecializationCondition): ConditionProgress {
  const measure = MEASURES[condition.kind] as (current: GameState, value: SpecializationCondition) => ConditionProgress;
  return measure(state, condition);
}

/** Every condition of a specialization, with how far along it is this era. */
export function calculateSpecializationProgress(state: GameState, specializationId: SpecializationId): readonly ConditionProgress[] {
  return SPECIALIZATIONS_BY_ID[specializationId].unlock.map((condition) => measureCondition(state, condition));
}

function isReached(state: GameState, specializationId: SpecializationId): boolean {
  return calculateSpecializationProgress(state, specializationId).every((condition) => condition.isMet);
}

// ---------- The tree ----------

/** Serial founder, a run-three perk: any specialization in its era, whatever came before. */
export function hasSerialFounder(state: GameState): boolean {
  return state.legacyPerkLevels['serial-founder'] > 0;
}

/** Its parent is on the site already, or it needs none. */
export function hasLineage(state: GameState, specializationId: SpecializationId): boolean {
  const { parents } = SPECIALIZATIONS_BY_ID[specializationId];
  return parents.length === 0 || parents.some((parent) => state.specializationIds.includes(parent)) || hasSerialFounder(state);
}

/** Open to this site right now: its era is now, nothing taken this era yet, and its lineage holds. */
function isItsEra(state: GameState, specializationId: SpecializationId): boolean {
  return areSpecializationsOn(state) && currentBaseEra(state) === SPECIALIZATIONS_BY_ID[specializationId].eraId;
}

export function isSpecializationOpen(state: GameState, specializationId: SpecializationId): boolean {
  const isEraFree = findSpecializationOfEra(state, SPECIALIZATIONS_BY_ID[specializationId].eraId) === null;
  return isItsEra(state, specializationId) && isEraFree && hasLineage(state, specializationId);
}

/** The Homepage is always open; the others once reached this run, in their era. */
export function isSpecializationUnlocked(state: GameState, specializationId: SpecializationId): boolean {
  return specializationId === 'homepage' || state.unlockedSpecializationIds.includes(specializationId);
}

function announceUnlock(specializationId: SpecializationId): GameEvent {
  return { kind: 'milestone', message: `New specialization unlocked: ${SPECIALIZATIONS_BY_ID[specializationId].name}. Choose it in the Specialize tab while this era lasts.` };
}

/** Each step: a specialization reached in its era unlocks, with a news line. Levels lost later don't take it back. */
export function checkSpecializationUnlocks(state: GameState): GameStep {
  const newlyReached = TREE_IDS.filter((id) => !isSpecializationUnlocked(state, id) && isSpecializationOpen(state, id) && isReached(state, id));
  if (newlyReached.length === 0) return { state, events: [] };
  return { state: { ...state, unlockedSpecializationIds: [...state.unlockedSpecializationIds, ...newlyReached] }, events: newlyReached.map(announceUnlock) };
}

/** Half way there on its first condition (its lean), found in an earlier run, or unlocked: the tab shows its card. */
const IN_VIEW_RATIO = 0.5;

function isNear(state: GameState, specializationId: SpecializationId): boolean {
  const [first] = calculateSpecializationProgress(state, specializationId);
  return first !== undefined && first.ratio >= IN_VIEW_RATIO;
}

function isKnown(state: GameState, specializationId: SpecializationId, foundIds: readonly SpecializationId[]): boolean {
  return foundIds.includes(specializationId) || isSpecializationUnlocked(state, specializationId);
}

export function isSpecializationInView(state: GameState, specializationId: SpecializationId, foundIds: readonly SpecializationId[]): boolean {
  const isShown = isNear(state, specializationId) || isKnown(state, specializationId, foundIds);
  return isSpecializationOpen(state, specializationId) && isShown;
}

/** This era's specializations still possible for the site, nearest first: the in-view cards and the alternatives. */
export function listOpenSpecializations(state: GameState): readonly SpecializationId[] {
  const open = TREE_IDS.filter((id) => isSpecializationOpen(state, id));
  const nearness = (id: SpecializationId): number => calculateSpecializationProgress(state, id).reduce((sum, condition) => sum + condition.ratio, 0);
  return [...open].sort((a, b) => nearness(b) - nearness(a));
}

export function canChooseSpecialization(state: GameState, specializationId: SpecializationId): boolean {
  return isSpecializationOpen(state, specializationId) && isSpecializationUnlocked(state, specializationId);
}

/** Its sacrifice, kept: the feature it switched off stays off, the ads stay few. */
function applyRestriction(state: GameState, definition: SpecializationDefinition): GameState {
  const { restriction } = definition;
  if (restriction === null) return state;
  return restriction.kind === 'switched-off'
    ? { ...state, switchedOffFeatureIds: [...new Set([...state.switchedOffFeatureIds, restriction.featureId])] }
    : { ...state, adCount: Math.min(state.adCount, restriction.count) };
}

/** Becomes it, for good, at once. Free: the price was getting here. */
export function chooseSpecialization(state: GameState, specializationId: SpecializationId): GameStep {
  if (!canChooseSpecialization(state, specializationId)) return { state, events: [] };
  const definition = SPECIALIZATIONS_BY_ID[specializationId];
  const chosen = applyRestriction({ ...state, specializationIds: [...state.specializationIds, specializationId] }, definition);
  return { state: chosen, events: [{ kind: 'milestone', message: `Your site is now ${describeArticle(definition)}. ${definition.money}` }] };
}

function describeArticle(definition: SpecializationDefinition): string {
  const name = definition.name.toLowerCase();
  return /^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`;
}

/** Later specializations a choice would open: the ones it's a parent of. */
export function listOpenedBy(specializationId: SpecializationId): readonly SpecializationId[] {
  return TREE_IDS.filter((id) => SPECIALIZATIONS_BY_ID[id].parents.includes(specializationId));
}

/**
 * Later specializations a choice would put out of reach: every parent they could have is in this era (and so not
 * this one, once you've chosen) and none is on the site already. Serial founder keeps everything in reach.
 */
export function listOutOfReach(state: GameState, specializationId: SpecializationId): readonly SpecializationId[] {
  const eraId = SPECIALIZATIONS_BY_ID[specializationId].eraId;
  const isGone = (parent: SpecializationId): boolean => SPECIALIZATIONS_BY_ID[parent].eraId === eraId && parent !== specializationId;
  const isClosed = (id: SpecializationId): boolean => {
    const { parents } = SPECIALIZATIONS_BY_ID[id];
    return parents.length > 0 && parents.every((parent) => isGone(parent) || isLaterUnreachable(state, parent, eraId)) && !hasLineage(state, id);
  };
  if (hasSerialFounder(state)) return [];
  return TREE_IDS.filter((id) => eraIndex(SPECIALIZATIONS_BY_ID[id].eraId) > eraIndex(eraId) && isClosed(id));
}

/** A parent from an earlier era that the site doesn't have can't be had any more. */
function isLaterUnreachable(state: GameState, parent: SpecializationId, eraId: EraId): boolean {
  return eraIndex(SPECIALIZATIONS_BY_ID[parent].eraId) < eraIndex(eraId) && !state.specializationIds.includes(parent);
}

// ---------- What the site's specializations do ----------

/** This era's plan of the newest specialization: its focus and its money. Null for a homepage, before 2005, or in the classic game. */
function findPlanIn(specializationId: SpecializationId, eraId: EraId): SpecializationEraPlan | null {
  return isSpecializedEra(eraId) ? SPECIALIZATIONS_BY_ID[specializationId].eras[eraId] ?? null : null;
}

export function findSpecializationPlan(state: GameState): SpecializationEraPlan | null {
  const current = findCurrentSpecialization(state);
  const isShaped = areSpecializationsOn(state) && current !== 'homepage';
  return isShaped ? findPlanIn(current, currentBaseEra(state)) : null;
}

/** The newest specialization's money in full, and a little from each older one. */
export function listSpecializationEffects(state: GameState): readonly UpgradeEffect[] {
  const plan = findSpecializationPlan(state);
  const older = state.specializationIds.slice(0, -1).flatMap((id) => SPECIALIZATIONS_BY_ID[id].legacy);
  return plan === null ? [] : [...plan.effects, ...older];
}

function withFocus(requirement: EraGateRequirement, plan: SpecializationEraPlan): EraGateRequirement {
  return { ...requirement, featureId: plan.focus, target: plan.level, label: `${FEATURES_BY_ID[plan.focus].name} level ${plan.level}` };
}

function focusRequirement(requirement: EraGateRequirement, plan: SpecializationEraPlan): EraGateRequirement {
  return requirement.kind === 'feature-level' ? withFocus(requirement, plan) : requirement;
}

/** The era's checklist, with its feature item swapped for the newest specialization's focus. A homepage keeps the era's own. */
export function listGateRequirements(state: GameState): readonly EraGateRequirement[] {
  const requirements = ERAS_BY_ID[state.eraId].gateRequirements;
  const plan = findSpecializationPlan(state);
  return plan === null ? requirements : requirements.map((requirement) => focusRequirement(requirement, plan));
}

// ---------- Lasting restrictions ----------

/** A specialization on the site keeps this feature switched off. */
function findLockedOffFeature(specializationId: SpecializationId): FeatureId | null {
  const { restriction } = SPECIALIZATIONS_BY_ID[specializationId];
  return restriction?.kind === 'switched-off' ? restriction.featureId : null;
}

export function isFeatureLockedOff(state: GameState, featureId: FeatureId): boolean {
  return state.specializationIds.some((id) => findLockedOffFeature(id) === featureId);
}

function findAdCap(specializationId: SpecializationId): readonly number[] {
  const { restriction } = SPECIALIZATIONS_BY_ID[specializationId];
  return restriction?.kind === 'max-ads' ? [restriction.count] : [];
}

/** The fewest ads any specialization on the site allows, or null for no limit. */
export function findAdLimit(state: GameState): number | null {
  const limits = state.specializationIds.flatMap(findAdCap);
  return limits.length === 0 ? null : Math.min(...limits);
}

/** From the second run, in the test build, every feature can be switched off: the sacrifice some unlocks ask for. */
export function canSwitchAnyFeature(state: GameState): boolean {
  return areSpecializationsOn(state);
}

// ---------- The story ----------

/** "a video site, then a live-streaming site": what the homepage became, in order. */
export function listSpecializationPath(state: GameState): readonly SpecializationId[] {
  return state.specializationIds;
}
