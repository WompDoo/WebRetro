import { ERAS_BY_ID, findVirus } from '../../engine';
import type { GameState } from '../../engine';
import { setHtmlIfChanged, setTextIfChanged } from '../dom';
import { calculateDisplayedCounter, renderCounterDigits, renderGalleryLightbox, renderGuestbookEntries, renderMusicStatus } from './features';
import { renderVirusTimer } from './infections';
import { renderJavaScriptClock } from './site-1997';

/** A part of the page that changes every frame. Rendering the whole page that often would restart its animations. */
interface LiveSlot {
  readonly write: (element: HTMLElement, content: string) => void;
  /** Null leaves the slot as it is. */
  readonly render: (element: HTMLElement, state: GameState, nowMs: number) => string | null;
}

function renderVirusTimerSlot(element: HTMLElement, state: GameState): string | null {
  const virus = findVirus(state, Number(element.dataset['id']));
  return virus === null ? null : renderVirusTimer(virus);
}

/** Keys match the data-live attributes the site renderers put on the page. */
const LIVE_SLOTS: Readonly<Record<string, LiveSlot>> = {
  counter: { write: setHtmlIfChanged, render: (_element, state) => renderCounterDigits(calculateDisplayedCounter(state)) },
  guestbook: { write: setHtmlIfChanged, render: (_element, state, nowMs) => renderGuestbookEntries(state.eraId, state.featureLevels.guestbook, nowMs) },
  music: { write: setHtmlIfChanged, render: (_element, state, nowMs) => renderMusicStatus(state.eraId, nowMs) },
  'js-clock': { write: setTextIfChanged, render: (_element, state, nowMs) => renderJavaScriptClock(nowMs, ERAS_BY_ID[state.eraId].year) },
  'gallery-lightbox': { write: setHtmlIfChanged, render: (_element, state, nowMs) => renderGalleryLightbox(state.featureLevels['photo-gallery'], nowMs) },
  'virus-timer': { write: setTextIfChanged, render: renderVirusTimerSlot },
};

function writeLiveSlot(slot: LiveSlot, element: HTMLElement, state: GameState, nowMs: number): void {
  const content = slot.render(element, state, nowMs);
  if (content !== null) slot.write(element, content);
}

export function updateLiveSlots(site: HTMLElement, state: GameState, nowMs: number): void {
  Object.entries(LIVE_SLOTS).forEach(([name, slot]) => {
    site.querySelectorAll<HTMLElement>(`[data-live="${name}"]`).forEach((element) => writeLiveSlot(slot, element, state, nowMs));
  });
}
