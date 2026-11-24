import { advanceSimulation, calculateInfectionDifficulty, closeOpportunity, openOpportunity, chooseSiteColors, recordAchievements, recordFoundSpecializations, claimOpportunity, cleanInfection, findChosenFramework, findInfection, findOpportunity, loseOpportunity, notePokedWithDevTools, OPPORTUNITIES_BY_KIND, getBaseEraId, getFeatureDisplayName, nameSite, startNextRun } from '../engine';
import type { SimulationMode } from '../engine';
import { createAchievementToaster } from './achievement-toast';
import { attachBadgeTooltip } from './badge-tooltip';
import { greetInConsole, watchForDevTools } from './dev-tools-watch';
import { createActionHandlers, createClickHandler, createKeydownHandler, showAchievementsButton, writeCodeKeystroke } from './actions';
import { createCodeEditor } from './code-editor';
import { editorElements, elements, introElements, minigameElements } from './elements';
import { createIntro } from './intro';
import { installJavaScriptEffects } from './javascript-effects';
import { adoptTestBuildDataHere, MAX_OFFLINE_MS, OFFLINE_THRESHOLD_MS, readLegacy, readPlaytestFlag, restoreGame, restorePreferences, writeLegacy, writeSave } from './persistence';
import { createTapCounter, isPlaytestRequested } from './playtest';
import { installPhoneSwipe } from './phone-swipe';
import { installScrollDepth } from './scroll-depth';
import { installStoryChapters } from './story-chapters';
import { openPlaytestPanel, setPlaytestEnabled } from './playtest-actions';
import { createRenderer } from './renderer';
import { createMinigameModal } from './minigames/minigame-modal';
import type { MinigameTarget } from './minigames/types';
import { applyStep, markSiteSeen, pickStartingMobileTab, pushMessage, store, updateGame } from './store';
import { drainTypingIncome } from './typing-income';
import { findPickerColors } from './render-site-colors';
import { installSiteColorsPicker } from './site-colors-picker';

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
const EDITED_NUMBER_NOTE = 'Nice try. The number on the screen isn’t the number in the game.';

const toaster = createAchievementToaster(elements.achievementToast);

let lastTickAt = performance.now();
/** Nothing runs behind the intro, so a reload in the middle of naming the site is still a new game. */
let isSimulationPaused = (): boolean => false;

/** The simulation runs on a timer, separate from rendering, so it keeps going in a background tab. */
function tick(): void {
  const now = performance.now();
  const elapsedMs = Math.min(now - lastTickAt, MAX_OFFLINE_MS);
  lastTickAt = now;
  store.typingIncomePool = drainTypingIncome(store.typingIncomePool, elapsedMs);
  if (isSimulationPaused()) return;
  const mode: SimulationMode = elapsedMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'live';
  // Playtest speed runs more game time per tick; live or offline still depends on real time.
  applyStep(advanceSimulation(store.game, elapsedMs * store.playtestSpeed, mode));
  recordFound();
}

/**
 * A specialization unlocked in any run stays in the collection, and an achievement once earned stays earned: both go
 * into the legacy as they happen. A newly earned achievement pops up at the bottom of the screen.
 */
function recordFound(): void {
  const found = recordFoundSpecializations(store.legacy, store.game.unlockedSpecializationIds);
  // A run the playtest tools changed earns nothing (the engine checks); having them switched on changes nothing.
  const recorded = recordAchievements(found, store.game);
  if (recorded === store.legacy) return;
  toaster.announce(recorded.achievementIds.filter((id) => !store.legacy.achievementIds.includes(id)));
  store.legacy = recorded;
  writeLegacy();
  showAchievementsButton();
}

/** Opening the developer tools is a secret achievement; editing a number with them gets a word, too. */
function watchDevTools(): void {
  greetInConsole();
  watchForDevTools([elements.statMoney, elements.statVisitors, elements.statIncome, elements.statBacklinks], {
    onShortcut: () => updateGame(notePokedWithDevTools),
    onEditedNumber: () => {
      updateGame(notePokedWithDevTools);
      pushMessage(EDITED_NUMBER_NOTE);
    },
  });
}

/** An offer's minigame: a fresh code in the era's format, whatever the difficulty. */
function findOpportunityTarget(opportunityId: number): MinigameTarget | null {
  const opportunity = findOpportunity(store.game, opportunityId);
  if (opportunity === null) return null;
  return { minigameId: OPPORTUNITIES_BY_KIND[opportunity.kind].minigameId, difficulty: 1, featureName: '', eraId: store.game.eraId, framework: findChosenFramework(store.game) };
}

/**
 * Infections and offers share one id counter, so one id names one or the other. The difficulty is read when an
 * attempt starts, so an infection can't get harder in the middle of a run.
 */
function findMinigameTarget(id: number): MinigameTarget | null {
  const infection = findInfection(store.game, id);
  if (infection === null) return findOpportunityTarget(id);
  return {
    minigameId: infection.minigameId,
    difficulty: calculateInfectionDifficulty(infection),
    featureName: getFeatureDisplayName(infection.featureId, store.game.eraId).toLowerCase(),
    eraId: store.game.eraId,
    framework: findChosenFramework(store.game),
  };
}

function isJavaScriptLearnedIn1997(): boolean {
  return getBaseEraId(store.game.eraId) === 'homepage-1997' && store.game.purchasedUpgradeIds.includes('learn-javascript');
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
  adoptTestBuildDataHere();
  store.legacy = readLegacy();
  showAchievementsButton();
  store.game = startNextRun(store.legacy, store.game.randomSeed);
  restoreGame(hotData);
  restorePreferences();
  store.mobileTab = pickStartingMobileTab(store.game);
  // A returning player's site is all seen: only what they add from now on is news.
  markSiteSeen();
  const editor = createCodeEditor(editorElements, writeCodeKeystroke);
  const minigame = createMinigameModal(minigameElements, {
    findTarget: findMinigameTarget,
    onWin: (id) => applyStep(findInfection(store.game, id) === null ? claimOpportunity(store.game, id) : cleanInfection(store.game, id)),
    // An infection is still there to retry; an offer is gone. Losing an infection's minigame costs nothing more.
    onLose: (id) => applyStep(loseOpportunity(store.game, id)),
    onShow: (id) => updateGame((state) => openOpportunity(state, id)),
    onHide: (id) => updateGame((state) => closeOpportunity(state, id)),
  });
  const renderer = createRenderer(editor);
  const intro = createIntro(introElements, nameSiteAndSave);
  isSimulationPaused = intro.isOpen;
  installJavaScriptEffects(elements.site, elements.popupLayer, isJavaScriptLearnedIn1997);
  installScrollDepth(elements.site);
  installSiteColorsPicker(elements.colorsPanel, elements.site, {
    readColors: () => findPickerColors(store.game),
    pick: (colors) => {
      updateGame((state) => chooseSiteColors(state, colors));
      renderer.renderStructure();
    },
  });
  installPhoneSwipe(elements.browserViewport, elements.site, installStoryChapters(elements.site));
  attachBadgeTooltip(elements.achievementsCard, elements.badgeFloatTip);
  watchDevTools();
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
