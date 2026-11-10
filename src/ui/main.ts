import { advanceSimulation, calculateRequiredVirusFood, findVirus, getFeatureDisplayName, removeVirus } from '../engine';
import type { SimulationMode } from '../engine';
import { createActionHandlers, createClickHandler, createKeydownHandler, writeCodeKeystroke } from './actions';
import { createCodeEditor } from './code-editor';
import { editorElements, elements, snakeElements } from './elements';
import { installJavaScriptEffects } from './javascript-effects';
import { MAX_OFFLINE_MS, OFFLINE_THRESHOLD_MS, restoreGame, writeSave } from './persistence';
import { createRenderer } from './renderer';
import { createSnakeModal } from './snake-modal';
import type { SnakeTarget } from './snake-modal';
import { applyStep, store } from './store';

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

/** The simulation runs on a timer, separate from rendering, so it keeps going in a background tab. */
function tick(): void {
  const now = performance.now();
  const elapsedMs = Math.min(now - lastTickAt, MAX_OFFLINE_MS);
  lastTickAt = now;
  const mode: SimulationMode = elapsedMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'live';
  applyStep(advanceSimulation(store.game, elapsedMs, mode));
}

function findSnakeTarget(infectionId: number): SnakeTarget | null {
  const virus = findVirus(store.game, infectionId);
  if (virus === null) return null;
  return {
    requiredFood: calculateRequiredVirusFood(virus),
    featureName: getFeatureDisplayName(virus.featureId, store.game.eraId).toLowerCase(),
  };
}

function isJavaScriptLearnedIn1997(): boolean {
  return store.game.eraId === 'homepage-1997' && store.game.purchasedUpgradeIds.includes('learn-javascript');
}

function saveWhenHidden(): void {
  if (document.visibilityState === 'hidden') writeSave();
}

function start(hotData: unknown): void {
  restoreGame(hotData);
  const editor = createCodeEditor(editorElements, writeCodeKeystroke);
  const snake = createSnakeModal(snakeElements, {
    findTarget: findSnakeTarget,
    onWin: (infectionId) => applyStep(removeVirus(store.game, infectionId)),
  });
  const renderer = createRenderer(editor);
  installJavaScriptEffects(elements.site, elements.popupLayer, isJavaScriptLearnedIn1997);
  document.addEventListener('click', createClickHandler(createActionHandlers({ snake, renderer }), renderer));
  document.addEventListener('keydown', createKeydownHandler(snake));
  document.addEventListener('visibilitychange', saveWhenHidden);
  window.addEventListener('pagehide', writeSave);
  window.setInterval(tick, TICK_INTERVAL_MS);
  window.setInterval(writeSave, AUTOSAVE_INTERVAL_MS);
  window.claude?.hot?.snapshot?.(() => ({ save: store.game }));
  lastTickAt = performance.now();
  renderer.startFrames();
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
