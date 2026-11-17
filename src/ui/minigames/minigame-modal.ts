import { isMinigameOver } from '../../engine';
import type { AnyMinigameId, EraId, MinigameStatus } from '../../engine';
import { setTextIfChanged } from '../dom';
import { ERA_PRESENTATION } from '../presentation';
import { backupRestoreView } from './backup-restore-view';
import { crossTrafficView } from './cross-traffic-view';
import { firewallView } from './firewall-view';
import { codeEntryView } from './code-entry-view';
import { launchWindowView } from './launch-window-view';
import { fixBuildView } from './fix-build-view';
import { snakeView } from './snake-view';
import { resetPasswordsView } from './reset-passwords-view';
import { rerouteTrafficView } from './reroute-traffic-view';
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
  /** Lost, or left once the clock was running. An infection waits for a retry; an offer goes. */
  readonly onLose: (infectionId: number) => void;
}

export interface MinigameModal {
  readonly open: (infectionId: number) => void;
  readonly close: () => void;
  /** The player walks away: mid-attempt, that's a loss. */
  readonly leave: () => void;
  readonly retry: () => void;
  readonly isOpen: () => boolean;
  /** True when the minigame used the key, so the rest of the game should ignore it. */
  readonly handleKey: (event: KeyboardEvent) => boolean;
}

const VIEWS: Readonly<Record<AnyMinigameId, MinigameView>> = {
  snake: snakeView,
  'virus-scan': virusScanView,
  firewall: firewallView,
  'spam-sort': spamSortView,
  'backup-restore': backupRestoreView,
  'reset-passwords': resetPasswordsView,
  'reroute-traffic': rerouteTrafficView,
  'cross-traffic': crossTrafficView,
  'fix-build': fixBuildView,
  'code-entry': codeEntryView,
  'launch-window': launchWindowView,
};

const OTHER_TITLES: Readonly<Record<Exclude<AnyMinigameId, 'snake' | 'virus-scan' | 'firewall'>, string>> = {
  'spam-sort': 'moderate_comments.php',
  'backup-restore': 'mysql_restore.sh',
  'reset-passwords': 'Admin · Users · Force password reset',
  'reroute-traffic': 'Cloud console · Reroute traffic',
  'cross-traffic': 'ssh admin@server · rate limiting',
  'fix-build': 'Terminal · build failed',
  'code-entry': 'Sponsor deal · enter the code',
  'launch-window': 'Launch day · hit the window',
};

const CLOSE_AFTER_WIN_MS = 900;
/** Long enough to read why it's gone. */
const CLOSE_AFTER_LOSS_MS = 1_800;
/** A background tab can hand over a huge frame; games should never jump that far at once. */
const MAX_FRAME_MS = 100;
const SEED_RANGE = 2 ** 31;

function isVirusGame(minigameId: AnyMinigameId): minigameId is 'snake' | 'virus-scan' | 'firewall' {
  return minigameId === 'snake' || minigameId === 'virus-scan' || minigameId === 'firewall';
}

function titleFor(minigameId: AnyMinigameId, eraId: EraId): string {
  return isVirusGame(minigameId) ? ERA_PRESENTATION[eraId].antivirusTitle : OTHER_TITLES[minigameId];
}

/** One modal for every minigame: it opens, runs the clock, reports the outcome and offers a retry. */
export function createMinigameModal(elements: MinigameModalElements, callbacks: MinigameModalCallbacks): MinigameModal {
  let session: MinigameSession | null = null;
  let infectionId: number | null = null;
  let frameRequest: number | null = null;
  let lastFrameAt = 0;
  let hasReportedOutcome = false;

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
    if (hasReportedOutcome) return;
    hasReportedOutcome = true;
    callbacks.onWin(id);
    window.setTimeout(close, CLOSE_AFTER_WIN_MS);
  };

  /** A loss that takes the target with it (an offer) leaves nothing to retry: the modal says so and closes. */
  const reportLoss = (id: number): void => {
    if (hasReportedOutcome) return;
    hasReportedOutcome = true;
    callbacks.onLose(id);
    const isGone = callbacks.findTarget(id) === null;
    elements.retry.hidden = isGone;
    if (isGone) window.setTimeout(close, CLOSE_AFTER_LOSS_MS);
  };

  const ignoreOutcome = (): void => undefined;
  const outcomeReports: Readonly<Record<MinigameStatus, (id: number) => void>> = { waiting: ignoreOutcome, running: ignoreOutcome, won: reportWin, lost: reportLoss };

  const frame = (now: number): void => {
    if (session === null || infectionId === null) return;
    if (callbacks.findTarget(infectionId) === null && !hasReportedOutcome) {
      close();
      return;
    }
    session.tick(Math.min(MAX_FRAME_MS, now - lastFrameAt));
    lastFrameAt = now;
    renderHud(session);
    outcomeReports[session.status()](infectionId);
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
    hasReportedOutcome = false;
    elements.title.textContent = titleFor(target.minigameId, target.eraId);
    // Red for trouble, gold for an offer: the shell says which before the brief does.
    elements.overlay.dataset['minigame'] = target.minigameId;
    session = VIEWS[target.minigameId](elements.stage, target, Math.floor(Math.random() * SEED_RANGE));
    elements.brief.textContent = session.brief;
    elements.hint.textContent = session.hint;
    renderHud(session);
    lastFrameAt = performance.now();
    frameRequest = window.requestAnimationFrame(frame);
  };

  /** Walking away from a running attempt is losing it: otherwise a fumbled offer could be dodged and tried again. */
  const leave = (): void => {
    if (session?.status() === 'running' && infectionId !== null) reportLoss(infectionId);
    close();
  };

  const handleKey = (event: KeyboardEvent): boolean => {
    if (session === null) return false;
    if (event.key !== 'Escape') return session.handleKey(event);
    leave();
    return true;
  };

  return {
    open: (id: number) => {
      infectionId = id;
      elements.overlay.hidden = false;
      startAttempt();
    },
    close,
    leave,
    retry: startAttempt,
    isOpen: () => session !== null,
    handleKey,
  };
}
