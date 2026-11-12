import { dropVowels, FEATURES_BY_ID, findLaterEraName, MS_PER_SECOND, toSiteSlug } from '../../engine';
import type { EraId, FeatureId, GameState } from '../../engine';
import { escapeHtml } from '../dom';

/** Everything a site renderer reads: the game, the era it draws and the clock for the animated bits. */
export interface SiteContext {
  readonly state: GameState;
  readonly eraId: EraId;
  readonly nowMs: number;
}

export type FeatureRenderer = (context: SiteContext) => string;

const SECONDS_PER_MINUTE = 60;

export const is1997 = (context: SiteContext): boolean => context.eraId === 'homepage-1997';
export const levelOf = (context: SiteContext, featureId: FeatureId): number => context.state.featureLevels[featureId];
function describeBlock(featureId: FeatureId, override: string | undefined): string {
  return override ?? FEATURES_BY_ID[featureId].name;
}

/**
 * A block's title: the newest name the era (or an earlier one) gave the feature, else the block's own wording, else
 * the feature's name.
 */
export const heading = (context: SiteContext, featureId: FeatureId, override?: string): string =>
  `<h2 class="feature-heading">${escapeHtml(findLaterEraName(featureId, context.eraId) ?? describeBlock(featureId, override))}</h2>`;

/**
 * The site as a brand, from its name: the form that goes in an address and a logo ("kevinskoolpage"), without
 * its vowels once that's the fashion ("kvnskklpg"). The name as typed is `state.siteName`.
 */
export function siteBrand(state: GameState): string {
  const slug = toSiteSlug(state.siteName);
  return state.purchasedUpgradeIds.includes('drop-vowels') ? dropVowels(slug) : slug;
}

/** Copy written before the player named anything says `{site}` for the brand and `{name}` for the name as typed. */
const SITE_BRAND_TOKEN = '{site}';
const SITE_NAME_TOKEN = '{name}';

function fillTokens(text: string, brand: string, name: string): string {
  return text.replaceAll(SITE_BRAND_TOKEN, brand).replaceAll(SITE_NAME_TOKEN, name);
}

/** For HTML: escaped, since the name is the player's own input. */
export function fillSiteName(html: string, state: GameState): string {
  return fillTokens(html, escapeHtml(siteBrand(state)), escapeHtml(state.siteName));
}

/** For plain text (textContent, the editor's code): as it is, or "Kevin's" would read "Kevin&#39;s". */
export function fillSiteNameText(text: string, state: GameState): string {
  return fillTokens(text, siteBrand(state), state.siteName);
}

/** 95 seconds reads "1:35": the format of music players and countdowns alike. */
export function formatMinutesAndSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = (totalSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function toWholeSeconds(ms: number): number {
  return Math.floor(ms / MS_PER_SECOND);
}
