import { ERA_IDS, ERAS_BY_ID } from './content/eras';
import type { EraId, GameState } from './types';

/**
 * Which eras a run plays, and so what comes next. Every run plays the big eras; a half-era joins from a later run
 * (the 2000 crash from the third), so the chain is read from the run, never stored on an era.
 */

/** Where the goal bar points: the next era, or after the last one, the ending. */
export interface NextEraStep {
  readonly year: number;
  readonly name: string;
  readonly label: string;
}

const THE_END: NextEraStep = { year: 2025, name: 'The end', label: 'Finish the game' };

export function isEraInRun(eraId: EraId, runNumber: number): boolean {
  return runNumber >= ERAS_BY_ID[eraId].fromRun;
}

export function getErasOfRun(runNumber: number): readonly EraId[] {
  return ERA_IDS.filter((eraId) => isEraInRun(eraId, runNumber));
}

/**
 * The test build has no 2000 crash: its first specializations come in 2005, and a detour before them made no sense.
 * Its content still arrives from the third run, folded into 1997 (see isCrashFolded).
 */
const CRASH_ERA_ID: EraId = 'crash-2000';

export function isCrashFolded(state: Pick<GameState, 'edition'>, eraId: EraId): boolean {
  return eraId === CRASH_ERA_ID && state.edition !== 'classic';
}

/** Where content of this era shows in this game: the crash's under 1997 in the test build. */
export function findShownEraId(state: Pick<GameState, 'edition'>, eraId: EraId): EraId {
  return isCrashFolded(state, eraId) ? 'homepage-1997' : eraId;
}

/** The eras this game plays, in order: the run's, without the crash in the test build. */
export function getErasOfGame(state: Pick<GameState, 'edition' | 'runNumber'>): readonly EraId[] {
  return getErasOfRun(state.runNumber).filter((eraId) => !isCrashFolded(state, eraId));
}

/** The era after this one in this run, or null in the last era. */
export function findNextEraId(state: GameState): EraId | null {
  const eras = getErasOfGame(state);
  return eras[eras.indexOf(state.eraId) + 1] ?? null;
}

export function describeNextEra(state: GameState): NextEraStep {
  const nextEraId = findNextEraId(state);
  if (nextEraId === null) return THE_END;
  const next = ERAS_BY_ID[nextEraId];
  return { year: next.year, name: next.name, label: next.relaunchLabel };
}

/** The big era an era belongs to: 2000 is still 1997's web. */
export function getBaseEraId(eraId: EraId): EraId {
  return ERAS_BY_ID[eraId].baseEraId;
}

/** The first run that plays an era nobody had before: the credits announce it. */
export function listErasNewInRun(runNumber: number): readonly EraId[] {
  return ERA_IDS.filter((eraId) => ERAS_BY_ID[eraId].fromRun === runNumber && runNumber > 1);
}
