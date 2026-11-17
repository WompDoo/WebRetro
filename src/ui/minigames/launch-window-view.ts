import { findCurrentStage, launchWindowStatus, pressLaunch, startLaunchWindow, tickLaunchWindow } from '../../engine';
import type { EraId, LaunchWindow, MinigameStatus } from '../../engine';
import { escapeHtml } from '../dom';
import type { MinigameView } from './types';

/**
 * Launch day, era by era: the same three beats (ship it, put it live, tell people) in each era's words. A marker
 * sweeps across the bar; press inside the green window. Space, Enter or a tap, so it plays the same on a phone.
 */
interface LaunchCopy {
  readonly brief: string;
  readonly stages: readonly [string, string, string];
}

const LAUNCHES: Readonly<Record<EraId, LaunchCopy>> = {
  'homepage-1997': { brief: 'The new page is ready. Upload it, tell the webring, and email everyone you know.', stages: ['Upload by FTP', 'Tell the webring', 'Email everyone'] },
  'crash-2000': { brief: 'One last launch before the money runs out. Make it count.', stages: ['Upload by FTP', 'Brief the investors', 'Press release'] },
  'web2-2005': { brief: 'The redesign is done. Commit it, put it live, and blog about it.', stages: ['svn commit', 'Upload to the server', 'Blog about it'] },
  'social-2011': { brief: 'Launch day. Push it, deploy it, and post it everywhere.', stages: ['git push', 'Deploy', 'Post it everywhere'] },
  'platform-2018': { brief: 'The big release. The pipeline is green, the press is waiting.', stages: ['CI passes', 'Deploy to the cluster', 'Press release'] },
  'ai-2024': { brief: 'The agent says it’s ready. Ship it before it changes its mind.', stages: ['Agent says LGTM', 'Deploy', 'Launch on every feed'] },
};

const STATUS_TEXTS: Readonly<Record<MinigameStatus, string>> = {
  waiting: 'Press when the marker is in the green.',
  running: 'A miss starts the stage over.',
  won: 'Launched! Here come the visitors.',
  lost: 'Out of time: the launch slipped to next week.',
};

const LAUNCH_KEYS = new Set([' ', 'Enter']);
const PERCENT = 100;
const HIT_FLASH: readonly Keyframe[] = [{ boxShadow: '0 0 0 0 rgba(59, 209, 111, 0.9)' }, { boxShadow: '0 0 0 14px rgba(59, 209, 111, 0)' }];
const MISS_SHAKE: readonly Keyframe[] = [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }];
const FEEDBACK_MS = 260;

function renderStages(stages: readonly string[]): string {
  return stages.map((label, index) => `<li class="launch-stage" data-stage="${index}">${escapeHtml(label)}</li>`).join('');
}

export const launchWindowView: MinigameView = (stage, target, seed) => {
  const copy = LAUNCHES[target.eraId];
  let game: LaunchWindow = startLaunchWindow(seed);
  const box = document.createElement('div');
  box.className = 'launch';
  box.innerHTML = `<ol class="launch-stages">${renderStages(copy.stages)}</ol>
    <div class="launch-bar" data-launch-press><span class="launch-window"></span><span class="launch-marker"></span></div>
    <button type="button" class="launch-button" data-launch-press tabindex="-1">Launch</button>
    <div class="code-timer"><i></i></div>`;
  stage.append(box);
  const bar = box.querySelector<HTMLElement>('.launch-bar');
  const windowZone = box.querySelector<HTMLElement>('.launch-window');
  const marker = box.querySelector<HTMLElement>('.launch-marker');
  const timer = box.querySelector<HTMLElement>('.code-timer i');
  const stageItems = [...box.querySelectorAll<HTMLElement>('.launch-stage')];

  const render = (): void => {
    const current = findCurrentStage(game);
    if (current !== null) {
      windowZone?.style.setProperty('left', `${current.windowStart * PERCENT}%`);
      windowZone?.style.setProperty('width', `${current.windowWidth * PERCENT}%`);
    }
    marker?.style.setProperty('left', `${game.position * PERCENT}%`);
    timer?.style.setProperty('width', `${(1 - game.elapsedMs / game.limitMs) * PERCENT}%`);
    stageItems.forEach((item, index) => {
      item.classList.toggle('is-done', index < game.stageIndex);
      item.classList.toggle('is-current', index === game.stageIndex);
    });
    box.dataset['status'] = launchWindowStatus(game);
  };

  /** A hit flashes green; a miss shakes the bar. Either way the marker starts the stage from the left. */
  const press = (): void => {
    const before = game;
    game = pressLaunch(game);
    const isHit = game.stageIndex > before.stageIndex;
    const isMiss = game.misses > before.misses;
    if (isHit) bar?.animate([...HIT_FLASH], FEEDBACK_MS);
    if (isMiss) bar?.animate([...MISS_SHAKE], FEEDBACK_MS);
    render();
  };

  // Pointer, not click: a tap lands the moment the finger does, and Enter on the button can't count twice.
  box.addEventListener('pointerdown', (event) => {
    const isPress = event.target instanceof HTMLElement && event.target.closest('[data-launch-press]') !== null;
    if (!isPress) return;
    event.preventDefault();
    press();
  });
  render();

  return {
    brief: copy.brief,
    hint: 'Space, Enter or tap. Each stage is faster, with a smaller window.',
    tick: (elapsedMs) => {
      game = tickLaunchWindow(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      if (!LAUNCH_KEYS.has(event.key) || event.repeat) return false;
      press();
      return true;
    },
    progress: () => `${Math.min(game.stageIndex, game.stages.length)}/${game.stages.length} stages`,
    status: () => launchWindowStatus(game),
    statusText: () => STATUS_TEXTS[launchWindowStatus(game)],
    destroy: () => box.remove(),
  };
};
