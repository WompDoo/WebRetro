import { getActiveUpgradeIds, getBaseEraId } from '../../engine';
import type { EraId, GameState, UpgradeId } from '../../engine';

/**
 * The ad-free way to earn, on the page: each era's way of asking visitors to chip in, in the footer, next to the
 * copyright. Only this era's: a 2018 page doesn't still ask for checks by mail. 1997 shows its own as badges.
 */

interface SupportLink {
  readonly upgradeId: UpgradeId;
  readonly eraId: EraId;
  readonly label: string;
}

const SUPPORT_LINKS: readonly SupportLink[] = [
  { upgradeId: 'pro-accounts', eraId: 'web2-2005', label: '⭐ Go Pro: no banners, ever' },
  { upgradeId: 'pay-what-you-want', eraId: 'social-2011', label: '💸 Pay what you want' },
  { upgradeId: 'patron-tiers', eraId: 'platform-2018', label: '🎗️ Become a patron' },
  { upgradeId: 'supporter-plan', eraId: 'ai-2024', label: '💚 Supporter plan: no ads, ever' },
];

/** The support links this era's page shows, each a footer item in the page's own style: '' when there are none. */
export function renderSupportLinks(state: GameState, className: string): string {
  const active = getActiveUpgradeIds(state);
  const eraId = getBaseEraId(state.eraId);
  return SUPPORT_LINKS.filter((link) => link.eraId === eraId && active.includes(link.upgradeId))
    .map((link) => ` · <span class="${className}">${link.label}</span>`)
    .join('');
}
