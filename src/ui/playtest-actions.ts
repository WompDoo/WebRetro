import { addPlaytestIncome, addPlaytestInfection, addPlaytestPopup, createPlaytestState, ERA_IDS, ERAS_BY_ID, startPlaytestTrafficSpike, VIRUS_MINIGAME_IDS } from '../engine';
import type { EraId, MinigameId, PlaytestStage } from '../engine';
import { elements } from './elements';
import type { MinigameModal } from './minigames/minigame-modal';
import { hideOverlay, showOverlay } from './overlays';
import { backUpOwnGameOnce, hasOwnGameBackup, restoreOwnGame, writePlaytestFlag, writeSave } from './persistence';
import { PLAYTEST_INCOME_SECONDS, PLAYTEST_MONEY_FACTOR, PLAYTEST_SPEEDS, renderPlaytestPanel } from './playtest';
import type { PlaytestSpeed } from './playtest';
import type { Renderer } from './renderer';
import { createSeed, pushMessage, replaceGame, store, updateGame } from './store';

type ActionHandler = (target: HTMLElement) => void;

const MINIGAME_IDS: readonly MinigameId[] = [...VIRUS_MINIGAME_IDS, 'spam-sort', 'backup-restore'];
const STAGE_NAMES: Readonly<Record<PlaytestStage, string>> = { start: 'the start', end: 'the end' };

function readId(target: HTMLElement): string {
  return target.dataset['id'] ?? '';
}

function isEraId(value: string): value is EraId {
  return (ERA_IDS as readonly string[]).includes(value);
}

function isStage(value: string): value is PlaytestStage {
  return value === 'start' || value === 'end';
}

function isMinigameId(value: string): value is MinigameId {
  return (MINIGAME_IDS as readonly string[]).includes(value);
}

function findSpeed(value: string): PlaytestSpeed | null {
  return PLAYTEST_SPEEDS.find((speed) => String(speed) === value) ?? null;
}

export function setPlaytestEnabled(isEnabled: boolean): void {
  store.isPlaytestEnabled = isEnabled;
  elements.playtestButton.hidden = !isEnabled;
  writePlaytestFlag(isEnabled);
}

export function openPlaytestPanel(): void {
  elements.playtestBody.innerHTML = renderPlaytestPanel(store.game, { speed: store.playtestSpeed, hasBackup: hasOwnGameBackup() });
  showOverlay(elements.playtestOverlay);
}

/** After swapping games: forget what was on screen and close anything that belonged to the old game. */
function afterGameSwap(renderer: Renderer, minigame: MinigameModal, message: string): void {
  minigame.close();
  renderer.forgetRenderedState();
  hideOverlay(elements.playtestOverlay);
  hideOverlay(elements.endOverlay);
  hideOverlay(elements.storyOverlay);
  pushMessage(message);
  writeSave();
}

function jumpTo(eraId: EraId, stage: PlaytestStage, renderer: Renderer, minigame: MinigameModal): void {
  backUpOwnGameOnce();
  replaceGame(createPlaytestState(eraId, stage, createSeed()));
  afterGameSwap(renderer, minigame, `Playtest: jumped to ${STAGE_NAMES[stage]} of ${ERAS_BY_ID[eraId].year}. Your own game is backed up.`);
}

function playMinigame(minigameId: MinigameId, minigame: MinigameModal): void {
  const result = addPlaytestInfection(store.game, minigameId);
  if (result.infectionId === null) {
    pushMessage('Playtest: build something first. There is nothing to infect yet.');
    return;
  }
  store.game = result.state;
  hideOverlay(elements.playtestOverlay);
  minigame.open(result.infectionId);
}

export function createPlaytestHandlers(renderer: Renderer, minigame: MinigameModal): Readonly<Record<string, ActionHandler>> {
  return {
    'open-playtest': () => openPlaytestPanel(),
    'close-playtest': () => hideOverlay(elements.playtestOverlay),
    'disable-playtest': () => {
      setPlaytestEnabled(false);
      hideOverlay(elements.playtestOverlay);
      store.playtestSpeed = 1;
    },
    'playtest-jump': (target) => {
      const [eraId = '', stage = ''] = readId(target).split(':');
      if (isEraId(eraId) && isStage(stage)) jumpTo(eraId, stage, renderer, minigame);
    },
    'playtest-restore': () => {
      const isRestored = restoreOwnGame();
      if (isRestored) replaceGame(store.game);
      afterGameSwap(renderer, minigame, isRestored ? 'Playtest: you’re back in your own game.' : 'Playtest: the backup could not be read, so this game stays.');
    },
    'playtest-income': () => {
      updateGame((state) => addPlaytestIncome(state, PLAYTEST_INCOME_SECONDS));
      openPlaytestPanel();
    },
    'playtest-money': () => {
      updateGame((state) => ({ ...state, money: state.money * PLAYTEST_MONEY_FACTOR }));
      openPlaytestPanel();
    },
    'playtest-minigame': (target) => {
      const minigameId = readId(target);
      if (isMinigameId(minigameId)) playMinigame(minigameId, minigame);
    },
    'playtest-popup': () => updateGame((state) => addPlaytestPopup(state, Math.random())),
    'playtest-spike': () => updateGame(startPlaytestTrafficSpike),
    'playtest-speed': (target) => {
      store.playtestSpeed = findSpeed(readId(target)) ?? store.playtestSpeed;
      openPlaytestPanel();
    },
  };
}
