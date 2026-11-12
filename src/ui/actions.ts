import {
  advanceEra,
  buyDefense,
  buyFeatureLevels,
  buyUpgrade,
  chooseConsentBanner,
  closePopup,
  dismissCookieBanner,
  CONSENT_BANNER_IDS,
  DEFENSE_IDS,
  ERAS_BY_ID,
  fallForPopupScam,
  FEATURE_IDS,
  formatMoney,
  isEraGateComplete,
  placeAd,
  removeAd,
  renewCertificate,
  toggleDefense,
  toggleFeature,
  upgradeHosting,
  UPGRADE_IDS,
  writeCode,
  findChosenFramework,
} from '../engine';
import type { ConsentBanner, DefenseId, FeatureId, FrameworkId, UpgradeId } from '../engine';
import { DEVICE_VIEWS } from './browser-chrome';
import type { DeviceView } from './browser-chrome';
import type { KeystrokeFeedback } from './code-editor';
import { elements } from './elements';
import { FRAMEWORK_PRESENTATION } from './framework-presentation';
import { hideOverlay, renderStory, showOverlay } from './overlays';
import { clearSave, writePreferences } from './persistence';
import { findPopupCopy } from './render-popups';
import { BUY_AMOUNTS, SHOP_TABS } from './render-shop';
import type { BuyAmount, ShopTab } from './render-shop';
import { createPlaytestHandlers } from './playtest-actions';
import { flashMoneyLoss } from './renderer';
import { describeRetirement } from './retirement';
import type { Renderer } from './renderer';
import type { Intro } from './intro';
import type { MinigameModal } from './minigames/minigame-modal';
import { MOBILE_TABS, pushMessage, startNewGame, store, updateGame } from './store';
import type { MobileTab } from './store';

type ActionHandler = (target: HTMLElement) => void;

export interface ActionDependencies {
  readonly minigame: MinigameModal;
  readonly renderer: Renderer;
  readonly intro: Intro;
}

const WIPE_SWAP_DELAY_MS = 700;
const WIPE_DURATION_MS = 1_600;

function readId(target: HTMLElement): string {
  return target.dataset['id'] ?? '';
}

function readNumericId(target: HTMLElement): number {
  return Number(readId(target));
}

function isConsentBanner(value: string): value is ConsentBanner {
  return (CONSENT_BANNER_IDS as readonly string[]).includes(value);
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

const BUY_AMOUNT_VALUES: Readonly<Record<string, BuyAmount>> = Object.fromEntries(BUY_AMOUNTS.map((amount) => [String(amount), amount]));

function isBuyAmount(value: string): value is `${BuyAmount}` {
  return BUY_AMOUNTS.some((amount) => String(amount) === value);
}

function isDeviceView(value: string): value is DeviceView {
  return (DEVICE_VIEWS as readonly string[]).includes(value);
}

function isMobileTab(value: string): value is MobileTab {
  return (MOBILE_TABS as readonly string[]).includes(value);
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
    const nextEraId = ERAS_BY_ID[store.game.eraId].nextEraId;
    // Said before the relaunch: afterwards the retired features are gone and their trade-in is paid.
    const retirement = nextEraId === null ? '' : describeRetirement(store.game, nextEraId);
    updateGame(advanceEra);
    pushMessage(`Relaunched as ${ERAS_BY_ID[store.game.eraId].name}. Your old features got a makeover. ${retirement}`.trim());
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

/** Starting over is a new site: it gets a new name. */
function resetGame(renderer: Renderer, intro: Intro): void {
  clearSave();
  startNewGame();
  renderer.forgetRenderedState();
  hideOverlay(elements.resetOverlay);
  hideOverlay(elements.endOverlay);
  intro.show();
}

/** The framework wars: the moment you pick a side, someone posts that it's dead. */
function announceFrameworkPick(before: FrameworkId | null): void {
  const after = findChosenFramework(store.game);
  if (before === null && after !== null) pushMessage(FRAMEWORK_PRESENTATION[after].deathNotice);
}

function buyUpgradeAndAnnounce(upgradeId: UpgradeId): void {
  const before = findChosenFramework(store.game);
  updateGame((state) => buyUpgrade(state, upgradeId));
  announceFrameworkPick(before);
}

/** Every clickable thing in the game carries data-action; this maps each action to what it does. */
export function createActionHandlers({ minigame, renderer, intro }: ActionDependencies): Readonly<Record<string, ActionHandler>> {
  return {
    'buy-feature': withId(isFeatureId, (id) => updateGame((state) => buyFeatureLevels(state, id, store.buyAmount))),
    'buy-amount': withId(isBuyAmount, (amount) => {
      store.buyAmount = BUY_AMOUNT_VALUES[amount];
    }),
    'buy-upgrade': withId(isUpgradeId, buyUpgradeAndAnnounce),
    'buy-defense': withId(isDefenseId, (id) => updateGame((state) => buyDefense(state, id))),
    'toggle-defense': withId(isDefenseId, (id) => updateGame((state) => toggleDefense(state, id))),
    'toggle-feature': withId(isFeatureId, (id) => updateGame((state) => toggleFeature(state, id))),
    'choose-consent-banner': withId(isConsentBanner, (id) => updateGame((state) => chooseConsentBanner(state, id))),
    'dismiss-cookie-banner': () => updateGame(dismissCookieBanner),
    'toggle-scroll-jacking': () => {
      store.isScrollJackingOn = !store.isScrollJackingOn;
      writePreferences();
    },
    'place-ad': () => updateGame(placeAd),
    'remove-ad': () => updateGame(removeAd),
    'upgrade-hosting': () => updateGame(upgradeHosting),
    'renew-certificate': () => updateGame(renewCertificate),
    'close-popup': (target) => updateGame((state) => closePopup(state, readNumericId(target))),
    'accept-popup': (target) => fallForScam(readNumericId(target)),
    'open-minigame': (target) => minigame.open(readNumericId(target)),
    'close-minigame': () => minigame.close(),
    'retry-minigame': () => minigame.retry(),
    'shop-tab': withId(isShopTab, (id) => {
      store.shopTab = id;
    }),
    /** From a ticket: show the shop tab with the fix, on phones too. */
    'open-shop-tab': withId(isShopTab, (id) => {
      store.shopTab = id;
      store.mobileTab = 'shop';
    }),
    'editor-tab': (target) => {
      store.editorFile = readId(target);
    },
    'device-view': withId(isDeviceView, (id) => {
      store.deviceView = id;
    }),
    'mobile-tab': withId(isMobileTab, (id) => {
      store.mobileTab = id;
    }),
    'toggle-goal': () => {
      store.isGoalOpen = !store.isGoalOpen;
    },
    migrate: startMigration,
    'confirm-migration': () => {
      hideOverlay(elements.storyOverlay);
      runEraWipe();
    },
    'cancel-migration': () => hideOverlay(elements.storyOverlay),
    'open-reset': () => showOverlay(elements.resetOverlay),
    'cancel-reset': () => hideOverlay(elements.resetOverlay),
    'confirm-reset': () => resetGame(renderer, intro),
    'keep-playing': () => hideOverlay(elements.endOverlay),
    ...createPlaytestHandlers(renderer, minigame),
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
