import { BUFFS_BY_ID, calculateBuffFactor, calculateRedirectIncomePerSecond, formatMoney, formatPercent, MS_PER_SECOND, OPPORTUNITIES_BY_KIND } from '../engine';
import type { ActiveBuff, BuffTarget, GameState, Opportunity } from '../engine';
import { escapeHtml } from './dom';

/**
 * Every buff looks the same way: a burning chip hanging from the top bar with what it does and how long it lasts,
 * and whatever it boosts on fire (the editor, the visitors count, the revenue).
 */

const TARGET_NAMES: Readonly<Record<BuffTarget, string>> = {
  typing: 'typing',
  traffic: 'visitors',
  'ad-value': 'ad revenue',
};

/** Doubling and more read as ×3; small boosts as +15%. */
const MULTIPLIER_FROM = 2;

function describeFactor(factor: number): string {
  return factor >= MULTIPLIER_FROM ? `×${factor}` : `+${formatPercent(factor - 1)}`;
}

function renderChip(buff: ActiveBuff): string {
  const definition = BUFFS_BY_ID[buff.id];
  const seconds = Math.ceil(buff.remainingMs / MS_PER_SECOND);
  return `<span class="buff-chip" data-buff="${buff.id}"><span class="buff-icon" aria-hidden="true">${definition.icon}</span><b>${escapeHtml(definition.name)}</b> ${describeFactor(definition.factor)} ${TARGET_NAMES[definition.target]} · <span data-buff-time="${buff.id}">${seconds} s</span></span>`;
}

/** An offer waiting for you: gold, clickable, counting down. It opens the minigame that wins it. */
function renderOffer(opportunity: Opportunity): string {
  const definition = OPPORTUNITIES_BY_KIND[opportunity.kind];
  const seconds = Math.ceil(opportunity.remainingMs / MS_PER_SECOND);
  return `<button type="button" class="buff-chip is-offer" data-action="open-minigame" data-id="${opportunity.id}"><span class="buff-icon" aria-hidden="true">${definition.icon}</span><b>${escapeHtml(definition.offer)}</b> · <span data-buff-time="offer">${seconds} s</span></button>`;
}

/** After a relaunch, the retired features' old links still send their visitors: the trade-in, paid as it comes. */
function renderRedirectChip(state: GameState): string {
  const perSecond = formatMoney(calculateRedirectIncomePerSecond(state));
  return `<span class="buff-chip is-redirect" title="The trade-in for what retired, paid as their old links redirect here"><span class="buff-icon" aria-hidden="true">↪</span><b>Old links redirect</b> +${perSecond}/s · <span data-buff-time="redirects">${formatClock(state.redirects.remainingMs)}</span></span>`;
}

function hasRedirects(state: GameState): boolean {
  return calculateRedirectIncomePerSecond(state) > 0;
}

export function renderBuffChips(state: GameState): string {
  const offer = state.opportunity === null ? '' : renderOffer(state.opportunity);
  const redirects = hasRedirects(state) ? renderRedirectChip(state) : '';
  return `${offer}${redirects}${state.buffs.map(renderChip).join('')}`;
}

/**
 * Which chips there are. The chips are rebuilt only when this changes; their countdowns tick in place, so the offer
 * stays the same button under your click instead of being replaced every second.
 */
export function calculateBuffChipsSignature(state: GameState): string {
  const offerId = state.opportunity === null ? '' : String(state.opportunity.id);
  return [offerId, hasRedirects(state), ...state.buffs.map((buff) => buff.id)].join('|');
}

/** Each chip's countdown, by the key its time slot carries. */
export function listChipTimes(state: GameState): readonly (readonly [string, string])[] {
  const offer: readonly (readonly [string, string])[] = state.opportunity === null ? [] : [['offer', formatSeconds(state.opportunity.remainingMs)]];
  const redirects: readonly (readonly [string, string])[] = hasRedirects(state) ? [['redirects', formatClock(state.redirects.remainingMs)]] : [];
  return [...offer, ...redirects, ...state.buffs.map((buff): readonly [string, string] => [buff.id, formatSeconds(buff.remainingMs)])];
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / MS_PER_SECOND)} s`;
}

const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;

/** "9:41": minutes and seconds, for what lasts minutes. */
function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / MS_PER_SECOND);
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(CLOCK_DIGITS, '0')}`;
}

/** Whether this number is being boosted right now: its stat burns along with the chip. */
export function isTargetBuffed(state: GameState, target: BuffTarget): boolean {
  return calculateBuffFactor(state, target) > 1;
}

/** What's left of the fire, for the editor's countdown: 0 when you aren't on fire. */
export function findFireRemainingMs(state: GameState): number {
  return state.buffs.find((buff) => buff.id === 'on-fire')?.remainingMs ?? 0;
}
