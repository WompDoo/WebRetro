import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, EMPTY_LEGACY, notePlaytestUsed, recordAchievements, startNextRun } from '../src/engine';
import type { GameState, LegacyState } from '../src/engine';
import { renderAchievementsPage } from '../src/ui/render-achievements';
import { renderOptions } from '../src/ui/render-options';
import type { OptionsContext } from '../src/ui/render-options';

const SEED = 31;
const at2005 = (): GameState => createPlaytestState('web2-2005', 'end', SEED, 'react');
/** Two finished runs: Backlinks have been paid in, so the options name them. */
const legacyWith = (backlinks: number, achievements: LegacyState['achievementIds']): LegacyState => ({ ...EMPTY_LEGACY, backlinks, achievementIds: achievements, finishedRuns: 2 });
const context = (overrides: Partial<OptionsContext> = {}): OptionsContext => ({
  state: at2005(),
  legacy: legacyWith(12, ['hello-world', 'on-fire']),
  isPlaytestEnabled: false,
  ...overrides,
});

describe('playtest and achievements', () => {
  it('a run the playtest tools changed earns nothing; having them switched on changes nothing', () => {
    const played = at2005();
    assert.ok(recordAchievements(EMPTY_LEGACY, played).achievementIds.includes('web-2-0'), 'an untouched run earns');
    const touched = notePlaytestUsed(played);
    assert.equal(recordAchievements(EMPTY_LEGACY, touched), EMPTY_LEGACY);
    assert.equal(notePlaytestUsed(touched), touched, 'marked once');
  });

  it('the next run starts clean', () => {
    const next = startNextRun(EMPTY_LEGACY, SEED);
    assert.equal(next.runStats.usedPlaytest, false);
  });

  it('says so in the window instead of looking broken', () => {
    assert.match(renderAchievementsPage(notePlaytestUsed(at2005()), EMPTY_LEGACY), /This run used the playtest tools, so it doesn’t earn achievements/);
    assert.doesNotMatch(renderAchievementsPage(at2005(), EMPTY_LEGACY), /playtest tools/);
  });
});

describe('the options window', () => {
  it('has Start over, and Delete all my data saying what goes, in this player’s own numbers', () => {
    const page = renderOptions(context(), 'menu');
    assert.match(page, /data-action="open-reset">Start over…/);
    assert.match(page, /Your Backlinks, perks and achievements stay/);
    assert.match(page, /data-action="ask-delete-data">Delete all my data…/);
    assert.match(page, /2 achievements/);
    assert.doesNotMatch(page, /data-action="confirm-delete-data"/, 'one click can’t delete anything');
  });

  it('doesn’t name Backlinks or perks before the player has met them', () => {
    const firstRun = renderOptions(context({ legacy: { ...EMPTY_LEGACY, achievementIds: ['hello-world'] } }), 'menu');
    assert.match(firstRun, /Your achievements stay/);
    assert.doesNotMatch(firstRun, /Backlink|perk/);
  });

  it('asks a second time before deleting, with keeping the data first', () => {
    const page = renderOptions(context(), 'confirm-delete');
    assert.match(page, /Delete everything\?.*It can’t be undone/s);
    assert.match(page, /data-action="cancel-delete-data">Keep my data<\/button><button type="button" class="danger-button" data-action="confirm-delete-data"/);
  });

  it('shows the playtest switch only while the tools are on', () => {
    assert.doesNotMatch(renderOptions(context(), 'menu'), /Playtest tools/);
    assert.match(renderOptions(context({ isPlaytestEnabled: true }), 'menu'), /data-action="options-playtest-off">Turn off/);
  });
});
