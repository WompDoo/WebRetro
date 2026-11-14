import { calculateRetirementPayout, ERAS_BY_ID } from '../engine';
import type { EraId, GameState } from '../engine';
import { escapeHtml } from './dom';
import { elements } from './elements';
import { renderEndingAct } from './ending';
import type { EndingAct } from './ending';
import { ERA_PRESENTATION } from './presentation';
import { describeRetiring, describeTradeIn } from './retirement';


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

/** An act of the ending, from its top. */
export function showEnding(state: GameState, act: EndingAct): void {
  elements.endCard.innerHTML = renderEndingAct(state, act, null);
  elements.endCard.dataset['act'] = act;
  elements.endOverlay.scrollTop = 0;
  showOverlay(elements.endOverlay);
}

/** Another year in the archive: the page changes, the year picked keeps the focus. */
export function showArchiveYear(state: GameState, eraId: EraId): void {
  elements.endCard.innerHTML = renderEndingAct(state, 'archive', eraId);
  elements.endCard.querySelector<HTMLElement>(`[data-action="ending-year"][data-id="${eraId}"]`)?.focus();
}
