import { ACHIEVEMENTS_BY_ID } from '../engine';
import type { AchievementId } from '../engine';
import { escapeHtml } from './dom';

/**
 * An achievement pops up mid-game, the way a console does it: a medal slides up from the bottom middle of the screen,
 * opens into a card with the name, then what you did slides in under it; it holds, closes and drops away. Several
 * earned at once queue up and play one at a time. Clicking one opens the achievements window.
 */

const SLIDE_MS = 320;
const OPEN_MS = 420;
/** The name on its own first, long enough to read; then what you did. */
const NAME_MS = 1_500;
const DESCRIBED_MS = 3_800;
const BETWEEN_MS = 250;

export function renderAchievementToast(id: AchievementId): string {
  const achievement = ACHIEVEMENTS_BY_ID[id];
  const kicker = achievement.isSecret ? 'Secret achievement unlocked' : 'Achievement unlocked';
  return `<button type="button" class="toast-card" data-action="open-achievements"><span class="toast-icon" aria-hidden="true">${achievement.icon}</span><span class="toast-text"><span class="toast-kicker">🏆 ${kicker}</span><b class="toast-name">${escapeHtml(achievement.name)}</b><span class="toast-description">${escapeHtml(achievement.description)}</span></span></button>`;
}

export interface AchievementToaster {
  readonly announce: (ids: readonly AchievementId[]) => void;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

async function playToast(host: HTMLElement, id: AchievementId): Promise<void> {
  host.innerHTML = renderAchievementToast(id);
  host.hidden = false;
  // One frame to lay it out below the screen, so the slide up animates.
  await wait(0);
  host.classList.add('is-in');
  await wait(SLIDE_MS);
  host.classList.add('is-open');
  await wait(OPEN_MS + NAME_MS);
  host.classList.add('is-described');
  await wait(DESCRIBED_MS);
  host.classList.remove('is-open', 'is-described');
  await wait(OPEN_MS);
  host.classList.remove('is-in');
  await wait(SLIDE_MS + BETWEEN_MS);
  host.hidden = true;
}

export function createAchievementToaster(host: HTMLElement): AchievementToaster {
  const queue: AchievementId[] = [];
  let isPlaying = false;

  const playQueue = async (): Promise<void> => {
    isPlaying = true;
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) await playToast(host, next);
    isPlaying = false;
  };

  return {
    announce: (ids) => {
      queue.push(...ids);
      if (!isPlaying && queue.length > 0) void playQueue();
    },
  };
}
