import { ERAS_BY_ID } from './content/eras';
import type { AnyMinigameId, GameState, HazardKind, RunStats } from './types';

/**
 * What a whole run has done, for the achievements: it lasts from 1997 to the end, across relaunches, and a new run
 * starts it over. Pure: state in, state out.
 */
export const EMPTY_RUN_STATS: RunStats = {
  handTypedKeystrokes: 0,
  typos: 0,
  onFireStarts: 0,
  cleanups: 0,
  minigamesWon: [],
  popupsClosed: 0,
  scamsFallenFor: 0,
  hazards: {},
  placedAdAfter1997: false,
  longestAwayMs: 0,
  hasPokedWithDevTools: false,
};

/** One keystroke a tick is as fast as a hand types: anything faster is a script, and counts once. */
export const HAND_TYPED_GAP_MS = 50;
/** 2024's code is written by the AI as much as by you: hand-typed keystrokes count before it. */
const AI_YEAR = 2024;
const FIRST_YEAR = 1997;

function withRunStats(state: GameState, stats: Partial<RunStats>): GameState {
  return { ...state, runStats: { ...state.runStats, ...stats } };
}

function isHandPaced(state: GameState): boolean {
  return state.msSinceKeystroke >= HAND_TYPED_GAP_MS && ERAS_BY_ID[state.eraId].year < AI_YEAR;
}

/** Called with the state from before the keystroke: how long since the last one, and which era it is. */
export function countHandTyped(before: GameState, after: GameState): GameState {
  return isHandPaced(before) ? withRunStats(after, { handTypedKeystrokes: after.runStats.handTypedKeystrokes + 1 }) : after;
}

export function countTypo(state: GameState): GameState {
  return withRunStats(state, { typos: state.runStats.typos + 1 });
}

export function countRunOnFire(state: GameState): GameState {
  return withRunStats(state, { onFireStarts: state.runStats.onFireStarts + 1 });
}

export function countMinigameWon(state: GameState, minigameId: AnyMinigameId): GameState {
  const won = state.runStats.minigamesWon.includes(minigameId) ? state.runStats.minigamesWon : [...state.runStats.minigamesWon, minigameId];
  return withRunStats(state, { minigamesWon: won });
}

export function countCleanup(state: GameState, minigameId: AnyMinigameId): GameState {
  return countMinigameWon(withRunStats(state, { cleanups: state.runStats.cleanups + 1 }), minigameId);
}

export function countPopupClosed(state: GameState): GameState {
  return withRunStats(state, { popupsClosed: state.runStats.popupsClosed + 1 });
}

export function countScam(state: GameState): GameState {
  return withRunStats(state, { scamsFallenFor: state.runStats.scamsFallenFor + 1 });
}

export function countHazard(state: GameState, kind: HazardKind): GameState {
  return withRunStats(state, { hazards: { ...state.runStats.hazards, [kind]: (state.runStats.hazards[kind] ?? 0) + 1 } });
}

/** An ad in 1997 is how every homepage paid its way: only one after it spoils an ad-free web. */
export function noteAdPlaced(state: GameState): GameState {
  return ERAS_BY_ID[state.eraId].year > FIRST_YEAR ? withRunStats(state, { placedAdAfter1997: true }) : state;
}

export function noteTimeAway(state: GameState, awayMs: number): GameState {
  return awayMs > state.runStats.longestAwayMs ? withRunStats(state, { longestAwayMs: awayMs }) : state;
}

/** The developer tools opened, or a number on the page was edited with them. The game's own numbers don't change. */
export function notePokedWithDevTools(state: GameState): GameState {
  return state.runStats.hasPokedWithDevTools ? state : withRunStats(state, { hasPokedWithDevTools: true });
}
