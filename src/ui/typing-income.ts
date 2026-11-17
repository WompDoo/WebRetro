import { formatMoney, MS_PER_SECOND } from '../engine';

/**
 * Your typing as income per second, for the top bar's Income. Every keystroke's pay goes into a pool that drains
 * over a couple of seconds: type steadily and the pool settles at your rate times the fade, so it reads your real
 * rate; stop, and it drains away. Real time, not game time: it measures your fingers, not the simulation.
 */
export const TYPING_INCOME_FADE_MS = 2_000;
/** Under a cent, the pool is empty: a fade never quite reaches zero on its own. */
const EMPTY_BELOW_DOLLARS = 0.01;
/** The typing part shows next to Income only while it's a visible part of it. */
const SHOWN_FROM_SHARE = 0.01;

export function addKeystrokePay(pool: number, earned: number): number {
  return pool + earned;
}

export function drainTypingIncome(pool: number, elapsedMs: number): number {
  const drained = pool * Math.exp(-elapsedMs / TYPING_INCOME_FADE_MS);
  return drained < EMPTY_BELOW_DOLLARS ? 0 : drained;
}

export function readTypingIncomePerSecond(pool: number): number {
  return pool / (TYPING_INCOME_FADE_MS / MS_PER_SECOND);
}

/** "⌨ +$6.80M" while your typing is a visible part of your income; nothing once it isn't. */
export function describeTypingBoost(siteRevenuePerSecond: number, typingPerSecond: number): string {
  const isVisible = typingPerSecond > 0 && typingPerSecond >= (siteRevenuePerSecond + typingPerSecond) * SHOWN_FROM_SHARE;
  return isVisible ? `⌨ +${formatMoney(typingPerSecond)}` : '';
}

/** The tooltip: where the money comes from. */
export function describeIncomeSources(siteRevenuePerSecond: number, typingPerSecond: number): string {
  return `Your site: ${formatMoney(siteRevenuePerSecond)}/s · Your typing: ${formatMoney(typingPerSecond)}/s`;
}
