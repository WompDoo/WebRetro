import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanSiteName,
  createInitialGameState,
  createPlaytestState,
  DEFAULT_SITE_NAME,
  dropVowels,
  isValidSiteName,
  MAX_SITE_NAME_LENGTH,
  nameSite,
  restoreGameState,
  toSiteSlug,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildBrowserTitle, buildSiteUrl } from '../src/ui/browser-chrome';
import { INTRO_TYPING_MS, pickRandomSiteName, RANDOM_SITE_NAMES, revealIntroLines, UPLOAD_MESSAGES } from '../src/ui/intro-script';
import { findPopupCopy, renderPopup } from '../src/ui/render-popups';
import { renderSite } from '../src/ui/sites';
import { fillSiteName, fillSiteNameText, siteBrand } from '../src/ui/sites/site-context';
import { buildEditorSource, mainEditorFile } from '../src/ui/skill-code';

const SEED = 3;
const NOW = 0;
const VARIANT_SLOTS = 1_000;
const named = (name: string, skills: readonly UpgradeId[] = []): GameState => ({
  ...nameSite(createInitialGameState(SEED), name),
  purchasedUpgradeIds: skills,
});

describe('naming the site: what a name may be', () => {
  it('keeps letters, digits, spaces and a little punctuation, and nothing that could be markup', () => {
    assert.equal(cleanSiteName('  Kevin’s   Kool Page!! '), 'Kevin’s Kool Page!!');
    assert.equal(cleanSiteName('<img src=x onerror=alert(1)>'), 'img srcx onerroralert1');
    assert.equal(cleanSiteName('Café Ünïcode'), 'Café Ünïcode');
  });

  it('cuts a long name to the limit', () => {
    assert.equal(cleanSiteName('A'.repeat(MAX_SITE_NAME_LENGTH * 2)).length, MAX_SITE_NAME_LENGTH);
  });

  it('needs a letter or a digit: an empty or all-punctuation name leaves the site as it was', () => {
    assert.ok(!isValidSiteName('!!! ...'));
    assert.ok(!isValidSiteName('   '));
    assert.equal(nameSite(createInitialGameState(SEED), '!!!').siteName, DEFAULT_SITE_NAME);
    assert.equal(nameSite(createInitialGameState(SEED), 'Surf City').siteName, 'Surf City');
  });
});

describe('naming the site: the forms a name takes', () => {
  it('goes into an address without spaces, punctuation or accents', () => {
    assert.equal(toSiteSlug('Kevin’s Kool Page'), 'kevinskoolpage');
    assert.equal(toSiteSlug('Café Olé'), 'cafeole');
    assert.equal(toSiteSlug(DEFAULT_SITE_NAME), 'myhomepage');
  });

  it('falls back to the default address when nothing in the name can go in one', () => {
    assert.equal(toSiteSlug('Привет'), 'myhomepage');
  });

  it('drops its vowels the Web 2.0 way, keeping the first letter and never leaving too little', () => {
    assert.equal(dropVowels('myhomepage'), 'myhmpg');
    assert.equal(dropVowels('kevinskoolpage'), 'kvnsklpg');
    assert.equal(dropVowels('oddball'), 'oddbll');
    assert.equal(dropVowels('aoi'), 'aoi');
  });

  it('is the brand from 2005 on, without vowels once you’ve learned to drop them', () => {
    assert.equal(siteBrand(named('Planet Pixel')), 'planetpixel');
    assert.equal(siteBrand(named('Planet Pixel', ['drop-vowels'])), 'plntpxl');
  });
});

describe('naming the site: everywhere it shows', () => {
  it('fills the copy written before you named it: escaped for HTML, as it is for plain text', () => {
    const state = named('Tom & Jerry’s');
    assert.equal(fillSiteName('{name} at www.{site}.com', state), 'Tom &amp; Jerry&#39;s at www.tomjerrys.com'.replace('&#39;', '’'));
    assert.equal(fillSiteNameText('{name}', state), 'Tom & Jerry’s');
  });

  it('titles the 1997 page and its window, at its free host’s address', () => {
    const state = named('Surf City', ['font-tags']);
    assert.match(renderSite(state, NOW), /Welcome to Surf City!!!/);
    assert.equal(buildBrowserTitle(state), 'Surf City - Web Navigator');
    assert.equal(buildSiteUrl(state), 'http://members.freewebspace.net/~surfcity/index.htm');
  });

  it('escapes the name on the page: an ampersand is text, not markup', () => {
    assert.match(renderSite(named('Tom & Jerry', ['font-tags']), NOW), /Welcome to Tom &amp; Jerry!!!/);
  });

  it('types the name into the code', () => {
    const state = named('Surf City', ['font-tags']);
    assert.match(buildEditorSource(state, mainEditorFile(state)), /<TITLE>Surf City<\/TITLE>/);
  });

  it('becomes the domain later on, in the address, the logo and the pop-ups', () => {
    const state: GameState = { ...createPlaytestState('platform-2018', 'end', SEED, 'react'), siteName: 'Planet Pixel' };
    assert.equal(buildSiteUrl(state), 'https://www.plntpxl.com/');
    assert.match(renderSite(state, NOW), /<span class="lp-logo"><i aria-hidden="true"><\/i>plntpxl<\/span>/);
    const roll = Array.from({ length: VARIANT_SLOTS }, (_, slot) => slot / VARIANT_SLOTS).find((candidate) =>
      findPopupCopy({ ...state, popups: [{ id: 1, variantRoll: candidate, anchorX: 0, anchorY: 0 }] }, 1)?.headline.includes('notifications'),
    );
    assert.ok(roll !== undefined);
    assert.match(renderPopup(state, { id: 1, variantRoll: roll, anchorX: 0, anchorY: 0 }), /www\.plntpxl\.com wants to show notifications/);
  });

  it('keeps old saves, which had no name, on the default one', () => {
    const { siteName: _name, ...older } = createInitialGameState(SEED);
    assert.equal(restoreGameState(older, SEED)?.siteName, DEFAULT_SITE_NAME);
  });
});

describe('the intro', () => {
  it('types its lines out over a few seconds, starting from nothing', () => {
    assert.ok(revealIntroLines(0).every((line) => line === ''));
    const done = revealIntroLines(INTRO_TYPING_MS);
    assert.ok(done.every((line) => line.length > 0));
    assert.ok(INTRO_TYPING_MS >= 3_000 && INTRO_TYPING_MS <= 6_000);
  });

  it('fills the whole upload with status lines, one after another, ending on done', () => {
    UPLOAD_MESSAGES.forEach((message, index) => assert.equal(message.from, UPLOAD_MESSAGES[index - 1]?.to ?? 0));
    assert.equal(UPLOAD_MESSAGES[UPLOAD_MESSAGES.length - 1]?.to, 1);
    assert.match(UPLOAD_MESSAGES[UPLOAD_MESSAGES.length - 1]?.text ?? '', /Done/);
  });

  it('gives a different name every time the random button is pressed', () => {
    RANDOM_SITE_NAMES.forEach((current) => assert.notEqual(pickRandomSiteName(current, 0.5), current));
    RANDOM_SITE_NAMES.forEach((name) => assert.ok(isValidSiteName(name) && cleanSiteName(name) === name));
  });
});
