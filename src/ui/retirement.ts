import { calculateRetirementPayout, formatMoney, formatPercent, getFeaturesRetiringIn, getRetiredFeatureName, MS_PER_SECOND, paysTradeIn, REDIRECT_MS, RETIREMENT_PAYOUT_SHARE } from '../engine';

const SECONDS_PER_MINUTE = 60;
import type { EraId, GameState } from '../engine';

/** The wording for features that go out of fashion at a relaunch: the story, the news and the shop all say it. */

/** "Visitor stats, Beta sticker, Blogroll": by the names the player saw them under. */
export function describeRetiring(state: GameState, eraId: EraId): string {
  return getFeaturesRetiringIn(state, eraId).map(getRetiredFeatureName).join(', ');
}

const REDIRECT_MINUTES = REDIRECT_MS / MS_PER_SECOND / SECONDS_PER_MINUTE;

/** "Trade-in: $180M (50% of what they earned), paid over 10 minutes as their old links redirect." */
export function describeTradeIn(amount: number): string {
  return `Trade-in: ${formatMoney(amount)} (${formatPercent(RETIREMENT_PAYOUT_SHARE)} of what they earned), paid over ${REDIRECT_MINUTES} minutes as their old links redirect.`;
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
