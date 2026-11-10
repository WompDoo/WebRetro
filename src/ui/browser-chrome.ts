import { ERAS_BY_ID, getHostingTier } from '../engine';
import type { EconomySnapshot, GameState, UpgradeId } from '../engine';
import { ERA_PRESENTATION } from './presentation';
import { siteName } from './sites';

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

export function buildSiteUrl(state: GameState): string {
  if (state.eraId === 'homepage-1997') return ERA_PRESENTATION[state.eraId].siteUrl;
  const path = knows(state, 'learn-url-rewriting') ? '/blog/2005/04/my-first-post/' : '/index.php?id=42&cat=3&sid=8f3a9c2e71b04d55';
  return `http://www.${siteName(state)}.com${path}`;
}

export function buildBrowserTitle(state: GameState): string {
  const title = ERA_PRESENTATION[state.eraId].browserTitle;
  return state.eraId === 'web2-2005' ? title.replace('myhomepage', siteName(state)) : title;
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
  return `${done} (${formatSeconds(economy.loadTimeSeconds)})`;
}

function renderServerMeter(serverLoad: number): string {
  const filled = Math.min(SERVER_METER_BLOCKS, Math.round(serverLoad * SERVER_METER_BLOCKS));
  return `${'▮'.repeat(filled)}${'▯'.repeat(SERVER_METER_BLOCKS - filled)} ${Math.round(serverLoad * PERCENT)}%`;
}

export function buildPerformanceReadout(state: GameState, economy: EconomySnapshot): string {
  const era = ERAS_BY_ID[state.eraId];
  const weight = `${Math.round(economy.pageWeightKb)} KB`;
  return era.hasServerLoad
    ? `${weight} · ${getHostingTier(state).name} ${renderServerMeter(economy.serverLoad)}`
    : `${weight} · ${era.connectionLabel}`;
}

export function buildEditorTitle(state: GameState): string {
  const base = ERA_PRESENTATION[state.eraId].editorTitle;
  if (state.eraId !== 'web2-2005' || !knows(state, 'svn')) return base;
  const revision = SVN_FIRST_REVISION + Math.floor(state.keystrokes / KEYSTROKES_PER_REVISION);
  return base.replace('blog.php', `blog.php (rev ${revision})`);
}

export function buildEditorTabs(state: GameState): readonly string[] {
  const base = ERA_PRESENTATION[state.eraId].editorTabs;
  if (state.eraId !== 'web2-2005') return base;
  const tabs = [
    ...base,
    ...(knows(state, 'learn-url-rewriting') ? ['.htaccess'] : []),
    ...(knows(state, 'rails') ? ['config/routes.rb'] : []),
    ...(knows(state, 'j2ee') ? J2EE_FILES : []),
  ];
  const hidden = tabs.length - VISIBLE_EDITOR_TABS;
  return hidden > 0 ? [...tabs.slice(0, VISIBLE_EDITOR_TABS), `+${hidden} more`] : tabs;
}
