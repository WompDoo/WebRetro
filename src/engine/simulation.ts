import { coolDown, tickBuffs, withoutBuffs } from './buffs';
import { MS_PER_SECOND } from './constants';
import { calculateHiredTypingPerSecond, calculateNetRevenuePerSecond, calculateVisitorsPerSecond, creditFeatureEarnings } from './economy';
import { advanceHazards } from './hazards';
import { advanceOpportunities } from './opportunities';
import { checkMilestones } from './milestones';
import type { GameState, GameStep, SimulationMode } from './types';

/** The site's revenue, and what hired help types: both keep coming while you're away. Only the site's is the features'. */
function applyProduction(state: GameState, deltaMs: number): GameState {
  const seconds = deltaMs / MS_PER_SECOND;
  const siteEarned = calculateNetRevenuePerSecond(state) * seconds;
  const earned = siteEarned + calculateHiredTypingPerSecond(state) * seconds;
  return {
    ...state,
    money: state.money + earned,
    lifetimeEarnings: state.lifetimeEarnings + earned,
    featureEarnings: creditFeatureEarnings(state, siteEarned),
    lifetimeVisitors: state.lifetimeVisitors + calculateVisitorsPerSecond(state) * seconds,
  };
}

function advanceLiveSystems(state: GameState, deltaMs: number): GameStep {
  const hazards = advanceHazards(coolDown(tickBuffs(state, deltaMs), deltaMs), deltaMs);
  const offers = advanceOpportunities(hazards.state, deltaMs);
  return { state: { ...offers.state, playTimeMs: offers.state.playTimeMs + deltaMs }, events: [...hazards.events, ...offers.events] };
}

/** Buffs are for the player at the keyboard: an offline catch-up runs without them, or one buff would pay for hours. */
function prepare(state: GameState, mode: SimulationMode): GameState {
  return mode === 'live' ? state : withoutBuffs(state);
}

/**
 * Advances the game by elapsed wall-clock time, never by counting ticks, so throttled
 * background tabs and closed tabs both catch up correctly. Offline mode is production only.
 */
export function advanceSimulation(state: GameState, deltaMs: number, mode: SimulationMode): GameStep {
  const produced = applyProduction(prepare(state, mode), deltaMs);
  const advanced = mode === 'live' ? advanceLiveSystems(produced, deltaMs) : { state: produced, events: [] };
  const milestones = checkMilestones(advanced.state);
  return { state: milestones.state, events: [...advanced.events, ...milestones.events] };
}
