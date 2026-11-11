import { calculateRetirementPayout, formatMoney, formatPercent, getFeaturesRetiringIn, getRetiredFeatureName, RETIREMENT_PAYOUT_SHARE } from '../engine';
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

/** For the relaunch news: what retired and what it paid back, or nothing when nothing retired. */
export function describeRetirement(state: GameState, eraId: EraId): string {
  const names = describeRetiring(state, eraId);
  return names === '' ? '' : `Retired: ${names}. ${describeTradeIn(calculateRetirementPayout(state, eraId))}`;
}
