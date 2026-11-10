import type { HostingTierDefinition } from '../types';

/** From 2005 on your site runs on a server you pay for. Each tier carries about ten times the last. */
export const HOSTING_TIERS: readonly HostingTierDefinition[] = [
  {
    id: 'shared-hosting',
    eraId: 'web2-2005',
    name: 'Shared hosting',
    description: 'Your site and 400 others on one machine. $4.99 a month, comes with the relaunch.',
    cost: 0,
    capacityVisitorsPerSecond: 15_000,
  },
  {
    id: 'vps',
    eraId: 'web2-2005',
    name: 'Virtual private server',
    description: 'Your own slice of a server, with root access. Try not to break it.',
    cost: 350_000,
    capacityVisitorsPerSecond: 150_000,
  },
  {
    id: 'dedicated-server',
    eraId: 'web2-2005',
    name: 'Dedicated server',
    description: 'A whole machine in a data center, all yours. It hums.',
    cost: 4_000_000,
    capacityVisitorsPerSecond: 1_500_000,
  },
  {
    id: 'the-cloud',
    eraId: 'web2-2005',
    name: '“The cloud”',
    description: 'Someone else’s computers, rented by the hour. Brand new in 2006.',
    cost: 50_000_000,
    capacityVisitorsPerSecond: 25_000_000,
  },
];
