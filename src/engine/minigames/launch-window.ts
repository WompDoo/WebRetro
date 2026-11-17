import { drawRandoms } from '../random';
import { isMinigameOver } from './status';
import type { MinigameStatus } from './status';

/**
 * Launch day's minigame: a release goes out in three stages (build, deploy, announce, in each era's words). A
 * marker sweeps back and forth across a bar; press while it's inside the green window to clear the stage. Every
 * stage is faster, with a smaller window. A miss sends the marker back to the start of the stage, so misses cost
 * time, and the whole launch has one clock. Pure timing: nothing to read, nothing to know.
 */
export interface LaunchStage {
  /** Where the window starts and how wide it is, as shares of the bar. */
  readonly windowStart: number;
  readonly windowWidth: number;
  /** How long the marker takes to cross the bar once. */
  readonly crossingMs: number;
}

export interface LaunchWindow {
  readonly stages: readonly LaunchStage[];
  readonly stageIndex: number;
  /** The marker, 0 at the left end of the bar and 1 at the right. */
  readonly position: number;
  readonly isMovingRight: boolean;
  readonly elapsedMs: number;
  readonly limitMs: number;
  readonly misses: number;
  /** Like the sponsor's code, the attempt counts from the first press: looking first is free. */
  readonly hasPressed: boolean;
}

/** Wide and slow, then narrower and faster: the third window is half the first, crossed in two thirds the time. */
const STAGE_SHAPES: readonly { readonly width: number; readonly crossingMs: number }[] = [
  { width: 0.22, crossingMs: 1_300 },
  { width: 0.16, crossingMs: 1_050 },
  { width: 0.11, crossingMs: 850 },
];
const LIMIT_MS = 15_000;
/** Windows sit away from the ends, where the marker turns and would be too easy to catch. */
const EDGE_MARGIN = 0.12;
const LEFT_END = 0;
const RIGHT_END = 1;

function placeStage(shape: { readonly width: number; readonly crossingMs: number }, roll: number): LaunchStage {
  const room = RIGHT_END - 2 * EDGE_MARGIN - shape.width;
  return { windowStart: EDGE_MARGIN + roll * room, windowWidth: shape.width, crossingMs: shape.crossingMs };
}

export function startLaunchWindow(seed: number): LaunchWindow {
  const rolls = drawRandoms(seed, STAGE_SHAPES.length).values;
  return {
    stages: STAGE_SHAPES.map((shape, index) => placeStage(shape, rolls[index] ?? 0)),
    stageIndex: 0,
    position: LEFT_END,
    isMovingRight: true,
    elapsedMs: 0,
    limitMs: LIMIT_MS,
    misses: 0,
    hasPressed: false,
  };
}

export function findCurrentStage(game: LaunchWindow): LaunchStage | null {
  return game.stages[game.stageIndex] ?? null;
}

function openStatus(game: LaunchWindow): MinigameStatus {
  return game.hasPressed ? 'running' : 'waiting';
}

export function launchWindowStatus(game: LaunchWindow): MinigameStatus {
  if (game.stageIndex >= game.stages.length) return 'won';
  return game.elapsedMs >= game.limitMs ? 'lost' : openStatus(game);
}

/** The stage being played, or null once the launch is won or lost. */
function findOpenStage(game: LaunchWindow): LaunchStage | null {
  return isMinigameOver(launchWindowStatus(game)) ? null : findCurrentStage(game);
}

/** Back and forth: past an end, the marker comes back the other way by what it overshot. */
function sweep(position: number, isMovingRight: boolean, distance: number): { readonly position: number; readonly isMovingRight: boolean } {
  const unfolded = (isMovingRight ? position : 2 * RIGHT_END - position) + distance;
  const cycle = unfolded % (2 * RIGHT_END);
  return cycle <= RIGHT_END ? { position: cycle, isMovingRight: true } : { position: 2 * RIGHT_END - cycle, isMovingRight: false };
}

export function tickLaunchWindow(game: LaunchWindow, elapsedMs: number): LaunchWindow {
  const stage = findOpenStage(game);
  if (stage === null) return game;
  const moved = sweep(game.position, game.isMovingRight, elapsedMs / stage.crossingMs);
  return { ...game, ...moved, elapsedMs: Math.min(game.limitMs, game.elapsedMs + elapsedMs) };
}

export function isInWindow(stage: LaunchStage, position: number): boolean {
  return position >= stage.windowStart && position <= stage.windowStart + stage.windowWidth;
}

/** In the window, the stage is cleared and the next starts from the left; outside it, this stage starts over. */
export function pressLaunch(game: LaunchWindow): LaunchWindow {
  const stage = findOpenStage(game);
  if (stage === null) return game;
  const restarted = { ...game, position: LEFT_END, isMovingRight: true, hasPressed: true };
  return isInWindow(stage, game.position) ? { ...restarted, stageIndex: game.stageIndex + 1 } : { ...restarted, misses: game.misses + 1 };
}
