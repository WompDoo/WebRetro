import { TRAFFIC_SPIKE_DURATION_MS } from './constants';
import { ERAS_BY_ID } from './content/eras';
import { isFeatureOnPage, listEffectsOfKind } from './economy';
import type { FeatureId, GameState, InfectionKind } from './types';

/**
 * The specializations' mechanics that hang off something the player does: typing publishes, cleaning up pays,
 * catching fire breaks the news. Pure: state in, state out.
 */

/** A level for a feature still on the page: a retired one gains nothing. */
export function addFeatureLevels(state: GameState, featureId: FeatureId, levels: number): GameState {
  if (!isFeatureOnPage(state, featureId)) return state;
  return { ...state, featureLevels: { ...state.featureLevels, [featureId]: state.featureLevels[featureId] + levels } };
}

/** Typing publishes: every so many of your keystrokes, a feature gains a level. Called after each keystroke counts. */
export function publishFromTyping(state: GameState): GameState {
  return listEffectsOfKind(state, 'keystrokes-level')
    .filter((effect) => state.keystrokes % effect.keystrokes === 0)
    .reduce((current, effect) => addFeatureLevels(current, effect.featureId, 1), state);
}

/** Moderation pays: each infection cleaned up, by you or by itself, gives levels to the features that count it. */
export function rewardCleanup(state: GameState, kind: InfectionKind): GameState {
  return listEffectsOfKind(state, 'levels-per-clean')
    .filter((effect) => effect.infection === null || effect.infection === kind)
    .reduce((current, effect) => addFeatureLevels(current, effect.featureId, effect.levels), state);
}

function canSpike(state: GameState): boolean {
  return ERAS_BY_ID[state.eraId].hasServerLoad && state.trafficSpikeRemainingMs <= 0;
}

function hasCaughtFire(before: GameState, after: GameState): boolean {
  return after.eraStats.onFireStarts > before.eraStats.onFireStarts;
}

function doesNewsBreak(before: GameState, after: GameState): boolean {
  return hasCaughtFire(before, after) && listEffectsOfKind(after, 'spike-on-fire').length > 0 && canSpike(after);
}

/** Breaking news: catching fire starts a traffic spike, if the era has servers to overload and none is running. */
export function breakNewsOnFire(before: GameState, after: GameState): GameState {
  return doesNewsBreak(before, after) ? { ...after, trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS } : after;
}
