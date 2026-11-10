/**
 * Headless balance check. A scripted player plays the real engine and we measure pacing.
 * Planned for CI: fail the merge request when an era's time leaves its target window.
 */
import {
  advanceEra,
  advanceSimulation,
  buyDefense,
  buyFeature,
  buyUpgrade,
  calculateBugChance,
  calculateKeystrokeValue,
  calculateNetRevenuePerSecond,
  calculateNextAdCost,
  calculateNextFeatureCost,
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
  canUpgradeHosting,
  calculateLoadTimeSeconds,
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
  calculateRequiredVirusFood,
  removeVirus,
  scrubInfection,
  UPGRADES_BY_ID,
  writeCode,
  type EraId,
  type GameState,
} from '../src/engine';

interface PlayerProfile {
  readonly name: string;
  readonly keystrokesPerSecond: number;
  readonly reactionMs: number;
  readonly buysDefenses: boolean;
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
}

const TICK_MS = 100;
const DECISION_INTERVAL_MS = 1_000;
const MAX_SIMULATED_MS = 4 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
const REQUIRED_PURCHASE_PRIORITY = 0.25;
/** Rough time a player needs per piece of food in the snake minigame. */
const SNAKE_MS_PER_FOOD = 6_000;
const SEED = 1997;

const PROFILES: readonly PlayerProfile[] = [
  { name: 'active', keystrokesPerSecond: 6, reactionMs: 3_000, buysDefenses: false },
  { name: 'relaxed', keystrokesPerSecond: 3, reactionMs: 12_000, buysDefenses: true },
];

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
  const skills = getAvailableSkillIds(state).map<PurchaseOption>((skillId) => {
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
  return [...features, ...skills, ...boosts, ...ads, ...defenses, ...hosting];
}

function scoreOption(state: GameState, option: PurchaseOption, profile: PlayerProfile): number {
  const income = effectiveIncome(state, profile);
  const gain = effectiveIncome(option.valueApply({ ...state, money: option.valueCost }), profile) - income;
  const waitSeconds = Math.max(0, option.cost - state.money) / Math.max(income, Number.EPSILON);
  const paybackSeconds = gain > 0 ? option.valueCost / gain : Number.POSITIVE_INFINITY;
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
  return best !== undefined && best.canApply(state) ? best.apply(state) : state;
}

function reactToHazards(state: GameState, seenAt: Map<number, number>, now: number, profile: PlayerProfile): GameState {
  const ids = [...state.popups.map((popup) => popup.id), ...state.infections.map((infection) => infection.id)];
  ids.forEach((id) => (seenAt.has(id) ? undefined : seenAt.set(id, now)));
  const isDue = (id: number): boolean => now - (seenAt.get(id) ?? now) >= profile.reactionMs;
  const withoutPopups = state.popups.filter((popup) => isDue(popup.id)).reduce((current, popup) => closePopup(current, popup.id), state);
  return withoutPopups.infections
    .filter((infection) => isDue(infection.id))
    .reduce<GameState>((current, infection) => {
      if (infection.kind === 'virus') {
        const snakeMs = calculateRequiredVirusFood(infection) * SNAKE_MS_PER_FOOD;
        const isSnakeDone = now - (seenAt.get(infection.id) ?? now) >= profile.reactionMs + snakeMs;
        return isSnakeDone ? removeVirus(current, infection.id).state : current;
      }
      const clicks = Array.from({ length: infection.cleanClicksRemaining });
      return clicks.reduce<GameState>((scrubbing) => scrubInfection(scrubbing, infection.id).state, current);
    }, withoutPopups);
}

function typeKeystrokes(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>((current) => writeCode(current).state, state);
}

function runProfile(profile: PlayerProfile): readonly EraReport[] {
  let state = createInitialGameState(SEED);
  let now = 0;
  let typingDebt = 0;
  let eraStartedAt = 0;
  const reports: EraReport[] = [];
  const seenAt = new Map<number, number>();
  const firstPurchases = new Map<string, number>();

  while (now < MAX_SIMULATED_MS && !state.prototypeComplete) {
    typingDebt += (profile.keystrokesPerSecond * TICK_MS) / 1000;
    const keystrokes = Math.floor(typingDebt);
    typingDebt -= keystrokes;
    state = typeKeystrokes(state, keystrokes);
    state = advanceSimulation(state, TICK_MS, 'live').state;
    state = reactToHazards(state, seenAt, now, profile);

    if (process.env['SIM_TIMELINE'] === profile.name && now % MS_PER_MINUTE === 0) {
      const levels = Object.values(state.featureLevels).join('/');
      console.log(
        `    ${(now / MS_PER_MINUTE).toFixed(0).padStart(3)}m ${formatMoney(state.money).padStart(8)} ` +
          `rev ${formatMoney(calculateNetRevenuePerSecond(state)).padStart(7)}/s ` +
          `typing ${formatMoney(calculateKeystrokeValue(state) * profile.keystrokesPerSecond).padStart(7)}/s ` +
          `vis ${formatCompactNumber(calculateVisitorsPerSecond(state)).padStart(6)} ads ${state.adCount} levels ${levels} ` +
          `upg ${state.purchasedUpgradeIds.length} popups ${state.popups.length} inf ${state.infections.length}`,
      );
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
      });
      console.log(
        `  [${profile.name}] ${state.eraId} done at ${(now / MS_PER_MINUTE).toFixed(1)} min · ` +
          `${formatCompactNumber(calculateVisitorsPerSecond(state))} visitors/s · ` +
          `${formatMoney(calculateNetRevenuePerSecond(state))}/s · ads ${state.adCount} · ` +
          `upgrades ${state.purchasedUpgradeIds.length} · load ${calculateLoadTimeSeconds(state).toFixed(1)}s · server ${(calculateServerLoad(state) * 100).toFixed(0)}% · hosting tier ${state.hostingTier}`,
      );
      state = advanceEra(state);
      eraStartedAt = now;
    }
    now += TICK_MS;
  }

  console.log(
    `  [${profile.name}] first purchases: ` +
      [...firstPurchases.entries()].map(([id, at]) => `${id} @ ${(at / MS_PER_MINUTE).toFixed(1)}m`).join(', '),
  );
  const quitDayJob = state.reachedMilestoneIds.includes('quit-day-job');
  console.log(`  [${profile.name}] quit-day-job milestone reached: ${quitDayJob}`);
  return reports;
}

console.log('Balance simulation');
const stuckProfiles = PROFILES.filter((profile) => {
  const reports = runProfile(profile);
  reports.forEach((report) =>
    console.log(
      `  [${profile.name}] ${report.eraId}: ${(report.durationMs / MS_PER_MINUTE).toFixed(1)} min, ` +
        `typing = ${(report.keystrokeIncomeShareAtEnd * 100).toFixed(0)}% of income at the end`,
    ),
  );
  return reports.length < ERA_IDS.length;
});

// CI check: every scripted player has to finish every era. Timing is reported, never enforced.
if (stuckProfiles.length > 0) {
  const names = stuckProfiles.map((profile) => profile.name).join(', ');
  console.error(`FAILED: ${names} could not finish every era within ${MAX_SIMULATED_MS / MS_PER_MINUTE} simulated minutes.`);
  process.exitCode = 1;
} else {
  console.log(`OK: every player finished all ${ERA_IDS.length} eras.`);
}
