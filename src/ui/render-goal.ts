import {
  calculateGateChecks,
  calculatePerformanceTrafficFactor,
  calculateServerLoad,
  isSiteDown,
  canUseAds,
  getAvailableSkillIds,
  UPGRADES_BY_ID,
  ERAS_BY_ID,
  formatCompactNumber,
  formatMoney,
  getFeatureDisplayName,
  isEraGateComplete,
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
    text: 'A virus is blocking one of your features. Click it and play snake to remove it. It grows the longer you wait.',
  },
  {
    applies: (state) => state.infections.length > 0,
    text: 'Spam is drowning your comments. Click it to delete the spam.',
  },
  {
    applies: (state) => isSiteDown(state),
    text: 'Your server gave up: the whole site is a 503 page and nobody gets in. Upgrade your hosting under Ops.',
  },
  {
    applies: (state) => calculateServerLoad(state) > SERVER_WARNING_LOAD,
    text: 'Your server is close to full. Over 100% pages slow down, and at 200% the site goes down. Upgrade your hosting under Ops.',
  },
  {
    applies: (state) => calculatePerformanceTrafficFactor(state) < SLOW_PAGE_FACTOR,
    text: 'Your page loads so slowly that visitors give up before it finishes. Make it lighter (fewer ads, smaller files) or faster.',
  },
  {
    applies: (state) => state.popups.length >= POPUP_NAG_COUNT,
    text: 'Every open pop-up drives visitors away. Close them, or switch to a pickier ad network.',
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
    applies: (state) => getAvailableSkillIds(state).some((skillId) => state.money >= UPGRADES_BY_ID[skillId].cost),
    text: 'You can afford a new skill. Every tag you learn changes your page and unlocks new things to build.',
  },
];

function findHint(state: GameState): string {
  const rule = HINT_RULES.find((candidate) => candidate.applies(state));
  const era = ERAS_BY_ID[state.eraId];
  return rule?.text ?? `Finish the checklist to relaunch your site as ${era.nextEraName}.`;
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

/** While locked: the requirement chips. Once everything is met, the chips make way for the Launch button. */
export function renderGoal(state: GameState): string {
  const era = ERAS_BY_ID[state.eraId];
  const checks = calculateGateChecks(state);
  const target = `<div class="goal-era"><span class="goal-eyebrow">Next era</span><span class="goal-target"><span class="goal-year">${era.nextEraYear}</span><span class="goal-name">${escapeHtml(era.nextEraName)}</span></span></div>`;
  const body = isEraGateComplete(state)
    ? `<button type="button" class="migrate-button" data-action="migrate">${escapeHtml(era.migrationLabel)}</button>`
    : `<ul class="gate-list">${checks.map((check, index) => renderGateRow(state, check, index)).join('')}</ul>`;
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
