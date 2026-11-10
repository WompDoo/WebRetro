import { advanceSimulation, formatMoney, restoreGameState } from '../engine';
import { applyStep, createSeed, pushMessage, store } from './store';

interface StoredSave {
  readonly savedAtMs: number;
  readonly game: unknown;
}

const SAVE_STORAGE_KEY = 'under-construction:save';
/** A gap longer than this counts as time away: it runs as an offline catch-up, without hazards. */
export const OFFLINE_THRESHOLD_MS = 5_000;
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1_000;
const MS_PER_MINUTE = 60_000;

function readSave(): StoredSave | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredSave);
  } catch {
    return null;
  }
}

export function writeSave(): void {
  try {
    const save: StoredSave = { savedAtMs: Date.now(), game: store.game };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be blocked (private windows, previews). The game keeps running without saves.
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

function catchUpOffline(savedAtMs: number): void {
  const awayMs = Math.min(Date.now() - savedAtMs, MAX_OFFLINE_MS);
  if (awayMs < OFFLINE_THRESHOLD_MS) return;
  const moneyBefore = store.game.money;
  applyStep(advanceSimulation(store.game, awayMs, 'offline'));
  const earned = store.game.money - moneyBefore;
  if (earned > 0) pushMessage(`While you were away (${Math.round(awayMs / MS_PER_MINUTE)} min), your site earned ${formatMoney(earned)}.`);
}

function restoreFromStorage(): void {
  const stored = readSave();
  const restored = stored === null ? null : restoreGameState(stored.game, createSeed());
  if (restored === null || stored === null) return;
  store.game = restored;
  catchUpOffline(stored.savedAtMs);
}

/** A hot-reload snapshot wins over the saved game; without either, the new game in the store stays. */
export function restoreGame(hotData: unknown): void {
  const hotSave = typeof hotData === 'object' && hotData !== null ? (hotData as { save?: unknown }).save : undefined;
  const fromHot = restoreGameState(hotSave, createSeed());
  if (fromHot === null) {
    restoreFromStorage();
    return;
  }
  store.game = fromHot;
}
