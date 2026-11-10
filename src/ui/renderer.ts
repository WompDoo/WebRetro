import { calculateEconomySnapshot, formatCompactNumber, formatMoney } from '../engine';
import { buildBrowserTitle, buildEditorTabs, buildEditorTitle, buildPerformanceReadout, buildSiteUrl, buildStatusText, classifyPerformance, isStatusScrolling } from './browser-chrome';
import type { CodeEditor } from './code-editor';
import { escapeHtml, setHtmlIfChanged, setTextIfChanged } from './dom';
import { elements } from './elements';
import { showEndCard } from './overlays';
import { ERA_PRESENTATION } from './presentation';
import { calculateGoalSignature, renderGoal, renderTip, updateGoalProgress } from './render-goal';
import { calculatePopupSignature, syncPopups } from './render-popups';
import { calculateShopSignature, countAffordable, renderShopBody, renderShopTabs, SHOP_TABS } from './render-shop';
import { buildEditorSource } from './skill-code';
import { calculateSiteSignature, renderSite, updateLiveSlots } from './sites';
import { store } from './store';

export interface Renderer {
  /** Rebuilds whatever markup the game state changed. Cheap when nothing did: it compares signatures. */
  readonly renderStructure: () => void;
  /** Numbers that change constantly but needn't update every frame: status bar, goal progress, prices. */
  readonly renderSlow: () => void;
  readonly startFrames: () => void;
  /** After a reset: render the era chrome and skill chrome again, and allow the end card to show again. */
  readonly forgetRenderedState: () => void;
}

type SignatureKey = 'site' | 'popups' | 'shop' | 'goal' | 'news' | 'skills';

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

/** After every change the page "reloads": a progress bar runs across the status bar. */
function playReloadProgress(loadTimeSeconds: number): void {
  const durationMs = Math.min(MAX_RELOAD_MS, Math.max(MIN_RELOAD_MS, loadTimeSeconds * RELOAD_MS_PER_SECOND_OF_LOAD));
  elements.browserStatusbar.style.setProperty('--reload-ms', `${durationMs}ms`);
  restartAnimation(elements.browserStatusbar, 'is-reloading');
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
  setTextIfChanged(elements.browserStatus, buildStatusText(store.game, economy));
  elements.browserStatus.classList.toggle('is-scrolling', isStatusScrolling(store.game, economy));
  setTextIfChanged(elements.browserPerf, buildPerformanceReadout(store.game, economy));
  elements.browserStatusbar.dataset['performance'] = classifyPerformance(store.game, economy);
  editor.setTitle(buildEditorTitle(store.game));
}

function renderSkillChrome(editor: CodeEditor): void {
  editor.setSource(buildEditorSource(store.game));
  editor.setTabs(buildEditorTabs(store.game));
  setTextIfChanged(elements.browserUrl, buildSiteUrl(store.game));
  setTextIfChanged(elements.browserTitle, buildBrowserTitle(store.game));
}

function renderEraChrome(editor: CodeEditor): void {
  const presentation = ERA_PRESENTATION[store.game.eraId];
  elements.app.dataset['era'] = String(presentation.year);
  elements.browserTitle.textContent = presentation.browserTitle;
  editor.setEra(store.game.eraId);
  setTextIfChanged(elements.snakeTitle, presentation.antivirusTitle);
}

function renderShop(): void {
  setHtmlIfChanged(elements.shopTabs, renderShopTabs(store.shopTab));
  elements.shopBody.innerHTML = renderShopBody(store.game, store.shopTab);
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
  const signatures: Record<SignatureKey, string> = { site: '', popups: '', shop: '', goal: '', news: '', skills: '' };
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

  const renderSiteAndReload = (): void => {
    elements.site.innerHTML = renderSite(store.game, Date.now());
    if (hasRenderedSite) playReloadProgress(calculateEconomySnapshot(store.game).loadTimeSeconds);
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
    renderWhenChanged('skills', `${store.game.eraId}|${store.game.purchasedUpgradeIds.length}`, () => renderSkillChrome(editor));
    renderWhenChanged('site', calculateSiteSignature(store.game), renderSiteAndReload);
    renderWhenChanged('popups', calculatePopupSignature(store.game), () => syncPopups(elements.popupLayer, store.game));
    renderWhenChanged('shop', calculateShopSignature(store.game, store.shopTab), renderShop);
    renderWhenChanged('goal', calculateGoalSignature(store.game), () => {
      elements.goalBody.innerHTML = renderGoal(store.game);
    });
    setHtmlIfChanged(elements.newsTip, renderTip(store.game));
    renderWhenChanged('news', store.news.map((item) => item.id).join(','), renderNewsList);
    showEndCardOnce();
  };

  const renderSlow = (): void => {
    renderBrowserStatus(editor);
    updateGoalProgress(elements.goalBody, store.game);
    updateShopAffordability();
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
