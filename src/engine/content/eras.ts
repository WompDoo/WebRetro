import { formatCompactNumber, formatMoney } from '../format';
import type { EraDefinition, EraGateRequirement, EraId, FeatureId } from '../types';
import { FEATURES_BY_ID, getFeatureIdsOfEra } from './features';

export const ERA_IDS: readonly EraId[] = ['homepage-1997', 'web2-2005'];

function requireEveryFeatureOf(eraId: EraId, year: number): EraGateRequirement {
  return {
    kind: 'era-features-built',
    label: `Build every ${year} feature`,
    target: getFeatureIdsOfEra(eraId).length,
    featureId: null,
  };
}

function requireFeatureLevel(featureId: FeatureId, level: number): EraGateRequirement {
  return {
    kind: 'feature-level',
    label: `${FEATURES_BY_ID[featureId].name} level ${level}`,
    target: level,
    featureId,
  };
}

function requireVisitorsPerSecond(amount: number): EraGateRequirement {
  return {
    kind: 'visitors-per-second',
    label: `Reach ${formatCompactNumber(amount)} visitors/s`,
    target: amount,
    featureId: null,
  };
}

function requireMigrationBudget(amount: number): EraGateRequirement {
  return {
    kind: 'migration-budget',
    label: `Save ${formatMoney(amount)}`,
    target: amount,
    featureId: null,
  };
}

const HOMEPAGE_MIGRATION_COST = 160_000;
const WEB2_MIGRATION_COST = 1_000_000_000;

export const ERAS_BY_ID: Readonly<Record<EraId, EraDefinition>> = {
  'homepage-1997': {
    id: 'homepage-1997',
    year: 1997,
    name: 'Personal homepage',
    nextEraId: 'web2-2005',
    nextEraName: 'Web 2.0',
    nextEraYear: 2005,
    migrationLabel: 'Launch Web 2.0',
    migrationCost: HOMEPAGE_MIGRATION_COST,
    gateRequirements: [
      requireEveryFeatureOf('homepage-1997', 1997),
      requireFeatureLevel('guestbook', 10),
      requireVisitorsPerSecond(2_500),
      requireMigrationBudget(HOMEPAGE_MIGRATION_COST),
    ],
    adLabel: 'Banner ad',
    adSkillId: 'img-tag',
    connectionLabel: '28.8k modem',
    connectionKbPerSecond: 3.6,
    patienceSeconds: 30,
    basePageWeightKb: 2,
    adPageWeightKb: 12,
    hasServerLoad: false,
    adValuePerVisitor: 0.15,
    adAnnoyancePerAd: 0.18,
    maxAds: 6,
    keystrokeValueMultiplier: 1,
  },
  'web2-2005': {
    id: 'web2-2005',
    year: 2005,
    name: 'Web 2.0',
    nextEraId: null,
    nextEraName: 'Social & mobile',
    nextEraYear: 2011,
    migrationLabel: 'Finish the prototype',
    migrationCost: WEB2_MIGRATION_COST,
    gateRequirements: [
      requireEveryFeatureOf('web2-2005', 2005),
      requireFeatureLevel('blog', 15),
      requireVisitorsPerSecond(1_500_000),
      requireMigrationBudget(WEB2_MIGRATION_COST),
    ],
    adLabel: 'Text ad',
    adSkillId: null,
    connectionLabel: 'DSL',
    connectionKbPerSecond: 128,
    patienceSeconds: 8,
    basePageWeightKb: 20,
    adPageWeightKb: 6,
    hasServerLoad: true,
    adValuePerVisitor: 0.09,
    adAnnoyancePerAd: 0.18,
    maxAds: 10,
    keystrokeValueMultiplier: 12,
  },
};
