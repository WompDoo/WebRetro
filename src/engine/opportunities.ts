import { startBuff } from './buffs';
import { countMinigameWon } from './run-stats';
import { BUFFS_BY_ID } from './content/buffs';
import { FEATURE_IDS } from './content/features';
import { calculateOfferFrequencyFactor, canUseAds } from './economy';
import { drawRandoms } from './random';
import type { BuffId, BuffMinigameId, GameEvent, GameState, GameStep, Opportunity, OpportunityKind } from './types';

/**
 * Opportunities: hazards in reverse. Every few minutes of play an offer turns up and waits a little while: win its
 * minigame and a buff starts; lose it, or ignore it, and it goes, costing nothing. One try per offer: a sponsor whose
 * code you fumbled doesn't wait for a second go. Like hazards, they only come while you play.
 */

export interface OpportunityDefinition {
  readonly kind: OpportunityKind;
  readonly buffId: BuffId;
  readonly minigameId: BuffMinigameId;
  /** On the chip that offers it. */
  readonly offer: string;
  readonly icon: string;
  /** In the news when it's won, and when it's let go. */
  readonly won: string;
  readonly missed: string;
  /** Only offered when it would do something: a sponsor for your banners needs banners. */
  readonly isUseful: (state: GameState) => boolean;
}

export const OPPORTUNITIES_BY_KIND: Readonly<Record<OpportunityKind, OpportunityDefinition>> = {
  'sponsor-slot': {
    kind: 'sponsor-slot',
    buffId: 'sponsor-slot',
    minigameId: 'code-entry',
    offer: 'A sponsor wants your banner slot',
    icon: '💰',
    won: `Sponsor deal! Your ads pay ×${BUFFS_BY_ID['sponsor-slot'].factor} for ${BUFFS_BY_ID['sponsor-slot'].durationMs / 1_000} seconds.`,
    missed: 'The sponsor went with someone else.',
    isUseful: (state) => canUseAds(state) && state.adCount > 0,
  },
  'launch-day': {
    kind: 'launch-day',
    buffId: 'launch-day',
    minigameId: 'launch-window',
    offer: 'A big release is ready: launch it',
    icon: '🚀',
    won: `Launched! Visitors ×${BUFFS_BY_ID['launch-day'].factor} for ${BUFFS_BY_ID['launch-day'].durationMs / 1_000} seconds.`,
    missed: 'The launch slipped to next week.',
    isUseful: (state) => FEATURE_IDS.some((featureId) => state.featureLevels[featureId] > 0),
  },
};

export const OPPORTUNITY_KINDS: readonly OpportunityKind[] = ['sponsor-slot', 'launch-day'];

/** How long an offer waits for you. */
export const OPPORTUNITY_WINDOW_MS = 25_000;
/** Between offers: three to five minutes of play. */
export const OPPORTUNITY_MIN_GAP_MS = 180_000;
const OPPORTUNITY_GAP_SPAN_MS = 120_000;

function drawGap(state: GameState): GameState {
  const draws = drawRandoms(state.randomSeed, 1);
  return { ...state, opportunityCountdownMs: OPPORTUNITY_MIN_GAP_MS + (draws.values[0] ?? 0) * OPPORTUNITY_GAP_SPAN_MS, randomSeed: draws.nextSeed };
}

/** One of the kinds that would do something right now, at random: a site without banners only ever gets launches. */
function offer(state: GameState): GameState {
  const useful = OPPORTUNITY_KINDS.filter((candidate) => OPPORTUNITIES_BY_KIND[candidate].isUseful(state));
  const draws = drawRandoms(state.randomSeed, 1);
  const kind = useful[Math.floor((draws.values[0] ?? 0) * useful.length)];
  if (kind === undefined) return drawGap(state);
  const opportunity: Opportunity = { id: state.nextEntityId, kind, remainingMs: OPPORTUNITY_WINDOW_MS, isOpen: false };
  return drawGap({ ...state, opportunity, nextEntityId: state.nextEntityId + 1, randomSeed: draws.nextSeed });
}

/** Influencers bring offers sooner: the countdown runs faster. */
function countDownToOffer(state: GameState, deltaMs: number): GameStep {
  const countdown = state.opportunityCountdownMs - deltaMs * calculateOfferFrequencyFactor(state);
  return { state: countdown > 0 ? { ...state, opportunityCountdownMs: countdown } : offer(state), events: [] };
}

/** An offer waits out its window, unless its minigame is open: nobody loses a sponsor while typing the code. */
function waitForPlayer(state: GameState, opportunity: Opportunity, deltaMs: number): GameStep {
  if (opportunity.isOpen) return { state, events: [] };
  const remainingMs = opportunity.remainingMs - deltaMs;
  if (remainingMs > 0) return { state: { ...state, opportunity: { ...opportunity, remainingMs } }, events: [] };
  const missed: GameEvent = { kind: 'opportunity', message: OPPORTUNITIES_BY_KIND[opportunity.kind].missed };
  return { state: { ...state, opportunity: null }, events: [missed] };
}

/** While you play: an offer waits out its window, or the next one counts down. */
export function advanceOpportunities(state: GameState, deltaMs: number): GameStep {
  return state.opportunity === null ? countDownToOffer(state, deltaMs) : waitForPlayer(state, state.opportunity, deltaMs);
}

export function findOpportunity(state: GameState, opportunityId: number): Opportunity | null {
  return state.opportunity?.id === opportunityId ? state.opportunity : null;
}

function withOfferOpen(state: GameState, opportunityId: number, isOpen: boolean): GameState {
  const opportunity = findOpportunity(state, opportunityId);
  return opportunity === null ? state : { ...state, opportunity: { ...opportunity, isOpen } };
}

/** Its window opened: the offer's clock stops. Anything that isn't this offer (an infection) is left alone. */
export function openOpportunity(state: GameState, opportunityId: number): GameState {
  return withOfferOpen(state, opportunityId, true);
}

/** Its window closed without winning or losing it: the clock runs again. */
export function closeOpportunity(state: GameState, opportunityId: number): GameState {
  return withOfferOpen(state, opportunityId, false);
}

/** Lost its minigame: the offer goes to someone else, the same as letting it run out. No second try. */
export function loseOpportunity(state: GameState, opportunityId: number): GameStep {
  const opportunity = findOpportunity(state, opportunityId);
  if (opportunity === null) return { state, events: [] };
  const missed: GameEvent = { kind: 'opportunity', message: OPPORTUNITIES_BY_KIND[opportunity.kind].missed };
  return { state: { ...state, opportunity: null }, events: [missed] };
}

/** Won its minigame: the buff starts, and the offer is gone. */
export function claimOpportunity(state: GameState, opportunityId: number): GameStep {
  const opportunity = findOpportunity(state, opportunityId);
  if (opportunity === null) return { state, events: [] };
  const definition = OPPORTUNITIES_BY_KIND[opportunity.kind];
  return { state: countMinigameWon({ ...startBuff(state, definition.buffId), opportunity: null }, definition.minigameId), events: [{ kind: 'opportunity', message: definition.won }] };
}
