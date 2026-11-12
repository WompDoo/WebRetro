import { SAVE_VERSION } from './constants';
import { UPGRADE_IDS } from './content/upgrades';
import { INFECTION_MINIGAMES } from './hazards';
import { createInitialGameState } from './state';
import type { GameState, Infection, MinigameId, UpgradeId } from './types';

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
/** Saves from before the minigames have infections without a game: give them the classic one. */
function withMinigame(infection: Infection): Infection {
  const [fallback]: readonly MinigameId[] = INFECTION_MINIGAMES[infection.kind];
  return { id: infection.id, kind: infection.kind, featureId: infection.featureId, ageMs: infection.ageMs, minigameId: infection.minigameId ?? fallback };
}

/** A renamed or removed upgrade would otherwise crash the first frame. */
function isKnownUpgrade(upgradeId: UpgradeId): boolean {
  return UPGRADE_IDS.includes(upgradeId);
}

export function restoreGameState(value: unknown, fallbackSeed: number): GameState | null {
  if (!isRecord(value) || !hasCompatibleShape(value)) return null;
  const restored: GameState = { ...createInitialGameState(fallbackSeed), ...(value as Partial<GameState>) };
  const initial = createInitialGameState(fallbackSeed);
  return {
    ...restored,
    // Features added since the save was made start at level 0.
    featureLevels: { ...initial.featureLevels, ...restored.featureLevels },
    featureEarnings: { ...initial.featureEarnings, ...restored.featureEarnings },
    // Hazards added since: their first countdown, not an empty one that would spawn at once.
    hazardCountdownsMs: { ...initial.hazardCountdownsMs, ...restored.hazardCountdownsMs },
    infections: restored.infections.map(withMinigame),
    purchasedUpgradeIds: restored.purchasedUpgradeIds.filter(isKnownUpgrade),
  };
}

