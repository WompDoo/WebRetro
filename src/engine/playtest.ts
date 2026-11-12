import { TRAFFIC_SPIKE_DURATION_MS } from './constants';
import { DEFENSE_IDS, DEFENSES_BY_ID } from './content/defenses';
import { ERA_IDS, ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, FEATURES_BY_ID, getFeatureIdsOfEra } from './content/features';
import { findFrameworkPickedBy, findFrameworkRenderedBy } from './content/frameworks';
import { getEraHostingTiers } from './content/hosting';
import { UPGRADE_IDS, UPGRADES_BY_ID } from './content/upgrades';
import {
  calculateDemandVisitorsPerSecond,
  calculateHostingCapacity,
  calculateNetRevenuePerSecond,
  calculateVisitorsPerSecond,
  canCertificateExpire,
  getEraIndex,
} from './economy';
import { calculateGateChecks } from './era-gate';
import { createInitialGameState } from './state';
import type { EraId, FeatureId, FrameworkId, GameState, InfectionKind, MinigameId, UpgradeId } from './types';

/**
 * Playtest presets: a believable game at the start or the end of any era, built from the content itself.
 * Nothing is hand-tuned per era, so the presets keep working as eras and numbers change; the tests check
 * that every "end" preset really passes its era's checklist.
 */
export type PlaytestStage = 'start' | 'end';

const EARLIER_ERA_FEATURE_LEVEL = 25;
const STARTING_CURRENT_ERA_LEVEL = 5;
const LEVEL_STEP = 5;
const MAX_LEVEL_ROUNDS = 80;
/** The end preset aims a little past the visitors target, so a traffic dip doesn't undo it. */
const VISITOR_TARGET_MARGIN = 1.1;
/** Hosting with room to spare, so the end preset isn't overloaded. */
const HOSTING_HEADROOM = 1.3;
const EARLIER_ERA_ADS = 6;
const START_MONEY_SECONDS = 60;
const LIFETIME_EARNINGS_FACTOR = 3;
const KEYSTROKES_PER_ERA = 4_000;
const VISITORS_PER_EARNED_DOLLAR = 20;
const QUIET_FIRST_HAZARDS_MS = 60_000;

function isBefore(eraId: EraId, other: EraId): boolean {
  return getEraIndex(eraId) < getEraIndex(other);
}

function isUpTo(eraId: EraId, other: EraId): boolean {
  return getEraIndex(eraId) <= getEraIndex(other);
}

function findFrameworkOf(upgradeId: UpgradeId): FrameworkId | null {
  return findFrameworkPickedBy(upgradeId) ?? findFrameworkRenderedBy(upgradeId);
}

/** A site picks one framework: the others' skills are never learned. */
function isOtherFramework(upgradeId: UpgradeId, framework: FrameworkId): boolean {
  const owner = findFrameworkOf(upgradeId);
  return owner !== null && owner !== framework;
}

/** Everything from earlier eras, and at the end of an era everything from it too, with one framework. */
function learnedFor(eraId: EraId, stage: PlaytestStage, framework: FrameworkId): GameState['purchasedUpgradeIds'] {
  const counts = (upgradeEra: EraId): boolean => (stage === 'end' ? isUpTo(upgradeEra, eraId) : isBefore(upgradeEra, eraId));
  return UPGRADE_IDS.filter((upgradeId) => counts(UPGRADES_BY_ID[upgradeId].eraId) && !isOtherFramework(upgradeId, framework));
}

function defensesFor(eraId: EraId): GameState['ownedDefenseIds'] {
  return DEFENSE_IDS.filter((defenseId) => isBefore(DEFENSES_BY_ID[defenseId].eraId, eraId));
}

function levelsFor(eraId: EraId, stage: PlaytestStage): GameState['featureLevels'] {
  const levelOf = (featureId: FeatureId): number => {
    const featureEra = FEATURES_BY_ID[featureId].eraId;
    if (isBefore(featureEra, eraId)) return EARLIER_ERA_FEATURE_LEVEL;
    return featureEra === eraId && stage === 'end' ? STARTING_CURRENT_ERA_LEVEL : 0;
  };
  return Object.fromEntries(FEATURE_IDS.map((featureId) => [featureId, levelOf(featureId)])) as GameState['featureLevels'];
}

function earlierBudgets(eraId: EraId): number {
  return ERA_IDS.filter((other) => isBefore(other, eraId)).reduce((total, other) => total + ERAS_BY_ID[other].migrationCost, 0);
}

/** The cheapest hosting step on this era's ladder that carries the demand with room to spare. */
function chooseHostingTier(state: GameState): number {
  const ladder = getEraHostingTiers(state.eraId);
  const needed = calculateDemandVisitorsPerSecond(state) * HOSTING_HEADROOM;
  const index = ladder.findIndex((tier) => calculateHostingCapacity(state, tier) >= needed);
  return index === -1 ? Math.max(0, ladder.length - 1) : index;
}

function withHosting(state: GameState): GameState {
  return { ...state, hostingTier: chooseHostingTier(state) };
}

/** Requirements that ask for a feature level: met exactly, plus a little. */
function meetFeatureLevels(state: GameState): GameState {
  const levels = { ...state.featureLevels };
  calculateGateChecks(state).forEach((check) => {
    const featureId = check.requirement.featureId;
    if (check.requirement.kind === 'feature-level' && featureId !== null) levels[featureId] = Math.max(levels[featureId], check.requirement.target + 1);
  });
  return { ...state, featureLevels: levels };
}

function visitorsTarget(state: GameState): number {
  const requirement = ERAS_BY_ID[state.eraId].gateRequirements.find((candidate) => candidate.kind === 'visitors-per-second');
  return (requirement?.target ?? 0) * VISITOR_TARGET_MARGIN;
}

function raiseEraFeatures(state: GameState): GameState {
  const levels = { ...state.featureLevels };
  getFeatureIdsOfEra(state.eraId).forEach((featureId) => {
    levels[featureId] += LEVEL_STEP;
  });
  return withHosting({ ...state, featureLevels: levels });
}

/** Levels this era's features up until the visitors target is met (hosting grows along). */
function meetVisitorsTarget(state: GameState, round = 0): GameState {
  const hosted = withHosting(state);
  const isMet = calculateVisitorsPerSecond(hosted) >= visitorsTarget(hosted);
  return isMet || round >= MAX_LEVEL_ROUNDS ? hosted : meetVisitorsTarget(raiseEraFeatures(hosted), round + 1);
}

function finishEra(state: GameState): GameState {
  const ready = meetVisitorsTarget(meetFeatureLevels(state));
  return { ...ready, money: ERAS_BY_ID[ready.eraId].migrationCost };
}

function startEra(state: GameState): GameState {
  const hosted = { ...state, hostingTier: 0 };
  return { ...hosted, money: Math.max(0, calculateNetRevenuePerSecond(hosted)) * START_MONEY_SECONDS };
}

/** The framework only matters from 2018's end on: it's the one the preset's site picked. */
export function createPlaytestState(eraId: EraId, stage: PlaytestStage, seed: number, framework: FrameworkId): GameState {
  const fresh = createInitialGameState(seed);
  if (eraId === 'homepage-1997' && stage === 'start') return fresh;
  const lifetimeEarnings = Math.max(1, earlierBudgets(eraId) * LIFETIME_EARNINGS_FACTOR);
  const base: GameState = {
    ...fresh,
    eraId,
    purchasedUpgradeIds: learnedFor(eraId, stage, framework),
    ownedDefenseIds: defensesFor(eraId),
    enabledDefenseIds: defensesFor(eraId),
    featureLevels: levelsFor(eraId, stage),
    adCount: Math.min(ERAS_BY_ID[eraId].maxAds, EARLIER_ERA_ADS),
    lifetimeEarnings,
    lifetimeVisitors: lifetimeEarnings * VISITORS_PER_EARNED_DOLLAR,
    keystrokes: (getEraIndex(eraId) + 1) * KEYSTROKES_PER_ERA,
    reachedMilestoneIds: ['first-visitor', 'first-revenue', 'quit-day-job'],
    hazardCountdownsMs: Object.fromEntries(Object.keys(fresh.hazardCountdownsMs).map((kind) => [kind, QUIET_FIRST_HAZARDS_MS])) as GameState['hazardCountdownsMs'],
  };
  return stage === 'end' ? finishEra(base) : startEra(base);
}

/** Skip ahead: the money this many seconds of income would bring. */
export function addPlaytestIncome(state: GameState, seconds: number): GameState {
  const earned = Math.max(0, calculateNetRevenuePerSecond(state)) * seconds;
  return { ...state, money: state.money + earned, lifetimeEarnings: state.lifetimeEarnings + earned };
}

const MINIGAME_KINDS: Readonly<Record<MinigameId, InfectionKind>> = {
  snake: 'virus',
  'virus-scan': 'virus',
  firewall: 'virus',
  'spam-sort': 'spam',
  'backup-restore': 'sql-injection',
  'reset-passwords': 'password-leak',
  'reroute-traffic': 'ddos',
  'cross-traffic': 'ddos',
  'fix-build': 'broken-build',
};
const PREFERRED_TARGETS: Readonly<Record<InfectionKind, readonly FeatureId[]>> = {
  virus: ['guestbook', 'hit-counter'],
  spam: ['comments'],
  'sql-injection': ['blog', 'comments', 'forum'],
  'password-leak': ['forum', 'guestbook'],
  ddos: ['blog', 'video-player', 'share-buttons'],
  'broken-build': ['stories', 'pricing-table', 'blog'],
};

function pickTarget(state: GameState, kind: InfectionKind): FeatureId | null {
  const owned = FEATURE_IDS.filter((featureId) => state.featureLevels[featureId] > 0);
  return PREFERRED_TARGETS[kind].find((featureId) => owned.includes(featureId)) ?? owned[0] ?? null;
}

/** Puts an infection with exactly this minigame on a built feature. Null id when nothing is built yet. */
export function addPlaytestInfection(state: GameState, minigameId: MinigameId): { readonly state: GameState; readonly infectionId: number | null } {
  const kind = MINIGAME_KINDS[minigameId];
  const featureId = pickTarget(state, kind);
  if (featureId === null) return { state, infectionId: null };
  const id = state.nextEntityId;
  // Fresh, so a quick win earns the quick-fix bonus like a real one would.
  const infection = { id, kind, featureId, ageMs: 0, minigameId };
  const others = state.infections.filter((candidate) => candidate.featureId !== featureId);
  return { state: { ...state, infections: [...others, infection], nextEntityId: id + 1 }, infectionId: id };
}

export function addPlaytestPopup(state: GameState, roll: number): GameState {
  const id = state.nextEntityId;
  return { ...state, popups: [...state.popups, { id, variantRoll: roll, anchorX: roll, anchorY: 1 - roll }], nextEntityId: id + 1 };
}

/** Only a certificate renewed by hand can run out. */
export function expirePlaytestCertificate(state: GameState): GameState {
  return { ...state, isCertificateExpired: canCertificateExpire(state) };
}

/** Only eras with a server have traffic spikes. */
export function startPlaytestTrafficSpike(state: GameState): GameState {
  return ERAS_BY_ID[state.eraId].hasServerLoad ? { ...state, trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS } : state;
}
