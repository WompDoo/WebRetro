import { placeTip } from './badge-tooltip';

/**
 * Every small i's note, in one bubble above everything else. Inside a card or a scrolling panel the note was cut off
 * at the edges, so it lives at the top of the page, fixed to the screen: above the i, or below when there's no room,
 * never past the screen's sides. Hover it, or tap it on a phone (it takes the focus); anything else hides it.
 */

function findInfoTip(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('.info-tip') : null;
}

function hideBubble(bubble: HTMLElement): void {
  bubble.hidden = true;
}

function showBubbleFor(icon: HTMLElement, bubble: HTMLElement): void {
  const note = icon.querySelector('.info-tip-text');
  if (note === null) return hideBubble(bubble);
  bubble.innerHTML = note.innerHTML;
  bubble.hidden = false;
  const placement = placeTip(icon.getBoundingClientRect(), bubble.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
  bubble.style.left = `${placement.left}px`;
  bubble.style.top = `${placement.top}px`;
}

function showOrHide(icon: HTMLElement | null, bubble: HTMLElement): void {
  if (icon === null) hideBubble(bubble);
  else showBubbleFor(icon, bubble);
}

/** The i the bubble belongs to, while it's still on the page. A redrawn shop takes the old one away. */
function findShownIcon(shown: HTMLElement | null): HTMLElement | null {
  return shown !== null && shown.isConnected ? shown : null;
}

export function attachInfoTips(root: HTMLElement, bubble: HTMLElement): void {
  let shown: HTMLElement | null = null;
  const follow = (target: EventTarget | null): void => {
    shown = findInfoTip(target);
    showOrHide(shown, bubble);
  };
  root.addEventListener('mouseover', (event) => follow(event.target));
  root.addEventListener('focusin', (event) => follow(event.target));
  root.addEventListener('focusout', () => follow(null));
  // A scroll (focusing an i scrolls it into view) moves the i: the bubble moves with it, or goes if the i is gone.
  window.addEventListener('scroll', () => showOrHide(findShownIcon(shown), bubble), true);
}
