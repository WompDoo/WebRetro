import type { PerkId, UpgradeEffect } from '../types';

/**
 * Perks: what Backlinks buy. Each is small and permanent, and works like any upgrade's effects, so the economy has
 * one place that adds things up. Levels are bought one at a time; each costs twice the last.
 */
export interface PerkDefinition {
  readonly id: PerkId;
  readonly name: string;
  readonly description: string;
  /** Some perks stop making sense past a point: three skills known, six quiet minutes. */
  readonly maxLevel: number;
  /** What the perk does all the time, as effects. Perks that act when an era starts have none (see era-start.ts). */
  readonly effectsAt: (level: number) => readonly UpgradeEffect[];
  /** A price of its own, for a perk that isn't bought level by level. */
  readonly price?: number;
}

/** Each level of Muscle memory: typing earns this much more. */
const TYPING_BONUS_PER_LEVEL = 0.1;
/** Each level of Regulars: every feature brings this many more visitors. */
const TRAFFIC_BONUS_PER_LEVEL = 0.05;
/** Each level of Templates: features cost this share of their price, compounding. */
const TEMPLATE_PRICE_FACTOR = 0.9;
/** Each level of the Ops runbook: Ops items cost this share of their price, compounding. */
const RUNBOOK_PRICE_FACTOR = 0.8;
const NEUTRAL = 1;
const UNCAPPED = Number.POSITIVE_INFINITY;
/** Known tags and Early warning stop here: past it, an era's opening would be skipped, not shortened. */
const OPENING_PERK_CAP = 3;
const NO_EFFECTS = (): readonly UpgradeEffect[] => [];

export const PERK_IDS: readonly PerkId[] = ['muscle-memory', 'regulars', 'templates', 'ops-runbook', 'known-tags', 'early-warning', 'old-savings', 'serial-founder'];

/** A few runs of saving: by then a player has earned the right to break the tree. */
const SERIAL_FOUNDER_PRICE = 50;

export const PERKS_BY_ID: Readonly<Record<PerkId, PerkDefinition>> = {
  'muscle-memory': {
    id: 'muscle-memory',
    maxLevel: UNCAPPED,
    name: 'Muscle memory',
    description: 'You’ve typed all of this before. Typing earns 10% more for each level.',
    effectsAt: (level) => [{ kind: 'keystroke-value-multiplier', factor: NEUTRAL + TYPING_BONUS_PER_LEVEL * level }],
  },
  regulars: {
    id: 'regulars',
    maxLevel: UNCAPPED,
    name: 'Regulars',
    description: 'People who knew your old site follow you to the new one: everything you build brings 5% more visitors for each level.',
    effectsAt: (level) => [{ kind: 'global-traffic-multiplier', factor: NEUTRAL + TRAFFIC_BONUS_PER_LEVEL * level }],
  },
  templates: {
    id: 'templates',
    maxLevel: UNCAPPED,
    name: 'Templates',
    description: 'You’ve built all of these before, and kept the code. Every feature costs 10% less for each level.',
    effectsAt: (level) => [{ kind: 'feature-cost-multiplier', factor: TEMPLATE_PRICE_FACTOR ** level }],
  },
  'ops-runbook': {
    id: 'ops-runbook',
    maxLevel: UNCAPPED,
    name: 'Ops runbook',
    description: 'A wiki page of how you set up domains, backups and certificates last time. Ops items cost 20% less for each level.',
    effectsAt: (level) => [{ kind: 'ops-cost-multiplier', factor: RUNBOOK_PRICE_FACTOR ** level }],
  },
  'known-tags': {
    id: 'known-tags',
    maxLevel: OPENING_PERK_CAP,
    name: 'Known tags',
    description: 'Every era starts with its cheapest skill already learned, one more for each level. Never a framework: that choice stays yours.',
    effectsAt: NO_EFFECTS,
  },
  'early-warning': {
    id: 'early-warning',
    maxLevel: OPENING_PERK_CAP,
    name: 'Early warning',
    description: 'You know what breaks first. Each era’s trouble arrives 2 minutes later for each level.',
    effectsAt: NO_EFFECTS,
  },
  'old-savings': {
    id: 'old-savings',
    maxLevel: UNCAPPED,
    name: 'Old savings',
    description: 'Something put aside from the last site. A new site starts with $1,000 for each level.',
    effectsAt: NO_EFFECTS,
  },
  'serial-founder': {
    id: 'serial-founder',
    maxLevel: 1,
    name: 'Serial founder',
    description: 'You’ve pivoted before. Any specialization can be taken in its era, whatever your site was before. Still one per era.',
    effectsAt: NO_EFFECTS,
    price: SERIAL_FOUNDER_PRICE,
  },
};

export const NO_PERKS: Readonly<Record<PerkId, number>> = { 'muscle-memory': 0, regulars: 0, templates: 0, 'ops-runbook': 0, 'known-tags': 0, 'early-warning': 0, 'old-savings': 0, 'serial-founder': 0 };

/** Every perk's effects at the levels given: what a run started with them gets. */
export function listPerkEffects(levels: Readonly<Record<PerkId, number>>): readonly UpgradeEffect[] {
  return PERK_IDS.flatMap((perkId) => PERKS_BY_ID[perkId].effectsAt(levels[perkId]));
}
