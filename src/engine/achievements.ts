import { ERAS_BY_ID } from './content/eras';
import { SPECIALIZATIONS_BY_ID } from './content/specializations';
import { UPGRADES_BY_ID } from './content/upgrades';
import {
  calculateLoadTimeSeconds,
  calculateNetRevenuePerSecond,
  calculatePageWeightKb,
  calculateVisitorsPerSecond,
  findChosenFramework,
  getActiveUpgradeIds,
  getHostingTier,
  isMobileFriendly,
  isSiteDown,
} from './economy';
import { listEraDurations } from './era-records';
import { INFECTION_MINIGAMES } from './hazards';
import { TREE_IDS } from './specializations';
import type { AchievementId, AnyMinigameId, EraId, FeatureId, FrameworkId, GameState, HazardKind, LegacyState, SpecializationId, UpgradeEffect, UpgradeId } from './types';

/**
 * Achievements: what a player has done, across every run in this browser. Each is checked against the game, its run
 * and the legacy as the game runs; once earned, it stays. A secret one shows only "???" until it's earned: finding out
 * what it asks is part of it. Many are the web's own history and folklore.
 */
export type AchievementCategory = 'early-web' | 'eras' | 'typing' | 'money' | 'traffic' | 'trouble' | 'ads' | 'tech' | 'tree' | 'odd';

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = ['early-web', 'eras', 'typing', 'money', 'traffic', 'trouble', 'ads', 'tech', 'tree', 'odd'];

export const ACHIEVEMENT_CATEGORY_NAMES: Readonly<Record<AchievementCategory, string>> = {
  'early-web': 'The early web',
  eras: 'Eras and runs',
  typing: 'Typing',
  money: 'Money',
  traffic: 'Traffic',
  trouble: 'Trouble',
  ads: 'Ads and cookies',
  tech: 'Tech',
  tree: 'The tree',
  odd: 'Odds and ends',
};

/** A later run, counted from the first: what it unlocks (the tree, Backlinks) stays out of sight until then. */
type RunReveal = 'start' | 'run-2' | 'run-3';

/**
 * When an achievement shows what it is: from the start, from a later run, or once a run reaches the era its mechanic
 * belongs to. Before that it's a blurred tile, so the window doesn't spoil what's coming.
 */
export type AchievementReveal = RunReveal | EraId;

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly category: AchievementCategory;
  readonly name: string;
  readonly icon: string;
  /** What it asks, once known: secret ones keep it to themselves until earned. */
  readonly description: string;
  readonly isSecret: boolean;
  readonly reveal: AchievementReveal;
  readonly isEarned: (state: GameState, legacy: LegacyState) => boolean;
}

type Check = (state: GameState, legacy: LegacyState) => boolean;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const SPEEDRUN_1997_MINUTES = 12;
const FOREVER_HOURS = 2;
const FULL_STACK = 4;
const EXPLORER_FINDS = 5;
const FIRES_THIS_IS_FINE = 100;
const FIRES_IN_ONE_ERA = 10;
const TYPOS = 100;
const CLEANUPS_IN_AN_ERA = 10;
const CLEANUPS_IN_A_RUN = 100;
const POPUPS_CLOSED = 100;
const SERIAL_WEBMASTER_RUNS = 5;
const PAGE_BLOAT_KB = 5_000;
const FAST_PAGE_SECONDS = 0.5;
const GPU_RICH = 100;
const WORLD_ECONOMY = 105e12;
const EARTH_POPULATION = 8e9;
const MILKY_WAY_STARS = 400e9;

const yearOf = (state: GameState): number => ERAS_BY_ID[state.eraId].year;
const reached =
  (year: number): Check =>
  (state) =>
    yearOf(state) >= year;
const level =
  (featureId: FeatureId, levels: number): Check =>
  (state) =>
    state.featureLevels[featureId] >= levels;
const bought =
  (upgradeId: UpgradeId): Check =>
  (state) =>
    state.purchasedUpgradeIds.includes(upgradeId);
const earnedInRun =
  (amount: number): Check =>
  (state) =>
    state.lifetimeEarnings >= amount;
const incomeOf =
  (perSecond: number): Check =>
  (state) =>
    calculateNetRevenuePerSecond(state) >= perSecond;
const visitorsOf =
  (perSecond: number): Check =>
  (state) =>
    calculateVisitorsPerSecond(state) >= perSecond;
const hitBy =
  (kind: HazardKind): Check =>
  (state) =>
    (state.runStats.hazards[kind] ?? 0) > 0;
const finishedWith =
  (condition: Check): Check =>
  (state, legacy) =>
    state.isGameFinished && condition(state, legacy);
const handTyped =
  (keystrokes: number): Check =>
  (state, legacy) =>
    legacy.handTypedKeystrokes + state.runStats.handTypedKeystrokes >= keystrokes;
const hasEffect =
  (kind: UpgradeEffect['kind']): Check =>
  (state) =>
    getActiveUpgradeIds(state).some((upgradeId) => UPGRADES_BY_ID[upgradeId].effects.some((effect) => effect.kind === kind));
const earnedAlready =
  (ids: readonly AchievementId[]): Check =>
  (_state, legacy) =>
    ids.every((id) => legacy.achievementIds.includes(id));
const withFramework =
  (framework: FrameworkId | null): Check =>
  (state) =>
    findChosenFramework(state) === framework;

/** How many instances, pods or GPUs the hosting runs, when it's that kind of hosting: 0 otherwise. */
function countHosting(state: GameState, prefix: string): number {
  const id = getHostingTier(state).id;
  return id.startsWith(prefix) ? Number(id.slice(prefix.length)) : 0;
}

function hasHiredHelp(state: GameState): boolean {
  return state.purchasedUpgradeIds.some((upgradeId) => UPGRADES_BY_ID[upgradeId].effects.some((effect) => effect.kind === 'auto-keystrokes'));
}

function isAdWall(state: GameState): boolean {
  return state.adCount >= ERAS_BY_ID[state.eraId].maxAds;
}

function finished1997Within(state: GameState, minutes: number): boolean {
  return listEraDurations(state.eraRecords).some((era) => era.eraId === 'homepage-1997' && era.durationMs < minutes * MS_PER_MINUTE);
}

/** Every minigame a run can throw at you: the infections' and the offers'. */
const EVERY_MINIGAME: readonly AnyMinigameId[] = [...new Set<AnyMinigameId>([...Object.values(INFECTION_MINIGAMES).flat(), 'code-entry', 'launch-window'])];

/** Held without the specialization it grows from: only Serial founder lets a site do that. */
function isHeldWithoutLineage(state: GameState, specializationId: SpecializationId): boolean {
  const { parents } = SPECIALIZATIONS_BY_ID[specializationId];
  return parents.length > 0 && !parents.some((parent) => state.specializationIds.includes(parent));
}

const VIDEO_SITES: readonly SpecializationId[] = ['live-streaming', 'streaming-service', 'short-video'];

/**
 * What each mechanic waits for. Specializations, site colors, custom cursors and Backlinks come with the second run,
 * the 2000 crash's leftovers with the third; everything an era brings, once a run has reached it. The rest show from
 * the start.
 */
const REVEALS: Readonly<Partial<Record<AchievementId, AchievementReveal>>> = {
  'sparkle-trail': 'run-2',
  'hamster-dance': 'run-3',
  'social-web': 'web2-2005',
  'platform-play': 'social-2011',
  'now-with-ai': 'platform-2018',
  'second-site': 'run-2',
  'serial-webmaster': 'run-2',
  'rode-it-out': 'web2-2005',
  slashdotted: 'web2-2005',
  'fail-whale': 'social-2011',
  'bobby-tables': 'web2-2005',
  pwned: 'social-2011',
  'denial-of-fun': 'social-2011',
  'works-on-my-machine': 'platform-2018',
  'not-private': 'web2-2005',
  'glue-on-pizza': 'ai-2024',
  'robots-txt': 'ai-2024',
  'accept-all': 'platform-2018',
  'do-not-track': 'platform-2018',
  'cookie-monster': 'platform-2018',
  enshittification: 'ai-2024',
  'own-metal': 'web2-2005',
  'someone-elses-computer': 'social-2011',
  'yaml-engineer': 'platform-2018',
  'gpu-rich': 'ai-2024',
  'page-bloat': 'web2-2005',
  'lighthouse-100': 'platform-2018',
  'pinch-to-zoom-no-more': 'social-2011',
  'heaviest-object': 'platform-2018',
  'hydration-error': 'platform-2018',
  'renews-itself': 'platform-2018',
  web3: 'platform-2018',
  'prompt-engineer': 'ai-2024',
  'ai-slop': 'ai-2024',
  'react-developer': 'platform-2018',
  'angular-developer': 'platform-2018',
  'vue-developer': 'platform-2018',
  'framework-wars-veteran': 'run-2',
  'jquery-forever': 'platform-2018',
  specialist: 'run-2',
  explorer: 'run-2',
  'full-stack': 'run-2',
  collector: 'run-2',
  'just-a-homepage': 'run-2',
  'pivot-to-video': 'run-2',
  'move-fast': 'run-2',
  'secret-door': 'run-2',
  'serial-founder': 'run-2',
  'broken-combo': 'run-2',
  'make-it-pop': 'run-2',
  'link-farm': 'run-2',
};

function achievement(
  id: AchievementId,
  category: AchievementCategory,
  icon: string,
  name: string,
  description: string,
  isEarned: Check,
  isSecret = false,
): AchievementDefinition {
  return { id, category, icon, name, description, isEarned, isSecret, reveal: REVEALS[id] ?? 'start' };
}

const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // ---------- The early web ----------
  achievement('hello-world', 'early-web', '👋', 'Hello, World!', 'Type your first line of code. Everyone starts here.', (state) => state.keystrokes > 0),
  achievement('first-visitor', 'early-web', '👀', 'Someone came', 'Your first visitor. Probably you, hitting refresh.', (state) => state.lifetimeVisitors >= 1),
  achievement('visitor-1000', 'early-web', '🔢', 'You are visitor #1,000!', 'A thousand visitors on one site. The hit counter has never been prouder.', (state) => state.lifetimeVisitors >= 1_000),
  achievement('sign-my-guestbook', 'early-web', '📖', 'Please sign my guestbook!!', 'The guestbook at level 10. Half of it is your friends, the other half is spam.', level('guestbook', 10)),
  achievement('under-construction', 'early-web', '🚧', 'Under Construction', 'The roadwork sign at level 20. It was never going to be finished.', level('under-construction', 20)),
  achievement('webring', 'early-web', '💍', 'Next site >>', 'Join a webring: a circle of homepages, each linking to the next. How people found sites before search.', level('webring', 1)),
  achievement('autoplay', 'early-web', '🎹', 'Autoplay', 'The MIDI player at level 10. Music starts the moment the page loads, and there is no way to stop it.', level('midi-player', 10)),
  achievement('blink', 'early-web', '🔆', '<blink>', 'Learn marquee and blink. One browser maker later called blink the worst thing it ever shipped.', bought('marquee-blink')),
  achievement('view-source', 'early-web', '👓', 'View source', 'Borrow a cooler homepage’s code. That’s how everyone learned HTML.', bought('view-source')),
  achievement('dot-com', 'early-web', '🏷️', 'Dot com', 'A domain of your own, instead of a tilde in someone else’s address.', bought('own-domain')),
  achievement('hamster-dance', 'early-web', '🐹', 'Hamster dance', 'Dancing hamsters, one song, forever. One of the web’s first viral pages did exactly that.', bought('dancing-hamsters')),
  achievement('sparkle-trail', 'early-web', '✨', 'Sparkle trail', 'The custom cursor at level 60: every cursor, all at once.', level('custom-cursor', 60)),
  achievement('quit-day-job', 'early-web', '💼', 'Quit the day job', 'The site pays more than your old job did.', (state) => state.reachedMilestoneIds.includes('quit-day-job')),

  // ---------- Eras and runs ----------
  achievement('web-2-0', 'eras', '🌐', 'Web 2.0', 'Relaunch into 2005: rounded corners, beta badges, and a reflection under everything.', reached(2005)),
  achievement('social-web', 'eras', '💬', 'The social web', 'Relaunch into 2011. Everyone you know is online now, and they all have opinions.', reached(2011)),
  achievement('platform-play', 'eras', '🧱', 'Platform play', 'Relaunch into 2018: a landing page, a framework, and a “Get started” button.', reached(2018)),
  achievement('now-with-ai', 'eras', '🤖', 'Now with AI', 'Relaunch into 2024. Every button has a sparkle on it now.', reached(2024)),
  achievement('the-whole-web', 'eras', '🏁', 'The whole web', 'From a homepage in 1997 to an AI site in 2024: finish a run.', (state, legacy) => state.isGameFinished || legacy.finishedRuns > 0),
  achievement('speedrun', 'eras', '⏱️', 'Speedrun', `Finish 1997 in under ${SPEEDRUN_1997_MINUTES} minutes.`, (state) => finished1997Within(state, SPEEDRUN_1997_MINUTES)),
  achievement('forever-under-construction', 'eras', '🐢', 'Forever under construction', `Spend ${FOREVER_HOURS} hours in one era. Some sites are never finished.`, (state) => state.eraStats.elapsedMs >= FOREVER_HOURS * MS_PER_HOUR),
  achievement('second-site', 'eras', '🔁', 'Second site', 'Start over with everything you learned the first time.', (state) => state.runNumber >= 2),
  achievement('serial-webmaster', 'eras', '🏅', 'Serial webmaster', `Finish ${SERIAL_WEBMASTER_RUNS} runs.`, (_state, legacy) => legacy.finishedRuns >= SERIAL_WEBMASTER_RUNS),

  // ---------- Typing ----------
  achievement('typist', 'typing', '⌨️', 'Typist', 'Type 1,000 keystrokes by hand. Hires don’t count, and nor does 2024: the AI writes that code.', handTyped(1_000)),
  achievement('touch-typist', 'typing', '🖐️', 'Touch typist', '10,000 keystrokes by hand, across all your runs, before 2024.', handTyped(10_000)),
  achievement('mechanical-keyboard', 'typing', '🎛️', 'Mechanical keyboard', '100,000 keystrokes by hand. The neighbours can hear it.', handTyped(100_000)),
  achievement('worn-out-e', 'typing', '🔤', 'Worn-out E key', 'A million keystrokes by hand, before any AI wrote a line. About 46 hours of typing.', handTyped(1_000_000)),
  achievement('on-fire', 'typing', '🔥', 'On fire', 'Type without typos until the editor catches fire.', (state) => state.runStats.onFireStarts > 0),
  achievement('ten-x-engineer', 'typing', '🦸', '10x engineer', `Catch fire ${FIRES_IN_ONE_ERA} times in one era. LinkedIn would like a word.`, (state) => state.eraStats.onFireStarts >= FIRES_IN_ONE_ERA),
  achievement('this-is-fine', 'typing', '🐶', 'This is fine', `Catch fire ${FIRES_THIS_IS_FINE} times in one run. The coffee’s still warm.`, (state) => state.runStats.onFireStarts >= FIRES_THIS_IS_FINE),
  achievement('not-a-bug', 'typing', '🐛', 'It’s not a bug, it’s a feature', `Make ${TYPOS} typos in one run.`, (state) => state.runStats.typos >= TYPOS),
  achievement('do-it-yourself', 'typing', '🛠️', 'Do it yourself', 'Finish a run without hiring anyone to type for you.', finishedWith((state) => !hasHiredHelp(state))),

  // ---------- Money ----------
  achievement('ramen-profitable', 'money', '🍜', 'Ramen profitable', 'Make $10 a second: enough to live on instant noodles, as start-ups used to say.', incomeOf(10)),
  achievement('dot-com-millionaire', 'money', '💰', 'Dot-com millionaire', 'Earn a million dollars in one run.', earnedInRun(1e6)),
  achievement('unicorn', 'money', '🦄', 'Unicorn', 'Earn a billion dollars in one run. Start-ups worth that much were once rare enough to need a name.', earnedInRun(1e9)),
  achievement('trillionaire', 'money', '💎', 'Trillionaire', 'Earn a trillion dollars in one run. Most of it in the last ten minutes.', earnedInRun(1e12)),
  achievement('bigger-than-the-world', 'money', '🌍', 'Bigger than the world', 'Earn more in one run than the whole world’s economy makes in a year: about $105 trillion.', earnedInRun(WORLD_ECONOMY)),
  achievement('quadrillionaire', 'money', '🪐', 'Quadrillionaire', 'A quadrillion dollars in one run. There aren’t that many dollars.', earnedInRun(1e15)),
  achievement('a-million-a-second', 'money', '⏩', 'A million a second', 'Make $1,000,000 every second.', incomeOf(1e6)),
  achievement('money-printer', 'money', '🖨️', 'Money printer go brrr', 'Make a trillion dollars every second.', incomeOf(1e12)),

  // ---------- Traffic ----------
  achievement('everyone-on-earth', 'traffic', '🌏', 'Everyone on Earth', 'Eight billion visitors a second: the whole world’s population, every second.', visitorsOf(EARTH_POPULATION)),
  achievement('galactic', 'traffic', '🌌', 'Galactic', 'Four hundred billion visitors a second: as many as there are stars in the Milky Way.', visitorsOf(MILKY_WAY_STARS)),
  achievement('rode-it-out', 'traffic', '🏄', 'Rode it out', 'A traffic spike ends, and the site never went down.', (state) => state.eraStats.spikesRiddenOut > 0),
  achievement('slashdotted', 'traffic', '💥', 'Slashdotted', 'Go down under a traffic spike, like every small site a big one ever linked to.', (state) => state.trafficSpikeRemainingMs > 0 && isSiteDown(state)),
  achievement('fail-whale', 'traffic', '🐳', 'Fail whale', 'Go down in 2011, the year everyone learned an error page could be cute.', (state) => yearOf(state) === 2011 && isSiteDown(state)),

  // ---------- Trouble ----------
  achievement('bobby-tables', 'trouble', '💉', 'Little Bobby Tables', 'Get hit by an SQL injection. Did you really name your son Robert’); DROP TABLE Students;--?', hitBy('sql-injection')),
  achievement('pwned', 'trouble', '🔑', 'Pwned', 'Your users’ passwords turn up on a paste site.', hitBy('password-leak')),
  achievement('denial-of-fun', 'trouble', '🌊', 'Distributed denial of fun', 'Get hit by a DDoS.', hitBy('ddos')),
  achievement('works-on-my-machine', 'trouble', '💻', 'Works on my machine', 'Break the build. It worked locally.', hitBy('broken-build')),
  achievement('not-private', 'trouble', '🔓', 'Your connection is not private', 'Let the certificate expire. Every browser tells your visitors.', hitBy('certificate-expiry')),
  achievement('glue-on-pizza', 'trouble', '🍕', 'Glue on the pizza', 'Your chatbot confidently recommends something terrible.', hitBy('hallucination')),
  achievement('robots-txt', 'trouble', '🕷️', 'Robots.txt? Never heard of it', 'AI scrapers swarm the site and read everything, twice.', hitBy('scraper-swarm')),
  achievement('clean-sweep', 'trouble', '🧹', 'Clean sweep', `Clean up ${CLEANUPS_IN_AN_ERA} infections in one era.`, (state) => Object.values(state.eraStats.cleanedByKind).reduce((total, cleaned) => total + cleaned, 0) >= CLEANUPS_IN_AN_ERA),
  achievement('firefighter', 'trouble', '🧯', 'Firefighter', `Clean up ${CLEANUPS_IN_A_RUN} infections in one run.`, (state) => state.runStats.cleanups >= CLEANUPS_IN_A_RUN),
  achievement('seen-it-all', 'trouble', '🎮', 'Seen it all', 'Win every kind of minigame in one run.', (state) => EVERY_MINIGAME.every((minigameId) => state.runStats.minigamesWon.includes(minigameId))),
  achievement('security-through-obscurity', 'trouble', '🙈', 'Security through obscurity', 'Finish a run without buying a single security feature. Nobody will find it, right?', finishedWith((state) => state.ownedDefenseIds.length === 0)),

  // ---------- Ads and cookies ----------
  achievement('free-mp3-player', 'ads', '🎁', 'You won a free MP3 player!', 'Fall for a pop-up. You are the 1,000,000th visitor, after all.', (state) => state.runStats.scamsFallenFor > 0),
  achievement('popup-blocker', 'ads', '🚫', 'Pop-up blocker', `Close ${POPUPS_CLOSED} pop-ups in one run.`, (state) => state.runStats.popupsClosed >= POPUPS_CLOSED),
  achievement('ad-wall', 'ads', '📢', 'Ad wall', 'Run as many ads as the era allows. Visitors scroll past them looking for the page.', isAdWall),
  achievement('no-ads-no-problem', 'ads', '🕊️', 'No ads, no problem', 'Run the site for ten minutes without a single ad.', (state) => state.eraStats.adFreeMs >= 10 * MS_PER_MINUTE, true),
  achievement('ad-free-web', 'ads', '🌱', 'Ad-free web', 'Finish a run without placing an ad after 1997. Every homepage had a banner then; nobody needs one after.', finishedWith((state) => !state.runStats.placedAdAfter1997)),
  achievement('accept-all', 'ads', '✅', 'Accept all', 'Put up a cookie banner whose biggest button says “Accept all”.', (state) => state.consentBanner === 'dark-pattern'),
  achievement('do-not-track', 'ads', '🙅', 'Do Not Track', 'Put up a cookie banner that really asks.', (state) => state.consentBanner === 'honest'),
  achievement('cookie-monster', 'ads', '🍪', 'Cookie monster', 'Get fined over your cookies.', hitBy('privacy-fine')),
  achievement('enshittification', 'ads', '💩', 'Enshittification', 'In 2024: every ad slot full, and a cookie banner that tricks people. The word of the year, 2023.', (state) => yearOf(state) === 2024 && isAdWall(state) && state.consentBanner === 'dark-pattern', true),

  // ---------- Tech ----------
  achievement('own-metal', 'tech', '🖥️', 'Your own metal', 'A dedicated server, all to yourself.', (state) => getHostingTier(state).id === 'dedicated-server'),
  achievement('someone-elses-computer', 'tech', '☁️', 'Someone else’s computer', 'Move to the cloud. It’s just someone else’s computer.', (state) => countHosting(state, 'cloud-') > 0),
  achievement('yaml-engineer', 'tech', '⎈', 'YAML engineer', 'Run on Kubernetes. Most of your code is indentation now.', (state) => countHosting(state, 'pods-') > 0),
  achievement('gpu-rich', 'tech', '💸', 'GPU rich', `Rent ${GPU_RICH} GPUs at once.`, (state) => countHosting(state, 'gpus-') >= GPU_RICH),
  achievement('page-bloat', 'tech', '🐘', 'Page bloat', 'A page that weighs more than 5 MB. The original Doom was smaller.', (state) => calculatePageWeightKb(state) >= PAGE_BLOAT_KB),
  achievement('lighthouse-100', 'tech', '💡', 'Lighthouse 100', 'A page that loads in under half a second, in 2018 or later.', (state) => yearOf(state) >= 2018 && calculateLoadTimeSeconds(state) < FAST_PAGE_SECONDS),
  achievement('pinch-to-zoom-no-more', 'tech', '📱', 'Pinch to zoom no more', 'Make the site work on phones.', isMobileFriendly),
  achievement('heaviest-object', 'tech', '🕳️', 'Heaviest object in the universe', 'Pick a framework, and download half the internet into node_modules.', (state) => findChosenFramework(state) !== null),
  achievement('hydration-error', 'tech', '💧', 'Hydration error', 'Render on the server, and meet the error everyone meets next.', hasEffect('server-side-rendering')),
  achievement('renews-itself', 'tech', '🔐', 'Renews itself', 'A certificate that renews itself, free, forever.', hasEffect('automatic-certificate-renewal')),
  achievement('web3', 'tech', '⛓️', 'Web3', 'Put the guestbook on a blockchain. Each signature costs $43 in gas.', bought('blockchain-guestbook')),
  achievement('prompt-engineer', 'tech', '🪄', 'Prompt engineer', 'Learn to ask the AI nicely. It’s a job title now.', bought('prompt-engineering')),
  achievement('ai-slop', 'tech', '🗑️', 'AI slop', 'AI articles at level 30. Nobody reads them; other AIs do.', level('ai-articles', 30)),
  achievement('react-developer', 'tech', '⚛️', 'React developer', 'Finish a run with React.', finishedWith(withFramework('react'))),
  achievement('angular-developer', 'tech', '🅰️', 'Angular developer', 'Finish a run with Angular.', finishedWith(withFramework('angular'))),
  achievement('vue-developer', 'tech', '💚', 'Vue developer', 'Finish a run with Vue.', finishedWith(withFramework('vue'))),
  achievement('framework-wars-veteran', 'tech', '🎖️', 'Framework wars veteran', 'Finish a run with each framework: React, Angular and Vue.', earnedAlready(['react-developer', 'angular-developer', 'vue-developer'])),
  achievement('jquery-forever', 'tech', '💲', 'jQuery forever', 'Finish a run without ever picking a framework.', finishedWith(withFramework(null))),

  // ---------- Specializations ----------
  achievement('specialist', 'tree', '🎯', 'Specialist', 'Make your site something more: choose a specialization.', (state) => state.specializationIds.length > 0),
  achievement('explorer', 'tree', '🧭', 'Explorer', `Find ${EXPLORER_FINDS} specializations, across all your runs.`, (_state, legacy) => legacy.foundSpecializationIds.length >= EXPLORER_FINDS),
  achievement('full-stack', 'tree', '🥞', 'Full stack', 'One specialization from every era, on one site.', (state) => state.specializationIds.length >= FULL_STACK),
  achievement('collector', 'tree', '📚', 'Collector', 'Find every specialization, across all your runs.', (_state, legacy) => TREE_IDS.every((id) => legacy.foundSpecializationIds.includes(id))),
  achievement('just-a-homepage', 'tree', '🏠', 'Just a homepage', 'Finish a second run without ever specializing.', finishedWith((state) => state.runNumber >= 2 && state.specializationIds.length === 0)),
  achievement('pivot-to-video', 'tree', '📹', 'Pivot to video', 'A news site that turns into a video site, like half the news sites of 2017.', (state) => state.specializationIds.includes('news') && VIDEO_SITES.some((id) => state.specializationIds.includes(id))),
  achievement('move-fast', 'tree', '🏎️', 'Move fast and break things', 'A social network with a broken build.', (state) => state.specializationIds.includes('social') && state.infections.some((infection) => infection.kind === 'broken-build')),
  achievement('secret-door', 'tree', '🗝️', 'Secret door', 'Unlock a specialization nobody told you about.', (state) => state.unlockedSpecializationIds.some((id) => SPECIALIZATIONS_BY_ID[id].isSecret), true),
  achievement('serial-founder', 'tree', '🎩', 'Serial founder', 'Buy the Backlink perk that ignores where a site came from.', (_state, legacy) => legacy.perkLevels['serial-founder'] > 0, true),
  achievement('broken-combo', 'tree', '🧨', 'Broken combo', 'Hold a specialization your site never grew into. It works. Nobody knows why.', (state) => state.specializationIds.some((id) => isHeldWithoutLineage(state, id)), true),

  // ---------- Odds and ends ----------
  achievement('make-it-pop', 'odd', '🎨', 'Make it pop', 'Pick your own colors for the site.', (state) => state.siteColors !== null),
  achievement('idle-game', 'odd', '💤', 'Idle game', 'Come back after an hour away to money you didn’t type.', (state) => state.runStats.longestAwayMs >= MS_PER_HOUR),
  achievement('touch-grass', 'odd', '🌳', 'Touch grass', 'Stay away for eight hours. The site kept going.', (state) => state.runStats.longestAwayMs >= 8 * MS_PER_HOUR),
  achievement('sponsored-content', 'odd', '🤝', 'Sponsored content', 'Win a sponsor’s offer.', (state) => state.runStats.minigamesWon.includes('code-entry')),
  achievement('ship-it', 'odd', '🚢', 'Ship it', 'Hit the launch window.', (state) => state.runStats.minigamesWon.includes('launch-window')),
  achievement('link-farm', 'odd', '🕸️', 'Link farm', 'Hold 100 Backlinks at once.', (_state, legacy) => legacy.backlinks >= 100),
  achievement('hackerman', 'odd', '🕶️', 'Hackerman', 'Open the developer tools. The money on the screen was never the money in the game.', (state) => state.runStats.hasPokedWithDevTools, true),
];

export const ACHIEVEMENT_IDS: readonly AchievementId[] = ACHIEVEMENTS.map((definition) => definition.id);

/** A kind whose name is itself a spoiler: the tree's row says "???" until the run that brings specializations. */
export const ACHIEVEMENT_CATEGORY_REVEALS: Readonly<Partial<Record<AchievementCategory, AchievementReveal>>> = { tree: 'run-2' };

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((definition) => [definition.id, definition])) as Readonly<Record<AchievementId, AchievementDefinition>>;

/** The run this player has got to, in this browser: the current one, or the one after the last finished. */
function findFurthestRun(state: GameState, legacy: LegacyState): number {
  return Math.max(state.runNumber, legacy.finishedRuns + 1);
}

const RUN_REVEALS: Readonly<Record<RunReveal, number>> = { start: 1, 'run-2': 2, 'run-3': 3 };

/** Reaching an era records its achievement, so a later run's 1997 still knows 2018 was reached once. */
const ERA_REACHED: Readonly<Partial<Record<EraId, AchievementId>>> = {
  'web2-2005': 'web-2-0',
  'social-2011': 'social-web',
  'platform-2018': 'platform-play',
  'ai-2024': 'now-with-ai',
};

function hasReachedEraBefore(legacy: LegacyState, eraId: EraId): boolean {
  const reachedId = ERA_REACHED[eraId];
  return reachedId !== undefined && legacy.achievementIds.includes(reachedId);
}

function hasSeenEra(state: GameState, legacy: LegacyState, eraId: EraId): boolean {
  return yearOf(state) >= ERAS_BY_ID[eraId].year || hasReachedEraBefore(legacy, eraId);
}

function isRunReveal(reveal: AchievementReveal): reveal is RunReveal {
  return reveal in RUN_REVEALS;
}

/** Whether what this reveal waits for has happened, in this run or an earlier one. */
export function isRevealReached(reveal: AchievementReveal, state: GameState, legacy: LegacyState): boolean {
  return isRunReveal(reveal) ? findFurthestRun(state, legacy) >= RUN_REVEALS[reveal] : hasSeenEra(state, legacy, reveal);
}

/** An earned achievement always shows; an unearned one once its mechanic has. */
export function isAchievementRevealed(id: AchievementId, state: GameState, legacy: LegacyState): boolean {
  return legacy.achievementIds.includes(id) || isRevealReached(ACHIEVEMENTS_BY_ID[id].reveal, state, legacy);
}
