/**
 * The shop's tab badges count what you could buy and haven't looked at yet. Once a card has been on screen while you
 * could buy it, it stops counting: an ad you're not placing on purpose, a defense you don't want, nag no more. What
 * can be bought again and again counts again for the next one: the next level of a feature, the next banner.
 *
 * A card is known by its buy button (action and id) or, for a specialization card, by its specialization. Which keys
 * that card stands for right now, and whether they're news, the game state decides (render-shop.ts): a card on screen
 * you can't afford or choose yet isn't seen as anything.
 */

/** Most of the card on screen counts as seen. */
const SEEN_SHARE = 0.6;
/** Every shop card's buy button but the bulk ones, the Specialize tab's Choose buttons, and its cards. */
const WATCHED = 'button[data-cost]:not([data-bulk]), [data-action="open-specialization"], .spec-card[data-specialization]';
/** Between a card's key and which one of it this is: the level, the banner count. */
const INSTANCE_MARK = '#';

/** "buy-feature:blog#25": the blog's 26th level. */
export function instanceKey(key: string, instance: number): string {
  return `${key}${INSTANCE_MARK}${instance}`;
}

export function baseOfShopKey(key: string): string {
  return key.split(INSTANCE_MARK)[0] ?? key;
}

/** Remembers a key as seen, dropping older ones of the same card (last level's), so the set doesn't grow forever. */
export function rememberSeenKey(seen: Set<string>, key: string): boolean {
  if (seen.has(key)) return false;
  [...seen].filter((old) => baseOfShopKey(old) === baseOfShopKey(key)).forEach((old) => seen.delete(old));
  seen.add(key);
  return true;
}

export function describeCardKey(element: HTMLElement): string {
  const specializationId = element.dataset['specialization'];
  return specializationId === undefined ? `${element.dataset['action'] ?? ''}:${element.dataset['id'] ?? ''}` : `spec-card:${specializationId}`;
}

export interface ShopSeenWatcher {
  /** After the shop body is drawn: watch its cards. */
  readonly watch: (body: HTMLElement) => void;
  /** After prices are checked: what's on screen now may have become buyable. */
  readonly reportInView: () => void;
}

export function createShopSeenWatcher(onSeen: (cardKeys: readonly string[]) => void): ShopSeenWatcher {
  const inView = new Set<HTMLElement>();
  const report = (): void => {
    if (inView.size > 0) onSeen([...inView].map(describeCardKey));
  };
  const track = (entry: IntersectionObserverEntry): void => {
    if (!(entry.target instanceof HTMLElement)) return;
    if (entry.isIntersecting) inView.add(entry.target);
    else inView.delete(entry.target);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(track);
    report();
  }, { threshold: SEEN_SHARE });
  return {
    watch: (body) => {
      observer.disconnect();
      inView.clear();
      body.querySelectorAll<HTMLElement>(WATCHED).forEach((element) => observer.observe(element));
    },
    reportInView: report,
  };
}
