import type { GameState } from './types';

/** What the site is called until you name it, and what old saves and playtests use. */
export const DEFAULT_SITE_NAME = 'My Homepage';
export const MAX_SITE_NAME_LENGTH = 24;
/** The slug a name falls back to when nothing in it can go in an address. */
const DEFAULT_SITE_SLUG = 'myhomepage';
/** Letters, digits, spaces and the punctuation names use. Anything else is dropped: the name goes into HTML. */
const DISALLOWED_CHARACTERS = /[^\p{L}\p{N} '’&.!-]/gu;
const REPEATED_SPACES = /\s+/g;
/** Accents come off for the address: "Café" becomes "cafe". */
const COMBINING_MARKS = /\p{M}/gu;
const NOT_SLUG_CHARACTERS = /[^a-z0-9]/g;
const VOWELS = /[aeiou]/g;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
/** Fewer letters than this left after dropping vowels, and the name keeps them: "aoi" doesn't become "a". */
const MIN_VOWELLESS_LENGTH = 3;

/** The name as typed, made safe: allowed characters only, single spaces, no longer than the limit. */
export function cleanSiteName(raw: string): string {
  return raw.replace(DISALLOWED_CHARACTERS, '').replace(REPEATED_SPACES, ' ').trim().slice(0, MAX_SITE_NAME_LENGTH).trim();
}

/** The name as it goes in an address or a folder: "Kevin's Kool Page" is "kevinskoolpage". */
export function toSiteSlug(name: string): string {
  const slug = name.normalize('NFKD').replace(COMBINING_MARKS, '').toLowerCase().replace(NOT_SLUG_CHARACTERS, '');
  return slug === '' ? DEFAULT_SITE_SLUG : slug;
}

/** A name needs at least one letter or digit: "!!!" isn't a name. */
export function isValidSiteName(raw: string): boolean {
  return LETTER_OR_DIGIT.test(cleanSiteName(raw));
}

/** Web 2.0's naming: Flickr, Tumblr. The first letter stays, so "oddball" is "oddbll", not "ddbll". */
export function dropVowels(slug: string): string {
  const dropped = slug.charAt(0) + slug.slice(1).replace(VOWELS, '');
  return dropped.length < MIN_VOWELLESS_LENGTH ? slug : dropped;
}

/** Names the site. A name with nothing usable in it leaves the site as it was. */
export function nameSite(state: GameState, raw: string): GameState {
  return isValidSiteName(raw) ? { ...state, siteName: cleanSiteName(raw) } : state;
}
