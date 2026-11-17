import type { Edition, GameState } from '../engine';

/**
 * Two games from one script: the classic one, and a test build where your site becomes something (routes and site
 * colors). The build writes the edition into each page's meta tag, so the same code serves both, on the same origin
 * and side by side.
 */
export const EDITIONS: readonly Edition[] = ['classic', 'webspecialization'];

export const EDITION_META_NAME = 'game-edition';
const STORAGE_PREFIX = 'under-construction:';

function isEdition(value: string): value is Edition {
  return (EDITIONS as readonly string[]).includes(value);
}

/** The page's edition, from its meta tag's content. Anything else, or none, is the classic game. */
export function parseEdition(content: string | null): Edition {
  const value = content ?? '';
  return isEdition(value) ? value : 'classic';
}

/** The two pages share an origin, so each keeps its own saves: the classic keys as they always were, the test build's apart. */
export function editionStorageKey(edition: Edition, key: string): string {
  return edition === 'classic' ? key : key.replace(STORAGE_PREFIX, `${STORAGE_PREFIX}${edition}:`);
}

/** Every game this page starts, restores or jumps to belongs to its edition. */
export function withEdition(game: GameState, edition: Edition): GameState {
  return game.edition === edition ? game : { ...game, edition };
}

export function isTestBuild(edition: Edition): boolean {
  return edition !== 'classic';
}
