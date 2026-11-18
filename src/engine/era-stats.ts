import type { EraStats, FeatureId, GameState, InfectionKind } from './types';

/**
 * What an era counts, for specialization unlocks that ask for something done rather than bought: catching fire,
 * riding out a traffic spike, sorting the spam, a stretch without ads. It starts over at every relaunch, since an
 * unlock belongs to its era.
 */
export const EMPTY_ERA_STATS: EraStats = { onFireStarts: 0, spikesRiddenOut: 0, cleanedByKind: {}, adFreeMs: 0, spentByFeature: {}, elapsedMs: 0, startBaseVisitors: 0 };

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

/** The era's clock runs offline too: the long tail grows while you sleep. */
export function tickEraClock(state: GameState, deltaMs: number): GameState {
  return withStats(state, { elapsedMs: state.eraStats.elapsedMs + deltaMs });
}

/** A new era starts its stats from zero, remembering how big the site was as it began. */
export function startEraStats(state: GameState, startBaseVisitors: number): GameState {
  return { ...state, eraStats: { ...EMPTY_ERA_STATS, startBaseVisitors } };
}

/** A feature level's price, also counted as spent on that feature. */
export function countFeatureSpending(state: GameState, featureId: FeatureId, amount: number): GameState {
  const spent = state.eraStats.spentByFeature[featureId] ?? 0;
  return withStats(state, { spentByFeature: { ...state.eraStats.spentByFeature, [featureId]: spent + amount } });
}

/**
 * What share of this era's feature spending went into one feature. Only features count: a hosting upgrade or a skill
 * is something every site needs, and shouldn't spoil a lean. What you build is the choice.
 */
export function calculateSpendingShare(state: GameState, featureId: FeatureId): number {
  const total = Object.values(state.eraStats.spentByFeature).reduce((sum, spent) => sum + spent, 0);
  return total > 0 ? (state.eraStats.spentByFeature[featureId] ?? 0) / total : 0;
}

export function countCleanedOf(state: GameState, kind: InfectionKind): number {
  return state.eraStats.cleanedByKind[kind] ?? 0;
}
