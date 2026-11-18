import {
  advanceEra,
  chooseSiteColors,
  isSiteBackground,
  chooseSpecialization,
  SPECIALIZATION_IDS,
  buyDefense,
  buyFeatureLevels,
  buyUpgrade,
  chooseConsentBanner,
  closePopup,
  dismissCookieBanner,
  CONSENT_BANNER_IDS,
  DEFENSE_IDS,
  ERA_IDS,
  ERAS_BY_ID,
  findNextEraId,
  bankBacklinks,
  bankHandTyped,
  buyPerk,
  PERK_IDS,
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
import type { ConsentBanner, DefenseId, EraId, FeatureId, FrameworkId, PerkId, SpecializationId, UpgradeId } from '../engine';
import { DEVICE_VIEWS } from './browser-chrome';
import type { DeviceView } from './browser-chrome';
import type { KeystrokeFeedback } from './code-editor';
import { elements } from './elements';
import { FRAMEWORK_PRESENTATION } from './framework-presentation';
import { isEndingAct } from './ending';
import { hideOverlay, renderStory, showArchiveYear, showEnding, showOverlay } from './overlays';
import { clearSave, writeLegacy, writePreferences, writeSave } from './persistence';
import { findPopupCopy } from './render-popups';
import { BUY_AMOUNTS, SHOP_TABS } from './render-shop';
import type { BuyAmount, ShopTab } from './render-shop';
import { createPlaytestHandlers } from './playtest-actions';
import { renderAchievementsPage, renderBadgeDetail } from './render-achievements';
import { renderSpecializationChoiceScreen } from './render-specializations';
import { findPickerColors } from './render-site-colors';
import { SITE_PALETTES } from './site-theme';
import { flashMoneyLoss } from './renderer';
import { describeRetirement } from './retirement';
import type { Renderer } from './renderer';
import type { Intro } from './intro';
import type { MinigameModal } from './minigames/minigame-modal';
import { applyStep, MOBILE_TABS, pushMessage, startNewGame, store, updateGame } from './store';
import type { MobileTab } from './store';
import { addKeystrokePay } from './typing-income';

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

function isSpecializationId(value: string): value is SpecializationId {
  return (SPECIALIZATION_IDS as readonly string[]).includes(value);
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

function isEraId(value: string): value is EraId {
  return (ERA_IDS as readonly string[]).includes(value);
}

function isPerkId(value: string): value is PerkId {
  return (PERK_IDS as readonly string[]).includes(value);
}

function isShopTab(value: string): value is ShopTab {
  return (SHOP_TABS as readonly string[]).includes(value);
}

const BUY_AMOUNT_VALUES: Readonly<Record<string, BuyAmount>> = Object.fromEntries(BUY_AMOUNTS.map((amount) => [String(amount), amount]));

function isBuyAmount(value: string): value is `${BuyAmount}` {
  return BUY_AMOUNTS.some((amount) => String(amount) === value);
}

/** A bulk button's levels; any other buy button buys one. */
function readBuyAmount(target: HTMLElement): BuyAmount {
  const amount = target.dataset['amount'] ?? '';
  return isBuyAmount(amount) ? BUY_AMOUNT_VALUES[amount] : 1;
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
  store.typingIncomePool = addKeystrokePay(store.typingIncomePool, result.earned);
  return { outcome: result.outcome, earned: result.earned };
}

/** The wipe covers the browser; the era swaps underneath it, halfway through. */
function runEraWipe(): void {
  elements.eraWipe.classList.remove('is-running');
  void elements.eraWipe.offsetWidth;
  elements.eraWipe.classList.add('is-running');
  window.setTimeout(() => {
    const nextEraId = findNextEraId(store.game);
    // Said before the relaunch: afterwards the retired features are gone and their trade-in is paid.
    const retirement = nextEraId === null ? '' : describeRetirement(store.game, nextEraId);
    updateGame(advanceEra);
    const era = ERAS_BY_ID[store.game.eraId];
    pushMessage(`Relaunched for ${era.year}: ${era.name}. Your old features got a makeover. ${retirement}`.trim());
  }, WIPE_SWAP_DELAY_MS);
  window.setTimeout(() => elements.eraWipe.classList.remove('is-running'), WIPE_DURATION_MS);
}

function startMigration(): void {
  if (!isEraGateComplete(store.game)) return;
  const isFinalEra = findNextEraId(store.game) === null;
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

/** A finished run pays its Backlinks in before anything replaces it: finishing always counts. */
function bankFinishedRun(): void {
  const backlinks = bankBacklinks(store.legacy, store.game);
  const banked = bankHandTyped(backlinks.legacy, backlinks.state);
  store.legacy = banked.legacy;
  store.game = banked.state;
  writeLegacy();
}

/** Prestige: pay the run in, then show what the Backlinks buy. */
function openLegacy(): void {
  bankFinishedRun();
  writeSave();
  showEnding(store.game, store.legacy, 'legacy');
}

function buyPerkAndShow(perkId: PerkId): void {
  store.legacy = buyPerk(store.legacy, perkId);
  writeLegacy();
  showEnding(store.game, store.legacy, 'legacy');
}

/** Starting over is a new site: it gets a new name, and every perk the legacy has. */
function resetGame(renderer: Renderer, intro: Intro): void {
  bankFinishedRun();
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
/** The achievements page, drawn as it is now: it doesn't update while open, there's nothing to watch. */
function openAchievements(): void {
  elements.achievementsCard.innerHTML = renderAchievementsPage(store.game, store.legacy);
  showOverlay(elements.achievementsOverlay);
  // Opening focuses the close button; the window starts at the top.
  elements.achievementsCard.scrollTop = 0;
}

/** Tapped or clicked: what the icon is, in the bar under the icons. A phone has no hover. */
function showAchievementDetail(id: string): void {
  const detail = elements.achievementsCard.querySelector<HTMLElement>('[data-achievement-detail]');
  if (detail !== null) detail.innerHTML = renderBadgeDetail(store.legacy, id);
}

export function createActionHandlers({ minigame, renderer, intro }: ActionDependencies): Readonly<Record<string, ActionHandler>> {
  return {
    'buy-feature': (target) => {
      const id = readId(target);
      if (isFeatureId(id)) updateGame((state) => buyFeatureLevels(state, id, readBuyAmount(target)));
    },
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
    'close-minigame': () => minigame.leave(),
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
    /** The Specialize tab's Choose…: the screen that asks before it's for good. */
    'open-specialization': withId(isSpecializationId, (id) => {
      elements.specCard.innerHTML = renderSpecializationChoiceScreen(store.game, id);
      showOverlay(elements.specOverlay);
    }),
    'confirm-specialization': withId(isSpecializationId, (id) => {
      applyStep(chooseSpecialization(store.game, id));
      hideOverlay(elements.specOverlay);
    }),
    'cancel-specialization': () => hideOverlay(elements.specOverlay),
    'toggle-colors': () => {
      store.isColorsOpen = !store.isColorsOpen;
    },
    'site-palette': (target) => {
      const palette = SITE_PALETTES.find((candidate) => candidate.id === readId(target));
      if (palette !== undefined) updateGame((state) => chooseSiteColors(state, palette.colors));
    },
    /** A new background keeps the accent on the page now, the specialization's included. */
    'site-background': withId(isSiteBackground, (background) => {
      updateGame((state) => chooseSiteColors(state, { ...findPickerColors(state), background }));
    }),
    'site-colors-reset': () => updateGame((state) => chooseSiteColors(state, null)),
    'browser-reload': () => renderer.reloadSite(),
    'browser-home': () => renderer.goHome(),
    'open-achievements': openAchievements,
    'close-achievements': () => hideOverlay(elements.achievementsOverlay),
    'achievement-detail': (target) => showAchievementDetail(readId(target)),
    'open-reset': () => showOverlay(elements.resetOverlay),
    'cancel-reset': () => hideOverlay(elements.resetOverlay),
    'confirm-reset': () => resetGame(renderer, intro),
    'keep-playing': () => hideOverlay(elements.endOverlay),
    'ending-act': withId(isEndingAct, (act) => showEnding(store.game, store.legacy, act)),
    'open-legacy': openLegacy,
    'buy-perk': withId(isPerkId, buyPerkAndShow),
    'start-new-run': () => resetGame(renderer, intro),
    'ending-year': withId(isEraId, (eraId) => showArchiveYear(store.game, eraId)),
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
    // A key the minigame used stops there: Space or Enter would otherwise also press whatever button has focus,
    // such as the offer chip that opened it, and start the minigame over.
    if (minigame.handleKey(event)) {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Escape') return;
    const topPopup = store.game.popups[store.game.popups.length - 1];
    if (topPopup !== undefined) updateGame((state) => closePopup(state, topPopup.id));
  };
}
