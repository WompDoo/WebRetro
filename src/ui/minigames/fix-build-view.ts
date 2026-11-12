import { advanceFixBuild, countBrokenLinesLeft, createFixBuildGame, FIX_BUILD_MISTAKE_PENALTY_MS, MS_PER_SECOND, removeBuildLine, startFixBuild } from '../../engine';
import type { BuildLine, FixBuildGame, MinigameStatus } from '../../engine';
import { escapeHtml, pickCyclic } from '../dom';
import { plural } from './canvas';
import { BUILD_BREAK_COPY } from './fix-build-content';
import type { BrokenLineCopy, BuildBreakCopy } from './fix-build-content';
import type { MinigameView } from './types';

/** Keys 1–9, then 0 for the tenth line, the way a keyboard's number row runs. */
const LINE_KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const START_KEYS: ReadonlySet<string> = new Set(['Enter', ' ']);
const FALLBACK_LINE: BrokenLineCopy = { code: 'unknown', detail: '', story: '' };
const NO_STORY = '';
const MISTAKE_SHAKE: readonly Keyframe[] = [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }];
const MISTAKE_SHAKE_MS = 240;
const PENALTY_SECONDS = FIX_BUILD_MISTAKE_PENALTY_MS / MS_PER_SECOND;

const STATUS_TEXTS: Readonly<Record<MinigameStatus, string>> = {
  waiting: 'Run the build to see what broke. The clock starts when you do.',
  running: `Click every line that breaks the rule. Each one you get wrong costs ${PENALTY_SECONDS} s.`,
  won: 'Build green. Deploying.',
  lost: 'The deploy went out broken. The red lines are the ones you missed, and why. Try again.',
};

function describeTimeLeft(game: FixBuildGame): string {
  return `${Math.ceil(Math.max(0, game.durationMs - game.elapsedMs) / MS_PER_SECOND)} s until the deploy`;
}

/** After a loss, the broken lines still there show red: the game teaches what to look for. */
function isMissedLine(game: FixBuildGame, line: BuildLine): boolean {
  return game.status === 'lost' && line.isBroken && !line.isRemoved;
}

/** Working lines have no story: nothing happened to them. */
function pickLineCopy(copy: BuildBreakCopy, line: BuildLine): BrokenLineCopy {
  return line.isBroken ? pickCyclic(copy.broken, line.slot, FALLBACK_LINE) : { ...pickCyclic(copy.working, line.slot, FALLBACK_LINE), story: NO_STORY };
}

/** The story stays hidden until the line is removed or missed: the history is the reward, not the test. */
function renderLine(copy: BrokenLineCopy, index: number): string {
  return `<li><button type="button" class="build-line" data-build-line="${index}"><span class="build-key">${LINE_KEYS[index] ?? ''}</span><code class="build-code">${escapeHtml(copy.code)}</code><span class="build-detail">${escapeHtml(copy.detail)}</span><span class="build-story">${escapeHtml(copy.story)}</span></button></li>`;
}

/** Spot the lines that break the brief's one rule: a lookalike package, one left on version 5, a plugin nobody updates. */
export const fixBuildView: MinigameView = (stage, target, seed) => {
  let game = createFixBuildGame(target.difficulty, seed);
  const copy = BUILD_BREAK_COPY[target.framework ?? 'react'];
  const lineCopies = game.lines.map((line) => pickLineCopy(copy, line));
  const terminal = document.createElement('div');
  terminal.className = 'build-terminal';
  terminal.innerHTML = `<p class="build-command">$ ${escapeHtml(copy.command)}</p><button type="button" class="build-run">Run the build ▸</button><ol class="build-lines">${lineCopies.map(renderLine).join('')}</ol>`;
  stage.append(terminal);
  const runButton = terminal.querySelector<HTMLElement>('.build-run');
  const rows = [...terminal.querySelectorAll<HTMLElement>('[data-build-line]')];

  // The status shows or hides the lines: reading them is the game, so they appear when the clock starts.
  const render = (): void => {
    terminal.dataset['status'] = game.status;
    rows.forEach((row, index) => {
      const line = game.lines[index];
      row.classList.toggle('is-removed', line?.isRemoved === true);
      row.classList.toggle('is-missed', line !== undefined && isMissedLine(game, line));
    });
  };
  const start = (): boolean => {
    const wasWaiting = game.status === 'waiting';
    game = startFixBuild(game);
    render();
    return wasWaiting;
  };
  const shakeIfMistake = (index: number, mistakesBefore: number): void => {
    if (game.mistakes === mistakesBefore) return;
    rows[index]?.animate([...MISTAKE_SHAKE], MISTAKE_SHAKE_MS);
  };
  const remove = (index: number): boolean => {
    if (index < 0) return false;
    const mistakesBefore = game.mistakes;
    game = removeBuildLine(game, index);
    shakeIfMistake(index, mistakesBefore);
    render();
    return true;
  };
  const pressKey = (key: string): boolean => {
    if (START_KEYS.has(key)) return start();
    return remove(LINE_KEYS.slice(0, game.lines.length).indexOf(key));
  };

  runButton?.addEventListener('click', start);
  rows.forEach((row, index) => {
    row.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      remove(index);
    });
  });
  render();

  return {
    brief: copy.brief(target.featureName),
    hint: `Click or tap · keys 1–${LINE_KEYS[game.lines.length - 1] ?? ''} · Enter runs the build`,
    tick: (elapsedMs) => {
      game = advanceFixBuild(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const isUsed = pressKey(event.key);
      if (isUsed) event.preventDefault();
      return isUsed;
    },
    progress: () => `${describeTimeLeft(game)} · ${plural(countBrokenLinesLeft(game), 'broken line')} left`,
    status: () => game.status,
    statusText: () => STATUS_TEXTS[game.status],
    destroy: () => stage.replaceChildren(),
  };
};
