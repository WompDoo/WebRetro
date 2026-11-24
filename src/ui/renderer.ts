import { areSpecializationsOn, calculateEconomySnapshot, findChosenFramework, formatCompactNumber, formatMoney, isMobileFriendly, isRenderedOnlyInBrowser, calculateBacklinksEarned, shouldProjectBacklinks } from '../engine';
import { calculateBuffChipsSignature, findFireRemainingMs, isTargetBuffed, listChipTimes, renderBuffChips } from './render-buffs';
import type { GameState } from '../engine';
import {
  buildBrowserTitle,
  buildEditorTabs,
  buildEditorTitle,
  buildPerformanceReadout,
  buildPhoneCaption,
  buildSiteUrl,
  describeConnectionSecurity,
  buildStatusText,
  classifyPerformance,
  describeLighthouseRating,
  isPhoneViewOffered,
  pickLoadTime,
  isStatusScrolling,
  resolveDeviceView,
  resolveEditorFile,
} from './browser-chrome';
import type { CodeEditor } from './code-editor';
import { escapeHtml, setHtmlIfChanged, setTextIfChanged } from './dom';
import { elements } from './elements';
import { showEnding } from './overlays';
import { calculateBootMs, resolveTyping } from './framework-presentation';
import { ERA_PRESENTATION } from './presentation';
import { calculateGoalSignature, renderGoal, renderTip, updateGoalProgress } from './render-goal';
import { calculatePopupSignature, syncPopups } from './render-popups';
import { calculateShopSignature, countAffordable, renderShopBody, renderShopTabs, SHOP_TABS } from './render-shop';
import type { ShopView } from './render-shop';
import { listIssues } from './issues';
import type { Issue } from './issues';
import { calculateIssueSignature, issuePanelTitle, renderIssueList } from './render-issues';
import { renderPhoneNotifications } from './render-notifications';
import { calculateColorsSignature, renderSiteColorsPanel } from './render-site-colors';
import { buildEditorSource } from './skill-code';
import { createCursorTrail } from './cursor-trail';
import { describeIncomeSources, describeTypingBoost, isTypingIdle, readTypingIncomePerSecond, sumIncome } from './typing-income';
import type { IncomeSources } from './typing-income';
import { accrueAutoKeystrokes, describeHiredKeystroke } from './auto-typing';
import { setWatchedText } from './dev-tools-watch';
import { writePreferences } from './persistence';
import { createShopSeenWatcher } from './shop-seen';
import { calculateSiteSignature, renderSite, updateLiveSlots } from './sites';
import { countNewOnSiteSinceSeen, countUnreadNews, markNewsRead, markSiteSeen, MOBILE_TABS, store } from './store';
import type { MobileTab } from './store';

export interface Renderer {
  /** Rebuilds whatever markup the game state changed. Cheap when nothing did: it compares signatures. */
  readonly renderStructure: () => void;
  /** Numbers that change constantly but needn't update every frame: status bar, goal progress, prices. */
  readonly renderSlow: () => void;
  readonly startFrames: () => void;
  /** After a reset: render the era chrome and skill chrome again, and allow the end card to show again. */
  readonly forgetRenderedState: () => void;
  /** The browser's Reload button: the page goes blank while it loads, then comes back. */
  readonly reloadSite: () => void;
  /** The browser's Home button: back to the top of the home page, loaded again. */
  readonly goHome: () => void;
}

type SignatureKey = 'site' | 'popups' | 'shop' | 'goal' | 'news' | 'skills' | 'issues' | 'colors';

const SLOW_RENDER_INTERVAL_MS = 250;
const MIN_RELOAD_MS = 300;
const MAX_RELOAD_MS = 1_800;
const RELOAD_MS_PER_SECOND_OF_LOAD = 120;
/** A reload by hand: the page is blank for the first half of the load, then draws as the progress bar finishes. */
const BLANK_SHARE_OF_RELOAD = 0.5;

/** Restarts a CSS animation on an element that already has its class. */
function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/** After every change the page "reloads": a progress bar runs across the status bar. Returns how long it takes. */
function playReloadProgress(loadTimeSeconds: number): number {
  const durationMs = Math.min(MAX_RELOAD_MS, Math.max(MIN_RELOAD_MS, loadTimeSeconds * RELOAD_MS_PER_SECOND_OF_LOAD));
  elements.browserStatusbar.style.setProperty('--reload-ms', `${durationMs}ms`);
  restartAnimation(elements.browserStatusbar, 'is-reloading');
  return durationMs;
}

/**
 * How a 2018 single-page app comes back after a reload: blank (or "Loading...") until its bundle has run, or,
 * once it renders on the server, all there at once but deaf to clicks until it has hydrated.
 */
type BootPhase = 'blank' | 'hydrating';

/** Hydration takes a share of the boot, and never less than a moment you can notice. */
const HYDRATION_SHARE_OF_BOOT = 0.4;
const MIN_HYDRATION_MS = 600;

function classifyBoot(state: GameState): BootPhase {
  return isRenderedOnlyInBrowser(state) ? 'blank' : 'hydrating';
}

const BOOT_DURATIONS: Readonly<Record<BootPhase, (bootMs: number) => number>> = {
  blank: (bootMs) => bootMs,
  hydrating: (bootMs) => Math.max(MIN_HYDRATION_MS, bootMs * HYDRATION_SHARE_OF_BOOT),
};

interface Boot {
  readonly phase: BootPhase;
  readonly durationMs: number;
}

/** A 2018 single-page app boots on every load: blank until the bundle runs, or, rendered on the server, deaf until it hydrates. */
function findBoot(state: GameState): Boot | null {
  const framework = findChosenFramework(state);
  if (framework === null) return null;
  const phase = classifyBoot(state);
  return { phase, durationMs: BOOT_DURATIONS[phase](calculateBootMs(framework)) };
}

/** The phase sits on #site (the page's CSS) and the status bar (its "Hydrating…"); both outlive re-renders. */
function setBootPhase(phase: BootPhase | null): void {
  [elements.site, elements.browserStatusbar].forEach((element) => {
    if (phase === null) delete element.dataset['boot'];
    else element.dataset['boot'] = phase;
  });
}

export function flashMoneyLoss(): void {
  restartAnimation(elements.statMoney, 'is-loss');
}

function renderNewsList(): void {
  elements.newsList.innerHTML =
    store.news.length === 0
      ? '<li class="news-empty">Nothing yet. The web is quiet.</li>'
      : store.news.map((item) => `<li><span class="news-year">${item.year}</span><span>${escapeHtml(item.message)}</span></li>`).join('');
}

function renderStats(editor: CodeEditor): void {
  const economy = calculateEconomySnapshot(store.game);
  setWatchedText(elements.statMoney, formatMoney(store.game.money));
  setWatchedText(elements.statVisitors, `${formatCompactNumber(economy.visitorsPerSecond)}/s`);
  renderIncome({ site: economy.netRevenuePerSecond, hired: economy.hiredTypingPerSecond, typing: readTypingIncomePerSecond(store.typingIncomePool) });
  renderProjectedBacklinks();
  editor.updateRate(economy.keystrokeValue, economy.bugChance);
  editor.updateHeat(store.game.typingHeat, findFireRemainingMs(store.game));
  renderBuffs();
}

/** Income is everything coming in: the site's revenue, hired help, and what your typing paid over the last few seconds. */
function renderIncome(sources: IncomeSources): void {
  setWatchedText(elements.statIncome, `${formatMoney(sumIncome(sources))}/s`);
  setTextIfChanged(elements.statIncomeTyping, describeTypingBoost(sources));
  elements.statIncomeTyping.classList.toggle('is-idle', isTypingIdle(sources));
  elements.statIncomeBox.title = describeIncomeSources(sources);
}

function updateChipTime(key: string, text: string): void {
  const slot = elements.buffChips.querySelector<HTMLElement>(`[data-buff-time="${key}"]`);
  if (slot !== null) setTextIfChanged(slot, text);
}

let buffChipsSignature = '';

/** The chips under the top bar, and the stats they boost burning with them. */
function renderBuffs(): void {
  const signature = calculateBuffChipsSignature(store.game);
  if (signature !== buffChipsSignature) elements.buffChips.innerHTML = renderBuffChips(store.game);
  buffChipsSignature = signature;
  listChipTimes(store.game).forEach(([key, text]) => updateChipTime(key, text));
  elements.statVisitorsBox.classList.toggle('is-buffed', isTargetBuffed(store.game, 'traffic'));
  elements.statIncomeBox.classList.toggle('is-buffed', isTargetBuffed(store.game, 'ad-value') || isTargetBuffed(store.game, 'typing'));
}

/** After the first finished run: what finishing this one now would earn. The first run is about the site. */
function renderProjectedBacklinks(): void {
  elements.statBacklinksBox.hidden = !shouldProjectBacklinks(store.game);
  setWatchedText(elements.statBacklinks, `+${calculateBacklinksEarned(store.game)}`);
}

function renderBrowserStatus(editor: CodeEditor): void {
  const economy = calculateEconomySnapshot(store.game);
  const device = resolveDeviceView(store.game, store.deviceView);
  setTextIfChanged(elements.browserStatus, buildStatusText(store.game, economy, device));
  elements.browserStatus.classList.toggle('is-scrolling', isStatusScrolling(store.game, economy));
  setTextIfChanged(elements.browserPerf, buildPerformanceReadout(store.game, economy));
  elements.browserStatusbar.dataset['performance'] = classifyPerformance(store.game, economy, device);
  elements.browserPerf.dataset['lighthouse'] = describeLighthouseRating(store.game, economy);
  editor.setTitle(buildEditorTitle(store.game, resolveEditorFile(store.game, store.editorFile)));
  const caption = buildPhoneCaption(store.game, economy.phoneLoadTimeSeconds);
  setHtmlIfChanged(elements.deviceCaption, `<b class="device-caption-title">${escapeHtml(caption.headline)}</b><span>${escapeHtml(caption.detail)}</span><span class="device-caption-hint">Swipe the screen to scroll.</span>`);
}

/**
 * The Desktop/Phone switch. The phone shows the real page: zoomed out to desktop width until it is
 * responsive, reflowed to the phone's width after. CSS does the drawing; this sets which one.
 */
function renderDeviceView(issues: readonly Issue[]): void {
  const view = resolveDeviceView(store.game, store.deviceView);
  const isOffered = isPhoneViewOffered(store.game);
  elements.deviceSwitch.hidden = !isOffered;
  // Only eras with a phone build its notifications; before that there is no phone to show them on.
  setHtmlIfChanged(elements.deviceNotifications, isOffered ? renderPhoneNotifications(issues, issuePanelTitle(store.game.eraId)) : '');
  elements.browserViewport.dataset['device'] = view;
  elements.browserViewport.dataset['fitsPhone'] = String(isMobileFriendly(store.game));
  elements.deviceSwitch.querySelectorAll<HTMLElement>('[data-action="device-view"]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset['id'] === view));
  });
}

/** The 🎨 button and its panel: from the second site, any time. */
function isColorsPanelOpen(state: GameState): boolean {
  return areSpecializationsOn(state) && store.isColorsOpen;
}

function renderColorsChrome(): void {
  elements.colorsButton.hidden = !areSpecializationsOn(store.game);
  elements.colorsButton.setAttribute('aria-expanded', String(isColorsPanelOpen(store.game)));
  elements.colorsPanel.hidden = !isColorsPanelOpen(store.game);
}

/** A new skill adds to the file being typed; picking another tab brings that file back as it was left. */
/** The era's editor highlights syntax, or you bought it the colours. */
function hasSyntaxColours(state: GameState): boolean {
  return ERA_PRESENTATION[state.eraId].editorHighlightsSyntax || state.purchasedUpgradeIds.includes('syntax-highlighting');
}

function renderSkillChrome(editor: CodeEditor, file: string): void {
  editor.setTyping(resolveTyping(store.game));
  editor.setHighlights(hasSyntaxColours(store.game));
  editor.showFile(file, buildEditorSource(store.game, file));
  const tabs = buildEditorTabs(store.game);
  editor.setTabs(tabs.files, tabs.hiddenCount, file, tabs.hiddenTitle);
  setTextIfChanged(elements.browserUrl, buildSiteUrl(store.game));
  elements.browserUrl.dataset['security'] = describeConnectionSecurity(store.game);
  setTextIfChanged(elements.browserTitle, buildBrowserTitle(store.game));
}

function renderEraChrome(editor: CodeEditor): void {
  const presentation = ERA_PRESENTATION[store.game.eraId];
  elements.app.dataset['era'] = String(presentation.year);
  elements.browserTitle.textContent = buildBrowserTitle(store.game);
  elements.issueTitle.textContent = issuePanelTitle(store.game.eraId);
  elements.tabbarInboxLabel.textContent = issuePanelTitle(store.game.eraId);
  editor.setEra(store.game.eraId);
}

/** Phones: which section shows, and whether the objective is open. Desktop CSS ignores both. */
function renderMobileChrome(): void {
  elements.app.dataset['mobileTab'] = store.mobileTab;
  elements.app.dataset['goalOpen'] = String(store.isGoalOpen);
  elements.tabbar.querySelectorAll<HTMLElement>('[data-action="mobile-tab"]').forEach((button) => {
    const isCurrent = button.dataset['id'] === store.mobileTab;
    if (isCurrent) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (store.mobileTab === 'inbox') markNewsRead();
  if (store.mobileTab === 'site') markSiteSeen();
}

function countAffordableNewPurchases(): number {
  return NEW_PURCHASE_TABS.reduce((total, tab) => total + countAffordable(store.game, tab, store.seenShopKeys), 0);
}

interface TabBadge {
  readonly count: number;
  /** Red: something is wrong. Blue: something is new. */
  readonly isAlert: boolean;
  /** Only whether there is something, not how much. */
  readonly isDot: boolean;
}

/** One-time buys: skills, boosts, defenses, hosting. Another feature level is always on offer, so it isn't news. */
const NEW_PURCHASE_TABS = SHOP_TABS.filter((tab) => tab !== 'build');

function calculateTabBadges(issues: readonly Issue[]): Readonly<Record<MobileTab, TabBadge>> {
  return {
    // Pop-ups are trouble, so they win; otherwise what was added while you were on another tab.
    site: store.game.popups.length > 0 ? { count: store.game.popups.length, isAlert: true, isDot: false } : { count: countNewOnSiteSinceSeen(), isAlert: false, isDot: false },
    code: { count: 0, isAlert: false, isDot: false },
    shop: { count: countAffordableNewPurchases(), isAlert: false, isDot: true },
    inbox: issues.length > 0 ? { count: issues.length, isAlert: true, isDot: false } : { count: countUnreadNews(), isAlert: false, isDot: false },
  };
}

function renderTabBadges(issues: readonly Issue[]): void {
  const badges = calculateTabBadges(issues);
  MOBILE_TABS.forEach((tab) => {
    const badge = elements.tabbar.querySelector<HTMLElement>(`[data-tabbar-badge="${tab}"]`);
    if (badge === null) return;
    const { count, isAlert, isDot } = badges[tab];
    badge.hidden = count === 0 || tab === store.mobileTab;
    badge.classList.toggle('is-alert', isAlert);
    badge.classList.toggle('is-dot', isDot);
    setTextIfChanged(badge, isDot ? '' : String(count));
  });
}

function readShopView(): ShopView {
  return { isScrollJackingOn: store.isScrollJackingOn, foundSpecializationIds: store.legacy.foundSpecializationIds };
}

/** A card seen while affordable stops counting on its tab's badge, for good: kept with the preferences. */
const shopSeen = createShopSeenWatcher((key) => {
  if (store.seenShopKeys.has(key)) return;
  store.seenShopKeys.add(key);
  writePreferences();
});

function renderShop(): void {
  setHtmlIfChanged(elements.shopTabs, renderShopTabs(store.shopTab, store.game));
  elements.shopBody.innerHTML = renderShopBody(store.game, store.shopTab, readShopView());
  shopSeen.watch(elements.shopBody);
}

/**
 * The one-pager's scroll-jacking switch, mirrored on #site for its CSS and script. #site outlives re-renders, so
 * flipping it doesn't re-render the page. Only a change is written: even an unchanged value would wake the
 * story's observer.
 */
function renderScrollJackingSwitch(): void {
  const value = describeSwitch(store.isScrollJackingOn);
  if (elements.site.dataset['scrollJacking'] !== value) elements.site.dataset['scrollJacking'] = value;
}

function describeSwitch(isOn: boolean): 'on' | 'off' {
  return isOn ? 'on' : 'off';
}

function updateShopAffordability(): void {
  elements.shopBody.querySelectorAll<HTMLButtonElement>('button[data-cost]').forEach((button) => {
    button.disabled = store.game.money < Number(button.dataset['cost']);
    // Bulk buttons show only while you could pay for them.
    if (button.dataset['bulk'] !== undefined) button.hidden = button.disabled;
  });
  shopSeen.markAffordableInView();
  SHOP_TABS.forEach((tab) => {
    const badge = elements.shopTabs.querySelector<HTMLElement>(`[data-tab-badge="${tab}"]`);
    if (badge === null) return;
    const count = countAffordable(store.game, tab, store.seenShopKeys);
    badge.hidden = count === 0 || tab === store.shopTab;
    setTextIfChanged(badge, String(count));
  });
}

export function createRenderer(editor: CodeEditor): Renderer {
  const signatures: Record<SignatureKey, string> = { site: '', popups: '', shop: '', goal: '', news: '', skills: '', issues: '', colors: '' };
  let renderedEraId = '';
  let hasRenderedSite = false;
  let endCardShown = store.game.isGameFinished;
  let lastSlowRenderAt = 0;

  /** Runs render only when the signature moved since last time. */
  const renderWhenChanged = (key: SignatureKey, signature: string, render: () => void): void => {
    if (signatures[key] === signature) return;
    signatures[key] = signature;
    render();
  };

  let bootTimer = 0;

  /** A 2018 single-page app shows its boot phase for as long as it lasts, then the page as it is. */
  const playBoot = (): void => {
    window.clearTimeout(bootTimer);
    const boot = findBoot(store.game);
    setBootPhase(boot === null ? null : boot.phase);
    if (boot !== null) bootTimer = window.setTimeout(() => setBootPhase(null), boot.durationMs);
  };

  const measureLoadTime = (): number => pickLoadTime(calculateEconomySnapshot(store.game), resolveDeviceView(store.game, store.deviceView));

  const reloadPage = (): void => {
    playReloadProgress(measureLoadTime());
    playBoot();
  };

  let blankTimer = 0;

  /** Drawn from scratch, so a page that had scrolled inside itself or played its intro starts over. */
  const drawSiteAfterBlank = (): void => {
    elements.site.classList.remove('is-blank');
    signatures.site = calculateSiteSignature(store.game);
    elements.site.innerHTML = renderSite(store.game, Date.now());
    playBoot();
  };

  /** Reload: blank for as long as the era's connection takes (a modem takes a while), then the page again. */
  const reloadSiteByHand = (): void => {
    window.clearTimeout(blankTimer);
    const durationMs = playReloadProgress(measureLoadTime());
    elements.site.classList.add('is-blank');
    blankTimer = window.setTimeout(drawSiteAfterBlank, durationMs * BLANK_SHARE_OF_RELOAD);
  };

  /** Every change reloads the page; the first render is the page loading, so a single-page app boots then too. */
  const renderSiteAndReload = (): void => {
    elements.site.innerHTML = renderSite(store.game, Date.now());
    if (hasRenderedSite) reloadPage();
    else playBoot();
    hasRenderedSite = true;
  };

  const renderEraChromeOnce = (): void => {
    if (renderedEraId === store.game.eraId) return;
    renderedEraId = store.game.eraId;
    renderEraChrome(editor);
  };

  const showEndCardOnce = (): void => {
    if (!store.game.isGameFinished || endCardShown) return;
    endCardShown = true;
    showEnding(store.game, store.legacy, 'archive');
  };

  const cursorTrail = createCursorTrail(elements.site);
  const renderStructure = (): void => {
    renderEraChromeOnce();
    const file = resolveEditorFile(store.game, store.editorFile);
    renderWhenChanged('skills', `${store.game.eraId}|${store.game.purchasedUpgradeIds.length}|${file}|${store.game.siteName}|${store.game.isCertificateExpired}`, () => renderSkillChrome(editor, file));
    renderWhenChanged('site', calculateSiteSignature(store.game), renderSiteAndReload);
    cursorTrail.update(store.game.featureLevels['custom-cursor'], resolveDeviceView(store.game, store.deviceView) === 'phone');
    renderWhenChanged('popups', calculatePopupSignature(store.game), () => syncPopups(elements.popupLayer, store.game));
    renderWhenChanged('shop', calculateShopSignature(store.game, store.shopTab, readShopView()), renderShop);
    renderWhenChanged('goal', calculateGoalSignature(store.game), () => {
      elements.goalBody.innerHTML = renderGoal(store.game);
    });
    setHtmlIfChanged(elements.newsTip, renderTip(store.game));
    setHtmlIfChanged(elements.codeTip, renderTip(store.game));
    const issues = listIssues(store.game);
    renderWhenChanged('issues', calculateIssueSignature(issues, store.game), () => {
      elements.issueList.innerHTML = renderIssueList(issues, store.game, Date.now());
    });
    renderWhenChanged('news', store.news.map((item) => item.id).join(','), renderNewsList);
    renderDeviceView(issues);
    renderColorsChrome();
    renderWhenChanged('colors', calculateColorsSignature(store.game, isColorsPanelOpen(store.game)), () => {
      elements.colorsPanel.innerHTML = isColorsPanelOpen(store.game) ? renderSiteColorsPanel(store.game) : '';
    });
    renderScrollJackingSwitch();
    renderMobileChrome();
    showEndCardOnce();
  };

  const renderSlow = (): void => {
    renderBrowserStatus(editor);
    updateGoalProgress(elements.goalBody, store.game);
    updateShopAffordability();
    renderTabBadges(listIssues(store.game));
  };

  const renderSlowWhenDue = (now: number): void => {
    if (now - lastSlowRenderAt <= SLOW_RENDER_INTERVAL_MS) return;
    lastSlowRenderAt = now;
    renderSlow();
  };

  let lastFrameAt = performance.now();
  let pendingAutoKeystrokes = 0;

  /** Hired help at the keyboard: their keystrokes show in the editor, a few a second at most. */
  const renderAutoTyping = (now: number): void => {
    const economy = calculateEconomySnapshot(store.game);
    const step = accrueAutoKeystrokes(pendingAutoKeystrokes, economy.autoKeystrokesPerSecond, now - lastFrameAt);
    lastFrameAt = now;
    pendingAutoKeystrokes = step.pending;
    if (step.keystrokes === 0) return;
    const floater = describeHiredKeystroke(store.game.eraId, economy.hiredTypingPerSecond, economy.autoKeystrokesPerSecond);
    Array.from({ length: step.keystrokes }).forEach(() => editor.autoType(floater));
  };

  const frame = (now: number): void => {
    renderStats(editor);
    renderAutoTyping(now);
    renderStructure();
    updateLiveSlots(elements.site, store.game, Date.now());
    updateLiveSlots(elements.issueList, store.game, Date.now());
    renderSlowWhenDue(now);
    window.requestAnimationFrame(frame);
  };

  return {
    renderStructure,
    renderSlow,
    startFrames: () => window.requestAnimationFrame(frame),
    forgetRenderedState: () => {
      signatures.skills = '';
      renderedEraId = '';
      endCardShown = false;
    },
    reloadSite: reloadSiteByHand,
    goHome: () => {
      elements.site.scrollTop = 0;
      reloadSiteByHand();
    },
  };
}
