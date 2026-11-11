import {
  INFECTION_DIFFICULTY_STEP_MS,
  MAX_INFECTION_DIFFICULTY,
  MAX_OPEN_POPUPS,
  MAX_VIRUS_INFECTIONS,
  MIN_INFECTION_DIFFICULTY,
  POPUP_FREQUENCY_PER_EXTRA_AD,
  TRAFFIC_SPIKE_DURATION_MS,
} from './constants';
import { ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, getFeatureDisplayName } from './content/features';
import { calculateFeatureVisitorsPerSecond, getEnabledDefenses, hasTrafficSpikeCache, isEraUnlocked, isFeatureInfected, isFeatureOnPage } from './economy';
import { drawRandoms, interpolateRange } from './random';
import type {
  FeatureId,
  GameEvent,
  GameState,
  GameStep,
  HazardKind,
  Infection,
  InfectionKind,
  MinigameId,
} from './types';

interface HazardRule {
  readonly kind: HazardKind;
  readonly intervalRangeMs: readonly [number, number];
  readonly isActive: (state: GameState) => boolean;
  readonly countdownSpeed: (state: GameState) => number;
  readonly spawn: (state: GameState, rolls: readonly number[], entityId: number) => GameStep;
}

/** One roll for the next interval, plus up to three for the hazard itself. */
const ROLLS_PER_SPAWN = 4;
const NORMAL_SPEED = 1;
const FIRST_EXTRA_AD = 1;
const FALLBACK_ROLL = 0.5;

function rollAt(rolls: readonly number[], index: number): number {
  return rolls[index] ?? FALLBACK_ROLL;
}

function countInfections(state: GameState, kind: InfectionKind): number {
  return state.infections.filter((infection) => infection.kind === kind).length;
}

function findInfectableFeatureIds(state: GameState): readonly FeatureId[] {
  return FEATURE_IDS.filter((featureId) => isFeatureOnPage(state, featureId) && !isFeatureInfected(state, featureId));
}

function addInfection(state: GameState, infection: Infection): GameState {
  return { ...state, infections: [...state.infections, infection] };
}

/**
 * The games that fix each kind of infection. One is rolled when the infection appears, so a kind that comes back
 * often (viruses, botnets) doesn't play the same game every time. The first is the one old saves fall back to.
 */
export const INFECTION_MINIGAMES: Readonly<Record<InfectionKind, readonly [MinigameId, ...MinigameId[]]>> = {
  virus: ['snake', 'virus-scan', 'firewall'],
  spam: ['spam-sort'],
  'sql-injection': ['backup-restore'],
  'password-leak': ['reset-passwords'],
  ddos: ['reroute-traffic', 'cross-traffic'],
};

/** Every minigame, in the order the playtest panel lists them. */
export const MINIGAME_IDS: readonly MinigameId[] = Object.values(INFECTION_MINIGAMES).flat();

export function pickMinigame(kind: InfectionKind, roll: number): MinigameId {
  const [first, ...rest] = INFECTION_MINIGAMES[kind];
  return [first, ...rest][Math.floor(roll * (rest.length + 1))] ?? first;
}

function createInfection(id: number, kind: InfectionKind, featureId: FeatureId, minigameRoll: number): Infection {
  return { id, kind, featureId, ageMs: 0, minigameId: pickMinigame(kind, minigameRoll) };
}

/** Anything backed by the database can have its table dropped. */
const DATABASE_FEATURES: readonly FeatureId[] = ['blog', 'comments', 'forum'];

function findSqlTargets(state: GameState): readonly FeatureId[] {
  return DATABASE_FEATURES.filter((featureId) => state.featureLevels[featureId] > 0 && !isFeatureInfected(state, featureId));
}

/** Anything people log into can have its user table leaked. */
const ACCOUNT_FEATURES: readonly FeatureId[] = ['forum', 'guestbook'];

function findLeakTargets(state: GameState): readonly FeatureId[] {
  return ACCOUNT_FEATURES.filter((featureId) => isFeatureOnPage(state, featureId) && !isFeatureInfected(state, featureId));
}

/** A botnet goes for what's popular: the page bringing the most visitors. */
function findBusiestFeature(state: GameState): FeatureId | null {
  const ranked = [...findInfectableFeatureIds(state)].sort(
    (first, second) => calculateFeatureVisitorsPerSecond(state, second) - calculateFeatureVisitorsPerSecond(state, first),
  );
  return ranked[0] ?? null;
}

/** 1 to 3: how hard this infection's minigame is right now. It grows the longer the infection stays. */
export function calculateInfectionDifficulty(infection: Infection): number {
  return Math.min(MAX_INFECTION_DIFFICULTY, MIN_INFECTION_DIFFICULTY + Math.floor(infection.ageMs / INFECTION_DIFFICULTY_STEP_MS));
}

/** Time until the minigame gets harder, or null once it's at its hardest. */
export function calculateMsUntilHarder(infection: Infection): number | null {
  const isHardest = calculateInfectionDifficulty(infection) >= MAX_INFECTION_DIFFICULTY;
  return isHardest ? null : INFECTION_DIFFICULTY_STEP_MS - (infection.ageMs % INFECTION_DIFFICULTY_STEP_MS);
}

export function findInfection(state: GameState, infectionId: number): Infection | null {
  return state.infections.find((candidate) => candidate.id === infectionId) ?? null;
}

function hazardEvent(message: string): readonly GameEvent[] {
  return [{ kind: 'hazard', message }];
}

/**
 * Hazard intervals are sized for a time budget: with the era's cheapest defense bought, minigames should take
 * about a tenth of an hour's play or less. The balance simulation prints the share.
 */
const POPUP_RULE: HazardRule = {
  kind: 'popup',
  intervalRangeMs: [16_000, 32_000],
  isActive: (state) => state.adCount > 0 && state.popups.length < MAX_OPEN_POPUPS,
  countdownSpeed: (state) =>
    NORMAL_SPEED + POPUP_FREQUENCY_PER_EXTRA_AD * Math.max(0, state.adCount - FIRST_EXTRA_AD),
  spawn: (state, rolls, entityId) => ({
    state: {
      ...state,
      popups: [
        ...state.popups,
        { id: entityId, variantRoll: rollAt(rolls, 0), anchorX: rollAt(rolls, 1), anchorY: rollAt(rolls, 2) },
      ],
    },
    events: [],
  }),
};

const VIRUS_RULE: HazardRule = {
  kind: 'virus',
  intervalRangeMs: [100_000, 180_000],
  isActive: (state) =>
    state.featureLevels.guestbook > 0 &&
    countInfections(state, 'virus') < MAX_VIRUS_INFECTIONS &&
    findInfectableFeatureIds(state).length > 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, rolls, entityId) => {
    const candidates = findInfectableFeatureIds(state);
    const featureId = candidates[Math.floor(rollAt(rolls, 0) * candidates.length)] ?? 'hit-counter';
    const featureName = getFeatureDisplayName(featureId, state.eraId).toLowerCase();
    return {
      state: addInfection(state, createInfection(entityId, 'virus', featureId, rollAt(rolls, 1))),
      events: hazardEvent(`A virus infected your ${featureName}. It brings in no visitors until you beat it, and it gets harder the longer you wait.`),
    };
  },
};

const SPAM_RULE: HazardRule = {
  kind: 'spam',
  intervalRangeMs: [120_000, 200_000],
  isActive: (state) => state.featureLevels.comments > 0 && countInfections(state, 'spam') === 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, rolls, entityId) => ({
    state: addInfection(state, createInfection(entityId, 'spam', 'comments', rollAt(rolls, 0))),
    events: hazardEvent('Spam bots flooded your comments. Real readers left until you sort it out.'),
  }),
};

const SQL_INJECTION_RULE: HazardRule = {
  kind: 'sql-injection',
  intervalRangeMs: [180_000, 300_000],
  isActive: (state) =>
    !state.purchasedUpgradeIds.includes('prepared-statements') &&
    countInfections(state, 'sql-injection') === 0 &&
    findSqlTargets(state).length > 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, rolls, entityId) => {
    const targets = findSqlTargets(state);
    const featureId = targets[Math.floor(rollAt(rolls, 0) * targets.length)] ?? 'blog';
    const featureName = getFeatureDisplayName(featureId, state.eraId).toLowerCase();
    return {
      state: addInfection(state, createInfection(entityId, 'sql-injection', featureId, rollAt(rolls, 1))),
      events: hazardEvent(`Someone typed '; DROP TABLE into a form. Your ${featureName} is broken until you restore it from a backup.`),
    };
  },
};

const TRAFFIC_SPIKE_RULE: HazardRule = {
  kind: 'traffic-spike',
  intervalRangeMs: [150_000, 300_000],
  isActive: (state) => ERAS_BY_ID[state.eraId].hasServerLoad && state.featureLevels.blog > 0 && state.trafficSpikeRemainingMs <= 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state) => ({
    state: { ...state, trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS },
    events: hazardEvent(
      `Your blog post hit the front page of a link-sharing site! Five times the visitors for 45 seconds. ${hasTrafficSpikeCache(state) ? 'Your page cache is serving them.' : 'Hope your server can take it.'}`,
    ),
  }),
};

/** 2011: password dumps on paste sites. Hashing with bcrypt ends them. */
const PASSWORD_LEAK_RULE: HazardRule = {
  kind: 'password-leak',
  intervalRangeMs: [260_000, 400_000],
  isActive: (state) =>
    isEraUnlocked(state, 'social-2011') &&
    !state.purchasedUpgradeIds.includes('learn-bcrypt') &&
    countInfections(state, 'password-leak') === 0 &&
    findLeakTargets(state).length > 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, rolls, entityId) => {
    const targets = findLeakTargets(state);
    const featureId = targets[Math.floor(rollAt(rolls, 0) * targets.length)] ?? 'forum';
    const featureName = getFeatureDisplayName(featureId, state.eraId).toLowerCase();
    return {
      state: addInfection(state, createInfection(entityId, 'password-leak', featureId, rollAt(rolls, 1))),
      events: hazardEvent(`Your ${featureName}'s user table turned up on a paste site, passwords in plain text. Nobody logs in until you reset them.`),
    };
  },
};

/** 2011: botnets for hire. They flood the busiest page until you shut them out, or pay someone to. */
const DDOS_RULE: HazardRule = {
  kind: 'ddos',
  intervalRangeMs: [240_000, 360_000],
  isActive: (state) => isEraUnlocked(state, 'social-2011') && countInfections(state, 'ddos') === 0 && findBusiestFeature(state) !== null,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, rolls, entityId) => {
    const featureId = findBusiestFeature(state) ?? 'blog';
    const featureName = getFeatureDisplayName(featureId, state.eraId).toLowerCase();
    return {
      state: addInfection(state, createInfection(entityId, 'ddos', featureId, rollAt(rolls, 0))),
      events: hazardEvent(`A botnet is flooding your ${featureName} with fake requests. Real visitors can't get through until you shut the attack out.`),
    };
  },
};

const HAZARD_RULES: readonly HazardRule[] = [POPUP_RULE, VIRUS_RULE, SPAM_RULE, SQL_INJECTION_RULE, TRAFFIC_SPIKE_RULE, PASSWORD_LEAK_RULE, DDOS_RULE];

export function isHazardPrevented(state: GameState, kind: HazardKind): boolean {
  return getEnabledDefenses(state).some(
    (defense) => defense.countersHazard === kind && defense.counterMode === 'prevents-spawn',
  );
}

function withHazardCountdown(state: GameState, kind: HazardKind, remainingMs: number): GameState {
  return { ...state, hazardCountdownsMs: { ...state.hazardCountdownsMs, [kind]: remainingMs } };
}

function spawnHazard(state: GameState, rule: HazardRule): GameStep {
  const draws = drawRandoms(state.randomSeed, ROLLS_PER_SPAWN);
  const nextIntervalMs = interpolateRange(rule.intervalRangeMs, rollAt(draws.values, 0));
  const seeded = { ...state, randomSeed: draws.nextSeed, nextEntityId: state.nextEntityId + 1 };
  const spawned = rule.spawn(seeded, draws.values.slice(1), state.nextEntityId);
  return { state: withHazardCountdown(spawned.state, rule.kind, nextIntervalMs), events: spawned.events };
}

function tickHazardRule(state: GameState, rule: HazardRule, deltaMs: number): GameStep {
  const canSpawn = rule.isActive(state) && !isHazardPrevented(state, rule.kind);
  if (!canSpawn) return { state, events: [] };
  const remainingMs = state.hazardCountdownsMs[rule.kind] - deltaMs * rule.countdownSpeed(state);
  return remainingMs > 0
    ? { state: withHazardCountdown(state, rule.kind, remainingMs), events: [] }
    : spawnHazard(state, rule);
}

function isAutoCleaned(state: GameState, infection: Infection): boolean {
  return getEnabledDefenses(state).some(
    (defense) =>
      defense.counterMode === 'auto-cleans' &&
      defense.countersHazard === infection.kind &&
      infection.ageMs >= defense.autoCleanDelayMs,
  );
}

function ageAndAutoCleanInfections(state: GameState, deltaMs: number): GameStep {
  const aged = state.infections.map((infection) => ({ ...infection, ageMs: infection.ageMs + deltaMs }));
  const agedState = { ...state, infections: aged };
  const autoCleaned = aged.filter((infection) => isAutoCleaned(agedState, infection));
  const events = autoCleaned.map<GameEvent>((infection) => ({
    kind: 'defense',
    message: `Antivirus removed a virus from your ${getFeatureDisplayName(infection.featureId, state.eraId).toLowerCase()}.`,
  }));
  return { state: { ...agedState, infections: aged.filter((infection) => !isAutoCleaned(agedState, infection)) }, events };
}

function mergeSteps(previous: GameStep, next: GameStep): GameStep {
  return { state: next.state, events: [...previous.events, ...next.events] };
}

/** Hazards only tick while the player is watching. Offline progress never spawns them. */
export function advanceHazards(state: GameState, deltaMs: number): GameStep {
  const spikeTicked = {
    ...state,
    trafficSpikeRemainingMs: Math.max(0, state.trafficSpikeRemainingMs - deltaMs),
    quickFixBonusRemainingMs: Math.max(0, state.quickFixBonusRemainingMs - deltaMs),
  };
  const cleaned = ageAndAutoCleanInfections(spikeTicked, deltaMs);
  return HAZARD_RULES.reduce<GameStep>(
    (step, rule) => mergeSteps(step, tickHazardRule(step.state, rule, deltaMs)),
    cleaned,
  );
}
