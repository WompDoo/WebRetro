import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS_BY_ID,
  advanceSimulation,
  bankHandTyped,
  closePopup,
  createPlaytestState,
  EMPTY_LEGACY,
  EMPTY_RUN_STATS,
  placeAd,
  recordAchievements,
  restoreLegacy,
  TREE_IDS,
  writeCode,
} from '../src/engine';
import type { AchievementId, GameState, LegacyState } from '../src/engine';
import { countEarnedAchievements, countFoundSpecializations, renderAchievementsPage, renderBadgeDetail } from '../src/ui/render-achievements';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 21;
const MIN_ACHIEVEMENTS = 60;
const MAX_ACHIEVEMENTS = 100;
const testBuild = (state: GameState): GameState => ({ ...state, edition: 'webspecialization', hazardCountdownsMs: QUIET_HAZARDS });
const at = (eraId: Parameters<typeof createPlaytestState>[0], stage: 'start' | 'end' = 'end'): GameState => testBuild(createPlaytestState(eraId, stage, SEED, 'react'));
const earnedBy = (state: GameState, legacy: LegacyState = EMPTY_LEGACY): readonly AchievementId[] => recordAchievements(legacy, state).achievementIds;
const finished = (state: GameState): GameState => ({ ...state, isGameFinished: true });

describe('achievements', () => {
  it('are between 60 and 100, each with a category, a name, an icon and a description', () => {
    assert.ok(ACHIEVEMENT_IDS.length >= MIN_ACHIEVEMENTS && ACHIEVEMENT_IDS.length <= MAX_ACHIEVEMENTS, String(ACHIEVEMENT_IDS.length));
    ACHIEVEMENT_IDS.forEach((id) => {
      const achievement = ACHIEVEMENTS_BY_ID[id];
      assert.ok(ACHIEVEMENT_CATEGORIES.includes(achievement.category), id);
      assert.ok(achievement.name.length > 0 && achievement.icon.length > 0 && achievement.description.length > 0, id);
    });
  });

  it('are earned as the game runs, recorded once, and kept in a later run', () => {
    const recorded = recordAchievements(EMPTY_LEGACY, at('web2-2005'));
    assert.ok(recorded.achievementIds.includes('first-visitor'));
    assert.ok(recorded.achievementIds.includes('web-2-0'));
    assert.equal(recordAchievements(recorded, at('web2-2005')), recorded, 'nothing new, the same legacy');
    assert.ok(recordAchievements(recorded, at('homepage-1997', 'start')).achievementIds.includes('web-2-0'));
  });

  it('are a test-build system: the classic game records none', () => {
    assert.equal(recordAchievements(EMPTY_LEGACY, { ...at('web2-2005'), edition: 'classic' }), EMPTY_LEGACY);
  });

  it('survive a reload, and forget ids that no longer exist', () => {
    const saved = { ...EMPTY_LEGACY, achievementIds: ['on-fire', 'retired-achievement'], handTypedKeystrokes: 1_234 };
    const restored = restoreLegacy(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(restored.achievementIds, ['on-fire']);
    assert.equal(restored.handTypedKeystrokes, 1_234);
  });
});

describe('typing by hand', () => {
  const keystroke = (state: GameState): GameState => writeCode({ ...state, hasPendingBug: false }).state;

  it('counts a keystroke a tick: a script typing faster counts as one person', () => {
    const typed = keystroke(keystroke({ ...at('web2-2005'), msSinceKeystroke: 1_000 }));
    assert.equal(typed.runStats.handTypedKeystrokes, 1, 'the second came in the same tick');
    const nextTick = advanceSimulation(typed, 100, 'live').state;
    assert.equal(keystroke(nextTick).runStats.handTypedKeystrokes, 2);
  });

  it('doesn’t count 2024: the AI writes that code', () => {
    assert.equal(keystroke({ ...at('ai-2024'), msSinceKeystroke: 1_000 }).runStats.handTypedKeystrokes, 0);
  });

  it('adds up across runs: a run banks its count once, when it ends', () => {
    const run = { ...at('web2-2005'), runStats: { ...EMPTY_RUN_STATS, handTypedKeystrokes: 600 } };
    const banked = bankHandTyped({ ...EMPTY_LEGACY, handTypedKeystrokes: 500 }, run);
    assert.equal(banked.legacy.handTypedKeystrokes, 1_100);
    assert.equal(banked.state.runStats.handTypedKeystrokes, 0);
    assert.equal(bankHandTyped(banked.legacy, banked.state).legacy, banked.legacy, 'banking twice adds nothing');
    assert.ok(earnedBy(run, { ...EMPTY_LEGACY, handTypedKeystrokes: 500 }).includes('typist'), 'before banking, the two count together');
  });
});

describe('what a run did', () => {
  it('counts trouble and the cleanups after it', () => {
    const busy = { ...at('social-2011'), runStats: { ...EMPTY_RUN_STATS, hazards: { 'sql-injection': 1, 'password-leak': 1 }, cleanups: 100, scamsFallenFor: 1 } };
    const ids = earnedBy(busy);
    (['bobby-tables', 'pwned', 'firefighter', 'free-mp3-player'] as const).forEach((id) => assert.ok(ids.includes(id), id));
  });

  it('counts pop-ups closed, and an ad placed after 1997', () => {
    const withPopup = { ...at('web2-2005'), popups: [{ id: 7, variantRoll: 0, anchorX: 0, anchorY: 0 }] };
    assert.equal(closePopup(withPopup, 7).runStats.popupsClosed, 1);
    assert.equal(closePopup(withPopup, 99).runStats.popupsClosed, 0, 'no such pop-up, nothing closed');
    const rich = { ...at('web2-2005'), adCount: 0, money: 1e12 };
    assert.equal(placeAd(rich).runStats.placedAdAfter1997, true);
    assert.equal(placeAd({ ...at('homepage-1997'), adCount: 0, money: 1e12 }).runStats.placedAdAfter1997, false);
  });

  it('remembers the longest time away', () => {
    const away = advanceSimulation(at('web2-2005'), 8 * 3_600_000, 'offline').state;
    assert.ok(earnedBy(away).includes('touch-grass'));
  });

  it('rewards finished runs with each framework, and all three across runs', () => {
    ['react', 'angular', 'vue'].forEach((framework) => {
      const run = finished(testBuild(createPlaytestState('ai-2024', 'end', SEED, framework as 'react')));
      assert.ok(earnedBy(run).includes(`${framework}-developer` as AchievementId), framework);
    });
    const veteran = { ...EMPTY_LEGACY, achievementIds: ['react-developer', 'angular-developer', 'vue-developer'] as const };
    assert.ok(earnedBy(at('web2-2005'), veteran).includes('framework-wars-veteran'));
    assert.ok(earnedBy(finished(at('social-2011'))).includes('jquery-forever'));
  });

  it('rewards a finished run without security, and one without an ad after 1997', () => {
    const bare = finished({ ...at('ai-2024'), ownedDefenseIds: [], runStats: EMPTY_RUN_STATS });
    const ids = earnedBy(bare);
    assert.ok(ids.includes('security-through-obscurity'));
    assert.ok(ids.includes('ad-free-web'));
    assert.ok(!earnedBy(finished({ ...bare, runStats: { ...EMPTY_RUN_STATS, placedAdAfter1997: true } })).includes('ad-free-web'));
  });

  it('counts the tree: a stack, a secret door, a broken combo, Serial founder, a pivot to video', () => {
    const stacked = { ...at('ai-2024'), specializationIds: ['photos', 'social', 'stories', 'ai-studio'] as const, unlockedSpecializationIds: ['wiki'] as const };
    const ids = earnedBy(stacked);
    (['specialist', 'full-stack', 'secret-door'] as const).forEach((id) => assert.ok(ids.includes(id), id));
    assert.ok(!ids.includes('broken-combo'), 'every one grew from the one before');
    assert.ok(earnedBy({ ...at('platform-2018'), specializationIds: ['video', 'stories'] }).includes('broken-combo'));
    assert.ok(earnedBy({ ...at('platform-2018'), specializationIds: ['blog-network', 'news', 'streaming-service'] }).includes('pivot-to-video'));
    const founder: LegacyState = { ...EMPTY_LEGACY, perkLevels: { ...EMPTY_LEGACY.perkLevels, 'serial-founder': 1 }, foundSpecializationIds: TREE_IDS };
    ['serial-founder', 'collector', 'explorer'].forEach((id) => assert.ok(earnedBy(at('web2-2005'), founder).includes(id as AchievementId), id));
  });

  it('keeps Serial founder, the secret door and the broken combo secret', () => {
    (['serial-founder', 'secret-door', 'broken-combo', 'no-ads-no-problem', 'enshittification'] as const).forEach((id) => assert.ok(ACHIEVEMENTS_BY_ID[id].isSecret, id));
  });
});

describe('the achievements window', () => {
  it('is a row of square tiles per kind, with counts, and the specializations found', () => {
    const legacy: LegacyState = { ...EMPTY_LEGACY, achievementIds: ['on-fire', 'web-2-0'], foundSpecializationIds: ['photos'] };
    const page = renderAchievementsPage(at('web2-2005'), legacy);
    assert.equal(countEarnedAchievements(legacy), 2);
    assert.equal(countFoundSpecializations(legacy), 1);
    assert.match(page, new RegExp(`2 / ${ACHIEVEMENT_IDS.length} earned`));
    assert.equal(page.match(/class="badge-row"/g)?.length, ACHIEVEMENT_CATEGORIES.length + 1);
    assert.match(page, /class="badge is-earned" data-action="achievement-detail" data-id="on-fire"/);
    assert.match(page, /data-id="spec:photos"><span class="badge-icon" aria-hidden="true">📷<\/span>/);
  });

  it('keeps secrets: a secret tile is a "?" until earned, a secret specialization isn’t there until found', () => {
    const page = renderAchievementsPage(at('web2-2005'), EMPTY_LEGACY);
    assert.match(page, /data-id="serial-founder"><span class="badge-icon" aria-hidden="true">\?<\/span><span class="badge-tip" role="tooltip"><b>Secret<\/b> \?\?\?/);
    assert.doesNotMatch(page, /data-id="spec:wiki"/);
    assert.match(renderAchievementsPage(at('web2-2005'), { ...EMPTY_LEGACY, foundSpecializationIds: ['wiki'] }), /data-id="spec:wiki"/);
  });

  it('says what a tapped tile is in the bar, for phones without hover', () => {
    assert.match(renderBadgeDetail(EMPTY_LEGACY, 'bobby-tables'), /<b>Little Bobby Tables<\/b>.*<i>Not yet<\/i>/);
    assert.match(renderBadgeDetail({ ...EMPTY_LEGACY, foundSpecializationIds: ['video'] }, 'spec:video'), /<b>Video site<\/b>.*Found · 2005/);
    assert.match(renderBadgeDetail(EMPTY_LEGACY, 'spec:wiki'), /Not found yet/);
  });
});
