import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS_BY_ID,
  createPlaytestState,
  EMPTY_LEGACY,
  restoreLegacy,
  recordAchievements,
  TREE_IDS,
} from '../src/engine';
import type { GameState, LegacyState } from '../src/engine';
import { countEarnedAchievements, countFoundSpecializations, renderAchievementsPage } from '../src/ui/render-achievements';

const SEED = 21;
const testBuild = (state: GameState): GameState => ({ ...state, edition: 'webspecialization' });
const at2005 = (): GameState => testBuild(createPlaytestState('web2-2005', 'end', SEED, 'react'));
const earned = (legacy: LegacyState): readonly string[] => legacy.achievementIds;

describe('achievements', () => {
  it('are earned as the game runs, and recorded once', () => {
    const recorded = recordAchievements(EMPTY_LEGACY, at2005());
    assert.ok(earned(recorded).includes('first-visitor'));
    assert.ok(earned(recorded).includes('web-2-0'));
    assert.equal(recordAchievements(recorded, at2005()), recorded, 'nothing new, the same legacy');
  });

  it('stay earned in a later run that hasn’t done it yet', () => {
    const recorded = recordAchievements(EMPTY_LEGACY, at2005());
    const fresh = testBuild(createPlaytestState('homepage-1997', 'start', SEED, 'react'));
    assert.ok(earned(recordAchievements(recorded, fresh)).includes('web-2-0'));
  });

  it('are a test-build system: the classic game records none', () => {
    assert.equal(recordAchievements(EMPTY_LEGACY, { ...at2005(), edition: 'classic' }), EMPTY_LEGACY);
  });

  it('count what a run did: fire, spikes, cleanups, a stretch without ads', () => {
    const busy = { ...at2005(), eraStats: { ...at2005().eraStats, onFireStarts: 1, spikesRiddenOut: 1, cleanedByKind: { virus: 6, spam: 4 }, adFreeMs: 600_000 } };
    const ids = earned(recordAchievements(EMPTY_LEGACY, busy));
    ['on-fire', 'rode-it-out', 'clean-sweep', 'no-ads-no-problem'].forEach((id) => assert.ok(ids.includes(id), id));
  });

  it('count the tree: a specialization, one from every era, a secret one, a broken combo', () => {
    const stacked = { ...at2005(), specializationIds: ['photos', 'social', 'stories', 'ai-studio'] as const, unlockedSpecializationIds: ['wiki'] as const };
    const ids = earned(recordAchievements(EMPTY_LEGACY, stacked));
    ['specialist', 'full-stack', 'secret-door'].forEach((id) => assert.ok(ids.includes(id), id));
    assert.ok(!ids.includes('broken-combo'), 'every one grew from the one before');
    const broken = { ...at2005(), specializationIds: ['video', 'stories'] as const };
    assert.ok(earned(recordAchievements(EMPTY_LEGACY, broken)).includes('broken-combo'));
  });

  it('count across runs: finished runs, Serial founder, every specialization found', () => {
    const legacy: LegacyState = { ...EMPTY_LEGACY, finishedRuns: 1, perkLevels: { ...EMPTY_LEGACY.perkLevels, 'serial-founder': 1 }, foundSpecializationIds: TREE_IDS };
    const ids = earned(recordAchievements(legacy, at2005()));
    ['the-whole-web', 'serial-founder', 'collector'].forEach((id) => assert.ok(ids.includes(id), id));
  });

  it('survive a reload, and forget ids that no longer exist', () => {
    const saved = { ...EMPTY_LEGACY, achievementIds: ['on-fire', 'retired-achievement'] };
    assert.deepEqual(restoreLegacy(JSON.parse(JSON.stringify(saved))).achievementIds, ['on-fire']);
  });

  it('every one has a name, an icon and a description', () => {
    ACHIEVEMENT_IDS.forEach((id) => {
      const achievement = ACHIEVEMENTS_BY_ID[id];
      assert.ok(achievement.name.length > 0 && achievement.icon.length > 0 && achievement.description.length > 0, id);
    });
  });
});

describe('the achievements page', () => {
  it('counts feats and specializations found', () => {
    const legacy: LegacyState = { ...EMPTY_LEGACY, achievementIds: ['on-fire', 'web-2-0'], foundSpecializationIds: ['photos'] };
    const page = renderAchievementsPage(at2005(), legacy);
    assert.equal(countEarnedAchievements(legacy), 2);
    assert.equal(countFoundSpecializations(legacy), 1);
    assert.match(page, new RegExp(`Feats <span class="achievements-count">2 / ${ACHIEVEMENT_IDS.length}</span>`));
    assert.match(page, new RegExp(`Specializations found <span class="achievements-count">1 / ${TREE_IDS.length}</span>`));
    assert.match(page, /collection-card is-found"><span class="collection-icon" aria-hidden="true">📷<\/span><b>Photo sharing<\/b>/);
  });

  it('keeps secrets: a secret feat shows ??? until earned, a secret specialization isn’t listed until found', () => {
    const page = renderAchievementsPage(at2005(), EMPTY_LEGACY);
    assert.match(page, /<b>Secret<\/b><span>\?\?\?<\/span>/);
    assert.doesNotMatch(page, /No ads, no problem/);
    assert.doesNotMatch(page, /Wiki/);
    const found = renderAchievementsPage(at2005(), { ...EMPTY_LEGACY, foundSpecializationIds: ['wiki'], achievementIds: ['no-ads-no-problem'] });
    assert.match(found, /Wiki/);
    assert.match(found, /No ads, no problem/);
  });
});
