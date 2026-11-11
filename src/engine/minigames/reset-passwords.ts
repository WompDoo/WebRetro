import { drawRandoms, interpolateRange } from '../random';
import { isMinigameOver } from './status';
import type { MinigameStatus } from './status';

/** One account from the leaked table, and how close the crackers are to its password. */
export interface CrackedAccount {
  readonly name: string;
  /** 0 just after a reset, 1 when the password is cracked. */
  readonly progress: number;
  /** How long the crackers need for this password, from a fresh reset. */
  readonly crackMs: number;
}

/**
 * Spinning plates: crackers chip away at every leaked password at once. Forcing a reset puts an account back
 * at the start. Keep all of them ahead until the crackers give up.
 */
export interface ResetPasswordsGame {
  readonly accounts: readonly CrackedAccount[];
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly resets: number;
  readonly status: MinigameStatus;
}

export const RESET_PASSWORDS_ACCOUNT_NAMES: readonly string[] = ['mel_b', 'grandma_rose', 'theo1987', 'sam.k', 'jo_shares', 'ana_p', 'rik_checks_in'];
const BASE_ACCOUNTS = 3;
const ACCOUNTS_PER_DIFFICULTY = 1;
const BASE_DURATION_MS = 10_000;
const DURATION_MS_PER_DIFFICULTY = 3_000;
const CRACK_MS_RANGE: readonly [number, number] = [2_800, 5_000];
/** Each level the crackers get this much faster. */
const CRACK_SPEEDUP_PER_DIFFICULTY = 0.85;
/** The dump has been out for a while: crackers are partway into some passwords already. */
const MAX_HEAD_START = 0.35;
const ROLLS_PER_ACCOUNT = 2;
const CRACKED = 1;

function createAccount(name: string, rolls: readonly number[], speedup: number): CrackedAccount {
  const [headStartRoll = 0, speedRoll = 0] = rolls;
  return { name, progress: headStartRoll * MAX_HEAD_START, crackMs: interpolateRange(CRACK_MS_RANGE, speedRoll) * speedup };
}

export function createResetPasswordsGame(difficulty: number, seed: number): ResetPasswordsGame {
  const extraDifficulty = difficulty - 1;
  const names = RESET_PASSWORDS_ACCOUNT_NAMES.slice(0, BASE_ACCOUNTS + ACCOUNTS_PER_DIFFICULTY * extraDifficulty);
  const draws = drawRandoms(seed, names.length * ROLLS_PER_ACCOUNT);
  const speedup = CRACK_SPEEDUP_PER_DIFFICULTY ** extraDifficulty;
  return {
    accounts: names.map((name, index) => createAccount(name, draws.values.slice(index * ROLLS_PER_ACCOUNT), speedup)),
    elapsedMs: 0,
    durationMs: BASE_DURATION_MS + DURATION_MS_PER_DIFFICULTY * extraDifficulty,
    resets: 0,
    status: 'waiting',
  };
}

export function isAccountCracked(account: CrackedAccount): boolean {
  return account.progress >= CRACKED;
}

/** A cracked password loses the game, even on the tick the crackers would have given up. */
function judge(game: ResetPasswordsGame): MinigameStatus {
  const outcomes: readonly (readonly [boolean, MinigameStatus])[] = [
    [game.accounts.some(isAccountCracked), 'lost'],
    [game.elapsedMs >= game.durationMs, 'won'],
  ];
  return outcomes.find(([applies]) => applies)?.[1] ?? 'running';
}

export function advanceResetPasswords(game: ResetPasswordsGame, elapsedMs: number): ResetPasswordsGame {
  if (game.status !== 'running') return game;
  const cracked = game.accounts.map((account) => ({ ...account, progress: account.progress + elapsedMs / account.crackMs }));
  const advanced = { ...game, accounts: cracked, elapsedMs: game.elapsedMs + elapsedMs };
  return { ...advanced, status: judge(advanced) };
}

/** Forces a new password on one account: the crackers start over on it. The first reset starts the clock. */
export function resetAccountPassword(game: ResetPasswordsGame, index: number): ResetPasswordsGame {
  if (isMinigameOver(game.status)) return game;
  const accounts = game.accounts.map((account, position) => (position === index ? { ...account, progress: 0 } : account));
  return { ...game, accounts, resets: game.resets + 1, status: 'running' };
}
