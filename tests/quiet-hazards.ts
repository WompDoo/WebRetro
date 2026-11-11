import { INITIAL_HAZARD_COUNTDOWNS_MS } from '../src/engine';
import type { HazardKind } from '../src/engine';

/** Far enough away that no hazard ever spawns during a test. */
const NEVER_MS = 9e9;

/** Hazard countdowns for tests that need a quiet game: every hazard kind, so a new one can't sneak in. */
export const QUIET_HAZARDS = Object.fromEntries(Object.keys(INITIAL_HAZARD_COUNTDOWNS_MS).map((kind) => [kind, NEVER_MS])) as Readonly<Record<HazardKind, number>>;
