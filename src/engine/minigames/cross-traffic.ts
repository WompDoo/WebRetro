import { MS_PER_SECOND } from '../constants';
import { drawRandoms, interpolateRange } from '../random';
import { isMinigameOver } from './status';
import type { MinigameStatus } from './status';

export type CrossMove = 'up' | 'down' | 'left' | 'right';

/** One lane of attack traffic: bots of one length, all moving at the lane's speed, wrapping round. */
export interface TrafficLane {
  /** Cells per millisecond; negative runs leftwards. */
  readonly velocity: number;
  readonly botLength: number;
  /** Each bot's left edge, in cells. Off the board on either side while it wraps round. */
  readonly bots: readonly number[];
}

/**
 * Get your admin connection through a network flooded by a botnet: one hop at a time, across lanes of bot
 * traffic, to the server at the top. A bot in your cell sends you back to your laptop.
 */
export interface CrossTrafficGame {
  readonly columns: number;
  /** Bottom to top. Row 0 is your laptop and the row above the last lane is the server; both are safe. */
  readonly lanes: readonly TrafficLane[];
  readonly column: number;
  readonly row: number;
  readonly crossings: number;
  readonly required: number;
  readonly hits: number;
  readonly status: MinigameStatus;
}

export const CROSS_TRAFFIC_MAX_HITS = 3;
const COLUMNS = 9;
const START_COLUMN = 4;
/** Bots travel this many cells off the board before they wrap, so they slide out and back in. */
const WRAP_MARGIN = 4;
const CYCLE = COLUMNS + WRAP_MARGIN;
const BOTS_PER_LANE = 3;
const BASE_LANES = 3;
const LANES_PER_DIFFICULTY = 1;
const CROSSINGS_PER_DIFFICULTY = 1;
/** Cells per second, before difficulty. */
const SPEED_RANGE: readonly [number, number] = [1.0, 2.0];
const SPEEDUP_PER_DIFFICULTY = 0.15;
const SHORT_BOT = 1;
/** A bot has to cover this much of your cell to count: grazing the edge doesn't. */
const HIT_TOLERANCE = 0.15;
const ROLLS_PER_LANE = 3;

const MOVES: Readonly<Record<CrossMove, readonly [number, number]>> = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };

function wrap(position: number): number {
  return ((((position + WRAP_MARGIN) % CYCLE) + CYCLE) % CYCLE) - WRAP_MARGIN;
}

/** Lanes alternate direction, like traffic does, and about half of them carry two-cell bots. */
function createLane(index: number, rolls: readonly number[], speedup: number): TrafficLane {
  const [speedRoll = 0, lengthRoll = 0, offsetRoll = 0] = rolls;
  const direction = (-1) ** index;
  const spacing = CYCLE / BOTS_PER_LANE;
  return {
    velocity: (direction * interpolateRange(SPEED_RANGE, speedRoll) * speedup) / MS_PER_SECOND,
    botLength: SHORT_BOT + Math.round(lengthRoll),
    bots: Array.from({ length: BOTS_PER_LANE }, (_, bot) => wrap(offsetRoll * spacing + bot * spacing)),
  };
}

export function createCrossTrafficGame(difficulty: number, seed: number): CrossTrafficGame {
  const extraDifficulty = difficulty - 1;
  const laneCount = BASE_LANES + LANES_PER_DIFFICULTY * extraDifficulty;
  const draws = drawRandoms(seed, laneCount * ROLLS_PER_LANE);
  const speedup = 1 + SPEEDUP_PER_DIFFICULTY * extraDifficulty;
  return {
    columns: COLUMNS,
    lanes: Array.from({ length: laneCount }, (_, index) => createLane(index, draws.values.slice(index * ROLLS_PER_LANE), speedup)),
    column: START_COLUMN,
    row: 0,
    crossings: 0,
    required: CROSSINGS_PER_DIFFICULTY * difficulty,
    hits: 0,
    status: 'waiting',
  };
}

export function serverRow(game: CrossTrafficGame): number {
  return game.lanes.length + 1;
}

function overlapsCell(botLeft: number, botLength: number, column: number): boolean {
  return botLeft < column + 1 - HIT_TOLERANCE && botLeft + botLength > column + HIT_TOLERANCE;
}

/** Row 0 and the server row have no lane, so nothing can hit you there. */
export function isCrossTrafficHit(game: CrossTrafficGame): boolean {
  const lane = game.lanes[game.row - 1];
  return lane !== undefined && lane.bots.some((botLeft) => overlapsCell(botLeft, lane.botLength, game.column));
}

function backToStart(game: CrossTrafficGame): CrossTrafficGame {
  return { ...game, column: START_COLUMN, row: 0 };
}

function takeHit(game: CrossTrafficGame): CrossTrafficGame {
  const hits = game.hits + 1;
  return { ...backToStart(game), hits, status: hits >= CROSS_TRAFFIC_MAX_HITS ? 'lost' : 'running' };
}

function settleHit(game: CrossTrafficGame): CrossTrafficGame {
  return isCrossTrafficHit(game) ? takeHit(game) : game;
}

function reachServer(game: CrossTrafficGame): CrossTrafficGame {
  const crossings = game.crossings + 1;
  return { ...backToStart(game), crossings, status: crossings >= game.required ? 'won' : 'running' };
}

function moveLane(lane: TrafficLane, elapsedMs: number): TrafficLane {
  return { ...lane, bots: lane.bots.map((botLeft) => wrap(botLeft + lane.velocity * elapsedMs)) };
}

export function advanceCrossTraffic(game: CrossTrafficGame, elapsedMs: number): CrossTrafficGame {
  if (game.status !== 'running') return game;
  return settleHit({ ...game, lanes: game.lanes.map((lane) => moveLane(lane, elapsedMs)) });
}

function clamp(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, value));
}

/** Where a hop lands decides it: at the server it's a crossing; in a lane, a bot there is a hit. */
function land(game: CrossTrafficGame): CrossTrafficGame {
  return game.row === serverRow(game) ? reachServer(game) : settleHit(game);
}

/** One hop. The first one starts the traffic. Hopping into a bot counts as a hit, same as a bot running into you. */
export function moveCrossTraffic(game: CrossTrafficGame, move: CrossMove): CrossTrafficGame {
  if (isMinigameOver(game.status)) return game;
  const [columnStep, rowStep] = MOVES[move];
  return land({ ...game, status: 'running', column: clamp(game.column + columnStep, game.columns - 1), row: clamp(game.row + rowStep, serverRow(game)) });
}
