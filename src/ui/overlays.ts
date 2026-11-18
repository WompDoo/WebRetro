import { findNextEraId } from '../engine';
import type { EraId, GameState, LegacyState } from '../engine';
import { elements } from './elements';
import { renderEndingAct } from './ending';
import type { EndingAct } from './ending';
import { findEntryStory } from './presentation';
import { renderRelaunchStory } from './relaunch-story';
import { renderRelaunchWarning } from './render-specializations';


/** Overlays are modal: the first button gets focus, so Enter and Space act on it. */
export function showOverlay(overlay: HTMLElement): void {
  overlay.hidden = false;
  overlay.querySelector<HTMLElement>('button')?.focus();
}

export function hideOverlay(overlay: HTMLElement): void {
  overlay.hidden = true;
}

/** Fills the relaunch story for the next era. False in the final era, which has no story to tell. */
export function renderStory(state: GameState): boolean {
  const nextEraId = findNextEraId(state);
  return nextEraId !== null && renderStoryOf(state, nextEraId);
}

function renderStoryOf(state: GameState, nextEraId: EraId): boolean {
  const story = findEntryStory(state.eraId, nextEraId);
  if (story === null) return false;
  elements.storyCard.innerHTML = renderRelaunchStory(state, nextEraId, story, renderRelaunchWarning(state));
  return true;
}

/** An act of the ending, from its top. */
export function showEnding(state: GameState, legacy: LegacyState, act: EndingAct): void {
  elements.endCard.innerHTML = renderEndingAct(state, act, null, legacy);
  elements.endCard.dataset['act'] = act;
  elements.endOverlay.scrollTop = 0;
  showOverlay(elements.endOverlay);
}

/** Another year in the archive: the page changes, the year picked keeps the focus. */
export function showArchiveYear(state: GameState, eraId: EraId): void {
  elements.endCard.innerHTML = renderEndingAct(state, 'archive', eraId);
  elements.endCard.querySelector<HTMLElement>(`[data-action="ending-year"][data-id="${eraId}"]`)?.focus();
}
