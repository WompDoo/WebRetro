import { calculateRetirementPayout, formatMoney, formatPercent, getFeaturesRetiringIn, getRetiredFeatureName, paysTradeIn, RETIREMENT_PAYOUT_SHARE } from '../engine';
import type { EraId, GameState } from '../engine';

/** The wording for features that go out of fashion at a relaunch: the story, the news and the shop all say it. */

/** "Visitor stats, Beta sticker, Blogroll": by the names the player saw them under. */
export function describeRetiring(state: GameState, eraId: EraId): string {
  return getFeaturesRetiringIn(state, eraId).map(getRetiredFeatureName).join(', ');
}

/** "Trade-in: $180M (50% of what they earned)." */
export function describeTradeIn(amount: number): string {
  return `Trade-in: ${formatMoney(amount)} (${formatPercent(RETIREMENT_PAYOUT_SHARE)} of what they earned).`;
}

/** True when the crash's stopgaps retire too: they pay nothing back, and the news says so. */
export function hasRetiringStopgaps(state: GameState, eraId: EraId): boolean {
  return getFeaturesRetiringIn(state, eraId).some((featureId) => !paysTradeIn(featureId));
}

function describePayout(state: GameState, eraId: EraId): string {
  const tradeIn = describeTradeIn(calculateRetirementPayout(state, eraId));
  return hasRetiringStopgaps(state, eraId) ? `${tradeIn} The crash’s stopgaps pay none.` : tradeIn;
}

/** For the relaunch news: what retired and what it paid back, or nothing when nothing retired. */
export function describeRetirement(state: GameState, eraId: EraId): string {
  const names = describeRetiring(state, eraId);
  return names === '' ? '' : `Retired: ${names}. ${describePayout(state, eraId)}`;
}
