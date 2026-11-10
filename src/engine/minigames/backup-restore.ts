import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

export interface Backup {
  readonly id: number;
  /** Relative to the attack: negative means before it. */
  readonly minutesFromAttack: number;
}

export type BackupMistake = 'after-attack' | 'too-old';

/** Pick the newest backup from before the attack: later ones contain it, older ones lose good data. */
export interface BackupRestoreGame {
  /** Minute of today when the table was dropped. */
  readonly attackMinute: number;
  /** In the order they are listed, which is not the order they were made. */
  readonly backups: readonly Backup[];
  readonly correctBackupId: number;
  readonly mistakes: number;
  readonly lastMistake: BackupMistake | null;
  readonly status: MinigameStatus;
}

const BASE_BACKUPS = 2;
const EARLIEST_ATTACK_MINUTE = 10 * 60;
const ATTACK_WINDOW_MINUTES = 10 * 60;
const MIN_GAP_MINUTES = 5;
/** Harder means backups made closer together, so the times are easier to misread. */
const SPACING_MINUTES_BY_DIFFICULTY: readonly number[] = [180, 90, 40];
const FALLBACK_SPACING_MINUTES = 40;
const ROLLS_FOR_ATTACK = 1;
const ROLLS_PER_BACKUP = 2;
export const BACKUP_RESTORE_MAX_MISTAKES = 2;

function spacingFor(difficulty: number): number {
  return SPACING_MINUTES_BY_DIFFICULTY[difficulty - 1] ?? FALLBACK_SPACING_MINUTES;
}

/** Backup 0 is the right one, just before the attack; the last one is just after it; the rest are older. */
function backupOffset(index: number, count: number, spacing: number, jitterRoll: number): number {
  const jitter = MIN_GAP_MINUTES + Math.floor(jitterRoll * (spacing / 2));
  return index === count - 1 ? jitter : -(index * spacing + jitter);
}

export function createBackupRestoreGame(difficulty: number, seed: number): BackupRestoreGame {
  const count = BASE_BACKUPS + difficulty;
  const spacing = spacingFor(difficulty);
  const rolls = drawRandoms(seed, ROLLS_FOR_ATTACK + count * ROLLS_PER_BACKUP).values;
  const backups = Array.from({ length: count }, (_, index) => ({
    id: index,
    minutesFromAttack: backupOffset(index, count, spacing, rolls[ROLLS_FOR_ATTACK + index * ROLLS_PER_BACKUP] ?? 0),
    order: rolls[ROLLS_FOR_ATTACK + index * ROLLS_PER_BACKUP + 1] ?? 0,
  }));
  const shuffled = [...backups].sort((first, second) => first.order - second.order).map(({ id, minutesFromAttack }) => ({ id, minutesFromAttack }));
  return {
    attackMinute: EARLIEST_ATTACK_MINUTE + Math.floor((rolls[0] ?? 0) * ATTACK_WINDOW_MINUTES),
    backups: shuffled,
    correctBackupId: 0,
    mistakes: 0,
    lastMistake: null,
    status: 'running',
  };
}

function describeMistake(backup: Backup): BackupMistake {
  return backup.minutesFromAttack > 0 ? 'after-attack' : 'too-old';
}

function recordMistake(game: BackupRestoreGame, backup: Backup): BackupRestoreGame {
  const mistakes = game.mistakes + 1;
  return { ...game, mistakes, lastMistake: describeMistake(backup), status: mistakes >= BACKUP_RESTORE_MAX_MISTAKES ? 'lost' : 'running' };
}

export function chooseBackup(game: BackupRestoreGame, backupId: number): BackupRestoreGame {
  const backup = game.backups.find((candidate) => candidate.id === backupId);
  if (backup === undefined || game.status !== 'running') return game;
  return backupId === game.correctBackupId ? { ...game, lastMistake: null, status: 'won' } : recordMistake(game, backup);
}
