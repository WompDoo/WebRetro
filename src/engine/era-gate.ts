import { ERAS_BY_ID } from './content/eras';
import { getFeatureIdsOfEra } from './content/features';
import { calculateVisitorsPerSecond } from './economy';
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
  'visitors-per-second': (state) => calculateVisitorsPerSecond(state),
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

/** True when everything except the money is done: the player is only saving up. */
export function isOnlySavingForMigration(state: GameState): boolean {
  return calculateGateChecks(state).every((check) => check.isMet || check.requirement.kind === 'migration-budget');
}
