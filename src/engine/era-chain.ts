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

/** The era after this one in this run, or null in the last era. */
export function findNextEraId(state: GameState): EraId | null {
  const eras = getErasOfRun(state.runNumber);
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
