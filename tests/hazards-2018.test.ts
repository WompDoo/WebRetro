import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceFixBuild,
  advanceHazards,
  calculateAdValuePerAd,
  calculatePrivacyFine,
  chooseConsentBanner,
  countBrokenLinesLeft,
  createFixBuildGame,
  createInitialGameState,
  FIX_BUILD_MISTAKE_PENALTY_MS,
  formatMoney,
  removeBuildLine,
  restoreGameState,
  startFixBuild,
} from '../src/engine';
import type { FixBuildGame, GameState, HazardKind, UpgradeId } from '../src/engine';
import { BUILD_BREAK_COPY } from '../src/ui/minigames/fix-build-content';
import type { BuildLineCopy } from '../src/ui/minigames/fix-build-content';
import { findPopupCopy, renderPopup } from '../src/ui/render-popups';
import { calculateSiteSignature, renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 7;
const FRAME_MS = 50;
const NOW = 0;
const MAX_DIFFICULTY = 3;
const VARIANT_SLOTS = 1_000;
const base = createInitialGameState(SEED);
const in2018 = (skills: readonly UpgradeId[] = []): GameState => ({
  ...base,
  eraId: 'platform-2018',
  hazardCountdownsMs: QUIET_HAZARDS,
  money: 1_000_000,
  purchasedUpgradeIds: ['learn-php', 'learn-bootstrap', 'responsive-design', ...skills],
  featureLevels: { ...base.featureLevels, blog: 10, stories: 4, 'pricing-table': 2 },
  adCount: 6,
});
const dueNow = (state: GameState, kind: HazardKind): GameState => ({ ...state, hazardCountdownsMs: { ...QUIET_HAZARDS, [kind]: 1 } });
const dueIn = (state: GameState, kind: HazardKind, remainingMs: number): GameState => ({ ...state, hazardCountdownsMs: { ...QUIET_HAZARDS, [kind]: remainingMs } });

/** Removes every line of one kind, in order. */
const removeAll = (game: FixBuildGame, isBroken: boolean): FixBuildGame =>
  game.lines.reduce((current, line, index) => (line.isBroken === isBroken ? removeBuildLine(current, index) : current), game);

describe('2018: Fix the build', () => {
  it('starts with the lines hidden and the clock stopped: reading them is the game', () => {
    const waiting = createFixBuildGame(1, SEED);
    assert.equal(waiting.status, 'waiting');
    assert.equal(advanceFixBuild(waiting, 60_000).elapsedMs, 0);
    assert.deepEqual(removeBuildLine(waiting, 0), waiting);
  });

  it('shows more lines, more of them broken, at each level, and gives more time to read them', () => {
    const easy = createFixBuildGame(1, SEED);
    const hard = createFixBuildGame(MAX_DIFFICULTY, SEED);
    assert.deepEqual([countBrokenLinesLeft(easy), easy.lines.length], [2, 6]);
    assert.deepEqual([countBrokenLinesLeft(hard), hard.lines.length], [4, 10]);
    assert.ok(hard.durationMs > easy.durationMs);
  });

  it('never shows the same line twice', () => {
    const { lines } = createFixBuildGame(MAX_DIFFICULTY, SEED);
    const keys = lines.map((line) => `${line.isBroken}:${line.slot}`);
    assert.equal(new Set(keys).size, keys.length);
  });

  it('wins once every broken line is gone', () => {
    assert.equal(removeAll(startFixBuild(createFixBuildGame(2, SEED)), true).status, 'won');
  });

  it('keeps a working line you click, and charges time for putting it back', () => {
    const running = startFixBuild(createFixBuildGame(1, SEED));
    const index = running.lines.findIndex((line) => !line.isBroken);
    const clicked = removeBuildLine(running, index);
    assert.equal(clicked.elapsedMs, FIX_BUILD_MISTAKE_PENALTY_MS);
    assert.equal(clicked.mistakes, 1);
    assert.equal(clicked.lines[index]?.isRemoved, false);
  });

  it('loses when the deploy goes out first', () => {
    const running = startFixBuild(createFixBuildGame(1, SEED));
    assert.equal(advanceFixBuild(running, running.durationMs).status, 'lost');
  });

  it('runs out the clock for anyone who clicks every working line: reading beats clicking everything', () => {
    [1, 2, MAX_DIFFICULTY].forEach((difficulty) => {
      assert.equal(removeAll(startFixBuild(createFixBuildGame(difficulty, SEED)), false).status, 'lost');
    });
  });
});

describe('2018: Fix the build needs no web knowledge', () => {
  const MOST_BROKEN = 4;
  const MOST_WORKING = 6;
  const MONTHS_PER_UNIT: Readonly<Record<string, number>> = { day: 1 / 30, week: 1 / 4, month: 1, year: 12 };
  const MONTHS_PER_YEAR = 12;
  const monthsAgo = (line: BuildLineCopy): number => {
    const [, count = '0', unit = 'year'] = /(\d+) (day|week|month|year)/.exec(line.detail) ?? [];
    return Number(count) * (MONTHS_PER_UNIT[unit] ?? MONTHS_PER_YEAR);
  };
  const installedName = (line: BuildLineCopy): string => /installed (\S+?)@/.exec(line.detail)?.[1] ?? '';

  it('has enough lines of each kind for the hardest level, and no name in both pools', () => {
    Object.values(BUILD_BREAK_COPY).forEach((copy) => {
      assert.ok(copy.broken.length >= MOST_BROKEN);
      assert.ok(copy.working.length >= MOST_WORKING);
      const brokenNames = new Set(copy.broken.map((line) => line.code));
      assert.ok(copy.working.every((line) => !brokenNames.has(line.code)));
    });
  });

  it('shows on every line the one fact its rule is about', () => {
    const { react, angular, vue } = BUILD_BREAK_COPY;
    assert.ok(react.broken.every((line) => installedName(line) !== line.code));
    assert.ok(react.working.every((line) => installedName(line) === line.code));
    assert.ok(angular.broken.every((line) => line.detail.startsWith('5.')));
    assert.ok(angular.working.every((line) => line.detail.startsWith('6.')));
    assert.ok(vue.broken.every((line) => monthsAgo(line) > MONTHS_PER_YEAR));
    assert.ok(vue.working.every((line) => monthsAgo(line) < MONTHS_PER_YEAR));
  });

  it('has a story for every broken line, the history you learn by removing it', () => {
    Object.values(BUILD_BREAK_COPY).forEach((copy) => assert.ok(copy.broken.every((line) => line.story.length > 0)));
  });
});

describe('2018: broken builds', () => {
  it('breaks once a framework is picked, as a Fix the build infection', () => {
    assert.equal(advanceHazards(dueNow(in2018(), 'broken-build'), FRAME_MS).state.infections.length, 0);
    const [broken] = advanceHazards(dueNow(in2018(['learn-react']), 'broken-build'), FRAME_MS).state.infections;
    assert.equal(broken?.kind, 'broken-build');
    assert.equal(broken?.minigameId, 'fix-build');
  });

  it('never breaks in front of visitors once a CI pipeline builds every change first', () => {
    const withCi = dueNow(in2018(['learn-react', 'ci-pipeline']), 'broken-build');
    assert.equal(advanceHazards(withCi, FRAME_MS).state.infections.length, 0);
  });

  it('breaks React’s builds most often and Vue’s least', () => {
    const remaining = (framework: UpgradeId): number => advanceHazards(dueIn(in2018([framework]), 'broken-build', 100_000), 10_000).state.hazardCountdownsMs['broken-build'];
    assert.ok(remaining('learn-react') < remaining('learn-angular'));
    assert.ok(remaining('learn-angular') < remaining('learn-vue'));
  });
});

describe('2018: the GDPR', () => {
  it('fines a site whose ads track visitors without asking, and the fine can put you in debt', () => {
    const broke = { ...in2018(['learn-react']), money: 0 };
    const fined = advanceHazards(dueNow(broke, 'privacy-fine'), FRAME_MS).state;
    assert.ok(fined.money < 0);
    assert.ok(calculatePrivacyFine(broke) > 0);
  });

  it('never fines an honest banner, and fines a dark pattern less often but harder', () => {
    const honest = chooseConsentBanner(in2018(['learn-react']), 'honest');
    assert.equal(advanceHazards(dueNow(honest, 'privacy-fine'), FRAME_MS).state.money, honest.money);
    const elapsed = (state: GameState): number => 100_000 - advanceHazards(dueIn(state, 'privacy-fine', 100_000), 10_000).state.hazardCountdownsMs['privacy-fine'];
    const none = in2018(['learn-react']);
    const dark = chooseConsentBanner(none, 'dark-pattern');
    assert.ok(elapsed(dark) < elapsed(none));
    assert.ok(calculatePrivacyFine(dark) > calculatePrivacyFine(none));
  });

  it('makes ads pay less the more honestly the banner asks', () => {
    const none = in2018();
    const adValue = (state: GameState): number => calculateAdValuePerAd(state);
    assert.ok(adValue(chooseConsentBanner(none, 'honest')) < adValue(chooseConsentBanner(none, 'dark-pattern')));
    assert.ok(adValue(chooseConsentBanner(none, 'dark-pattern')) < adValue(none));
  });

  it('only applies from 2018: no fines and no banner choice before', () => {
    const in2011: GameState = { ...in2018(), eraId: 'social-2011' };
    assert.equal(advanceHazards(dueNow(in2011, 'privacy-fine'), FRAME_MS).state.money, in2011.money);
    assert.equal(chooseConsentBanner(in2011, 'honest').consentBanner, 'none');
  });

  it('shows the banner on the page, on the Bootstrap site and the rewritten one alike', () => {
    const count = (html: string): number => html.split('class="cookie-banner').length - 1;
    assert.equal(count(renderSite(in2018(['learn-vue']), NOW)), 0);
    assert.equal(count(renderSite(chooseConsentBanner(in2018(['learn-vue']), 'honest'), NOW)), 1);
    assert.match(renderSite(chooseConsentBanner(in2018(), 'dark-pattern'), NOW), /Accept all/);
  });

  it('re-renders the page when the banner changes: the signature is the page’s cache key', () => {
    const none = in2018(['learn-vue']);
    assert.notEqual(calculateSiteSignature(chooseConsentBanner(none, 'honest')), calculateSiteSignature(none));
  });

  it('writes money below zero as "-$1.20B", not "$-1.20B"', () => {
    assert.equal(formatMoney(-1_200_000_000), '-$1.20B');
    assert.equal(formatMoney(-5), '-$5');
  });
});

describe('2018: interstitials', () => {
  const withPopup = (variantRoll: number): GameState => ({ ...in2018(['learn-react']), popups: [{ id: 3, variantRoll, anchorX: 0.5, anchorY: 0.5 }] });
  const interstitialRoll = Array.from({ length: VARIANT_SLOTS }, (_, slot) => slot / VARIANT_SLOTS).find(
    (roll) => findPopupCopy(withPopup(roll), 3)?.design === 'interstitial',
  );

  it('fills the screen, counts down to Skip, and lets the × in early: the timing rides along as CSS properties', () => {
    assert.ok(interstitialRoll !== undefined);
    const html = renderPopup(withPopup(interstitialRoll), { id: 3, variantRoll: interstitialRoll, anchorX: 0.5, anchorY: 0.5 });
    assert.match(html, /popup--interstitial/);
    assert.match(html, /--skip-seconds:5;--close-after:2s/);
    assert.match(html, /class="interstitial-skip" data-action="close-popup"/);
    assert.match(html, /class="popup-close" data-action="close-popup"/);
  });
});

describe('saves from before 2018’s hazards', () => {
  it('give new hazards their first countdown, not an empty one that would spawn at once', () => {
    const { 'broken-build': _broken, 'privacy-fine': _fine, ...older } = base.hazardCountdownsMs;
    const restored = restoreGameState({ ...base, hazardCountdownsMs: older }, SEED);
    assert.equal(restored?.hazardCountdownsMs['broken-build'], base.hazardCountdownsMs['broken-build']);
    assert.equal(restored?.consentBanner, 'none');
  });
});
