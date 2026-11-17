import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  BUFFS_BY_ID,
  calculateAdValuePerAd,
  claimOpportunity,
  codeEntryStatus,
  createCodeFromPatterns,
  createPlaytestState,
  isBuffActive,
  listCodeKeys,
  loseOpportunity,
  OPPORTUNITIES_BY_KIND,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_WINDOW_MS,
  offerPlaytestOpportunity,
  calculateUsualVisitorsPerSecond,
  calculateVisitorsPerSecond,
  startCodeEntry,
  tickCodeEntry,
  typeCodeKey,
} from '../src/engine';
import type { CodeEntry, GameState } from '../src/engine';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 68;
const playing = (): GameState => ({ ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] });
const typeAll = (entry: CodeEntry, keys: readonly string[]): CodeEntry => keys.reduce(typeCodeKey, entry);

const offerNow = (state: GameState): GameState => advanceSimulation({ ...state, opportunityCountdownMs: 1 }, 10, 'live').state;
const SEEDS = Array.from({ length: 30 }, (_, index) => index * 7_919 + 3);

describe('opportunities', () => {
  it('turn up while you play, and wait their window out', () => {
    const offered = offerNow(playing());
    const kind = offered.opportunity?.kind ?? 'sponsor-slot';
    const gone = advanceSimulation(offered, OPPORTUNITY_WINDOW_MS, 'live');
    assert.equal(gone.state.opportunity, null);
    assert.ok(gone.events.some((event) => event.message === OPPORTUNITIES_BY_KIND[kind].missed));
  });

  it('never turn up offline', () => {
    const due = { ...playing(), opportunityCountdownMs: 1 };
    assert.equal(advanceSimulation(due, 60_000, 'offline').state.opportunity, null);
  });

  it('are any kind that would do something, at random', () => {
    const kinds = new Set(SEEDS.map((seed) => offerNow({ ...playing(), randomSeed: seed }).opportunity?.kind));
    assert.deepEqual([...kinds].sort(), [...OPPORTUNITY_KINDS].sort());
  });

  it('never a sponsor without banners, and nothing at all for a site with nothing built', () => {
    const noAds = new Set(SEEDS.map((seed) => offerNow({ ...playing(), adCount: 0, randomSeed: seed }).opportunity?.kind));
    assert.deepEqual([...noAds], ['launch-day']);
    const empty = createPlaytestState('homepage-1997', 'start', SEED, 'react');
    assert.equal(offerNow({ ...empty, hazardCountdownsMs: QUIET_HAZARDS }).opportunity, null);
  });

  it('start their buff when won: a sponsor multiplies what a banner pays', () => {
    const offered = offerPlaytestOpportunity(playing(), 'sponsor-slot');
    const id = offered.opportunity?.id ?? -1;
    const won = claimOpportunity(offered, id).state;
    assert.ok(isBuffActive(won, 'sponsor-slot'));
    assert.equal(won.opportunity, null);
    assert.ok(Math.abs(calculateAdValuePerAd(won) - calculateAdValuePerAd(offered) * BUFFS_BY_ID['sponsor-slot'].factor) < 1e-12);
    assert.equal(claimOpportunity(won, id).state, won, 'an offer is won once');
  });

  it('launch day brings half as many visitors again, for the length of the buff', () => {
    const offered = offerPlaytestOpportunity(playing(), 'launch-day');
    const launched = claimOpportunity(offered, offered.opportunity?.id ?? -1).state;
    assert.ok(isBuffActive(launched, 'launch-day'));
    assert.ok(Math.abs(calculateVisitorsPerSecond(launched) / calculateVisitorsPerSecond(offered) - BUFFS_BY_ID['launch-day'].factor) < 1e-9);
    assert.equal(calculateUsualVisitorsPerSecond(launched), calculateUsualVisitorsPerSecond(offered), 'the checklist counts a usual day');
  });

  it('go for good when their minigame is lost: one try per offer, and no buff', () => {
    const offered = offerPlaytestOpportunity(playing(), 'sponsor-slot');
    const id = offered.opportunity?.id ?? -1;
    const lost = loseOpportunity(offered, id);
    assert.equal(lost.state.opportunity, null);
    assert.equal(isBuffActive(lost.state, 'sponsor-slot'), false);
    assert.deepEqual(lost.events.map((event) => event.message), ['The sponsor went with someone else.']);
    assert.equal(claimOpportunity(lost.state, id).state, lost.state, 'a lost offer can’t be won after all');
  });

  it('losing anything else (an infection’s minigame) leaves the offer alone', () => {
    const offered = offerNow(playing());
    const other = loseOpportunity(offered, (offered.opportunity?.id ?? 0) + 1);
    assert.equal(other.state, offered);
    assert.deepEqual(other.events, []);
  });
});

describe('code entry', () => {
  it('asks for the letters and digits, not the spaces and dashes, in any case', () => {
    assert.deepEqual(listCodeKeys('sk-live 7Q'), ['S', 'K', 'L', 'I', 'V', 'E', '7', 'Q']);
    assert.equal(codeEntryStatus(typeAll(startCodeEntry('ab-1'), ['a', 'B', '1'])), 'won');
  });

  it('starts you over on a wrong key, stratagem style', () => {
    const wrong = typeAll(startCodeEntry('ABC'), ['A', 'B', 'X']);
    assert.equal(wrong.typed, 0);
    assert.equal(wrong.mistakes, 1);
  });

  it('starts the clock on the first key, and runs out', () => {
    const fresh = startCodeEntry('ABC');
    assert.equal(tickCodeEntry(fresh, 60_000).elapsedMs, 0);
    const started = typeCodeKey(fresh, 'A');
    assert.equal(codeEntryStatus(tickCodeEntry(started, started.limitMs)), 'lost');
  });
});

describe('sponsor codes', () => {
  const SEEDS = Array.from({ length: 40 }, (_, index) => index * 7_919 + 1);

  it('keep the pattern’s format: # a digit, @ a letter, * either, the rest as written', () => {
    SEEDS.forEach((seed) => {
      assert.match(createCodeFromPatterns(['ATDT 555-####'], seed), /^ATDT 555-\d{4}$/);
      assert.match(createCodeFromPatterns(['@@-*****'], seed), /^[A-Z]{2}-[A-Z0-9]{5}$/);
    });
  });

  it('are a fresh code each time, and the same one for the same seed', () => {
    const codes = new Set(SEEDS.map((seed) => createCodeFromPatterns(['*****-*****'], seed)));
    assert.ok(codes.size > SEEDS.length * 0.9, `only ${codes.size} different codes`);
    assert.equal(createCodeFromPatterns(['*****'], 42), createCodeFromPatterns(['*****'], 42));
  });

  it('never use characters that read alike: 0 and O, 1, I and L, 5 and S', () => {
    const typed = SEEDS.map((seed) => createCodeFromPatterns(['#####@@@@@*****'], seed)).join('');
    assert.doesNotMatch(typed, /[0O1IL5S]/);
  });

  it('pick among the era’s patterns', () => {
    const picked = new Set(SEEDS.map((seed) => createCodeFromPatterns(['A#', 'B#', 'C#'], seed).charAt(0)));
    assert.deepEqual([...picked].sort(), ['A', 'B', 'C']);
  });
});
