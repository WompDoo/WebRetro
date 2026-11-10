import {
  MAX_OPEN_POPUPS,
  MAX_VIRUS_FOOD,
  MAX_VIRUS_INFECTIONS,
  MIN_VIRUS_FOOD,
  POPUP_FREQUENCY_PER_EXTRA_AD,
  SPAM_CLEAN_CLICKS,
  SQL_INJECTION_RESTORE_CLICKS,
  TRAFFIC_SPIKE_DURATION_MS,
  VIRUS_FOOD_STEP_MS,
} from './constants';
import { ERAS_BY_ID } from './content/eras';
import { FEATURE_IDS, getFeatureDisplayName } from './content/features';
import { getEnabledDefenses, hasTrafficSpikeCache, isFeatureInfected } from './economy';
import { drawRandoms, interpolateRange } from './random';
import type {
  FeatureId,
  GameEvent,
  GameState,
  GameStep,
  HazardKind,
  Infection,
  InfectionKind,
  ClickInfection,
  VirusInfection,
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
  return FEATURE_IDS.filter(
    (featureId) => state.featureLevels[featureId] > 0 && !isFeatureInfected(state, featureId),
  );
}

function addInfection(state: GameState, infection: Infection): GameState {
  return { ...state, infections: [...state.infections, infection] };
}

function createVirus(id: number, featureId: FeatureId): VirusInfection {
  return { id, kind: 'virus', featureId, ageMs: 0 };
}

function createSpam(id: number): ClickInfection {
  return { id, kind: 'spam', featureId: 'comments', cleanClicksRemaining: SPAM_CLEAN_CLICKS, ageMs: 0 };
}

function createSqlInjection(id: number, featureId: FeatureId): ClickInfection {
  return { id, kind: 'sql-injection', featureId, cleanClicksRemaining: SQL_INJECTION_RESTORE_CLICKS, ageMs: 0 };
}

/** Anything backed by the database can have its table dropped. */
const DATABASE_FEATURES: readonly FeatureId[] = ['blog', 'comments', 'forum'];

function findSqlTargets(state: GameState): readonly FeatureId[] {
  return DATABASE_FEATURES.filter((featureId) => state.featureLevels[featureId] > 0 && !isFeatureInfected(state, featureId));
}

/** How many pieces of food the snake must eat to remove this virus right now. */
export function calculateRequiredVirusFood(virus: VirusInfection): number {
  return Math.min(MAX_VIRUS_FOOD, MIN_VIRUS_FOOD + Math.floor(virus.ageMs / VIRUS_FOOD_STEP_MS));
}

/** Time until the virus needs one more food, or null once it's fully grown. */
export function calculateMsUntilVirusGrows(virus: VirusInfection): number | null {
  const isFullyGrown = calculateRequiredVirusFood(virus) >= MAX_VIRUS_FOOD;
  return isFullyGrown ? null : VIRUS_FOOD_STEP_MS - (virus.ageMs % VIRUS_FOOD_STEP_MS);
}

export function findVirus(state: GameState, infectionId: number): VirusInfection | null {
  const infection = state.infections.find((candidate) => candidate.id === infectionId);
  return infection?.kind === 'virus' ? infection : null;
}

function hazardEvent(message: string): readonly GameEvent[] {
  return [{ kind: 'hazard', message }];
}

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
  intervalRangeMs: [50_000, 100_000],
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
      state: addInfection(state, createVirus(entityId, featureId)),
      events: hazardEvent(`A virus infected your ${featureName}. It brings in no visitors until you remove it, and it grows the longer you wait.`),
    };
  },
};

const SPAM_RULE: HazardRule = {
  kind: 'spam',
  intervalRangeMs: [40_000, 80_000],
  isActive: (state) => state.featureLevels.comments > 0 && countInfections(state, 'spam') === 0,
  countdownSpeed: () => NORMAL_SPEED,
  spawn: (state, _rolls, entityId) => ({
    state: addInfection(state, createSpam(entityId)),
    events: hazardEvent('Spam bots flooded your comments. Real readers left until you clean it up.'),
  }),
};

const SQL_INJECTION_RULE: HazardRule = {
  kind: 'sql-injection',
  intervalRangeMs: [80_000, 160_000],
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
      state: addInfection(state, createSqlInjection(entityId, featureId)),
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

const HAZARD_RULES: readonly HazardRule[] = [POPUP_RULE, VIRUS_RULE, SPAM_RULE, SQL_INJECTION_RULE, TRAFFIC_SPIKE_RULE];

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
  const spikeTicked = { ...state, trafficSpikeRemainingMs: Math.max(0, state.trafficSpikeRemainingMs - deltaMs) };
  const cleaned = ageAndAutoCleanInfections(spikeTicked, deltaMs);
  return HAZARD_RULES.reduce<GameStep>(
    (step, rule) => mergeSteps(step, tickHazardRule(step.state, rule, deltaMs)),
    cleaned,
  );
}
