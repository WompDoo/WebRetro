import type { DefenseDefinition, DefenseId } from '../types';

const ANTIVIRUS_CLEAN_DELAY_MS = 6_000;
const NO_DELAY_MS = 0;
const NO_PENALTY = 1;
const NO_UPKEEP = 0;

export const DEFENSE_IDS: readonly DefenseId[] = ['antivirus', 'premium-ad-network', 'captcha', 'ddos-protection'];

export const DEFENSES_BY_ID: Readonly<Record<DefenseId, DefenseDefinition>> = {
  antivirus: {
    id: 'antivirus',
    eraId: 'homepage-1997',
    name: 'Antivirus subscription',
    description: 'Scans your files and removes viruses on its own after a few seconds.',
    cost: 2_500,
    countersHazard: 'virus',
    counterMode: 'auto-cleans',
    autoCleanDelayMs: ANTIVIRUS_CLEAN_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: 0.1,
  },
  'premium-ad-network': {
    id: 'premium-ad-network',
    eraId: 'homepage-1997',
    name: 'Premium ad network',
    description: 'A picky ad network that never sneaks pop-ups onto your page.',
    cost: 6_000,
    countersHazard: 'popup',
    counterMode: 'prevents-spawn',
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: 0.75,
    revenueUpkeepShare: NO_UPKEEP,
  },
  captcha: {
    id: 'captcha',
    eraId: 'web2-2005',
    name: 'CAPTCHA',
    description: 'Commenters type the squiggly letters. Bots can’t. Neither can some humans.',
    cost: 1_000_000,
    countersHazard: 'spam',
    counterMode: 'prevents-spawn',
    autoCleanDelayMs: NO_DELAY_MS,
    // Only people who comment meet the CAPTCHA, so only the comments lose visitors.
    trafficFactor: 0.9,
    penalizedFeatureId: 'comments',
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: NO_UPKEEP,
  },
  'ddos-protection': {
    id: 'ddos-protection',
    eraId: 'social-2011',
    name: 'DDoS protection',
    description: 'A scrubbing service sits in front of your site and drops attack traffic before it reaches you. It takes a cut of your revenue.',
    cost: 5_000_000_000,
    countersHazard: 'ddos',
    counterMode: 'prevents-spawn',
    autoCleanDelayMs: NO_DELAY_MS,
    trafficFactor: NO_PENALTY,
    penalizedFeatureId: null,
    adValueFactor: NO_PENALTY,
    revenueUpkeepShare: 0.05,
  },
};
