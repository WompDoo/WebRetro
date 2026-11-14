import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  calculateEraDurationsMs,
  createInitialGameState,
  createPlaytestState,
  ERA_IDS,
  findEraRecord,
  formatMoney,
  listEraRecords,
  restoreGameState,
  SAVE_VERSION,
} from '../src/engine';
import type { EraId, EraRecord, GameState } from '../src/engine';
import { calculateOfferAmount, ENDING_ACTS, isEndingAct, renderEndingAct } from '../src/ui/ending';
import { renderGoal } from '../src/ui/render-goal';

const SEED = 2025;
const MS_PER_MINUTE = 60_000;

/** The moment the last checklist is done: every earlier era on record, 2024 not yet. */
const end2024 = (): GameState => createPlaytestState('ai-2024', 'end', SEED, 'vue');
const finished = (): GameState => advanceEra(end2024());

/** What each era's page has that no other era's does. */
const PAGE_MARKERS: Readonly<Record<EraId, RegExp>> = {
  'homepage-1997': /class="site-title"/,
  'web2-2005': /class="w2-header"/,
  'social-2011': /class="site-2011/,
  'platform-2018': /class="site-2018/,
  'ai-2024': /class="site-2024/,
};

describe('the ending: every era is on record', () => {
  it('records the era the site leaves at every relaunch, as it was', () => {
    const end2018 = createPlaytestState('platform-2018', 'end', SEED, 'react');
    const relaunched = advanceEra(end2018);
    const record = findEraRecord(relaunched, 'platform-2018');
    assert.ok(record !== null);
    assert.deepEqual(record.site.purchasedUpgradeIds, end2018.purchasedUpgradeIds);
    assert.equal(record.endedAtPlayTimeMs, end2018.playTimeMs);
    assert.ok(record.visitorsPerSecond > 0);
  });

  it('finishes the game with the last era recorded too, and finishing again counts once', () => {
    const done = finished();
    assert.ok(done.isGameFinished);
    assert.deepEqual(listEraRecords(done).map((record) => record.eraId), ERA_IDS);
    assert.equal(advanceEra(done).eraRecords.length, ERA_IDS.length);
  });

  it('gives a playtest preset believable records for the eras before it', () => {
    assert.deepEqual(listEraRecords(end2024()).map((record) => record.eraId), ['homepage-1997', 'web2-2005', 'social-2011', 'platform-2018']);
    assert.deepEqual(createPlaytestState('homepage-1997', 'end', SEED, 'react').eraRecords, []);
  });

  it('counts each era’s time from the relaunch before it', () => {
    const [first] = finished().eraRecords;
    assert.ok(first !== undefined);
    const at = (endedAtPlayTimeMs: number): EraRecord => ({ ...first, endedAtPlayTimeMs });
    assert.deepEqual(calculateEraDurationsMs([at(40 * MS_PER_MINUTE), at(95 * MS_PER_MINUTE)]), [40 * MS_PER_MINUTE, 55 * MS_PER_MINUTE]);
  });

  it('keeps records from a save made before a feature existed: the new feature at level 0', () => {
    const done = finished();
    const [first] = done.eraRecords;
    assert.ok(first !== undefined);
    const { 'for-you-feed': _dropped, ...olderLevels } = first.site.featureLevels;
    const older = { ...first, site: { ...first.site, featureLevels: olderLevels } };
    const restored = restoreGameState({ ...done, saveVersion: SAVE_VERSION, eraRecords: [older] }, SEED);
    assert.equal(restored?.eraRecords[0]?.site.featureLevels['for-you-feed'], 0);
  });
});

describe('the ending: the Web Attic', () => {
  it('has a year for every era, and opens on 1997’s page at its 1997 address', () => {
    const html = renderEndingAct(finished(), 'archive', null);
    assert.equal(html.split('data-action="ending-year"').length - 1, ERA_IDS.length);
    assert.match(html, PAGE_MARKERS['homepage-1997']);
    assert.match(html, /webattic\.org\/1997\/http:\/\/[^<]+<\/div>/);
  });

  it('shows each era’s own page, not today’s page in old clothes', () => {
    ERA_IDS.forEach((eraId) => {
      const html = renderEndingAct(finished(), 'archive', eraId);
      assert.match(html, PAGE_MARKERS[eraId], eraId);
      ERA_IDS.filter((other) => other !== eraId).forEach((other) => assert.doesNotMatch(html, PAGE_MARKERS[other], `${eraId} shows ${other}`));
    });
  });

  it('shows a page from an old save without records: the one it finished with', () => {
    const html = renderEndingAct({ ...finished(), eraRecords: [] }, 'archive', null);
    assert.match(html, PAGE_MARKERS['ai-2024']);
  });
});

describe('the ending: the offer, and how it ends', () => {
  it('offers ten times everything the site ever earned', () => {
    const done = finished();
    assert.equal(calculateOfferAmount(done), done.lifetimeEarnings * 10);
    assert.ok(renderEndingAct(done, 'offer', null).includes(formatMoney(calculateOfferAmount(done))));
  });

  it('lets you sell it or keep it, and both roads end on the credits', () => {
    const offer = renderEndingAct(finished(), 'offer', null);
    assert.match(offer, /data-id="sold"/);
    assert.match(offer, /data-id="kept"/);
    assert.match(renderEndingAct(finished(), 'sold', null), /Our incredible journey[\s\S]*data-id="credits"/);
    assert.match(renderEndingAct(finished(), 'kept', null), /You open Notepad[\s\S]*data-id="credits"/);
  });

  it('keeps it as one 1997 page again: Hello World!, under construction', () => {
    const html = renderEndingAct(finished(), 'kept', null);
    assert.match(html, /&lt;H1&gt;Hello World!&lt;\/H1&gt;/);
    assert.match(html, /<h1 class="site-title">Hello World!<\/h1>/);
    assert.match(html, /data-feature="under-construction"/);
  });

  it('rolls the credits: a row for every era, and the way back, on, or to a new site', () => {
    const html = renderEndingAct(finished(), 'credits', null);
    assert.equal(html.split('<tr><th scope="row">').length - 1, ERA_IDS.length);
    ['data-id="archive"', 'data-action="keep-playing"', 'data-action="open-legacy"'].forEach((button) => assert.ok(html.includes(button), button));
  });

  it('knows its acts by name', () => {
    assert.ok(ENDING_ACTS.every(isEndingAct));
    assert.ok(!isEndingAct('epilogue'));
  });
});

describe('the ending: after it', () => {
  it('turns the finish button into one that plays the ending again', () => {
    assert.match(renderGoal(end2024()), /data-action="migrate"/);
    assert.match(renderGoal(finished()), /Watch the ending again/);
    assert.doesNotMatch(renderGoal(finished()), /data-action="migrate"/);
  });

  it('never finishes a game before the last era', () => {
    assert.ok(!advanceEra(createPlaytestState('platform-2018', 'end', SEED, 'react')).isGameFinished);
    assert.ok(!createInitialGameState(SEED).isGameFinished);
  });
});
