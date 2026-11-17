import { BUFFS_BY_ID } from './content/buffs';
import type { ActiveBuff, BuffId, BuffTarget, CodeInputOutcome, GameState } from './types';

/**
 * Buffs and the typing streak. Pure: state in, state out. A buff multiplies one number (typing, traffic or ad value)
 * for a while; starting one that's already running starts it over, it never stacks with itself.
 */

/**
 * The heat meter: typing without typos fills it, a typo cools it, and so does stopping. Typos are common (12–22% a
 * keystroke, era by era), so one costs two keystrokes' worth, not the streak: steady typing catches fire in 30 to 60
 * seconds, sooner with every upgrade that cuts typos.
 */
export const HEAT_PER_CLEAN_KEYSTROKE = 0.01;
export const HEAT_LOST_PER_TYPO = 0.02;
/** A pause this long and the meter starts to cool: a breath is fine, walking away isn't. */
export const HEAT_IDLE_GRACE_MS = 1_500;
export const HEAT_COOLING_PER_SECOND = 0.15;
const FULL_HEAT = 1;
const NO_HEAT = 0;
const NEUTRAL_FACTOR = 1;
const MS_PER_SECOND = 1_000;

export function findBuff(state: GameState, buffId: BuffId): ActiveBuff | null {
  return state.buffs.find((buff) => buff.id === buffId) ?? null;
}

export function isBuffActive(state: GameState, buffId: BuffId): boolean {
  return findBuff(state, buffId) !== null;
}

export function startBuff(state: GameState, buffId: BuffId): GameState {
  const others = state.buffs.filter((buff) => buff.id !== buffId);
  return { ...state, buffs: [...others, { id: buffId, remainingMs: BUFFS_BY_ID[buffId].durationMs }] };
}

/** Everything the running buffs multiply this number by. */
export function calculateBuffFactor(state: GameState, target: BuffTarget): number {
  return state.buffs.filter((buff) => BUFFS_BY_ID[buff.id].target === target).reduce((factor, buff) => factor * BUFFS_BY_ID[buff.id].factor, NEUTRAL_FACTOR);
}

/** Buffs only run down while you're at the keyboard: an offline catch-up drops them instead. */
export function tickBuffs(state: GameState, deltaMs: number): GameState {
  const ticked = state.buffs.map((buff) => ({ ...buff, remainingMs: buff.remainingMs - deltaMs }));
  return { ...state, buffs: ticked.filter((buff) => buff.remainingMs > 0) };
}

export function withoutBuffs(state: GameState): GameState {
  return { ...state, buffs: [] };
}

const HEAT_CHANGES: Readonly<Record<CodeInputOutcome, number>> = {
  'clean-line': HEAT_PER_CLEAN_KEYSTROKE,
  'bugged-line': -HEAT_LOST_PER_TYPO,
  // Fixing your own typo is neither here nor there.
  'fixed-bug': 0,
};

function clampHeat(heat: number): number {
  return Math.min(FULL_HEAT, Math.max(NO_HEAT, heat));
}

/** A full meter sets you on fire and empties: the next fire is earned from zero. */
function igniteWhenFull(state: GameState): GameState {
  return state.typingHeat >= FULL_HEAT ? { ...startBuff(state, 'on-fire'), typingHeat: NO_HEAT } : state;
}

/** A keystroke warms the meter (a typo cools it). While you're on fire it stays empty: the fire doesn't feed itself. */
export function heatUp(state: GameState, outcome: CodeInputOutcome): GameState {
  if (isBuffActive(state, 'on-fire')) return { ...state, msSinceKeystroke: 0 };
  return igniteWhenFull({ ...state, typingHeat: clampHeat(state.typingHeat + HEAT_CHANGES[outcome]), msSinceKeystroke: 0 });
}

/** Stop typing for more than a breath and the meter cools. */
export function coolDown(state: GameState, deltaMs: number): GameState {
  const idleMs = state.msSinceKeystroke + deltaMs;
  const coolingMs = Math.max(0, idleMs - Math.max(HEAT_IDLE_GRACE_MS, state.msSinceKeystroke));
  return { ...state, msSinceKeystroke: idleMs, typingHeat: clampHeat(state.typingHeat - (coolingMs / MS_PER_SECOND) * HEAT_COOLING_PER_SECOND) };
}
