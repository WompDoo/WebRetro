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

const PREFERENCES_STORAGE_KEY = 'under-construction:preferences';

/** The player's own settings. They aren't part of any game: a new game, a playtest jump or a backup keeps them. */
interface StoredPreferences {
  readonly isScrollJackingOn: boolean;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isStoredPreferences(value: unknown): value is StoredPreferences {
  return isRecord(value) && typeof value['isScrollJackingOn'] === 'boolean';
}

/** Throws on text that isn't JSON; JSON of the wrong shape is no preferences at all. */
export function parsePreferences(raw: string): StoredPreferences | null {
  const parsed: unknown = JSON.parse(raw);
  return isStoredPreferences(parsed) ? parsed : null;
}

function readPreferences(): StoredPreferences | null {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw === null ? null : parsePreferences(raw);
  } catch {
    // Blocked storage or a damaged entry: the defaults stand.
    return null;
  }
}

export function restorePreferences(): void {
  const stored = readPreferences();
  if (stored !== null) store.isScrollJackingOn = stored.isScrollJackingOn;
}

export function writePreferences(): void {
  try {
    const preferences: StoredPreferences = { isScrollJackingOn: store.isScrollJackingOn };
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be blocked (private windows, previews). The switch still works until the page closes.
  }
}

const BACKUP_STORAGE_KEY = 'under-construction:save-backup';
const PLAYTEST_FLAG_KEY = 'under-construction:playtest';

/** Before the first playtest jump, your own game is copied aside so you can come back to it. */
export function backUpOwnGameOnce(): void {
  try {
    if (window.localStorage.getItem(BACKUP_STORAGE_KEY) !== null) return;
    window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({ savedAtMs: Date.now(), game: store.game }));
  } catch {
    // Without storage there is no save to protect either.
  }
}

export function hasOwnGameBackup(): boolean {
  try {
    return window.localStorage.getItem(BACKUP_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Puts your own game back and forgets the backup. False when there was nothing to restore. */
export function restoreOwnGame(): boolean {
  try {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    const restored = raw === null ? null : restoreGameState((JSON.parse(raw) as StoredSave).game, createSeed());
    window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    if (restored === null) return false;
    store.game = restored;
    writeSave();
    return true;
  } catch {
    return false;
  }
}

export function readPlaytestFlag(): boolean {
  try {
    return window.localStorage.getItem(PLAYTEST_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function writePlaytestFlag(isEnabled: boolean): void {
  try {
    if (isEnabled) window.localStorage.setItem(PLAYTEST_FLAG_KEY, '1');
    else window.localStorage.removeItem(PLAYTEST_FLAG_KEY);
  } catch {
    // The flag just won't survive a reload.
  }
}
