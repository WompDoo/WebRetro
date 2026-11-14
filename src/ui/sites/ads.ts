import { isEraUnlocked } from '../../engine';
import { escapeHtml, pickCyclic } from '../dom';
import { AI_ERA_ADS, PROGRAMMATIC_ADS, RETARGETED_ADS, SPONSORED_POSTS } from '../presentation';
import type { DisplayAdCopy } from '../presentation';
import type { SiteContext } from './site-context';

const FALLBACK_AD: DisplayAdCopy = { advertiser: 'Sponsored', headline: 'Advertisement', text: '' };
/** Each ad's picture gets its own colour, so a column of ads doesn't look like one ad repeated. */
const AD_HUE_STEP = 47;

/** What the auction sells without following anyone: 2018's programmatic ads, 2024's AI-everything ones. */
function findUntargetedAds(context: SiteContext): readonly DisplayAdCopy[] {
  return context.eraId === 'ai-2024' ? AI_ERA_ADS : PROGRAMMATIC_ADS;
}

/** Retargeting cookies turn the ads into the things each visitor already looked at somewhere else. */
function findPlatformAds(context: SiteContext): readonly DisplayAdCopy[] {
  return context.state.purchasedUpgradeIds.includes('retargeting-cookies') ? RETARGETED_ADS : findUntargetedAds(context);
}

/** 2011 ads come from 2011's copy; from 2018 on the auction's, even on a page not yet rewritten. */
function findAdCopy(context: SiteContext): readonly DisplayAdCopy[] {
  return isEraUnlocked(context.state, 'platform-2018') ? findPlatformAds(context) : SPONSORED_POSTS;
}

/** One entry per ad placed: placing an ad always shows on the page. */
export function listAds(context: SiteContext): readonly DisplayAdCopy[] {
  const copy = findAdCopy(context);
  return Array.from({ length: context.state.adCount }, (_, index) => pickCyclic(copy, index, FALLBACK_AD));
}

export function renderAdPicture(index: number): string {
  return `<span class="ad-picture" style="--ad-hue:${index * AD_HUE_STEP}" aria-hidden="true"></span>`;
}

export function renderAdText(ad: DisplayAdCopy): string {
  return `<b class="ad-headline">${escapeHtml(ad.headline)}</b><span class="ad-small">${escapeHtml(ad.advertiser)} · ${escapeHtml(ad.text)}</span>`;
}
