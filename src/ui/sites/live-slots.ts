import { calculateServerLoad, ERAS_BY_ID, findInfection, formatPercent, MS_PER_SECOND } from '../../engine';
import type { GameState } from '../../engine';
import { setHtmlIfChanged, setTextIfChanged } from '../dom';
import { calculateDisplayedCounter, renderCounterDigits, renderGalleryLightbox, renderGuestbookEntries, renderMusicStatus } from './features';
import { renderInfectionTimer } from './infections';
import { renderJavaScriptClock } from './site-1997';
import { formatMinutesAndSeconds } from './site-context';

/**
 * A part of the page that changes every frame. Rendering the whole block that often would restart its
 * animations, or replace a button under the player's finger.
 */
interface LiveSlot {
  readonly write: (element: HTMLElement, content: string) => void;
  /** The id comes from the slot's data-id. Null leaves the slot as it is. */
  readonly render: (id: number, state: GameState, nowMs: number) => string | null;
}

function renderInfectionTimerSlot(id: number, state: GameState): string | null {
  const infection = findInfection(state, id);
  return infection === null ? null : renderInfectionTimer(infection);
}

export type LiveSlotName = 'counter' | 'guestbook' | 'music' | 'js-clock' | 'gallery-lightbox' | 'infection-timer' | 'server-load' | 'spike-remaining';

/** Keys match the data-live attributes the renderers put on the page. */
const LIVE_SLOTS: Readonly<Record<LiveSlotName, LiveSlot>> = {
  counter: { write: setHtmlIfChanged, render: (_id, state) => renderCounterDigits(calculateDisplayedCounter(state)) },
  guestbook: { write: setHtmlIfChanged, render: (_id, state, nowMs) => renderGuestbookEntries(state, nowMs) },
  music: { write: setHtmlIfChanged, render: (_id, state, nowMs) => renderMusicStatus(state.eraId, nowMs) },
  'js-clock': { write: setTextIfChanged, render: (_id, state, nowMs) => renderJavaScriptClock(nowMs, ERAS_BY_ID[state.eraId].year) },
  'gallery-lightbox': { write: setHtmlIfChanged, render: (_id, state, nowMs) => renderGalleryLightbox(state.featureLevels['photo-gallery'], nowMs) },
  'infection-timer': { write: setTextIfChanged, render: renderInfectionTimerSlot },
  'server-load': { write: setTextIfChanged, render: (_id, state) => `${formatPercent(calculateServerLoad(state))} load` },
  'spike-remaining': { write: setTextIfChanged, render: (_id, state) => `${formatMinutesAndSeconds(Math.ceil(state.trafficSpikeRemainingMs / MS_PER_SECOND))} left` },
};

/** The first text of a slot, for markup rendered before the live update takes over. */
export function renderLiveSlotText(name: LiveSlotName, id: number, state: GameState, nowMs: number): string {
  return LIVE_SLOTS[name].render(id, state, nowMs) ?? '';
}

function writeLiveSlot(slot: LiveSlot, element: HTMLElement, state: GameState, nowMs: number): void {
  const content = slot.render(Number(element.dataset['id'] ?? 0), state, nowMs);
  if (content !== null) slot.write(element, content);
}

export function updateLiveSlots(container: HTMLElement, state: GameState, nowMs: number): void {
  Object.entries(LIVE_SLOTS).forEach(([name, slot]) => {
    container.querySelectorAll<HTMLElement>(`[data-live="${name}"]`).forEach((element) => writeLiveSlot(slot, element, state, nowMs));
  });
}
