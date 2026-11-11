import type { CodeEditorElements } from './code-editor';
import { requireElement } from './dom';
import type { MinigameModalElements } from './minigames/minigame-modal';

/** Looked up once at startup. A missing element is a broken page, so requireElement throws. */
export const elements = {
  app: requireElement<HTMLElement>('#app'),
  statMoney: requireElement<HTMLElement>('#stat-money'),
  statVisitors: requireElement<HTMLElement>('#stat-visitors'),
  statRevenue: requireElement<HTMLElement>('#stat-revenue'),
  browserTitle: requireElement<HTMLElement>('#browser-title'),
  browserUrl: requireElement<HTMLElement>('#browser-url'),
  browserStatus: requireElement<HTMLElement>('#browser-status'),
  browserPerf: requireElement<HTMLElement>('#browser-perf'),
  browserStatusbar: requireElement<HTMLElement>('#browser-statusbar'),
  browserViewport: requireElement<HTMLElement>('#browser-viewport'),
  deviceSwitch: requireElement<HTMLElement>('#device-switch'),
  deviceCaption: requireElement<HTMLElement>('#device-caption'),
  deviceNotifications: requireElement<HTMLElement>('#device-notifications'),
  site: requireElement<HTMLElement>('#site'),
  popupLayer: requireElement<HTMLElement>('#popup-layer'),
  eraWipe: requireElement<HTMLElement>('#era-wipe'),
  shopTabs: requireElement<HTMLElement>('#shop-tabs'),
  shopBody: requireElement<HTMLElement>('#shop-body'),
  goalBody: requireElement<HTMLElement>('#goal-body'),
  newsList: requireElement<HTMLElement>('#news-list'),
  newsTip: requireElement<HTMLElement>('#news-tip'),
  codeTip: requireElement<HTMLElement>('#code-tip'),
  issueList: requireElement<HTMLElement>('#issue-list'),
  issueTitle: requireElement<HTMLElement>('#issue-title'),
  tabbar: requireElement<HTMLElement>('#tabbar'),
  tabbarInboxLabel: requireElement<HTMLElement>('#tabbar-inbox-label'),
  storyOverlay: requireElement<HTMLElement>('#story-overlay'),
  storyCard: requireElement<HTMLElement>('#story-card'),
  resetOverlay: requireElement<HTMLElement>('#reset-overlay'),
  endOverlay: requireElement<HTMLElement>('#end-overlay'),
  endStats: requireElement<HTMLElement>('#end-stats'),
  playtestButton: requireElement<HTMLElement>('#playtest-button'),
  playtestOverlay: requireElement<HTMLElement>('#playtest-overlay'),
  playtestBody: requireElement<HTMLElement>('#playtest-body'),
};

export const editorElements: CodeEditorElements = {
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
};

export const minigameElements: MinigameModalElements = {
  overlay: requireElement('#minigame-overlay'),
  title: requireElement('#minigame-title'),
  brief: requireElement('#minigame-brief'),
  progress: requireElement('#minigame-progress'),
  hint: requireElement('#minigame-hint'),
  stage: requireElement('#minigame-stage'),
  status: requireElement('#minigame-status'),
  retry: requireElement('#minigame-retry'),
};
