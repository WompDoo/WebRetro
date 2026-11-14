import { advanceSimulation, calculateInfectionDifficulty, cleanInfection, findChosenFramework, findInfection, getFeatureDisplayName, nameSite, startNextRun } from '../engine';
import type { SimulationMode } from '../engine';
import { createActionHandlers, createClickHandler, createKeydownHandler, writeCodeKeystroke } from './actions';
import { createCodeEditor } from './code-editor';
import { editorElements, elements, introElements, minigameElements } from './elements';
import { createIntro } from './intro';
import { installJavaScriptEffects } from './javascript-effects';
import { MAX_OFFLINE_MS, OFFLINE_THRESHOLD_MS, readLegacy, readPlaytestFlag, restoreGame, restorePreferences, writeSave } from './persistence';
import { createTapCounter, isPlaytestRequested } from './playtest';
import { installPhoneSwipe } from './phone-swipe';
import { installScrollDepth } from './scroll-depth';
import { installStoryChapters } from './story-chapters';
import { openPlaytestPanel, setPlaytestEnabled } from './playtest-actions';
import { createRenderer } from './renderer';
import { createMinigameModal } from './minigames/minigame-modal';
import type { MinigameTarget } from './minigames/types';
import { applyStep, pickStartingMobileTab, store, updateGame } from './store';

interface ClaudeHotApi {
  readonly data?: unknown;
  readonly snapshot?: (provider: () => unknown) => void;
  readonly ready?: (start: (data: unknown) => void) => void;
}

declare global {
  interface Window {
    claude?: { readonly hot?: ClaudeHotApi };
  }
}

const TICK_INTERVAL_MS = 100;
const AUTOSAVE_INTERVAL_MS = 5_000;

let lastTickAt = performance.now();
/** Nothing runs behind the intro, so a reload in the middle of naming the site is still a new game. */
let isSimulationPaused = (): boolean => false;

/** The simulation runs on a timer, separate from rendering, so it keeps going in a background tab. */
function tick(): void {
  const now = performance.now();
  const elapsedMs = Math.min(now - lastTickAt, MAX_OFFLINE_MS);
  lastTickAt = now;
  if (isSimulationPaused()) return;
  const mode: SimulationMode = elapsedMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'live';
  // Playtest speed runs more game time per tick; live or offline still depends on real time.
  applyStep(advanceSimulation(store.game, elapsedMs * store.playtestSpeed, mode));
}

/** The difficulty is read when an attempt starts, so an infection can't get harder in the middle of a run. */
function findMinigameTarget(infectionId: number): MinigameTarget | null {
  const infection = findInfection(store.game, infectionId);
  if (infection === null) return null;
  return {
    minigameId: infection.minigameId,
    difficulty: calculateInfectionDifficulty(infection),
    featureName: getFeatureDisplayName(infection.featureId, store.game.eraId).toLowerCase(),
    eraId: store.game.eraId,
    framework: findChosenFramework(store.game),
  };
}

function isJavaScriptLearnedIn1997(): boolean {
  return store.game.eraId === 'homepage-1997' && store.game.purchasedUpgradeIds.includes('learn-javascript');
}

/** A game nobody has played yet opens with the intro. Playtests and saves go straight in. */
function isNewGame(): boolean {
  return store.game.playTimeMs === 0 && !isPlaytestRequested(window.location);
}

function nameSiteAndSave(name: string): void {
  updateGame((state) => nameSite(state, name));
  writeSave();
}

function saveWhenHidden(): void {
  if (document.visibilityState === 'hidden') writeSave();
}

function start(hotData: unknown): void {
  store.legacy = readLegacy();
  store.game = startNextRun(store.legacy, store.game.randomSeed);
  restoreGame(hotData);
  restorePreferences();
  store.mobileTab = pickStartingMobileTab(store.game);
  const editor = createCodeEditor(editorElements, writeCodeKeystroke);
  const minigame = createMinigameModal(minigameElements, {
    findTarget: findMinigameTarget,
    onWin: (infectionId) => applyStep(cleanInfection(store.game, infectionId)),
  });
  const renderer = createRenderer(editor);
  const intro = createIntro(introElements, nameSiteAndSave);
  isSimulationPaused = intro.isOpen;
  installJavaScriptEffects(elements.site, elements.popupLayer, isJavaScriptLearnedIn1997);
  installScrollDepth(elements.site);
  installPhoneSwipe(elements.browserViewport, elements.site, installStoryChapters(elements.site));
  setPlaytestEnabled(isPlaytestRequested(window.location) || readPlaytestFlag());
  const countMoneyTap = createTapCounter(() => performance.now());
  elements.statMoney.addEventListener('pointerdown', () => {
    if (!countMoneyTap()) return;
    setPlaytestEnabled(true);
    openPlaytestPanel();
  });
  document.addEventListener('click', createClickHandler(createActionHandlers({ minigame, renderer, intro }), renderer));
  document.addEventListener('keydown', createKeydownHandler(minigame));
  document.addEventListener('visibilitychange', saveWhenHidden);
  window.addEventListener('pagehide', writeSave);
  window.setInterval(tick, TICK_INTERVAL_MS);
  window.setInterval(writeSave, AUTOSAVE_INTERVAL_MS);
  window.claude?.hot?.snapshot?.(() => ({ save: store.game }));
  lastTickAt = performance.now();
  renderer.startFrames();
  if (isNewGame()) intro.show();
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
