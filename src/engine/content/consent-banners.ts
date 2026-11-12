import type { ConsentBanner } from '../types';

/**
 * May 2018: the GDPR. Ads that track visitors need their consent, and every site grew a cookie banner. How it asks
 * is a choice: honestly, and plenty say no; with a dark pattern, and most click "Accept all"; or not at all.
 * Tuned so the choice is real: no banner costs about 11% of revenue in fines, honest about 7% in ad value, a dark
 * pattern about the same on average but in lumps. The balance simulation plays both.
 */
export interface ConsentBannerDefinition {
  readonly id: ConsentBanner;
  readonly name: string;
  readonly description: string;
  /** Ad value kept: visitors who say no to tracking are shown cheaper, untargeted ads. */
  readonly adValueFactor: number;
  /** How fast complaints turn into fines, against the usual pace; 0 for never. */
  readonly fineRate: number;
  /** Each fine, in seconds of the revenue visitors bring in. */
  readonly fineRevenueSeconds: number;
}

export const CONSENT_BANNER_IDS: readonly ConsentBanner[] = ['none', 'honest', 'dark-pattern'];

export const CONSENT_BANNERS_BY_ID: Readonly<Record<ConsentBanner, ConsentBannerDefinition>> = {
  none: {
    id: 'none',
    name: 'No banner',
    description: 'Track everyone and ask nobody. Visitors complain to the regulator, and the regulator fines you.',
    adValueFactor: 1,
    fineRate: 1,
    fineRevenueSeconds: 30,
  },
  honest: {
    id: 'honest',
    name: 'Honest banner',
    description: '“Accept” and “Reject” side by side, the same size. Plenty of visitors reject, and their ads pay less. Never fined.',
    adValueFactor: 0.92,
    fineRate: 0,
    fineRevenueSeconds: 0,
  },
  'dark-pattern': {
    id: 'dark-pattern',
    name: 'Dark pattern',
    description: 'A big “Accept all”, and “Manage options” three screens deep. Nearly everyone accepts. Fined less often, but harder when it comes.',
    adValueFactor: 0.98,
    fineRate: 0.2,
    fineRevenueSeconds: 70,
  },
};
