import { QUICK_FIX_BONUS_MS, QUICK_FIX_TRAFFIC_FACTOR } from '../constants';
import type { BuffDefinition, BuffId } from '../types';

/**
 * Buffs: the good kind of trouble. Each one multiplies one number for a short while, and all of them share one look
 * (a chip with a countdown, and whatever they boost on fire). Earned at the keyboard, never offline.
 */
export const BUFF_IDS: readonly BuffId[] = ['on-fire', 'quick-fix', 'sponsor-slot', 'launch-day'];

export const BUFFS_BY_ID: Readonly<Record<BuffId, BuffDefinition>> = {
  // Earned by typing without typos: the heat meter fills, and for fifteen seconds every keystroke pays triple. A burst,
  // not a state: half a minute of it was on two fifths of the time, and saved an active player 12% of the game.
  'on-fire': { id: 'on-fire', name: 'On fire', icon: '🔥', target: 'typing', factor: 3, durationMs: 15_000 },
  // Earned by winning an infection's minigame fast: visitors notice a site that gets fixed quickly.
  'quick-fix': { id: 'quick-fix', name: 'Quick fix', icon: '🛠️', target: 'traffic', factor: QUICK_FIX_TRAFFIC_FACTOR, durationMs: QUICK_FIX_BONUS_MS },
  // Won by typing a sponsor's code before they change their mind: for 40 seconds, every banner pays double. Offers come
  // every 3 to 5 minutes, so an active player has it about a sixth of the time: +17% ad revenue, not +50%.
  'sponsor-slot': { id: 'sponsor-slot', name: 'Sponsor slot', icon: '💰', target: 'ad-value', factor: 2, durationMs: 40_000 },
  // Won by hitting the launch window three times before the launch slips: for 45 seconds, half as many visitors
  // again come to see it. Offers are split between this and the sponsor, so each comes about every eight minutes.
  'launch-day': { id: 'launch-day', name: 'Launch day', icon: '🚀', target: 'traffic', factor: 1.5, durationMs: 45_000 },
};
