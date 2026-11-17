import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

/**
 * A merge conflict: your version of a few lines against a teammate's, a handful of times, and the clock already
 * running. Each block wants one answer: keep yours, keep theirs, or keep both. A wrong pick costs time, not the game;
 * the clock is what loses it. Which answer is right is in the code: a typo, a security hole, two separate additions.
 */
export type ConflictPick = 'ours' | 'theirs' | 'both';

export const CONFLICT_PICKS: readonly ConflictPick[] = ['ours', 'theirs', 'both'];

export interface MergeConflict {
  readonly answers: readonly ConflictPick[];
  readonly resolved: readonly boolean[];
  readonly elapsedMs: number;
  readonly limitMs: number;
  readonly mistakes: number;
}

/** Time to take in the file, and then a few seconds per block to read its two notes and choose. */
const BASE_MS = 4_000;
const MS_PER_BLOCK = 5_000;
/** A wrong pick: you merged it, the build broke, you undid it. */
export const WRONG_PICK_PENALTY_MS = 2_500;

export function startMergeConflict(answers: readonly ConflictPick[]): MergeConflict {
  return { answers, resolved: answers.map(() => false), elapsedMs: 0, limitMs: BASE_MS + answers.length * MS_PER_BLOCK, mistakes: 0 };
}

function countResolved(game: MergeConflict): number {
  return game.resolved.filter((isResolved) => isResolved).length;
}

/** The clock runs from the moment the conflict is on screen: reading it is the game. */
export function mergeConflictStatus(game: MergeConflict): MinigameStatus {
  if (countResolved(game) === game.answers.length) return 'won';
  return game.elapsedMs >= game.limitMs ? 'lost' : 'running';
}

function isOpen(game: MergeConflict): boolean {
  return mergeConflictStatus(game) === 'running';
}

export function tickMergeConflict(game: MergeConflict, elapsedMs: number): MergeConflict {
  return isOpen(game) ? { ...game, elapsedMs: Math.min(game.limitMs, game.elapsedMs + elapsedMs) } : game;
}

function resolveBlock(game: MergeConflict, blockIndex: number): MergeConflict {
  return { ...game, resolved: game.resolved.map((isResolved, index) => isResolved || index === blockIndex) };
}

function penalize(game: MergeConflict): MergeConflict {
  return { ...game, elapsedMs: Math.min(game.limitMs, game.elapsedMs + WRONG_PICK_PENALTY_MS), mistakes: game.mistakes + 1 };
}

/** The right pick resolves its block; a wrong one costs time. A resolved block, or a finished game, ignores picks. */
export function pickResolution(game: MergeConflict, blockIndex: number, pick: ConflictPick): MergeConflict {
  const isPickable = isOpen(game) && game.resolved[blockIndex] === false;
  if (!isPickable) return game;
  return game.answers[blockIndex] === pick ? resolveBlock(game, blockIndex) : penalize(game);
}

/** The block the keyboard's 1, 2 and 3 answer: the first one still open. */
export function findFirstOpenBlock(game: MergeConflict): number {
  return game.resolved.indexOf(false);
}

/** Which of a pool's blocks this conflict shows: a few different ones, in a different order every time. */
export function pickConflictBlocks(poolSize: number, count: number, seed: number): readonly number[] {
  const rolls = drawRandoms(seed, poolSize).values;
  return Array.from({ length: poolSize }, (_, index) => index)
    .sort((first, second) => (rolls[first] ?? 0) - (rolls[second] ?? 0))
    .slice(0, count);
}
