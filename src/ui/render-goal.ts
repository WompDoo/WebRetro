import {
  calculateGateChecks,
  FEATURE_IDS,
  isFeaturePluginDead,
  calculatePerformanceTrafficFactor,
  calculatePhoneLoadTimeSeconds,
  calculateServerLoad,
  isSiteDown,
  canUseAds,
  getAvailableSkillIds,
  calculateUpgradeCost,
  ERAS_BY_ID,
  formatCompactNumber,
  formatMoney,
  getFeatureDisplayName,
  isEraGateComplete,
  findChosenFramework,
  isRenderedOnlyInBrowser,
} from '../engine';
import type { GameState, GateCheck, GateRequirementKind } from '../engine';
import { escapeHtml } from './dom';

interface HintRule {
  readonly applies: (state: GameState) => boolean;
  readonly text: string;
}

const FIRST_KEYSTROKES = 8;
const POPUP_NAG_COUNT = 2;
const SERVER_WARNING_LOAD = 0.85;
const SLOW_PAGE_FACTOR = 0.9;
const ERA_ONE_MAX_ADS = 6;

/** Phones in the era, and a page that takes longer than the era's patience on their network. */
function isSlowOnPhones(state: GameState): boolean {
  const era = ERAS_BY_ID[state.eraId];
  return era.mobileShare > 0 && calculatePhoneLoadTimeSeconds(state) > era.patienceSeconds;
}

function hasDeadFeature(state: GameState): boolean {
  return FEATURE_IDS.some((featureId) => state.featureLevels[featureId] > 0 && isFeaturePluginDead(state, featureId));
}

/** Ads are tracking visitors and nothing asks them first. */
function isFinedForTracking(state: GameState): boolean {
  return state.adCount > 0 && state.consentBanner === 'none';
}

const HINT_RULES: readonly HintRule[] = [
  {
    applies: (state) => state.keystrokes < FIRST_KEYSTROKES,
    text: 'Click the code editor or type on your keyboard. Every keystroke earns freelance money.',
  },
  {
    applies: (state) => state.purchasedUpgradeIds.length === 0,
    text: 'Your page just says Hello World. Open the Learn tab and learn your first HTML tag.',
  },
  {
    applies: (state) => Object.values(state.featureLevels).every((level) => level === 0),
    text: 'You know the <IMG> tag now. Build a hit counter in the Build tab.',
  },
  {
    applies: (state) => state.adCount === 0 && canUseAds(state),
    text: 'You have visitors, but visitors don’t pay the bills. Place a banner ad under Ads & security.',
  },
  {
    applies: (state) => state.infections.some((infection) => infection.kind === 'virus'),
    text: 'A virus is blocking one of your features. Click it to fight it in a minigame. It gets harder the longer you wait; fix it fast for a traffic bonus.',
  },
  {
    applies: (state) => state.infections.length > 0,
    text: 'Something broke one of your features. Click it to fix it in a minigame. Fix it fast for a traffic bonus.',
  },
  {
    applies: (state) => isSiteDown(state),
    text: 'Your server is overwhelmed: most visitors get a 503 page and your traffic is stuck at what it can serve. Upgrade your hosting under Ops.',
  },
  {
    applies: (state) => calculateServerLoad(state) > SERVER_WARNING_LOAD,
    text: 'Your server is close to full. Over 100% pages slow down, and at 200% the site goes down. Upgrade your hosting under Ops.',
  },
  {
    applies: isSlowOnPhones,
    text: 'Your page is slow on phones: their mobile networks are far slower than a desktop’s line, and phone visitors give up first. Flip the browser to Phone to see the load time there. Lighter pages load faster everywhere.',
  },
  {
    applies: (state) => calculatePerformanceTrafficFactor(state) < SLOW_PAGE_FACTOR,
    text: 'Every second your page takes to load costs visitors, and yours has become slow enough to notice. Make it lighter (fewer ads, smaller files) or faster.',
  },
  {
    applies: (state) => state.popups.length >= POPUP_NAG_COUNT,
    text: 'Every open pop-up drives visitors away. Close them, or switch to a pickier ad network.',
  },
  {
    applies: (state) => state.eraId === 'social-2011' && !state.purchasedUpgradeIds.includes('responsive-design'),
    text: 'Four in ten of your visitors are on a phone, and most of them leave: your page doesn’t fit their screen (flip the browser to Phone to see it). Learn responsive design.',
  },
  {
    applies: (state) => state.eraId === 'platform-2018' && findChosenFramework(state) === null,
    text: 'It’s 2018 and everyone is arguing about frameworks. Learn React, Angular or Vue: it rewrites your site as a single-page app. You can only pick one, so read the trade-offs.',
  },
  {
    applies: isRenderedOnlyInBrowser,
    text: 'Your single-page app is blank until its JavaScript has run, and search engines index the blank page: three in ten visitors never find you. Learn your framework’s server rendering.',
  },
  {
    applies: (state) => state.eraId === 'platform-2018' && isFinedForTracking(state),
    text: 'It’s 2018 and the GDPR is in force: your ads track visitors who never said yes, and complaints turn into fines. Pick a cookie banner under Ops.',
  },
  {
    applies: (state) => state.eraId === 'social-2011' && hasDeadFeature(state),
    text: 'Your podcast player ran on Flash, and Flash is dead: it shows a missing-plugin box and brings nothing. Learn HTML5 video and audio to rebuild it.',
  },
  {
    applies: (state) => state.eraId === 'platform-2018' && hasDeadFeature(state),
    text: 'Facespace switched off the API your “Sign in with…” ran on: it shows an error and brings nothing. Build your own login with OAuth to rebuild it.',
  },
  {
    applies: (state) => state.eraId === 'web2-2005' && !state.purchasedUpgradeIds.includes('learn-css'),
    text: 'It’s 2005 and your site still runs on <TABLE> tags. Learn CSS to rebuild it properly.',
  },
  {
    applies: (state) => state.eraId === 'web2-2005' && state.adCount <= ERA_ONE_MAX_ADS && !state.purchasedUpgradeIds.includes('contextual-text-ads'),
    text: 'It’s 2005: ads pay less, but you have room for more. With contextual text ads, your 1997 ad count is no longer the best.',
  },
  {
    applies: (state) => getAvailableSkillIds(state).some((skillId) => state.money >= calculateUpgradeCost(state, skillId)),
    text: 'You can afford a new skill. Every tag you learn changes your page and unlocks new things to build.',
  },
];

/** The last era of the prototype has no relaunch to point at. */
function describeGoal(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  return era.nextEraId === null ? 'Finish the checklist to finish the prototype.' : `Finish the checklist to relaunch your site as ${era.nextEraName}.`;
}

function findHint(state: GameState): string {
  const rule = HINT_RULES.find((candidate) => candidate.applies(state));
  return rule === undefined ? describeGoal(state) : rule.text;
}

const VALUE_FORMATTERS: Readonly<Record<GateRequirementKind, (value: number) => string>> = {
  'era-features-built': (value) => Math.floor(value).toString(),
  'feature-level': (value) => Math.floor(value).toString(),
  'visitors-per-second': (value) => formatCompactNumber(value),
  'migration-budget': (value) => formatMoney(value),
};

function formatGateValue(check: GateCheck): string {
  const format = VALUE_FORMATTERS[check.requirement.kind];
  return `${format(Math.min(check.current, check.requirement.target))}/${format(check.requirement.target)}`;
}

function gateFillPercent(check: GateCheck): number {
  const FULL = 100;
  return Math.min(FULL, (check.current / check.requirement.target) * FULL);
}

const SHORT_LABELS: Readonly<Record<GateRequirementKind, (requirement: GateCheck['requirement'], state: GameState) => string>> = {
  'era-features-built': () => 'Features',
  'feature-level': (requirement, state) => (requirement.featureId === null ? 'Level' : getFeatureDisplayName(requirement.featureId, state.eraId)),
  'visitors-per-second': () => 'Visitors/s',
  'migration-budget': () => 'Savings',
};

function renderGateRow(state: GameState, check: GateCheck, index: number): string {
  const shortLabel = SHORT_LABELS[check.requirement.kind](check.requirement, state);
  return `<li class="gate-row${check.isMet ? ' is-met' : ''}" data-gate-index="${index}" title="${escapeHtml(check.requirement.label)}">
    <span class="gate-check" aria-hidden="true">${check.isMet ? '✓' : ''}</span>
    <span class="gate-label">${escapeHtml(shortLabel)}</span>
    <span class="gate-value" data-gate-value>${formatGateValue(check)}</span>
    <span class="gate-bar"><span class="gate-fill" data-gate-fill style="width:${gateFillPercent(check).toFixed(1)}%"></span></span>
  </li>`;
}

/** Phones only: the objective as one line, "2 of 4 done", that opens the chips. */
function renderGoalToggle(checks: readonly GateCheck[]): string {
  const met = checks.filter((check) => check.isMet).length;
  return `<button type="button" class="goal-toggle" data-action="toggle-goal">${met} of ${checks.length} done<span class="goal-toggle-arrow" aria-hidden="true">▾</span></button>`;
}

/** While locked: the requirement chips. Once everything is met, the chips make way for the Launch button. */
export function renderGoal(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  const checks = calculateGateChecks(state);
  const target = `<div class="goal-era"><span class="goal-eyebrow">Next era</span><span class="goal-target"><span class="goal-year">${era.nextEraYear}</span><span class="goal-name">${escapeHtml(era.nextEraName)}</span></span></div>`;
  const body = isEraGateComplete(state)
    ? `<button type="button" class="migrate-button" data-action="migrate">${escapeHtml(era.migrationLabel)}</button>`
    : `${renderGoalToggle(checks)}<ul class="gate-list">${checks.map((check, index) => renderGateRow(state, check, index)).join('')}</ul>`;
  return `${target}${body}`;
}

export function renderTip(state: GameState): string {
  return `<p class="hint"><span class="hint-chip">Tip</span><span>${escapeHtml(findHint(state))}</span></p>`;
}

export function updateGoalProgress(container: HTMLElement, state: GameState): void {
  calculateGateChecks(state).forEach((check, index) => {
    const row = container.querySelector<HTMLElement>(`[data-gate-index="${index}"]`);
    const value = row?.querySelector<HTMLElement>('[data-gate-value]');
    const fill = row?.querySelector<HTMLElement>('[data-gate-fill]');
    if (value) value.textContent = formatGateValue(check);
    if (fill) fill.style.width = `${gateFillPercent(check).toFixed(1)}%`;
  });
}

export function calculateGoalSignature(state: GameState): string {
  const met = calculateGateChecks(state).map((check) => (check.isMet ? '1' : '0')).join('');
  return `${state.eraId}|${met}`;
}
