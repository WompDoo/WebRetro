/**
 * The shop's tab badges count what you could buy and haven't looked at yet. Once a card has been on screen while you
 * could afford it, it stops counting: an ad you're not placing on purpose, a defense you don't want, nag no more.
 * A card is known by its buy button: its action and id, the same keys the badges count (render-shop.ts).
 */

/** Most of the button on screen counts as seen. */
const SEEN_SHARE = 0.6;
/** Every shop card's buy button but the bulk ones, and the Specialize tab's Choose buttons. */
const WATCHED = 'button[data-cost]:not([data-bulk]), [data-action="open-specialization"]';

export function describeCardKey(element: HTMLElement): string {
  return `${element.dataset['action'] ?? ''}:${element.dataset['id'] ?? ''}`;
}

function isAffordable(element: HTMLElement): boolean {
  return !(element instanceof HTMLButtonElement && element.disabled);
}

export interface ShopSeenWatcher {
  /** After the shop body is drawn: watch its cards. */
  readonly watch: (body: HTMLElement) => void;
  /** After prices are checked: a card on screen that just became affordable is seen too. */
  readonly markAffordableInView: () => void;
}

export function createShopSeenWatcher(onSeen: (key: string) => void): ShopSeenWatcher {
  const inView = new Set<HTMLElement>();
  const markIfAffordable = (element: HTMLElement): void => {
    if (isAffordable(element)) onSeen(describeCardKey(element));
  };
  const track = (entry: IntersectionObserverEntry): void => {
    if (!(entry.target instanceof HTMLElement)) return;
    if (entry.isIntersecting) inView.add(entry.target);
    else inView.delete(entry.target);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(track);
    inView.forEach(markIfAffordable);
  }, { threshold: SEEN_SHARE });
  return {
    watch: (body) => {
      observer.disconnect();
      inView.clear();
      body.querySelectorAll<HTMLElement>(WATCHED).forEach((element) => observer.observe(element));
    },
    markAffordableInView: () => inView.forEach(markIfAffordable),
  };
}
