import {
  calculateAverageMsBetweenFines,
  calculateCertificateRenewalFee,
  canRenewCertificate,
  getAvailableOpsIds,
  SITE_DOWN_SERVER_LOAD,
  calculateFeatureLevelsNetVisitors,
  calculateUpgradeCost,
  findPriceBreak,
  CONSENT_BANNER_IDS,
  CONSENT_BANNERS_BY_ID,
  getDefenseCopy,
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
  isEraBoundEffect,
  isEraUnlocked,
  isFeatureBuildable,
  calculateTradeIn,
  getRetiredFeatureName,
  isFeatureRetired,
  isFeatureSwitchedOff,
  MS_PER_SECOND,
  UPGRADES_BY_ID,
} from '../engine';
import type { ConsentBanner, ConsentBannerDefinition, DefenseCounterMode, DefenseDefinition, DefenseId, EraId, FeatureId, GameState, HazardKind, UpgradeEffect, UpgradeId } from '../engine';
import { escapeHtml } from './dom';
import { LEARN_LINKS } from './learn-links';
import { describeTradeIn } from './retirement';
import { AD_ICON, CODE_ICON, COOKIE_ICON, DEFENSE_ICONS, FEATURE_ICONS, LEARN_ICON, LOCK_ICON, OPS_ICON, SERVER_ICON, UPGRADE_ICON } from './icons';

export type ShopTab = 'learn' | 'build' | 'upgrades' | 'security';

export const SHOP_TABS: readonly ShopTab[] = ['learn', 'build', 'upgrades', 'security'];

const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>> = {
  learn: 'Learn',
  build: 'Build',
  upgrades: 'Upgrades',
  security: 'Ops',
};

const NEUTRAL_FACTOR = 1;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

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
  /** The player's comfort switch for the one-pager's scrolling: a setting, not part of the game. */
  readonly isScrollJackingOn: boolean;
}

function renderBuyAmountPicker(buyAmount: BuyAmount): string {
  const options = BUY_AMOUNTS.map(
    (amount) => `<button type="button" class="buy-amount-option${amount === buyAmount ? ' is-active' : ''}" data-action="buy-amount" data-id="${amount}" aria-pressed="${amount === buyAmount}">${amount}×</button>`,
  ).join('');
  return `<div class="buy-amount" role="group" aria-label="Levels per click"><span class="buy-amount-label">Buy</span>${options}</div>`;
}

/** Only from 2005, when visitors start timing the page: before that, kilobytes are nobody's business. */
function describeAddedWeight(state: GameState, weightKb: number, suffix: string): string {
  return ERAS_BY_ID[state.eraId].hasPageWeight && weightKb > 0 ? ` · +${weightKb} KB${suffix}` : '';
}

function renderBuildableEffect(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const perLevel =
    buyAmount * calculateFeatureVisitorsPerLevel(state, featureId) * calculateGlobalTrafficFactor(state) * calculateAdTrafficFactor(state);
  const currentLine = state.featureLevels[featureId] > 0 ? ` · now ${formatCompactNumber(calculateFeatureVisitorsPerSecond(state, featureId))}/s` : '';
  const definition = FEATURES_BY_ID[featureId];
  // Page weight is the base weight once the feature exists, plus its per-level weight for every level.
  const weightKb = buyAmount * definition.pageWeightKbPerLevel + (state.featureLevels[featureId] > 0 ? 0 : definition.pageWeightKb);
  return `<p class="shop-effect">+${formatCompactNumber(perLevel)} visitors/s${currentLine}${describeAddedWeight(state, weightKb, '')}</p>${describeNetLoss(state, featureId, buyAmount)}`;
}

/** Said out loud when it happens: more of this feature now costs more visitors in load time than it brings. */
function describeNetLoss(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const net = calculateFeatureLevelsNetVisitors(state, featureId, buyAmount);
  return net < 0 ? `<p class="shop-effect is-tradeoff">But its weight slows the page: −${formatCompactNumber(-net)} visitors/s overall</p>` : '';
}

function renderFeatureBuyButton(state: GameState, featureId: FeatureId, buyAmount: BuyAmount): string {
  const cost = calculateFeatureLevelsCost(state, featureId, buyAmount);
  return buyButton('buy-feature', featureId, cost, buyAmount === 1 ? undefined : `${buyAmount}× ${formatMoney(cost)}`);
}

function toggleButtonClass(isOn: boolean): string {
  return isOn ? 'toggle-button is-on' : 'toggle-button';
}

function toggleButtonLabel(isOn: boolean): string {
  return isOn ? 'On' : 'Off';
}

/** The On/Off pill every switch in the shop uses: features, defenses and the scroll-jacking. */
function renderToggleButton(action: string, id: string, isOn: boolean): string {
  return `<button type="button" class="${toggleButtonClass(isOn)}" data-action="${action}" data-id="${id}" aria-pressed="${isOn}">${toggleButtonLabel(isOn)}</button>`;
}

function renderControlRow(label: string, button: string): string {
  return `<div class="feature-controls"><span>${escapeHtml(label)}</span>${button}</div>`;
}

function describeFeatureSwitch(isOn: boolean): string {
  return isOn ? 'Running on your page' : 'Switched off: no visitors, no page weight';
}

function isSwitchableNow(state: GameState, featureId: FeatureId): boolean {
  return FEATURES_BY_ID[featureId].isSwitchable && state.featureLevels[featureId] > 0;
}

function renderFeatureSwitch(state: GameState, featureId: FeatureId): string {
  const isOn = !isFeatureSwitchedOff(state, featureId);
  return renderControlRow(describeFeatureSwitch(isOn), renderToggleButton('toggle-feature', featureId, isOn));
}

function renderFeatureSwitchIfSwitchable(state: GameState, featureId: FeatureId): string {
  return isSwitchableNow(state, featureId) ? renderFeatureSwitch(state, featureId) : '';
}

/** The feature whose scrolling the player can switch off without switching off the feature. */
const SCROLL_JACKING_FEATURE_ID: FeatureId = 'one-pager';

function isFeatureRunning(state: GameState, featureId: FeatureId): boolean {
  return state.featureLevels[featureId] > 0 && !isFeatureSwitchedOff(state, featureId);
}

/** Only while the story is on the page: switched off, or not built yet, there's no scrolling to switch. */
function isScrollJackingSwitchShown(state: GameState, featureId: FeatureId): boolean {
  return featureId === SCROLL_JACKING_FEATURE_ID && isFeatureRunning(state, featureId);
}

function describeScrollJackingSwitch(isOn: boolean): string {
  return isOn ? 'Scroll-jacking: the page waits for the story' : 'Scroll-jacking off: normal scrolling, same visitors';
}

/** A comfort switch, not a trade-off: the story stays and earns the same, the page just stops taking over. */
function renderScrollJackingSwitch(isOn: boolean): string {
  return renderControlRow(describeScrollJackingSwitch(isOn), renderToggleButton('toggle-scroll-jacking', SCROLL_JACKING_FEATURE_ID, isOn));
}

function renderScrollJackingSwitchIfShown(state: GameState, featureId: FeatureId, view: ShopView): string {
  return isScrollJackingSwitchShown(state, featureId) ? renderScrollJackingSwitch(view.isScrollJackingOn) : '';
}

function renderFeatureRow(state: GameState, featureId: FeatureId, view: ShopView): string {
  const { buyAmount } = view;
  const level = state.featureLevels[featureId];
  const isBuildable = isFeatureBuildable(state, featureId);
  const levelChip = level > 0 ? `<span class="level-chip">Lv ${level}</span>` : '<span class="level-chip is-new">New</span>';
  const effect = isBuildable
    ? renderBuildableEffect(state, featureId, buyAmount)
    : `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(FEATURES_BY_ID[featureId].requiredSkillId))}</p>`;
  const button = isBuildable ? renderFeatureBuyButton(state, featureId, buyAmount) : lockedButton();
  const toggle = renderFeatureSwitchIfSwitchable(state, featureId) + renderScrollJackingSwitchIfShown(state, featureId, view);
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

function renderFeatureGroup(state: GameState, eraId: EraId, view: ShopView): string {
  const featureIds = getUnlockedFeatureIds(state).filter((featureId) => FEATURES_BY_ID[featureId].eraId === eraId);
  const era = ERAS_BY_ID[eraId];
  return `<h3 class="shop-group-title">${era.year} · ${escapeHtml(era.name)}</h3>${featureIds.map((featureId) => renderFeatureRow(state, featureId, view)).join('')}`;
}

/** Features that went out of fashion: listed once, as history, not as things to buy. */
function renderRetiredFeatures(state: GameState): string {
  const retired = FEATURE_IDS.filter((featureId) => state.featureLevels[featureId] > 0 && isFeatureRetired(state, featureId));
  if (retired.length === 0) return '';
  const items = retired.map((featureId) => `<span class="visited-item">${escapeHtml(getRetiredFeatureName(featureId))}</span>`).join('');
  return `<h3 class="shop-group-title">Retired: out of fashion</h3><p class="visited-list">${items}</p><p class="shop-note">${escapeHtml(describeTradeIn(calculateTradeIn(state, retired)))}</p>`;
}

function renderBuildTab(state: GameState, view: ShopView): string {
  const eras = ERA_IDS.filter((eraId) => isEraUnlocked(state, eraId)).reverse();
  return `${renderBuyAmountPicker(view.buyAmount)}${eras.map((eraId) => renderFeatureGroup(state, eraId, view)).join('')}${renderRetiredFeatures(state)}`;
}

// ---------- Effects ----------

const EFFECT_DESCRIPTIONS: { readonly [K in UpgradeEffect['kind']]: (effect: Extract<UpgradeEffect, { kind: K }>, eraId: EraId) => string } = {
  'keystroke-value-multiplier': (effect) => `Typing earns ${formatFactor(effect.factor)} this era`,
  'keystroke-revenue-share': (effect) => `Each keystroke also earns ${formatPercent(effect.share)} of your revenue per second`,
  'bug-chance-reduction': (effect) => `Typo chance −${formatPercent(effect.amount)} this era`,
  'feature-traffic-multiplier': (effect, eraId) => `${getFeatureDisplayName(effect.featureId, eraId)} traffic ${formatFactor(effect.factor)}`,
  'global-traffic-multiplier': (effect) => `All traffic ${formatFactor(effect.factor)}`,
  'ad-value-multiplier': (effect) => `Ads pay ${formatFactor(effect.factor)}`,
  'ad-annoyance-multiplier': (effect) => `Ads annoy visitors ${formatFactor(effect.factor)}`,
  'page-weight-multiplier': (effect) => `Page weight ${formatFactor(effect.factor)}`,
  'load-time-multiplier': (effect) => `Load time ${formatFactor(effect.factor)}`,
  'server-load-multiplier': (effect) => `Server load per visitor ${formatFactor(effect.factor)}`,
  'traffic-spike-cache': () => 'Traffic spikes put no load on the server',
  'mobile-friendly': () => 'Phone visitors stop leaving',
  'client-side-rendering': () => 'Blank until the JavaScript runs: slower pages, and search visitors lost',
  'server-side-rendering': () => 'Renders on the server: no blank page, and search engines find you again',
  'auto-cleans-infection': (effect) => `Undoes ${HAZARD_NAMES[effect.infection]} on its own after ${Math.round(effect.afterMs / MS_PER_SECOND)} s`,
  'quick-fix-window-multiplier': (effect) => `Quick-fix bonus window ${formatFactor(effect.factor)}`,
  'overload-tolerance-multiplier': (effect) => `The site stays up until ${formatPercent(SITE_DOWN_SERVER_LOAD * effect.factor)} server load`,
  'revenue-upkeep-share': (effect) => `Costs ${formatPercent(effect.share)} of revenue to run`,
  'secure-connection': () => 'Served over https, with a padlock',
  'automatic-certificate-renewal': () => 'The certificate never expires',
  'privacy-fine-multiplier': (effect) => `Privacy fines ${formatFactor(effect.factor)}`,
};

function describeOneEffect(effect: UpgradeEffect, eraId: EraId): string {
  const describe = EFFECT_DESCRIPTIONS[effect.kind] as (value: UpgradeEffect, era: EraId) => string;
  return describe(effect, eraId);
}

export function describeUpgradeEffects(effects: readonly UpgradeEffect[], eraId: EraId): string {
  return effects.map((effect) => describeOneEffect(effect, eraId)).join(' · ');
}

/** Cheapest first: what you can afford soonest is at the top. */
function sortByCost(state: GameState, upgradeIds: readonly UpgradeId[]): readonly UpgradeId[] {
  return [...upgradeIds].sort((first, second) => calculateUpgradeCost(state, first) - calculateUpgradeCost(state, second));
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

function describeUpgradeWeight(state: GameState, upgradeId: UpgradeId): string {
  return describeAddedWeight(state, UPGRADES_BY_ID[upgradeId].pageWeightKb, ' per page');
}

/** Your framework's price break, said where you pay it. */
function describePriceBreak(state: GameState, upgradeId: UpgradeId): string {
  const priceBreak = findPriceBreak(state, upgradeId);
  return priceBreak === null ? '' : `<p class="shop-effect is-discount">${escapeHtml(priceBreak.reason)}: −${formatPercent(NEUTRAL_FACTOR - priceBreak.factor)}</p>`;
}

function renderSkillRow(state: GameState, skillId: UpgradeId): string {
  const skill = UPGRADES_BY_ID[skillId];
  return `<article class="shop-row">
    <div class="shop-icon">${LEARN_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(skill.name)}</h3>
      <p class="shop-desc">${escapeHtml(skill.description)}</p>
      ${describeUnlocks(state, skillId)}
      <p class="shop-effect">${escapeHtml(describeUpgradeEffects(skill.effects, state.eraId) + describeUpgradeWeight(state, skillId))}</p>
      ${describePriceBreak(state, skillId)}
    </div>
    ${buyButton('buy-upgrade', skillId, calculateUpgradeCost(state, skillId))}
  </article>`;
}

function learnedSkills(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill');
}

function renderLearnTab(state: GameState): string {
  const available = sortByCost(state, getAvailableSkillIds(state));
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

const ERA_BOUND_NOTE = '<p class="shop-effect is-muted">The multiplier lasts this era: by the next relaunch, everyone has one.</p>';

function describeEraBound(upgradeId: UpgradeId): string {
  return UPGRADES_BY_ID[upgradeId].effects.some((effect) => isEraBoundEffect(upgradeId, effect)) ? ERA_BOUND_NOTE : '';
}

/** A boost or an ops upgrade: bought once, for good. */
function renderUpgradeRow(state: GameState, upgradeId: UpgradeId, icon: string): string {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  return `<article class="shop-row">
    <div class="shop-icon">${icon}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(upgrade.name)}</h3>
      <p class="shop-desc">${escapeHtml(upgrade.description)}</p>
      <p class="shop-effect">${escapeHtml(describeUpgradeEffects(upgrade.effects, state.eraId) + describeUpgradeWeight(state, upgradeId))}</p>
      ${describeEraBound(upgradeId)}
      ${describePriceBreak(state, upgradeId)}
    </div>
    ${buyButton('buy-upgrade', upgradeId, calculateUpgradeCost(state, upgradeId))}
  </article>`;
}

function renderBoostRow(state: GameState, upgradeId: UpgradeId): string {
  return renderUpgradeRow(state, upgradeId, isTypingBoost(upgradeId) ? CODE_ICON : UPGRADE_ICON);
}

function boughtBoosts(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'boost');
}

function renderUpgradesTab(state: GameState): string {
  const revealed = sortByCost(state, getRevealedBoostIds(state));
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
  'password-leak': 'password leaks',
  ddos: 'DDoS attacks',
  'broken-build': 'broken builds',
  'privacy-fine': 'privacy fines',
  'certificate-expiry': 'expired certificates',
};

const BENEFIT_DESCRIPTIONS: Readonly<Record<DefenseCounterMode, (defense: DefenseDefinition, hazard: string) => string>> = {
  'prevents-spawn': (_defense, hazard) => `Stops ${hazard}`,
  'auto-cleans': (defense, hazard) => `Removes ${hazard} on its own after ${Math.round(defense.autoCleanDelayMs / MS_PER_SECOND)} s`,
  'slows-spawn': (defense, hazard) => `Makes ${hazard} ${formatPercent(NEUTRAL_FACTOR - defense.spawnRateFactor)} rarer`,
};

/** What the defense does for you. Without this line a defense reads like a pure cost. */
function describeBenefit(defense: DefenseDefinition): string {
  return BENEFIT_DESCRIPTIONS[defense.counterMode](defense, HAZARD_NAMES[defense.countersHazard]);
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

/** An upgrade's price says what it is. */
function describeDefensePrice(defenseId: DefenseId): string | undefined {
  const defense = DEFENSES_BY_ID[defenseId];
  return defense.upgradesFrom === null ? undefined : `Upgrade ${formatMoney(defense.cost)}`;
}

function renderDefenseControl(state: GameState, defenseId: DefenseId): string {
  if (!state.ownedDefenseIds.includes(defenseId)) return buyButton('buy-defense', defenseId, DEFENSES_BY_ID[defenseId].cost, describeDefensePrice(defenseId));
  return renderToggleButton('toggle-defense', defenseId, state.enabledDefenseIds.includes(defenseId));
}

function renderDefenseRow(state: GameState, defenseId: DefenseId): string {
  const defense = DEFENSES_BY_ID[defenseId];
  const copy = getDefenseCopy(defenseId, state.eraId);
  return `<article class="shop-row">
    <div class="shop-icon">${DEFENSE_ICONS[defenseId]}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(copy.name)}</h3>
      <p class="shop-desc">${escapeHtml(copy.description)}</p>
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

function describeFineRisk(banner: ConsentBannerDefinition): string {
  if (banner.fineRate === 0) return 'never fined';
  const minutes = Math.round(calculateAverageMsBetweenFines(banner) / MS_PER_MINUTE);
  return `fined about every ${minutes} min, ${banner.fineRevenueSeconds} s of revenue each time`;
}

function describeConsentEffects(banner: ConsentBannerDefinition): string {
  const adValue = banner.adValueFactor < NEUTRAL_FACTOR ? `ads pay ${formatPercent(NEUTRAL_FACTOR - banner.adValueFactor)} less` : 'ads pay full price';
  return `Now: ${adValue}, ${describeFineRisk(banner)}`;
}

function renderConsentOption(state: GameState, banner: ConsentBanner): string {
  const isChosen = state.consentBanner === banner;
  return `<button type="button" class="consent-option${isChosen ? ' is-chosen' : ''}" data-action="choose-consent-banner" data-id="${banner}" aria-pressed="${isChosen}">${escapeHtml(CONSENT_BANNERS_BY_ID[banner].name)}</button>`;
}

/** 2018's GDPR: how the site asks for consent to track. A choice, not a purchase, and it can change any time. */
function renderConsentRow(state: GameState): string {
  if (!isEraUnlocked(state, 'platform-2018')) return '';
  const chosen = CONSENT_BANNERS_BY_ID[state.consentBanner];
  return `<article class="shop-row consent-row">
    <div class="shop-icon">${COOKIE_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">Cookie banner</h3>
      <p class="shop-desc">The GDPR is in force: ads may only track visitors who said yes. ${escapeHtml(chosen.description)}</p>
      <div class="consent-options" role="group" aria-label="Cookie banner">${CONSENT_BANNER_IDS.map((banner) => renderConsentOption(state, banner)).join('')}</div>
      <p class="shop-effect">${escapeHtml(describeConsentEffects(chosen))}</p>
    </div>
  </article>`;
}

function renderHostingRow(state: GameState): string {
  if (!ERAS_BY_ID[state.eraId].hasServerLoad) {
    return `<article class="shop-row"><div class="shop-icon">${SERVER_ICON}</div><div class="shop-info"><h3 class="shop-name">Free web space</h3><p class="shop-desc">A free host, its banner on top of your page included. Servers, and how fast your page loads, are someone else’s problem until 2005.</p></div></article>`;
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

// ---------- DevOps ----------

/** Shown only while it's urgent: browsers are turning your visitors away. */
function renderCertificateRow(state: GameState): string {
  if (!state.isCertificateExpired) return '';
  const fee = calculateCertificateRenewalFee(state);
  return `<article class="shop-row">
    <div class="shop-icon">${LOCK_ICON}</div>
    <div class="shop-info">
      <h3 class="shop-name">SSL certificate <span class="level-chip is-hot">expired</span></h3>
      <p class="shop-desc">Browsers show every visitor a warning page instead of your site, and most of them turn back. Renewing means a fee, a form and a fax.</p>
    </div>
    ${buyButton('renew-certificate', 'certificate', fee, `Renew ${formatMoney(fee)}`)}
  </article>`;
}

function boughtOps(state: GameState): readonly UpgradeId[] {
  return state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'ops');
}

function renderOpsGroup(state: GameState): string {
  const available = sortByCost(state, getAvailableOpsIds(state));
  const rows = available.length === 0
    ? '<p class="shop-empty">Everything this era can run is running.</p>'
    : available.map((upgradeId) => renderUpgradeRow(state, upgradeId, OPS_ICON)).join('');
  return `<h3 class="shop-group-title">DevOps</h3>${rows}${renderVisitedList(state, boughtOps(state), 'Running')}`;
}

function renderSecurityTab(state: GameState): string {
  const defenses = getUnlockedDefenseIds(state).map((defenseId) => renderDefenseRow(state, defenseId)).join('');
  return `${renderCertificateRow(state)}<h3 class="shop-group-title">Monetization</h3>${renderAdRow(state)}${renderConsentRow(state)}<h3 class="shop-group-title">Hosting</h3>${renderHostingRow(state)}${renderOpsGroup(state)}<h3 class="shop-group-title">Security</h3>${defenses}`;
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

function countAffordableDefenses(state: GameState): number {
  return getUnlockedDefenseIds(state).filter((defenseId) => !state.ownedDefenseIds.includes(defenseId) && state.money >= DEFENSES_BY_ID[defenseId].cost).length;
}

function countAffordableOps(state: GameState): number {
  return getAvailableOpsIds(state).filter((upgradeId) => state.money >= calculateUpgradeCost(state, upgradeId)).length;
}

function canPlaceAnotherAd(state: GameState): boolean {
  return canUseAds(state) && state.adCount < ERAS_BY_ID[state.eraId].maxAds && state.money >= calculateNextAdCost(state);
}

const AFFORDABLE_COUNTERS: Readonly<Record<ShopTab, (state: GameState) => number>> = {
  learn: (state) => getAvailableSkillIds(state).filter((skillId) => state.money >= calculateUpgradeCost(state, skillId)).length,
  build: (state) =>
    getUnlockedFeatureIds(state).filter((featureId) => isFeatureBuildable(state, featureId) && state.money >= calculateNextFeatureCost(state, featureId)).length,
  upgrades: (state) => getRevealedBoostIds(state).filter((upgradeId) => state.money >= calculateUpgradeCost(state, upgradeId)).length,
  security: (state) =>
    countAffordableDefenses(state) +
    countAffordableOps(state) +
    Number(canPlaceAnotherAd(state)) +
    Number(canUpgradeHosting(state)) +
    Number(canRenewCertificate(state)),
};

export function countAffordable(state: GameState, tab: ShopTab): number {
  return AFFORDABLE_COUNTERS[tab](state);
}

export function calculateShopSignature(state: GameState, tab: ShopTab, view: ShopView): string {
  return [
    tab,
    view.buyAmount,
    view.isScrollJackingOn,
    state.eraId,
    Object.values(state.featureLevels).join(','),
    state.adCount,
    state.purchasedUpgradeIds.join(','),
    state.ownedDefenseIds.join(','),
    state.enabledDefenseIds.join(','),
    state.switchedOffFeatureIds.join(','),
    state.consentBanner,
    state.hostingTier,
    ERAS_BY_ID[state.eraId].hasServerLoad ? Math.round(calculateServerLoad(state) * 20) : 0,
    getRevealedBoostIds(state).join(','),
    state.infections.map((infection) => infection.featureId).join(','),
    state.isCertificateExpired ? calculateCertificateRenewalFee(state) : 0,
  ].join('|');
}
