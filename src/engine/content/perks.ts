import type { PerkId, UpgradeEffect } from '../types';

/**
 * Perks: what Backlinks buy. Each is small and permanent, and works like any upgrade's effects, so the economy has
 * one place that adds things up. Levels are bought one at a time; each costs twice the last.
 */
export interface PerkDefinition {
  readonly id: PerkId;
  readonly name: string;
  readonly description: string;
  readonly effectsAt: (level: number) => readonly UpgradeEffect[];
}

/** Each level of Muscle memory: typing earns this much more. */
const TYPING_BONUS_PER_LEVEL = 0.1;
/** Each level of Regulars: every feature brings this many more visitors. */
const TRAFFIC_BONUS_PER_LEVEL = 0.05;
const NEUTRAL = 1;

export const PERK_IDS: readonly PerkId[] = ['muscle-memory', 'regulars'];

export const PERKS_BY_ID: Readonly<Record<PerkId, PerkDefinition>> = {
  'muscle-memory': {
    id: 'muscle-memory',
    name: 'Muscle memory',
    description: 'You’ve typed all of this before. Typing earns 10% more for each level.',
    effectsAt: (level) => [{ kind: 'keystroke-value-multiplier', factor: NEUTRAL + TYPING_BONUS_PER_LEVEL * level }],
  },
  regulars: {
    id: 'regulars',
    name: 'Regulars',
    description: 'People who knew your old site follow you to the new one: everything you build brings 5% more visitors for each level.',
    effectsAt: (level) => [{ kind: 'global-traffic-multiplier', factor: NEUTRAL + TRAFFIC_BONUS_PER_LEVEL * level }],
  },
};

export const NO_PERKS: Readonly<Record<PerkId, number>> = { 'muscle-memory': 0, regulars: 0 };

/** Every perk's effects at the levels given: what a run started with them gets. */
export function listPerkEffects(levels: Readonly<Record<PerkId, number>>): readonly UpgradeEffect[] {
  return PERK_IDS.flatMap((perkId) => PERKS_BY_ID[perkId].effectsAt(levels[perkId]));
}
