/**
 * Headless balance check. A scripted player plays the real engine and we measure pacing.
 * Planned for CI: fail the merge request when an era's time leaves its target window.
 */
import { availableParallelism } from 'node:os';
import { isMainThread, MessagePort, parentPort, Worker } from 'node:worker_threads';
import {
  advanceEra,
  BUFF_IDS,
  FEATURE_IDS,
  calculateHiredTypingPerSecond,
  MS_PER_SECOND,
  chooseConsentBanner,
  advanceSimulation,
  calculateBugChance,
  calculateKeystrokeValue,
  calculateNetRevenuePerSecond,
  calculateRetirementPayout,
  calculateVisitorsPerSecond,
  createInitialGameState,
  findNextEraId,
  getErasOfRun,
  formatCompactNumber,
  formatMoney,
  UPGRADES_BY_ID,
  calculateLoadTimeSeconds,
  calculatePhoneLoadTimeSeconds,
  calculatePerformanceTrafficFactor,
  calculateServerLoad,
  isEraGateComplete,
  FRAMEWORK_IDS,
  type BuffId,
  type EraId,
  type FrameworkId,
  type GameState,
  type TreeSpecializationId,
} from '../src/engine';
import { AD_LABEL, claimOfferWhenNoticed, decide, effectiveIncome, reactToHazards, renewWhenNoticed, typeKeystrokes, underlyingIncome } from './bot';
import { applySimSpecialization, applySwitches, SIM_SPECIALIZATION, SWITCHED_OFF } from './switches';
import { avoidsAdsAllRun, avoidsOffPath, chooseOnPath, describeSpendingShares, isPumping, SIM_PATH, startSecondRun, steerOnPath } from './path';
import type { ExtraAvoid, PlayerProfile } from './bot';


/** Where a run is when it relaunches into an era: the other frameworks' runs start from here. */
interface EraEntry {
  readonly state: GameState;
  readonly now: number;
}

/** Where a run's report lines go: collected per run, so runs in parallel can't interleave them. */
type Log = (line: string) => void;

interface RunResult {
  readonly reports: readonly EraReport[];
  readonly entry2018: EraEntry | null;
}


interface EraReport {
  readonly eraId: EraId;
  readonly durationMs: number;
  readonly keystrokeIncomeShareAtEnd: number;
  /** Share of the era spent playing minigames: the time budget is about a tenth. */
  readonly minigameShare: number;
  /** How much of the era the site sat behind an expired certificate's warning page. */
  readonly certificateExpiredShare: number;
  readonly certificateRenewals: number;
  /** How much of the era each buff was running. */
  readonly buffShares: Readonly<Record<BuffId, number>>;
  /** Hired help's share of income when the era ended. */
  readonly hiredShareAtEnd: number;
}

const NO_BUFF_TIME: Readonly<Record<BuffId, number>> = Object.fromEntries(BUFF_IDS.map((buffId) => [buffId, 0])) as Record<BuffId, number>;

function addBuffTime(time: Readonly<Record<BuffId, number>>, state: GameState, ms: number): Readonly<Record<BuffId, number>> {
  return state.buffs.reduce((total, buff) => ({ ...total, [buff.id]: total[buff.id] + ms }), time);
}

function shareOf(time: Readonly<Record<BuffId, number>>, durationMs: number): Readonly<Record<BuffId, number>> {
  return Object.fromEntries(BUFF_IDS.map((buffId) => [buffId, time[buffId] / Math.max(1, durationMs)])) as Record<BuffId, number>;
}


const TICK_MS = 100;
const DECISION_INTERVAL_MS = 1_000;
/** Four eras of up to an hour each, for the slowest player, with room to spare. */
const MAX_SIMULATED_MS = 8 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
/** SIM_SEED reruns everything from another start: one seed is one sample, and a run can be unlucky. */
const SEED = Number(process.env['SIM_SEED'] ?? 1997);
/** Early on, income is tiny and doubles easily; growth only counts once it's real. */
const MIN_REVENUE_FOR_GROWTH = 100;

const PROFILES: readonly PlayerProfile[] = [
  { name: 'active', keystrokesPerSecond: 6, reactionMs: 3_000, buysDefenses: false, framework: 'react', consentBanner: 'dark-pattern', policy: 'neutral' },
  { name: 'relaxed', keystrokesPerSecond: 3, reactionMs: 12_000, buysDefenses: true, framework: 'angular', consentBanner: 'honest', policy: 'neutral' },
];
const FRAMEWORK_ERA: EraId = 'platform-2018';
/**
 * Every framework has to be as good a pick as the others: 2018 may take at most this share longer with one than with
 * the fastest. (Two minutes when eras took ten; eras are long now, so it's a share.)
 */
const MAX_FRAMEWORK_SPREAD_SHARE = 0.15;
/**
 * Every hazard draws from one seeded random stream, so a framework whose builds break more often also shifts when
 * every later traffic spike lands: one seed per framework measures luck as much as balance. Each framework plays
 * 2018 this many times from the same relaunch, each with its own seed, and the medians are compared.
 */
const SEEDS_PER_FRAMEWORK = Number(process.env['SIM_SEEDS_PER_FRAMEWORK'] ?? 3);
/** Far enough apart that the seeded rolls share nothing. */
const SEED_STRIDE = 7_919;


/** The balance sim plays a first run: the 2000 crash comes with the third. */
const FIRST_RUN_ERAS = getErasOfRun(1);

/** On a path, the path moves first; whatever it leaves, the bot buys as usual, holding off what would spoil a lean. */
function decideOnPath(state: GameState, profile: PlayerProfile): GameState {
  if (SIM_PATH === null) return decide(state, profile);
  const pumping = isPumping(state, SIM_PATH, effectiveIncome(state, profile));
  return steerOnPath(state, SIM_PATH, pumping) ?? decide(state, profile, pathAvoids(state, SIM_PATH, pumping));
}

/** Only while pumping does the path hold other features back: building the economy first is the point. */
function avoidsWhilePumping(state: GameState, path: readonly TreeSpecializationId[], pumping: boolean): ExtraAvoid {
  return pumping ? avoidsOffPath(state, path) : () => false;
}

/** A path through the wiki never places an ad, all run; any path holds off what would spoil a lean while pumping. */
function pathAvoids(state: GameState, path: readonly TreeSpecializationId[], pumping: boolean): ExtraAvoid {
  const offPath = avoidsWhilePumping(state, path, pumping);
  const isAdFree = avoidsAdsAllRun(path);
  return (option) => (isAdFree && option.label === AD_LABEL) || offPath(option);
}

function chooseAlongPath(state: GameState, now: number, log: Log, name: string): GameState {
  if (SIM_PATH === null) return state;
  const chosen = chooseOnPath(state, SIM_PATH);
  const added = chosen.specializationIds.filter((id) => !state.specializationIds.includes(id));
  added.forEach((id) => log(`  [${name}] chose ${id} at ${(now / MS_PER_MINUTE).toFixed(1)} min, ${state.eraId}`));
  return chosen;
}

function describeUnlocked(state: GameState): string {
  return state.unlockedSpecializationIds.length === 0 ? 'none' : state.unlockedSpecializationIds.join(', ');
}

function describePathAtEraEnd(state: GameState): string {
  if (SIM_PATH === null) return '';
  return ` · spending: ${describeSpendingShares(state)} · unlocked: ${describeUnlocked(state)} · site: ${state.specializationIds.join('+') || 'homepage'}`;
}

function runProfile(profile: PlayerProfile, start: EraEntry, log: Log): RunResult {
  let state = SIM_PATH === null ? start.state : startSecondRun(start.state);
  let now = start.now;
  let entry2018: EraEntry | null = null;
  let typingDebt = 0;
  let eraStartedAt = start.now;
  let minigameMsThisEra = 0;
  let certificateExpiredMsThisEra = 0;
  let certificateRenewalsThisEra = 0;
  let buffMsThisEra = NO_BUFF_TIME;
  let revenueAMinuteAgo = 0;
  let steepestMinute = { ratio: 1, atMinute: 0 };
  const reports: EraReport[] = [];
  const seenAt = new Map<number, number>();
  const firstPurchases = new Map<string, number>();

  while (now < MAX_SIMULATED_MS && !state.isGameFinished) {
    typingDebt += (profile.keystrokesPerSecond * TICK_MS) / 1000;
    const keystrokes = Math.floor(typingDebt);
    typingDebt -= keystrokes;
    state = typeKeystrokes(state, keystrokes);
    state = applySimSpecialization(applySwitches(advanceSimulation(state, TICK_MS, 'live').state, SWITCHED_OFF), SIM_SPECIALIZATION);
    state = chooseAlongPath(state, now, log, profile.name);
    buffMsThisEra = addBuffTime(buffMsThisEra, state, TICK_MS);
    const reaction = reactToHazards(state, seenAt, now, profile);
    const wasExpired = reaction.state.isCertificateExpired;
    state = claimOfferWhenNoticed(renewWhenNoticed(reaction.state, seenAt, now, profile), seenAt, now, profile);
    certificateExpiredMsThisEra += Number(state.isCertificateExpired) * TICK_MS;
    certificateRenewalsThisEra += Number(wasExpired && !state.isCertificateExpired);
    minigameMsThisEra += reaction.minigameMs;

    if (process.env['SIM_TIMELINE'] === profile.name && now % MS_PER_MINUTE === 0) {
      const levels = Object.values(state.featureLevels).join('/');
      log(
        `    ${(now / MS_PER_MINUTE).toFixed(0).padStart(3)}m ${formatMoney(state.money).padStart(8)} ` +
          `rev ${formatMoney(calculateNetRevenuePerSecond(state)).padStart(7)}/s ` +
          `typing ${formatMoney(calculateKeystrokeValue(state) * profile.keystrokesPerSecond).padStart(7)}/s ` +
          `vis ${formatCompactNumber(calculateVisitorsPerSecond(state)).padStart(6)} ads ${state.adCount} levels ${levels} ` +
          `upg ${state.purchasedUpgradeIds.length} host ${state.hostingTier} server ${(calculateServerLoad(state) * 100).toFixed(0)}% load ${calculateLoadTimeSeconds(state).toFixed(1)}s`,
      );
    }
    if (now % MS_PER_MINUTE === 0) {
      const revenueNow = underlyingIncome(state, profile);
      const ratio = revenueAMinuteAgo > MIN_REVENUE_FOR_GROWTH ? revenueNow / revenueAMinuteAgo : 1;
      if (ratio > steepestMinute.ratio) steepestMinute = { ratio, atMinute: now / MS_PER_MINUTE };
      revenueAMinuteAgo = revenueNow;
    }
    if (now % DECISION_INTERVAL_MS === 0) {
      const before = state.featureLevels;
      const upgradesBefore = state.purchasedUpgradeIds;
      state = decideOnPath(state, profile);
      Object.entries(state.featureLevels)
        .filter(([featureId, level]) => level > 0 && before[featureId as keyof typeof before] === 0)
        .forEach(([featureId]) => firstPurchases.set(featureId, now));
      // Ops are the purchases that don't build anything: worth seeing when, and whether, a player sets them up.
      state.purchasedUpgradeIds
        .filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'ops' && !upgradesBefore.includes(upgradeId))
        .forEach((upgradeId) => firstPurchases.set(`ops:${upgradeId}`, now));
    }

    if (isEraGateComplete(state)) {
      const typingIncome = (calculateKeystrokeValue(state) * profile.keystrokesPerSecond) / (1 + calculateBugChance(state));
      reports.push({
        eraId: state.eraId,
        durationMs: now - eraStartedAt,
        keystrokeIncomeShareAtEnd: typingIncome / effectiveIncome(state, profile),
        minigameShare: minigameMsThisEra / Math.max(1, now - eraStartedAt),
        certificateExpiredShare: certificateExpiredMsThisEra / Math.max(1, now - eraStartedAt),
        certificateRenewals: certificateRenewalsThisEra,
        buffShares: shareOf(buffMsThisEra, now - eraStartedAt),
        hiredShareAtEnd: calculateHiredTypingPerSecond(state) / effectiveIncome(state, profile),
      });
      log(
        `  [${profile.name}] ${state.eraId} done at ${(now / MS_PER_MINUTE).toFixed(1)} min · ` +
          `${formatCompactNumber(calculateVisitorsPerSecond(state))} visitors/s · ` +
          `${formatMoney(calculateNetRevenuePerSecond(state))}/s · ads ${state.adCount} · ` +
          `upgrades ${state.purchasedUpgradeIds.length} · load ${calculateLoadTimeSeconds(state).toFixed(1)}s (phone ${calculatePhoneLoadTimeSeconds(state).toFixed(1)}s, ${(calculatePerformanceTrafficFactor(state) * 100).toFixed(0)}% wait) · server ${(calculateServerLoad(state) * 100).toFixed(0)}% · hosting tier ${state.hostingTier}` +
          describePathAtEraEnd(state),
      );
      reportTradeIn(profile.name, state, log);
      state = chooseConsentBanner(advanceEra(state), profile.consentBanner);
      if (state.eraId === FRAMEWORK_ERA && entry2018 === null) entry2018 = { state, now };
      eraStartedAt = now;
      minigameMsThisEra = 0;
      certificateExpiredMsThisEra = 0;
      certificateRenewalsThisEra = 0;
      buffMsThisEra = NO_BUFF_TIME;
    }
    now += TICK_MS;
  }

  log(
    `  [${profile.name}] first purchases: ` +
      [...firstPurchases.entries()].map(([id, at]) => `${id} @ ${(at / MS_PER_MINUTE).toFixed(1)}m`).join(', '),
  );
  log(`  [${profile.name}] steepest minute: underlying income ×${steepestMinute.ratio.toFixed(1)} at minute ${steepestMinute.atMinute}`);
  const quitDayJob = state.reachedMilestoneIds.includes('quit-day-job');
  log(`  [${profile.name}] quit-day-job milestone reached: ${quitDayJob}`);
  reportLevels(profile.name, state, 'the end', log);
  return { reports, entry2018 };
}

/** What the relaunch pays back for retired features, in seconds of the income the player has right then. */
function reportTradeIn(profileName: string, state: GameState, log: Log): void {
  const nextEraId = findNextEraId(state);
  if (nextEraId === null) return;
  const tradeIn = calculateRetirementPayout(state, nextEraId);
  const seconds = tradeIn / Math.max(1, calculateNetRevenuePerSecond(state));
  log(`  [${profileName}] trade-in at the relaunch into ${nextEraId}: ${formatMoney(tradeIn)}, ${seconds.toFixed(1)} s of income`);
  reportLevels(profileName, state, `the relaunch into ${nextEraId}`, log);
}

/**
 * What a player has built by a relaunch, without chasing anything: where a specialization's unlock has to sit above
 * to be a commitment. With the income then, to price the levels above it.
 */
function reportLevels(profileName: string, state: GameState, moment: string, log: Log): void {
  const levels = FEATURE_IDS.filter((featureId) => state.featureLevels[featureId] > 0).map((featureId) => `${featureId} ${state.featureLevels[featureId]}`);
  log(`  [${profileName}] levels at ${moment} (${formatMoney(calculateNetRevenuePerSecond(state))}/s): ${levels.join(', ')}`);
}

function printReports(name: string, reports: readonly EraReport[], log: Log): void {
  reports.forEach((report) =>
    log(
      `  [${name}] ${report.eraId}: ${(report.durationMs / MS_PER_MINUTE).toFixed(1)} min, ` +
        `typing = ${(report.keystrokeIncomeShareAtEnd * 100).toFixed(0)}% of income at the end, ` +
        `minigames = ${(report.minigameShare * 100).toFixed(0)}% of play time, ` +
        `certificate expired ${(report.certificateExpiredShare * 100).toFixed(1)}% of it (${report.certificateRenewals} renewals), ` +
        `hires = ${(report.hiredShareAtEnd * 100).toFixed(0)}% of income at the end, buffs running: ` +
        BUFF_IDS.map((buffId) => `${buffId} ${(report.buffShares[buffId] * 100).toFixed(0)}%`).join(' '),
    ),
  );
}

function find2018Minutes(reports: readonly EraReport[]): number | null {
  const report = reports.find((candidate) => candidate.eraId === FRAMEWORK_ERA);
  return report === undefined ? null : report.durationMs;
}

/** 2018 with one framework, once per seed; null where a run never finished 2018. */
interface FrameworkOutcome {
  readonly framework: FrameworkId;
  readonly durationsMs: readonly (number | null)[];
}

interface ProfileOutcome {
  readonly name: string;
  readonly finishedEveryEra: boolean;
  /** The profile's own framework first. */
  readonly frameworks: readonly FrameworkOutcome[];
}

function reseed(entry: EraEntry, attempt: number): EraEntry {
  return { ...entry, state: { ...entry.state, randomSeed: entry.state.randomSeed + attempt * SEED_STRIDE } };
}

// ---------- Running in parallel ----------
// Every run is independent and seeded, so they run on every core at once, each in a worker thread, with the same
// results as one after another. A run's lines come back with its result and are printed in a fixed order.

/** One run: a profile's whole game from the start, or 2018 again from its relaunch, with one framework and seed. */
interface RunTask {
  readonly profile: PlayerProfile;
  readonly start: EraEntry;
}

interface TaskResult extends RunResult {
  readonly lines: readonly string[];
}

interface TaskMessage {
  readonly id: number;
  readonly task: RunTask;
}

interface ResultMessage {
  readonly id: number;
  readonly result: TaskResult;
}

function runTask(task: RunTask): TaskResult {
  const lines: string[] = [];
  const log: Log = (line) => {
    lines.push(line);
  };
  const result = runProfile(task.profile, task.start, log);
  printReports(task.profile.name, result.reports, log);
  return { ...result, lines };
}

interface WorkerPool {
  readonly run: (task: RunTask) => Promise<TaskResult>;
  readonly close: () => Promise<void>;
}

function failLoudly(error: Error): void {
  console.error(error);
  process.exit(1);
}

/** Workers take the next waiting task as soon as they finish one. */
function createWorkerPool(size: number): WorkerPool {
  const waiting: TaskMessage[] = [];
  const idle: Worker[] = [];
  const pending = new Map<number, (result: TaskResult) => void>();
  let nextId = 0;
  const startNext = (worker: Worker): void => {
    const next = waiting.shift();
    if (next === undefined) idle.push(worker);
    else worker.postMessage(next);
  };
  const workers = Array.from({ length: size }, () => {
    const worker = new Worker(__filename);
    worker.on('message', (message: ResultMessage) => {
      pending.get(message.id)?.(message.result);
      pending.delete(message.id);
      startNext(worker);
    });
    worker.on('error', failLoudly);
    idle.push(worker);
    return worker;
  });
  return {
    run: (task) =>
      new Promise((resolve) => {
        pending.set(nextId, resolve);
        waiting.push({ id: nextId, task });
        nextId += 1;
        const worker = idle.pop();
        if (worker !== undefined) startNext(worker);
      }),
    close: async () => {
      await Promise.all(workers.map((worker) => worker.terminate()));
    },
  };
}

function serveTasks(port: MessagePort): void {
  port.on('message', (message: TaskMessage) => {
    const reply: ResultMessage = { id: message.id, result: runTask(message.task) };
    port.postMessage(reply);
  });
}

// ---------- The 2018 branches: every framework, every seed ----------

interface Branch {
  readonly framework: FrameworkId;
  readonly attempt: number;
}

/** The full run already played the profile's own framework with the first seed. */
function listBranches(profile: PlayerProfile): readonly Branch[] {
  return FRAMEWORK_IDS.flatMap((framework) => {
    const firstAttempt = framework === profile.framework ? 1 : 0;
    return Array.from({ length: SEEDS_PER_FRAMEWORK - firstAttempt }, (_, index) => ({ framework, attempt: firstAttempt + index }));
  });
}

function toBranchTask(profile: PlayerProfile, branch: Branch, entry: EraEntry): RunTask {
  return { profile: { ...profile, name: `${profile.name}/${branch.framework}#${branch.attempt + 1}`, framework: branch.framework }, start: reseed(entry, branch.attempt) };
}

function isFinished(outcome: FrameworkOutcome): boolean {
  return outcome.durationsMs.every((duration) => duration !== null);
}

interface PlayedProfile {
  readonly outcome: ProfileOutcome;
  readonly lines: readonly string[];
}

function collectFrameworks(profile: PlayerProfile, full: TaskResult, branches: readonly Branch[], results: readonly TaskResult[]): readonly FrameworkOutcome[] {
  return FRAMEWORK_IDS.map((framework) => {
    const own = framework === profile.framework ? [find2018Minutes(full.reports)] : [];
    const seeded = branches.flatMap((branch, index) => (branch.framework === framework ? [find2018Minutes(results[index]?.reports ?? [])] : []));
    return { framework, durationsMs: [...own, ...seeded] };
  });
}

/** The own framework first, as the report lists it. */
function ownFirst(profile: PlayerProfile, frameworks: readonly FrameworkOutcome[]): readonly FrameworkOutcome[] {
  return [...frameworks.filter((outcome) => outcome.framework === profile.framework), ...frameworks.filter((outcome) => outcome.framework !== profile.framework)];
}

/** The full run, then 2018 again from the same relaunch: every framework, every seed, queued as soon as it can be. */
async function playProfile(pool: WorkerPool, profile: PlayerProfile): Promise<PlayedProfile> {
  const full = await pool.run({ profile, start: { state: createInitialGameState(SEED), now: 0 } });
  const entry = full.entry2018;
  const branches = entry === null ? [] : listBranches(profile);
  const results = entry === null ? [] : await Promise.all(branches.map((branch) => pool.run(toBranchTask(profile, branch, entry))));
  const frameworks = entry === null ? [] : ownFirst(profile, collectFrameworks(profile, full, branches, results));
  return {
    outcome: {
      name: profile.name,
      finishedEveryEra: full.reports.length === FIRST_RUN_ERAS.length && frameworks.length === FRAMEWORK_IDS.length && frameworks.every(isFinished),
      frameworks,
    },
    lines: [...full.lines, ...results.flatMap((result) => result.lines)],
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function medianDurationMs(outcome: FrameworkOutcome): number {
  return median(outcome.durationsMs.filter((duration): duration is number => duration !== null));
}

/** How much longer the slowest framework's median took than the fastest's, as a share of the fastest. */
function measureSpread(frameworks: readonly FrameworkOutcome[]): number {
  const medians = frameworks.map(medianDurationMs);
  return medians.length === 0 ? 0 : (Math.max(...medians) - Math.min(...medians)) / Math.min(...medians);
}

function describeFramework(outcome: FrameworkOutcome): string {
  const runs = outcome.durationsMs.map((ms) => (ms === null ? 'stuck' : (ms / MS_PER_MINUTE).toFixed(1))).join(', ');
  return `${outcome.framework} ${(medianDurationMs(outcome) / MS_PER_MINUTE).toFixed(1)} min (${runs})`;
}

/** CI checks: every scripted player has to finish every era with every framework, and no framework may be a clearly worse pick. */
function judge(outcomes: readonly ProfileOutcome[]): void {
  const stuckProfiles = outcomes.filter((outcome) => !outcome.finishedEveryEra);
  const lopsided = outcomes.filter((outcome) => measureSpread(outcome.frameworks) > MAX_FRAMEWORK_SPREAD_SHARE);
  if (stuckProfiles.length > 0) {
    const names = stuckProfiles.map((outcome) => outcome.name).join(', ');
    console.error(`FAILED: ${names} could not finish every era within ${MAX_SIMULATED_MS / MS_PER_MINUTE} simulated minutes.`);
    process.exitCode = 1;
  } else if (lopsided.length > 0) {
    const names = lopsided.map((outcome) => outcome.name).join(', ');
    console.error(`FAILED: for ${names}, one framework's median makes 2018 more than ${MAX_FRAMEWORK_SPREAD_SHARE * 100}% slower than another's.`);
    process.exitCode = 1;
  } else {
    console.log(`OK: every player finished all ${FIRST_RUN_ERAS.length} eras, with every framework within ${MAX_FRAMEWORK_SPREAD_SHARE * 100}% of the fastest.`);
  }
}

/**
 * CI runs one profile per job (SIM_PROFILE=active or relaxed), in parallel: each still plays a whole game, and
 * together they check what one job used to. A name that matches nothing fails, rather than passing on zero players.
 */
function selectProfiles(): readonly PlayerProfile[] {
  const wanted = process.env['SIM_PROFILE'] ?? '';
  return wanted === '' ? PROFILES : PROFILES.filter((profile) => profile.name === wanted);
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const profiles = selectProfiles();
  if (profiles.length === 0) {
    console.error(`FAILED: SIM_PROFILE=${process.env['SIM_PROFILE'] ?? ''} names no player. Known: ${PROFILES.map((profile) => profile.name).join(', ')}.`);
    process.exitCode = 1;
    return;
  }
  const pool = createWorkerPool(availableParallelism());
  const played = await Promise.all(profiles.map((profile) => playProfile(pool, profile)));
  await pool.close();
  console.log('Balance simulation');
  played.forEach(({ lines }) => lines.forEach((line) => console.log(line)));
  played.forEach(({ outcome }) =>
    console.log(
      `  [${outcome.name}] 2018 by framework, median of ${SEEDS_PER_FRAMEWORK} seeds: ${outcome.frameworks.map(describeFramework).join(' · ')} · spread ${(measureSpread(outcome.frameworks) * 100).toFixed(1)}%`,
    ),
  );
  console.log(`  ${played.length} players on ${availableParallelism()} cores in ${((performance.now() - startedAt) / MS_PER_SECOND).toFixed(0)} s`);
  judge(played.map(({ outcome }) => outcome));
}

// The same file is the main program and every worker.
if (isMainThread) void main();
else if (parentPort !== null) serveTasks(parentPort);
