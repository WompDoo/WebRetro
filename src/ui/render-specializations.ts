import {
  areSpecializationsOn,
  calculateSpecializationProgress,
  canSpecializeInto,
  ERAS_BY_ID,
  FEATURES_BY_ID,
  getEraIndex,
  isSpecializationUnlocked,
  listSpecializationChoices,
  SPECIALIZATION_IDS,
  SPECIALIZATIONS_BY_ID,
  UPGRADES_BY_ID,
} from '../engine';
import type { ConditionProgress, EraId, EraRecord, GameState, SpecializationCondition, SpecializationId } from '../engine';
import { escapeHtml } from './dom';

/**
 * Specializations on screen: the whole list with progress, at the top of the Build tab from the first minute (the
 * unlocks are feature levels, and Build is where you raise them); the choice in the relaunch story; and in the
 * ending, what your site became. Only the web specialization test build shows any of it.
 */

function conditionEra(condition: SpecializationCondition): EraId {
  return condition.kind === 'feature-level' ? FEATURES_BY_ID[condition.featureId].eraId : UPGRADES_BY_ID[condition.upgradeId].eraId;
}

/** The latest era a specialization's conditions come from: before it, the route can't be built yet. */
function findUnlockEra(specializationId: SpecializationId): EraId {
  const eras = SPECIALIZATIONS_BY_ID[specializationId].unlock.map(conditionEra);
  return eras.reduce<EraId>((latest, eraId) => (getEraIndex(eraId) > getEraIndex(latest) ? eraId : latest), 'homepage-1997');
}

function renderCondition(progress: ConditionProgress): string {
  const shown = Math.min(progress.current, progress.target);
  const amount = progress.condition.kind === 'skill' ? '' : ` ${shown}/${progress.target}`;
  return `<span class="spec-condition${progress.isMet ? ' is-met' : ''}">${escapeHtml(progress.label)}${amount}${progress.isMet ? ' ✓' : ''}</span>`;
}

const ALWAYS_OPEN = '<span class="spec-condition is-met">Always open</span>';

function renderConditions(state: GameState, specializationId: SpecializationId): string {
  const progress = calculateSpecializationProgress(state, specializationId);
  return progress.length === 0 ? ALWAYS_OPEN : progress.map(renderCondition).join('');
}

/** "Current", "Unlocked", or for a route whose features come later, the year you can start on it. */
function describeStanding(state: GameState, specializationId: SpecializationId): string {
  const unlockEra = findUnlockEra(specializationId);
  const isLater = getEraIndex(unlockEra) > getEraIndex(state.eraId);
  const standings: readonly [boolean, string][] = [
    [state.specializationId === specializationId, '<span class="spec-badge is-current">Your site now</span>'],
    [isSpecializationUnlocked(state, specializationId), '<span class="spec-badge is-unlocked">Unlocked</span>'],
    [isLater, `<span class="spec-badge is-later">Builds in ${ERAS_BY_ID[unlockEra].year}</span>`],
  ];
  const found = standings.find(([applies]) => applies);
  return found === undefined ? '' : found[1];
}

function renderCard(state: GameState, specializationId: SpecializationId): string {
  const route = SPECIALIZATIONS_BY_ID[specializationId];
  const classes = [isSpecializationUnlocked(state, specializationId) ? 'is-unlocked' : '', state.specializationId === specializationId ? 'is-current' : ''].filter((name) => name !== '').join(' ');
  return `<li class="spec-card ${classes}" data-specialization="${specializationId}">
    <span class="spec-icon" aria-hidden="true">${route.icon}</span>
    <div class="spec-info">
      <h4 class="spec-name">${escapeHtml(route.name)} ${describeStanding(state, specializationId)}</h4>
      <p class="spec-pitch">${escapeHtml(route.pitch)}</p>
      <p class="spec-money">${escapeHtml(route.money)}</p>
      <p class="spec-conditions">${renderConditions(state, specializationId)}</p>
    </div>
  </li>`;
}

function countUnlocked(state: GameState): number {
  return SPECIALIZATION_IDS.filter((id) => id !== 'homepage' && isSpecializationUnlocked(state, id)).length;
}

const INTRO = 'What your site can become. Each one takes commitment: its features far past what the checklist asks, money that isn’t going elsewhere. Pick one or two to work towards. From the relaunch out of 2005 on, every relaunch lets you specialize, or specialize again, into any you’ve unlocked this run.';

/** The list at the top of the Build tab. Folds away, and remembers that it did. */
export function renderSpecializationPanel(state: GameState, isOpen: boolean): string {
  if (!areSpecializationsOn(state)) return '';
  const others = SPECIALIZATION_IDS.length - 1;
  return `<details class="spec-panel"${isOpen ? ' open' : ''}>
    <summary class="spec-summary" data-action="toggle-specializations"><span class="spec-title">Specializations</span><span class="spec-count">${countUnlocked(state)} of ${others} unlocked</span></summary>
    <p class="spec-intro">${escapeHtml(INTRO)}</p>
    <ul class="spec-list">${SPECIALIZATION_IDS.map((id) => renderCard(state, id)).join('')}</ul>
  </details>`;
}

function renderChoiceCard(specializationId: SpecializationId, selected: SpecializationId): string {
  const route = SPECIALIZATIONS_BY_ID[specializationId];
  const isSelected = specializationId === selected;
  return `<button type="button" class="spec-choice${isSelected ? ' is-selected' : ''}" data-action="choose-specialization" data-id="${specializationId}" aria-pressed="${isSelected}">
    <span class="spec-choice-icon" aria-hidden="true">${route.icon}</span><b>${escapeHtml(route.name)}</b><span class="spec-choice-money">${escapeHtml(route.money)}</span>
  </button>`;
}

/** In the relaunch story: what the site becomes in the era it's entering. Only routes unlocked this run. */
export function renderSpecializationChoice(state: GameState, nextEraId: EraId, selected: SpecializationId): string {
  if (!canSpecializeInto(state, nextEraId)) return '';
  const choices = listSpecializationChoices(state);
  const locked = SPECIALIZATION_IDS.length - choices.length;
  const lockedNote = locked > 0 ? `<p class="spec-choice-note">${locked} more you haven’t unlocked this run: see them at the top of the Build tab.</p>` : '';
  return `<section class="spec-choices" aria-label="Specialize">
    <h3 class="spec-choices-title">What does your site become in ${ERAS_BY_ID[nextEraId].year}?</h3>
    <div class="spec-choice-list">${choices.map((id) => renderChoiceCard(id, selected)).join('')}</div>
    ${lockedNote}
  </section>`;
}

/**
 * "a photo-sharing site, then a social network": each specialization the site has been, in order, once each, from the
 * first one. Every site starts as a homepage; going back to being one later counts.
 */
function listPath(records: readonly EraRecord[], current: SpecializationId): readonly SpecializationId[] {
  const all = [...records.map((record) => record.site.specializationId), current];
  const firstSpecialized = all.findIndex((id) => id !== 'homepage');
  const path = firstSpecialized < 0 ? [] : all.slice(firstSpecialized);
  return path.filter((id, index) => path[index - 1] !== id);
}

/** In the ending's path, a homepage comes after something else: it's a homepage again. */
function namePathStep(specializationId: SpecializationId): string {
  return specializationId === 'homepage' ? 'a homepage again' : ARTICLES[specializationId];
}

const ARTICLES: Readonly<Record<SpecializationId, string>> = {
  homepage: 'a homepage',
  photos: 'a photo-sharing site',
  video: 'a video site',
  microblog: 'a microblog',
  news: 'a news site',
  reviews: 'a reviews site',
  social: 'a social network',
  streaming: 'a live-streaming site',
  shop: 'an online shop',
};

/** The ending's line about what the homepage became; nothing for a site that stayed a homepage. */
export function describeSpecializationPath(state: GameState): string {
  const path = listPath(state.eraRecords, state.specializationId);
  if (!areSpecializationsOn(state) || path.length === 0) return '';
  return `Your homepage became ${path.map(namePathStep).join(', then ')}.`;
}

/** "a video site", for the news when the site specializes. */
export function describeSpecialization(specializationId: SpecializationId): string {
  return ARTICLES[specializationId];
}
