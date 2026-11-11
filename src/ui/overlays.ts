import { calculateRetirementPayout, ERAS_BY_ID, formatMoney, formatWholeNumber } from '../engine';
import type { EraId, GameState } from '../engine';
import { escapeHtml } from './dom';
import { elements } from './elements';
import { ERA_PRESENTATION } from './presentation';
import { describeRetiring, describeTradeIn } from './retirement';

const MS_PER_MINUTE = 60_000;

/** Overlays are modal: the first button gets focus, so Enter and Space act on it. */
export function showOverlay(overlay: HTMLElement): void {
  overlay.hidden = false;
  overlay.querySelector<HTMLElement>('button')?.focus();
}

export function hideOverlay(overlay: HTMLElement): void {
  overlay.hidden = true;
}

/** Fills the relaunch story for the next era. False in the final era, which has no story to tell. */
/** The names your retiring features go by now, for the story and the news. */
function renderRetiring(state: GameState, eraId: EraId): string {
  const names = describeRetiring(state, eraId);
  const tradeIn = describeTradeIn(calculateRetirementPayout(state, eraId));
  return names === '' ? '' : `<p class="story-retiring"><b>Retiring from your site:</b> ${escapeHtml(names)}. ${escapeHtml(tradeIn)}</p>`;
}

export function renderStory(state: GameState): boolean {
  const nextEraId = ERAS_BY_ID[state.eraId].nextEraId;
  const story = nextEraId === null ? null : ERA_PRESENTATION[nextEraId].entryStory;
  if (story === null || nextEraId === null) return false;
  elements.storyCard.innerHTML = `<p class="story-year">${escapeHtml(story.yearSpan)}</p>
    <h2 class="story-heading">${escapeHtml(story.heading)}</h2>
    ${story.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    <h3 class="story-subheading">What changes</h3>
    <ul class="story-list">${story.whatsNew.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    ${renderRetiring(state, nextEraId)}
    <button type="button" class="primary-button" data-action="confirm-migration">${escapeHtml(story.confirmLabel)}</button>`;
  return true;
}

export function showEndCard(state: GameState): void {
  const minutes = Math.round(state.playTimeMs / MS_PER_MINUTE);
  elements.endStats.innerHTML = `<li><b>${minutes} min</b> played</li><li><b>${formatWholeNumber(state.lifetimeVisitors)}</b> visitors</li><li><b>${formatMoney(state.lifetimeEarnings)}</b> earned</li><li><b>${formatWholeNumber(state.keystrokes)}</b> keystrokes</li>`;
  showOverlay(elements.endOverlay);
}
