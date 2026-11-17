import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialGameState, restoreGameState, SAVE_VERSION } from '../src/engine';
import { editionStorageKey, isTestBuild, parseEdition, withEdition } from '../src/ui/edition';

describe('two games from one script', () => {
  it('reads the page’s edition, and anything else is the classic game', () => {
    assert.equal(parseEdition('webspecialization'), 'webspecialization');
    assert.equal(parseEdition('classic'), 'classic');
    assert.equal(parseEdition(null), 'classic');
    assert.equal(parseEdition('__GAME_EDITION__'), 'classic', 'a page built without the tag filled in');
  });

  it('keeps the classic saves where they always were, and the test build’s apart', () => {
    assert.equal(editionStorageKey('classic', 'under-construction:save'), 'under-construction:save');
    assert.equal(editionStorageKey('webspecialization', 'under-construction:save'), 'under-construction:webspecialization:save');
    assert.equal(editionStorageKey('webspecialization', 'under-construction:legacy'), 'under-construction:webspecialization:legacy');
  });

  it('stamps a game with its page’s edition', () => {
    const game = createInitialGameState(1);
    assert.equal(game.edition, 'classic');
    assert.equal(withEdition(game, 'webspecialization').edition, 'webspecialization');
    assert.equal(withEdition(game, 'classic'), game, 'unchanged when it already is');
  });

  it('restores a save from before editions as the classic game', () => {
    const { edition: _edition, ...old } = createInitialGameState(1);
    assert.equal(restoreGameState({ ...old, saveVersion: SAVE_VERSION }, 2)?.edition, 'classic');
  });

  it('marks only the test build as a test', () => {
    assert.equal(isTestBuild('classic'), false);
    assert.equal(isTestBuild('webspecialization'), true);
  });
});
