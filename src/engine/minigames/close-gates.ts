import { drawRandoms } from '../random';
import { isMinigameOver } from './status';
import type { MinigameStatus } from './status';

/** One request on its way to your server, along one of the lanes. */
export interface GateRequest {
  readonly id: number;
  readonly lane: number;
  /** 0 where it appears, 1 at the server. Its fate is decided at the gate. */
  readonly position: number;
  readonly isBot: boolean;
  readonly hasPassedGate: boolean;
}

/**
 * A botnet floods the site. Requests stream along the lanes; close a lane's gate to drop what reaches it,
 * open it again for real visitors. Hold out until the attack stops.
 */
export interface CloseGatesGame {
  readonly laneCount: number;
  readonly closedLanes: readonly boolean[];
  readonly requests: readonly GateRequest[];
  readonly msUntilNextRequest: number;
  readonly spawnIntervalMs: number;
  /** How long a request takes from where it appears to the server. */
  readonly travelMs: number;
  readonly botShare: number;
  readonly botsThrough: number;
  readonly botsBlocked: number;
  readonly visitorsTurnedAway: number;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly status: MinigameStatus;
  readonly randomSeed: number;
  readonly nextRequestId: number;
}

/** Where along the lane the gate stands. */
export const GATE_POSITION = 0.72;
export const CLOSE_GATES_MAX_BOTS_THROUGH = 3;
export const CLOSE_GATES_MAX_TURNED_AWAY = 3;
const LANE_COUNT = 3;
const BASE_DURATION_MS = 12_000;
const DURATION_MS_PER_DIFFICULTY = 3_000;
const BASE_TRAVEL_MS = 3_200;
const BASE_SPAWN_INTERVAL_MS = 650;
/** Each level, requests come this much faster and more often. */
const SPEEDUP_PER_DIFFICULTY = 0.85;
const BASE_BOT_SHARE = 0.6;
const BOT_SHARE_PER_DIFFICULTY = 0.05;
/** A new request never lands closer than this behind the last one in its lane, so there is always time to flip the gate. */
const MIN_LANE_GAP = 0.22;
const ROLLS_PER_REQUEST = 2;
const SERVER_POSITION = 1;
/** The first request appears soon after the first input. */
const FIRST_REQUEST_MS = 200;

export function createCloseGatesGame(difficulty: number, seed: number): CloseGatesGame {
  const extraDifficulty = difficulty - 1;
  const speedup = SPEEDUP_PER_DIFFICULTY ** extraDifficulty;
  return {
    laneCount: LANE_COUNT,
    closedLanes: Array.from({ length: LANE_COUNT }, () => false),
    requests: [],
    msUntilNextRequest: FIRST_REQUEST_MS,
    spawnIntervalMs: BASE_SPAWN_INTERVAL_MS * speedup,
    travelMs: BASE_TRAVEL_MS * speedup,
    botShare: BASE_BOT_SHARE + BOT_SHARE_PER_DIFFICULTY * extraDifficulty,
    botsThrough: 0,
    botsBlocked: 0,
    visitorsTurnedAway: 0,
    elapsedMs: 0,
    durationMs: BASE_DURATION_MS + DURATION_MS_PER_DIFFICULTY * extraDifficulty,
    status: 'waiting',
    randomSeed: seed,
    nextRequestId: 1,
  };
}

function countWhere(requests: readonly GateRequest[], isBot: boolean): number {
  return requests.filter((request) => request.isBot === isBot).length;
}

function isCrossingGate(request: GateRequest): boolean {
  return !request.hasPassedGate && request.position >= GATE_POSITION;
}

/** Moves every request on. At the gate each one is dropped (gate closed) or let through (gate open). */
function moveRequests(game: CloseGatesGame, elapsedMs: number): CloseGatesGame {
  const step = elapsedMs / game.travelMs;
  const moved = game.requests.map((request) => ({ ...request, position: request.position + step }));
  const crossing = moved.filter(isCrossingGate);
  const dropped = crossing.filter((request) => game.closedLanes[request.lane] === true);
  const letThrough = crossing.filter((request) => !dropped.includes(request));
  const remaining = moved.filter((request) => !dropped.includes(request) && request.position < SERVER_POSITION);
  return {
    ...game,
    requests: remaining.map((request) => (letThrough.includes(request) ? { ...request, hasPassedGate: true } : request)),
    botsThrough: game.botsThrough + countWhere(letThrough, true),
    botsBlocked: game.botsBlocked + countWhere(dropped, true),
    visitorsTurnedAway: game.visitorsTurnedAway + countWhere(dropped, false),
    elapsedMs: game.elapsedMs + elapsedMs,
  };
}

function isLaneFree(game: CloseGatesGame, lane: number): boolean {
  return game.requests.every((request) => request.lane !== lane || request.position >= MIN_LANE_GAP);
}

/** A new request in a random lane with room for it. When every lane is crowded, this one is skipped. */
function addRequest(game: CloseGatesGame): CloseGatesGame {
  const draws = drawRandoms(game.randomSeed, ROLLS_PER_REQUEST);
  const [laneRoll = 0, botRoll = 0] = draws.values;
  const freeLanes = Array.from({ length: game.laneCount }, (_, lane) => lane).filter((lane) => isLaneFree(game, lane));
  const lane = freeLanes[Math.floor(laneRoll * freeLanes.length)];
  const request: readonly GateRequest[] = lane === undefined ? [] : [{ id: game.nextRequestId, lane, position: 0, isBot: botRoll < game.botShare, hasPassedGate: false }];
  return { ...game, requests: [...game.requests, ...request], nextRequestId: game.nextRequestId + request.length, randomSeed: draws.nextSeed };
}

/** At most one new request per tick: frames are capped short, and the interval is longer than a frame. */
function spawnRequests(game: CloseGatesGame, elapsedMs: number): CloseGatesGame {
  const msUntilNextRequest = game.msUntilNextRequest - elapsedMs;
  return msUntilNextRequest > 0
    ? { ...game, msUntilNextRequest }
    : addRequest({ ...game, msUntilNextRequest: msUntilNextRequest + game.spawnIntervalMs });
}

function judge(game: CloseGatesGame): MinigameStatus {
  const outcomes: readonly (readonly [boolean, MinigameStatus])[] = [
    [game.botsThrough >= CLOSE_GATES_MAX_BOTS_THROUGH, 'lost'],
    [game.visitorsTurnedAway >= CLOSE_GATES_MAX_TURNED_AWAY, 'lost'],
    [game.elapsedMs >= game.durationMs, 'won'],
  ];
  return outcomes.find(([applies]) => applies)?.[1] ?? 'running';
}

export function advanceCloseGates(game: CloseGatesGame, elapsedMs: number): CloseGatesGame {
  if (game.status !== 'running') return game;
  const advanced = spawnRequests(moveRequests(game, elapsedMs), elapsedMs);
  return { ...advanced, status: judge(advanced) };
}

/** Opens or closes one lane's gate. The first flip starts the attack. */
export function toggleGate(game: CloseGatesGame, lane: number): CloseGatesGame {
  if (isMinigameOver(game.status)) return game;
  const closedLanes = game.closedLanes.map((isClosed, index) => (index === lane ? !isClosed : isClosed));
  return { ...game, closedLanes, status: 'running' };
}
