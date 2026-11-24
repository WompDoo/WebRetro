import { formatMoney, MS_PER_SECOND } from '../engine';

/**
 * Your typing as income per second, for the top bar's Income. Every keystroke's pay goes into a pool that drains
 * over a couple of seconds: type steadily and the pool settles at your rate times the fade, so it reads your real
 * rate; stop, and it drains away. Real time, not game time: it measures your fingers, not the simulation.
 */
export const TYPING_INCOME_FADE_MS = 2_000;
/** Under a cent, the pool is empty: a fade never quite reaches zero on its own. */
const EMPTY_BELOW_DOLLARS = 0.01;
/** The typing part stays next to Income while you aren't typing, so the label never jumps: it just reads zero. */
const IDLE_TYPING_BOOST = '⌨ +$0.00';

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

/** Where the money comes in from, a second at a time. */
export interface IncomeSources {
  readonly site: number;
  /** Hired help, typing for you. */
  readonly hired: number;
  /** You, over the last few seconds. */
  readonly typing: number;
  /** The last relaunch's retired features, redirecting their visitors here for a while. */
  readonly redirects: number;
}

export function sumIncome(sources: IncomeSources): number {
  return sources.site + sources.hired + sources.typing + sources.redirects;
}

export function isTypingIdle(sources: IncomeSources): boolean {
  return sources.typing === 0;
}

/** "⌨ +$6.80M" while you type, "⌨ +$0.00" while you don't: always there, so it hints that typing counts. */
export function describeTypingBoost(sources: IncomeSources): string {
  return isTypingIdle(sources) ? IDLE_TYPING_BOOST : `⌨ +${formatMoney(sources.typing)}`;
}

/** A source that isn't always there: said only while it pays. */
function describeOccasionalSource(label: string, perSecond: number): string {
  return perSecond > 0 ? ` · ${label}: ${formatMoney(perSecond)}/s` : '';
}

/** The tooltip: where the money comes from. Hired help and redirects only while there are some. */
export function describeIncomeSources(sources: IncomeSources): string {
  const occasional = describeOccasionalSource('Your hires', sources.hired) + describeOccasionalSource('Old links redirecting', sources.redirects);
  return `Your site: ${formatMoney(sources.site)}/s${occasional} · Your typing: ${formatMoney(sources.typing)}/s`;
}
