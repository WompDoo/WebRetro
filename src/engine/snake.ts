import { drawRandoms } from './random';

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';
export type SnakeStatus = 'waiting' | 'running' | 'won' | 'crashed';

export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export interface SnakeGame {
  readonly columns: number;
  readonly rows: number;
  /** Head first. */
  readonly body: readonly GridPoint[];
  readonly direction: SnakeDirection;
  /** Turns pressed faster than the snake moves, applied one per step. */
  readonly queuedTurns: readonly SnakeDirection[];
  readonly food: GridPoint;
  readonly eaten: number;
  /** Locked when the attempt starts, so a virus can't grow in the middle of a run. */
  readonly required: number;
  readonly status: SnakeStatus;
  readonly randomSeed: number;
}

interface FoodPlacement {
  readonly food: GridPoint;
  readonly nextSeed: number;
}

const STARTING_LENGTH = 3;
const MAX_QUEUED_TURNS = 2;
const SINGLE_ROLL = 1;
const ORIGIN: GridPoint = { x: 0, y: 0 };

const STEPS: Readonly<Record<SnakeDirection, GridPoint>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES: Readonly<Record<SnakeDirection, SnakeDirection>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function isSamePoint(first: GridPoint, second: GridPoint): boolean {
  return first.x === second.x && first.y === second.y;
}

function isOccupied(body: readonly GridPoint[], point: GridPoint): boolean {
  return body.some((segment) => isSamePoint(segment, point));
}

function listFreeCells(body: readonly GridPoint[], columns: number, rows: number): readonly GridPoint[] {
  return Array.from({ length: columns * rows }, (_, index) => ({ x: index % columns, y: Math.floor(index / columns) })).filter(
    (cell) => !isOccupied(body, cell),
  );
}

function placeFood(body: readonly GridPoint[], columns: number, rows: number, seed: number): FoodPlacement {
  const freeCells = listFreeCells(body, columns, rows);
  const draws = drawRandoms(seed, SINGLE_ROLL);
  const food = freeCells[Math.floor((draws.values[0] ?? 0) * freeCells.length)] ?? ORIGIN;
  return { food, nextSeed: draws.nextSeed };
}

export function createSnakeGame(columns: number, rows: number, required: number, seed: number): SnakeGame {
  const head = { x: Math.floor(columns / 2), y: Math.floor(rows / 2) };
  const body = Array.from({ length: STARTING_LENGTH }, (_, index) => ({ x: head.x - index, y: head.y }));
  const placement = placeFood(body, columns, rows, seed);
  return {
    columns,
    rows,
    body,
    direction: 'right',
    queuedTurns: [],
    food: placement.food,
    eaten: 0,
    required,
    status: 'waiting',
    randomSeed: placement.nextSeed,
  };
}

export function isSnakeFinished(game: SnakeGame): boolean {
  return game.status === 'won' || game.status === 'crashed';
}

function plannedDirection(game: SnakeGame): SnakeDirection {
  return game.queuedTurns[game.queuedTurns.length - 1] ?? game.direction;
}

function queueTurn(game: SnakeGame, direction: SnakeDirection): SnakeGame {
  const planned = plannedDirection(game);
  const isUsefulTurn =
    direction !== planned && direction !== OPPOSITES[planned] && game.queuedTurns.length < MAX_QUEUED_TURNS;
  return isUsefulTurn ? { ...game, queuedTurns: [...game.queuedTurns, direction] } : game;
}

/** Any direction except straight back into the body starts the game. */
export function steerSnake(game: SnakeGame, direction: SnakeDirection): SnakeGame {
  if (isSnakeFinished(game)) return game;
  const canStart = game.status === 'waiting' && direction !== OPPOSITES[game.direction];
  const started: SnakeGame = canStart ? { ...game, status: 'running' } : game;
  return queueTurn(started, direction);
}

function hitsWall(game: SnakeGame, point: GridPoint): boolean {
  return point.x < 0 || point.y < 0 || point.x >= game.columns || point.y >= game.rows;
}

function hitsOwnBody(game: SnakeGame, point: GridPoint): boolean {
  // The tail moves out of the way on this step, so it doesn't count.
  return isOccupied(game.body.slice(0, -1), point);
}

function eatFood(game: SnakeGame, head: GridPoint): SnakeGame {
  const body = [head, ...game.body];
  const eaten = game.eaten + 1;
  if (eaten >= game.required) return { ...game, body, eaten, status: 'won' };
  const placement = placeFood(body, game.columns, game.rows, game.randomSeed);
  return { ...game, body, eaten, food: placement.food, randomSeed: placement.nextSeed };
}

function moveSnake(game: SnakeGame, head: GridPoint): SnakeGame {
  return { ...game, body: [head, ...game.body.slice(0, -1)] };
}

export function advanceSnake(game: SnakeGame): SnakeGame {
  if (game.status !== 'running') return game;
  const [direction = game.direction, ...remainingTurns] = game.queuedTurns;
  const head = game.body[0] ?? ORIGIN;
  const step = STEPS[direction];
  const nextHead = { x: head.x + step.x, y: head.y + step.y };
  const turned: SnakeGame = { ...game, direction, queuedTurns: remainingTurns };
  if (hitsWall(turned, nextHead) || hitsOwnBody(turned, nextHead)) return { ...turned, status: 'crashed' };
  return isSamePoint(nextHead, game.food) ? eatFood(turned, nextHead) : moveSnake(turned, nextHead);
}
