import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  advanceSimulation,
  buyDefense,
  buyFeatureLevels,
  buyUpgrade,
  calculateBugChance,
  calculateEconomySnapshot,
  calculateKeystrokeValue,
  canRenewCertificate,
  chooseConsentBanner,
  cleanInfection,
  closePopup,
  CONSENT_BANNER_IDS,
  createPlaytestState,
  dismissCookieBanner,
  ERA_IDS,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  fallForPopupScam,
  FRAMEWORK_IDS,
  getAvailableOpsIds,
  getAvailableSkillIds,
  getRevealedBoostIds,
  getUnlockedDefenseIds,
  getUnlockedFeatureIds,
  HOSTING_TIERS,
  isEraGateComplete,
  MAX_OPEN_POPUPS,
  placeAd,
  removeAd,
  renewCertificate,
  restoreGameState,
  toggleDefense,
  toggleFeature,
  upgradeHosting,
  writeCode,
} from '../src/engine';
import type { EraId, FrameworkId, GameState } from '../src/engine';
import { buildEditorTabs, buildPerformanceReadout, buildSiteUrl, buildStatusText } from '../src/ui/browser-chrome';
import { listIssues } from '../src/ui/issues';
import { renderShopBody, SHOP_TABS } from '../src/ui/render-shop';
import { renderSite } from '../src/ui/sites';
import { buildEditorSource } from '../src/ui/skill-code';

/**
 * Random play from every era's presets: buy anything, place and remove ads, switch defenses, play minigames, fall for
 * scams, answer the cookie banner, renew certificates, go away for an hour, save and reload, relaunch. After every
 * step the game must still make sense, and what it shows must never say NaN or undefined. It found a spam flood
 * stacking on top of a DDoS on the same comments.
 */

const STEPS_PER_RUN = 1_200;
const RENDER_EVERY_STEPS = 60;
const MAX_STEP_MS = 4_000;
const MAX_AWAY_MS = 3_600_000;
const KEYSTROKES_PER_BURST = 20;
const MAX_LEVELS_PER_BUY = 10;
const SCAM_CHANCE = 0.1;
const REMOVE_AD_CHANCE = 0.2;
const RANDOM_MODULUS = 2_147_483_648;
const BAD_TEXT = /NaN|undefined|Infinity|\[object /;

/** A seeded generator, so a failure replays exactly. */
function createRandom(seed: number): () => number {
  let current = seed;
  return () => {
    current = (current * 1_103_515_245 + 12_345) % RANDOM_MODULUS;
    return current / RANDOM_MODULUS;
  };
}

interface Invariant {
  readonly name: string;
  readonly holds: (state: GameState) => boolean;
}

const isFiniteNumber = (value: unknown): boolean => typeof value !== 'number' || Number.isFinite(value);
const isUnique = (values: readonly unknown[]): boolean => new Set(values).size === values.length;

const INVARIANTS: readonly Invariant[] = [
  { name: 'money and earnings are finite', holds: (state) => Number.isFinite(state.money) && Number.isFinite(state.lifetimeEarnings) },
  { name: 'the economy has no NaN or infinity', holds: (state) => Object.values(calculateEconomySnapshot(state)).every(isFiniteNumber) },
  { name: 'visitors are never negative', holds: (state) => calculateEconomySnapshot(state).visitorsPerSecond >= 0 },
  { name: 'a keystroke is worth something', holds: (state) => calculateKeystrokeValue(state) >= 0 },
  { name: 'the typo chance is a chance', holds: (state) => calculateBugChance(state) >= 0 && calculateBugChance(state) <= 1 },
  { name: 'feature levels are whole and not negative', holds: (state) => FEATURE_IDS.every((id) => Number.isInteger(state.featureLevels[id]) && state.featureLevels[id] >= 0) },
  { name: 'nothing is bought twice', holds: (state) => isUnique(state.purchasedUpgradeIds) && isUnique(state.ownedDefenseIds) },
  { name: 'only owned defenses are on', holds: (state) => state.enabledDefenseIds.every((id) => state.ownedDefenseIds.includes(id)) },
  { name: 'pop-ups stay under the cap', holds: (state) => state.popups.length <= MAX_OPEN_POPUPS },
  { name: 'one trouble per feature at a time', holds: (state) => isUnique(state.infections.map((infection) => infection.featureId)) },
  { name: 'ads stay within the era’s slots', holds: (state) => state.adCount >= 0 && state.adCount <= ERAS_BY_ID[state.eraId].maxAds },
  { name: 'the hosting tier exists', holds: (state) => state.hostingTier >= 0 && state.hostingTier < HOSTING_TIERS.length },
];

/** Everything the player reads, as text. */
function renderEverything(state: GameState): readonly string[] {
  const economy = calculateEconomySnapshot(state);
  const view = { buyAmount: 1, isScrollJackingOn: true } as const;
  return [
    renderSite(state, 0),
    ...SHOP_TABS.map((tab) => renderShopBody(state, tab, view)),
    JSON.stringify(listIssues(state)),
    ...buildEditorTabs(state).files.map((file) => buildEditorSource(state, file)),
    `${buildSiteUrl(state)} ${buildStatusText(state, economy, 'desktop')} ${buildStatusText(state, economy, 'phone')} ${buildPerformanceReadout(state, economy)}`,
  ];
}

type Move = (state: GameState, random: () => number) => GameState;

function pick<T>(items: readonly T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)];
}

const MOVES: readonly Move[] = [
  (state) => Array.from({ length: KEYSTROKES_PER_BURST }).reduce<GameState>((current) => writeCode(current).state, state),
  (state, random) => {
    const id = pick([...getAvailableSkillIds(state), ...getRevealedBoostIds(state), ...getAvailableOpsIds(state)], random);
    return id === undefined ? state : buyUpgrade(state, id);
  },
  (state, random) => {
    const id = pick(getUnlockedFeatureIds(state), random);
    return id === undefined ? state : buyFeatureLevels(state, id, 1 + Math.floor(random() * MAX_LEVELS_PER_BUY));
  },
  (state) => placeAd(state),
  (state, random) => (random() < REMOVE_AD_CHANCE ? removeAd(state) : state),
  (state, random) => {
    const id = pick(getUnlockedDefenseIds(state), random);
    return id === undefined ? state : buyDefense(state, id);
  },
  (state, random) => {
    const id = pick(state.ownedDefenseIds, random);
    return id === undefined ? state : toggleDefense(state, id);
  },
  (state) => upgradeHosting(state),
  (state, random) => {
    const infection = pick(state.infections, random);
    return infection === undefined ? state : cleanInfection(state, infection.id).state;
  },
  (state, random) => {
    const popup = pick(state.popups, random);
    return popup === undefined ? state : closePopup(state, popup.id);
  },
  (state, random) => {
    const popup = pick(state.popups, random);
    return popup === undefined || random() > SCAM_CHANCE ? state : fallForPopupScam(state, popup.id).state;
  },
  (state, random) => chooseConsentBanner(state, pick(CONSENT_BANNER_IDS, random) ?? 'none'),
  (state) => dismissCookieBanner(state),
  (state) => (canRenewCertificate(state) ? renewCertificate(state) : state),
  (state, random) => {
    const id = pick(FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].isSwitchable), random);
    return id === undefined ? state : toggleFeature(state, id);
  },
  // A windfall now and then, so random play reaches the expensive end of an era.
  (state) => ({ ...state, money: state.money * 3 + 1_000 }),
  (state) => (isEraGateComplete(state) && ERAS_BY_ID[state.eraId].nextEraId !== null ? advanceEra(state) : state),
  (state, random) => advanceSimulation(state, Math.floor(random() * MAX_AWAY_MS), 'offline').state,
  // Save and reload: what comes back is the same game.
  (state) => restoreGameState(JSON.parse(JSON.stringify(state)), 1) ?? state,
];

interface Run {
  readonly eraId: EraId;
  readonly stage: 'start' | 'end';
  readonly framework: FrameworkId;
}

function listRuns(): readonly Run[] {
  return ERA_IDS.flatMap((eraId) => {
    const frameworks = eraId === 'platform-2018' ? FRAMEWORK_IDS : (['react'] as const);
    return (['start', 'end'] as const).flatMap((stage) => frameworks.map((framework) => ({ eraId, stage, framework })));
  });
}

function step(state: GameState, random: () => number): GameState {
  const move = pick(MOVES, random) ?? MOVES[0];
  return advanceSimulation(move(state, random), Math.floor(random() * MAX_STEP_MS), 'live').state;
}

function findBroken(state: GameState): readonly string[] {
  return INVARIANTS.filter((invariant) => !invariant.holds(state)).map((invariant) => invariant.name);
}

describe('random play keeps the game sane', () => {
  listRuns().forEach((run, index) => {
    it(`from ${run.eraId} (${run.stage}, ${run.framework})`, () => {
      const random = createRandom(index + 1);
      let state = createPlaytestState(run.eraId, run.stage, index + 1, run.framework);
      for (let count = 1; count <= STEPS_PER_RUN; count += 1) {
        state = step(state, random);
        assert.deepEqual(findBroken(state), [], `step ${count} in ${state.eraId}`);
        if (count % RENDER_EVERY_STEPS === 0) assert.equal(renderEverything(state).find((text) => BAD_TEXT.test(text)), undefined, `step ${count}`);
      }
    });
  });
});
