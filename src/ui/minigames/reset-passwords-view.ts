import { advanceResetPasswords, createResetPasswordsGame, isAccountCracked, MS_PER_SECOND, resetAccountPassword } from '../../engine';
import type { CrackedAccount, MinigameStatus, ResetPasswordsGame } from '../../engine';
import { escapeHtml } from '../dom';
import { plural } from './canvas';
import type { MinigameView } from './types';

const NUMBER_KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7'];
const PERCENT = 100;
/** Past this the bar turns red: reset this one next. */
const DANGER_PROGRESS = 0.7;

const STATUS_TEXTS: Readonly<Record<MinigameStatus, (game: ResetPasswordsGame) => string>> = {
  waiting: () => 'Click an account to reset its password. The crackers start when you do.',
  running: () => 'Reset whichever bar is fullest.',
  won: () => 'The crackers gave up. Every account is safe.',
  lost: (game) => `They cracked ${game.accounts.filter(isAccountCracked).map((account) => account.name).join(' and ')}. Try again.`,
};

function renderRow(account: CrackedAccount, index: number): string {
  return `<button type="button" class="crack-row" data-crack-row="${index}"><span class="crack-name">${escapeHtml(account.name)}</span><span class="crack-bar"><span class="crack-fill"></span></span><span class="crack-key">${index + 1}</span></button>`;
}

/** Spinning plates: crackers chip at every leaked password; a click forces a reset and puts that one back at zero. */
export const resetPasswordsView: MinigameView = (stage, target, seed) => {
  let game = createResetPasswordsGame(target.difficulty, seed);
  const list = document.createElement('div');
  list.className = 'crack-list';
  list.innerHTML = game.accounts.map(renderRow).join('');
  stage.append(list);
  const rows = [...list.querySelectorAll<HTMLElement>('[data-crack-row]')];

  const render = (): void => {
    // Rows are made from the accounts and never change in number, so every row has its account.
    rows.forEach((row, index) => {
      const progress = Math.min(1, game.accounts[index]?.progress ?? 0);
      row.style.setProperty('--crack-progress', `${progress * PERCENT}%`);
      row.classList.toggle('is-danger', progress >= DANGER_PROGRESS);
    });
  };
  const reset = (index: number): void => {
    game = resetAccountPassword(game, index);
    render();
  };
  rows.forEach((row, index) => {
    row.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      reset(index);
    });
  });
  render();

  return {
    brief: `Crackers are working through your ${target.featureName}'s leaked passwords. Click an account to force a reset before its bar fills, and keep all ${plural(game.accounts.length, 'account')} safe until they give up.`,
    hint: `Click or tap · keys 1–${game.accounts.length}`,
    tick: (elapsedMs) => {
      game = advanceResetPasswords(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const index = NUMBER_KEYS.slice(0, game.accounts.length).indexOf(event.key);
      if (index < 0) return false;
      event.preventDefault();
      reset(index);
      return true;
    },
    progress: () => `${Math.ceil(Math.max(0, game.durationMs - game.elapsedMs) / MS_PER_SECOND)} s until they give up`,
    status: () => game.status,
    statusText: () => STATUS_TEXTS[game.status](game),
    destroy: () => stage.replaceChildren(),
  };
};

