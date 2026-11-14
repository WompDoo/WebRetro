import {
  calculateEraDurationsMs,
  createEraRecord,
  createInitialGameState,
  ERAS_BY_ID,
  formatCompactNumber,
  formatMoney,
  formatWholeNumber,
  listEraRecords,
} from '../engine';
import type { EraId, EraRecord, GameState } from '../engine';
import { buildSiteUrl } from './browser-chrome';
import { escapeHtml } from './dom';
import { ERA_PRESENTATION } from './presentation';
import { renderSite } from './sites';
import { siteBrand } from './sites/site-context';

/**
 * The ending, in acts. First the Web Attic: your site as it was the day you left each era, a page you can scroll.
 * Then one last email, an offer to buy it. Selling is the exit every startup of the 2010s wrote up as "our incredible
 * journey"; keeping it is the full circle, one HTML file in Notepad like 1997. Both end on the credits.
 * Each act is a pure function of the game, so the tests read the same markup the player sees.
 */
export type EndingAct = 'archive' | 'offer' | 'sold' | 'kept' | 'credits';

export const ENDING_ACTS: readonly EndingAct[] = ['archive', 'offer', 'sold', 'kept', 'credits'];

/** The buyer pays this many times everything the site ever earned. */
const OFFER_EARNINGS_MULTIPLE = 10;
const MS_PER_MINUTE = 60_000;
const FULL_BAR_PERCENT = 100;
/** The quietest era's bar still shows. */
const MIN_BAR_PERCENT = 8;
/** A stopped clock for the old pages: nothing on them moves with time. */
const ARCHIVE_NOW_MS = 0;
const FIRST_YEAR = ERA_PRESENTATION['homepage-1997'].year;
/** The year the ending happens: the one after the last era. */
const ENDING_YEAR = ERA_PRESENTATION['ai-2024'].year + 1;
/** The full-circle page: one of each thing a 1997 homepage started with. */
const SMALL_WEB_FEATURES = ['under-construction', 'hit-counter', 'guestbook'] as const;

/** The site as it was when it left an era: the page shown again, with nothing broken and no pop-ups. */
function buildSnapshotState(state: GameState, record: EraRecord): GameState {
  return { ...state, ...record.site, eraId: record.eraId, popups: [], infections: [], hasPendingBug: false, isCertificateExpired: false, isCookieBannerDismissed: true };
}

type NonEmpty<T> = readonly [T, ...T[]];

/** Every era on record; a game with none (an old save) still has the page it finished with. */
function listArchive(state: GameState): NonEmpty<EraRecord> {
  const [first, ...rest] = listEraRecords(state);
  return first === undefined ? [createEraRecord(state)] : [first, ...rest];
}

function findArchiveRecord(records: NonEmpty<EraRecord>, eraId: EraId | null): EraRecord {
  return records.find((record) => record.eraId === eraId) ?? records[0];
}

function eraYear(eraId: EraId): number {
  return ERA_PRESENTATION[eraId].year;
}

/** Bars in proportion to visitors on a log scale: 1997's few hundred and 2024's trillions both show. */
function barPercent(visitorsPerSecond: number, busiest: number): number {
  const share = Math.log10(visitorsPerSecond + 1) / Math.log10(busiest + 1);
  return Math.max(MIN_BAR_PERCENT, Math.min(FULL_BAR_PERCENT, share * FULL_BAR_PERCENT));
}

function renderTimeline(records: readonly EraRecord[], shown: EraRecord): string {
  const busiest = Math.max(...records.map((record) => record.visitorsPerSecond), 1);
  const years = records.map((record) => {
    const current = record.eraId === shown.eraId ? ' is-current' : '';
    return `<li><button type="button" class="attic-year${current}" data-action="ending-year" data-id="${record.eraId}"><span class="attic-bar" style="height:${barPercent(record.visitorsPerSecond, busiest).toFixed(0)}%"></span><span class="attic-year-label">${eraYear(record.eraId)}</span></button></li>`;
  });
  return `<ol class="attic-timeline">${years.join('')}</ol>`;
}

function renderSnapshot(state: GameState, record: EraRecord): string {
  const snapshot = buildSnapshotState(state, record);
  const address = `webattic.org/${eraYear(record.eraId)}/${buildSiteUrl(snapshot)}`;
  const caption = `${ERAS_BY_ID[record.eraId].name}: ${formatCompactNumber(record.visitorsPerSecond)} visitors a second, ${formatMoney(record.revenuePerSecond)} a second.`;
  return `<figure class="attic-snapshot">
    <div class="attic-frame"><div class="attic-address">${escapeHtml(address)}</div><div class="site attic-site">${renderSite(snapshot, ARCHIVE_NOW_MS)}</div></div>
    <figcaption>${escapeHtml(caption)}</figcaption>
  </figure>`;
}

function renderArchive(state: GameState, eraId: EraId | null): string {
  const records = listArchive(state);
  const shown = findArchiveRecord(records, eraId);
  return `<p class="story-year">${FIRST_YEAR} → ${ENDING_YEAR - 1}</p>
    <h2 id="end-heading">The Web Attic: ${escapeHtml(siteBrand(state))} through the years</h2>
    <p>Someone saved a copy of your site the day you relaunched it, every time. Pick a year, and scroll.</p>
    ${renderTimeline(records, shown)}
    ${renderSnapshot(state, shown)}
    <div class="overlay-actions"><button type="button" class="primary-button" data-action="ending-act" data-id="offer">What happened next</button></div>`;
}

export function calculateOfferAmount(state: GameState): number {
  return state.lifetimeEarnings * OFFER_EARNINGS_MULTIPLE;
}

function renderOffer(state: GameState): string {
  const brand = escapeHtml(siteBrand(state));
  const years = ENDING_YEAR - FIRST_YEAR;
  return `<p class="story-year">${ENDING_YEAR}</p>
    <h2 id="end-heading">One more email</h2>
    <article class="offer-mail">
      <p class="offer-mail-head"><b>From:</b> Corporate Development, Omnivore AI<br><b>Subject:</b> Acquisition offer: ${brand}</p>
      <p>Hi! We’ve been big fans of ${brand} for a long time. (We crawled all of it.)</p>
      <p>We’d like to acquire ${brand} for <b>${formatMoney(calculateOfferAmount(state))}</b>, ten times everything it has ever earned. Your visitors, your posts and ${years} years of archives would join the Omnivore family, where they’d help train Omnivore 7.</p>
      <p>Let’s hop on a call!</p>
      <p class="offer-mail-sign">Sent from my AI</p>
    </article>
    <div class="overlay-actions">
      <button type="button" class="ghost-button" data-action="ending-act" data-id="kept">Keep it yours</button>
      <button type="button" class="primary-button" data-action="ending-act" data-id="sold">Sell it</button>
    </div>`;
}

function renderSold(state: GameState): string {
  const brand = escapeHtml(siteBrand(state));
  return `<p class="story-year">${ENDING_YEAR}</p>
    <h2 id="end-heading">Our incredible journey</h2>
    <article class="journey-post">
      <p>Today we’re thrilled to announce that ${brand} has been acquired by Omnivore AI.</p>
      <p>When we put up a starry little homepage in ${FIRST_YEAR}, we never imagined ${formatWholeNumber(state.lifetimeVisitors)} visitors, five relaunches and a GPU cluster. We couldn’t have done it without you.</p>
      <p>${brand} will close on March 1. Everything you ever posted will live on, as training data.</p>
      <p>Thank you for being part of our incredible journey.</p>
    </article>
    <p class="ending-epilogue">You’re rich. The address now forwards to omnivore.ai. Your ${FIRST_YEAR} guestbook is in a dataset somewhere, and one day a chatbot will sign it.</p>
    <div class="overlay-actions"><button type="button" class="primary-button" data-action="ending-act" data-id="credits">Credits</button></div>`;
}

/** The full circle: a fresh 1997 page with your name on it, built from the game's own 1997 renderer. */
function buildSmallWebState(state: GameState): GameState {
  const fresh = createInitialGameState(state.randomSeed);
  const levels = { ...fresh.featureLevels, ...Object.fromEntries(SMALL_WEB_FEATURES.map((featureId) => [featureId, 1])) };
  return { ...fresh, siteName: state.siteName, featureLevels: levels, lifetimeVisitors: 1 };
}

/** The line every homepage started with, this one included: the full circle's first line, and its page's title. */
const FIRST_LINE = '<H1>Hello World!</H1>';

function renderKept(state: GameState): string {
  return `<p class="story-year">${ENDING_YEAR}</p>
    <h2 id="end-heading">You open Notepad</h2>
    <div class="ending-notepad"><div class="ending-notepad-title">index.html - Notepad</div><pre class="ending-notepad-text"><span class="ending-typed" style="--chars:${FIRST_LINE.length}">${escapeHtml(FIRST_LINE)}</span></pre></div>
    <p>No framework, no build, no AI. No ads, no trackers, no cookie banner. One HTML file on a cheap host, like ${FIRST_YEAR}.</p>
    <div class="ending-small-web"><div class="site attic-site">${renderSite(buildSmallWebState(state), ARCHIVE_NOW_MS)}</div></div>
    <p class="ending-epilogue">The small web is back. A webring finds you within a week, and the first guestbook entry is from someone who signed your old one.</p>
    <div class="overlay-actions"><button type="button" class="primary-button" data-action="ending-act" data-id="credits">Credits</button></div>`;
}

function formatMinutes(ms: number): string {
  return `${Math.round(ms / MS_PER_MINUTE)} min`;
}

function renderCreditRows(records: readonly EraRecord[]): string {
  const durations = calculateEraDurationsMs(records);
  return records
    .map((record, index) => `<tr><th scope="row">${eraYear(record.eraId)} ${escapeHtml(ERAS_BY_ID[record.eraId].name)}</th><td>${formatMinutes(durations[index] ?? 0)}</td><td>${formatCompactNumber(record.visitorsPerSecond)}/s</td><td>${formatMoney(record.revenuePerSecond)}/s</td></tr>`)
    .join('');
}

function renderCredits(state: GameState): string {
  const records = listArchive(state);
  return `<p class="story-year">${FIRST_YEAR} → ${ENDING_YEAR}</p>
    <h2 id="end-heading">You built a website for ${ENDING_YEAR - FIRST_YEAR} years</h2>
    <table class="credits-table"><thead><tr><th scope="col">Era</th><th scope="col">Played</th><th scope="col">Visitors at the end</th><th scope="col">Earning</th></tr></thead><tbody>${renderCreditRows(records)}</tbody></table>
    <ul class="end-stats"><li><b>${formatMinutes(state.playTimeMs)}</b> played</li><li><b>${formatCompactNumber(state.lifetimeVisitors)}</b> visitors</li><li><b>${formatMoney(state.lifetimeEarnings)}</b> earned</li><li><b>${formatWholeNumber(state.keystrokes)}</b> keystrokes</li></ul>
    <p class="ending-epilogue">Written, designed, hosted, debugged and relaunched by you. Thanks for playing Under Construction.</p>
    <div class="overlay-actions">
      <button type="button" class="ghost-button" data-action="ending-act" data-id="archive">Back to the attic</button>
      <button type="button" class="ghost-button" data-action="open-reset">Start over</button>
      <button type="button" class="primary-button" data-action="keep-playing">Keep playing</button>
    </div>`;
}

const ACT_RENDERERS: Readonly<Record<EndingAct, (state: GameState, eraId: EraId | null) => string>> = {
  archive: renderArchive,
  offer: renderOffer,
  sold: renderSold,
  kept: renderKept,
  credits: renderCredits,
};

/** One act of the ending. The archive shows the era asked for, or the first one. */
export function renderEndingAct(state: GameState, act: EndingAct, eraId: EraId | null): string {
  return ACT_RENDERERS[act](state, eraId);
}

export function isEndingAct(value: string): value is EndingAct {
  return (ENDING_ACTS as readonly string[]).includes(value);
}
