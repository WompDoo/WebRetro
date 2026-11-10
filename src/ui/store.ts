import { createInitialGameState, ERAS_BY_ID } from '../engine';
import type { GameEvent, GameState, GameStep } from '../engine';
import type { ShopTab } from './render-shop';

export interface NewsItem {
  readonly id: number;
  readonly year: number;
  readonly message: string;
}

/** On phones one section shows at a time, picked from the bottom tab bar. */
export type MobileTab = 'site' | 'code' | 'shop' | 'inbox';
export const MOBILE_TABS: readonly MobileTab[] = ['site', 'code', 'shop', 'inbox'];

interface UiStore {
  game: GameState;
  shopTab: ShopTab;
  mobileTab: MobileTab;
  /** Phones show the objective as one line until you tap it open. */
  isGoalOpen: boolean;
  news: readonly NewsItem[];
  newsCounter: number;
  /** The newest news item seen on the phone's Inbox tab; anything newer counts as unread. */
  lastSeenNewsId: number;
}

const MAX_NEWS_ITEMS = 14;
const SEED_RANGE = 2 ** 31;

export function createSeed(): number {
  return Math.floor(Math.random() * SEED_RANGE);
}

/**
 * The UI's only mutable state. The engine stays pure (state in, state out); this holds its latest result
 * plus what only the UI cares about. Everything else is derived from it on render.
 */
export const store: UiStore = {
  game: createInitialGameState(createSeed()),
  shopTab: 'learn',
  mobileTab: 'code',
  isGoalOpen: false,
  news: [],
  newsCounter: 0,
  lastSeenNewsId: 0,
};

export function updateGame(update: (state: GameState) => GameState): void {
  store.game = update(store.game);
}

export function pushNews(events: readonly GameEvent[]): void {
  const year = ERAS_BY_ID[store.game.eraId].year;
  const items = events.map<NewsItem>((event) => ({ id: ++store.newsCounter, year, message: event.message }));
  store.news = [...items.reverse(), ...store.news].slice(0, MAX_NEWS_ITEMS);
}

export function pushMessage(message: string): void {
  pushNews([{ kind: 'milestone', message }]);
}

export function applyStep(step: GameStep): void {
  store.game = step.state;
  pushNews(step.events);
}

/** A new game starts where the earning starts: the code editor. A returning player lands on their site. */
export function pickStartingMobileTab(game: GameState): MobileTab {
  return game.lifetimeEarnings > 0 ? 'site' : 'code';
}

export function startNewGame(): void {
  store.game = createInitialGameState(createSeed());
  store.news = [];
  store.mobileTab = pickStartingMobileTab(store.game);
}

export function countUnreadNews(): number {
  return store.news.filter((item) => item.id > store.lastSeenNewsId).length;
}

export function markNewsRead(): void {
  store.lastSeenNewsId = store.news[0]?.id ?? store.lastSeenNewsId;
}
