import { createInitialGameState, ERAS_BY_ID } from '../engine';
import type { GameEvent, GameState, GameStep } from '../engine';
import type { DeviceView } from './browser-chrome';
import type { PlaytestSpeed } from './playtest';
import type { BuyAmount, ShopTab } from './render-shop';

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
  /** Levels per click in the Build tab. */
  buyAmount: BuyAmount;
  /** The editor tab picked by the player; null means the era's main file. */
  editorFile: string | null;
  mobileTab: MobileTab;
  /** Desktop or phone: the browser's switch, from the first era with phone visitors. */
  deviceView: DeviceView;
  /** Phones show the objective as one line until you tap it open. */
  isGoalOpen: boolean;
  /**
   * The player's comfort switch for the one-pager: off, the story stays (and earns the same) but stops taking
   * over the page's scrolling. Saved apart from the game, so a new game or a playtest jump keeps it.
   */
  isScrollJackingOn: boolean;
  news: readonly NewsItem[];
  newsCounter: number;
  /** The newest news item seen on the phone's Inbox tab; anything newer counts as unread. */
  lastSeenNewsId: number;
  /** The playtest panel: hidden from players unless asked for (?playtest, or five taps on the money). */
  isPlaytestEnabled: boolean;
  playtestSpeed: PlaytestSpeed;
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
  buyAmount: 1,
  editorFile: null,
  mobileTab: 'code',
  deviceView: 'desktop',
  isGoalOpen: false,
  isScrollJackingOn: true,
  news: [],
  newsCounter: 0,
  lastSeenNewsId: 0,
  isPlaytestEnabled: false,
  playtestSpeed: 1,
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

/** Swaps in another game (a new one, a playtest preset, a restored backup) and resets what the UI remembers. */
export function replaceGame(game: GameState): void {
  store.game = game;
  store.news = [];
  store.editorFile = null;
  store.deviceView = 'desktop';
  store.mobileTab = pickStartingMobileTab(store.game);
}

export function startNewGame(): void {
  replaceGame(createInitialGameState(createSeed()));
}

export function countUnreadNews(): number {
  return store.news.filter((item) => item.id > store.lastSeenNewsId).length;
}

export function markNewsRead(): void {
  store.lastSeenNewsId = store.news[0]?.id ?? store.lastSeenNewsId;
}
