import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialGameState, restoreGameState, SAVE_VERSION } from '../src/engine';
import { adoptTestBuildData, findTestBuildKey } from '../src/ui/persistence';
import type { KeyValueStore } from '../src/ui/persistence';

/** A stand-in for the page's localStorage. */
function createStorage(entries: Readonly<Record<string, string>>): KeyValueStore & { readonly entries: Map<string, string> } {
  const map = new Map(Object.entries(entries));
  return {
    entries: map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe('one game: the test build’s saves move to the game’s own keys', () => {
  it('knows where the test build kept them', () => {
    assert.equal(findTestBuildKey('under-construction:save'), 'under-construction:webspecialization:save');
  });

  it('moves the save, the legacy and the settings over, once, ahead of an older save there', () => {
    const storage = createStorage({
      'under-construction:save': 'classic save',
      'under-construction:webspecialization:save': 'test build save',
      'under-construction:webspecialization:legacy': 'test build legacy',
      'someone-else:key': 'left alone',
    });
    adoptTestBuildData(storage);
    assert.equal(storage.getItem('under-construction:save'), 'test build save', 'where the game has been played lately');
    assert.equal(storage.getItem('under-construction:legacy'), 'test build legacy');
    assert.equal(storage.getItem('under-construction:webspecialization:save'), null);
    assert.equal(storage.getItem('someone-else:key'), 'left alone');
    const after = new Map(storage.entries);
    adoptTestBuildData(storage);
    assert.deepEqual(storage.entries, after, 'a second time changes nothing');
  });

  it('leaves a game that only ever had the main save as it was', () => {
    const storage = createStorage({ 'under-construction:save': 'only save' });
    adoptTestBuildData(storage);
    assert.equal(storage.getItem('under-construction:save'), 'only save');
  });

  it('restores a save from when there were two games, without the edition it carried', () => {
    const old = { ...createInitialGameState(1), edition: 'classic', saveVersion: SAVE_VERSION };
    const restored = restoreGameState(JSON.parse(JSON.stringify(old)), 2);
    assert.ok(restored !== null);
    assert.equal('edition' in restored, false);
  });
});
