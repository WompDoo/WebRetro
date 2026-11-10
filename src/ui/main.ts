import {
  advanceEra,
  advanceSimulation,
  calculateRequiredVirusFood,
  findVirus,
  getFeatureDisplayName,
  removeVirus,
  buyDefense,
  buyFeature,
  buyUpgrade,
  calculateEconomySnapshot,
  closePopup,
  createInitialGameState,
  DEFENSE_IDS,
  ERAS_BY_ID,
  FEATURE_IDS,
  formatCompactNumber,
  formatMoney,
  formatWholeNumber,
  isEraGateComplete,
  placeAd,
  removeAd,
  restoreGameState,
  scrubInfection,
  toggleDefense,
  UPGRADE_IDS,
  writeCode,
} from '../engine';
import type { DefenseId, FeatureId, GameEvent, GameState, SimulationMode, UpgradeId } from '../engine';
import { createCodeEditor } from './code-editor';
import type { CodeEditor, KeystrokeFeedback } from './code-editor';
import { escapeHtml, requireElement, setHtmlIfChanged, setTextIfChanged } from './dom';
import { ERA_PRESENTATION } from './presentation';
import { calculateGoalSignature, renderGoal, updateGoalProgress } from './render-goal';
import { calculatePopupSignature, syncPopups } from './render-popups';
import { calculateShopSignature, countAffordable, renderShopBody, renderShopTabs, SHOP_TABS } from './render-shop';
import type { ShopTab } from './render-shop';
import { calculateDisplayedCounter, calculateSiteSignature, renderCounterDigits, renderGuestbookEntries, renderMusicStatus, renderSite, renderVirusTimer } from './render-site';
import { buildEditorSource } from './skill-code';
import { createSnakeModal } from './snake-modal';
import type { SnakeModal, SnakeTarget } from './snake-modal';

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

interface StoredSave {
  readonly savedAtMs: number;
  readonly game: unknown;
}

interface NewsItem {
  readonly id: number;
  readonly year: number;
  readonly message: string;
}

const SAVE_STORAGE_KEY = 'under-construction:save';
const TICK_INTERVAL_MS = 100;
const OFFLINE_THRESHOLD_MS = 5_000;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1_000;
const AUTOSAVE_INTERVAL_MS = 5_000;
const SLOW_RENDER_INTERVAL_MS = 250;
const MAX_NEWS_ITEMS = 6;
const WIPE_SWAP_DELAY_MS = 700;
const WIPE_DURATION_MS = 1_600;
const SEED_RANGE = 2 ** 31;
const MS_PER_MINUTE = 60_000;

let game: GameState = createInitialGameState(createSeed());
let shopTab: ShopTab = 'learn';
let news: readonly NewsItem[] = [];
let newsCounter = 0;
let lastTickAt = performance.now();
let lastSlowRenderAt = 0;
let renderedEraId = '';
let endCardShown = false;
let editor: CodeEditor | null = null;
let snake: SnakeModal | null = null;
const signatures = { site: '', popups: '', shop: '', goal: '', news: '', skills: '' };

function createSeed(): number {
  return Math.floor(Math.random() * SEED_RANGE);
}

const elements = {
  app: requireElement<HTMLElement>('#app'),
  eraBadge: requireElement<HTMLElement>('#era-badge'),
  statMoney: requireElement<HTMLElement>('#stat-money'),
  statVisitors: requireElement<HTMLElement>('#stat-visitors'),
  statRevenue: requireElement<HTMLElement>('#stat-revenue'),
  browserTitle: requireElement<HTMLElement>('#browser-title'),
  browserUrl: requireElement<HTMLElement>('#browser-url'),
  browserStatus: requireElement<HTMLElement>('#browser-status'),
  site: requireElement<HTMLElement>('#site'),
  popupLayer: requireElement<HTMLElement>('#popup-layer'),
  eraWipe: requireElement<HTMLElement>('#era-wipe'),
  shopTabs: requireElement<HTMLElement>('#shop-tabs'),
  shopBody: requireElement<HTMLElement>('#shop-body'),
  goalBody: requireElement<HTMLElement>('#goal-body'),
  newsList: requireElement<HTMLElement>('#news-list'),
  storyOverlay: requireElement<HTMLElement>('#story-overlay'),
  storyCard: requireElement<HTMLElement>('#story-card'),
  resetOverlay: requireElement<HTMLElement>('#reset-overlay'),
  endOverlay: requireElement<HTMLElement>('#end-overlay'),
  endStats: requireElement<HTMLElement>('#end-stats'),
};

function readSave(): StoredSave | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredSave);
  } catch {
    return null;
  }
}

function writeSave(): void {
  try {
    const save: StoredSave = { savedAtMs: Date.now(), game };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be blocked (private windows, previews). The game keeps running without saves.
  }
}

function clearSave(): void {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

function pushNews(events: readonly GameEvent[]): void {
  const year = ERAS_BY_ID[game.eraId].year;
  const items = events.map<NewsItem>((event) => ({ id: ++newsCounter, year, message: event.message }));
  news = [...items.reverse(), ...news].slice(0, MAX_NEWS_ITEMS);
}

function pushMessage(message: string): void {
  pushNews([{ kind: 'milestone', message }]);
}

function updateGame(update: (state: GameState) => GameState): void {
  game = update(game);
}

function applyStep(step: { readonly state: GameState; readonly events: readonly GameEvent[] }): void {
  game = step.state;
  pushNews(step.events);
}

function catchUpOffline(savedAtMs: number): void {
  const awayMs = Math.min(Date.now() - savedAtMs, MAX_OFFLINE_MS);
  if (awayMs < OFFLINE_THRESHOLD_MS) return;
  const moneyBefore = game.money;
  applyStep(advanceSimulation(game, awayMs, 'offline'));
  const earned = game.money - moneyBefore;
  if (earned > 0) pushMessage(`While you were away (${Math.round(awayMs / MS_PER_MINUTE)} min), your site earned ${formatMoney(earned)}.`);
}

function restoreGame(hotData: unknown): void {
  const hotSave = typeof hotData === 'object' && hotData !== null ? (hotData as { save?: unknown }).save : undefined;
  const fromHot = restoreGameState(hotSave, createSeed());
  if (fromHot !== null) {
    game = fromHot;
    return;
  }
  const stored = readSave();
  const fromStorage = stored === null ? null : restoreGameState(stored.game, createSeed());
  if (fromStorage === null || stored === null) return;
  game = fromStorage;
  catchUpOffline(stored.savedAtMs);
}

function handleKeystroke(): KeystrokeFeedback {
  const result = writeCode(game);
  game = result.state;
  return { outcome: result.outcome, earned: result.earned };
}

function readId(target: HTMLElement): string {
  return target.dataset['id'] ?? '';
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

function showOverlay(overlay: HTMLElement): void {
  overlay.hidden = false;
  overlay.querySelector<HTMLElement>('button')?.focus();
}

function renderStory(): boolean {
  const nextEraId = ERAS_BY_ID[game.eraId].nextEraId;
  const story = nextEraId === null ? null : ERA_PRESENTATION[nextEraId].entryStory;
  if (story === null) return false;
  elements.storyCard.innerHTML = `<p class="story-year">${escapeHtml(story.yearSpan)}</p>
    <h2 class="story-heading">${escapeHtml(story.heading)}</h2>
    ${story.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    <h3 class="story-subheading">What changes</h3>
    <ul class="story-list">${story.whatsNew.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <button type="button" class="primary-button" data-action="confirm-migration">${escapeHtml(story.confirmLabel)}</button>`;
  return true;
}

function runEraWipe(): void {
  elements.eraWipe.classList.remove('is-running');
  void elements.eraWipe.offsetWidth;
  elements.eraWipe.classList.add('is-running');
  window.setTimeout(() => {
    updateGame(advanceEra);
    pushMessage(`Relaunched as ${ERAS_BY_ID[game.eraId].name}. Your old features got a makeover.`);
  }, WIPE_SWAP_DELAY_MS);
  window.setTimeout(() => elements.eraWipe.classList.remove('is-running'), WIPE_DURATION_MS);
}

function startMigration(): void {
  if (!isEraGateComplete(game)) return;
  const isFinalEra = ERAS_BY_ID[game.eraId].nextEraId === null;
  if (isFinalEra) {
    updateGame(advanceEra);
    return;
  }
  if (renderStory()) showOverlay(elements.storyOverlay);
}

function resetGame(): void {
  clearSave();
  game = createInitialGameState(createSeed());
  news = [];
  endCardShown = false;
  elements.resetOverlay.hidden = true;
  elements.endOverlay.hidden = true;
  renderedEraId = '';
}

const ACTION_HANDLERS: Readonly<Record<string, (target: HTMLElement) => void>> = {
  'buy-feature': (target) => {
    const id = readId(target);
    if (isFeatureId(id)) updateGame((state) => buyFeature(state, id));
  },
  'buy-upgrade': (target) => {
    const id = readId(target);
    if (isUpgradeId(id)) updateGame((state) => buyUpgrade(state, id));
  },
  'buy-defense': (target) => {
    const id = readId(target);
    if (isDefenseId(id)) updateGame((state) => buyDefense(state, id));
  },
  'toggle-defense': (target) => {
    const id = readId(target);
    if (isDefenseId(id)) updateGame((state) => toggleDefense(state, id));
  },
  'place-ad': () => updateGame(placeAd),
  'remove-ad': () => updateGame(removeAd),
  'close-popup': (target) => updateGame((state) => closePopup(state, Number(readId(target)))),
  'scrub-infection': (target) => applyStep(scrubInfection(game, Number(readId(target)))),
  'open-snake': (target) => snake?.open(Number(readId(target))),
  'close-snake': () => snake?.close(),
  'retry-snake': () => snake?.retry(),
  'shop-tab': (target) => {
    const id = readId(target);
    if (isShopTab(id)) shopTab = id;
  },
  migrate: startMigration,
  'confirm-migration': () => {
    elements.storyOverlay.hidden = true;
    runEraWipe();
  },
  'cancel-migration': () => {
    elements.storyOverlay.hidden = true;
  },
  'open-reset': () => showOverlay(elements.resetOverlay),
  'cancel-reset': () => {
    elements.resetOverlay.hidden = true;
  },
  'confirm-reset': resetGame,
  'keep-playing': () => {
    elements.endOverlay.hidden = true;
  },
};

function handleClick(event: MouseEvent): void {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  const action = target?.dataset['action'];
  if (target === null || target === undefined || action === undefined) return;
  ACTION_HANDLERS[action]?.(target);
  renderStructure();
  renderSlow();
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (snake?.handleKey(event) === true) return;
  if (event.key !== 'Escape') return;
  const topPopup = game.popups[game.popups.length - 1];
  if (topPopup !== undefined) updateGame((state) => closePopup(state, topPopup.id));
}

function tick(): void {
  const now = performance.now();
  const elapsedMs = Math.min(now - lastTickAt, MAX_OFFLINE_MS);
  lastTickAt = now;
  const mode: SimulationMode = elapsedMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'live';
  applyStep(advanceSimulation(game, elapsedMs, mode));
}

function renderEraChrome(): void {
  if (renderedEraId === game.eraId) return;
  renderedEraId = game.eraId;
  const presentation = ERA_PRESENTATION[game.eraId];
  elements.app.dataset['era'] = String(presentation.year);
  elements.eraBadge.textContent = presentation.badge;
  elements.browserTitle.textContent = presentation.browserTitle;
  elements.browserUrl.textContent = presentation.siteUrl;
  elements.browserStatus.textContent = presentation.browserStatus;
  editor?.setEra(game.eraId);
  setTextIfChanged(requireElement('#snake-title'), presentation.antivirusTitle);
}

const JAVASCRIPT_STATUS_TEXT = 'Welcome to my homepage!!! *** Welcome!!! *** Please sign my guestbook!!!';

function renderSkillChrome(): void {
  editor?.setSource(buildEditorSource(game));
  const knowsJavaScript = game.eraId === 'homepage-1997' && game.purchasedUpgradeIds.includes('learn-javascript');
  setTextIfChanged(elements.browserStatus, knowsJavaScript ? JAVASCRIPT_STATUS_TEXT : ERA_PRESENTATION[game.eraId].browserStatus);
}

function renderNews(): void {
  const signature = news.map((item) => item.id).join(',');
  if (signature === signatures.news) return;
  signatures.news = signature;
  elements.newsList.innerHTML =
    news.length === 0
      ? '<li class="news-empty">Nothing yet. The web is quiet.</li>'
      : news.map((item) => `<li><span class="news-year">${item.year}</span><span>${escapeHtml(item.message)}</span></li>`).join('');
}

function renderStructure(): void {
  renderEraChrome();
  const skillSignature = `${game.eraId}|${game.purchasedUpgradeIds.length}`;
  if (skillSignature !== signatures.skills) {
    signatures.skills = skillSignature;
    renderSkillChrome();
  }
  const siteSignature = calculateSiteSignature(game);
  if (siteSignature !== signatures.site) {
    signatures.site = siteSignature;
    elements.site.innerHTML = renderSite(game, Date.now());
  }
  const popupSignature = calculatePopupSignature(game);
  if (popupSignature !== signatures.popups) {
    signatures.popups = popupSignature;
    syncPopups(elements.popupLayer, game);
  }
  const shopSignature = calculateShopSignature(game, shopTab);
  if (shopSignature !== signatures.shop) {
    signatures.shop = shopSignature;
    setHtmlIfChanged(elements.shopTabs, renderShopTabs(shopTab));
    elements.shopBody.innerHTML = renderShopBody(game, shopTab);
  }
  const goalSignature = calculateGoalSignature(game);
  if (goalSignature !== signatures.goal) {
    signatures.goal = goalSignature;
    elements.goalBody.innerHTML = renderGoal(game);
  }
  renderNews();
  showEndCardOnce();
}

function showEndCardOnce(): void {
  if (!game.prototypeComplete || endCardShown) return;
  endCardShown = true;
  const minutes = Math.round(game.playTimeMs / MS_PER_MINUTE);
  elements.endStats.innerHTML = `<li><b>${minutes} min</b> played</li><li><b>${formatWholeNumber(game.lifetimeVisitors)}</b> visitors</li><li><b>${formatMoney(game.lifetimeEarnings)}</b> earned</li><li><b>${formatWholeNumber(game.keystrokes)}</b> keystrokes</li>`;
  showOverlay(elements.endOverlay);
}

function renderStats(): void {
  const economy = calculateEconomySnapshot(game);
  setTextIfChanged(elements.statMoney, formatMoney(game.money));
  setTextIfChanged(elements.statVisitors, `${formatCompactNumber(economy.visitorsPerSecond)}/s`);
  setTextIfChanged(elements.statRevenue, `${formatMoney(economy.netRevenuePerSecond)}/s`);
  editor?.updateRate(economy.keystrokeValue, economy.bugChance);
}

function renderLiveSiteBits(): void {
  const nowMs = Date.now();
  const counter = elements.site.querySelector<HTMLElement>('[data-live="counter"]');
  const guestbook = elements.site.querySelector<HTMLElement>('[data-live="guestbook"]');
  const music = elements.site.querySelector<HTMLElement>('[data-live="music"]');
  if (counter) setHtmlIfChanged(counter, renderCounterDigits(calculateDisplayedCounter(game)));
  if (guestbook) setHtmlIfChanged(guestbook, renderGuestbookEntries(game.eraId, game.featureLevels.guestbook, nowMs));
  if (music) setHtmlIfChanged(music, renderMusicStatus(game.eraId, nowMs));
  elements.site.querySelectorAll<HTMLElement>('[data-live="virus-timer"]').forEach((timer) => {
    const virus = findVirus(game, Number(timer.dataset['id']));
    if (virus !== null) setTextIfChanged(timer, renderVirusTimer(virus));
  });
}

function findSnakeTarget(infectionId: number): SnakeTarget | null {
  const virus = findVirus(game, infectionId);
  if (virus === null) return null;
  return {
    requiredFood: calculateRequiredVirusFood(virus),
    featureName: getFeatureDisplayName(virus.featureId, game.eraId).toLowerCase(),
  };
}

function renderSlow(): void {
  updateGoalProgress(elements.goalBody, game);
  elements.shopBody.querySelectorAll<HTMLButtonElement>('button[data-cost]').forEach((button) => {
    button.disabled = game.money < Number(button.dataset['cost']);
  });
  SHOP_TABS.forEach((tab) => {
    const badge = elements.shopTabs.querySelector<HTMLElement>(`[data-tab-badge="${tab}"]`);
    const count = countAffordable(game, tab);
    if (badge === null) return;
    badge.hidden = count === 0 || tab === shopTab;
    setTextIfChanged(badge, String(count));
  });
}

function frame(now: number): void {
  renderStats();
  renderStructure();
  renderLiveSiteBits();
  if (now - lastSlowRenderAt > SLOW_RENDER_INTERVAL_MS) {
    lastSlowRenderAt = now;
    renderSlow();
  }
  window.requestAnimationFrame(frame);
}

function start(hotData: unknown): void {
  restoreGame(hotData);
  editor = createCodeEditor(
    {
      window: requireElement('#editor-window'),
      surface: requireElement('#editor-surface'),
      code: requireElement('#editor-code'),
      floaters: requireElement('#editor-floaters'),
      prompt: requireElement('#editor-prompt'),
      title: requireElement('#editor-title'),
      menu: requireElement('#editor-menu'),
      tabs: requireElement('#editor-tabs'),
      position: requireElement('#editor-position'),
      rate: requireElement('#editor-rate'),
    },
    handleKeystroke,
  );
  snake = createSnakeModal(
    {
      overlay: requireElement('#snake-overlay'),
      title: requireElement('#snake-title'),
      brief: requireElement('#snake-brief'),
      progress: requireElement('#snake-progress'),
      canvas: requireElement<HTMLCanvasElement>('#snake-canvas'),
      status: requireElement('#snake-status'),
      pad: requireElement('#snake-pad'),
      retry: requireElement('#snake-retry'),
    },
    { findTarget: findSnakeTarget, onWin: (infectionId) => applyStep(removeVirus(game, infectionId)) },
  );
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? writeSave() : undefined));
  window.addEventListener('pagehide', writeSave);
  window.setInterval(tick, TICK_INTERVAL_MS);
  window.setInterval(writeSave, AUTOSAVE_INTERVAL_MS);
  window.claude?.hot?.snapshot?.(() => ({ save: game }));
  endCardShown = game.prototypeComplete;
  lastTickAt = performance.now();
  window.requestAnimationFrame(frame);
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
