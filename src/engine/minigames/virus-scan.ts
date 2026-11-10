import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

/** Click the virus while it peeks out of one of your files. Clicking a clean file counts against you. */
export interface VirusScanGame {
  readonly cellCount: number;
  /** The file the virus is peeking out of, or null while it hides. */
  readonly virusCell: number | null;
  /** Where it last showed up, so it never appears in the same file twice in a row. */
  readonly lastCell: number;
  readonly msUntilChange: number;
  readonly visibleMs: number;
  readonly hits: number;
  readonly required: number;
  readonly wrongClicks: number;
  readonly status: MinigameStatus;
  readonly randomSeed: number;
}

const CELL_COUNT = 9;
const FIRST_HIDE_MS = 700;
const HIDDEN_MS = 350;
const BASE_REQUIRED_HITS = 3;
const HITS_PER_DIFFICULTY = 2;
const BASE_VISIBLE_MS = 1_100;
const VISIBLE_MS_PER_DIFFICULTY = 200;
const SINGLE_ROLL = 1;
export const VIRUS_SCAN_MAX_WRONG_CLICKS = 3;

export function createVirusScanGame(difficulty: number, seed: number): VirusScanGame {
  const extraDifficulty = difficulty - 1;
  return {
    cellCount: CELL_COUNT,
    virusCell: null,
    lastCell: 0,
    msUntilChange: FIRST_HIDE_MS,
    visibleMs: BASE_VISIBLE_MS - VISIBLE_MS_PER_DIFFICULTY * extraDifficulty,
    hits: 0,
    required: BASE_REQUIRED_HITS + HITS_PER_DIFFICULTY * extraDifficulty,
    wrongClicks: 0,
    status: 'running',
    randomSeed: seed,
  };
}

function showVirus(game: VirusScanGame): VirusScanGame {
  const draws = drawRandoms(game.randomSeed, SINGLE_ROLL);
  const step = 1 + Math.floor((draws.values[0] ?? 0) * (game.cellCount - 1));
  const cell = (game.lastCell + step) % game.cellCount;
  return { ...game, virusCell: cell, lastCell: cell, msUntilChange: game.visibleMs, randomSeed: draws.nextSeed };
}

function hideVirus(game: VirusScanGame): VirusScanGame {
  return { ...game, virusCell: null, msUntilChange: HIDDEN_MS };
}

/** Flips between hiding and showing, keeping any time that ran past the flip. */
function carryOver(game: VirusScanGame): VirusScanGame {
  const overshootMs = -game.msUntilChange;
  const flipped = game.virusCell === null ? showVirus(game) : hideVirus(game);
  return { ...flipped, msUntilChange: flipped.msUntilChange - overshootMs };
}

function settle(game: VirusScanGame): VirusScanGame {
  return game.msUntilChange > 0 ? game : settle(carryOver(game));
}

export function advanceVirusScan(game: VirusScanGame, elapsedMs: number): VirusScanGame {
  return game.status === 'running' ? settle({ ...game, msUntilChange: game.msUntilChange - elapsedMs }) : game;
}

function hitVirus(game: VirusScanGame): VirusScanGame {
  const hits = game.hits + 1;
  return { ...game, hits, virusCell: null, msUntilChange: HIDDEN_MS, status: hits >= game.required ? 'won' : 'running' };
}

function clickCleanFile(game: VirusScanGame): VirusScanGame {
  const wrongClicks = game.wrongClicks + 1;
  return { ...game, wrongClicks, status: wrongClicks >= VIRUS_SCAN_MAX_WRONG_CLICKS ? 'lost' : 'running' };
}

/** A click on the virus is a hit. A click on anything else, even an empty moment, is a wrong click. */
export function clickVirusScanCell(game: VirusScanGame, cell: number): VirusScanGame {
  if (game.status !== 'running') return game;
  return cell === game.virusCell ? hitVirus(game) : clickCleanFile(game);
}
