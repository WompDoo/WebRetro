import { calculateMobileStayShare, ERAS_BY_ID, formatPercent, getHostingTier, isMobileFriendly, isTrafficSpikeCached, UPGRADES_BY_ID } from '../engine';
import type { EconomySnapshot, EraId, GameState, UpgradeId } from '../engine';
import { ERA_PRESENTATION } from './presentation';
import { siteName } from './sites';
import { mainEditorFile } from './skill-code';

/** Backend knowledge mostly shows up here: the address bar, the status bar and the editor. */

export type PerformanceState = 'fast' | 'slow' | 'overloaded' | 'down';

const SERVER_METER_BLOCKS = 8;
const OVERLOAD_WARNING = 1;
const PERCENT = 100;
const LOAD_TIME_DECIMALS = 1;
const SVN_FIRST_REVISION = 100;
const KEYSTROKES_PER_REVISION = 40;
const VISIBLE_EDITOR_TABS = 5;
const JAVASCRIPT_STATUS_TEXT = 'Welcome to my homepage!!! *** Welcome!!! *** Please sign my guestbook!!!';
const J2EE_FILES: readonly string[] = [
  'web.xml', 'ejb-jar.xml', 'application.xml', 'faces-config.xml', 'struts-config.xml', 'persistence.xml', 'beans.xml',
  'jboss-web.xml', 'log4j.xml', 'build.xml', 'orm.xml', 'server.xml', 'context.xml', 'services.xml',
];

const knows = (state: GameState, upgradeId: UpgradeId): boolean => state.purchasedUpgradeIds.includes(upgradeId);

/** 2011 sites routed everything through #! so the page never reloaded. */
const SOCIAL_PATH = '/#!/home';

const SITE_PATHS: Readonly<Record<EraId, (state: GameState) => string | null>> = {
  'homepage-1997': () => null,
  'web2-2005': (state) => (knows(state, 'learn-url-rewriting') ? '/blog/2005/04/my-first-post/' : '/index.php?id=42&cat=3&sid=8f3a9c2e71b04d55'),
  'social-2011': () => SOCIAL_PATH,
};

export function buildSiteUrl(state: GameState): string {
  const path = SITE_PATHS[state.eraId](state);
  return path === null ? ERA_PRESENTATION[state.eraId].siteUrl : `http://www.${siteName(state)}.com${path}`;
}

export function buildBrowserTitle(state: GameState): string {
  const title = ERA_PRESENTATION[state.eraId].browserTitle;
  return state.eraId === 'homepage-1997' ? title : title.replace('myhomepage', siteName(state));
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(LOAD_TIME_DECIMALS)} s`;
}

export function classifyPerformance(state: GameState, economy: EconomySnapshot): PerformanceState {
  if (economy.isSiteDown) return 'down';
  if (economy.serverLoad > OVERLOAD_WARNING) return 'overloaded';
  return economy.loadTimeSeconds > ERAS_BY_ID[state.eraId].patienceSeconds ? 'slow' : 'fast';
}

/** window.status = "Welcome!!!": the status bar scrolls once you know JavaScript in 1997. */
export function isStatusScrolling(state: GameState, economy: EconomySnapshot): boolean {
  return !economy.isSiteDown && state.eraId === 'homepage-1997' && knows(state, 'learn-javascript');
}

export function buildStatusText(state: GameState, economy: EconomySnapshot): string {
  if (economy.isSiteDown) return '503 Service Unavailable';
  if (state.eraId === 'homepage-1997' && knows(state, 'learn-javascript')) return JAVASCRIPT_STATUS_TEXT;
  const done = state.eraId === 'homepage-1997' ? 'Document: Done' : 'Done';
  const cache = isTrafficSpikeCached(state) ? ' · served from cache' : '';
  return `${done} (${formatSeconds(economy.loadTimeSeconds)})${cache}`;
}

function renderServerMeter(serverLoad: number): string {
  const filled = Math.min(SERVER_METER_BLOCKS, Math.round(serverLoad * SERVER_METER_BLOCKS));
  return `${'▮'.repeat(filled)}${'▯'.repeat(SERVER_METER_BLOCKS - filled)} ${Math.round(serverLoad * PERCENT)}%`;
}

/** Load time thresholds for the 2011 grade, after the browser plugins that graded your page A to F. */
const GRADE_THRESHOLDS: readonly (readonly [number, string])[] = [[1, 'A'], [2, 'B'], [3, 'C'], [5, 'D'], [8, 'E']];
const MOBILE_SCORE_MAX = 100;
const MOBILE_SCORE_LOSS_PER_SECOND = 8;

export function gradePageSpeed(loadTimeSeconds: number): string {
  return GRADE_THRESHOLDS.find(([limit]) => loadTimeSeconds <= limit)?.[1] ?? 'F';
}

/** Out of 100: how a phone visitor rates your page. Low until it fits on the screen, then it's all about speed. */
export function calculateMobileScore(state: GameState, loadTimeSeconds: number): number {
  const fits = calculateMobileStayShare(state) * MOBILE_SCORE_MAX;
  return Math.max(0, Math.round(fits - loadTimeSeconds * MOBILE_SCORE_LOSS_PER_SECOND));
}

/** Which screen the browser shows your site on. */
export type DeviceView = 'desktop' | 'phone';
export const DEVICE_VIEWS: readonly DeviceView[] = ['desktop', 'phone'];

/** The switch shows up once an era has phone visitors to look at the site for. */
export function isPhoneViewOffered(state: GameState): boolean {
  return ERAS_BY_ID[state.eraId].mobileShare > 0;
}

/** A pick from a later era doesn't leak back: before phones, the site is always on a desktop screen. */
export function resolveDeviceView(state: GameState, pickedView: DeviceView): DeviceView {
  return isPhoneViewOffered(state) ? pickedView : 'desktop';
}

export interface PhoneCaption {
  readonly headline: string;
  readonly detail: string;
}

function describePhoneAudience(state: GameState): string {
  return `${formatPercent(ERAS_BY_ID[state.eraId].mobileShare)} of your visitors are on a phone.`;
}

function buildFittingPhoneCaption(state: GameState, score: string): PhoneCaption {
  return { headline: 'Fits on phones', detail: `${describePhoneAudience(state)} The page rearranges itself for the small screen. ${score}` };
}

function buildShrunkPhoneCaption(state: GameState, score: string): PhoneCaption {
  const leaving = formatPercent(1 - calculateMobileStayShare(state));
  const skill = UPGRADES_BY_ID['responsive-design'].name;
  return { headline: 'Pinch, zoom, scroll sideways', detail: `${describePhoneAudience(state)} They get your desktop page, shrunk, and ${leaving} of them give up. ${skill} to fix it. ${score}` };
}

/** What the phone view says next to the phone. */
export function buildPhoneCaption(state: GameState, loadTimeSeconds: number): PhoneCaption {
  const score = `Mobile score ${calculateMobileScore(state, loadTimeSeconds)}/100.`;
  return isMobileFriendly(state) ? buildFittingPhoneCaption(state, score) : buildShrunkPhoneCaption(state, score);
}

function renderHostingReadout(state: GameState, economy: EconomySnapshot): string {
  return `${getHostingTier(state).name} ${renderServerMeter(economy.serverLoad)}`;
}

const PERFORMANCE_READOUTS: Readonly<Record<EraId, (state: GameState, economy: EconomySnapshot, weight: string) => string>> = {
  'homepage-1997': (state, _economy, weight) => `${weight} · ${ERAS_BY_ID[state.eraId].connectionLabel}`,
  'web2-2005': (state, economy, weight) => `${weight} · ${renderHostingReadout(state, economy)}`,
  'social-2011': (state, economy, weight) =>
    `Grade ${gradePageSpeed(economy.loadTimeSeconds)} · Mobile ${calculateMobileScore(state, economy.loadTimeSeconds)}/100 · ${weight} · ${renderHostingReadout(state, economy)}`,
};

export function buildPerformanceReadout(state: GameState, economy: EconomySnapshot): string {
  return PERFORMANCE_READOUTS[state.eraId](state, economy, `${Math.round(economy.pageWeightKb)} KB`);
}

/** The title names the file you're in; with SVN, the revision too. */
export function buildEditorTitle(state: GameState, fileName: string): string {
  const base = ERA_PRESENTATION[state.eraId].editorTitle.replace(mainEditorFile(state.eraId), fileName);
  if (state.eraId !== 'web2-2005' || !knows(state, 'svn')) return base;
  const revision = SVN_FIRST_REVISION + Math.floor(state.keystrokes / KEYSTROKES_PER_REVISION);
  return base.replace(fileName, `${fileName} (rev ${revision})`);
}

/** The files open in the editor. Past five, the rest hide behind a "+N more" that isn't a file. */
export interface EditorTabs {
  readonly files: readonly string[];
  readonly hiddenCount: number;
}

/** Files a skill adds to the editor, per era. */
const SKILL_FILES: Readonly<Partial<Record<EraId, readonly (readonly [UpgradeId, readonly string[]])[]>>> = {
  'web2-2005': [
    ['learn-url-rewriting', ['.htaccess']],
    ['rails', ['config/routes.rb']],
    ['j2ee', J2EE_FILES],
  ],
  'social-2011': [['learn-nodejs', ['server.js']], ['learn-bcrypt', ['server.js']], ['learn-rest-apis', ['server.js']], ['learn-sass', ['style.scss']]],
};

function listEditorFiles(state: GameState): readonly string[] {
  const extra = (SKILL_FILES[state.eraId] ?? []).filter(([skillId]) => knows(state, skillId)).flatMap(([, files]) => files);
  // Several skills can write to the same file; it gets one tab.
  return [...new Set([...ERA_PRESENTATION[state.eraId].editorTabs, ...extra])];
}

export function buildEditorTabs(state: GameState): EditorTabs {
  const files = listEditorFiles(state);
  return { files: files.slice(0, VISIBLE_EDITOR_TABS), hiddenCount: Math.max(0, files.length - VISIBLE_EDITOR_TABS) };
}

/** The file being edited: the one picked if it's still open, otherwise the era's main file. */
export function resolveEditorFile(state: GameState, pickedFile: string | null): string {
  return pickedFile !== null && buildEditorTabs(state).files.includes(pickedFile) ? pickedFile : mainEditorFile(state.eraId);
}
