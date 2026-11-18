import type { EraStats, GameState, InfectionKind } from './types';

/**
 * What an era counts, for specialization unlocks that ask for something done rather than bought: catching fire,
 * riding out a traffic spike, sorting the spam, a stretch without ads. It starts over at every relaunch, since an
 * unlock belongs to its era.
 */
export const EMPTY_ERA_STATS: EraStats = { onFireStarts: 0, spikesRiddenOut: 0, cleanedByKind: {}, adFreeMs: 0 };

function withStats(state: GameState, stats: Partial<EraStats>): GameState {
  return { ...state, eraStats: { ...state.eraStats, ...stats } };
}

export function countOnFire(state: GameState): GameState {
  return withStats(state, { onFireStarts: state.eraStats.onFireStarts + 1 });
}

export function countSpikeRiddenOut(state: GameState): GameState {
  return withStats(state, { spikesRiddenOut: state.eraStats.spikesRiddenOut + 1 });
}

export function countCleaned(state: GameState, kind: InfectionKind): GameState {
  const cleaned = state.eraStats.cleanedByKind[kind] ?? 0;
  return withStats(state, { cleanedByKind: { ...state.eraStats.cleanedByKind, [kind]: cleaned + 1 } });
}

/** The clock without ads: it runs while there are none and starts over the moment one goes up. */
export function tickAdFree(state: GameState, deltaMs: number): GameState {
  return withStats(state, { adFreeMs: state.adCount === 0 ? state.eraStats.adFreeMs + deltaMs : 0 });
}

export function countCleanedOf(state: GameState, kind: InfectionKind): number {
  return state.eraStats.cleanedByKind[kind] ?? 0;
}
