import { MS_PER_SECOND } from './constants';
import { calculateNetRevenuePerSecond, calculateVisitorsPerSecond, creditFeatureEarnings } from './economy';
import { advanceHazards } from './hazards';
import { checkMilestones } from './milestones';
import type { GameState, GameStep, SimulationMode } from './types';

function applyProduction(state: GameState, deltaMs: number): GameState {
  const seconds = deltaMs / MS_PER_SECOND;
  const earned = calculateNetRevenuePerSecond(state) * seconds;
  return {
    ...state,
    money: state.money + earned,
    lifetimeEarnings: state.lifetimeEarnings + earned,
    featureEarnings: creditFeatureEarnings(state, earned),
    lifetimeVisitors: state.lifetimeVisitors + calculateVisitorsPerSecond(state) * seconds,
  };
}

function advanceLiveSystems(state: GameState, deltaMs: number): GameStep {
  const hazards = advanceHazards(state, deltaMs);
  return { state: { ...hazards.state, playTimeMs: hazards.state.playTimeMs + deltaMs }, events: hazards.events };
}

/**
 * Advances the game by elapsed wall-clock time, never by counting ticks, so throttled
 * background tabs and closed tabs both catch up correctly. Offline mode is production only.
 */
export function advanceSimulation(state: GameState, deltaMs: number, mode: SimulationMode): GameStep {
  const produced = applyProduction(state, deltaMs);
  const advanced = mode === 'live' ? advanceLiveSystems(produced, deltaMs) : { state: produced, events: [] };
  const milestones = checkMilestones(advanced.state);
  return { state: milestones.state, events: [...advanced.events, ...milestones.events] };
}
