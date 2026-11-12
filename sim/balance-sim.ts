/**
 * Headless balance check. A scripted player plays the real engine and we measure pacing.
 * Planned for CI: fail the merge request when an era's time leaves its target window.
 */
import { availableParallelism } from 'node:os';
import { isMainThread, MessagePort, parentPort, Worker } from 'node:worker_threads';
import {
  advanceEra,
  MS_PER_SECOND,
  chooseConsentBanner,
  advanceSimulation,
  buyDefense,
  buyFeature,
  buyUpgrade,
  calculateBugChance,
  calculateKeystrokeValue,
  calculateNetRevenuePerSecond,
  calculateNextAdCost,
  calculateNextFeatureCost,
  calculateRetirementPayout,
  calculateVisitorsPerSecond,
  canBuyDefense,
  canBuyFeature,
  canBuyUpgrade,
  canPlaceAd,
  closePopup,
  createInitialGameState,
  DEFENSES_BY_ID,
  ERA_IDS,
  ERAS_BY_ID,
  formatCompactNumber,
  formatMoney,
  getFeatureIdsOfEra,
  getAvailableSkillIds,
  getNextHostingTier,
  upgradeHosting,
  toggleFeature,
  canUpgradeHosting,
  calculateLoadTimeSeconds,
  calculatePhoneLoadTimeSeconds,
  calculatePerformanceTrafficFactor,
  calculateServerLoad,
  getRevealedBoostIds,
  canUseAds,
  isFeatureBuildable,
  isEraUnlocked,
  FEATURE_IDS,
  FEATURES_BY_ID,
  getUnlockedDefenseIds,
  getUnlockedFeatureIds,
  isEraGateComplete,
  isOnlySavingForMigration,
  placeAd,
  calculateInfectionDifficulty,
  cleanInfection,
  UPGRADES_BY_ID,
  writeCode,
  findFrameworkPickedBy,
  FRAMEWORK_IDS,
  type EraId,
  type FrameworkId,
  type GameState,
  type Infection,
  type UpgradeId,
  type ConsentBanner,
} from '../src/engine';

interface PlayerProfile {
  readonly name: string;
  readonly keystrokesPerSecond: number;
  readonly reactionMs: number;
  readonly buysDefenses: boolean;
  /** 2018's framework wars: the bot would always pick the best payback, so each run is told which one. */
  readonly framework: FrameworkId;
  /** 2018's cookie banner, chosen on arrival: the hurried player takes the dark pattern, the careful one asks honestly. */
  readonly consentBanner: ConsentBanner;
}

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

interface PurchaseOption {
  readonly label: string;
  readonly cost: number;
  readonly isRequiredForGate: boolean;
  readonly apply: (state: GameState) => GameState;
  readonly canApply: (state: GameState) => boolean;
  /** What the purchase is worth: for a skill, learning it plus building the first thing it unlocks. */
  readonly valueCost: number;
  readonly valueApply: (state: GameState) => GameState;
}

interface EraReport {
  readonly eraId: EraId;
  readonly durationMs: number;
  readonly keystrokeIncomeShareAtEnd: number;
  /** Share of the era spent playing minigames: the time budget is about a tenth. */
  readonly minigameShare: number;
}

interface HazardReaction {
  readonly state: GameState;
  readonly minigameMs: number;
}

const TICK_MS = 100;
const DECISION_INTERVAL_MS = 1_000;
/** Four eras of up to an hour each, for the slowest player, with room to spare. */
const MAX_SIMULATED_MS = 8 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
const REQUIRED_PURCHASE_PRIORITY = 0.25;
/** Rough time a player needs per difficulty level in any minigame (about 5, 10 or 15 seconds). */
const MINIGAME_MS_PER_DIFFICULTY = 5_000;
const SEED = 1997;
/** Early on, income is tiny and doubles easily; growth only counts once it's real. */
const MIN_REVENUE_FOR_GROWTH = 100;

const PROFILES: readonly PlayerProfile[] = [
  { name: 'active', keystrokesPerSecond: 6, reactionMs: 3_000, buysDefenses: false, framework: 'react', consentBanner: 'dark-pattern' },
  { name: 'relaxed', keystrokesPerSecond: 3, reactionMs: 12_000, buysDefenses: true, framework: 'angular', consentBanner: 'honest' },
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
const SEEDS_PER_FRAMEWORK = 3;
/** Far enough apart that the seeded rolls share nothing. */
const SEED_STRIDE = 7_919;

/** Only the profile's framework is on its shopping list. */
function isOtherFramework(skillId: UpgradeId, profile: PlayerProfile): boolean {
  const framework = findFrameworkPickedBy(skillId);
  return framework !== null && framework !== profile.framework;
}

/**
 * Income without the passing hazards (infections, pop-ups, traffic spikes, the quick-fix bonus). Growth is
 * measured on this, so cleaning an infection doesn't read as a snowball.
 */
function underlyingIncome(state: GameState, profile: PlayerProfile): number {
  return effectiveIncome({ ...state, infections: [], popups: [], trafficSpikeRemainingMs: 0, quickFixBonusRemainingMs: 0 }, profile);
}

function effectiveIncome(state: GameState, profile: PlayerProfile): number {
  const typingIncome =
    (calculateKeystrokeValue(state) * profile.keystrokesPerSecond) / (1 + calculateBugChance(state));
  return calculateNetRevenuePerSecond(state) + typingIncome;
}

function isGateFeature(state: GameState, featureId: string): boolean {
  const era = ERAS_BY_ID[state.eraId];
  const isEraFeature = getFeatureIdsOfEra(state.eraId).some((id) => id === featureId);
  const levelRequirement = era.gateRequirements.find((requirement) => requirement.featureId === featureId);
  const levelMissing =
    levelRequirement !== undefined &&
    state.featureLevels[levelRequirement.featureId ?? 'hit-counter'] < levelRequirement.target;
  const notBuiltYet = isEraFeature && state.featureLevels[featureId as keyof GameState['featureLevels']] === 0;
  return notBuiltYet || levelMissing;
}

function listOptions(state: GameState, profile: PlayerProfile): readonly PurchaseOption[] {
  const features = getUnlockedFeatureIds(state)
    .filter((featureId) => isFeatureBuildable(state, featureId))
    .map<PurchaseOption>((featureId) => {
      const apply = (current: GameState): GameState => buyFeature(current, featureId);
      const cost = calculateNextFeatureCost(state, featureId);
      // A first feature earns nothing without an ad, and an ad earns nothing without visitors: value them together.
      const needsFirstAd = state.adCount === 0 && canUseAds(state);
      const adCost = needsFirstAd ? calculateNextAdCost(state) : 0;
      const valueApply = (current: GameState): GameState => {
        const built = apply(current);
        return needsFirstAd ? placeAd({ ...built, money: built.money + adCost }) : built;
      };
      return { label: `feature:${featureId}`, cost, isRequiredForGate: isGateFeature(state, featureId), apply, canApply: (current) => canBuyFeature(current, featureId), valueCost: cost + adCost, valueApply };
    });
  const skills = getAvailableSkillIds(state).filter((skillId) => !isOtherFramework(skillId, profile)).map<PurchaseOption>((skillId) => {
    const learn = (current: GameState): GameState => buyUpgrade(current, skillId);
    const unlocked = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].requiredSkillId === skillId && isEraUnlocked(state, FEATURES_BY_ID[featureId].eraId));
    const firstFeature = unlocked[0];
    const cost = UPGRADES_BY_ID[skillId].cost;
    const featureCost = firstFeature === undefined ? 0 : calculateNextFeatureCost(state, firstFeature);
    const valueApply = (current: GameState): GameState => {
      const learned = learn(current);
      return firstFeature === undefined ? learned : buyFeature({ ...learned, money: learned.money + featureCost }, firstFeature);
    };
    const unlocksGateFeature = unlocked.some((featureId) => isGateFeature(state, featureId));
    return { label: `skill:${skillId}`, cost, isRequiredForGate: unlocksGateFeature, apply: learn, canApply: (current) => canBuyUpgrade(current, skillId), valueCost: cost + featureCost, valueApply };
  });
  const boosts = getRevealedBoostIds(state).map<PurchaseOption>((upgradeId) => {
    const apply = (current: GameState): GameState => buyUpgrade(current, upgradeId);
    const cost = UPGRADES_BY_ID[upgradeId].cost;
    return { label: `boost:${upgradeId}`, cost, isRequiredForGate: false, apply, canApply: (current) => canBuyUpgrade(current, upgradeId), valueCost: cost, valueApply: apply };
  });
  const adCost = calculateNextAdCost(state);
  const ads: PurchaseOption[] =
    canUseAds(state) && state.adCount < ERAS_BY_ID[state.eraId].maxAds
      ? [{ label: 'ad', cost: adCost, isRequiredForGate: false, apply: placeAd, canApply: canPlaceAd, valueCost: adCost, valueApply: placeAd }]
      : [];
  const defenses = profile.buysDefenses
    ? getUnlockedDefenseIds(state)
        .filter((defenseId) => !state.ownedDefenseIds.includes(defenseId))
        .map<PurchaseOption>((defenseId) => {
          const apply = (current: GameState): GameState => buyDefense(current, defenseId);
          const cost = DEFENSES_BY_ID[defenseId].cost;
          return { label: `defense:${defenseId}`, cost, isRequiredForGate: false, apply, canApply: (current) => canBuyDefense(current, defenseId), valueCost: cost, valueApply: apply };
        })
    : [];
  const nextTier = getNextHostingTier(state);
  const hosting: PurchaseOption[] = nextTier === null
    ? []
    : [{ label: `hosting:${nextTier.id}`, cost: nextTier.cost, isRequiredForGate: false, apply: upgradeHosting, canApply: canUpgradeHosting, valueCost: nextTier.cost, valueApply: upgradeHosting }];
  const switches = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].isSwitchable && state.featureLevels[featureId] > 0).map<PurchaseOption>((featureId) => {
    const apply = (current: GameState): GameState => toggleFeature(current, featureId);
    return { label: `switch:${featureId}`, cost: 0, isRequiredForGate: false, apply, canApply: () => true, valueCost: 0, valueApply: apply };
  });
  return [...features, ...skills, ...boosts, ...ads, ...defenses, ...hosting, ...switches];
}

function scoreOption(state: GameState, option: PurchaseOption, profile: PlayerProfile): number {
  const income = effectiveIncome(state, profile);
  const gain = effectiveIncome(option.valueApply({ ...state, money: option.valueCost }), profile) - income;
  const waitSeconds = Math.max(0, option.cost - state.money) / Math.max(income, Number.EPSILON);
  // Like a human reading the checklist, the bot buys what the gate requires even when it adds no income.
  const paybackSeconds = gain > 0 ? option.valueCost / gain : option.isRequiredForGate ? 0 : Number.POSITIVE_INFINITY;
  // A free switch is worth flipping only when it actually helps.
  if (option.cost === 0) return gain > 0 ? 0 : Number.POSITIVE_INFINITY;
  const priority = option.isRequiredForGate ? REQUIRED_PURCHASE_PRIORITY : 1;
  const defenseBonus = option.label.startsWith('defense:') ? REQUIRED_PURCHASE_PRIORITY : 1;
  return (waitSeconds + paybackSeconds) * priority * defenseBonus;
}

function improvesTimeToBudget(state: GameState, option: PurchaseOption, profile: PlayerProfile): boolean {
  const budget = ERAS_BY_ID[state.eraId].migrationCost;
  const income = effectiveIncome(state, profile);
  const after = option.apply(state);
  const remaining = budget - state.money;
  return (remaining + option.cost) / effectiveIncome(after, profile) < remaining / income;
}

function decide(state: GameState, profile: PlayerProfile): GameState {
  const savingOnly = isOnlySavingForMigration(state);
  const options = listOptions(state, profile).filter(
    (option) => !savingOnly || (option.canApply(state) && improvesTimeToBudget(state, option, profile)),
  );
  const ranked = [...options].sort((a, b) => scoreOption(state, a, profile) - scoreOption(state, b, profile));
  const best = ranked[0];
  if (best === undefined) return state;
  if (best.canApply(state)) return best.apply(state);
  // Saving up for the best option: meanwhile buy anything that pays for itself before that is affordable.
  const waitSeconds = Math.max(0, best.cost - state.money) / Math.max(effectiveIncome(state, profile), Number.EPSILON);
  const filler = ranked.find((option) => option.canApply(state) && option.cost > 0 && scoreOption(state, option, profile) < waitSeconds);
  return filler === undefined ? state : filler.apply(state);
}

function minigameDurationMs(infection: Infection): number {
  return calculateInfectionDifficulty(infection) * MINIGAME_MS_PER_DIFFICULTY;
}

/** Closes pop-ups after the reaction time, and plays each infection's minigame once noticed. */
function reactToHazards(state: GameState, seenAt: Map<number, number>, now: number, profile: PlayerProfile): HazardReaction {
  const ids = [...state.popups.map((popup) => popup.id), ...state.infections.map((infection) => infection.id)];
  ids.forEach((id) => (seenAt.has(id) ? undefined : seenAt.set(id, now)));
  const waitedMs = (id: number): number => now - (seenAt.get(id) ?? now);
  const withoutPopups = state.popups.filter((popup) => waitedMs(popup.id) >= profile.reactionMs).reduce((current, popup) => closePopup(current, popup.id), state);
  const finished = withoutPopups.infections.filter((infection) => waitedMs(infection.id) >= profile.reactionMs + minigameDurationMs(infection));
  return {
    state: finished.reduce<GameState>((current, infection) => cleanInfection(current, infection.id).state, withoutPopups),
    minigameMs: finished.reduce((total, infection) => total + minigameDurationMs(infection), 0),
  };
}

function typeKeystrokes(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>((current) => writeCode(current).state, state);
}

function runProfile(profile: PlayerProfile, start: EraEntry, log: Log): RunResult {
  let state = start.state;
  let now = start.now;
  let entry2018: EraEntry | null = null;
  let typingDebt = 0;
  let eraStartedAt = start.now;
  let minigameMsThisEra = 0;
  let revenueAMinuteAgo = 0;
  let steepestMinute = { ratio: 1, atMinute: 0 };
  const reports: EraReport[] = [];
  const seenAt = new Map<number, number>();
  const firstPurchases = new Map<string, number>();

  while (now < MAX_SIMULATED_MS && !state.prototypeComplete) {
    typingDebt += (profile.keystrokesPerSecond * TICK_MS) / 1000;
    const keystrokes = Math.floor(typingDebt);
    typingDebt -= keystrokes;
    state = typeKeystrokes(state, keystrokes);
    state = advanceSimulation(state, TICK_MS, 'live').state;
    const reaction = reactToHazards(state, seenAt, now, profile);
    state = reaction.state;
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
      state = decide(state, profile);
      Object.entries(state.featureLevels)
        .filter(([featureId, level]) => level > 0 && before[featureId as keyof typeof before] === 0)
        .forEach(([featureId]) => firstPurchases.set(featureId, now));
    }

    if (isEraGateComplete(state)) {
      const typingIncome = (calculateKeystrokeValue(state) * profile.keystrokesPerSecond) / (1 + calculateBugChance(state));
      reports.push({
        eraId: state.eraId,
        durationMs: now - eraStartedAt,
        keystrokeIncomeShareAtEnd: typingIncome / effectiveIncome(state, profile),
        minigameShare: minigameMsThisEra / Math.max(1, now - eraStartedAt),
      });
      log(
        `  [${profile.name}] ${state.eraId} done at ${(now / MS_PER_MINUTE).toFixed(1)} min · ` +
          `${formatCompactNumber(calculateVisitorsPerSecond(state))} visitors/s · ` +
          `${formatMoney(calculateNetRevenuePerSecond(state))}/s · ads ${state.adCount} · ` +
          `upgrades ${state.purchasedUpgradeIds.length} · load ${calculateLoadTimeSeconds(state).toFixed(1)}s (phone ${calculatePhoneLoadTimeSeconds(state).toFixed(1)}s, ${(calculatePerformanceTrafficFactor(state) * 100).toFixed(0)}% wait) · server ${(calculateServerLoad(state) * 100).toFixed(0)}% · hosting tier ${state.hostingTier}`,
      );
      reportTradeIn(profile.name, state, log);
      state = chooseConsentBanner(advanceEra(state), profile.consentBanner);
      if (state.eraId === FRAMEWORK_ERA && entry2018 === null) entry2018 = { state, now };
      eraStartedAt = now;
      minigameMsThisEra = 0;
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
  return { reports, entry2018 };
}

/** What the relaunch pays back for retired features, in seconds of the income the player has right then. */
function reportTradeIn(profileName: string, state: GameState, log: Log): void {
  const nextEraId = ERAS_BY_ID[state.eraId].nextEraId;
  if (nextEraId === null) return;
  const tradeIn = calculateRetirementPayout(state, nextEraId);
  const seconds = tradeIn / Math.max(1, calculateNetRevenuePerSecond(state));
  log(`  [${profileName}] trade-in at the relaunch into ${nextEraId}: ${formatMoney(tradeIn)}, ${seconds.toFixed(1)} s of income`);
}

function printReports(name: string, reports: readonly EraReport[], log: Log): void {
  reports.forEach((report) =>
    log(
      `  [${name}] ${report.eraId}: ${(report.durationMs / MS_PER_MINUTE).toFixed(1)} min, ` +
        `typing = ${(report.keystrokeIncomeShareAtEnd * 100).toFixed(0)}% of income at the end, ` +
        `minigames = ${(report.minigameShare * 100).toFixed(0)}% of play time`,
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
      finishedEveryEra: full.reports.length === ERA_IDS.length && frameworks.length === FRAMEWORK_IDS.length && frameworks.every(isFinished),
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
    console.log(`OK: every player finished all ${ERA_IDS.length} eras, with every framework within ${MAX_FRAMEWORK_SPREAD_SHARE * 100}% of the fastest.`);
  }
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const pool = createWorkerPool(availableParallelism());
  const played = await Promise.all(PROFILES.map((profile) => playProfile(pool, profile)));
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
