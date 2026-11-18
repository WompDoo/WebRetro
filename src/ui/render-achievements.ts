import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_CATEGORY_NAMES, ACHIEVEMENT_CATEGORY_REVEALS, ACHIEVEMENT_IDS, ACHIEVEMENTS_BY_ID, ERAS_BY_ID, isAchievementRevealed, isRevealReached, SPECIALIZATIONS_BY_ID, TREE_IDS } from '../engine';
import type { AchievementCategory, AchievementDefinition, AchievementId, GameState, LegacyState, SpecializationId } from '../engine';
import { escapeHtml } from './dom';

/**
 * The achievements window: one wide window of small square tiles, a row per kind, with the specializations found
 * below. Hovering a tile shows what it is; tapping or clicking one puts it in the bar underneath, since a phone has no
 * hover. Nothing spoils what's ahead: an achievement whose mechanic hasn't shown up yet is a blurred tile, a secret one
 * is a "?" until earned, and the specializations wait for the run that brings them.
 */

const SPECIALIZATION_PREFIX = 'spec:';
const DETAIL_HINT = 'Hover or tap a tile to see what it is.';
const HIDDEN_ROW_TITLE = '???';

/** How a tile shows: earned, not yet revealed (blurred), secret ("?"), or plain locked. */
type TileLook = 'earned' | 'hidden' | 'secret' | 'locked';

/** What a tile shows: an achievement's own icon, name and description, or stand-ins for them. */
type TileText = Pick<AchievementDefinition, 'icon' | 'name' | 'description'>;

function isEarned(legacy: LegacyState, id: AchievementId): boolean {
  return legacy.achievementIds.includes(id);
}

function findUnearnedLook(state: GameState, legacy: LegacyState, id: AchievementId): TileLook {
  if (!isAchievementRevealed(id, state, legacy)) return 'hidden';
  return ACHIEVEMENTS_BY_ID[id].isSecret ? 'secret' : 'locked';
}

function findTileLook(state: GameState, legacy: LegacyState, id: AchievementId): TileLook {
  return isEarned(legacy, id) ? 'earned' : findUnearnedLook(state, legacy, id);
}

const SHOWN_TEXT: Readonly<Record<TileLook, (id: AchievementId) => TileText>> = {
  earned: (id) => ACHIEVEMENTS_BY_ID[id],
  locked: (id) => ACHIEVEMENTS_BY_ID[id],
  secret: () => ({ icon: '?', name: 'Secret', description: '???' }),
  // The icon stays, blurred past reading: a hint that something is there.
  hidden: (id) => ({ icon: ACHIEVEMENTS_BY_ID[id].icon, name: 'Not yet revealed', description: 'Keep playing: this one shows once you’ve got further.' }),
};

const TILE_CLASSES: Readonly<Record<TileLook, string>> = { earned: ' is-earned', hidden: ' is-hidden', secret: ' is-secret', locked: '' };

function describeStatus(legacy: LegacyState, id: AchievementId): string {
  return isEarned(legacy, id) ? 'Earned' : 'Not yet';
}

function renderTile(id: string, icon: string, classes: string, tip: string): string {
  return `<button type="button" class="badge${classes}" data-action="achievement-detail" data-id="${escapeHtml(id)}"><span class="badge-icon" aria-hidden="true">${icon}</span><span class="badge-tip" hidden>${tip}</span></button>`;
}

function describeAchievement(state: GameState, legacy: LegacyState, id: AchievementId): string {
  const shown = SHOWN_TEXT[findTileLook(state, legacy, id)](id);
  return `<b>${escapeHtml(shown.name)}</b> ${escapeHtml(shown.description)} <i>${describeStatus(legacy, id)}</i>`;
}

function renderAchievementTile(state: GameState, legacy: LegacyState, id: AchievementId): string {
  const look = findTileLook(state, legacy, id);
  return renderTile(id, SHOWN_TEXT[look](id).icon, TILE_CLASSES[look], describeAchievement(state, legacy, id));
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

/** The tree's row doesn't give its name away before the run that brings it; every other kind's name is no spoiler. */
function findRowTitle(state: GameState, legacy: LegacyState, category: AchievementCategory): string {
  const isNamed = isRevealReached(ACHIEVEMENT_CATEGORY_REVEALS[category] ?? 'start', state, legacy);
  return isNamed ? ACHIEVEMENT_CATEGORY_NAMES[category] : HIDDEN_ROW_TITLE;
}

function renderCategoryRow(state: GameState, legacy: LegacyState, category: AchievementCategory): string {
  const ids = listOfCategory(category);
  const earned = ids.filter((id) => isEarned(legacy, id)).length;
  return renderRow(findRowTitle(state, legacy, category), `${earned}/${ids.length}`, ids.map((id) => renderAchievementTile(state, legacy, id)).join(''));
}

export function countEarnedAchievements(legacy: LegacyState): number {
  return ACHIEVEMENT_IDS.filter((id) => isEarned(legacy, id)).length;
}

export function countFoundSpecializations(legacy: LegacyState): number {
  return TREE_IDS.filter((id) => isFound(legacy, id)).length;
}

/** The collection comes with the run that brings specializations. */
function renderSpecializationsRow(state: GameState, legacy: LegacyState): string {
  if (!isRevealReached('run-2', state, legacy)) return '';
  const listed = TREE_IDS.filter((id) => isListed(legacy, id));
  return renderRow('Specializations found', `${countFoundSpecializations(legacy)}/${TREE_IDS.length}`, listed.map((id) => renderSpecializationTile(legacy, id)).join(''));
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
export function renderBadgeDetail(state: GameState, legacy: LegacyState, id: string): string {
  return isAchievementId(id) ? describeAchievement(state, legacy, id) : describeSpecializationById(legacy, id);
}

/** A run the playtest tools changed earns nothing: the window says so, rather than looking broken. */
function renderPlaytestNotice(state: GameState): string {
  return state.runStats.usedPlaytest
    ? '<p class="achievements-notice">🧪 This run used the playtest tools, so it doesn’t earn achievements. Your next run does.</p>'
    : '';
}

export function renderAchievementsPage(state: GameState, legacy: LegacyState): string {
  const rows = ACHIEVEMENT_CATEGORIES.map((category) => renderCategoryRow(state, legacy, category)).join('');
  return `<header class="achievements-head"><h2 id="achievements-heading">Achievements</h2><span class="achievements-total">${countEarnedAchievements(legacy)} / ${ACHIEVEMENT_IDS.length} earned</span><button type="button" class="ghost-button" data-action="close-achievements">Close</button></header>
    ${renderPlaytestNotice(state)}<div class="badge-rows">${rows}${renderSpecializationsRow(state, legacy)}</div>
    <p class="badge-detail" data-achievement-detail>${DETAIL_HINT}</p>`;
}
