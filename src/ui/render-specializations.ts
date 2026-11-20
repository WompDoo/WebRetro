import {
  areSpecializationsOn,
  calculateSpecializationProgress,
  canChooseSpecialization,
  ERAS_BY_ID,
  FEATURES_BY_ID,
  findSpecializationOfEra,
  getEraIndex,
  isSpecializationInView,
  isSpecializationUnlocked,
  isSpecializedEra,
  listOpenedBy,
  listOpenSpecializations,
  listOutOfReach,
  SPECIALIZATION_ITEMS,
  SPECIALIZATIONS_BY_ID,
  UPGRADES_BY_ID,
  TREE_IDS,
} from '../engine';
import type { ConditionProgress, EraId, GameState, SpecializationId } from '../engine';
import { escapeHtml } from './dom';

/**
 * Specializations on screen (from the second run): the Specialize tab, from the start of 2005; the
 * screen that asks before you choose; a warning at the relaunch if you're leaving one unchosen; and in the ending,
 * what your site became.
 *
 * The tab shows only what's in view: a specialization appears when you're half way to its first condition (or you
 * found it in an earlier run). The choice screen is the exception: it names one or two others still possible this
 * era, so the first one you reach isn't the only one you know about.
 */

const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;
const FIRST_SPECIALIZED_ERA: EraId = 'web2-2005';
const ALTERNATIVES_SHOWN = 2;

function eraLabel(eraId: EraId): string {
  return `${ERAS_BY_ID[eraId].year}`;
}

function percent(share: number): string {
  return `${Math.round(share * PERCENT)}%`;
}

function minutesAndSeconds(minutes: number): string {
  const totalSeconds = Math.floor(minutes * SECONDS_PER_MINUTE);
  return `${Math.floor(totalSeconds / SECONDS_PER_MINUTE)}:${String(totalSeconds % SECONDS_PER_MINUTE).padStart(2, '0')}`;
}

/** How far along, in the condition's own terms: "23% now", "2/5", "now 3.4 s". */
const AMOUNTS: Readonly<Record<ConditionProgress['unit'], (progress: ConditionProgress) => string>> = {
  level: (progress) => `${Math.min(progress.current, progress.target)}/${progress.target}`,
  share: (progress) => `now ${percent(progress.current)}`,
  count: (progress) => `${Math.min(progress.current, progress.target)}/${progress.target}`,
  flag: () => '',
  seconds: (progress) => `now ${progress.current.toFixed(1)} s`,
  minutes: (progress) => `${minutesAndSeconds(Math.min(progress.current, progress.target))} of ${progress.target}:00`,
  ads: (progress) => `now ${progress.current}`,
};

function renderCondition(progress: ConditionProgress): string {
  const amount = progress.isMet ? '✓' : AMOUNTS[progress.unit](progress);
  return `<li class="spec-condition${progress.isMet ? ' is-met' : ''}"><span>${escapeHtml(progress.label)}</span><span class="spec-condition-amount">${escapeHtml(amount)}</span></li>`;
}

function renderConditions(state: GameState, specializationId: SpecializationId): string {
  return `<ul class="spec-conditions">${calculateSpecializationProgress(state, specializationId).map(renderCondition).join('')}</ul>`;
}

/** The tab shows from 2005 in the second run on: the big draw of the run, so it's there from the start. */
export function isSpecializeTabShown(state: GameState): boolean {
  return areSpecializationsOn(state) && getEraIndex(ERAS_BY_ID[state.eraId].baseEraId) >= getEraIndex(FIRST_SPECIALIZED_ERA);
}

function listFound(state: GameState, foundIds: readonly SpecializationId[]): readonly SpecializationId[] {
  return TREE_IDS.filter((id) => foundIds.includes(id) || isSpecializationUnlocked(state, id));
}

/** The tree's size as the player knows it: the open ones, plus any secret already found. */
function countKnown(found: readonly SpecializationId[]): number {
  return TREE_IDS.filter((id) => !SPECIALIZATIONS_BY_ID[id].isSecret || found.includes(id)).length;
}

function describeArticle(specializationId: SpecializationId): string {
  const name = SPECIALIZATIONS_BY_ID[specializationId].name.toLowerCase();
  return /^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`;
}

function renderStack(state: GameState): string {
  if (state.specializationIds.length === 0) return '<p class="spec-stack is-empty">Your site: a homepage, as always.</p>';
  const items = state.specializationIds.map((id) => {
    const definition = SPECIALIZATIONS_BY_ID[id];
    return `<li class="spec-stack-item"><span aria-hidden="true">${definition.icon}</span> ${escapeHtml(definition.name)} <span class="spec-stack-year">${eraLabel(definition.eraId)}</span></li>`;
  });
  return `<div class="spec-stack"><span class="spec-stack-label">Your site:</span><ol class="spec-stack-list">${items.join('')}</ol></div>`;
}

function renderChooseButton(state: GameState, specializationId: SpecializationId): string {
  return canChooseSpecialization(state, specializationId)
    ? `<button type="button" class="buy-button spec-choose" data-action="open-specialization" data-id="${specializationId}">Choose…</button>`
    : '<span class="spec-not-yet">Not yet</span>';
}

function renderCard(state: GameState, specializationId: SpecializationId): string {
  const definition = SPECIALIZATIONS_BY_ID[specializationId];
  const parents = definition.parents.length === 0 ? '' : `<p class="spec-lineage">Grows out of: ${definition.parents.map((id) => escapeHtml(SPECIALIZATIONS_BY_ID[id].name)).join(' or ')}</p>`;
  return `<article class="spec-card${isSpecializationUnlocked(state, specializationId) ? ' is-unlocked' : ''}" data-specialization="${specializationId}">
    <span class="spec-icon" aria-hidden="true">${definition.icon}</span>
    <div class="spec-info">
      <h4 class="spec-name">${escapeHtml(definition.name)}</h4>
      <p class="spec-pitch">${escapeHtml(definition.pitch)}</p>
      <p class="spec-money">${escapeHtml(definition.money)}</p>
      ${parents}
      ${renderConditions(state, specializationId)}
    </div>
    ${renderChooseButton(state, specializationId)}
  </article>`;
}

const HOW_IT_WORKS =
  'Each era from 2005 can make your site something more: one specialization per era, free, for good, and they stack. ' +
  'They take commitment: put a big share of what you build this era into one feature, give something up, or pull something off. ' +
  'A specialization comes into view here when you’re half way there.';

function renderEraSection(state: GameState, foundIds: readonly SpecializationId[]): string {
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  const chosen = findSpecializationOfEra(state, eraId);
  if (chosen !== null) return `<p class="spec-era-note">Your site became ${escapeHtml(describeArticle(chosen))} this era. The next chance comes with the next era.</p>`;
  const inView = TREE_IDS.filter((id) => isSpecializationInView(state, id, foundIds));
  if (inView.length === 0) return '<p class="spec-era-note">Nothing in view yet. Lean on one thing, and see what your site starts to become.</p>';
  return inView.map((id) => renderCard(state, id)).join('');
}

/** The Specialize tab: how it works, what the site has become, and this era's specializations in view. */
export function renderSpecializeTab(state: GameState, foundIds: readonly SpecializationId[]): string {
  const found = listFound(state, foundIds);
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  return `<section class="spec-tab">
    <header class="spec-tab-head"><b class="spec-tab-title">Specializations</b><span class="spec-found">Found ${found.length}/${countKnown(found)}</span></header>
    <p class="spec-intro">${escapeHtml(HOW_IT_WORKS)}</p>
    ${renderStack(state)}
    <h3 class="shop-group-title">${eraLabel(eraId)} · ${escapeHtml(ERAS_BY_ID[eraId].name)}</h3>
    ${renderEraSection(state, foundIds)}
  </section>`;
}

/** Unlocked and not yet chosen: the tab's badge. */
export function countChoosable(state: GameState): number {
  return TREE_IDS.filter((id) => canChooseSpecialization(state, id)).length;
}

/** What the tab's markup depends on: what's in view and roughly how far along, so it redraws as you get closer. */
export function calculateSpecializeTabSignature(state: GameState, foundIds: readonly SpecializationId[]): string {
  if (!isSpecializeTabShown(state)) return 'hidden';
  const steps = TREE_IDS.filter((id) => isSpecializationInView(state, id, foundIds)).map(
    (id) => `${id}:${calculateSpecializationProgress(state, id).map((progress) => `${Math.round(progress.ratio * PERCENT)}${progress.isMet ? '!' : ''}`).join('.')}`,
  );
  return [state.eraId, state.specializationIds.join(','), state.unlockedSpecializationIds.join(','), foundIds.join(','), ...steps].join('|');
}

// ---------- The choice screen ----------

function listNames(ids: readonly SpecializationId[]): string {
  return ids.map((id) => `${SPECIALIZATIONS_BY_ID[id].icon} ${escapeHtml(SPECIALIZATIONS_BY_ID[id].name)}`).join(', ');
}

function describeAdLimit(count: number): string {
  return count === 0 ? 'Your site runs no ads at all, for good.' : `Your site keeps to at most ${count} ads, for good.`;
}

/** Its sacrifice, kept: a feature switched off for good, or few ads. */
function describeRestriction(specializationId: SpecializationId): string {
  const { restriction } = SPECIALIZATIONS_BY_ID[specializationId];
  if (restriction === null) return '';
  return restriction.kind === 'max-ads' ? describeAdLimit(restriction.count) : `${escapeHtml(FEATURES_BY_ID[restriction.featureId].name)} stays switched off, for good.`;
}

function renderCloses(state: GameState, specializationId: SpecializationId): string {
  const definition = SPECIALIZATIONS_BY_ID[specializationId];
  const outOfReach = listOutOfReach(state, specializationId);
  const lines = [
    `No other ${eraLabel(definition.eraId)} specialization this run.`,
    describeRestriction(specializationId),
    outOfReach.length === 0 ? '' : `Out of reach later: ${listNames(outOfReach)}.`,
  ].filter((line) => line !== '');
  return `<ul class="spec-choice-list">${lines.map((line) => `<li>${line}</li>`).join('')}</ul>`;
}

function renderOpens(specializationId: SpecializationId): string {
  const opened = listOpenedBy(specializationId);
  return opened.length === 0 ? '<p>Nothing in particular: the open doors stay open.</p>' : `<p>${listNames(opened)}</p>`;
}

function renderAlternative(state: GameState, specializationId: SpecializationId): string {
  const progress = calculateSpecializationProgress(state, specializationId);
  const nearness = progress.reduce((sum, condition) => sum + condition.ratio, 0) / Math.max(1, progress.length);
  return `<li class="spec-alternative"><span aria-hidden="true">${SPECIALIZATIONS_BY_ID[specializationId].icon}</span> <b>${escapeHtml(SPECIALIZATIONS_BY_ID[specializationId].name)}</b> <span class="spec-alternative-near">${percent(nearness)} of the way</span>${renderConditions(state, specializationId)}</li>`;
}

function renderAlternatives(state: GameState, specializationId: SpecializationId): string {
  const others = listOpenSpecializations(state).filter((id) => id !== specializationId).slice(0, ALTERNATIVES_SHOWN);
  return others.length === 0 ? '' : `<h3 class="spec-choice-heading">Still possible this era instead</h3><ul class="spec-alternatives">${others.map((id) => renderAlternative(state, id)).join('')}</ul>`;
}

function describeFocus(state: GameState, specializationId: SpecializationId): string {
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  const plan = isSpecializedEra(eraId) ? SPECIALIZATIONS_BY_ID[specializationId].eras[eraId] : undefined;
  return plan === undefined ? '' : `<li>This era’s checklist asks for ${escapeHtml(FEATURES_BY_ID[plan.focus].name)} level ${plan.level} instead.</li>`;
}

/** Asks before it's for good: what it does, what it closes, what it opens, and what else is possible this era. */
/** What only this kind of site gets: its own skill, feature and upgrades, which stay once it's chosen. */
function describeOwnItems(specializationId: SpecializationId): string {
  if (specializationId === 'homepage') return '';
  const items = SPECIALIZATION_ITEMS[specializationId];
  const upgrades = items.upgrades.map((upgradeId) => UPGRADES_BY_ID[upgradeId].name).join(' and ');
  return `<li>Only for sites like this: learn ${escapeHtml(UPGRADES_BY_ID[items.learn].name.replace(/^Learn /, ''))}, build ${escapeHtml(FEATURES_BY_ID[items.build].name)}, and get ${escapeHtml(upgrades)}.</li>`;
}

export function renderSpecializationChoiceScreen(state: GameState, specializationId: SpecializationId): string {
  const definition = SPECIALIZATIONS_BY_ID[specializationId];
  return `<h2 id="spec-choice-heading"><span aria-hidden="true">${definition.icon}</span> Become ${escapeHtml(describeArticle(specializationId))}?</h2>
    <p>${escapeHtml(definition.pitch)}</p>
    <h3 class="spec-choice-heading">What it does</h3>
    <ul class="spec-choice-list"><li>${escapeHtml(definition.money)}</li>${describeFocus(state, specializationId)}${describeOwnItems(specializationId)}<li>It takes effect at once, costs nothing, and lasts the rest of the run.</li></ul>
    <h3 class="spec-choice-heading">What it closes</h3>
    ${renderCloses(state, specializationId)}
    <h3 class="spec-choice-heading">What it opens later</h3>
    ${renderOpens(specializationId)}
    ${renderAlternatives(state, specializationId)}
    <div class="overlay-actions">
      <button type="button" class="ghost-button" data-action="cancel-specialization">Not yet</button>
      <button type="button" class="primary-button" data-action="confirm-specialization" data-id="${specializationId}">Become ${escapeHtml(describeArticle(specializationId))}</button>
    </div>`;
}

/** At the relaunch: a specialization unlocked this era and not chosen closes with it. */
export function renderRelaunchWarning(state: GameState): string {
  const waiting = TREE_IDS.filter((id) => canChooseSpecialization(state, id));
  return waiting.length === 0
    ? ''
    : `<p class="spec-relaunch-warning">You haven’t specialized this era. Relaunching closes ${listNames(waiting)}: choose in the Specialize tab first, or let ${waiting.length === 1 ? 'it' : 'them'} go.</p>`;
}

// ---------- The ending ----------

/** The ending's line about what the homepage became; nothing for a site that stayed a homepage. */
export function describeSpecializationPath(state: GameState): string {
  const steps = state.specializationIds.map((id) => `${describeArticle(id)} in ${eraLabel(SPECIALIZATIONS_BY_ID[id].eraId)}`);
  return steps.length === 0 ? '' : `Your homepage became ${steps.join(', then ')}.`;
}
