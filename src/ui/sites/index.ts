import { FEATURE_IDS, calculateInfectionDifficulty, isEraUnlocked, isSiteDown, UPGRADES_BY_ID } from '../../engine';
import type { EraId, GameState } from '../../engine';
import { renderCertificateWarning } from './certificate-warning';
import { escapeHtml } from '../dom';
import { siteBrand } from './site-context';
import type { SiteContext } from './site-context';
import { render1997Site } from './site-1997';
import { render2005Site } from './site-2005';
import { render2011Site } from './site-2011';
import { render2018Site } from './site-2018';
import { render2024Site } from './site-2024';

export { fillSiteName, fillSiteNameText, siteBrand } from './site-context';
export { renderLiveSlotText, updateLiveSlots } from './live-slots';
export type { LiveSlotName } from './live-slots';

const SITE_RENDERERS: Readonly<Record<EraId, (context: SiteContext) => string>> = {
  'homepage-1997': render1997Site,
  'web2-2005': render2005Site,
  'social-2011': render2011Site,
  'platform-2018': render2018Site,
  'ai-2024': render2024Site,
};

function renderApacheUnavailable(state: GameState): string {
  return `<div class="site-down"><h1>Service Temporarily Unavailable</h1><p>The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.</p><hr><address>Apache/2.0.54 (Unix) PHP/4.4.0 Server at www.${escapeHtml(siteBrand(state))}.com Port 80</address></div>`;
}

/** 2018: the load balancer in front of Kubernetes answers, and the pods behind it don't. */
/** The status page runs on the same servers as the site, so it says what the site says. */
function renderStatusPageNote(state: GameState): string {
  return state.purchasedUpgradeIds.includes('status-page') ? `<p class="site-down-status">Check status.${escapeHtml(siteBrand(state))}.com for updates. (It’s on the same servers. It’s down too.)</p>` : '';
}

function renderIngressUnavailable(state: GameState): string {
  return `<div class="site-down is-ingress"><h1>503 Service Temporarily Unavailable</h1><p>upstream connect error or disconnect/reset before headers. reset reason: overflow</p>${renderStatusPageNote(state)}<hr><center>nginx/1.15.2</center></div>`;
}

/** Whoever answers when your servers can't: Apache until 2011, the load balancer in front of the cluster after. */
function renderServiceUnavailable(state: GameState): string {
  return isEraUnlocked(state, 'platform-2018') ? renderIngressUnavailable(state) : renderApacheUnavailable(state);
}

function renderReachableSite(state: GameState, nowMs: number): string {
  return isSiteDown(state) ? renderServiceUnavailable(state) : SITE_RENDERERS[state.eraId]({ state, eraId: state.eraId, nowMs });
}

/** An expired certificate stops visitors before the server is even asked: the browser's warning comes first. */
export function renderSite(state: GameState, nowMs: number): string {
  return state.isCertificateExpired ? renderCertificateWarning(state) : renderReachableSite(state, nowMs);
}

function calculateInfectionSignature(state: GameState): string {
  return state.infections.map((infection) => `${infection.id}:${calculateInfectionDifficulty(infection)}`).join(',');
}

/** Everything the page markup depends on. The animated bits update in place through the live slots. */
export function calculateSiteSignature(state: GameState): string {
  const levels = FEATURE_IDS.map((featureId) => state.featureLevels[featureId]).join(',');
  const skills = state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill').join(',');
  const boosts = state.purchasedUpgradeIds.length;
  return `${state.eraId}|${skills}|${boosts}|${levels}|${state.switchedOffFeatureIds.join(',')}|${state.enabledDefenseIds.join(',')}|${state.adCount}|${calculateInfectionSignature(state)}|${isSiteDown(state) ? 'down' : 'up'}|${state.consentBanner}|${state.isCookieBannerDismissed}|${state.siteName}|${state.isCertificateExpired}`;
}
