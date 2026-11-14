import { formatCompactNumber, formatMoney } from '../format';
import type { EraDefinition, EraGateRequirement, EraId, FeatureId } from '../types';
import { FEATURES_BY_ID, getFeatureIdsOfEra } from './features';

export { ERA_IDS } from './era-ids';

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
    label: `Reach ${formatCompactNumber(amount)} visitors/s on a usual day: pop-ups and outages don’t count against it`,
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

const HOMEPAGE_MIGRATION_COST = 6_500_000;
const WEB2_MIGRATION_COST = 1_000_000_000;
const SOCIAL_MIGRATION_COST = 550_000_000_000;
const PLATFORM_MIGRATION_COST = 120_000_000_000_000;
const AI_MIGRATION_COST = 35_000_000_000_000_000;

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
      requireFeatureLevel('guestbook', 35),
      requireVisitorsPerSecond(65_000),
      requireMigrationBudget(HOMEPAGE_MIGRATION_COST),
    ],
    adLabel: 'Banner ad',
    adSkillId: 'img-tag',
    connectionLabel: '28.8k modem',
    connectionKbPerSecond: 3.6,
    // No phones on the web yet: these never apply.
    mobileConnectionLabel: '28.8k modem',
    mobileConnectionKbPerSecond: 3.6,
    patienceSeconds: 30,
    basePageWeightKb: 2,
    adPageWeightKb: 12,
    hasServerLoad: false,
    hasPageWeight: false,
    mobileShare: 0,
    aiAnswerShare: 0,
    adValuePerVisitor: 0.15,
    adAnnoyancePerAd: 0.18,
    maxAds: 6,
    keystrokeValueMultiplier: 1,
    revenuePace: 2,
    typingPace: 1,
  },
  'web2-2005': {
    id: 'web2-2005',
    year: 2005,
    name: 'Web 2.0',
    nextEraId: 'social-2011',
    nextEraName: 'Social & mobile',
    nextEraYear: 2011,
    migrationLabel: 'Relaunch for 2011',
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
    mobileConnectionLabel: 'DSL',
    mobileConnectionKbPerSecond: 128,
    patienceSeconds: 8,
    basePageWeightKb: 20,
    adPageWeightKb: 6,
    hasServerLoad: true,
    hasPageWeight: true,
    mobileShare: 0,
    aiAnswerShare: 0,
    adValuePerVisitor: 0.09,
    adAnnoyancePerAd: 0.18,
    maxAds: 10,
    keystrokeValueMultiplier: 216,
    revenuePace: 9.5,
    typingPace: 9.5,
  },
  'social-2011': {
    id: 'social-2011',
    year: 2011,
    name: 'Social & mobile',
    nextEraId: 'platform-2018',
    nextEraName: 'Platforms',
    nextEraYear: 2018,
    migrationLabel: 'Relaunch as a platform',
    migrationCost: SOCIAL_MIGRATION_COST,
    gateRequirements: [
      requireEveryFeatureOf('social-2011', 2011),
      requireFeatureLevel('share-buttons', 15),
      requireVisitorsPerSecond(1_000_000_000),
      requireMigrationBudget(SOCIAL_MIGRATION_COST),
    ],
    adLabel: 'Sponsored post',
    adSkillId: null,
    connectionLabel: 'Broadband',
    connectionKbPerSecond: 700,
    // A 2011 phone page took the better part of ten seconds: the network, not the phone, was the slow part.
    mobileConnectionLabel: '3G',
    mobileConnectionKbPerSecond: 90,
    patienceSeconds: 5,
    basePageWeightKb: 60,
    adPageWeightKb: 30,
    hasServerLoad: true,
    hasPageWeight: true,
    mobileShare: 0.4,
    aiAnswerShare: 0,
    adValuePerVisitor: 0.07,
    adAnnoyancePerAd: 0.15,
    maxAds: 12,
    keystrokeValueMultiplier: 7_900,
    revenuePace: 4,
    typingPace: 4,
  },
  'platform-2018': {
    id: 'platform-2018',
    year: 2018,
    name: 'Platforms',
    nextEraId: 'ai-2024',
    nextEraName: 'AI everywhere',
    nextEraYear: 2024,
    migrationLabel: 'Relaunch with AI',
    migrationCost: PLATFORM_MIGRATION_COST,
    gateRequirements: [
      requireEveryFeatureOf('platform-2018', 2018),
      requireFeatureLevel('stories', 15),
      requireVisitorsPerSecond(100_000_000_000),
      requireMigrationBudget(PLATFORM_MIGRATION_COST),
    ],
    adLabel: 'Programmatic ad',
    adSkillId: null,
    connectionLabel: 'Fiber and cable',
    connectionKbPerSecond: 3_000,
    // What a phone really gets once latency counts: the "slow 4G" (1.6 Mbps) the speed test throttles itself to.
    mobileConnectionLabel: '4G',
    mobileConnectionKbPerSecond: 200,
    // Half of phone visitors leave a page that takes longer than three seconds, said every 2018 slide deck.
    patienceSeconds: 3,
    basePageWeightKb: 150,
    // An ad slot is a script that loads an auction that loads trackers that load the ad.
    adPageWeightKb: 150,
    hasServerLoad: true,
    hasPageWeight: true,
    mobileShare: 0.6,
    aiAnswerShare: 0,
    adValuePerVisitor: 0.05,
    adAnnoyancePerAd: 0.13,
    maxAds: 14,
    keystrokeValueMultiplier: 266_000,
    revenuePace: 4.2,
    typingPace: 4.2,
  },
  'ai-2024': {
    id: 'ai-2024',
    year: 2024,
    name: 'AI everywhere',
    nextEraId: null,
    nextEraName: 'The end',
    nextEraYear: 2025,
    migrationLabel: 'Finish the game',
    migrationCost: AI_MIGRATION_COST,
    gateRequirements: [
      requireEveryFeatureOf('ai-2024', 2024),
      requireFeatureLevel('ai-chatbot', 15),
      requireVisitorsPerSecond(11_000_000_000_000),
      requireMigrationBudget(AI_MIGRATION_COST),
    ],
    adLabel: 'Sponsored result',
    adSkillId: null,
    connectionLabel: 'Fiber',
    connectionKbPerSecond: 12_000,
    mobileConnectionLabel: '5G',
    mobileConnectionKbPerSecond: 600,
    // Two and a half seconds, and the AI answer above your link already said what your page says.
    patienceSeconds: 2.5,
    // The median page passed 2 MB: fonts, a video hero, three analytics scripts and a chat widget.
    basePageWeightKb: 400,
    adPageWeightKb: 200,
    hasServerLoad: true,
    hasPageWeight: true,
    mobileShare: 0.65,
    aiAnswerShare: 0.3,
    adValuePerVisitor: 0.04,
    adAnnoyancePerAd: 0.12,
    maxAds: 16,
    keystrokeValueMultiplier: 9_000_000,
    revenuePace: 4.4,
    typingPace: 4.4,
  },
};
