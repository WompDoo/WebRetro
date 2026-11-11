import { calculateMobileStayShare, ERAS_BY_ID, findChosenFramework, FRAMEWORKS_BY_ID, formatPercent, getHostingTier, isMobileFriendly, isTrafficSpikeCached, UPGRADES_BY_ID } from '../engine';
import type { EconomySnapshot, EraId, FrameworkId, GameState, UpgradeId } from '../engine';
import { resolveEditorTabs, resolveEditorTitle } from './framework-presentation';
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
/** Enterprise Java's 14 XML files: past this many tabs, 2005 gives up and says "+13 more". */
const J2EE_VISIBLE_TABS = 5;
const JAVASCRIPT_STATUS_TEXT = 'Welcome to my homepage!!! *** Welcome!!! *** Please sign my guestbook!!!';
const J2EE_FILES: readonly string[] = [
  'web.xml', 'ejb-jar.xml', 'application.xml', 'faces-config.xml', 'struts-config.xml', 'persistence.xml', 'beans.xml',
  'jboss-web.xml', 'log4j.xml', 'build.xml', 'orm.xml', 'server.xml', 'context.xml', 'services.xml',
];

const knows = (state: GameState, upgradeId: UpgradeId): boolean => state.purchasedUpgradeIds.includes(upgradeId);

/** 2011 sites routed everything through #! so the page never reloaded. */
const SOCIAL_PATH = '/#!/home';

/** Single-page app routes. Vue's router used # URLs unless you asked it not to, and in 2018 most didn't. */
const FRAMEWORK_PATHS: Readonly<Record<FrameworkId, string>> = { react: '/', angular: '/', vue: '/#/' };

function findPlatformPath(state: GameState): string {
  const framework = findChosenFramework(state);
  return framework === null ? SOCIAL_PATH : FRAMEWORK_PATHS[framework];
}

const SITE_PATHS: Readonly<Record<EraId, (state: GameState) => string | null>> = {
  'homepage-1997': () => null,
  'web2-2005': (state) => (knows(state, 'learn-url-rewriting') ? '/blog/2005/04/my-first-post/' : '/index.php?id=42&cat=3&sid=8f3a9c2e71b04d55'),
  'social-2011': () => SOCIAL_PATH,
  'platform-2018': findPlatformPath,
};

/** By 2018 certificates were free, and browsers called every plain http page "Not secure". */
function describeScheme(eraId: EraId): string {
  return eraId === 'platform-2018' ? 'https' : 'http';
}

export function buildSiteUrl(state: GameState): string {
  const path = SITE_PATHS[state.eraId](state);
  return path === null ? ERA_PRESENTATION[state.eraId].siteUrl : `${describeScheme(state.eraId)}://www.${siteName(state)}.com${path}`;
}

export function buildBrowserTitle(state: GameState): string {
  const title = ERA_PRESENTATION[state.eraId].browserTitle;
  return state.eraId === 'homepage-1997' ? title : title.replace('myhomepage', siteName(state));
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(LOAD_TIME_DECIMALS)} s`;
}

/** The load time on the screen the browser shows the site on: a phone's connection is much slower. */
export function pickLoadTime(economy: EconomySnapshot, device: DeviceView): number {
  return device === 'phone' ? economy.phoneLoadTimeSeconds : economy.loadTimeSeconds;
}

function classifySpeed(state: GameState, loadTimeSeconds: number): PerformanceState {
  return loadTimeSeconds > ERAS_BY_ID[state.eraId].patienceSeconds ? 'slow' : 'fast';
}

export function classifyPerformance(state: GameState, economy: EconomySnapshot, device: DeviceView): PerformanceState {
  if (economy.isSiteDown) return 'down';
  if (economy.serverLoad > OVERLOAD_WARNING) return 'overloaded';
  return classifySpeed(state, pickLoadTime(economy, device));
}

/** window.status = "Welcome!!!": the status bar scrolls once you know JavaScript in 1997. */
export function isStatusScrolling(state: GameState, economy: EconomySnapshot): boolean {
  return !economy.isSiteDown && state.eraId === 'homepage-1997' && knows(state, 'learn-javascript');
}

/**
 * The load time the status bar reports. From the first era with phones, the desktop view names the phone's too: the
 * page that loads in 0.3 s on your fiber can take seconds on 4G, and that's where most visitors are.
 */
function describeLoadTimes(state: GameState, economy: EconomySnapshot, device: DeviceView): string {
  const own = formatSeconds(pickLoadTime(economy, device));
  const hasPhones = device === 'desktop' && ERAS_BY_ID[state.eraId].mobileShare > 0;
  return hasPhones ? `${own} · ${formatSeconds(economy.phoneLoadTimeSeconds)} on phones` : own;
}

export function buildStatusText(state: GameState, economy: EconomySnapshot, device: DeviceView): string {
  if (economy.isSiteDown) return '503 Service Unavailable';
  if (state.eraId === 'homepage-1997' && knows(state, 'learn-javascript')) return JAVASCRIPT_STATUS_TEXT;
  const done = state.eraId === 'homepage-1997' ? 'Document: Done' : 'Done';
  const cache = isTrafficSpikeCached(state) ? ' · served from cache' : '';
  return `${done} (${describeLoadTimes(state, economy, device)})${cache}`;
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

/** The numbers behind 2018's speed score: how long the main content takes, how late a tap is answered, how far the page jumps. */
export interface WebVitals {
  readonly largestPaintSeconds: number;
  readonly inputDelayMs: number;
  readonly layoutShift: number;
}

export type LighthouseRating = 'good' | 'average' | 'poor';

const BASE_INPUT_DELAY_MS = 30;
/** The bigger the framework's bundle, the longer the main thread is busy when the first tap arrives. */
const INPUT_DELAY_MS_PER_BUNDLE_KB = 0.2;
/** Ads arrive after the page and shove the content down. */
const LAYOUT_SHIFT_PER_AD = 0.02;
/** Good and poor thresholds of each vital, as the speed test grades them. */
const LARGEST_PAINT_SECONDS = { good: 2.5, poor: 4 } as const;
const INPUT_DELAY_MS = { good: 100, poor: 300 } as const;
const LAYOUT_SHIFT = { good: 0.1, poor: 0.25 } as const;
const VITAL_WEIGHTS = { largestPaint: 0.5, inputDelay: 0.3, layoutShift: 0.2 } as const;
const GOOD_SCORE = 90;
const AVERAGE_SCORE = 50;
/** A vital at its good threshold scores 0.9 and at its poor threshold 0.5; twice poor scores nothing. */
const SCORE_AT_GOOD = 0.9;
const SCORE_AT_POOR = 0.5;
const POOR_TO_ZERO = 2;
const BYTES_DECIMALS = 2;

function findFrameworkBundleKb(state: GameState): number {
  const framework = findChosenFramework(state);
  return framework === null ? 0 : UPGRADES_BY_ID[FRAMEWORKS_BY_ID[framework].skillId].pageWeightKb;
}

export function measureWebVitals(state: GameState, economy: EconomySnapshot): WebVitals {
  return {
    // The speed test runs as a mid-range phone on a mobile network, as Lighthouse does.
    largestPaintSeconds: economy.phoneLoadTimeSeconds,
    inputDelayMs: BASE_INPUT_DELAY_MS + findFrameworkBundleKb(state) * INPUT_DELAY_MS_PER_BUNDLE_KB,
    layoutShift: state.adCount * LAYOUT_SHIFT_PER_AD,
  };
}

interface VitalThresholds {
  readonly good: number;
  readonly poor: number;
}

/** Straight lines between (0, 1), (good, 0.9), (poor, 0.5) and (twice poor, 0). */
function scoreVital(value: number, thresholds: VitalThresholds): number {
  const points: readonly (readonly [number, number])[] = [[0, 1], [thresholds.good, SCORE_AT_GOOD], [thresholds.poor, SCORE_AT_POOR], [thresholds.poor * POOR_TO_ZERO, 0]];
  const upperIndex = points.findIndex(([limit]) => value <= limit);
  return upperIndex < 1 ? interpolateEnds(upperIndex) : interpolateBetween(points, upperIndex, value);
}

function interpolateEnds(upperIndex: number): number {
  return upperIndex === 0 ? 1 : 0;
}

/** Only called with upperIndex at least 1, so both points exist. */
function interpolateBetween(points: readonly (readonly [number, number])[], upperIndex: number, value: number): number {
  const [fromX, fromY] = points[upperIndex - 1];
  const [toX, toY] = points[upperIndex];
  return fromY + ((value - fromX) / Math.max(Number.EPSILON, toX - fromX)) * (toY - fromY);
}

/** One score out of 100, weighted towards how fast the main content shows. */
export function scoreLighthouse(vitals: WebVitals): number {
  const weighted =
    scoreVital(vitals.largestPaintSeconds, LARGEST_PAINT_SECONDS) * VITAL_WEIGHTS.largestPaint +
    scoreVital(vitals.inputDelayMs, INPUT_DELAY_MS) * VITAL_WEIGHTS.inputDelay +
    scoreVital(vitals.layoutShift, LAYOUT_SHIFT) * VITAL_WEIGHTS.layoutShift;
  return Math.round(weighted * PERCENT);
}

function rateBelowGood(score: number): LighthouseRating {
  return score >= AVERAGE_SCORE ? 'average' : 'poor';
}

/** Green, orange or red, like the circle around the score. */
export function rateLighthouse(score: number): LighthouseRating {
  return score >= GOOD_SCORE ? 'good' : rateBelowGood(score);
}

/** The status bar's colour for the score: only 2018 has a score. */
export function describeLighthouseRating(state: GameState, economy: EconomySnapshot): string {
  return state.eraId === 'platform-2018' ? rateLighthouse(scoreLighthouse(measureWebVitals(state, economy))) : '';
}

function renderLighthouse(state: GameState, economy: EconomySnapshot): string {
  const vitals = measureWebVitals(state, economy);
  return `${scoreLighthouse(vitals)} · LCP ${formatSeconds(vitals.largestPaintSeconds)} · FID ${Math.round(vitals.inputDelayMs)} ms · CLS ${vitals.layoutShift.toFixed(BYTES_DECIMALS)}`;
}

function renderHostingReadout(state: GameState, economy: EconomySnapshot): string {
  return `${getHostingTier(state).name} ${renderServerMeter(economy.serverLoad)}`;
}

const PERFORMANCE_READOUTS: Readonly<Record<EraId, (state: GameState, economy: EconomySnapshot, weight: string) => string>> = {
  'homepage-1997': (state, _economy, weight) => `${weight} · ${ERAS_BY_ID[state.eraId].connectionLabel}`,
  'web2-2005': (state, economy, weight) => `${weight} · ${renderHostingReadout(state, economy)}`,
  'social-2011': (state, economy, weight) =>
    `Grade ${gradePageSpeed(economy.loadTimeSeconds)} · Mobile ${calculateMobileScore(state, economy.phoneLoadTimeSeconds)}/100 · ${weight} · ${renderHostingReadout(state, economy)}`,
  'platform-2018': (state, economy) => `${renderLighthouse(state, economy)} · ${renderHostingReadout(state, economy)}`,
};

export function buildPerformanceReadout(state: GameState, economy: EconomySnapshot): string {
  return PERFORMANCE_READOUTS[state.eraId](state, economy, `${Math.round(economy.pageWeightKb)} KB`);
}

const MEGABYTES_PER_GIGABYTE = 1_024;
const NODE_MODULES_BASE_MB = 60;
/**
 * Every keystroke is an npm install, and each framework pulls in its own amount: React leaves everything to npm,
 * Angular ships most of it in the box. A framework adds its own starting pile too.
 */
const NODE_MODULES_MB_PER_KEYSTROKE: Readonly<Record<FrameworkId, number>> = { react: 0.04, angular: 0.02, vue: 0.03 };
const NODE_MODULES_FRAMEWORK_MB: Readonly<Record<FrameworkId, number>> = { react: 180, angular: 290, vue: 140 };
const UNPICKED_MB_PER_KEYSTROKE = 0.03;

export function measureNodeModulesMb(state: GameState): number {
  const framework = findChosenFramework(state);
  return framework === null
    ? NODE_MODULES_BASE_MB + state.keystrokes * UNPICKED_MB_PER_KEYSTROKE
    : NODE_MODULES_BASE_MB + NODE_MODULES_FRAMEWORK_MB[framework] + state.keystrokes * NODE_MODULES_MB_PER_KEYSTROKE[framework];
}

export function formatMegabytes(megabytes: number): string {
  return megabytes < MEGABYTES_PER_GIGABYTE ? `${Math.round(megabytes)} MB` : `${(megabytes / MEGABYTES_PER_GIGABYTE).toFixed(LOAD_TIME_DECIMALS)} GB`;
}

function describeSvnRevision(state: GameState, fileName: string): string {
  return knows(state, 'svn') ? `${fileName} (rev ${SVN_FIRST_REVISION + Math.floor(state.keystrokes / KEYSTROKES_PER_REVISION)})` : fileName;
}

/** What the title adds after the file name, in the eras that add anything. */
const EDITOR_TITLE_EXTRAS: Readonly<Partial<Record<EraId, (state: GameState, fileName: string) => string>>> = {
  'web2-2005': describeSvnRevision,
  'platform-2018': (state, fileName) => `${fileName} · node_modules ${formatMegabytes(measureNodeModulesMb(state))}`,
};

function describeEditorExtras(state: GameState, fileName: string): string {
  const describe = EDITOR_TITLE_EXTRAS[state.eraId];
  return describe === undefined ? fileName : describe(state, fileName);
}

/** The title names the file you're in; with SVN, the revision too; in 2018, the size of node_modules. */
export function buildEditorTitle(state: GameState, fileName: string): string {
  return resolveEditorTitle(state).replace(mainEditorFile(state), describeEditorExtras(state, fileName));
}

/** The files open in the editor, each a tab; the tab bar scrolls sideways. 2005 hides its pile of XML behind "+N more". */
export interface EditorTabs {
  readonly files: readonly string[];
  readonly hiddenCount: number;
  /** What hovering the "+N more" says. */
  readonly hiddenTitle: string;
}

/** Files a skill adds to the editor, per era. */
const SKILL_FILES: Readonly<Partial<Record<EraId, readonly (readonly [UpgradeId, readonly string[]])[]>>> = {
  'web2-2005': [
    ['learn-url-rewriting', ['.htaccess']],
    ['rails', ['config/routes.rb']],
    ['j2ee', J2EE_FILES],
  ],
  'social-2011': [['learn-nodejs', ['server.js']], ['learn-bcrypt', ['server.js']], ['learn-rest-apis', ['server.js']], ['learn-sass', ['style.scss']]],
  // Only the picked framework's server rendering can be learned, so each lists its own file.
  'platform-2018': [
    ['mobile-first', ['styles.scss']],
    ['learn-payments', ['api/checkout.js']],
    ['learn-oauth', ['server.js']],
    ['learn-websockets', ['server.js']],
    ['nextjs-ssr', ['pages/index.js']],
    ['angular-universal', ['app.server.module.ts']],
    ['nuxt-ssr', ['pages/index.vue']],
  ],
};

function listEditorFiles(state: GameState): readonly string[] {
  const extra = (SKILL_FILES[state.eraId] ?? []).filter(([skillId]) => knows(state, skillId)).flatMap(([, files]) => files);
  // Several skills can write to the same file; it gets one tab.
  return [...new Set([...resolveEditorTabs(state), ...extra])];
}

/**
 * Only 2005 collapses its tabs: the joke is that J2EE needs more files than anyone can open. In other eras every file
 * is a real tab you can reach by scrolling the tab bar.
 */
function findVisibleTabLimit(eraId: EraId): number {
  return eraId === 'web2-2005' ? J2EE_VISIBLE_TABS : Number.POSITIVE_INFINITY;
}

export function buildEditorTabs(state: GameState): EditorTabs {
  const files = listEditorFiles(state);
  const limit = findVisibleTabLimit(state.eraId);
  const hiddenCount = Math.max(0, files.length - limit);
  return { files: files.slice(0, limit), hiddenCount, hiddenTitle: `Enterprise Java: ${hiddenCount} more XML files` };
}

/** The file being edited: the one picked if it's still open, otherwise the era's main file. */
export function resolveEditorFile(state: GameState, pickedFile: string | null): string {
  return pickedFile !== null && buildEditorTabs(state).files.includes(pickedFile) ? pickedFile : mainEditorFile(state);
}
