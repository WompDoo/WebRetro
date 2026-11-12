import type { GameState, Popup } from '../engine';
import { escapeHtml, pickCyclic } from './dom';
import type { PopupButton, PopupButtonAction, PopupButtonStyle, PopupCopy, PopupDesign } from './popup-copy';
import { ERA_PRESENTATION } from './presentation';
import { fillSiteName } from './sites';

/** Must match .popup's width in page.html. */
const POPUP_WIDTH_CSS = 'min(280px, 88%)';
const POPUP_HEIGHT_ESTIMATE_PX = 260;
const POPUP_EDGE_GAP_PX = 8;
const VARIANT_SLOTS = 1_000;
const FALLBACK_POPUP: PopupCopy = { design: 'dialog', title: 'Ad', headline: 'CLICK HERE', body: '', details: [], buttons: [], scamOutcome: '' };

type DesignRenderer = (copy: PopupCopy) => string;

const BUTTON_ACTIONS: Readonly<Record<PopupButtonAction, string>> = { dismiss: 'close-popup', scam: 'accept-popup' };
const BUTTON_CLASSES: Readonly<Record<PopupButtonStyle, string>> = {
  button: 'popup-button',
  primary: 'popup-button is-primary',
  cta: 'popup-button is-cta',
  link: 'popup-link',
};

const text = (value: string, className: string): string => (value === '' ? '' : `<p class="${className}">${escapeHtml(value)}</p>`);
const detailList = (copy: PopupCopy, className: string, mark: string): string =>
  `<ul class="${className}">${copy.details.map((detail) => `<li><span class="popup-mark" aria-hidden="true">${mark}</span>${escapeHtml(detail)}</li>`).join('')}</ul>`;

function renderButton(button: PopupButton, popupId: number): string {
  return `<button type="button" class="${BUTTON_CLASSES[button.style]}" data-action="${BUTTON_ACTIONS[button.action]}" data-id="${popupId}">${escapeHtml(button.label)}</button>`;
}

function renderButtons(copy: PopupCopy, popupId: number): string {
  return copy.buttons.length === 0 ? '' : `<div class="popup-buttons">${copy.buttons.map((button) => renderButton(button, popupId)).join('')}</div>`;
}

/** Each design draws its own content; the buttons come from the copy, so any design can have any mix. */
const DESIGN_RENDERERS: Readonly<Record<PopupDesign, DesignRenderer>> = {
  dialog: (copy) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}`,
  alert: (copy) =>
    `<div class="popup-alert"><span class="popup-alert-icon" aria-hidden="true">!</span><div>${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}</div></div>`,
  prize: (copy) => `<span class="popup-starburst" aria-hidden="true">WINNER!</span>${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}`,
  download: (copy) =>
    `${text(copy.headline, 'popup-filename')}${text(copy.body, 'popup-text')}<span class="popup-progress" aria-hidden="true"><span></span></span>${copy.details.map((detail) => text(detail, 'popup-stat')).join('')}`,
  lightbox: (copy) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}`,
  survey: (copy) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${detailList(copy, 'popup-options', '○')}`,
  messenger: (copy) => `<ul class="popup-chat">${copy.details.map((line) => `<li><b>${escapeHtml(copy.title)}:</b> ${escapeHtml(line)}</li>`).join('')}</ul>`,
  toolbar: (copy) => `${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}${detailList(copy, 'popup-checks', '☑')}`,
  interstitial: (copy) => `<span class="interstitial-art" aria-hidden="true"></span>${text(copy.headline, 'popup-headline')}${text(copy.body, 'popup-text')}`,
};

const MESSENGER_INPUT = '<span class="popup-chat-input">Type a message…</span>';

/** How long an interstitial counts down before its Skip button shows. */
const INTERSTITIAL_SKIP_SECONDS = 5;
/** The × sneaks in this many seconds before the countdown ends, for whoever spots it. */
const INTERSTITIAL_CLOSE_EARLY_SECONDS = 3;

/**
 * "Skip in 5…", then "Skip ad ▸". The countdown is all CSS: an animated integer drives a counter, and the
 * button is hidden until its delay is up. Nothing runs on the main thread each second, and nothing re-renders.
 */
function renderInterstitialSkip(popupId: number): string {
  return `<span class="interstitial-skip-area"><span class="interstitial-countdown" aria-hidden="true">Skip in </span><button type="button" class="interstitial-skip" data-action="close-popup" data-id="${popupId}">Skip ad ▸</button></span>`;
}

/** Extras that only some designs have: the chat box under a messenger, the skip button on an interstitial. */
const DESIGN_EXTRAS: Readonly<Partial<Record<PopupDesign, (popupId: number) => string>>> = {
  messenger: () => MESSENGER_INPUT,
  interstitial: renderInterstitialSkip,
};

function renderPopupBody(copy: PopupCopy, popupId: number): string {
  const extra = DESIGN_EXTRAS[copy.design]?.(popupId) ?? '';
  return `${DESIGN_RENDERERS[copy.design](copy)}${renderButtons(copy, popupId)}${extra}`;
}

/** The interstitial's timings, as custom properties: TypeScript owns the numbers, CSS runs the clock. */
const INTERSTITIAL_TIMING = `--skip-seconds:${INTERSTITIAL_SKIP_SECONDS};--close-after:${INTERSTITIAL_SKIP_SECONDS - INTERSTITIAL_CLOSE_EARLY_SECONDS}s`;

function renderTimingStyle(copy: PopupCopy): string {
  return copy.design === 'interstitial' ? `;${INTERSTITIAL_TIMING}` : '';
}

function pickCopy(state: GameState, popup: Popup): PopupCopy {
  return pickCyclic(ERA_PRESENTATION[state.eraId].popups, Math.floor(popup.variantRoll * VARIANT_SLOTS), FALLBACK_POPUP);
}

export function findPopupCopy(state: GameState, popupId: number): PopupCopy | null {
  const popup = state.popups.find((candidate) => candidate.id === popupId);
  return popup === undefined ? null : pickCopy(state, popup);
}

export function renderPopup(state: GameState, popup: Popup): string {
  const copy = pickCopy(state, popup);
  // Anchors are fractions of the free space, so a pop-up never hangs off the edge and hides its close button.
  // Custom properties, not left/top: the phone view puts every pop-up full screen instead.
  const left = `calc((100% - ${POPUP_WIDTH_CSS}) * ${popup.anchorX.toFixed(3)})`;
  const top = `max(${POPUP_EDGE_GAP_PX}px, calc((100% - ${POPUP_HEIGHT_ESTIMATE_PX}px) * ${popup.anchorY.toFixed(3)} + ${POPUP_EDGE_GAP_PX}px))`;
  const title = copy.design === 'messenger' ? `Chat with ${copy.title}` : copy.title;
  // Copy says {site} for the player's own address ("www.{site}.com wants to show notifications").
  return fillSiteName(`<div class="popup popup--${copy.design}" data-popup-id="${popup.id}" role="dialog" aria-label="${escapeHtml(title)}" style="--popup-left:${left};--popup-top:${top};z-index:${popup.id}${renderTimingStyle(copy)}">
    <div class="popup-titlebar"><span>${escapeHtml(title)}</span><button type="button" class="popup-close" data-action="close-popup" data-id="${popup.id}" aria-label="Close pop-up">×</button></div>
    <div class="popup-body">${renderPopupBody(copy, popup.id)}</div>
  </div>`, state);
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
