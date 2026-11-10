import type { CodeEditorElements } from './code-editor';
import { requireElement } from './dom';
import type { SnakeModalElements } from './snake-modal';

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
  site: requireElement<HTMLElement>('#site'),
  popupLayer: requireElement<HTMLElement>('#popup-layer'),
  eraWipe: requireElement<HTMLElement>('#era-wipe'),
  shopTabs: requireElement<HTMLElement>('#shop-tabs'),
  shopBody: requireElement<HTMLElement>('#shop-body'),
  goalBody: requireElement<HTMLElement>('#goal-body'),
  newsList: requireElement<HTMLElement>('#news-list'),
  newsTip: requireElement<HTMLElement>('#news-tip'),
  storyOverlay: requireElement<HTMLElement>('#story-overlay'),
  storyCard: requireElement<HTMLElement>('#story-card'),
  resetOverlay: requireElement<HTMLElement>('#reset-overlay'),
  endOverlay: requireElement<HTMLElement>('#end-overlay'),
  endStats: requireElement<HTMLElement>('#end-stats'),
  snakeTitle: requireElement<HTMLElement>('#snake-title'),
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

export const snakeElements: SnakeModalElements = {
  overlay: requireElement('#snake-overlay'),
  title: elements.snakeTitle,
  brief: requireElement('#snake-brief'),
  progress: requireElement('#snake-progress'),
  canvas: requireElement<HTMLCanvasElement>('#snake-canvas'),
  status: requireElement('#snake-status'),
  pad: requireElement('#snake-pad'),
  retry: requireElement('#snake-retry'),
};
