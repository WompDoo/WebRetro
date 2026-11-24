import { advanceEra, calculateRetirementPayout, ERAS_BY_ID, formatMoney, getFeaturesRetiringIn, getRetiredFeatureName, MS_PER_SECOND, REDIRECT_MS } from '../engine';
import type { EraId, GameState } from '../engine';
import { escapeHtml } from './dom';
import { ERA_PRESENTATION } from './presentation';
import type { EraStory, StoryHighlight } from './presentation';

/**
 * The relaunch, as an event. The year rolls over like an odometer from the era you leave to the one you enter, the
 * card takes the new era's colours, and what changes arrives as a handful of short cards, one after another. The
 * longer story is folded away; the Relaunch button never scrolls off the screen.
 */

/** Two turns of digits, so a digit can roll forward past 9: 2018 → 2024 turns the 8 on through 9 and 0 to 4. */
const ODOMETER_STRIP = '01234567890123456789';
const DIGITS_PER_TURN = 10;

function renderRollingDigit(from: string, to: string, index: number): string {
  const start = Number(from);
  const end = Number(to) + (Number(to) < start ? DIGITS_PER_TURN : 0);
  const strip = [...ODOMETER_STRIP].map((digit) => `<span>${digit}</span>`).join('');
  return `<span class="odometer-digit" style="--from:${start};--to:${end};--index:${index}"><span class="odometer-strip">${strip}</span></span>`;
}

/** The new year, each digit rolling up from the old year's: the moment the calendar moves on. */
export function renderYearOdometer(fromYear: number, toYear: number): string {
  const from = String(fromYear).padStart(String(toYear).length, '0');
  return [...String(toYear)].map((digit, index) => renderRollingDigit(from.charAt(index), digit, index)).join('');
}

function renderHighlight(highlight: StoryHighlight, index: number): string {
  return `<li class="relaunch-card" style="--index:${index}"><span class="relaunch-icon" aria-hidden="true">${escapeHtml(highlight.icon)}</span><span class="relaunch-card-text"><b>${escapeHtml(highlight.title)}</b><span>${escapeHtml(highlight.text)}</span></span></li>`;
}

/** What goes out of fashion, struck through one by one, and what it pays back. Nothing when nothing retires. */
function renderRetiring(state: GameState, nextEraId: EraId): string {
  const retiring = getFeaturesRetiringIn(state, nextEraId);
  const chips = retiring.map((featureId, index) => `<s class="retiring-chip" style="--index:${index}">${escapeHtml(getRetiredFeatureName(featureId))}</s>`).join('');
  return retiring.length === 0 ? '' : `<div class="relaunch-retiring"><span class="relaunch-retiring-label">Retiring</span>${chips}${renderTradeIn(calculateRetirementPayout(state, nextEraId))}</div>`;
}

/** Nothing to show when only the crash's stopgaps retire: they pay no trade-in. */
function renderTradeIn(payout: number): string {
  return payout > 0 ? `<span class="relaunch-trade-in" title="Paid over the new era’s first minutes, as their old links redirect">Trade-in ${formatMoney(payout)} ↪</span>` : '';
}

/** Saved beyond what the relaunch keeps: it goes into the move. */
function isSavingTooMuch(state: GameState, kept: number): boolean {
  return state.money - ERAS_BY_ID[state.eraId].migrationCost > kept;
}

const OVER_BUDGET_NOTE = ' Migrations run over budget: what you’ve saved past that goes into the move, so spend it first if you’d rather keep it.';
const SECONDS_PER_MINUTE = 60;
const REDIRECT_NOTE = ` The trade-in arrives over the first ${REDIRECT_MS / MS_PER_SECOND / SECONDS_PER_MINUTE} minutes, as the old links redirect.`;

/** What you'll start the new era with, said before you go, so nothing you saved disappears by surprise. */
function renderStartingMoney(state: GameState, nextEraId: EraId): string {
  const kept = advanceEra(state).money;
  const overBudget = isSavingTooMuch(state, kept) ? OVER_BUDGET_NOTE : '';
  const redirects = calculateRetirementPayout(state, nextEraId) > 0 ? REDIRECT_NOTE : '';
  return `<p class="relaunch-money">You start ${ERA_PRESENTATION[nextEraId].year} with ${formatMoney(kept)}.${escapeHtml(redirects + overBudget)}</p>`;
}

function renderFullStory(story: EraStory): string {
  return `<details class="relaunch-story"><summary>Read the story</summary>${story.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</details>`;
}

export function renderRelaunchStory(state: GameState, nextEraId: EraId, story: EraStory, choice = ''): string {
  const fromYear = ERA_PRESENTATION[state.eraId].year;
  const toYear = ERA_PRESENTATION[nextEraId].year;
  return `<div class="relaunch" data-era-to="${toYear}">
    <div class="relaunch-scroll">
      <p class="relaunch-years" aria-label="${fromYear} to ${toYear}"><span class="relaunch-from">${fromYear}</span><span class="relaunch-arrow" aria-hidden="true">→</span><span class="relaunch-to" aria-hidden="true">${renderYearOdometer(fromYear, toYear)}</span></p>
      <h2 class="relaunch-heading">${escapeHtml(story.heading)}</h2>
      <p class="relaunch-hook">${escapeHtml(story.hook)}</p>
      <ul class="relaunch-cards">${story.highlights.map(renderHighlight).join('')}</ul>
      ${choice}
      ${renderRetiring(state, nextEraId)}
      ${renderStartingMoney(state, nextEraId)}
      ${renderFullStory(story)}
    </div>
    <div class="relaunch-actions">
      <button type="button" class="ghost-button" data-action="cancel-migration">Not yet</button>
      <button type="button" class="primary-button" data-action="confirm-migration">${escapeHtml(story.confirmLabel)}</button>
    </div>
  </div>`;
}
