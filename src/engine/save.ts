import { SAVE_VERSION } from './constants';
import { createInitialGameState } from './state';
import type { GameState } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasCompatibleShape(value: Record<string, unknown>): boolean {
  return (
    value['saveVersion'] === SAVE_VERSION &&
    typeof value['money'] === 'number' &&
    typeof value['eraId'] === 'string' &&
    isRecord(value['featureLevels'])
  );
}

/**
 * Accepts a parsed save of the current version and fills any missing fields from a fresh game.
 * Anything else returns null, and the caller starts a new game.
 */
export function restoreGameState(value: unknown, fallbackSeed: number): GameState | null {
  if (!isRecord(value) || !hasCompatibleShape(value)) return null;
  const restored: GameState = { ...createInitialGameState(fallbackSeed), ...(value as Partial<GameState>) };
  return restored;
}

