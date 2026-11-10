import {
  advanceEra,
  buyDefense,
  buyFeature,
  buyUpgrade,
  closePopup,
  DEFENSE_IDS,
  ERAS_BY_ID,
  fallForPopupScam,
  FEATURE_IDS,
  formatMoney,
  isEraGateComplete,
  placeAd,
  removeAd,
  toggleDefense,
  toggleFeature,
  upgradeHosting,
  UPGRADE_IDS,
  writeCode,
} from '../engine';
import type { DefenseId, FeatureId, UpgradeId } from '../engine';
import type { KeystrokeFeedback } from './code-editor';
import { elements } from './elements';
import { hideOverlay, renderStory, showOverlay } from './overlays';
import { clearSave } from './persistence';
import { findPopupCopy } from './render-popups';
import { SHOP_TABS } from './render-shop';
import type { ShopTab } from './render-shop';
import { flashMoneyLoss } from './renderer';
import type { Renderer } from './renderer';
import type { MinigameModal } from './minigames/minigame-modal';
import { pushMessage, startNewGame, store, updateGame } from './store';

type ActionHandler = (target: HTMLElement) => void;

export interface ActionDependencies {
  readonly minigame: MinigameModal;
  readonly renderer: Renderer;
}

const WIPE_SWAP_DELAY_MS = 700;
const WIPE_DURATION_MS = 1_600;

function readId(target: HTMLElement): string {
  return target.dataset['id'] ?? '';
}

function readNumericId(target: HTMLElement): number {
  return Number(readId(target));
}

function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as readonly string[]).includes(value);
}

function isUpgradeId(value: string): value is UpgradeId {
  return (UPGRADE_IDS as readonly string[]).includes(value);
}

function isDefenseId(value: string): value is DefenseId {
  return (DEFENSE_IDS as readonly string[]).includes(value);
}

function isShopTab(value: string): value is ShopTab {
  return (SHOP_TABS as readonly string[]).includes(value);
}

/** Buttons carry their id as text; only a known id reaches the engine. */
function withId<T extends string>(isId: (value: string) => value is T, act: (id: T) => void): ActionHandler {
  return (target) => {
    const id = readId(target);
    if (isId(id)) act(id);
  };
}

export function writeCodeKeystroke(): KeystrokeFeedback {
  const result = writeCode(store.game);
  store.game = result.state;
  return { outcome: result.outcome, earned: result.earned };
}

/** The wipe covers the browser; the era swaps underneath it, halfway through. */
function runEraWipe(): void {
  elements.eraWipe.classList.remove('is-running');
  void elements.eraWipe.offsetWidth;
  elements.eraWipe.classList.add('is-running');
  window.setTimeout(() => {
    updateGame(advanceEra);
    pushMessage(`Relaunched as ${ERAS_BY_ID[store.game.eraId].name}. Your old features got a makeover.`);
  }, WIPE_SWAP_DELAY_MS);
  window.setTimeout(() => elements.eraWipe.classList.remove('is-running'), WIPE_DURATION_MS);
}

function startMigration(): void {
  if (!isEraGateComplete(store.game)) return;
  const isFinalEra = ERAS_BY_ID[store.game.eraId].nextEraId === null;
  if (isFinalEra) {
    updateGame(advanceEra);
    return;
  }
  if (renderStory(store.game)) showOverlay(elements.storyOverlay);
}

function fallForScam(popupId: number): void {
  const copy = findPopupCopy(store.game, popupId);
  const result = fallForPopupScam(store.game, popupId);
  store.game = result.state;
  if (copy === null) return;
  pushMessage(`${copy.scamOutcome} You lost ${formatMoney(result.moneyLost)}.`);
  flashMoneyLoss();
}

function resetGame(renderer: Renderer): void {
  clearSave();
  startNewGame();
  renderer.forgetRenderedState();
  hideOverlay(elements.resetOverlay);
  hideOverlay(elements.endOverlay);
}

/** Every clickable thing in the game carries data-action; this maps each action to what it does. */
export function createActionHandlers({ minigame, renderer }: ActionDependencies): Readonly<Record<string, ActionHandler>> {
  return {
    'buy-feature': withId(isFeatureId, (id) => updateGame((state) => buyFeature(state, id))),
    'buy-upgrade': withId(isUpgradeId, (id) => updateGame((state) => buyUpgrade(state, id))),
    'buy-defense': withId(isDefenseId, (id) => updateGame((state) => buyDefense(state, id))),
    'toggle-defense': withId(isDefenseId, (id) => updateGame((state) => toggleDefense(state, id))),
    'toggle-feature': withId(isFeatureId, (id) => updateGame((state) => toggleFeature(state, id))),
    'place-ad': () => updateGame(placeAd),
    'remove-ad': () => updateGame(removeAd),
    'upgrade-hosting': () => updateGame(upgradeHosting),
    'close-popup': (target) => updateGame((state) => closePopup(state, readNumericId(target))),
    'accept-popup': (target) => fallForScam(readNumericId(target)),
    'open-minigame': (target) => minigame.open(readNumericId(target)),
    'close-minigame': () => minigame.close(),
    'retry-minigame': () => minigame.retry(),
    'shop-tab': withId(isShopTab, (id) => {
      store.shopTab = id;
    }),
    migrate: startMigration,
    'confirm-migration': () => {
      hideOverlay(elements.storyOverlay);
      runEraWipe();
    },
    'cancel-migration': () => hideOverlay(elements.storyOverlay),
    'open-reset': () => showOverlay(elements.resetOverlay),
    'cancel-reset': () => hideOverlay(elements.resetOverlay),
    'confirm-reset': () => resetGame(renderer),
    'keep-playing': () => hideOverlay(elements.endOverlay),
  };
}

/** One listener for the whole document: the page is re-rendered often, so buttons come and go. */
export function createClickHandler(handlers: Readonly<Record<string, ActionHandler>>, renderer: Renderer): (event: MouseEvent) => void {
  return (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
    const handler = handlers[target?.dataset['action'] ?? ''];
    if (target === null || handler === undefined) return;
    handler(target);
    renderer.renderStructure();
    renderer.renderSlow();
  };
}

export function createKeydownHandler(minigame: MinigameModal): (event: KeyboardEvent) => void {
  return (event) => {
    if (minigame.handleKey(event) || event.key !== 'Escape') return;
    const topPopup = store.game.popups[store.game.popups.length - 1];
    if (topPopup !== undefined) updateGame((state) => closePopup(state, topPopup.id));
  };
}
