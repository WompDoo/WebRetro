import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

/**
 * One line of the failing build: a package in package.json, or a line of code the upgrade broke. The words live
 * in the UI, which has them for each framework; the engine only knows broken from working.
 */
export interface BuildLine {
  readonly isBroken: boolean;
  /** Which line of its kind this is. Distinct within a game, so no line shows up twice. */
  readonly slot: number;
  readonly isRemoved: boolean;
}

/**
 * Spot the bad lines: a typosquat in the npm tree, an import the last major version removed, a plugin nobody
 * maintains. Remove every broken line before the deploy goes out. Removing one that worked costs time.
 */
export interface FixBuildGame {
  readonly lines: readonly BuildLine[];
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly mistakes: number;
  readonly status: MinigameStatus;
}

const BASE_BROKEN_LINES = 2;
const BASE_WORKING_LINES = 4;
/** Each level adds a broken line and a working one to read through. */
const LINES_PER_DIFFICULTY = 1;
const BASE_DURATION_MS = 15_000;
const DURATION_MS_PER_DIFFICULTY = 3_000;
/**
 * Removing a line that worked: putting it back costs this much of the clock. Enough that clicking every working
 * line runs out the clock at every level, so reading beats clicking everything.
 */
export const FIX_BUILD_MISTAKE_PENALTY_MS = 4_000;
/** Shifts which lines of each kind show, so the same few don't come up every time. */
const SLOT_OFFSET_RANGE = 1_000;
/** One roll shifts the broken lines, one the working lines; the rest shuffle the order. */
const OFFSET_ROLLS = 2;

function createLines(isBroken: boolean, count: number, offsetRoll: number): readonly BuildLine[] {
  const offset = Math.floor(offsetRoll * SLOT_OFFSET_RANGE);
  return Array.from({ length: count }, (_, ordinal) => ({ isBroken, slot: offset + ordinal, isRemoved: false }));
}

function shuffle(lines: readonly BuildLine[], rolls: readonly number[]): readonly BuildLine[] {
  return lines
    .map((line, index) => ({ line, roll: rolls[index] ?? index }))
    .sort((first, second) => first.roll - second.roll)
    .map(({ line }) => line);
}

/** Starts waiting, with the lines hidden: reading them is the game, so the clock starts when they show. */
export function createFixBuildGame(difficulty: number, seed: number): FixBuildGame {
  const extraDifficulty = difficulty - 1;
  const brokenCount = BASE_BROKEN_LINES + LINES_PER_DIFFICULTY * extraDifficulty;
  const workingCount = BASE_WORKING_LINES + LINES_PER_DIFFICULTY * extraDifficulty;
  const [brokenOffsetRoll = 0, workingOffsetRoll = 0, ...orderRolls] = drawRandoms(seed, OFFSET_ROLLS + brokenCount + workingCount).values;
  const lines = [...createLines(true, brokenCount, brokenOffsetRoll), ...createLines(false, workingCount, workingOffsetRoll)];
  return {
    lines: shuffle(lines, orderRolls),
    elapsedMs: 0,
    durationMs: BASE_DURATION_MS + DURATION_MS_PER_DIFFICULTY * extraDifficulty,
    mistakes: 0,
    status: 'waiting',
  };
}

export function countBrokenLinesLeft(game: FixBuildGame): number {
  return game.lines.filter((line) => line.isBroken && !line.isRemoved).length;
}

/** Every broken line gone wins, even on the tick the deploy would have gone out. */
function judge(game: FixBuildGame): MinigameStatus {
  const outcomes: readonly (readonly [boolean, MinigameStatus])[] = [
    [countBrokenLinesLeft(game) === 0, 'won'],
    [game.elapsedMs >= game.durationMs, 'lost'],
  ];
  return outcomes.find(([applies]) => applies)?.[1] ?? 'running';
}

/** Runs the build: the lines show and the clock starts. */
export function startFixBuild(game: FixBuildGame): FixBuildGame {
  return game.status === 'waiting' ? { ...game, status: 'running' } : game;
}

export function advanceFixBuild(game: FixBuildGame, elapsedMs: number): FixBuildGame {
  if (game.status !== 'running') return game;
  const advanced = { ...game, elapsedMs: game.elapsedMs + elapsedMs };
  return { ...advanced, status: judge(advanced) };
}

function isRemovable(game: FixBuildGame, line: BuildLine | undefined): line is BuildLine {
  return line !== undefined && game.status === 'running' && !line.isRemoved;
}

function markRemoved(game: FixBuildGame, index: number): FixBuildGame {
  return { ...game, lines: game.lines.map((line, position) => (position === index ? { ...line, isRemoved: true } : line)) };
}

/** A working line stays: you put it back, and that took time. */
function recordMistake(game: FixBuildGame): FixBuildGame {
  return { ...game, mistakes: game.mistakes + 1, elapsedMs: game.elapsedMs + FIX_BUILD_MISTAKE_PENALTY_MS };
}

/** Removes the line if it was broken. Removing one that worked costs time instead. */
export function removeBuildLine(game: FixBuildGame, index: number): FixBuildGame {
  const line = game.lines[index];
  if (!isRemovable(game, line)) return game;
  const removed = line.isBroken ? markRemoved(game, index) : recordMistake(game);
  return { ...removed, status: judge(removed) };
}
