import { QUICK_FIX_BONUS_MS, QUICK_FIX_TRAFFIC_FACTOR } from '../constants';
import type { BuffDefinition, BuffId } from '../types';

/**
 * Buffs: the good kind of trouble. Each one multiplies one number for a short while, and all of them share one look
 * (a chip with a countdown, and whatever they boost on fire). Earned at the keyboard, never offline.
 */
export const BUFF_IDS: readonly BuffId[] = ['on-fire', 'quick-fix', 'sponsor-slot'];

export const BUFFS_BY_ID: Readonly<Record<BuffId, BuffDefinition>> = {
  // Earned by typing without typos: the heat meter fills, and for half a minute every keystroke pays triple.
  'on-fire': { id: 'on-fire', name: 'On fire', icon: '🔥', target: 'typing', factor: 3, durationMs: 30_000 },
  // Earned by winning an infection's minigame fast: visitors notice a site that gets fixed quickly.
  'quick-fix': { id: 'quick-fix', name: 'Quick fix', icon: '🛠️', target: 'traffic', factor: QUICK_FIX_TRAFFIC_FACTOR, durationMs: QUICK_FIX_BONUS_MS },
  // Won by typing a sponsor's code before they change their mind: for a minute, every banner pays triple.
  'sponsor-slot': { id: 'sponsor-slot', name: 'Sponsor slot', icon: '💰', target: 'ad-value', factor: 3, durationMs: 60_000 },
};
