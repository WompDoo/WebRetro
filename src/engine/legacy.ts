import { PERK_IDS, NO_PERKS } from './content/perks';
import { calculateEraDurationsMs, listEraRecords } from './era-records';
import { createInitialGameState } from './state';
import type { GameState, LegacyState, PerkId } from './types';

/**
 * Prestige: the ending is a relaunch too, and 1997 is the next era. A finished run earns Backlinks, the legacy keeps
 * them, and they buy perks that every later site starts with. Pure functions: the UI saves the legacy on its own.
 */

export const LEGACY_VERSION = 1;
export const EMPTY_LEGACY: LegacyState = { version: LEGACY_VERSION, backlinks: 0, perkLevels: NO_PERKS, finishedRuns: 0 };

/** Visitors below this many orders of magnitude earn nothing: one Backlink for each one past it. */
const VISITOR_MAGNITUDE_THRESHOLD = 10;
/** An era finished faster than this earns a Backlink of its own. */
const FAST_ERA_MS = 45 * 60_000;
const PERK_COST_BASE = 2;

/**
 * What a run is worth: one Backlink for every order of magnitude of lifetime visitors past ten billion, so a run
 * twice as long earns about the same, and one for every era finished in under 45 minutes.
 */
export interface BacklinkSources {
  readonly fromVisitors: number;
  readonly fromFastEras: number;
}

export function calculateBacklinkSources(state: GameState): BacklinkSources {
  const magnitude = Math.floor(Math.log10(Math.max(1, state.lifetimeVisitors))) - VISITOR_MAGNITUDE_THRESHOLD;
  const fastEras = calculateEraDurationsMs(listEraRecords(state)).filter((durationMs) => durationMs < FAST_ERA_MS).length;
  return { fromVisitors: Math.max(0, magnitude), fromFastEras: fastEras };
}

export function calculateBacklinksEarned(state: GameState): number {
  const sources = calculateBacklinkSources(state);
  return sources.fromVisitors + sources.fromFastEras;
}

/** The first run is about the site: the count shows only once a run has been finished. */
export function shouldProjectBacklinks(state: GameState): boolean {
  return state.runNumber > 1 || state.isGameFinished;
}

/** Each level costs twice the one before: 1, 2, 4, 8 Backlinks. */
export function calculatePerkCost(legacy: LegacyState, perkId: PerkId): number {
  return PERK_COST_BASE ** legacy.perkLevels[perkId];
}

export function canBuyPerk(legacy: LegacyState, perkId: PerkId): boolean {
  return legacy.backlinks >= calculatePerkCost(legacy, perkId);
}

export function buyPerk(legacy: LegacyState, perkId: PerkId): LegacyState {
  if (!canBuyPerk(legacy, perkId)) return legacy;
  return { ...legacy, backlinks: legacy.backlinks - calculatePerkCost(legacy, perkId), perkLevels: { ...legacy.perkLevels, [perkId]: legacy.perkLevels[perkId] + 1 } };
}

export interface BankedRun {
  readonly legacy: LegacyState;
  readonly state: GameState;
}

/** A finished run pays its Backlinks into the legacy, once. */
export function bankBacklinks(legacy: LegacyState, state: GameState): BankedRun {
  if (!state.isGameFinished || state.areBacklinksBanked) return { legacy, state };
  const banked: LegacyState = { ...legacy, backlinks: legacy.backlinks + calculateBacklinksEarned(state), finishedRuns: legacy.finishedRuns + 1 };
  return { legacy: banked, state: { ...state, areBacklinksBanked: true } };
}

/** A new site in 1997, with every perk the legacy has. Start over and a new run from the credits both begin here. */
export function startNextRun(legacy: LegacyState, seed: number): GameState {
  return { ...createInitialGameState(seed), runNumber: legacy.finishedRuns + 1, legacyPerkLevels: legacy.perkLevels };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readPerkLevels(value: unknown): Readonly<Record<PerkId, number>> {
  const stored = isRecord(value) ? value : {};
  return Object.fromEntries(PERK_IDS.map((perkId) => [perkId, readCount(stored[perkId])])) as Record<PerkId, number>;
}

/** A saved legacy of this version, or an empty one: a broken save loses perks, never crashes the game. */
export function restoreLegacy(value: unknown): LegacyState {
  if (!isRecord(value) || value['version'] !== LEGACY_VERSION) return EMPTY_LEGACY;
  return { version: LEGACY_VERSION, backlinks: readCount(value['backlinks']), perkLevels: readPerkLevels(value['perkLevels']), finishedRuns: readCount(value['finishedRuns']) };
}
