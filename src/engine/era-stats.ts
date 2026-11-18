import type { EraStats, FeatureId, GameState, InfectionKind } from './types';

/**
 * What an era counts, for specialization unlocks that ask for something done rather than bought: catching fire,
 * riding out a traffic spike, sorting the spam, a stretch without ads. It starts over at every relaunch, since an
 * unlock belongs to its era.
 */
export const EMPTY_ERA_STATS: EraStats = { onFireStarts: 0, spikesRiddenOut: 0, cleanedByKind: {}, adFreeMs: 0, spent: 0, spentByFeature: {} };

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

/** Every purchase counts towards the era's spending. */
export function countSpending(state: GameState, amount: number): GameState {
  return withStats(state, { spent: state.eraStats.spent + amount });
}

/** A feature level's price, also counted as spent on that feature. */
export function countFeatureSpending(state: GameState, featureId: FeatureId, amount: number): GameState {
  const spent = state.eraStats.spentByFeature[featureId] ?? 0;
  return withStats(state, { spentByFeature: { ...state.eraStats.spentByFeature, [featureId]: spent + amount } });
}

/** What share of this era's spending went into a feature. */
export function calculateSpendingShare(state: GameState, featureId: FeatureId): number {
  const spent = state.eraStats.spentByFeature[featureId] ?? 0;
  return state.eraStats.spent > 0 ? spent / state.eraStats.spent : 0;
}

export function countCleanedOf(state: GameState, kind: InfectionKind): number {
  return state.eraStats.cleanedByKind[kind] ?? 0;
}
