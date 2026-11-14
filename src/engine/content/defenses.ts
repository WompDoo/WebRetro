import type { DefenseDefinition, DefenseId, EraId } from '../types';
import { ERA_IDS } from './era-ids';

const ANTIVIRUS_CLEAN_DELAY_MS = 6_000;
const NO_DELAY_MS = 0;
const NO_PENALTY = 1;
const NO_UPKEEP = 0;

/** In shop order: an upgrade comes right after what it upgrades. */
export const DEFENSE_IDS: readonly DefenseId[] = ['antivirus', 'premium-ad-network', 'no-popups', 'captcha', 'ddos-protection', 'bot-shield', 'guardrails'];

export const DEFENSES_BY_ID: Readonly<Record<DefenseId, DefenseDefinition>> = {
  antivirus: {
    id: 'antivirus',
    eraId: 'homepage-1997',
    name: 'Antivirus subscription',
    description: 'Scans your files and removes viruses on its own after a few seconds.',
    cost: 2_500,
    countersHazard: 'virus',
    counterMode: 'auto-cleans',
    spawnRateFactor: 1,
    autoCleanDelayMs: ANTIVIRUS_CLEAN_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: 0.1,
    upgradesFrom: null,
  },
  'premium-ad-network': {
    id: 'premium-ad-network',
    eraId: 'homepage-1997',
    name: 'Premium ad network',
    description: 'A picky ad network: pop-ups get rare, though the odd one still sneaks through.',
    cost: 6_000,
    countersHazard: 'popup',
    counterMode: 'slows-spawn',
    spawnRateFactor: 0.2,
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: 0.75,
    revenueUpkeepShare: NO_UPKEEP,
    upgradesFrom: null,
  },
  captcha: {
    id: 'captcha',
    eraId: 'web2-2005',
    name: 'CAPTCHA',
    description: 'Commenters type the squiggly letters. Bots can’t. Neither can some humans.',
    cost: 1_000_000,
    countersHazard: 'spam',
    counterMode: 'prevents-spawn',
    spawnRateFactor: 1,
    autoCleanDelayMs: NO_DELAY_MS,
    // Only people who comment meet the CAPTCHA, so only the comments lose visitors.
    trafficFactor: 0.9,
    penalizedFeatureId: 'comments',
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: NO_UPKEEP,
    upgradesFrom: null,
  },
  'ddos-protection': {
    id: 'ddos-protection',
    eraId: 'social-2011',
    name: 'DDoS protection',
    description: 'A scrubbing service sits in front of your site and drops attack traffic before it reaches you. It takes a cut of your revenue.',
    cost: 5_000_000_000,
    countersHazard: 'ddos',
    counterMode: 'prevents-spawn',
    spawnRateFactor: 1,
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: 0.05,
    upgradesFrom: null,
  },
  // Browsers built pop-up blockers in from 2004: from then on a site could promise none at all. An upgrade of the
  // premium ad network, not a second defense: it replaces it, trade-off and all.
  'no-popups': {
    id: 'no-popups',
    eraId: 'web2-2005',
    name: 'Pop-up-free ad deal',
    description: 'Upgrades your premium ad network: write “no pop-ups” into the contract and they never come back. It replaces the old deal, and its cut.',
    cost: 800_000,
    countersHazard: 'popup',
    counterMode: 'prevents-spawn',
    spawnRateFactor: 1,
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: 0.8,
    revenueUpkeepShare: NO_UPKEEP,
    upgradesFrom: 'premium-ad-network',
  },
  'bot-shield': {
    id: 'bot-shield',
    eraId: 'ai-2024',
    name: 'Bot shield',
    description: 'A wall in front of your site that asks every visitor whether they’re human, and turns away the crawlers. Some real people on VPNs get stuck at it too.',
    cost: 5_000_000_000_000,
    countersHazard: 'scraper-swarm',
    counterMode: 'prevents-spawn',
    spawnRateFactor: 1,
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: 0.95,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: NO_UPKEEP,
    upgradesFrom: null,
  },
  guardrails: {
    id: 'guardrails',
    eraId: 'ai-2024',
    name: 'Chatbot guardrails',
    description: 'A second model checks every answer before your assistant says it. No more invented refund policies, and every answer costs twice.',
    cost: 10_000_000_000_000,
    countersHazard: 'hallucination',
    counterMode: 'prevents-spawn',
    spawnRateFactor: 1,
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: 0.03,
    upgradesFrom: null,
  },
};

/** What a defense is called and does, as the player reads it. */
export interface DefenseCopy {
  readonly name: string;
  readonly description: string;
}

/**
 * Defenses the web came to know by another name. A picky ad network was how a 1997 site kept pop-ups away; by 2011
 * everyone ran an ad blocker, and it hid some of the site's own ads along with them (the same trade-off).
 */
const LATER_ERA_COPY: Readonly<Partial<Record<DefenseId, Readonly<Partial<Record<EraId, DefenseCopy>>>>>> = {
  'premium-ad-network': {
    'social-2011': { name: 'Ad blocker', description: 'Blocks most pop-ups, though the odd one gets past it. It hides some of your own ads along with them.' },
  },
  'no-popups': {
    'social-2011': { name: 'Strict ad blocker', description: 'Upgrades your ad blocker: every pop-up and overlay blocked, not just most of them. It replaces the old one.' },
  },
};

/** Defenses that retire with what they protect: CAPTCHA goes when the comments do. */
export const DEFENSE_SUNSETS: Readonly<Partial<Record<DefenseId, EraId>>> = {
  captcha: 'platform-2018',
};

function findCopiesOf(defenseId: DefenseId): Readonly<Partial<Record<EraId, DefenseCopy>>> {
  return LATER_ERA_COPY[defenseId] ?? {};
}

function findLaterEraCopy(defenseId: DefenseId, eraId: EraId): DefenseCopy | null {
  const copies = findCopiesOf(defenseId);
  const upToEra = ERA_IDS.slice(0, ERA_IDS.indexOf(eraId) + 1);
  return [...upToEra].reverse().map((candidate) => copies[candidate]).find((copy) => copy !== undefined) ?? null;
}

/** The newest name and description the defense got in this era or an earlier one, else its own. */
export function getDefenseCopy(defenseId: DefenseId, eraId: EraId): DefenseCopy {
  return findLaterEraCopy(defenseId, eraId) ?? DEFENSES_BY_ID[defenseId];
}
