import type { HostingTierDefinition } from '../types';

/**
 * From 2005 on your site runs on a server you pay for. Each tier carries about four times the last:
 * when traffic is stuck at capacity, an upgrade multiplies income by that gap, so small steps keep growth smooth.
 */
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
    cost: 250_000,
    capacityVisitorsPerSecond: 60_000,
  },
  {
    id: 'dedicated-server',
    eraId: 'web2-2005',
    name: 'Dedicated server',
    description: 'A whole machine in a data center, all yours. It hums.',
    cost: 1_500_000,
    capacityVisitorsPerSecond: 250_000,
  },
  {
    id: 'server-cluster',
    eraId: 'web2-2005',
    name: 'Server cluster',
    description: 'Three machines behind a load balancer. If one dies, nobody notices. In theory.',
    cost: 6_000_000,
    capacityVisitorsPerSecond: 1_000_000,
  },
  {
    id: 'cdn',
    eraId: 'web2-2005',
    name: 'Content delivery network',
    description: 'Copies of your images on servers around the world, close to every visitor.',
    cost: 25_000_000,
    capacityVisitorsPerSecond: 4_000_000,
  },
  {
    id: 'the-cloud',
    eraId: 'web2-2005',
    name: '“The cloud”',
    description: 'Someone else’s computers, rented by the hour. Brand new in 2006.',
    cost: 100_000_000,
    capacityVisitorsPerSecond: 20_000_000,
  },
];
