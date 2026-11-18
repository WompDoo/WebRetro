import { NO_PERKS, PERK_IDS, PERKS_BY_ID } from './content/perks';
import { listEraDurations, listEraRecords } from './era-records';
import type { EraDuration } from './era-records';
import { applyEraStartPerks, OLD_SAVINGS_PER_LEVEL } from './era-start';
import { createInitialGameState } from './state';
import { ERAS_BY_ID } from './content/eras';
import { SPECIALIZATION_IDS } from './content/specializations';
import type { GameState, LegacyState, PerkId, SpecializationId } from './types';

/**
 * Prestige: the ending is a relaunch too, and 1997 is the next era. A finished run earns Backlinks, the legacy keeps
 * them, and they buy perks that every later site starts with. Pure functions: the UI saves the legacy on its own.
 */

export const LEGACY_VERSION = 1;
export const EMPTY_LEGACY: LegacyState = { version: LEGACY_VERSION, backlinks: 0, perkLevels: NO_PERKS, finishedRuns: 0, foundSpecializationIds: [] };

/** Visitors below this many orders of magnitude earn nothing: one Backlink for each one past it. */
const VISITOR_MAGNITUDE_THRESHOLD = 10;
const MS_PER_MINUTE = 60_000;
const PERK_COST_BASE = 2;

/**
 * What a run is worth: one Backlink for every order of magnitude of lifetime visitors past ten billion, so a run
 * twice as long earns about the same, and one for every era finished fast: under 45 minutes, or 20 for a half-era.
 */
export interface BacklinkSources {
  readonly fromVisitors: number;
  readonly fromFastEras: number;
}

/** Under the era's own mark: 45 minutes for a big era, 20 for a half-era. */
function isFastFinish(duration: EraDuration): boolean {
  return duration.durationMs < ERAS_BY_ID[duration.eraId].fastFinishMinutes * MS_PER_MINUTE;
}

export function calculateBacklinkSources(state: GameState): BacklinkSources {
  const magnitude = Math.floor(Math.log10(Math.max(1, state.lifetimeVisitors))) - VISITOR_MAGNITUDE_THRESHOLD;
  const fastEras = listEraDurations(listEraRecords(state)).filter(isFastFinish).length;
  return { fromVisitors: Math.max(0, magnitude), fromFastEras: fastEras };
}

/**
 * The test build opens one system per site: the second gets specializations, the third Backlinks and perks, paid in
 * at the end of the second. The classic game pays them from the first.
 */
const TEST_BUILD_BACKLINKS_FROM_RUN = 2;

export function areBacklinksOn(state: Pick<GameState, 'edition' | 'runNumber'>): boolean {
  return state.edition === 'classic' || state.runNumber >= TEST_BUILD_BACKLINKS_FROM_RUN;
}

export function calculateBacklinksEarned(state: GameState): number {
  const sources = calculateBacklinkSources(state);
  return areBacklinksOn(state) ? sources.fromVisitors + sources.fromFastEras : 0;
}

/** The first run is about the site: the count shows only once a run has been finished, and Backlinks are on. */
export function shouldProjectBacklinks(state: GameState): boolean {
  return areBacklinksOn(state) && (state.runNumber > 1 || state.isGameFinished);
}

/** The perks this game offers: Serial founder only in the test build, where the specialization tree is. */
export function listPerksOf(state: Pick<GameState, 'edition'>): readonly PerkId[] {
  return PERK_IDS.filter((perkId) => state.edition !== 'classic' || PERKS_BY_ID[perkId].isTestBuildOnly !== true);
}

/** Each level costs twice the one before: 1, 2, 4, 8 Backlinks. */
export function calculatePerkCost(legacy: LegacyState, perkId: PerkId): number {
  return PERKS_BY_ID[perkId].price ?? PERK_COST_BASE ** legacy.perkLevels[perkId];
}

/** Specializations unlocked this run join the collection, for good: their cards show from the start next time. */
export function recordFoundSpecializations(legacy: LegacyState, unlockedIds: readonly SpecializationId[]): LegacyState {
  const newlyFound = unlockedIds.filter((id) => !legacy.foundSpecializationIds.includes(id));
  return newlyFound.length === 0 ? legacy : { ...legacy, foundSpecializationIds: [...legacy.foundSpecializationIds, ...newlyFound] };
}

function readFoundSpecializations(value: unknown): readonly SpecializationId[] {
  return Array.isArray(value) ? SPECIALIZATION_IDS.filter((id) => value.includes(id)) : [];
}

export function isPerkMaxed(legacy: LegacyState, perkId: PerkId): boolean {
  return legacy.perkLevels[perkId] >= PERKS_BY_ID[perkId].maxLevel;
}

export function canBuyPerk(legacy: LegacyState, perkId: PerkId): boolean {
  return !isPerkMaxed(legacy, perkId) && legacy.backlinks >= calculatePerkCost(legacy, perkId);
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
  const fresh: GameState = { ...createInitialGameState(seed), runNumber: legacy.finishedRuns + 1, legacyPerkLevels: legacy.perkLevels };
  return applyEraStartPerks({ ...fresh, money: legacy.perkLevels['old-savings'] * OLD_SAVINGS_PER_LEVEL });
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
  return {
    version: LEGACY_VERSION,
    backlinks: readCount(value['backlinks']),
    perkLevels: readPerkLevels(value['perkLevels']),
    finishedRuns: readCount(value['finishedRuns']),
    foundSpecializationIds: readFoundSpecializations(value['foundSpecializationIds']),
  };
}
