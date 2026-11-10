import { isMinigameOver } from '../../engine';
import type { EraId, MinigameId } from '../../engine';
import { setTextIfChanged } from '../dom';
import { ERA_PRESENTATION } from '../presentation';
import { backupRestoreView } from './backup-restore-view';
import { firewallView } from './firewall-view';
import { snakeView } from './snake-view';
import { spamSortView } from './spam-sort-view';
import type { MinigameSession, MinigameTarget, MinigameView } from './types';
import { virusScanView } from './virus-scan-view';

export interface MinigameModalElements {
  readonly overlay: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly progress: HTMLElement;
  readonly hint: HTMLElement;
  readonly stage: HTMLElement;
  readonly status: HTMLElement;
  readonly retry: HTMLElement;
}

export interface MinigameModalCallbacks {
  /** Null when the infection is gone (an antivirus cleaned it, or the game was reset). */
  readonly findTarget: (infectionId: number) => MinigameTarget | null;
  readonly onWin: (infectionId: number) => void;
}

export interface MinigameModal {
  readonly open: (infectionId: number) => void;
  readonly close: () => void;
  readonly retry: () => void;
  readonly isOpen: () => boolean;
  /** True when the minigame used the key, so the rest of the game should ignore it. */
  readonly handleKey: (event: KeyboardEvent) => boolean;
}

const VIEWS: Readonly<Record<MinigameId, MinigameView>> = {
  snake: snakeView,
  'virus-scan': virusScanView,
  firewall: firewallView,
  'spam-sort': spamSortView,
  'backup-restore': backupRestoreView,
};

const OTHER_TITLES: Readonly<Record<Exclude<MinigameId, 'snake' | 'virus-scan' | 'firewall'>, string>> = {
  'spam-sort': 'moderate_comments.php',
  'backup-restore': 'mysql_restore.sh',
};

const CLOSE_AFTER_WIN_MS = 900;
/** A background tab can hand over a huge frame; games should never jump that far at once. */
const MAX_FRAME_MS = 100;
const SEED_RANGE = 2 ** 31;

function isVirusGame(minigameId: MinigameId): minigameId is 'snake' | 'virus-scan' | 'firewall' {
  return minigameId === 'snake' || minigameId === 'virus-scan' || minigameId === 'firewall';
}

function titleFor(minigameId: MinigameId, eraId: EraId): string {
  return isVirusGame(minigameId) ? ERA_PRESENTATION[eraId].antivirusTitle : OTHER_TITLES[minigameId];
}

/** One modal for every minigame: it opens, runs the clock, reports the outcome and offers a retry. */
export function createMinigameModal(elements: MinigameModalElements, callbacks: MinigameModalCallbacks): MinigameModal {
  let session: MinigameSession | null = null;
  let infectionId: number | null = null;
  let frameRequest: number | null = null;
  let lastFrameAt = 0;
  let hasReportedWin = false;

  const stopFrames = (): void => {
    if (frameRequest !== null) window.cancelAnimationFrame(frameRequest);
    frameRequest = null;
  };

  const close = (): void => {
    stopFrames();
    session?.destroy();
    session = null;
    infectionId = null;
    elements.overlay.hidden = true;
  };

  const renderHud = (current: MinigameSession): void => {
    setTextIfChanged(elements.progress, current.progress());
    setTextIfChanged(elements.status, current.statusText());
    elements.status.dataset['status'] = current.status();
    elements.retry.hidden = current.status() !== 'lost';
  };

  const reportWin = (id: number): void => {
    if (hasReportedWin) return;
    hasReportedWin = true;
    callbacks.onWin(id);
    window.setTimeout(close, CLOSE_AFTER_WIN_MS);
  };

  const frame = (now: number): void => {
    if (session === null || infectionId === null) return;
    if (callbacks.findTarget(infectionId) === null && !hasReportedWin) {
      close();
      return;
    }
    session.tick(Math.min(MAX_FRAME_MS, now - lastFrameAt));
    lastFrameAt = now;
    renderHud(session);
    if (session.status() === 'won') reportWin(infectionId);
    frameRequest = isMinigameOver(session.status()) ? null : window.requestAnimationFrame(frame);
  };

  const startAttempt = (): void => {
    const target = infectionId === null ? null : callbacks.findTarget(infectionId);
    if (target === null) {
      close();
      return;
    }
    stopFrames();
    session?.destroy();
    hasReportedWin = false;
    elements.title.textContent = titleFor(target.minigameId, target.eraId);
    session = VIEWS[target.minigameId](elements.stage, target, Math.floor(Math.random() * SEED_RANGE));
    elements.brief.textContent = session.brief;
    elements.hint.textContent = session.hint;
    renderHud(session);
    lastFrameAt = performance.now();
    frameRequest = window.requestAnimationFrame(frame);
  };

  const handleKey = (event: KeyboardEvent): boolean => {
    if (session === null) return false;
    if (event.key !== 'Escape') return session.handleKey(event);
    close();
    return true;
  };

  return {
    open: (id: number) => {
      infectionId = id;
      elements.overlay.hidden = false;
      startAttempt();
    },
    close,
    retry: startAttempt,
    isOpen: () => session !== null,
    handleKey,
  };
}
