import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

/**
 * Code entry, stratagem style: a code shows as keycaps, you type it before the clock runs out, and one wrong key
 * starts you over. Each offer brings a fresh code in its era's format (a modem number in 1997, a product key in 2005),
 * so it's a reading test, not a memory one. Spaces and dashes are only there to read it by: you type the letters and digits.
 */

export interface CodeEntry {
  readonly code: string;
  /** How many of the code's letters and digits are typed, in order. */
  readonly typed: number;
  readonly elapsedMs: number;
  readonly limitMs: number;
  readonly mistakes: number;
  /** The clock starts on the first key, the way the other minigames start on their first input. */
  readonly hasStarted: boolean;
}

/** Time to read the code, and then a little per key. */
const BASE_MS = 2_500;
const MS_PER_KEY = 650;
const SEPARATORS = /[\s-]/;

/** What has to be typed: the code's letters and digits, in order, upper case. */
export function listCodeKeys(code: string): readonly string[] {
  return [...code.toUpperCase()].filter((character) => !SEPARATORS.test(character));
}

export function startCodeEntry(code: string): CodeEntry {
  return { code, typed: 0, elapsedMs: 0, limitMs: BASE_MS + listCodeKeys(code).length * MS_PER_KEY, mistakes: 0, hasStarted: false };
}

export function codeEntryStatus(entry: CodeEntry): MinigameStatus {
  if (entry.typed >= listCodeKeys(entry.code).length) return 'won';
  if (entry.elapsedMs >= entry.limitMs) return 'lost';
  return entry.hasStarted ? 'running' : 'waiting';
}

function isOpen(entry: CodeEntry): boolean {
  const status = codeEntryStatus(entry);
  return status === 'waiting' || status === 'running';
}

/** The right key moves you on; any other starts the code over. Case doesn't matter. */
export function typeCodeKey(entry: CodeEntry, key: string): CodeEntry {
  if (!isOpen(entry)) return entry;
  const isRight = listCodeKeys(entry.code)[entry.typed] === key.toUpperCase();
  return isRight ? { ...entry, typed: entry.typed + 1, hasStarted: true } : { ...entry, typed: 0, mistakes: entry.mistakes + 1, hasStarted: true };
}

export function tickCodeEntry(entry: CodeEntry, deltaMs: number): CodeEntry {
  return entry.hasStarted && isOpen(entry) ? { ...entry, elapsedMs: Math.min(entry.limitMs, entry.elapsedMs + deltaMs) } : entry;
}

/**
 * A code pattern's placeholders: # a digit, @ a letter, * either. Characters that read alike (0 and O, 1, I and L,
 * 5 and S) are left out, the way product keys leave them out: the test is your fingers, not your eyes.
 */
const PLACEHOLDER_ALPHABETS: Readonly<Record<string, string>> = {
  '#': '2346789',
  '@': 'ABCDEFGHJKMNPQRTUVWXYZ',
  '*': 'ABCDEFGHJKMNPQRTUVWXYZ2346789',
};

function fillPlaceholder(character: string, roll: number): string {
  const alphabet = PLACEHOLDER_ALPHABETS[character];
  return alphabet === undefined ? character : alphabet.charAt(Math.floor(roll * alphabet.length));
}

/** One of the patterns, its placeholders filled at random. The same seed always makes the same code. */
export function createCodeFromPatterns(patterns: readonly string[], seed: number): string {
  const [pick = 0, ...rolls] = drawRandoms(seed, Math.max(0, ...patterns.map((pattern) => pattern.length)) + 1).values;
  const pattern = patterns[Math.floor(pick * patterns.length)] ?? '';
  return [...pattern].map((character, index) => fillPlaceholder(character, rolls[index] ?? 0)).join('');
}
