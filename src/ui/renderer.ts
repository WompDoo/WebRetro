import { calculateEconomySnapshot, findChosenFramework, formatCompactNumber, formatMoney, isMobileFriendly, isRenderedOnlyInBrowser } from '../engine';
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
import { showEndCard } from './overlays';
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
import { buildEditorSource } from './skill-code';
import { calculateSiteSignature, renderSite, updateLiveSlots } from './sites';
import { countUnreadNews, markNewsRead, MOBILE_TABS, store } from './store';
import type { MobileTab } from './store';

export interface Renderer {
  /** Rebuilds whatever markup the game state changed. Cheap when nothing did: it compares signatures. */
  readonly renderStructure: () => void;
  /** Numbers that change constantly but needn't update every frame: status bar, goal progress, prices. */
  readonly renderSlow: () => void;
  readonly startFrames: () => void;
  /** After a reset: render the era chrome and skill chrome again, and allow the end card to show again. */
  readonly forgetRenderedState: () => void;
}

type SignatureKey = 'site' | 'popups' | 'shop' | 'goal' | 'news' | 'skills' | 'issues';

const SLOW_RENDER_INTERVAL_MS = 250;
const MIN_RELOAD_MS = 300;
const MAX_RELOAD_MS = 1_800;
const RELOAD_MS_PER_SECOND_OF_LOAD = 120;

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
  setTextIfChanged(elements.statMoney, formatMoney(store.game.money));
  setTextIfChanged(elements.statVisitors, `${formatCompactNumber(economy.visitorsPerSecond)}/s`);
  setTextIfChanged(elements.statRevenue, `${formatMoney(economy.netRevenuePerSecond)}/s`);
  editor.updateRate(economy.keystrokeValue, economy.bugChance);
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
}

function countAffordableNewPurchases(): number {
  return NEW_PURCHASE_TABS.reduce((total, tab) => total + countAffordable(store.game, tab), 0);
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
    site: { count: store.game.popups.length, isAlert: true, isDot: false },
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
  return { buyAmount: store.buyAmount, isScrollJackingOn: store.isScrollJackingOn };
}

function renderShop(): void {
  setHtmlIfChanged(elements.shopTabs, renderShopTabs(store.shopTab));
  elements.shopBody.innerHTML = renderShopBody(store.game, store.shopTab, readShopView());
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
  });
  SHOP_TABS.forEach((tab) => {
    const badge = elements.shopTabs.querySelector<HTMLElement>(`[data-tab-badge="${tab}"]`);
    if (badge === null) return;
    const count = countAffordable(store.game, tab);
    badge.hidden = count === 0 || tab === store.shopTab;
    setTextIfChanged(badge, String(count));
  });
}

export function createRenderer(editor: CodeEditor): Renderer {
  const signatures: Record<SignatureKey, string> = { site: '', popups: '', shop: '', goal: '', news: '', skills: '', issues: '' };
  let renderedEraId = '';
  let hasRenderedSite = false;
  let endCardShown = store.game.prototypeComplete;
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

  const reloadPage = (): void => {
    playReloadProgress(pickLoadTime(calculateEconomySnapshot(store.game), resolveDeviceView(store.game, store.deviceView)));
    playBoot();
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
    if (!store.game.prototypeComplete || endCardShown) return;
    endCardShown = true;
    showEndCard(store.game);
  };

  const renderStructure = (): void => {
    renderEraChromeOnce();
    const file = resolveEditorFile(store.game, store.editorFile);
    renderWhenChanged('skills', `${store.game.eraId}|${store.game.purchasedUpgradeIds.length}|${file}|${store.game.siteName}|${store.game.isCertificateExpired}`, () => renderSkillChrome(editor, file));
    renderWhenChanged('site', calculateSiteSignature(store.game), renderSiteAndReload);
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

  const frame = (now: number): void => {
    renderStats(editor);
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
  };
}
