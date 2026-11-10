import {
  calculateInfectionDifficulty,
  DEFENSES_BY_ID,
  ERAS_BY_ID,
  getAvailableSkillIds,
  getFeatureDisplayName,
  getNextHostingTier,
  getUnlockedDefenseIds,
  calculateServerLoad,
  hasTrafficSpikeCache,
  isBoostRevealed,
  isSiteDown,
  UPGRADES_BY_ID,
} from '../engine';
import type { DefenseId, GameState, Infection, InfectionKind, MinigameId } from '../engine';
import { pickCyclic } from './dom';
import type { ShopTab } from './render-shop';

export type IssueSeverity = 'critical' | 'major' | 'minor';
export type IssueLiveSlot = 'infection-timer' | 'server-load' | 'spike-remaining';

export interface IssueButton {
  readonly label: string;
  readonly action: 'open-minigame' | 'open-shop-tab';
  readonly id: string;
}

/** One ticket in the issue tracker: something that needs you, and what to do about it. */
export interface Issue {
  readonly key: string;
  /** The bug number in 2005; also orders tickets of the same severity. */
  readonly number: number;
  readonly severity: IssueSeverity;
  /** The bug title (2005). */
  readonly title: string;
  /** The email (1997): who wrote in, and what they wrote. */
  readonly sender: string;
  readonly subject: string;
  /** Static detail, followed by a live part that updates in place. */
  readonly summary: string;
  readonly liveSlot: IssueLiveSlot;
  readonly liveId: number;
  readonly fix: IssueButton | null;
  /** The passive fix you could buy instead, while you don't have it. */
  readonly prevention: IssueButton | null;
}

const BUG_NUMBER_OFFSET = 1_000;
/** Bug numbers for the server tickets, after the status codes they cause. */
const SITE_DOWN_NUMBER = 503;
const OVERLOAD_NUMBER = 429;
const SPIKE_NUMBER = 200;
const SEVERITY_ORDER: readonly IssueSeverity[] = ['critical', 'major', 'minor'];

const MINIGAME_NAMES: Readonly<Record<MinigameId, string>> = {
  snake: 'Snake',
  'virus-scan': 'Virus scan',
  firewall: 'Firewall',
  'spam-sort': 'Sort the comments',
  'backup-restore': 'Restore a backup',
};

const SENDERS: readonly string[] = ['a_worried_fan@freemail.example', 'webmaster_wannabe@freemail.example', 'grandma_rose@freemail.example', 'cooldude97@freemail.example'];

interface InfectionCopy {
  readonly severity: IssueSeverity;
  readonly title: (feature: string) => string;
  readonly subjects: readonly ((feature: string) => string)[];
}

const INFECTION_COPY: Readonly<Record<InfectionKind, InfectionCopy>> = {
  virus: {
    severity: 'critical',
    title: (feature) => `Virus in ${feature}`,
    subjects: [(feature) => `ur ${feature} has a VIRUS!!!`, (feature) => `${feature} shows a skull??`, (feature) => `RE: RE: is your ${feature} supposed to do that`],
  },
  'sql-injection': {
    severity: 'major',
    title: (feature) => `SQL injection broke ${feature}`,
    subjects: [(feature) => `your ${feature} shows a weird database error`],
  },
  spam: {
    severity: 'minor',
    title: (feature) => `Spam flood in ${feature}`,
    subjects: [(feature) => `your ${feature} are full of ads??`],
  },
};

/** The defense that would have stopped this kind of infection. */
const PREVENTING_DEFENSES: Readonly<Partial<Record<InfectionKind, DefenseId>>> = { virus: 'antivirus', spam: 'captcha' };
const PREVENTING_SKILL = 'prepared-statements';

function shopButton(label: string, tab: ShopTab): IssueButton {
  return { label, action: 'open-shop-tab', id: tab };
}

function defensePrevention(state: GameState, defenseId: DefenseId): IssueButton | null {
  const isAvailable = getUnlockedDefenseIds(state).includes(defenseId) && !state.enabledDefenseIds.includes(defenseId);
  if (!isAvailable) return null;
  const verb = state.ownedDefenseIds.includes(defenseId) ? 'Turn on' : 'Prevent:';
  return shopButton(`${verb} ${DEFENSES_BY_ID[defenseId].name}`, 'security');
}

function skillPrevention(state: GameState): IssueButton | null {
  return getAvailableSkillIds(state).includes(PREVENTING_SKILL) ? shopButton(`Prevent: ${UPGRADES_BY_ID[PREVENTING_SKILL].name}`, 'learn') : null;
}

function findPrevention(state: GameState, kind: InfectionKind): IssueButton | null {
  const defenseId = PREVENTING_DEFENSES[kind];
  return defenseId === undefined ? skillPrevention(state) : defensePrevention(state, defenseId);
}

function infectionIssue(state: GameState, infection: Infection): Issue {
  const copy = INFECTION_COPY[infection.kind];
  const feature = getFeatureDisplayName(infection.featureId, state.eraId).toLowerCase();
  const subject = pickCyclic(copy.subjects, infection.id, copy.subjects[0] ?? (() => 'help'));
  return {
    key: `infection-${infection.id}`,
    number: BUG_NUMBER_OFFSET + infection.id,
    severity: copy.severity,
    title: copy.title(feature),
    sender: pickCyclic(SENDERS, infection.id, 'visitor@freemail.example'),
    subject: subject(feature),
    summary: `${MINIGAME_NAMES[infection.minigameId]}, level ${calculateInfectionDifficulty(infection)}`,
    liveSlot: 'infection-timer',
    liveId: infection.id,
    fix: { label: 'Fix it', action: 'open-minigame', id: String(infection.id) },
    prevention: findPrevention(state, infection.kind),
  };
}

function hostingFix(state: GameState): IssueButton | null {
  return getNextHostingTier(state) === null ? null : shopButton('Upgrade hosting', 'security');
}

function serverIssue(state: GameState): Issue | null {
  const isDown = isSiteDown(state);
  if (!isDown && calculateServerLoad(state) <= 1) return null;
  return {
    key: 'server',
    number: isDown ? SITE_DOWN_NUMBER : OVERLOAD_NUMBER,
    severity: isDown ? 'critical' : 'major',
    title: isDown ? 'Site down: most visitors get a 503 page' : 'Server overloaded: pages are slowing down',
    sender: 'server@localhost',
    subject: 'Server overloaded',
    summary: 'Server',
    liveSlot: 'server-load',
    liveId: 0,
    fix: hostingFix(state),
    prevention: null,
  };
}

/** A spike is only a ticket while it can hurt you: with a page cache there is nothing to do. */
function spikeIssue(state: GameState): Issue | null {
  if (state.trafficSpikeRemainingMs <= 0 || hasTrafficSpikeCache(state)) return null;
  return {
    key: 'spike',
    number: SPIKE_NUMBER,
    severity: 'minor',
    title: 'Front-page traffic spike: five times the visitors',
    sender: 'server@localhost',
    subject: 'Traffic spike',
    summary: 'Traffic spike',
    liveSlot: 'spike-remaining',
    liveId: 0,
    fix: null,
    prevention: isBoostRevealed(state, 'page-cache') ? shopButton(`Prevent: ${UPGRADES_BY_ID['page-cache'].name}`, 'upgrades') : null,
  };
}

function compareIssues(first: Issue, second: Issue): number {
  return SEVERITY_ORDER.indexOf(first.severity) - SEVERITY_ORDER.indexOf(second.severity) || first.number - second.number;
}

/** Everything that needs you right now, most urgent first. Pop-ups aren't tickets: you close them on the page. */
export function listIssues(state: GameState): readonly Issue[] {
  const server = ERAS_BY_ID[state.eraId].hasServerLoad ? [serverIssue(state), spikeIssue(state)] : [];
  const issues = [...state.infections.map((infection) => infectionIssue(state, infection)), ...server];
  return issues.filter((issue): issue is Issue => issue !== null).sort(compareIssues);
}
