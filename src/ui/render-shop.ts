import {
  calculateAdAnnoyancePerAd,
  calculateAdTrafficFactor,
  calculateAdValuePerAd,
  calculateFeatureVisitorsPerLevel,
  calculateFeatureVisitorsPerSecond,
  calculateGlobalTrafficFactor,
  calculateNextAdCost,
  calculateFeatureLevelsCost,
  calculateNextFeatureCost,
  calculateRevenuePerVisitor,
  calculateServerLoad,
  canUpgradeHosting,
  canUseAds,
  DEFENSES_BY_ID,
  calculateHostingCapacity,
  calculateServerLoadPerVisitor,
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
  isFeatureSwitchedOff,
  MS_PER_SECOND,
  UPGRADES_BY_ID,
} from '../engine';
import type { DefenseDefinition, DefenseId, EraId, FeatureId, GameState, HazardKind, UpgradeEffect, UpgradeId } from '../engine';
import { escapeHtml } from './dom';
import { LEARN_LINKS } from './learn-links';
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

/** How many levels one click on a Build button buys. */
export type BuyAmount = 1 | 5 | 10;
export const BUY_AMOUNTS: readonly BuyAmount[] = [1, 5, 10];

/** What the shop shows besides the game state. */
export interface ShopView {
  readonly buyAmount: BuyAmount;
}

function renderBuyAmountPicker(buyAmount: BuyAmount): string {
  const options = BUY_AMOUNTS.map(
    (amount) => `<button type="button" class="buy-amount-option${amount === buyAmount ? ' is-active' : ''}" data-action="buy-amount" data-id="${amount}" aria-pressed="${amount === buyAmount}">${amount}×</button>`,
  ).join('');
  return `<div class="buy-amount" role="group" aria-label="Levels per click"><span class="buy-amount-label">Buy</span>${options}</div>`;
}

function renderBuildableEffect(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const perLevel =
    buyAmount * calculateFeatureVisitorsPerLevel(state, featureId) * calculateGlobalTrafficFactor(state) * calculateAdTrafficFactor(state);
  const currentLine = state.featureLevels[featureId] > 0 ? ` · now ${formatCompactNumber(calculateFeatureVisitorsPerSecond(state, featureId))}/s` : '';
  const definition = FEATURES_BY_ID[featureId];
  // Page weight is the base weight once the feature exists, plus its per-level weight for every level.
  const weightKb = buyAmount * definition.pageWeightKbPerLevel + (state.featureLevels[featureId] > 0 ? 0 : definition.pageWeightKb);
  const weight = weightKb > 0 ? ` · +${weightKb} KB` : '';
  return `<p class="shop-effect">+${formatCompactNumber(perLevel)} visitors/s${currentLine}${weight}</p>`;
}

function renderFeatureBuyButton(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const cost = calculateFeatureLevelsCost(state, featureId, buyAmount);
  return buyButton('buy-feature', featureId, cost, buyAmount === 1 ? undefined : `${buyAmount}× ${formatMoney(cost)}`);
}

function renderFeatureRow(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const level = state.featureLevels[featureId];
  const isBuildable = isFeatureBuildable(state, featureId);
  const levelChip = level > 0 ? `<span class="level-chip">Lv ${level}</span>` : '<span class="level-chip is-new">New</span>';
  const effect = isBuildable
    ? renderBuildableEffect(state, featureId, buyAmount)
    : `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(FEATURES_BY_ID[featureId].requiredSkillId))}</p>`;
  const button = isBuildable ? renderFeatureBuyButton(state, featureId, buyAmount) : lockedButton();
  const isSwitchable = FEATURES_BY_ID[featureId].isSwitchable && level > 0;
  const isOn = !isFeatureSwitchedOff(state, featureId);
  const toggle = isSwitchable
    ? `<div class="feature-controls"><span>${isOn ? 'Running on your page' : 'Switched off: no visitors, no page weight'}</span><button type="button" class="toggle-button${isOn ? ' is-on' : ''}" data-action="toggle-feature" data-id="${featureId}" aria-pressed="${isOn}">${isOn ? 'On' : 'Off'}</button></div>`
    : '';
  return `<article class="shop-row${isBuildable ? '' : ' is-locked'}">
    <div class="shop-icon">${FEATURE_ICONS[featureId]}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(getFeatureDisplayName(featureId, state.eraId))} ${levelChip}</h3>
      <p class="shop-desc">${escapeHtml(FEATURES_BY_ID[featureId].description)}</p>
      ${effect}
      ${toggle}
    </div>
    ${button}
  </article>`;
}

function renderFeatureGroup(state: GameState, eraId: EraId, buyAmount: BuyAmount): string {
  const featureIds = getUnlockedFeatureIds(state).filter((featureId) => FEATURES_BY_ID[featureId].eraId === eraId);
  const era = ERAS_BY_ID[eraId];
  return `<h3 class="shop-group-title">${era.year} · ${escapeHtml(era.name)}</h3>${featureIds.map((featureId) => renderFeatureRow(state, featureId, buyAmount)).join('')}`;
}

function renderBuildTab(state: GameState, view: ShopView): string {
  const eras = ERA_IDS.filter((eraId) => isEraUnlocked(state, eraId)).reverse();
  return `${renderBuyAmountPicker(view.buyAmount)}${eras.map((eraId) => renderFeatureGroup(state, eraId, view.buyAmount)).join('')}`;
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
  'server-load-multiplier': (effect) => `Server load per visitor ${formatFactor(effect.factor)}`,
  'traffic-spike-cache': () => 'Traffic spikes put no load on the server',
  'mobile-friendly': () => 'Phone visitors stop leaving',
};

function describeOneEffect(effect: UpgradeEffect, eraId: EraId): string {
  const describe = EFFECT_DESCRIPTIONS[effect.kind] as (value: UpgradeEffect, era: EraId) => string;
  return describe(effect, eraId);
}

export function describeUpgradeEffects(effects: readonly UpgradeEffect[], eraId: EraId): string {
  return effects.map((effect) => describeOneEffect(effect, eraId)).join(' · ');
}

/** A real link to where you can learn it for real, or plain text when there's nothing worth linking. */
function renderVisitedItem(state: GameState, upgradeId: UpgradeId): string {
  const name = escapeHtml(UPGRADES_BY_ID[upgradeId].name);
  const effect = escapeHtml(describeUpgradeEffects(UPGRADES_BY_ID[upgradeId].effects, state.eraId));
  const url = LEARN_LINKS[upgradeId];
  return url === null
    ? `<span class="visited-item" title="${effect}">${name}</span>`
    : `<a class="visited-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${effect} · Learn it for real (opens a new tab)">${name}</a>`;
}

function renderVisitedList(state: GameState, upgradeIds: readonly UpgradeId[], title: string): string {
  if (upgradeIds.length === 0) return '';
  const items = upgradeIds.map((upgradeId) => renderVisitedItem(state, upgradeId)).join('');
  return `<h3 class="shop-group-title">${escapeHtml(title)}</h3><p class="visited-list">${items}</p>`;
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
      <p class="shop-effect">${escapeHtml(describeUpgradeEffects(skill.effects, state.eraId) + describeUpgradeWeight(skillId))}</p>
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

const TYPING_EFFECT_KINDS: readonly UpgradeEffect['kind'][] = ['keystroke-value-multiplier', 'keystroke-revenue-share', 'bug-chance-reduction'];

function isTypingBoost(upgradeId: UpgradeId): boolean {
  return UPGRADES_BY_ID[upgradeId].effects.some((effect) => TYPING_EFFECT_KINDS.includes(effect.kind));
}

function renderBoostRow(state: GameState, upgradeId: UpgradeId): string {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  return `<article class="shop-row">
    <div class="shop-icon">${isTypingBoost(upgradeId) ? CODE_ICON : UPGRADE_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(upgrade.name)}</h3>
      <p class="shop-desc">${escapeHtml(upgrade.description)}</p>
      <p class="shop-effect">${escapeHtml(describeUpgradeEffects(upgrade.effects, state.eraId) + describeUpgradeWeight(upgradeId))}</p>
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

const HAZARD_NAMES: Readonly<Record<HazardKind, string>> = {
  popup: 'pop-up ads on your page',
  virus: 'viruses',
  spam: 'spam floods in your comments',
  'sql-injection': 'SQL injections',
  'traffic-spike': 'traffic spikes',
};

/** What the defense does for you. Without this line a defense reads like a pure cost. */
function describeBenefit(defense: DefenseDefinition): string {
  const hazard = HAZARD_NAMES[defense.countersHazard];
  return defense.counterMode === 'prevents-spawn'
    ? `Stops ${hazard}`
    : `Removes ${hazard} on its own after ${Math.round(defense.autoCleanDelayMs / MS_PER_SECOND)} s`;
}

function describeTrafficTradeOff(defense: DefenseDefinition, eraId: EraId): string {
  const share = formatPercent(NEUTRAL_FACTOR - defense.trafficFactor);
  return defense.penalizedFeatureId === null
    ? `${share} fewer visitors`
    : `${getFeatureDisplayName(defense.penalizedFeatureId, eraId).toLowerCase()} bring ${share} fewer visitors`;
}

function describeTradeOffs(defense: DefenseDefinition, eraId: EraId): string {
  const tradeOffs = [
    defense.revenueUpkeepShare > 0 ? `costs ${formatPercent(defense.revenueUpkeepShare)} of revenue` : '',
    defense.adValueFactor < NEUTRAL_FACTOR ? `ads pay ${formatPercent(NEUTRAL_FACTOR - defense.adValueFactor)} less` : '',
    defense.trafficFactor < NEUTRAL_FACTOR ? describeTrafficTradeOff(defense, eraId) : '',
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
      <p class="shop-effect">${escapeHtml(describeBenefit(defense))}</p>
      <p class="shop-effect is-tradeoff">${escapeHtml(describeTradeOffs(defense, state.eraId))}</p>
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
  const nextLine = next === null ? '' : `<p class="shop-effect">Next (${next.year}): ${escapeHtml(next.name)}, ${formatCompactNumber(calculateHostingCapacity(state, next))} visitors/s. ${escapeHtml(next.description)}</p>`;
  return `<article class="shop-row">
    <div class="shop-icon">${SERVER_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(tier.name)} <span class="level-chip${load > 1 ? ' is-hot' : ''}">${formatPercent(load)} load</span></h3>
      <p class="shop-desc">Handles ${formatCompactNumber(calculateHostingCapacity(state, tier))} visitors/s${calculateServerLoadPerVisitor(state) < 1 ? ' with caching' : ''}. Over 100% pages slow down; at 200% the site goes down.</p>
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

const TAB_RENDERERS: Readonly<Record<ShopTab, (state: GameState, view: ShopView) => string>> = {
  learn: renderLearnTab,
  build: renderBuildTab,
  upgrades: renderUpgradesTab,
  security: renderSecurityTab,
};

export function renderShopBody(state: GameState, tab: ShopTab, view: ShopView): string {
  return TAB_RENDERERS[tab](state, view);
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

export function calculateShopSignature(state: GameState, tab: ShopTab, view: ShopView): string {
  return [
    tab,
    view.buyAmount,
    state.eraId,
    Object.values(state.featureLevels).join(','),
    state.adCount,
    state.purchasedUpgradeIds.join(','),
    state.ownedDefenseIds.join(','),
    state.enabledDefenseIds.join(','),
    state.switchedOffFeatureIds.join(','),
    state.hostingTier,
    ERAS_BY_ID[state.eraId].hasServerLoad ? Math.round(calculateServerLoad(state) * 20) : 0,
    getRevealedBoostIds(state).join(','),
    state.infections.map((infection) => infection.featureId).join(','),
  ].join('|');
}
