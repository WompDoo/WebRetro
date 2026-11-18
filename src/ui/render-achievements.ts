import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_NAMES, ACHIEVEMENT_IDS, ACHIEVEMENTS_BY_ID, ERAS_BY_ID, SPECIALIZATIONS_BY_ID, TREE_IDS } from '../engine';
import type { AchievementCategory, AchievementId, GameState, LegacyState, SpecializationId } from '../engine';
import { escapeHtml } from './dom';

/**
 * The achievements window: one wide window of small square tiles, a row per kind, with the specializations found
 * below. Hovering a tile shows what it is; tapping or clicking one puts it in the bar underneath, since a phone has no
 * hover. A secret achievement is a "?" until earned, and a secret specialization isn't there at all until found.
 */

const SPECIALIZATION_PREFIX = 'spec:';
const DETAIL_HINT = 'Hover or tap a tile to see what it is.';

function isEarned(legacy: LegacyState, id: AchievementId): boolean {
  return legacy.achievementIds.includes(id);
}

function isHidden(legacy: LegacyState, id: AchievementId): boolean {
  return ACHIEVEMENTS_BY_ID[id].isSecret && !isEarned(legacy, id);
}

function findShownName(legacy: LegacyState, id: AchievementId): string {
  return isHidden(legacy, id) ? 'Secret' : ACHIEVEMENTS_BY_ID[id].name;
}

function findShownText(legacy: LegacyState, id: AchievementId): string {
  return isHidden(legacy, id) ? '???' : ACHIEVEMENTS_BY_ID[id].description;
}

function findShownIcon(legacy: LegacyState, id: AchievementId): string {
  return isHidden(legacy, id) ? '?' : ACHIEVEMENTS_BY_ID[id].icon;
}

function describeStatus(legacy: LegacyState, id: AchievementId): string {
  return isEarned(legacy, id) ? 'Earned' : 'Not yet';
}

function renderTile(id: string, icon: string, classes: string, tip: string): string {
  return `<button type="button" class="badge${classes}" data-action="achievement-detail" data-id="${escapeHtml(id)}"><span class="badge-icon" aria-hidden="true">${icon}</span><span class="badge-tip" role="tooltip">${tip}</span></button>`;
}

function renderAchievementTile(legacy: LegacyState, id: AchievementId): string {
  const classes = `${isEarned(legacy, id) ? ' is-earned' : ''}${isHidden(legacy, id) ? ' is-secret' : ''}`;
  return renderTile(id, findShownIcon(legacy, id), classes, describeAchievement(legacy, id));
}

function describeAchievement(legacy: LegacyState, id: AchievementId): string {
  return `<b>${escapeHtml(findShownName(legacy, id))}</b> ${escapeHtml(findShownText(legacy, id))} <i>${describeStatus(legacy, id)}</i>`;
}

function isFound(legacy: LegacyState, id: SpecializationId): boolean {
  return legacy.foundSpecializationIds.includes(id);
}

/** A secret one isn't even a "?" until found: the count says there are more. */
function isListed(legacy: LegacyState, id: SpecializationId): boolean {
  return isFound(legacy, id) || !SPECIALIZATIONS_BY_ID[id].isSecret;
}

function describeSpecialization(legacy: LegacyState, id: SpecializationId): string {
  const definition = SPECIALIZATIONS_BY_ID[id];
  const year = ERAS_BY_ID[definition.eraId].year;
  return isFound(legacy, id)
    ? `<b>${escapeHtml(definition.name)}</b> ${escapeHtml(definition.pitch)} <i>Found · ${year}</i>`
    : `<b>Not found yet</b> A specialization of ${year}. Lean into something that year and see. <i>${year}</i>`;
}

function renderSpecializationTile(legacy: LegacyState, id: SpecializationId): string {
  const found = isFound(legacy, id);
  return renderTile(`${SPECIALIZATION_PREFIX}${id}`, found ? SPECIALIZATIONS_BY_ID[id].icon : '?', found ? ' is-earned' : '', describeSpecialization(legacy, id));
}

function listOfCategory(category: AchievementCategory): readonly AchievementId[] {
  return ACHIEVEMENT_IDS.filter((id) => ACHIEVEMENTS_BY_ID[id].category === category);
}

function renderRow(title: string, count: string, tiles: string): string {
  return `<div class="badge-row"><h3 class="badge-row-title">${escapeHtml(title)} <span>${count}</span></h3><div class="badge-grid">${tiles}</div></div>`;
}

function renderCategoryRow(legacy: LegacyState, category: AchievementCategory): string {
  const ids = listOfCategory(category);
  const earned = ids.filter((id) => isEarned(legacy, id)).length;
  return renderRow(ACHIEVEMENT_CATEGORY_NAMES[category], `${earned}/${ids.length}`, ids.map((id) => renderAchievementTile(legacy, id)).join(''));
}

export function countEarnedAchievements(legacy: LegacyState): number {
  return ACHIEVEMENT_IDS.filter((id) => isEarned(legacy, id)).length;
}

export function countFoundSpecializations(legacy: LegacyState): number {
  return TREE_IDS.filter((id) => isFound(legacy, id)).length;
}

function isAchievementId(id: string): id is AchievementId {
  return (ACHIEVEMENT_IDS as readonly string[]).includes(id);
}

function isSpecializationId(id: string): id is SpecializationId {
  return (TREE_IDS as readonly string[]).includes(id);
}

function describeSpecializationById(legacy: LegacyState, id: string): string {
  const specializationId = id.slice(SPECIALIZATION_PREFIX.length);
  return isSpecializationId(specializationId) ? describeSpecialization(legacy, specializationId) : DETAIL_HINT;
}

/** The bar under the tiles: what the tapped tile is. */
export function renderBadgeDetail(legacy: LegacyState, id: string): string {
  return isAchievementId(id) ? describeAchievement(legacy, id) : describeSpecializationById(legacy, id);
}

export function renderAchievementsPage(_state: GameState, legacy: LegacyState): string {
  const rows = ACHIEVEMENT_CATEGORIES.map((category) => renderCategoryRow(legacy, category)).join('');
  const listed = TREE_IDS.filter((id) => isListed(legacy, id));
  const specializations = renderRow('Specializations found', `${countFoundSpecializations(legacy)}/${TREE_IDS.length}`, listed.map((id) => renderSpecializationTile(legacy, id)).join(''));
  return `<header class="achievements-head"><h2 id="achievements-heading">Achievements</h2><span class="achievements-total">${countEarnedAchievements(legacy)} / ${ACHIEVEMENT_IDS.length} earned</span><button type="button" class="ghost-button" data-action="close-achievements">Close</button></header>
    <div class="badge-rows">${rows}${specializations}</div>
    <p class="badge-detail" data-achievement-detail>${DETAIL_HINT}</p>`;
}
