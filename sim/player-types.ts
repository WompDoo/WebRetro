/**
 * Plays the whole game, 1997 to the ending, as different kinds of people, and reports where each gets stuck, how
 * long each era takes them, and anything the engine should never do (money that isn't a number, pop-ups that pile
 * up without end). Not a CI gate like the balance sim: a tool for finding design problems.
 *
 *   npm run players                         every player type, one after another
 *   SIM_PLAYERS=idle,ad-free npm run players  just these (run several in parallel from the shell)
 *   SIM_START=social-2011                   start at that era's playtest preset instead of a new game
 */
import {
  advanceEra,
  advanceSimulation,
  calculateNetRevenuePerSecond,
  calculateVisitorsPerSecond,
  chooseConsentBanner,
  createInitialGameState,
  createPlaytestState,
  ERA_IDS,
  ERAS_BY_ID,
  formatCompactNumber,
  formatMoney,
  isEraGateComplete,
  isSiteDown,
  isVisitorsGoalBlockedByAds,
  removeAd,
  buyDefense,
  canBuyDefense,
  DEFENSE_IDS,
  DEFENSES_BY_ID,
  type DefenseId,
  type EraId,
  type GameState,
} from '../src/engine';
import { decide, reactToHazards, renewWhenNoticed, typeKeystrokes } from './bot';
import type { PlayerProfile } from './bot';

interface PlayerType {
  readonly profile: PlayerProfile;
  readonly description: string;
  /** Keystrokes a second at this minute of play: an idle player types only to get going. */
  readonly typingAt: (minute: number) => number;
  /** How often they look at the shop, at this minute of play: an idle player looks less once they've walked away. */
  readonly decisionIntervalAt: (minute: number) => number;
}

interface EraOutcome {
  readonly eraId: EraId;
  readonly minutes: number;
}

/** What went wrong that never should: the engine's invariants, checked every tick. */
interface Oddities {
  readonly lowestMoney: number;
  readonly mostPopups: number;
  readonly mostInfections: number;
  readonly downMs: number;
  readonly nonFiniteAt: number | null;
  /** The first time money went below zero, and what the game said just then. */
  readonly firstDebt: string | null;
}

interface PlayerReport {
  readonly name: string;
  readonly eras: readonly EraOutcome[];
  readonly finished: boolean;
  readonly stuckIn: EraId | null;
  readonly minutes: number;
  readonly oddities: Oddities;
  readonly lastState: GameState;
}

const TICK_MS = 200;
const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
/** An era that takes longer than this counts as stuck: three times the slowest balance player. */
const STUCK_ERA_MS = 180 * MS_PER_MINUTE;
const SEED = Number(process.env['SIM_SEED'] ?? 1997);
const IDLE_ACTIVE_MINUTES = 20;
const IDLE_CHECK_IN_MS = 5 * 60_000;
const ACTIVE_TYPING = 6;
const CASUAL_TYPING = 2;
/** A player who checks in buys a batch, not one thing: up to this many purchases a visit. */
const MAX_PURCHASES_PER_VISIT = 50;

const steady = (keystrokesPerSecond: number) => (): number => keystrokesPerSecond;
const every = (intervalMs: number) => (): number => intervalMs;

const base = (name: string, policy: PlayerProfile['policy']): PlayerProfile => ({
  name,
  keystrokesPerSecond: ACTIVE_TYPING,
  reactionMs: 3_000,
  buysDefenses: true,
  framework: 'react',
  consentBanner: 'honest',
  policy,
});

const PLAYER_TYPES: readonly PlayerType[] = [
  { profile: base('optimizer', 'neutral'), description: 'the balance bot: types steadily, buys the best payback, fixes trouble in seconds', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
  {
    profile: { ...base('idle', 'neutral'), reactionMs: 5 * MS_PER_MINUTE },
    description: 'plays actively for twenty minutes, then stops typing and checks in every five minutes',
    typingAt: (minute) => (minute < IDLE_ACTIVE_MINUTES ? ACTIVE_TYPING : 0),
    decisionIntervalAt: (minute) => (minute < IDLE_ACTIVE_MINUTES ? 1_000 : IDLE_CHECK_IN_MS),
  },
  {
    profile: { ...base('casual', 'neutral'), reactionMs: 30_000 },
    description: 'types slowly, looks at the shop every twenty seconds, takes half a minute to notice trouble',
    typingAt: steady(CASUAL_TYPING),
    decisionIntervalAt: every(20_000),
  },
  { profile: base('ad-free', 'ad-free'), description: 'never places an ad', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
  { profile: base('ad-heavy', 'ad-heavy'), description: 'fills every ad slot before anything else', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
  {
    profile: { ...base('ignores-trouble', 'ignores-trouble'), buysDefenses: false },
    description: 'never closes a pop-up, plays a minigame, renews a certificate or buys a defense',
    typingAt: steady(ACTIVE_TYPING),
    decisionIntervalAt: every(1_000),
  },
  { profile: base('skips-minigames', 'skips-minigames'), description: 'closes pop-ups and renews certificates, never plays a minigame: relies on defenses', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
  { profile: base('no-framework', 'no-framework'), description: 'sits out the framework wars: no React, Angular or Vue, ever', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
  { profile: base('buys-everything', 'buys-everything'), description: 'buys whatever is cheapest, useful or not, until only savings are left', typingAt: steady(ACTIVE_TYPING), decisionIntervalAt: every(1_000) },
];

interface Tracker {
  lowestMoney: number;
  mostPopups: number;
  mostInfections: number;
  downMs: number;
  nonFiniteAt: number | null;
  firstDebt: string | null;
}

function track(tracker: Tracker, state: GameState, now: number, events: readonly string[]): void {
  if (tracker.firstDebt === null && state.money < 0) tracker.firstDebt = `${formatMoney(state.money)} at ${(now / MS_PER_MINUTE).toFixed(1)}m in ${state.eraId}: ${events.join(' | ') || 'no event this tick'}`;
  tracker.lowestMoney = Math.min(tracker.lowestMoney, state.money);
  tracker.mostPopups = Math.max(tracker.mostPopups, state.popups.length);
  tracker.mostInfections = Math.max(tracker.mostInfections, state.infections.length);
  tracker.downMs += isSiteDown(state) ? TICK_MS : 0;
  const values = [state.money, state.lifetimeEarnings, state.lifetimeVisitors, calculateVisitorsPerSecond(state), calculateNetRevenuePerSecond(state)];
  if (tracker.nonFiniteAt === null && values.some((value) => !Number.isFinite(value))) tracker.nonFiniteAt = now;
}

/** A ticket names the defense that would have stopped it: a player who won't play the minigame buys that instead. */
function buyDefenseAgainstTrouble(state: GameState): GameState {
  const counters = (defenseId: DefenseId): boolean => state.infections.some((infection) => infection.kind === DEFENSES_BY_ID[defenseId].countersHazard);
  const counter = DEFENSE_IDS.find((defenseId) => counters(defenseId) && canBuyDefense(state, defenseId));
  return counter === undefined ? state : buyDefense(state, counter);
}

/** Every type reads the tips: when an ad too many holds visitors under the goal, it takes one down. */
function followTips(state: GameState, profile: PlayerProfile): GameState {
  const defended = profile.buysDefenses ? buyDefenseAgainstTrouble(state) : state;
  return isVisitorsGoalBlockedByAds(defended) ? removeAd(defended) : defended;
}

/** One visit to the shop: buy, look again, buy again, until nothing more is worth it. The tips last, as a player would. */
function shop(state: GameState, profile: PlayerProfile): GameState {
  let current = state;
  for (let purchase = 0; purchase < MAX_PURCHASES_PER_VISIT; purchase += 1) {
    const next = decide(current, profile);
    if (next === current) return followTips(current, profile);
    current = next;
  }
  return followTips(current, profile);
}

function isEraId(value: string): value is EraId {
  return (ERA_IDS as readonly string[]).includes(value);
}

/** A new game, or the start of the era SIM_START names: each era's cliffs show up without playing the ones before. */
function createStart(type: PlayerType): GameState {
  const start = process.env['SIM_START'] ?? '';
  const state = isEraId(start) ? createPlaytestState(start, 'start', SEED, type.profile.framework) : createInitialGameState(SEED);
  return chooseConsentBanner(state, type.profile.consentBanner);
}

function play(type: PlayerType): PlayerReport {
  let state = createStart(type);
  let now = 0;
  let eraStartedAt = 0;
  let typingDebt = 0;
  const eras: EraOutcome[] = [];
  const seenAt = new Map<number, number>();
  const tracker: Tracker = { lowestMoney: 0, mostPopups: 0, mostInfections: 0, downMs: 0, nonFiniteAt: null, firstDebt: null };
  while (!state.isGameFinished && now - eraStartedAt < STUCK_ERA_MS) {
    typingDebt += (type.typingAt(now / MS_PER_MINUTE) * TICK_MS) / MS_PER_SECOND;
    const keystrokes = Math.floor(typingDebt);
    typingDebt -= keystrokes;
    const step = advanceSimulation(typeKeystrokes(state, keystrokes), TICK_MS, 'live');
    state = renewWhenNoticed(reactToHazards(step.state, seenAt, now, type.profile).state, seenAt, now, type.profile);
    if (now % type.decisionIntervalAt(now / MS_PER_MINUTE) === 0) state = shop(state, type.profile);
    track(tracker, state, now, step.events.map((event) => event.message));
    if (isEraGateComplete(state)) {
      eras.push({ eraId: state.eraId, minutes: (now - eraStartedAt) / MS_PER_MINUTE });
      state = chooseConsentBanner(advanceEra(state), type.profile.consentBanner);
      eraStartedAt = now;
    }
    now += TICK_MS;
  }
  return { name: type.profile.name, eras, finished: state.isGameFinished, stuckIn: state.isGameFinished ? null : state.eraId, minutes: now / MS_PER_MINUTE, oddities: tracker, lastState: state };
}

function describeEras(eras: readonly EraOutcome[]): string {
  return eras.map((era) => `${ERAS_BY_ID[era.eraId].year} ${era.minutes.toFixed(0)}m`).join(' · ');
}

function describeOddities(report: PlayerReport): string {
  const { oddities } = report;
  const downShare = (oddities.downMs / Math.max(1, report.minutes * MS_PER_MINUTE)) * 100;
  const nonFinite = oddities.nonFiniteAt === null ? '' : ` · NON-FINITE at ${(oddities.nonFiniteAt / MS_PER_MINUTE).toFixed(1)}m`;
  const debt = oddities.firstDebt === null ? '' : `\n  first debt: ${oddities.firstDebt}`;
  return `lowest money ${formatMoney(oddities.lowestMoney)} · most pop-ups ${oddities.mostPopups} · most infections ${oddities.mostInfections} · site down ${downShare.toFixed(1)}%${nonFinite}${debt}`;
}

function describeEnd(report: PlayerReport): string {
  const state = report.lastState;
  const outcome = report.finished ? `finished in ${report.minutes.toFixed(0)} min` : `STUCK in ${report.stuckIn ?? '?'} after ${report.minutes.toFixed(0)} min`;
  return `${outcome} · last ${formatCompactNumber(calculateVisitorsPerSecond(state))} visitors/s, ${formatMoney(calculateNetRevenuePerSecond(state))}/s, ${formatMoney(state.money)} saved, ${state.adCount} ads, ${state.purchasedUpgradeIds.length} upgrades, defenses: ${state.ownedDefenseIds.join(', ') || 'none'}`;
}

function main(): void {
  const wanted = (process.env['SIM_PLAYERS'] ?? '').split(',').filter((name) => name !== '');
  const types = wanted.length === 0 ? PLAYER_TYPES : PLAYER_TYPES.filter((type) => wanted.includes(type.profile.name));
  types.forEach((type) => {
    const report = play(type);
    console.log(`[${report.name}] ${type.description}`);
    console.log(`  ${describeEnd(report)}`);
    console.log(`  eras: ${describeEras(report.eras)}`);
    console.log(`  ${describeOddities(report)}`);
  });
}

main();
