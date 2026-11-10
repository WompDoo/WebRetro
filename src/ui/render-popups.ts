import type { GameState, Popup } from '../engine';
import { escapeHtml, pickCyclic } from './dom';
import type { PopupCopy, PopupDesign } from './popup-copy';
import { ERA_PRESENTATION } from './presentation';

/** Must match .popup's width in page.html. */
const POPUP_WIDTH_CSS = 'min(280px, 88%)';
const POPUP_HEIGHT_ESTIMATE_PX = 260;
const POPUP_EDGE_GAP_PX = 8;
const VARIANT_SLOTS = 1_000;
const FALLBACK_POPUP: PopupCopy = { design: 'dialog', title: 'Ad', headline: 'CLICK HERE', body: '', details: [], dismissLabel: 'Close' };

type DesignRenderer = (copy: PopupCopy, popupId: number) => string;

const text = (value: string, className: string): string => (value === '' ? '' : `<p class="${className}">${escapeHtml(value)}</p>`);
const dismissButton = (copy: PopupCopy, popupId: number, className = 'popup-dismiss'): string =>
  `<button type="button" class="${className}" data-action="close-popup" data-id="${popupId}">${escapeHtml(copy.dismissLabel)}</button>`;
const detailList = (copy: PopupCopy, className: string, mark: string): string =>
  `<ul class="${className}">${copy.details.map((detail) => `<li><span class="popup-mark" aria-hidden="true">${mark}</span>${escapeHtml(detail)}</li>`).join('')}</ul>`;

const DESIGN_RENDERERS: Readonly<Record<PopupDesign, DesignRenderer>> = {
  dialog: (copy, id) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${dismissButton(copy, id)}`,
  alert: (copy, id) =>
    `<div class="popup-alert"><span class="popup-alert-icon" aria-hidden="true">!</span><div>${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}</div></div><div class="popup-buttons"><span class="popup-fake-button">OK</span>${dismissButton(copy, id)}</div>`,
  prize: (copy, id) =>
    `<span class="popup-starburst" aria-hidden="true">WINNER!</span>${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}<span class="popup-fake-cta">CLAIM PRIZE NOW &gt;&gt;</span>${dismissButton(copy, id, 'popup-dismiss-link')}`,
  download: (copy, id) =>
    `${text(copy.headline, 'popup-filename')}${text(copy.body, 'popup-text')}<span class="popup-progress" aria-hidden="true"><span></span></span>${copy.details.map((detail) => text(detail, 'popup-stat')).join('')}<div class="popup-buttons">${dismissButton(copy, id)}</div>`,
  lightbox: (copy, id) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${dismissButton(copy, id)}`,
  survey: (copy, id) =>
    `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${detailList(copy, 'popup-options', '○')}<div class="popup-buttons"><span class="popup-fake-button">Submit</span>${dismissButton(copy, id)}</div>`,
  messenger: (copy) =>
    `<ul class="popup-chat">${copy.details.map((line) => `<li><b>${escapeHtml(copy.title)}:</b> ${escapeHtml(line)}</li>`).join('')}</ul><span class="popup-chat-input">Type a message…</span>`,
  toolbar: (copy, id) =>
    `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${detailList(copy, 'popup-checks', '☑')}<div class="popup-buttons"><span class="popup-fake-button is-primary">Install</span>${dismissButton(copy, id)}</div>`,
};

function pickCopy(state: GameState, popup: Popup): PopupCopy {
  return pickCyclic(ERA_PRESENTATION[state.eraId].popups, Math.floor(popup.variantRoll * VARIANT_SLOTS), FALLBACK_POPUP);
}

function renderPopup(state: GameState, popup: Popup): string {
  const copy = pickCopy(state, popup);
  // Anchors are fractions of the free space, so a pop-up never hangs off the edge and hides its close button.
  const left = `calc((100% - ${POPUP_WIDTH_CSS}) * ${popup.anchorX.toFixed(3)})`;
  const top = `max(${POPUP_EDGE_GAP_PX}px, calc((100% - ${POPUP_HEIGHT_ESTIMATE_PX}px) * ${popup.anchorY.toFixed(3)} + ${POPUP_EDGE_GAP_PX}px))`;
  const title = copy.design === 'messenger' ? `Chat with ${copy.title}` : copy.title;
  return `<div class="popup popup--${copy.design}" data-popup-id="${popup.id}" role="dialog" aria-label="${escapeHtml(title)}" style="left:${left};top:${top};z-index:${popup.id}">
    <div class="popup-titlebar"><span>${escapeHtml(title)}</span><button type="button" class="popup-close" data-action="close-popup" data-id="${popup.id}" aria-label="Close pop-up">×</button></div>
    <div class="popup-body">${DESIGN_RENDERERS[copy.design](copy, popup.id)}</div>
  </div>`;
}

/**
 * Keyed update: removes closed pop-ups and appends new ones, leaving the rest untouched.
 * Rebuilding the whole layer would replay every pop-up's entrance animation each time one closes.
 */
export function syncPopups(layer: HTMLElement, state: GameState): void {
  const openIds = new Set(state.popups.map((popup) => String(popup.id)));
  layer.querySelectorAll<HTMLElement>('[data-popup-id]').forEach((node) => {
    if (!openIds.has(node.dataset['popupId'] ?? '')) node.remove();
  });
  state.popups
    .filter((popup) => layer.querySelector(`[data-popup-id="${popup.id}"]`) === null)
    .forEach((popup) => layer.insertAdjacentHTML('beforeend', renderPopup(state, popup)));
}

export function calculatePopupSignature(state: GameState): string {
  return `${state.eraId}|${state.popups.map((popup) => popup.id).join(',')}`;
}
