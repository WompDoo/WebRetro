import { FEATURES_BY_ID, findLaterEraName, MS_PER_SECOND } from '../../engine';
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

export function siteName(state: GameState): string {
  return state.purchasedUpgradeIds.includes('drop-vowels') ? 'myhmpg' : 'myhomepage';
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
