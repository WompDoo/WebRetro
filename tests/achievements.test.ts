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
  isAchievementRevealed,
  notePokedWithDevTools,
  placeAd,
  recordAchievements,
  restoreLegacy,
  TREE_IDS,
  writeCode,
} from '../src/engine';
import type { AchievementId, GameState, LegacyState } from '../src/engine';
import { renderAchievementToast } from '../src/ui/achievement-toast';
import { placeTip } from '../src/ui/badge-tooltip';
import { isDevToolsShortcut } from '../src/ui/dev-tools-watch';
import { countEarnedAchievements, countFoundSpecializations, renderAchievementsPage, renderBadgeDetail } from '../src/ui/render-achievements';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 21;
const MIN_ACHIEVEMENTS = 60;
const MAX_ACHIEVEMENTS = 100;
const testBuild = (state: GameState): GameState => ({ ...state, hazardCountdownsMs: QUIET_HAZARDS });
const at = (eraId: Parameters<typeof createPlaytestState>[0], stage: 'start' | 'end' = 'end'): GameState => testBuild(createPlaytestState(eraId, stage, SEED, 'react'));
const earnedBy = (state: GameState, legacy: LegacyState = EMPTY_LEGACY): readonly AchievementId[] => recordAchievements(legacy, state).achievementIds;
const finished = (state: GameState): GameState => ({ ...state, isGameFinished: true });
const inRun = (state: GameState, runNumber: number): GameState => ({ ...state, runNumber });

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

  it('counts pop-ups closed, and an ad placed in any era', () => {
    const withPopup = { ...at('web2-2005'), popups: [{ id: 7, variantRoll: 0, anchorX: 0, anchorY: 0 }] };
    assert.equal(closePopup(withPopup, 7).runStats.popupsClosed, 1);
    assert.equal(closePopup(withPopup, 99).runStats.popupsClosed, 0, 'no such pop-up, nothing closed');
    const rich = { ...at('web2-2005'), adCount: 0, money: 1e12 };
    assert.equal(placeAd(rich).runStats.hasPlacedAd, true);
    assert.equal(placeAd({ ...at('homepage-1997'), adCount: 0, money: 1e12 }).runStats.hasPlacedAd, true, '1997 counts too');
    assert.equal(at('web2-2005').runStats.hasPlacedAd, false);
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

  it('rewards a finished run without security, and one without a single ad', () => {
    const bare = finished({ ...at('ai-2024'), ownedDefenseIds: [], runStats: EMPTY_RUN_STATS });
    const ids = earnedBy(bare);
    assert.ok(ids.includes('security-through-obscurity'));
    assert.ok(ids.includes('ad-free-web'));
    assert.ok(!earnedBy(finished({ ...bare, runStats: { ...EMPTY_RUN_STATS, hasPlacedAd: true } })).includes('ad-free-web'));
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

  it('keeps Serial founder, the secret door, the broken combo and Hackerman secret', () => {
    (['serial-founder', 'secret-door', 'broken-combo', 'no-ads-no-problem', 'enshittification', 'hackerman'] as const).forEach((id) => assert.ok(ACHIEVEMENTS_BY_ID[id].isSecret, id));
  });

  it('notices the developer tools once: Hackerman', () => {
    const poked = notePokedWithDevTools(at('web2-2005'));
    assert.ok(earnedBy(poked).includes('hackerman'));
    assert.equal(notePokedWithDevTools(poked), poked, 'twice changes nothing');
    assert.ok(!earnedBy(at('web2-2005')).includes('hackerman'));
  });
});

describe('what the window gives away', () => {
  const revealed = (id: AchievementId, state: GameState, legacy: LegacyState = EMPTY_LEGACY): boolean => isAchievementRevealed(id, state, legacy);

  it('shows the start from the start, and an era’s mechanics once a run reaches it', () => {
    const first1997 = at('homepage-1997', 'start');
    assert.ok(revealed('hello-world', first1997));
    assert.ok(!revealed('fail-whale', first1997), '2011 is a long way off');
    assert.ok(revealed('fail-whale', at('social-2011', 'start')));
    assert.ok(revealed('fail-whale', inRun(first1997, 2), { ...EMPTY_LEGACY, achievementIds: ['social-web'] }), 'reached in an earlier run');
    assert.ok(!revealed('fail-whale', inRun(first1997, 2)), 'a second run that never got there');
  });

  it('keeps the tree and the second run’s things hidden until the second run, the crash’s until the third', () => {
    const first = at('web2-2005');
    (['specialist', 'serial-founder', 'make-it-pop', 'link-farm', 'second-site'] as const).forEach((id) => {
      assert.ok(!revealed(id, first), id);
      assert.ok(revealed(id, inRun(first, 2)), id);
    });
    assert.ok(!revealed('hamster-dance', inRun(first, 2)));
    assert.ok(revealed('hamster-dance', inRun(first, 3)));
    assert.ok(revealed('specialist', first, { ...EMPTY_LEGACY, finishedRuns: 1 }), 'after a finished run');
  });

  it('always shows an earned one', () => {
    assert.ok(revealed('specialist', at('homepage-1997', 'start'), { ...EMPTY_LEGACY, achievementIds: ['specialist'] }));
  });
});

describe('the achievements window', () => {
  it('is a row of square tiles per kind, with counts, and the specializations found', () => {
    const legacy: LegacyState = { ...EMPTY_LEGACY, achievementIds: ['on-fire', 'web-2-0'], foundSpecializationIds: ['photos'] };
    const page = renderAchievementsPage(inRun(at('web2-2005'), 2), legacy);
    assert.equal(countEarnedAchievements(legacy), 2);
    assert.equal(countFoundSpecializations(legacy), 1);
    assert.match(page, new RegExp(`2 / ${ACHIEVEMENT_IDS.length} earned`));
    assert.equal(page.match(/class="badge-row"/g)?.length, ACHIEVEMENT_CATEGORIES.length + 1);
    assert.match(page, /class="badge is-earned" data-action="achievement-detail" data-id="on-fire"/);
    assert.match(page, /data-id="spec:photos"><span class="badge-icon" aria-hidden="true">📷<\/span>/);
  });

  it('keeps secrets: a secret tile is a "?" until earned, a secret specialization isn’t there until found', () => {
    const secondRun = inRun(at('web2-2005'), 2);
    const page = renderAchievementsPage(secondRun, EMPTY_LEGACY);
    assert.match(page, /class="badge is-secret" data-action="achievement-detail" data-id="serial-founder"><span class="badge-icon" aria-hidden="true">\?<\/span><span class="badge-tip" hidden><b>Secret<\/b> \?\?\?/);
    assert.doesNotMatch(page, /data-id="spec:wiki"/);
    assert.match(renderAchievementsPage(secondRun, { ...EMPTY_LEGACY, foundSpecializationIds: ['wiki'] }), /data-id="spec:wiki"/);
  });

  it('blurs what isn’t revealed yet: in a first run the tree is "???" and there is no collection', () => {
    const page = renderAchievementsPage(at('web2-2005'), EMPTY_LEGACY);
    assert.match(page, /class="badge is-hidden" data-action="achievement-detail" data-id="specialist">.*?<b>Not yet revealed<\/b>/);
    assert.match(page, /<h3 class="badge-row-title">\?\?\? <span>0\/10<\/span>/);
    assert.equal(page.match(/<h3 class="badge-row-title">\?\?\?/g)?.length, 1, 'only the tree: Tech is no spoiler, its tiles are');
    assert.doesNotMatch(page, /Specializations found/);
    assert.doesNotMatch(page, /Specialist/);
  });

  it('says what a tapped tile is in the bar, for phones without hover', () => {
    const state = inRun(at('web2-2005'), 2);
    assert.match(renderBadgeDetail(state, EMPTY_LEGACY, 'bobby-tables'), /<b>Little Bobby Tables<\/b>.*<i>Not yet<\/i>/);
    assert.match(renderBadgeDetail(at('homepage-1997', 'start'), EMPTY_LEGACY, 'bobby-tables'), /<b>Not yet revealed<\/b>/);
    assert.match(renderBadgeDetail(state, { ...EMPTY_LEGACY, foundSpecializationIds: ['video'] }, 'spec:video'), /<b>Video site<\/b>.*Found · 2005/);
    assert.match(renderBadgeDetail(state, EMPTY_LEGACY, 'spec:wiki'), /Not found yet/);
  });

  it('puts the hover tip above the tile, below it when there’s no room, and never off the screen', () => {
    const screen = { width: 1000, height: 800 };
    const tip = { width: 200, height: 60 };
    assert.deepEqual(placeTip({ left: 400, top: 300, bottom: 340, width: 40 }, tip, screen), { left: 320, top: 232 });
    assert.deepEqual(placeTip({ left: 400, top: 40, bottom: 80, width: 40 }, tip, screen), { left: 320, top: 88 }, 'the top row: below');
    assert.equal(placeTip({ left: 2, top: 300, bottom: 340, width: 40 }, tip, screen).left, 8, 'the left end');
    assert.equal(placeTip({ left: 980, top: 300, bottom: 340, width: 40 }, tip, screen).left, 792, 'the right end');
  });
});

describe('the pop-up', () => {
  it('names the achievement, says when it was a secret, and opens the window', () => {
    const toast = renderAchievementToast('on-fire');
    assert.match(toast, /data-action="open-achievements"/);
    assert.match(toast, /🔥.*Achievement unlocked.*On fire/);
    assert.match(renderAchievementToast('hackerman'), /Secret achievement unlocked.*Hackerman/);
  });
});

describe('the developer tools', () => {
  const keys = (code: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) => ({ code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers });

  it('knows their shortcuts on Windows, Linux and a Mac, and nothing else', () => {
    assert.ok(isDevToolsShortcut(keys('F12')));
    assert.ok(isDevToolsShortcut(keys('KeyI', { ctrlKey: true, shiftKey: true })));
    assert.ok(isDevToolsShortcut(keys('KeyJ', { metaKey: true, altKey: true })));
    assert.ok(isDevToolsShortcut(keys('KeyC', { ctrlKey: true, shiftKey: true })));
    assert.ok(!isDevToolsShortcut(keys('KeyI', { ctrlKey: true })), 'Ctrl+I is italics');
    assert.ok(!isDevToolsShortcut(keys('KeyI', { shiftKey: true })), 'a capital I');
    assert.ok(!isDevToolsShortcut(keys('KeyX', { ctrlKey: true, shiftKey: true })));
  });
});
