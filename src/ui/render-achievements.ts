import { ACHIEVEMENT_IDS, ACHIEVEMENTS_BY_ID, ERAS_BY_ID, SPECIALIZATIONS_BY_ID, TREE_IDS } from '../engine';
import type { AchievementId, GameState, LegacyState, SpecializationId } from '../engine';
import { escapeHtml } from './dom';

/**
 * The achievements page: what you've done, and the specializations you've found, across every run in this browser.
 * Earned feats show what they were for; the rest show what they ask, except the secret ones, which keep their icon
 * and a "???". Found specializations show their name; the rest a question mark and their era, and secret ones nothing
 * at all until found.
 */

function isEarned(legacy: LegacyState, id: AchievementId): boolean {
  return legacy.achievementIds.includes(id);
}

function describeLocked(id: AchievementId): string {
  return ACHIEVEMENTS_BY_ID[id].isSecret ? '???' : ACHIEVEMENTS_BY_ID[id].description;
}

function findShownName(legacy: LegacyState, id: AchievementId): string {
  return isEarned(legacy, id) || !ACHIEVEMENTS_BY_ID[id].isSecret ? ACHIEVEMENTS_BY_ID[id].name : 'Secret';
}

function findShownText(legacy: LegacyState, id: AchievementId): string {
  return isEarned(legacy, id) ? ACHIEVEMENTS_BY_ID[id].description : describeLocked(id);
}

function renderAchievement(legacy: LegacyState, id: AchievementId): string {
  const earnedClass = isEarned(legacy, id) ? ' is-earned' : '';
  const text = `<b>${escapeHtml(findShownName(legacy, id))}</b><span>${escapeHtml(findShownText(legacy, id))}</span>`;
  return `<li class="achievement${earnedClass}"><span class="achievement-icon" aria-hidden="true">${ACHIEVEMENTS_BY_ID[id].icon}</span><span class="achievement-text">${text}</span></li>`;
}

function isFound(legacy: LegacyState, id: SpecializationId): boolean {
  return legacy.foundSpecializationIds.includes(id);
}

/** A secret one isn't even a question mark until found: the count says there are more. */
function isShownInCollection(legacy: LegacyState, id: SpecializationId): boolean {
  return isFound(legacy, id) || !SPECIALIZATIONS_BY_ID[id].isSecret;
}

function renderSpecialization(legacy: LegacyState, id: SpecializationId): string {
  const definition = SPECIALIZATIONS_BY_ID[id];
  const year = ERAS_BY_ID[definition.eraId].year;
  return isFound(legacy, id)
    ? `<li class="collection-card is-found"><span class="collection-icon" aria-hidden="true">${definition.icon}</span><b>${escapeHtml(definition.name)}</b><span>${year}</span></li>`
    : `<li class="collection-card"><span class="collection-icon" aria-hidden="true">?</span><b>Not found yet</b><span>${year}</span></li>`;
}

export function countEarnedAchievements(legacy: LegacyState): number {
  return ACHIEVEMENT_IDS.filter((id) => isEarned(legacy, id)).length;
}

export function countFoundSpecializations(legacy: LegacyState): number {
  return TREE_IDS.filter((id) => isFound(legacy, id)).length;
}

export function renderAchievementsPage(_state: GameState, legacy: LegacyState): string {
  const achievements = ACHIEVEMENT_IDS.map((id) => renderAchievement(legacy, id)).join('');
  const collection = TREE_IDS.filter((id) => isShownInCollection(legacy, id)).map((id) => renderSpecialization(legacy, id)).join('');
  return `<h2 id="achievements-heading">Achievements</h2>
    <p class="achievements-intro">Everything you’ve done, in every run on this browser. Earned for good.</p>
    <h3 class="achievements-section">Feats <span class="achievements-count">${countEarnedAchievements(legacy)} / ${ACHIEVEMENT_IDS.length}</span></h3>
    <ul class="achievement-list">${achievements}</ul>
    <h3 class="achievements-section">Specializations found <span class="achievements-count">${countFoundSpecializations(legacy)} / ${TREE_IDS.length}</span></h3>
    <ul class="collection-grid">${collection}</ul>
    <div class="overlay-actions"><button type="button" class="primary-button" data-action="close-achievements">Back to the site</button></div>`;
}
