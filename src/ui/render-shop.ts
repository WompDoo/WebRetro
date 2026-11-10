import {
  calculateAdAnnoyancePerAd,
  calculateAdTrafficFactor,
  calculateAdValuePerAd,
  calculateFeatureVisitorsPerLevel,
  calculateFeatureVisitorsPerSecond,
  calculateGlobalTrafficFactor,
  calculateNextAdCost,
  calculateNextFeatureCost,
  calculateRevenuePerVisitor,
  calculateServerLoad,
  canUpgradeHosting,
  canUseAds,
  DEFENSES_BY_ID,
  getHostingTier,
  getNextHostingTier,
  ERA_IDS,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  formatCompactNumber,
  formatMoney,
  formatPercent,
  getAvailableSkillIds,
  getFeatureDisplayName,
  getRevealedBoostIds,
  getUnlockedDefenseIds,
  getUnlockedFeatureIds,
  isEraUnlocked,
  isFeatureBuildable,
  UPGRADES_BY_ID,
} from '../engine';
import type { DefenseDefinition, DefenseId, EraId, FeatureId, GameState, UpgradeEffect, UpgradeId } from '../engine';
import { escapeHtml } from './dom';
import { AD_ICON, CODE_ICON, DEFENSE_ICONS, FEATURE_ICONS, LEARN_ICON, SERVER_ICON, UPGRADE_ICON } from './icons';

export type ShopTab = 'learn' | 'build' | 'upgrades' | 'security';

export const SHOP_TABS: readonly ShopTab[] = ['learn', 'build', 'upgrades', 'security'];

const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>> = {
  learn: 'Learn',
  build: 'Build',
  upgrades: 'Upgrades',
  security: 'Ops',
};

const NEUTRAL_FACTOR = 1;

function formatFactor(factor: number): string {
  return `×${Number.isInteger(factor) ? factor : factor.toFixed(2).replace(/0$/, '')}`;
}

function buyButton(action: string, id: string, cost: number, label?: string): string {
  return `<button type="button" class="buy-button" data-action="${action}" data-id="${id}" data-cost="${cost}">${label ?? formatMoney(cost)}</button>`;
}

function lockedButton(): string {
  return '<button type="button" class="buy-button is-locked" disabled>Locked</button>';
}

function skillName(skillId: UpgradeId | null): string {
  return skillId === null ? '' : UPGRADES_BY_ID[skillId].name;
}

// ---------- Build ----------

function renderBuildableEffect(state: GameState, featureId: FeatureId): string {
  const perLevel =
    calculateFeatureVisitorsPerLevel(state, featureId) * calculateGlobalTrafficFactor(state) * calculateAdTrafficFactor(state);
  const currentLine = state.featureLevels[featureId] > 0 ? ` · now ${formatCompactNumber(calculateFeatureVisitorsPerSecond(state, featureId))}/s` : '';
  const definition = FEATURES_BY_ID[featureId];
  const weightKb = state.featureLevels[featureId] > 0 ? definition.pageWeightKbPerLevel : definition.pageWeightKb;
  const weight = weightKb > 0 ? ` · +${weightKb} KB` : '';
  return `<p class="shop-effect">+${formatCompactNumber(perLevel)} visitors/s${currentLine}${weight}</p>`;
}

function renderFeatureRow(state: GameState, featureId: FeatureId): string {
  const level = state.featureLevels[featureId];
  const isBuildable = isFeatureBuildable(state, featureId);
  const levelChip = level > 0 ? `<span class="level-chip">Lv ${level}</span>` : '<span class="level-chip is-new">New</span>';
  const effect = isBuildable
    ? renderBuildableEffect(state, featureId)
    : `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(FEATURES_BY_ID[featureId].requiredSkillId))}</p>`;
  const button = isBuildable ? buyButton('buy-feature', featureId, calculateNextFeatureCost(state, featureId)) : lockedButton();
  return `<article class="shop-row${isBuildable ? '' : ' is-locked'}">
    <div class="shop-icon">${FEATURE_ICONS[featureId]}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(getFeatureDisplayName(featureId, state.eraId))} ${levelChip}</h3>
      <p class="shop-desc">${escapeHtml(FEATURES_BY_ID[featureId].description)}</p>
      ${effect}
    </div>
    ${button}
  </article>`;
}

function renderFeatureGroup(state: GameState, eraId: EraId): string {
  const featureIds = getUnlockedFeatureIds(state).filter((featureId) => FEATURES_BY_ID[featureId].eraId === eraId);
  const era = ERAS_BY_ID[eraId];
  return `<h3 class="shop-group-title">${era.year} · ${escapeHtml(era.name)}</h3>${featureIds.map((featureId) => renderFeatureRow(state, featureId)).join('')}`;
}

function renderBuildTab(state: GameState): string {
  const eras = ERA_IDS.filter((eraId) => isEraUnlocked(state, eraId)).reverse();
  return eras.map((eraId) => renderFeatureGroup(state, eraId)).join('');
}

// ---------- Effects ----------

const EFFECT_DESCRIPTIONS: { readonly [K in UpgradeEffect['kind']]: (effect: Extract<UpgradeEffect, { kind: K }>, eraId: EraId) => string } = {
  'keystroke-value-multiplier': (effect) => `Keystrokes earn ${formatFactor(effect.factor)}`,
  'keystroke-revenue-share': (effect) => `Each keystroke also earns ${formatPercent(effect.share)} of your revenue per second`,
  'bug-chance-reduction': (effect) => `Typo chance −${formatPercent(effect.amount)}`,
  'feature-traffic-multiplier': (effect, eraId) => `${getFeatureDisplayName(effect.featureId, eraId)} traffic ${formatFactor(effect.factor)}`,
  'global-traffic-multiplier': (effect) => `All traffic ${formatFactor(effect.factor)}`,
  'ad-value-multiplier': (effect) => `Ads pay ${formatFactor(effect.factor)}`,
  'ad-annoyance-multiplier': (effect) => `Ads annoy visitors ${formatFactor(effect.factor)}`,
  'page-weight-multiplier': (effect) => `Page weight ${formatFactor(effect.factor)}`,
  'load-time-multiplier': (effect) => `Load time ${formatFactor(effect.factor)}`,
};

export function describeUpgradeEffect(effect: UpgradeEffect, eraId: EraId): string {
  const describe = EFFECT_DESCRIPTIONS[effect.kind] as (value: UpgradeEffect, era: EraId) => string;
  return describe(effect, eraId);
}

function renderVisitedList(state: GameState, upgradeIds: readonly UpgradeId[], title: string): string {
  if (upgradeIds.length === 0) return '';
  const links = upgradeIds
    .map((upgradeId) => `<span class="visited-link" title="${escapeHtml(describeUpgradeEffect(UPGRADES_BY_ID[upgradeId].effect, state.eraId))}">${escapeHtml(UPGRADES_BY_ID[upgradeId].name)}</span>`)
    .join('');
  return `<h3 class="shop-group-title">${escapeHtml(title)}</h3><p class="visited-list">${links}</p>`;
}

// ---------- Learn ----------

function describeUnlocks(state: GameState, skillId: UpgradeId): string {
  const features = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].requiredSkillId === skillId).map((featureId) =>
    getFeatureDisplayName(featureId, state.eraId),
  );
  const unlocksAds = ERAS_BY_ID[state.eraId].adSkillId === skillId ? [`${ERAS_BY_ID[state.eraId].adLabel}s`] : [];
  const unlocked = [...features, ...unlocksAds];
  return unlocked.length === 0 ? '' : `<p class="shop-effect is-unlock">Unlocks: ${escapeHtml(unlocked.join(', '))}</p>`;
}

function describeUpgradeWeight(upgradeId: UpgradeId): string {
  const weightKb = UPGRADES_BY_ID[upgradeId].pageWeightKb;
  return weightKb > 0 ? ` · +${weightKb} KB per page` : '';
}

function renderSkillRow(state: GameState, skillId: UpgradeId): string {
  const skill = UPGRADES_BY_ID[skillId];
  return `<article class="shop-row">
    <div class="shop-icon">${LEARN_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(skill.name)}</h3>
      <p class="shop-desc">${escapeHtml(skill.description)}</p>
      ${describeUnlocks(state, skillId)}
      <p class="shop-effect">${escapeHtml(describeUpgradeEffect(skill.effect, state.eraId) + describeUpgradeWeight(skillId))}</p>
    </div>
    ${buyButton('buy-upgrade', skillId, skill.cost)}
  </article>`;
}

function learnedSkills(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill');
}

function renderLearnTab(state: GameState): string {
  const available = [...getAvailableSkillIds(state)].sort((a, b) => UPGRADES_BY_ID[a].cost - UPGRADES_BY_ID[b].cost);
  const rows = available.length === 0
    ? '<p class="shop-empty">You know everything this era has to teach. Time to relaunch.</p>'
    : available.map((skillId) => renderSkillRow(state, skillId)).join('');
  return `<h3 class="shop-group-title">Curriculum</h3>${rows}${renderVisitedList(state, learnedSkills(state), 'Learned (visited links)')}`;
}

// ---------- Upgrades (boosts) ----------

function isTypingBoost(upgradeId: UpgradeId): boolean {
  const kind = UPGRADES_BY_ID[upgradeId].effect.kind;
  return kind === 'keystroke-value-multiplier' || kind === 'keystroke-revenue-share' || kind === 'bug-chance-reduction';
}

function renderBoostRow(state: GameState, upgradeId: UpgradeId): string {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  return `<article class="shop-row">
    <div class="shop-icon">${isTypingBoost(upgradeId) ? CODE_ICON : UPGRADE_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(upgrade.name)}</h3>
      <p class="shop-desc">${escapeHtml(upgrade.description)}</p>
      <p class="shop-effect">${escapeHtml(describeUpgradeEffect(upgrade.effect, state.eraId) + describeUpgradeWeight(upgradeId))}</p>
    </div>
    ${buyButton('buy-upgrade', upgradeId, upgrade.cost)}
  </article>`;
}

function boughtBoosts(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'boost');
}

function renderUpgradesTab(state: GameState): string {
  const revealed = [...getRevealedBoostIds(state)].sort((a, b) => UPGRADES_BY_ID[a].cost - UPGRADES_BY_ID[b].cost);
  const rows = revealed.length === 0
    ? '<p class="shop-empty">No upgrades yet. Keep earning and new ones will show up here.</p>'
    : revealed.map((upgradeId) => renderBoostRow(state, upgradeId)).join('');
  return `<h3 class="shop-group-title">Available</h3>${rows}${renderVisitedList(state, boughtBoosts(state), 'Bought (visited links)')}`;
}

// ---------- Ads & security ----------

function describeTradeOffs(defense: DefenseDefinition): string {
  const tradeOffs = [
    defense.revenueUpkeepShare > 0 ? `costs ${formatPercent(defense.revenueUpkeepShare)} of revenue` : '',
    defense.adValueFactor < NEUTRAL_FACTOR ? `ads pay ${formatPercent(NEUTRAL_FACTOR - defense.adValueFactor)} less` : '',
    defense.trafficFactor < NEUTRAL_FACTOR ? `${formatPercent(NEUTRAL_FACTOR - defense.trafficFactor)} fewer visitors` : '',
  ].filter((text) => text !== '');
  return `Trade-off while on: ${tradeOffs.join(', ')}`;
}

function renderDefenseControl(state: GameState, defenseId: DefenseId): string {
  if (!state.ownedDefenseIds.includes(defenseId)) return buyButton('buy-defense', defenseId, DEFENSES_BY_ID[defenseId].cost);
  const isOn = state.enabledDefenseIds.includes(defenseId);
  return `<button type="button" class="toggle-button${isOn ? ' is-on' : ''}" data-action="toggle-defense" data-id="${defenseId}" aria-pressed="${isOn}">${isOn ? 'On' : 'Off'}</button>`;
}

function renderDefenseRow(state: GameState, defenseId: DefenseId): string {
  const defense = DEFENSES_BY_ID[defenseId];
  return `<article class="shop-row">
    <div class="shop-icon">${DEFENSE_ICONS[defenseId]}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(defense.name)}</h3>
      <p class="shop-desc">${escapeHtml(defense.description)}</p>
      <p class="shop-effect is-tradeoff">${escapeHtml(describeTradeOffs(defense))}</p>
    </div>
    ${renderDefenseControl(state, defenseId)}
  </article>`;
}

function renderAdControls(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  if (!canUseAds(state)) return `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(era.adSkillId))}</p>`;
  const placeButton = state.adCount >= era.maxAds
    ? '<button type="button" class="buy-button" disabled>Full</button>'
    : buyButton('place-ad', 'ad', calculateNextAdCost(state), `+ ${formatMoney(calculateNextAdCost(state))}`);
  const removeButton = `<button type="button" class="ghost-button" data-action="remove-ad" ${state.adCount === 0 ? 'disabled' : ''}>Remove one</button>`;
  return `<p class="shop-effect">Each ad: +$${calculateAdValuePerAd(state).toFixed(3)} per visitor, −${formatPercent(calculateAdAnnoyancePerAd(state))} visitors</p>
      <p class="shop-effect is-muted">Now: $${calculateRevenuePerVisitor(state).toFixed(3)} per visitor · ads cost you ${formatPercent(NEUTRAL_FACTOR - calculateAdTrafficFactor(state))} of visitors</p>
      <div class="ad-controls">${removeButton}${placeButton}</div>`;
}

function renderAdRow(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  return `<article class="shop-row ad-row${canUseAds(state) ? '' : ' is-locked'}">
    <div class="shop-icon">${AD_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(era.adLabel)}s <span class="level-chip">${state.adCount}/${era.maxAds}</span></h3>
      <p class="shop-desc">Visitors don’t pay the bills. Ads do, but every ad drives some visitors away.</p>
      ${renderAdControls(state)}
    </div>
  </article>`;
}

function renderHostingRow(state: GameState): string {
  if (!ERAS_BY_ID[state.eraId].hasServerLoad) {
    return `<article class="shop-row"><div class="shop-icon">${SERVER_ICON}</div><div class="shop-info"><h3 class="shop-name">Free web space</h3><p class="shop-desc">2 MB on a free host, banner on top included. Servers are someone else’s problem until 2005.</p></div></article>`;
  }
  const tier = getHostingTier(state);
  const next = getNextHostingTier(state);
  const load = calculateServerLoad(state);
  const button = next === null ? '<button type="button" class="buy-button" disabled>Maxed</button>' : buyButton('upgrade-hosting', next.id, next.cost);
  const nextLine = next === null ? '' : `<p class="shop-effect">Next: ${escapeHtml(next.name)}, ${formatCompactNumber(next.capacityVisitorsPerSecond)} visitors/s. ${escapeHtml(next.description)}</p>`;
  return `<article class="shop-row">
    <div class="shop-icon">${SERVER_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(tier.name)} <span class="level-chip${load > 1 ? ' is-hot' : ''}">${formatPercent(load)} load</span></h3>
      <p class="shop-desc">Handles ${formatCompactNumber(tier.capacityVisitorsPerSecond)} visitors/s. Over 100% pages slow down; at 200% the site goes down.</p>
      ${nextLine}
    </div>
    ${button}
  </article>`;
}

function renderSecurityTab(state: GameState): string {
  const defenses = getUnlockedDefenseIds(state).map((defenseId) => renderDefenseRow(state, defenseId)).join('');
  return `<h3 class="shop-group-title">Monetization</h3>${renderAdRow(state)}<h3 class="shop-group-title">Hosting</h3>${renderHostingRow(state)}<h3 class="shop-group-title">Security</h3>${defenses}`;
}

// ---------- Tabs ----------

const TAB_RENDERERS: Readonly<Record<ShopTab, (state: GameState) => string>> = {
  learn: renderLearnTab,
  build: renderBuildTab,
  upgrades: renderUpgradesTab,
  security: renderSecurityTab,
};

export function renderShopBody(state: GameState, tab: ShopTab): string {
  return TAB_RENDERERS[tab](state);
}

export function renderShopTabs(activeTab: ShopTab): string {
  return SHOP_TABS.map(
    (tab) =>
      `<button type="button" class="shop-tab${tab === activeTab ? ' is-active' : ''}" role="tab" aria-selected="${tab === activeTab}" data-action="shop-tab" data-id="${tab}">${SHOP_TAB_LABELS[tab]}<span class="tab-badge" data-tab-badge="${tab}" hidden></span></button>`,
  ).join('');
}

const AFFORDABLE_COUNTERS: Readonly<Record<ShopTab, (state: GameState) => number>> = {
  learn: (state) => getAvailableSkillIds(state).filter((skillId) => state.money >= UPGRADES_BY_ID[skillId].cost).length,
  build: (state) =>
    getUnlockedFeatureIds(state).filter((featureId) => isFeatureBuildable(state, featureId) && state.money >= calculateNextFeatureCost(state, featureId)).length,
  upgrades: (state) => getRevealedBoostIds(state).filter((upgradeId) => state.money >= UPGRADES_BY_ID[upgradeId].cost).length,
  security: (state) =>
    getUnlockedDefenseIds(state).filter((defenseId) => !state.ownedDefenseIds.includes(defenseId) && state.money >= DEFENSES_BY_ID[defenseId].cost).length +
    (canUseAds(state) && state.adCount < ERAS_BY_ID[state.eraId].maxAds && state.money >= calculateNextAdCost(state) ? 1 : 0) +
    (canUpgradeHosting(state) ? 1 : 0),
};

export function countAffordable(state: GameState, tab: ShopTab): number {
  return AFFORDABLE_COUNTERS[tab](state);
}

export function calculateShopSignature(state: GameState, tab: ShopTab): string {
  return [
    tab,
    state.eraId,
    Object.values(state.featureLevels).join(','),
    state.adCount,
    state.purchasedUpgradeIds.join(','),
    state.ownedDefenseIds.join(','),
    state.enabledDefenseIds.join(','),
    state.hostingTier,
    state.eraId === 'web2-2005' ? Math.round(calculateServerLoad(state) * 20) : 0,
    getRevealedBoostIds(state).join(','),
    state.infections.map((infection) => infection.featureId).join(','),
  ].join('|');
}
