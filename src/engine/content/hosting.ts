import type { EraId, HostingTierDefinition, HostingTierId } from '../types';

const FIRST_EXTRA_RACK = 1;
/** Far more racks than anyone can afford: the price, not the list, is what stops you. */
const MAX_EXTRA_RACKS = 40;
const CAPACITY_PER_RACK = 6_000_000;
const FIRST_RACK_COST = 400_000_000;
const RACK_COST_GROWTH = 1.35;

/**
 * How a growing site scaled between 2001 and 2009, in the order people did it. Each step carries about
 * 2.3 times the last: when traffic is stuck at capacity, an upgrade multiplies income by that gap.
 * The years are when each step became the usual next move. "The cloud" is the 2011 story.
 */
const NAMED_TIERS: readonly HostingTierDefinition[] = [
  {
    id: 'shared-hosting',
    eraId: 'web2-2005',
    year: 2001,
    name: 'Shared hosting',
    description: 'Your site and 400 others on one machine. $4.99 a month, comes with the relaunch.',
    cost: 0,
    capacityVisitorsPerSecond: 15_000,
  },
  {
    id: 'business-hosting',
    eraId: 'web2-2005',
    year: 2002,
    name: 'Business hosting plan',
    description: '“Unlimited” bandwidth, until you actually use it. Same machine, fewer neighbors.',
    cost: 100_000,
    capacityVisitorsPerSecond: 35_000,
  },
  {
    id: 'vps',
    eraId: 'web2-2005',
    year: 2003,
    name: 'Virtual private server',
    description: 'Your own slice of a server, with root access. Try not to break it.',
    cost: 300_000,
    capacityVisitorsPerSecond: 80_000,
  },
  {
    id: 'dedicated-server',
    eraId: 'web2-2005',
    year: 2004,
    name: 'Dedicated server',
    description: 'A whole rented machine in a data center, all yours. It hums.',
    cost: 1_000_000,
    capacityVisitorsPerSecond: 190_000,
  },
  {
    id: 'database-server',
    eraId: 'web2-2005',
    year: 2004,
    name: 'Separate database server',
    description: 'The web server stops fighting MySQL for memory: one machine each.',
    cost: 2_500_000,
    capacityVisitorsPerSecond: 440_000,
  },
  {
    id: 'load-balancer',
    eraId: 'web2-2005',
    year: 2005,
    name: 'Load balancer and three web servers',
    description: 'Requests take turns between three machines. If one dies, nobody notices. In theory.',
    cost: 6_000_000,
    capacityVisitorsPerSecond: 1_000_000,
  },
  {
    id: 'database-replicas',
    eraId: 'web2-2005',
    year: 2005,
    name: 'Database replicas',
    description: 'One database takes the writes; read-only copies answer everything else.',
    cost: 15_000_000,
    capacityVisitorsPerSecond: 2_300_000,
  },
  {
    id: 'colocation',
    eraId: 'web2-2005',
    year: 2006,
    name: 'Colocation rack',
    description: 'You buy the servers, a data center rents you the shelf, the power and the cold air.',
    cost: 40_000_000,
    capacityVisitorsPerSecond: 5_300_000,
  },
  {
    id: 'sharded-database',
    eraId: 'web2-2005',
    year: 2007,
    name: 'Sharded database',
    description: 'Users split across ten databases by their ID. Nobody remembers which one has yours.',
    cost: 100_000_000,
    capacityVisitorsPerSecond: 12_000_000,
  },
  {
    id: 'second-data-center',
    eraId: 'web2-2005',
    year: 2008,
    name: 'Second data center',
    description: 'A copy of everything in another city, in case a backhoe finds the first one’s cable.',
    cost: 250_000_000,
    capacityVisitorsPerSecond: 28_000_000,
  },
];

function createExtraRackTier(racks: number): HostingTierDefinition {
  return {
    id: `extra-racks-${racks}`,
    eraId: 'web2-2005',
    year: 2009,
    name: `Two data centers, +${racks} ${racks === FIRST_EXTRA_RACK ? 'rack' : 'racks'}`,
    description: 'Another rack of servers. The data center bills by the kilowatt.',
    cost: Math.round(FIRST_RACK_COST * RACK_COST_GROWTH ** (racks - FIRST_EXTRA_RACK)),
    capacityVisitorsPerSecond: 28_000_000 + racks * CAPACITY_PER_RACK,
  };
}

/** After the second data center you add racks, so there is always a next step: money can always buy capacity. */
const EXTRA_RACK_TIERS: readonly HostingTierDefinition[] = Array.from({ length: MAX_EXTRA_RACKS }, (_, index) => createExtraRackTier(FIRST_EXTRA_RACK + index));

/**
 * From 2011 on, capacity comes in units rented by the minute: cloud instances, then Kubernetes pods. A ladder
 * starts free at a few units and grows about a quarter per step, each step costing a little more than the last.
 */
interface ScalingLadder {
  readonly eraId: EraId;
  readonly year: number;
  readonly firstUnits: number;
  readonly steps: number;
  readonly capacityPerUnit: number;
  readonly unitGrowth: number;
  readonly secondStepCost: number;
  readonly stepCostGrowth: number;
  readonly createId: (units: number) => HostingTierId;
  readonly createName: (units: number) => string;
  /** What the relaunch gives you, then what every step after it says. */
  readonly firstDescription: string;
  readonly laterDescription: string;
}

/** 2, 3, 4, … then about a quarter more each step, never repeating a count. */
function countUnits(ladder: ScalingLadder): readonly number[] {
  return Array.from({ length: ladder.steps }).reduce<readonly number[]>((counts, _, step) => {
    const previous = counts[counts.length - 1] ?? ladder.firstUnits - 1;
    return [...counts, Math.max(previous + 1, Math.round(ladder.firstUnits * ladder.unitGrowth ** step))];
  }, []);
}

function describeStep(ladder: ScalingLadder, step: number): string {
  return step === 0 ? ladder.firstDescription : ladder.laterDescription;
}

function priceStep(ladder: ScalingLadder, step: number): number {
  return step === 0 ? 0 : Math.round(ladder.secondStepCost * ladder.stepCostGrowth ** (step - 1));
}

function createScalingTier(ladder: ScalingLadder, units: number, step: number): HostingTierDefinition {
  return {
    id: ladder.createId(units),
    eraId: ladder.eraId,
    year: ladder.year,
    name: ladder.createName(units),
    description: describeStep(ladder, step),
    cost: priceStep(ladder, step),
    capacityVisitorsPerSecond: units * ladder.capacityPerUnit,
  };
}

function buildLadder(ladder: ScalingLadder): readonly HostingTierDefinition[] {
  return countUnits(ladder).map((units, step) => createScalingTier(ladder, units, step));
}

/** 2011: the cloud replaces the 2005 racks. It starts with two instances and keeps scaling. */
const CLOUD_TIERS = buildLadder({
  eraId: 'social-2011',
  year: 2011,
  firstUnits: 2,
  steps: 60,
  capacityPerUnit: 12_000_000,
  unitGrowth: 1.25,
  secondStepCost: 400_000_000,
  stepCostGrowth: 1.4,
  createId: (instances) => `cloud-${instances}`,
  createName: (instances) => `The cloud: ${instances} instances`,
  firstDescription: 'The relaunch moved you to “the cloud”: someone else’s computers, rented by the hour. No more racks.',
  laterDescription: 'More instances, up in a minute. The bill arrives at the end of the month.',
});

/** 2018: everything runs in containers, and Kubernetes decides where. It starts with three pods. */
const POD_TIERS = buildLadder({
  eraId: 'platform-2018',
  year: 2018,
  firstUnits: 3,
  steps: 60,
  capacityPerUnit: 2_000_000_000,
  unitGrowth: 1.25,
  secondStepCost: 40_000_000_000,
  stepCostGrowth: 1.4,
  createId: (pods) => `pods-${pods}`,
  createName: (pods) => `Kubernetes: ${pods} pods`,
  firstDescription: 'The relaunch packed your site into containers and handed them to Kubernetes. Nobody on the team fully understands the YAML.',
  laterDescription: 'More replicas. Kubernetes finds them somewhere to run, eventually.',
});

export const HOSTING_TIERS: readonly HostingTierDefinition[] = [...NAMED_TIERS, ...EXTRA_RACK_TIERS, ...CLOUD_TIERS, ...POD_TIERS];

/** Each era has its own ladder: your 2005 racks don't come along to the cloud. */
export function getEraHostingTiers(eraId: EraId): readonly HostingTierDefinition[] {
  return HOSTING_TIERS.filter((tier) => tier.eraId === eraId);
}
