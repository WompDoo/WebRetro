import { FEATURE_IDS } from '../engine';
import type { FeatureId, GameState } from '../engine';

/**
 * Phones show one section at a time, so a new thing on the site happens out of sight: you build a guestbook from the
 * Shop tab and never see it go up. The Site tab counts what has been added since you last looked: new features, and
 * new banners. Levels on things already there aren't news; neither is taking something away.
 */
export interface SiteSeen {
  readonly features: readonly FeatureId[];
  readonly adCount: number;
}

function listBuiltFeatures(game: GameState): readonly FeatureId[] {
  return FEATURE_IDS.filter((featureId) => game.featureLevels[featureId] > 0);
}

/** What's on the site right now: what looking at it marks as seen. */
export function captureSiteSeen(game: GameState): SiteSeen {
  return { features: listBuiltFeatures(game), adCount: game.adCount };
}

/** Elements added since the site was last seen: each new feature, and each new banner. */
export function countNewOnSite(game: GameState, seen: SiteSeen): number {
  const newFeatures = listBuiltFeatures(game).filter((featureId) => !seen.features.includes(featureId)).length;
  return newFeatures + Math.max(0, game.adCount - seen.adCount);
}
