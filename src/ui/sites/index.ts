import { FEATURE_IDS, calculateRequiredVirusFood, isSiteDown, UPGRADES_BY_ID } from '../../engine';
import type { EraId, GameState } from '../../engine';
import { siteName } from './site-context';
import type { SiteContext } from './site-context';
import { render1997Site } from './site-1997';
import { render2005Site } from './site-2005';

export { siteName } from './site-context';
export { updateLiveSlots } from './live-slots';

const SITE_RENDERERS: Readonly<Record<EraId, (context: SiteContext) => string>> = {
  'homepage-1997': render1997Site,
  'web2-2005': render2005Site,
};

function renderServiceUnavailable(state: GameState): string {
  return `<div class="site-down"><h1>Service Temporarily Unavailable</h1><p>The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.</p><hr><address>Apache/2.0.54 (Unix) PHP/4.4.0 Server at www.${siteName(state)}.com Port 80</address></div>`;
}

export function renderSite(state: GameState, nowMs: number): string {
  return isSiteDown(state) ? renderServiceUnavailable(state) : SITE_RENDERERS[state.eraId]({ state, eraId: state.eraId, nowMs });
}

function calculateInfectionSignature(state: GameState): string {
  return state.infections
    .map((infection) =>
      infection.kind === 'virus'
        ? `${infection.id}:food${calculateRequiredVirusFood(infection)}`
        : `${infection.id}:clicks${infection.cleanClicksRemaining}`,
    )
    .join(',');
}

/** Everything the page markup depends on. The animated bits update in place through the live slots. */
export function calculateSiteSignature(state: GameState): string {
  const levels = FEATURE_IDS.map((featureId) => state.featureLevels[featureId]).join(',');
  const skills = state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill').join(',');
  const boosts = state.purchasedUpgradeIds.length;
  return `${state.eraId}|${skills}|${boosts}|${levels}|${state.switchedOffFeatureIds.join(',')}|${state.adCount}|${calculateInfectionSignature(state)}|${isSiteDown(state) ? 'down' : 'up'}`;
}
