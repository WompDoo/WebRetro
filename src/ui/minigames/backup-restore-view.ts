import { BACKUP_RESTORE_MAX_MISTAKES, chooseBackup, createBackupRestoreGame } from '../../engine';
import type { Backup, BackupMistake, BackupRestoreGame } from '../../engine';
import { escapeHtml } from '../dom';
import type { MinigameView } from './types';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const NUMBER_KEYS: readonly string[] = ['1', '2', '3', '4', '5'];

const MISTAKE_TEXT: Readonly<Record<BackupMistake, string>> = {
  'after-attack': 'That backup was made after the attack: it already has the DROP TABLE in it.',
  'too-old': 'That one is clean, but there’s a newer backup from before the attack. You’d lose good posts.',
};

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Minutes from today's midnight; negative means yesterday. */
function wrapToDay(minute: number): number {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function formatTime(minute: number): string {
  const wrapped = wrapToDay(minute);
  return `${twoDigits(Math.floor(wrapped / MINUTES_PER_HOUR))}:${twoDigits(wrapped % MINUTES_PER_HOUR)}`;
}

/** "Today 14:32" or "Yesterday 23:10". Backups never go back further than a day. */
function formatClock(minute: number): string {
  return `${minute < 0 ? 'Yesterday' : 'Today'} ${formatTime(minute)}`;
}

function backupMinute(game: BackupRestoreGame, backup: Backup): number {
  return game.attackMinute + backup.minutesFromAttack;
}

function renderBackup(game: BackupRestoreGame, backup: Backup, index: number, wrongIds: ReadonlySet<number>): string {
  const minute = backupMinute(game, backup);
  const fileStamp = formatTime(minute).replace(':', '');
  const wrong = wrongIds.has(backup.id) ? ' is-wrong' : '';
  return `<li><button type="button" class="restore-backup${wrong}" data-backup-id="${backup.id}"><span>${index + 1}. backup_${fileStamp}.sql</span><span class="restore-time">${escapeHtml(formatClock(minute))}</span></button></li>`;
}

function describeStatus(game: BackupRestoreGame): string {
  if (game.status === 'won') return 'Restored! Everything from before the attack is back.';
  if (game.status === 'lost') return 'Too many wrong backups. The table is still broken.';
  return game.lastMistake === null ? 'Pick the newest backup from before the attack.' : MISTAKE_TEXT[game.lastMistake];
}

/** Read the timestamps: the right backup is the newest one made before the table was dropped. */
export const backupRestoreView: MinigameView = (stage, target, seed) => {
  let game = createBackupRestoreGame(target.difficulty, seed);
  const wrongIds = new Set<number>();
  const alert = document.createElement('p');
  alert.className = 'restore-alert';
  alert.innerHTML = `<b>DROP TABLE</b> ran on your ${escapeHtml(target.featureName)} at <b>${escapeHtml(formatClock(game.attackMinute))}</b>.`;
  const list = document.createElement('ol');
  list.className = 'restore-list';
  stage.append(alert, list);

  const render = (): void => {
    list.innerHTML = game.backups.map((backup, index) => renderBackup(game, backup, index, wrongIds)).join('');
  };
  const choose = (backupId: number): void => {
    const before = game.mistakes;
    game = chooseBackup(game, backupId);
    if (game.mistakes > before) wrongIds.add(backupId);
    render();
  };
  list.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-backup-id]') : null;
    if (button !== null) choose(Number(button.dataset['backupId']));
  });
  render();

  return {
    brief: `Restore your ${target.featureName} from the right backup. ${BACKUP_RESTORE_MAX_MISTAKES} wrong picks and the data is gone.`,
    hint: `Click or tap · keys 1–${game.backups.length}`,
    tick: () => undefined,
    handleKey: (event) => {
      const backup = game.backups[NUMBER_KEYS.indexOf(event.key)];
      if (backup === undefined) return false;
      event.preventDefault();
      choose(backup.id);
      return true;
    },
    progress: () => `${game.mistakes} / ${BACKUP_RESTORE_MAX_MISTAKES} wrong picks`,
    status: () => game.status,
    statusText: () => describeStatus(game),
    destroy: () => stage.replaceChildren(),
  };
};
