import { MS_PER_SECOND } from './constants';
import { UPGRADES_BY_ID } from './content/upgrades';
import { calculateUpgradeCost, getAvailableSkillIds } from './economy';
import type { GameState, Redirects } from './types';

/**
 * A relaunch shouldn't hand you everything at once. You start the new era most of the way to its first new skill,
 * not with a pile that buys the whole shop in a minute; and what the retiring features pay back arrives the way it
 * would on a real site: their old addresses redirect to the new one, and the visitors trickle in for a while.
 */

/** You start with this share of the new era's cheapest new skill, at most: most of the way there. */
export const STARTING_FUND_SHARE = 0.8;
const SECONDS_PER_MINUTE = 60;
const REDIRECT_MINUTES = 10;
/** The trade-in is paid over this long, as the old links redirect. */
export const REDIRECT_MS = REDIRECT_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
export const NO_REDIRECTS: Redirects = { perSecond: 0, remainingMs: 0 };

function isNewSkill(state: GameState, skillId: Parameters<typeof calculateUpgradeCost>[1]): boolean {
  return UPGRADES_BY_ID[skillId].eraId === state.eraId;
}

/** Most of the way to the era's cheapest new skill. With nothing new to learn, no cap. */
export function calculateStartingFund(state: GameState): number {
  const prices = getAvailableSkillIds(state).filter((skillId) => isNewSkill(state, skillId)).map((skillId) => calculateUpgradeCost(state, skillId));
  return Math.min(...prices) * STARTING_FUND_SHARE;
}

/** Migrations run over budget: what you saved beyond the target goes into the move, all but a start. */
export function keepStartingFund(state: GameState): GameState {
  return { ...state, money: Math.min(state.money, calculateStartingFund(state)) };
}

/** What the redirects still owe: a relaunch soon after another adds it to the new trade-in, so none is lost. */
function calculateUnpaidRedirects(state: GameState): number {
  return (state.redirects.perSecond * state.redirects.remainingMs) / MS_PER_SECOND;
}

/** The retiring features' trade-in, spread over the redirects' time. Nothing to redirect, nothing to pay. */
export function startRedirects(state: GameState, tradeIn: number): GameState {
  const owed = tradeIn + calculateUnpaidRedirects(state);
  const redirects = owed > 0 ? { perSecond: owed / (REDIRECT_MS / MS_PER_SECOND), remainingMs: REDIRECT_MS } : NO_REDIRECTS;
  return { ...state, redirects };
}

export interface RedirectPayment {
  readonly earned: number;
  readonly redirects: Redirects;
}

/** What the redirects pay over this much time, never past their end, and what's left of them after. */
export function payRedirects(state: GameState, deltaMs: number): RedirectPayment {
  const paidMs = Math.min(deltaMs, state.redirects.remainingMs);
  return { earned: (state.redirects.perSecond * paidMs) / MS_PER_SECOND, redirects: { ...state.redirects, remainingMs: state.redirects.remainingMs - paidMs } };
}

export function calculateRedirectIncomePerSecond(state: GameState): number {
  return state.redirects.remainingMs > 0 ? state.redirects.perSecond : 0;
}
