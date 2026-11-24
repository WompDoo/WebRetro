import {
  canPlaceAd,
  canSwitchFeature,
  findShownEraId,
  isFeatureLockedOff,
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
  calculateNextAdGain,
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
  BUFFS_BY_ID,
  findItemOwner,
  SPECIALIZATIONS_BY_ID,
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
  isUpgradeRetired,
  isFeatureBuildable,
  calculateTradeIn,
  getRetiredFeatureName,
  isFeatureRetired,
  isFeatureSwitchedOff,
  MS_PER_SECOND,
  UPGRADES_BY_ID,
  canChooseSpecialization,
  TREE_IDS,
  calculateFeatureWeightPerLevelKb,
  calculateRefactorChurnShare,
  calculateRefactorCost,
  calculateRefactorNetVisitors,
  calculateSunsetNetVisitors,
  calculateSunsetTradeIn,
  isFeatureTooHeavy,
  REFACTOR_WEIGHT_FACTOR,
  isRefactorOffered,
  isSunsetOffered,
  calculateAdsGain,
  findAdRoom,
  hasSupportersToLose,
  SUPPORT_LOST_PER_AD,
  findSpecializationOfEra,
  isSpecializationInView,
} from '../engine';
import type {
  BuffId,
  BuffTarget,
  ConsentBanner,
  ConsentBannerDefinition,
  DefenseCounterMode,
  DefenseDefinition,
  DefenseId,
  EraId,
  FeatureId,
  GameState,
  HazardKind,
  InfectionKind,
  SiteMoment,
  SpecializationId,
  UpgradeEffect,
  UpgradeId,
} from '../engine';
import { escapeHtml } from './dom';
import { baseOfShopKey, instanceKey } from './shop-seen';
import { LEARN_LINKS } from './learn-links';
import { calculateSpecializeTabSignature, isSpecializeTabShown, renderSpecializeTab } from './render-specializations';
import { describeTradeIn } from './retirement';
import { AD_ICON, CODE_ICON, COOKIE_ICON, DEFENSE_ICONS, FEATURE_ICONS, LEARN_ICON, LOCK_ICON, OPS_ICON, SERVER_ICON, UPGRADE_ICON } from './icons';

export type ShopTab = 'learn' | 'build' | 'upgrades' | 'security' | 'specialize';

export const SHOP_TABS: readonly ShopTab[] = ['learn', 'build', 'upgrades', 'security', 'specialize'];

const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>> = {
  learn: 'Learn',
  build: 'Build',
  upgrades: 'Upgrades',
  security: 'Ops',
  specialize: 'Specialize',
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
  /** The player's comfort switch for the one-pager's scrolling: a setting, not part of the game. */
  readonly isScrollJackingOn: boolean;
  /** Specializations found in any run: the Specialize tab shows their cards from the start. */
  readonly foundSpecializationIds: readonly SpecializationId[];
}


/** Only from 2005, when visitors start timing the page: before that, kilobytes are nobody's business. */
function describeAddedWeight(state: GameState, weightKb: number, suffix: string): string {
  return ERAS_BY_ID[state.eraId].hasPageWeight && weightKb > 0 ? ` · +${weightKb} KB${suffix}` : '';
}

function renderBuildableEffect(state: GameState, featureId: FeatureId): string {
  const perLevel =
    calculateFeatureVisitorsPerLevel(state, featureId) * calculateGlobalTrafficFactor(state) * calculateAdTrafficFactor(state);
  const currentLine = state.featureLevels[featureId] > 0 ? ` · now ${formatCompactNumber(calculateFeatureVisitorsPerSecond(state, featureId))}/s` : '';
  const definition = FEATURES_BY_ID[featureId];
  // Page weight is the base weight once the feature exists, plus its per-level weight for every level.
  const weightKb = calculateFeatureWeightPerLevelKb(state, featureId) + (state.featureLevels[featureId] > 0 ? 0 : definition.pageWeightKb);
  return `<p class="shop-effect">+${formatCompactNumber(perLevel)} visitors/s${currentLine}${describeAddedWeight(state, weightKb, '')}</p>${describeNetLoss(state, featureId)}`;
}

/**
 * Said out loud when it happens: more of this feature now costs more visitors in load time than it brings. From level 5
 * the line ends in an i that says what to do about it: the Sunset and Refactor buttons, or how to get them.
 */
function describeNetLoss(state: GameState, featureId: FeatureId): string {
  const net = calculateFeatureLevelsNetVisitors(state, featureId, 1);
  const infoTip = isFeatureTooHeavy(state, featureId) ? renderHeavyInfoTip(state, featureId) : '';
  return net < 0 ? `<p class="shop-effect is-tradeoff weight-note">But its weight slows the page: −${formatCompactNumber(-net)} visitors/s overall${infoTip}</p>` : '';
}

/** Several levels in one click: offered once you could pay for them, so the early game keeps one button per row. */
const BULK_AMOUNTS: readonly BuyAmount[] = [5, 10];

function renderBulkButton(state: GameState, featureId: FeatureId, amount: BuyAmount): string {
  const cost = calculateFeatureLevelsCost(state, featureId, amount);
  const label = `${amount} levels for ${formatMoney(cost)}`;
  return `<button type="button" class="buy-button buy-bulk" data-action="buy-feature" data-id="${featureId}" data-amount="${amount}" data-cost="${cost}" data-bulk title="${label}" aria-label="${label}"${state.money < cost ? ' hidden' : ''}>×${amount}</button>`;
}

function renderFeatureBuyButtons(state: GameState, featureId: FeatureId): string {
  const single = buyButton('buy-feature', featureId, calculateFeatureLevelsCost(state, featureId, 1));
  const bulk = BULK_AMOUNTS.map((amount) => renderBulkButton(state, featureId, amount)).join('');
  return `<div class="buy-group">${single}<div class="buy-bulk-row">${bulk}</div>${renderHeavyFeatureIfHeavy(state, featureId)}</div>`;
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

/** A specialization's sacrifice: switched off for good, said where the switch would be. */
function renderLockedOff(state: GameState, featureId: FeatureId): string {
  return isFeatureLockedOff(state, featureId) ? '<p class="shop-effect is-tradeoff">Switched off for good: your specialization gave it up.</p>' : '';
}

function renderFeatureSwitch(state: GameState, featureId: FeatureId): string {
  const isOn = !isFeatureSwitchedOff(state, featureId);
  return renderControlRow(describeFeatureSwitch(isOn), renderToggleButton('toggle-feature', featureId, isOn));
}

function renderFeatureSwitchIfSwitchable(state: GameState, featureId: FeatureId): string {
  return canSwitchFeature(state, featureId) ? renderFeatureSwitch(state, featureId) : renderLockedOff(state, featureId);
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

/** A specialization's own item wears its icon: only sites like yours get this. */
function renderSpecializationBadge(itemId: FeatureId | UpgradeId): string {
  const owner = findItemOwner(itemId);
  if (owner === null) return '';
  const specialization = SPECIALIZATIONS_BY_ID[owner];
  return ` <span class="spec-item-badge" title="Only for a ${escapeHtml(specialization.name.toLowerCase())}">${specialization.icon} ${escapeHtml(specialization.name)}</span>`;
}

function formatSignedVisitors(visitorsPerSecond: number): string {
  return `${visitorsPerSecond >= 0 ? '+' : '−'}${formatCompactNumber(Math.abs(visitorsPerSecond))} visitors/s`;
}

function formatKb(kb: number): string {
  return `${formatCompactNumber(kb)} KB`;
}

function describeRefactor(state: GameState, featureId: FeatureId): string {
  const weightKb = calculateFeatureWeightPerLevelKb(state, featureId);
  const churn = formatPercent(calculateRefactorChurnShare(state));
  const net = formatSignedVisitors(calculateRefactorNetVisitors(state, featureId));
  return `Refactor it: every level stays and weighs half (${formatKb(weightKb)} → ${formatKb(weightKb * REFACTOR_WEIGHT_FACTOR)}), but the new bugs drive off ${churn} of its users. ${net} overall.`;
}

function describeSunset(state: GameState, featureId: FeatureId): string {
  const weightKb = formatKb(calculateFeatureWeightPerLevelKb(state, featureId));
  const net = formatSignedVisitors(calculateSunsetNetVisitors(state, featureId));
  return `Sunset a level: it leaves the page with its visitors (−${weightKb}) and pays ${formatMoney(calculateSunsetTradeIn(state, featureId))} back. ${net} overall.`;
}

function renderSunsetButton(state: GameState, featureId: FeatureId): string {
  const tradeIn = formatMoney(calculateSunsetTradeIn(state, featureId));
  return `<button type="button" class="ghost-button sunset-button" data-action="sunset-level" data-id="${featureId}">Sunset +${tradeIn}</button>`;
}

const HEAVY_FEATURE_KEY = 'Too heavy? Ways to make it lighter:';
const HEAVY_FEATURE_QA = 'Tests and reviews in the Ops tab cut the users a refactor loses, past refactors too.';
const SUNSET_HINT = 'Learn web analytics (Learn tab) to see what nobody uses: then you can sunset a level of it for money back.';

/**
 * A slow page gets lighter without selling what you built: a heavy feature's card offers a refactor (every level
 * kept, some users lost to its bugs) or to sunset a level (money back, that level's visitors gone): two more small
 * buttons with its other ones. The i that says what each would do sits on the line that names the problem.
 */
function describeSunsetOrHow(state: GameState, featureId: FeatureId): string {
  return isSunsetOffered(state, featureId) ? describeSunset(state, featureId) : SUNSET_HINT;
}

/** Refactoring arrives in 2011, with its QA; before then the note doesn't mention it. */
function describeRefactorLines(state: GameState, featureId: FeatureId): readonly string[] {
  return isRefactorOffered(state, featureId) ? [describeRefactor(state, featureId), HEAVY_FEATURE_QA] : [];
}

function renderHeavyInfoTip(state: GameState, featureId: FeatureId): string {
  return renderInfoTip([HEAVY_FEATURE_KEY, describeSunsetOrHow(state, featureId), ...describeRefactorLines(state, featureId)]);
}

function renderRefactorButton(state: GameState, featureId: FeatureId): string {
  const cost = calculateRefactorCost(state, featureId);
  return isRefactorOffered(state, featureId) ? buyButton('refactor-feature', featureId, cost, `Refactor ${formatMoney(cost)}`) : '';
}

function renderSunsetButtonIfOffered(state: GameState, featureId: FeatureId): string {
  return isSunsetOffered(state, featureId) ? renderSunsetButton(state, featureId) : '';
}

function renderHeavyFeature(state: GameState, featureId: FeatureId): string {
  const buttons = renderRefactorButton(state, featureId) + renderSunsetButtonIfOffered(state, featureId);
  return buttons === '' ? '' : `<div class="heavy-actions">${buttons}</div>`;
}

const ORIGINAL_WEIGHT = 1;

/** What its refactors did, so far: kept on the card after it stops being heavy. */
function describeRefactored(state: GameState, featureId: FeatureId): string {
  const count = state.refactorCounts[featureId];
  const weightShare = formatPercent(REFACTOR_WEIGHT_FACTOR ** count);
  const lostShare = formatPercent(ORIGINAL_WEIGHT - (ORIGINAL_WEIGHT - calculateRefactorChurnShare(state)) ** count);
  return `Its levels weigh ${weightShare} of what they did before its ${count === 1 ? 'refactor' : `${count} refactors`}, and ${lostShare} of its users left over the bugs.`;
}

function renderRefactored(state: GameState, featureId: FeatureId): string {
  const count = state.refactorCounts[featureId];
  return count > 0 ? `<p class="shop-effect is-tradeoff refactored-note">Refactored ${count}×${renderInfoTip([describeRefactored(state, featureId)])}</p>` : '';
}

function renderHeavyFeatureIfHeavy(state: GameState, featureId: FeatureId): string {
  return isFeatureTooHeavy(state, featureId) ? renderHeavyFeature(state, featureId) : '';
}

function renderFeatureRow(state: GameState, featureId: FeatureId, view: ShopView): string {
  const level = state.featureLevels[featureId];
  const isBuildable = isFeatureBuildable(state, featureId);
  const levelChip = level > 0 ? `<span class="level-chip">Lv ${level}</span>` : '<span class="level-chip is-new">New</span>';
  const effect = isBuildable
    ? renderBuildableEffect(state, featureId)
    : `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(FEATURES_BY_ID[featureId].requiredSkillId))}</p>`;
  const button = isBuildable ? renderFeatureBuyButtons(state, featureId) : lockedButton();
  const toggle = renderFeatureSwitchIfSwitchable(state, featureId) + renderScrollJackingSwitchIfShown(state, featureId, view);
  return `<article class="shop-row${isBuildable ? '' : ' is-locked'}">
    <div class="shop-icon">${FEATURE_ICONS[featureId]}</div>
    <div class="shop-info">
      <h3 class="shop-name">${escapeHtml(getFeatureDisplayName(featureId, state.eraId))} ${levelChip}${renderSpecializationBadge(featureId)}</h3>
      <p class="shop-desc">${escapeHtml(FEATURES_BY_ID[featureId].description)}</p>
      ${effect}
      ${renderRefactored(state, featureId)}
      ${toggle}
    </div>
    ${button}
  </article>`;
}

function renderFeatureGroup(state: GameState, eraId: EraId, view: ShopView): string {
  const featureIds = getUnlockedFeatureIds(state).filter((featureId) => findShownEraId(FEATURES_BY_ID[featureId].eraId) === eraId);
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
  const eras = ERA_IDS.filter((eraId) => isEraUnlocked(state, eraId) && findShownEraId(eraId) === eraId).reverse();
  return `${eras.map((eraId) => renderFeatureGroup(state, eraId, view)).join('')}${renderRetiredFeatures(state)}`;
}

// ---------- Effects ----------

/** Money per visitor is cents and fractions of them: three decimals, like the ad slot's line. */
const PER_VISITOR_DECIMALS = 3;

const EFFECT_DESCRIPTIONS: { readonly [K in UpgradeEffect['kind']]: (effect: Extract<UpgradeEffect, { kind: K }>, eraId: EraId) => string } = {
  'keystroke-value-multiplier': (effect) => `Typing earns ${formatFactor(effect.factor)} this era`,
  'keystroke-revenue-share': (effect) => `Each keystroke also earns ${formatPercent(effect.share)} of your revenue per second`,
  'bug-chance-reduction': (effect) => `Typo chance −${formatPercent(effect.amount)} this era`,
  'auto-keystrokes': (effect) => `Types ${effect.perSecond} ${effect.perSecond === 1 ? 'keystroke' : 'keystrokes'} a second for you this era, even while you’re away`,
  'feature-traffic-multiplier': (effect, eraId) => `${getFeatureDisplayName(effect.featureId, eraId)} traffic ${formatFactor(effect.factor)}`,
  'global-traffic-multiplier': (effect) => `All traffic ${formatFactor(effect.factor)}`,
  'ad-value-multiplier': (effect) => `Ads pay ${formatFactor(effect.factor)}`,
  'ad-annoyance-multiplier': (effect) => `Ads annoy visitors ${formatFactor(effect.factor)}`,
  'page-weight-multiplier': (effect) => `Page weight ${formatFactor(effect.factor)}`,
  'refactor-churn-multiplier': (effect) => `Users a refactor’s bugs drive off ${formatFactor(effect.factor)}, past refactors too`,
  'load-time-multiplier': (effect) => `Load time ${formatFactor(effect.factor)}`,
  'feature-cost-multiplier': (effect) => `Features cost ${formatFactor(effect.factor)}`,
  'ops-cost-multiplier': (effect) => `Ops items cost ${formatFactor(effect.factor)}`,
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
  'ai-answer-share-multiplier': (effect) => `Visitors kept away by AI answers ${formatFactor(effect.factor)}`,
  'direct-revenue-per-visitor': (effect, eraId) => `+$${(effect.amount / ERAS_BY_ID[eraId].revenuePace).toFixed(PER_VISITOR_DECIMALS)} per visitor, ads or not`,
  'auto-level': (effect, eraId) => `Every ${formatSeconds(effect.everyMs)}, ${describeLevelTarget(effect.featureId, eraId)} gains a level, offline too`,
  'keystrokes-level': (effect, eraId) => `Every ${effect.keystrokes} keystrokes you type: +1 ${getFeatureDisplayName(effect.featureId, eraId)} level`,
  'traffic-growth': (effect, eraId) => `${getFeatureDisplayName(effect.featureId, eraId)} traffic +${formatPercent(effect.perMinute)} a minute all era, up to ${formatFactor(effect.cap)}`,
  'network-effect': (effect) => `All traffic ${formatFactor(NEUTRAL_FACTOR + effect.perDoubling)} each time your site doubles this era, up to ${formatFactor(effect.cap)}`,
  'traffic-per-level': (effect, eraId) => `All traffic +${formatPercent(effect.perLevel)} for every ${getFeatureDisplayName(effect.sourceFeatureId, eraId)} level`,
  algorithm: (effect) => `Your busiest feature’s traffic ${formatFactor(effect.topFactor)}${describeRestOfAlgorithm(effect.restFactor)}`,
  'moment-traffic': (effect, eraId) => `${describeTrafficOf(effect.featureId, eraId)} traffic ${formatFactor(effect.factor)} ${MOMENT_LABELS[effect.moment]}`,
  'moment-revenue': (effect) => `Every visitor pays ${formatFactor(effect.factor)} ${MOMENT_LABELS[effect.moment]}`,
  'spike-frequency-multiplier': (effect) => `Traffic spikes come ${formatFactor(effect.factor)} as often`,
  'spike-on-fire': () => 'Catching fire starts a traffic spike',
  'levels-per-clean': (effect, eraId) => `Cleaning up ${describeCleanup(effect.infection)}: +${effect.levels} ${getFeatureDisplayName(effect.featureId, eraId)} levels each time`,
  support: (effect, eraId) =>
    `+$${((effect.adSlots * ERAS_BY_ID[eraId].adValuePerVisitor) / ERAS_BY_ID[eraId].revenuePace).toFixed(PER_VISITOR_DECIMALS)} per visitor from supporters (what ${effect.adSlots} banners would pay), ${formatPercent(effect.lostSharePerAd)} less for every ad`,
  donations: (effect, eraId) => `+$${(effect.amount / ERAS_BY_ID[eraId].revenuePace).toFixed(PER_VISITOR_DECIMALS)} per visitor in donations, ${formatPercent(effect.lostSharePerAd)} less for every ad`,
  subscribers: (effect) => `${formatPercent(effect.share)} of visitors subscribe: steady pay, ads or not, that follows your traffic slowly`,
  'subscriber-churn-multiplier': (effect) => `Subscribers leave ${formatFactor(effect.factor)} as fast`,
  'scheduled-buff': (effect) => `Every ${formatSeconds(effect.everyMs)}: ${describeBuff(effect.buffId)}`,
  'phone-revenue-multiplier': (effect) => `Phone visitors pay ${formatFactor(effect.factor)}`,
  'revenue-per-feature-level': (effect) => `Every visitor pays +${formatPercent(effect.share)} for each level of this era’s features`,
  'ad-value-per-specialization': (effect) => `Ads pay +${formatPercent(effect.share)} for every specialization you’ve held`,
  'offer-frequency-multiplier': (effect) => `Offers come ${formatFactor(effect.factor)} as often`,
  'ai-answers-pay': (effect) => `Visitors kept away by AI answers still pay ${formatPercent(effect.share)} of what they would have`,
  'auto-keystroke-multiplier': (effect) => `Hired help types ${formatFactor(effect.factor)} as fast`,
  'auto-buyer': (effect) => `Every ${formatSeconds(effect.everyMs)}, buys the feature level with the most visitors for the money`,
};

const MOMENT_LABELS: Readonly<Record<SiteMoment, string>> = {
  'on-fire': 'while you’re on fire',
  typing: 'while you keep typing',
  idle: 'when you stop typing',
  spike: 'during a traffic spike',
};

const BUFF_TARGET_LABELS: Readonly<Record<BuffTarget, string>> = {
  typing: 'typing pays',
  traffic: 'traffic',
  'ad-value': 'ads pay',
};

const SECONDS_PER_MINUTE = 60;

/** "20 s" under a minute, "2 min" from a minute on. */
function formatSeconds(ms: number): string {
  const seconds = Math.round(ms / MS_PER_SECOND);
  return seconds < SECONDS_PER_MINUTE ? `${seconds} s` : `${Math.round(seconds / SECONDS_PER_MINUTE)} min`;
}

function describeLevelTarget(featureId: FeatureId | null, eraId: EraId): string {
  return featureId === null ? 'your smallest feature this era' : getFeatureDisplayName(featureId, eraId);
}

function describeTrafficOf(featureId: FeatureId | null, eraId: EraId): string {
  return featureId === null ? 'All' : getFeatureDisplayName(featureId, eraId);
}

function describeRestOfAlgorithm(restFactor: number): string {
  return restFactor === NEUTRAL_FACTOR ? '' : `, every other feature’s ${formatFactor(restFactor)}`;
}

function describeCleanup(infection: InfectionKind | null): string {
  return infection === null ? 'any trouble' : HAZARD_NAMES[infection];
}

function describeBuff(buffId: BuffId): string {
  const buff = BUFFS_BY_ID[buffId];
  return `${buff.name}, ${BUFF_TARGET_LABELS[buff.target]} ${formatFactor(buff.factor)} for ${formatSeconds(buff.durationMs)}`;
}

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

/** The three lists of things you already have. Every name in them is a link to the real thing. */
type VisitedList = 'learned' | 'bought' | 'running';

interface VisitedListCopy {
  readonly title: string;
  /** Behind the little i: that these are real links, and you can actually learn this. */
  readonly info: string;
}

const VISITED_LISTS: Readonly<Record<VisitedList, VisitedListCopy>> = {
  learned: {
    title: 'Learned (visited links)',
    info: 'These are real links: each opens the real documentation for what you learned (MDN, the official docs, or Wikipedia for the history), so you can learn it for real.',
  },
  bought: {
    title: 'Bought (visited links)',
    info: 'Real links too: what each of these really was, in the web’s actual history. Some of them were even good ideas.',
  },
  running: {
    title: 'Running',
    info: 'Real links: how each of these works in real life. Same 3am pager, fewer minigames.',
  },
};

/**
 * A small i: hover it, or tap it on a phone, for the note, one paragraph a line. The note hangs from the i's row, not
 * the i, so the panel's edge can't cut it off.
 */
function renderInfoTip(lines: readonly string[]): string {
  const paragraphs = lines.map((line) => `<span class="info-tip-line">${escapeHtml(line)}</span>`).join('');
  return `<span class="info-tip" tabindex="0" aria-label="${escapeHtml(lines.join(' '))}">i<span class="info-tip-text" role="tooltip">${paragraphs}</span></span>`;
}

/**
 * What it did, the way its shop row said before you bought it: what it unlocked and its effects, in the era it was
 * bought in, and whether it has since gone out of fashion.
 */
export function describeWhatItDid(state: GameState, upgradeId: UpgradeId): string {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  const unlocked = listUnlocks(upgrade.eraId, upgradeId);
  const unlocks = unlocked.length === 0 ? [] : [`Unlocks: ${unlocked.join(', ')}`];
  const retired = isUpgradeRetired(state, upgradeId) ? ['out of fashion now'] : [];
  return [...unlocks, describeUpgradeEffects(upgrade.effects, upgrade.eraId), ...retired].filter((part) => part !== '').join(' · ');
}

/** The link stays exactly as it was; what it did sits under it. */
function renderVisitedEntry(state: GameState, upgradeId: UpgradeId): string {
  return `<li class="visited-entry">${renderVisitedItem(state, upgradeId)}<span class="visited-effect">${escapeHtml(describeWhatItDid(state, upgradeId))}</span></li>`;
}

const EARLIER_ERA_NOTE = '<p class="visited-note">What each did when you bought it. Typing multipliers, typo cuts, hires and ops multipliers count only in their own era.</p>';

/** This era's things open; each earlier era's folded away under its year, so a long game doesn't bury the shop. */
function renderVisitedGroup(state: GameState, eraId: EraId, upgradeIds: readonly UpgradeId[]): string {
  const entries = `<ul class="visited-entries">${upgradeIds.map((upgradeId) => renderVisitedEntry(state, upgradeId)).join('')}</ul>`;
  return eraId === state.eraId ? entries : `<details class="visited-era"><summary>From ${ERAS_BY_ID[eraId].year} · ${upgradeIds.length}</summary>${EARLIER_ERA_NOTE}${entries}</details>`;
}

/** Newest era first: the current one, then back through history. */
function renderVisitedGroups(state: GameState, upgradeIds: readonly UpgradeId[]): string {
  return [...ERA_IDS]
    .reverse()
    .map((eraId) => ({ eraId, ids: upgradeIds.filter((upgradeId) => findShownEraId(UPGRADES_BY_ID[upgradeId].eraId) === eraId) }))
    .filter((group) => group.ids.length > 0)
    .map((group) => renderVisitedGroup(state, group.eraId, group.ids))
    .join('');
}

function renderVisitedList(state: GameState, upgradeIds: readonly UpgradeId[], list: VisitedList): string {
  if (upgradeIds.length === 0) return '';
  const copy = VISITED_LISTS[list];
  return `<h3 class="shop-group-title has-info">${escapeHtml(copy.title)}${renderInfoTip([copy.info])}</h3><div class="visited-groups">${renderVisitedGroups(state, upgradeIds)}</div>`;
}

// ---------- Learn ----------

/** What a skill opens up in an era: features to build, and the era's ads when it's the ad skill. */
function listUnlocks(eraId: EraId, skillId: UpgradeId): readonly string[] {
  const features = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].requiredSkillId === skillId).map((featureId) => getFeatureDisplayName(featureId, eraId));
  const unlocksAds = ERAS_BY_ID[eraId].adSkillId === skillId ? [`${ERAS_BY_ID[eraId].adLabel}s`] : [];
  return [...features, ...unlocksAds];
}

function describeUnlocks(state: GameState, skillId: UpgradeId): string {
  const unlocked = listUnlocks(state.eraId, skillId);
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
      <h3 class="shop-name">${escapeHtml(skill.name)}${renderSpecializationBadge(skillId)}</h3>
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
  return `<h3 class="shop-group-title">Curriculum</h3>${rows}${renderVisitedList(state, learnedSkills(state), 'learned')}`;
}

// ---------- Upgrades (boosts) ----------

const TYPING_EFFECT_KINDS: readonly UpgradeEffect['kind'][] = ['keystroke-value-multiplier', 'keystroke-revenue-share', 'bug-chance-reduction', 'auto-keystrokes'];

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
      <h3 class="shop-name">${escapeHtml(upgrade.name)}${renderSpecializationBadge(upgradeId)}</h3>
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
  return `<h3 class="shop-group-title">Available</h3>${rows}${renderVisitedList(state, boughtBoosts(state), 'bought')}`;
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
  'scraper-swarm': 'AI scraper swarms',
  hallucination: 'chatbot hallucinations',
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

/**
 * The verdict on one more banner: what it adds to your income, after the visitors it drives away. A banner that pays
 * says so plainly; one that wouldn't says why. None at all on a page that's full.
 */
function renderNextAdVerdict(state: GameState): string {
  const room = findAdRoom(state) - state.adCount;
  if (room <= 0) return '';
  const gain = calculateNextAdGain(state);
  return gain > 0 ? renderAdGain(gain) : renderAdLoss(state, gain, room);
}

function renderAdGain(gain: number): string {
  return `<p class="shop-effect is-gain">Next banner: +${formatMoney(gain)}/s, after the visitors it costs</p>`;
}

/** Why the next one loses: the visitors it annoys away, or, while supporters still give, the supporters it costs. */
function describeAdLossCause(state: GameState): string {
  return hasSupportersToLose(state) ? `each one drives off ${formatPercent(SUPPORT_LOST_PER_AD)} of your supporters` : 'it would drive away more than it pays';
}

function formatSignedMoney(perSecond: number): string {
  return `${perSecond >= 0 ? '+' : '−'}${formatMoney(Math.abs(perSecond))}`;
}

/**
 * One banner losing isn't the whole story: once the supporters have gone, more banners pay again. The full page's
 * total says whether the ad path pays off from here.
 */
function renderAdLoss(state: GameState, gain: number, room: number): string {
  const fullPage = calculateAdsGain(state, room);
  return `<p class="shop-effect is-loss">Next banner: −${formatMoney(-gain)}/s: ${describeAdLossCause(state)}</p>
      <p class="shop-effect ${fullPage > 0 ? 'is-gain' : 'is-loss'}">A full page (${room} more): ${formatSignedMoney(fullPage)}/s overall</p>`;
}

/** The first banner costs nothing: say so, rather than "$0". */
function describeAdPrice(cost: number): string {
  return cost === 0 ? '+ Free' : `+ ${formatMoney(cost)}`;
}

function renderAdControls(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  if (!canUseAds(state)) return `<p class="shop-effect is-requirement">Requires: ${escapeHtml(skillName(era.adSkillId))}</p>`;
  const placeButton = state.adCount >= era.maxAds
    ? '<button type="button" class="buy-button" disabled>Full</button>'
    : buyButton('place-ad', 'ad', calculateNextAdCost(state), describeAdPrice(calculateNextAdCost(state)));
  const removeButton = `<button type="button" class="ghost-button" data-action="remove-ad" ${state.adCount === 0 ? 'disabled' : ''}>Remove one</button>`;
  return `<p class="shop-effect">Each ad: +$${calculateAdValuePerAd(state).toFixed(PER_VISITOR_DECIMALS)} per visitor, −${formatPercent(calculateAdAnnoyancePerAd(state))} visitors</p>
      ${renderNextAdVerdict(state)}
      <p class="shop-effect is-muted">Now: $${calculateRevenuePerVisitor(state).toFixed(PER_VISITOR_DECIMALS)} per visitor · ads cost you ${formatPercent(NEUTRAL_FACTOR - calculateAdTrafficFactor(state))} of visitors</p>
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
  return `<h3 class="shop-group-title">DevOps</h3>${rows}${renderVisitedList(state, boughtOps(state), 'running')}`;
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
  specialize: (state, view) => renderSpecializeTab(state, view.foundSpecializationIds),
};

export function renderShopBody(state: GameState, tab: ShopTab, view: ShopView): string {
  return TAB_RENDERERS[tab](state, view);
}

/** The Specialize tab joins the others from 2005 in the second run. */
export function isShopTabShown(state: GameState, tab: ShopTab): boolean {
  return tab !== 'specialize' || isSpecializeTabShown(state);
}

export function renderShopTabs(activeTab: ShopTab, state: GameState): string {
  return SHOP_TABS.filter((tab) => isShopTabShown(state, tab))
    .map(
      (tab) =>
        `<button type="button" class="shop-tab${tab === activeTab ? ' is-active' : ''}" role="tab" aria-selected="${tab === activeTab}" data-action="shop-tab" data-id="${tab}">${SHOP_TAB_LABELS[tab]}<span class="tab-badge" data-tab-badge="${tab}" hidden></span></button>`,
    )
    .join('');
}

/**
 * What a tab has that you could buy right now, each as its card's key: the buy button's action and id (shop-seen.ts
 * reads the same from the page), and for what can be bought again and again, which one this is. The badges count
 * these, less the ones you've already seen.
 */
const keysOf = (action: string, ids: readonly string[]): readonly string[] => ids.map((id) => `${action}:${id}`);
/** A specialization card coming into view, keyed like a button: shop-seen.ts reads the card's data-specialization. */
const SPECIALIZATION_CARD = 'spec-card';
/** Cards in view with nothing found in earlier runs: only what this run brings into view is news. */
const NOTHING_FOUND: readonly SpecializationId[] = [];

function listAffordableDefenses(state: GameState): readonly string[] {
  const ids = getUnlockedDefenseIds(state).filter((defenseId) => !state.ownedDefenseIds.includes(defenseId) && state.money >= DEFENSES_BY_ID[defenseId].cost);
  return keysOf('buy-defense', ids);
}

function listAffordableOps(state: GameState): readonly string[] {
  return keysOf('buy-upgrade', getAvailableOpsIds(state).filter((upgradeId) => state.money >= calculateUpgradeCost(state, upgradeId)));
}

/** The next hosting tier, when you can pay for it. */
function listAffordableHosting(state: GameState): readonly string[] {
  const next = getNextHostingTier(state);
  return next !== null && canUpgradeHosting(state) ? [`upgrade-hosting:${next.id}`] : [];
}

/** The one-off buttons of the Ops tab: the next banner (which one it is) and a certificate renewal. */
function listAffordableOneOffs(state: GameState): readonly string[] {
  return [...(canPlaceAd(state) ? [instanceKey('place-ad:ad', state.adCount)] : []), ...(canRenewCertificate(state) ? ['renew-certificate:certificate'] : [])];
}

function isFeatureAffordable(state: GameState, featureId: FeatureId): boolean {
  return isFeatureBuildable(state, featureId) && state.money >= calculateNextFeatureCost(state, featureId);
}

/** Every level of a feature is a new purchase: the next one counts again once the last is bought. */
function listAffordableFeatures(state: GameState): readonly string[] {
  return getUnlockedFeatureIds(state).filter((featureId) => isFeatureAffordable(state, featureId)).map((featureId) => instanceKey(`buy-feature:${featureId}`, state.featureLevels[featureId]));
}

/** This era's specialization cards, while it hasn't chosen one: a card coming into view is news too. */
function listSpecializationCards(state: GameState): readonly SpecializationId[] {
  const hasChosen = findSpecializationOfEra(state, ERAS_BY_ID[state.eraId].baseEraId) !== null;
  return hasChosen ? [] : TREE_IDS.filter((id) => isSpecializationInView(state, id, NOTHING_FOUND));
}

function listSpecializeNews(state: GameState): readonly string[] {
  return [...keysOf(SPECIALIZATION_CARD, listSpecializationCards(state)), ...keysOf('open-specialization', TREE_IDS.filter((id) => canChooseSpecialization(state, id)))];
}

const AFFORDABLE_KEYS: Readonly<Record<ShopTab, (state: GameState) => readonly string[]>> = {
  learn: (state) => keysOf('buy-upgrade', getAvailableSkillIds(state).filter((skillId) => state.money >= calculateUpgradeCost(state, skillId))),
  build: listAffordableFeatures,
  upgrades: (state) => keysOf('buy-upgrade', getRevealedBoostIds(state).filter((upgradeId) => state.money >= calculateUpgradeCost(state, upgradeId))),
  security: (state) => [...listAffordableDefenses(state), ...listAffordableOps(state), ...listAffordableHosting(state), ...listAffordableOneOffs(state)],
  specialize: listSpecializeNews,
};

export function listAffordableKeys(state: GameState, tab: ShopTab): readonly string[] {
  return AFFORDABLE_KEYS[tab](state);
}

const NOTHING_SEEN: ReadonlySet<string> = new Set();

/**
 * What a card on screen has just been seen as: its tab's keys for that card, among what can be bought right now. A
 * card you can't afford, or a specialization you can't choose yet, isn't news yet, and stays counted for when it is.
 */
export function findSeenKeys(state: GameState, tab: ShopTab, cardKeys: readonly string[]): readonly string[] {
  return listAffordableKeys(state, tab).filter((key) => cardKeys.includes(baseOfShopKey(key)));
}

/** What the tab's badge says: what you could buy and haven't yet seen while you could. */
export function countAffordable(state: GameState, tab: ShopTab, seen: ReadonlySet<string> = NOTHING_SEEN): number {
  return listAffordableKeys(state, tab).filter((key) => !seen.has(key)).length;
}

export function calculateShopSignature(state: GameState, tab: ShopTab, view: ShopView): string {
  return [
    tab,
    view.isScrollJackingOn,
    // The Specialize tab redraws as you get closer; worked out only while it's open.
    tab === 'specialize' ? calculateSpecializeTabSignature(state, view.foundSpecializationIds) : state.specializationIds.join(','),
    isSpecializeTabShown(state),
    state.eraId,
    // A later run lists features the first doesn't have.
    state.runNumber,
    Object.values(state.featureLevels).join(','),
    state.adCount,
    state.purchasedUpgradeIds.join(','),
    state.ownedDefenseIds.join(','),
    state.enabledDefenseIds.join(','),
    state.switchedOffFeatureIds.join(','),
    Object.values(state.refactorCounts).join(','),
    state.consentBanner,
    state.hostingTier,
    ERAS_BY_ID[state.eraId].hasServerLoad ? Math.round(calculateServerLoad(state) * 20) : 0,
    getRevealedBoostIds(state).join(','),
    state.infections.map((infection) => infection.featureId).join(','),
    state.isCertificateExpired ? calculateCertificateRenewalFee(state) : 0,
  ].join('|');
}
