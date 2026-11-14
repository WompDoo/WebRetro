import { calculateNetRevenuePerSecond, calculateVisitorsPerSecond, getEraIndex } from './economy';
import type { EraId, EraRecord, GameState } from './types';

/**
 * What the site was when it left an era: how it looked, and how it was doing. The ending's archive shows each page
 * again from these, and the credits count from them. Taken at the relaunch, before the new era changes anything.
 */
export function createEraRecord(state: GameState): EraRecord {
  return {
    eraId: state.eraId,
    endedAtPlayTimeMs: state.playTimeMs,
    visitorsPerSecond: calculateVisitorsPerSecond(state),
    revenuePerSecond: calculateNetRevenuePerSecond(state),
    lifetimeEarnings: state.lifetimeEarnings,
    site: {
      featureLevels: state.featureLevels,
      purchasedUpgradeIds: state.purchasedUpgradeIds,
      switchedOffFeatureIds: state.switchedOffFeatureIds,
      ownedDefenseIds: state.ownedDefenseIds,
      enabledDefenseIds: state.enabledDefenseIds,
      adCount: state.adCount,
      hostingTier: state.hostingTier,
      consentBanner: state.consentBanner,
      lifetimeVisitors: state.lifetimeVisitors,
    },
  };
}

/** Recording an era again replaces its record: finishing twice never counts twice. */
export function recordEra(state: GameState): GameState {
  const others = state.eraRecords.filter((record) => record.eraId !== state.eraId);
  return { ...state, eraRecords: [...others, createEraRecord(state)] };
}

/** Oldest first, whatever order they were recorded in. */
export function listEraRecords(state: GameState): readonly EraRecord[] {
  return [...state.eraRecords].sort((first, second) => getEraIndex(first.eraId) - getEraIndex(second.eraId));
}

export function findEraRecord(state: GameState, eraId: EraId): EraRecord | null {
  return state.eraRecords.find((record) => record.eraId === eraId) ?? null;
}

/** How long the player spent in each recorded era: from the previous relaunch (or the start) to this one. */
export function calculateEraDurationsMs(records: readonly EraRecord[]): readonly number[] {
  return records.map((record, index) => record.endedAtPlayTimeMs - (records[index - 1]?.endedAtPlayTimeMs ?? 0));
}
