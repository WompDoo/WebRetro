import { drawRandoms } from '../random';
import { isMinigameOver } from './status';
import type { MinigameStatus } from './status';

/** A tile's sides, clockwise from the top. */
export type Side = 0 | 1 | 2 | 3;
export const UP: Side = 0;
export const RIGHT: Side = 1;
export const DOWN: Side = 2;
export const LEFT: Side = 3;
const SIDE_COUNT = 4;
const ROTATIONS: readonly number[] = [0, 1, 2, 3];

/** A piece of network cable. It turns a quarter at a time; its shape never changes. */
export interface RouteTile {
  /** Which sides have a cable when the tile isn't turned. */
  readonly openings: readonly Side[];
  /** Quarter turns clockwise, 0 to 3. */
  readonly rotation: number;
}

export interface TilePosition {
  readonly column: number;
  readonly row: number;
}

/**
 * Reroute the flood through the scrubbing centre: turn cable tiles until a line runs from the Internet on the
 * left to the scrubbing centre on the right. A calm puzzle with no clock and no way to lose: the feature stays
 * down while you think, which is pressure enough.
 */
export interface RerouteGame {
  readonly columns: number;
  /** Top to bottom; each row left to right. Off the board there is simply no tile. */
  readonly tiles: readonly (readonly RouteTile[])[];
  /** The row where the Internet comes in on the left, and the row of the scrubbing centre on the right. */
  readonly entryRow: number;
  readonly exitRow: number;
  readonly moves: number;
  readonly status: MinigameStatus;
}

const STRAIGHT: readonly Side[] = [UP, DOWN];
const CORNER: readonly Side[] = [UP, RIGHT];
const TEE: readonly Side[] = [UP, RIGHT, DOWN];
const DECOY_SHAPES: readonly (readonly Side[])[] = [STRAIGHT, CORNER, TEE];
/** Columns × rows, by difficulty. */
const BOARD_SIZES: readonly (readonly [number, number])[] = [
  [4, 3],
  [5, 4],
  [6, 4],
];
const SMALLEST_BOARD: readonly [number, number] = [4, 3];
const ROLLS_PER_TILE = 2;
const OFFSETS: Readonly<Record<Side, readonly [number, number]>> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

function turn(side: Side, quarterTurns: number): Side {
  return ((side + quarterTurns) % SIDE_COUNT) as Side;
}

function opposite(side: Side): Side {
  return turn(side, 2);
}

/** The sides that have a cable right now. */
export function openSides(tile: RouteTile): readonly Side[] {
  return tile.openings.map((side) => turn(side, tile.rotation));
}

function tileAt(game: RerouteGame, position: TilePosition): RouteTile | undefined {
  return game.tiles[position.row]?.[position.column];
}

function opensTo(game: RerouteGame, position: TilePosition, side: Side): boolean {
  const tile = tileAt(game, position);
  return tile !== undefined && openSides(tile).includes(side);
}

function stepTo(position: TilePosition, side: Side): TilePosition {
  const [columnStep, rowStep] = OFFSETS[side];
  return { column: position.column + columnStep, row: position.row + rowStep };
}

export function positionKey(position: TilePosition): string {
  return `${position.column},${position.row}`;
}

/** Neighbours this tile's cables reach, where the neighbour's cable reaches back. */
function joinedNeighbours(game: RerouteGame, position: TilePosition): readonly TilePosition[] {
  const tile = tileAt(game, position);
  const sides = tile === undefined ? [] : openSides(tile);
  return sides.filter((side) => opensTo(game, stepTo(position, side), opposite(side))).map((side) => stepTo(position, side));
}

function spread(game: RerouteGame, reached: ReadonlyMap<string, TilePosition>, frontier: readonly TilePosition[]): ReadonlyMap<string, TilePosition> {
  const fresh = new Map(frontier.flatMap((position) => joinedNeighbours(game, position)).filter((position) => !reached.has(positionKey(position))).map((position) => [positionKey(position), position]));
  return fresh.size === 0 ? reached : spread(game, new Map([...reached, ...fresh]), [...fresh.values()]);
}

/** Every tile the Internet's traffic reaches, along cables that meet. The view lights them up. */
export function findConnectedTiles(game: RerouteGame): ReadonlySet<string> {
  const entry = { column: 0, row: game.entryRow };
  const start = opensTo(game, entry, LEFT) ? [entry] : [];
  return new Set(spread(game, new Map(start.map((position) => [positionKey(position), position])), start).keys());
}

export function isRouteComplete(game: RerouteGame): boolean {
  const exit = { column: game.columns - 1, row: game.exitRow };
  return findConnectedTiles(game).has(positionKey(exit)) && opensTo(game, exit, RIGHT);
}

interface RouteStep {
  readonly position: TilePosition;
  readonly sides: readonly [Side, Side];
}

function shapeJoining(first: Side, second: Side): readonly Side[] {
  return second === opposite(first) ? STRAIGHT : CORNER;
}

function rotationJoining(first: Side, second: Side): number {
  const shape = shapeJoining(first, second);
  return ROTATIONS.find((rotation) => [first, second].every((side) => shape.map((open) => turn(open, rotation)).includes(side))) ?? 0;
}

function sideIn(stepIndex: number, travel: Side): Side {
  return stepIndex === 0 ? LEFT : opposite(travel);
}

function sideOut(stepIndex: number, lastStep: number, travel: Side): Side {
  return stepIndex === lastStep ? RIGHT : travel;
}

/** One column of the route: in from the left at `fromRow`, up or down to `toRow`, out to the right. */
function routeThroughColumn(column: number, fromRow: number, toRow: number): readonly RouteStep[] {
  const direction = Math.sign(toRow - fromRow);
  const travel = direction > 0 ? DOWN : UP;
  const lastStep = Math.abs(toRow - fromRow);
  return Array.from({ length: lastStep + 1 }, (_, stepIndex) => ({
    position: { column, row: fromRow + stepIndex * direction },
    sides: [sideIn(stepIndex, travel), sideOut(stepIndex, lastStep, travel)] as const,
  }));
}

interface PlannedRoute {
  readonly steps: readonly RouteStep[];
  readonly entryRow: number;
  readonly exitRow: number;
}

/** A route from the left edge to the right: through every column in turn, moving up or down inside each. */
function planRoute(columns: number, rows: number, rolls: readonly number[]): PlannedRoute {
  const rowOf = (roll: number): number => Math.min(rows - 1, Math.floor(roll * rows));
  const [entryRow, ...exits] = Array.from({ length: columns + 1 }, (_, index) => rowOf(rolls[index] ?? 0));
  const starts = [entryRow ?? 0, ...exits];
  const steps = exits.flatMap((exitRow, column) => routeThroughColumn(column, starts[column] ?? 0, exitRow));
  return { steps, entryRow: entryRow ?? 0, exitRow: exits[exits.length - 1] ?? 0 };
}

function boardSize(difficulty: number): readonly [number, number] {
  return BOARD_SIZES[Math.max(1, difficulty) - 1] ?? BOARD_SIZES[BOARD_SIZES.length - 1] ?? SMALLEST_BOARD;
}

interface Plan {
  readonly columns: number;
  readonly rows: number;
  readonly route: PlannedRoute;
  readonly tileRolls: readonly number[];
}

function plan(difficulty: number, seed: number): Plan {
  const [columns, rows] = boardSize(difficulty);
  const tileRollCount = columns * rows * ROLLS_PER_TILE;
  const draws = drawRandoms(seed, tileRollCount + columns + 1);
  return { columns, rows, route: planRoute(columns, rows, draws.values.slice(tileRollCount)), tileRolls: draws.values.slice(0, tileRollCount) };
}

/** Off the route: a random piece at a random turn, to make the board a puzzle. */
function decoyTile(rolls: readonly number[]): RouteTile {
  const [shapeRoll = 0, rotationRoll = 0] = rolls;
  return { openings: DECOY_SHAPES[Math.floor(shapeRoll * DECOY_SHAPES.length)] ?? STRAIGHT, rotation: Math.floor(rotationRoll * SIDE_COUNT) };
}

/** On the route: the piece that joins its two sides, left at the decoy's random turn so it needs turning. */
function placeTile(decoy: RouteTile, step: RouteStep | undefined): RouteTile {
  return step === undefined ? decoy : { openings: shapeJoining(...step.sides), rotation: decoy.rotation };
}

function turnTile(game: RerouteGame, position: TilePosition): RerouteGame {
  const tiles = game.tiles.map((row, rowIndex) => row.map((tile, column) => (rowIndex === position.row && column === position.column ? { ...tile, rotation: (tile.rotation + 1) % SIDE_COUNT } : tile)));
  return { ...game, tiles };
}

/** A scrambled board that the planned route is guaranteed to solve. One that comes out solved gets a tile turned. */
export function createRerouteGame(difficulty: number, seed: number): RerouteGame {
  const { columns, rows, route, tileRolls } = plan(difficulty, seed);
  const steps = new Map(route.steps.map((step) => [positionKey(step.position), step]));
  const tiles = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => placeTile(decoyTile(tileRolls.slice((row * columns + column) * ROLLS_PER_TILE)), steps.get(positionKey({ column, row })))),
  );
  const game: RerouteGame = { columns, tiles, entryRow: route.entryRow, exitRow: route.exitRow, moves: 0, status: 'running' };
  return isRouteComplete(game) ? turnTile(game, { column: 0, row: route.entryRow }) : game;
}

/** The turns that solve a board, tile by tile along its planned route. Tests use it; the game never shows it. */
export function planRouteSolution(difficulty: number, seed: number): ReadonlyMap<string, number> {
  return new Map(plan(difficulty, seed).route.steps.map((step) => [positionKey(step.position), rotationJoining(...step.sides)]));
}

/** Turns one tile a quarter clockwise. The puzzle is won the moment the route is complete. */
export function turnRouteTile(game: RerouteGame, position: TilePosition): RerouteGame {
  if (isMinigameOver(game.status)) return game;
  const turned = { ...turnTile(game, position), moves: game.moves + 1 };
  return { ...turned, status: isRouteComplete(turned) ? 'won' : 'running' };
}
