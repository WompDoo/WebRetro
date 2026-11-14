import { ERAS_BY_ID } from './content/eras';
import { getFeatureIdsOfEra } from './content/features';
import { calculateUsualVisitorsPerSecond } from './economy';
import type { EraGateRequirement, GameState, GateCheck, GateRequirementKind } from './types';

type RequirementMeasure = (state: GameState, requirement: EraGateRequirement) => number;

const NOT_STARTED = 0;

function countBuiltFeaturesOfCurrentEra(state: GameState): number {
  return getFeatureIdsOfEra(state.eraId).filter((featureId) => state.featureLevels[featureId] > 0).length;
}

function measureFeatureLevel(state: GameState, requirement: EraGateRequirement): number {
  return requirement.featureId === null ? NOT_STARTED : state.featureLevels[requirement.featureId];
}

const REQUIREMENT_MEASURES: Readonly<Record<GateRequirementKind, RequirementMeasure>> = {
  'era-features-built': (state) => countBuiltFeaturesOfCurrentEra(state),
  'feature-level': measureFeatureLevel,
  'visitors-per-second': (state) => calculateUsualVisitorsPerSecond(state),
  'migration-budget': (state) => state.money,
};

export function calculateGateChecks(state: GameState): readonly GateCheck[] {
  return ERAS_BY_ID[state.eraId].gateRequirements.map((requirement) => {
    const current = REQUIREMENT_MEASURES[requirement.kind](state, requirement);
    return { requirement, current, isMet: current >= requirement.target };
  });
}

export function isEraGateComplete(state: GameState): boolean {
  return calculateGateChecks(state).every((check) => check.isMet);
}

function findUnmetVisitorsCheck(state: GameState): GateCheck | null {
  return calculateGateChecks(state).find((check) => check.requirement.kind === 'visitors-per-second' && !check.isMet) ?? null;
}

/**
 * The visitors goal is out of reach only because of the ads: with one fewer, it would be met. Late in an era the
 * features stop paying back, so traffic levels off; an ad too many can then hold it under the goal for good.
 */
export function isVisitorsGoalBlockedByAds(state: GameState): boolean {
  const check = findUnmetVisitorsCheck(state);
  return check !== null && state.adCount > 0 && calculateUsualVisitorsPerSecond({ ...state, adCount: state.adCount - 1 }) >= check.requirement.target;
}

/** True when everything except the money is done: the player is only saving up. */
export function isOnlySavingForMigration(state: GameState): boolean {
  return calculateGateChecks(state).every((check) => check.isMet || check.requirement.kind === 'migration-budget');
}
