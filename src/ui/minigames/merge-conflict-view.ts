import { CONFLICT_PICKS, findFirstOpenBlock, mergeConflictStatus, pickConflictBlocks, pickResolution, startMergeConflict, tickMergeConflict, WRONG_PICK_PENALTY_MS } from '../../engine';
import type { ConflictPick, EraId, MergeConflict, MinigameStatus } from '../../engine';
import { escapeHtml } from '../dom';
import { markDifference } from './conflict-diff';
import type { MinigameView } from './types';

/**
 * A merge conflict, the way each era had them: two copies of the same page by FTP in 1997, svn's markers in 2005,
 * git's from 2011, and in 2024 an AI agent's branch. Anyone can play it: each side carries a note in plain words
 * (what that person meant to do), the part that differs is highlighted, and the rule is one sentence. The code is
 * the flavor; the notes are the decision. Once picked, each block says why.
 */
interface ConflictBlock {
  readonly ours: readonly string[];
  readonly theirs: readonly string[];
  /** What you did, and what the teammate did, in plain words. "{teammate}" becomes their name. */
  readonly oursNote: string;
  readonly theirsNote: string;
  readonly answer: ConflictPick;
  readonly why: string;
}

interface ConflictMarkers {
  readonly ours: string;
  readonly middle: string;
  readonly theirs: string;
}

interface ConflictCopy {
  readonly brief: string;
  /** Who the other side is: a name on the notes and on the button. */
  readonly teammate: string;
  readonly markers: ConflictMarkers;
  readonly pool: readonly ConflictBlock[];
}

const HTML_1997: readonly ConflictBlock[] = [
  { ours: ['<title>Welcome to My Hompage</title>'], theirs: ['<title>Welcome to My Homepage</title>'], oursNote: 'You: the page title', theirsNote: '{teammate}: fixed the spelling of “Homepage”', answer: 'theirs', why: 'Theirs fixes the typo in the title.' },
  { ours: ['<a href="guestbook.html">Sign my guestbook!</a>'], theirs: ['<a href="webring.html">Next site in the ring</a>'], oursNote: 'You: added a link to your guestbook', theirsNote: '{teammate}: added a link to the webring', answer: 'both', why: 'Two different new links: keep both.' },
  { ours: ['<a href="mailto:me@example.com">Email me</a>'], theirs: ['<a href="mailto:me@exmaple.com">Email me</a>'], oursNote: 'You: your email link', theirsNote: '{teammate}: retyped your email address from memory', answer: 'ours', why: 'Theirs misspells the address: nobody could email you.' },
  { ours: ['<img src="counter.gif" width="88" height="31">'], theirs: ['<img src="counter.gif">'], oursNote: 'You: the hit counter, with its size', theirsNote: '{teammate}: the hit counter, but forgot its size, so the page jumps while it loads', answer: 'ours', why: 'Yours keeps the size, so the page doesn’t jump while it loads.' },
  { ours: ['<p>Under construction!</p>'], theirs: ['<p>Under construction!</p>', '<img src="digger.gif">'], oursNote: 'You: the under-construction notice', theirsNote: '{teammate}: the same notice, plus an animated digger', answer: 'theirs', why: 'Theirs is yours plus the animated GIF.' },
  { ours: ['<body bgcolor="black" text="white">'], theirs: ['<body bgcolor="black" text="black">'], oursNote: 'You: white text on a black page', theirsNote: '{teammate}: changed the text to black, on the same black page', answer: 'ours', why: 'Black text on black: nobody could read a word.' },
];

const PHP_2005: readonly ConflictBlock[] = [
  { ours: ["$name = $_GET['name'];"], theirs: ["$name = htmlspecialchars($_GET['name']);"], oursNote: 'You: show the visitor’s name', theirsNote: '{teammate}: show the name safely, so nobody can sneak a script into it', answer: 'theirs', why: 'Theirs escapes the input, so nobody can inject a script.' },
  { ours: ['$posts = get_recent_posts(10);'], theirs: ['$tags = get_tag_cloud();'], oursNote: 'You: added the latest posts', theirsNote: '{teammate}: added the tag cloud', answer: 'both', why: 'Two separate things the page needs: keep both.' },
  { ours: ['mysql_query("SELECT * FROM posts WHERE id = " . $id);'], theirs: ['$db->prepare("SELECT * FROM posts WHERE id = ?");'], oursNote: 'You: load a post, the quick way', theirsNote: '{teammate}: load a post the safe way, so nobody can break into the database', answer: 'theirs', why: 'A prepared statement: no SQL injection.' },
  { ours: ["echo date('Y');"], theirs: ["echo '2005'; // TODO: change every January"], oursNote: 'You: the year, updated by itself', theirsNote: '{teammate}: the year, typed in by hand', answer: 'ours', why: 'Yours updates itself. Theirs needs a reminder every year.' },
  { ours: ['<script src="prototype.js"></script>'], theirs: ['<script src="scriptaculous.js"></script>'], oursNote: 'You: added the Prototype library', theirsNote: '{teammate}: added Script.aculo.us, which needs Prototype to work', answer: 'both', why: 'Script.aculo.us needs Prototype: keep both, Prototype first.' },
  { ours: ["if ($user == 'admin') {"], theirs: ["if ($user = 'admin') {"], oursNote: 'You: check whether the visitor is the admin', theirsNote: '{teammate}: a one-character change that makes every visitor the admin', answer: 'ours', why: 'Theirs assigns instead of comparing: everyone would be an admin.' },
];

const JS_2011: readonly ConflictBlock[] = [
  { ours: ["$('.gallery').masonry();"], theirs: ["$('.gallery').imagesLoaded(function () {", '  $(this).masonry();', '});'], oursNote: 'You: lay out the photo gallery straight away', theirsNote: '{teammate}: wait for the photos to load first, so they don’t overlap', answer: 'theirs', why: 'Theirs waits for the images, so the tiles don’t overlap.' },
  { ours: ["var api = 'http://api.example.com';"], theirs: ["var api = 'https://api.example.com';"], oursNote: 'You: the address of the data server', theirsNote: '{teammate}: the same address, made secure (https)', answer: 'theirs', why: 'HTTPS: no mixed-content warning on your secure page.' },
  { ours: ["app.get('/feed', showFeed);"], theirs: ["app.get('/login', showLogin);"], oursNote: 'You: added the feed page', theirsNote: '{teammate}: added the login page', answer: 'both', why: 'Two new routes: keep both.' },
  { ours: ['for (var i = 0; i < items.length; i++) {'], theirs: ['for (var i = 0; i <= items.length; i++) {'], oursNote: 'You: go through every item', theirsNote: '{teammate}: go through every item, and then one more that isn’t there', answer: 'ours', why: 'Theirs runs one past the end of the list.' },
  { ours: ['.button { border-radius: 4px; }'], theirs: ['.button { -webkit-border-radius: 4px; border-radius: 4px; }'], oursNote: 'You: rounded buttons', theirsNote: '{teammate}: rounded buttons that also work on older phones', answer: 'theirs', why: 'Theirs adds the prefix older phones still needed.' },
  { ours: ["console.log('login', user.password);"], theirs: ['// removed debug logging'], oursNote: 'You: write every password to the log, for debugging', theirsNote: '{teammate}: stopped writing passwords to the log', answer: 'theirs', why: 'Never log passwords.' },
];

const JSX_2018: readonly ConflictBlock[] = [
  { ours: ['<img src={hero} />'], theirs: ['<img src={hero} alt="Our team at work" />'], oursNote: 'You: the big image at the top', theirsNote: '{teammate}: the same image, with a description for blind visitors', answer: 'theirs', why: 'Theirs has alt text for screen readers.' },
  { ours: ["import { Stories } from './Stories';"], theirs: ["import { PricingTable } from './PricingTable';"], oursNote: 'You: added the stories', theirsNote: '{teammate}: added the pricing table', answer: 'both', why: 'Two components the page uses: keep both imports.' },
  { ours: ['useEffect(() => {', '  fetchPosts();', '});'], theirs: ['useEffect(() => {', '  fetchPosts();', '}, []);'], oursNote: 'You: load the posts, again on every redraw', theirsNote: '{teammate}: load the posts once', answer: 'theirs', why: 'Without the [] it fetches again on every render.' },
  { ours: ['const API_KEY = process.env.API_KEY;'], theirs: ["const API_KEY = 'sk-live-hunter2';"], oursNote: 'You: read the secret key from the server’s settings', theirsNote: '{teammate}: pasted the secret key into the code, for everyone to see', answer: 'ours', why: 'Never commit a key to the repository.' },
  { ours: ['{posts.map((post) => <Post key={post.id} {...post} />)}'], theirs: ['{posts.map((post) => <Post {...post} />)}'], oursNote: 'You: list the posts, each with its ID', theirsNote: '{teammate}: list the posts, without their IDs', answer: 'ours', why: 'React needs a key on every item in a list.' },
  { ours: ['<button onClick={subscribe}>Subscribe</button>'], theirs: ['<button onClick={subscribe()}>Subscribe</button>'], oursNote: 'You: subscribe when the button is clicked', theirsNote: '{teammate}: subscribe everyone as soon as the page loads', answer: 'ours', why: 'Theirs subscribes everyone on every render.' },
];

const AGENT_2024: readonly ConflictBlock[] = [
  { ours: ['const users = await db.users.findMany();'], theirs: ['const users = await db.users.findAllHappy(); // optimized'], oursNote: 'You: load the users', theirsNote: '{teammate}: load the users with a function it made up', answer: 'ours', why: 'findAllHappy doesn’t exist. The agent made it up.' },
  { ours: ["import { summarize } from './ai';"], theirs: ["import { embed } from './ai';"], oursNote: 'You: added summaries', theirsNote: '{teammate}: added search', answer: 'both', why: 'Both functions are used: keep both imports.' },
  { ours: ['if (!user) return null;'], theirs: ['if (!user) return null;', 'if (!user.isVerified) return <Verify />;'], oursNote: 'You: stop if nobody is signed in', theirsNote: '{teammate}: the same, plus a check for unverified accounts', answer: 'theirs', why: 'Theirs is yours plus the check for unverified users.' },
  { ours: ['await db.migrate();'], theirs: ['await db.dropAllTables(); // clean start'], oursNote: 'You: update the database', theirsNote: '{teammate}: delete every table and start fresh', answer: 'ours', why: 'The agent wanted a clean start. You want your users.' },
  { ours: ['<img src={hero} />'], theirs: ['<img src={hero} alt="Our team at work" />'], oursNote: 'You: the big image at the top', theirsNote: '{teammate}: the same image, with a description for blind visitors', answer: 'theirs', why: 'Theirs has alt text. The agent got one right.' },
  { ours: ['const API_KEY = process.env.API_KEY;'], theirs: ["const API_KEY = 'sk-live-hunter2'; // for convenience"], oursNote: 'You: read the secret key from the settings', theirsNote: '{teammate}: pasted the secret key into the code, for convenience', answer: 'ours', why: 'Never commit a key, however convenient the agent finds it.' },
];

const FTP_MARKERS: ConflictMarkers = { ours: '<!-- YOUR COPY -->', middle: '<!-- KEVIN’S COPY (uploaded 3 min ago) -->', theirs: '<!-- END OF KEVIN’S COPY -->' };

const CONFLICTS: Readonly<Record<EraId, ConflictCopy>> = {
  'homepage-1997': { brief: 'Kevin edited index.html too, and uploaded his copy over yours by FTP. Merge the two by hand before the launch.', teammate: 'Kevin', markers: FTP_MARKERS, pool: HTML_1997 },
  'crash-2000': { brief: 'Gary, the last other developer left, edited the homepage too. Merge your copies before the investors look.', teammate: 'Gary', markers: { ...FTP_MARKERS, middle: '<!-- GARY’S COPY -->', theirs: '<!-- END -->' }, pool: HTML_1997 },
  'web2-2005': { brief: 'svn update: Conflict. You and Priya changed the same lines. The launch is today.', teammate: 'Priya', markers: { ours: '<<<<<<< .mine', middle: '=======', theirs: '>>>>>>> .r1337' }, pool: PHP_2005 },
  'social-2011': { brief: 'git pull: CONFLICT. You and Sam touched the same file. Merge it and ship.', teammate: 'Sam', markers: { ours: '<<<<<<< HEAD', middle: '=======', theirs: '>>>>>>> origin/master' }, pool: JS_2011 },
  'platform-2018': { brief: 'Your branch clashes with Alex’s redesign branch. The launch is in an hour.', teammate: 'Alex', markers: { ours: '<<<<<<< HEAD', middle: '=======', theirs: '>>>>>>> feature/redesign-v2-final-FINAL' }, pool: JSX_2018 },
  'ai-2024': { brief: 'The AI agent opened a 4,000-line pull request. Three conflicts. It says they’re all fine.', teammate: 'The agent', markers: { ours: '<<<<<<< HEAD', middle: '=======', theirs: '>>>>>>> agent/refactor-everything' }, pool: AGENT_2024 },
};

const BLOCKS_PER_CONFLICT = 3;

const STATUS_TEXTS: Readonly<Record<MinigameStatus, string>> = {
  waiting: 'Read the notes.',
  running: 'Keep the side that fixes a mistake. Keep both when each adds something new.',
  won: 'Merged and shipped. Launch day!',
  lost: 'Out of time: the launch slips to next week.',
};

/** 1, 2 and 3 answer the first open block, in the buttons' order. */
const PICK_KEYS: Readonly<Record<string, ConflictPick>> = { '1': 'ours', '2': 'theirs', '3': 'both' };
const MISTAKE_SHAKE: readonly Keyframe[] = [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }];
const MISTAKE_SHAKE_MS = 220;
const PERCENT = 100;
const MS_PER_SECOND = 1_000;

function fillTeammate(note: string, teammate: string): string {
  return note.replace('{teammate}', teammate);
}

/** "Kevin's", or "The agent's". */
function possessive(teammate: string): string {
  return `${teammate}’s`;
}

function renderLines(lines: readonly string[], className: string): string {
  return lines.map((line) => `<span class="${className}">${line}</span>`).join('\n');
}

/** One line each side: the part that differs is highlighted. Longer blocks show as they are. */
function renderSides(block: ConflictBlock): { readonly ours: string; readonly theirs: string } {
  const [ourLine] = block.ours;
  const [theirLine] = block.theirs;
  const isOneLineEach = block.ours.length === 1 && block.theirs.length === 1;
  if (!isOneLineEach || ourLine === undefined || theirLine === undefined) {
    return { ours: renderLines(block.ours.map(escapeHtml), 'conflict-ours'), theirs: renderLines(block.theirs.map(escapeHtml), 'conflict-theirs') };
  }
  const marked = markDifference(ourLine, theirLine);
  return { ours: renderLines([marked.first], 'conflict-ours'), theirs: renderLines([marked.second], 'conflict-theirs') };
}

function renderConflictCode(block: ConflictBlock, copy: ConflictCopy): string {
  const sides = renderSides(block);
  return [
    `<span class="conflict-marker">${escapeHtml(copy.markers.ours)}</span>`,
    `<span class="conflict-note is-ours">${escapeHtml(block.oursNote)}</span>`,
    sides.ours,
    `<span class="conflict-marker">${escapeHtml(copy.markers.middle)}</span>`,
    `<span class="conflict-note is-theirs">${escapeHtml(fillTeammate(block.theirsNote, copy.teammate))}</span>`,
    sides.theirs,
    `<span class="conflict-marker">${escapeHtml(copy.markers.theirs)}</span>`,
  ].join('\n');
}

/** "Keep: 1 Mine · 2 Kevin's · 3 Both", short enough for one row on a phone. */
function renderPickButtons(blockIndex: number, teammate: string): string {
  const labels: Readonly<Record<ConflictPick, string>> = { ours: 'Mine', theirs: possessive(teammate), both: 'Both' };
  const buttons = CONFLICT_PICKS.map((pick, index) => `<button type="button" class="conflict-pick" data-block="${blockIndex}" data-pick="${pick}"><kbd>${index + 1}</kbd> ${escapeHtml(labels[pick])}</button>`).join('');
  return `<span class="conflict-keep">Keep</span>${buttons}`;
}

function renderBlock(block: ConflictBlock, copy: ConflictCopy, blockIndex: number): string {
  return `<div class="conflict" data-block="${blockIndex}"><pre class="conflict-code">${renderConflictCode(block, copy)}</pre><div class="conflict-picks">${renderPickButtons(blockIndex, copy.teammate)}</div></div>`;
}

/** What the block becomes once it's merged: the kept lines, and why that was right. */
function keptLines(block: ConflictBlock): readonly string[] {
  const kept: Readonly<Record<ConflictPick, readonly string[]>> = { ours: block.ours, theirs: block.theirs, both: [...block.ours, ...block.theirs] };
  return kept[block.answer];
}

function renderMerged(block: ConflictBlock): string {
  return `<pre class="conflict-code">${renderLines(keptLines(block).map(escapeHtml), 'conflict-kept')}</pre><p class="conflict-why">✓ ${escapeHtml(block.why)}</p>`;
}

interface PickTarget {
  readonly blockIndex: number;
  readonly pick: ConflictPick;
}

function isConflictPick(value: string): value is ConflictPick {
  return (CONFLICT_PICKS as readonly string[]).includes(value);
}

function readPickTarget(target: EventTarget | null): PickTarget | null {
  const button = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-pick]') : null;
  const pick = button?.dataset['pick'] ?? '';
  return button !== null && isConflictPick(pick) ? { blockIndex: Number(button.dataset['block']), pick } : null;
}

export const mergeConflictView: MinigameView = (stage, target, seed) => {
  const copy = CONFLICTS[target.eraId];
  const blocks = pickConflictBlocks(copy.pool.length, BLOCKS_PER_CONFLICT, seed).flatMap((index) => {
    const block = copy.pool[index];
    return block === undefined ? [] : [block];
  });
  let game: MergeConflict = startMergeConflict(blocks.map((block) => block.answer));
  const box = document.createElement('div');
  box.className = 'merge-conflict';
  box.innerHTML = `<div class="code-timer"><i></i></div>${blocks.map((block, index) => renderBlock(block, copy, index)).join('')}`;
  stage.append(box);
  const timer = box.querySelector<HTMLElement>('.code-timer i');

  const render = (): void => {
    timer?.style.setProperty('width', `${(1 - game.elapsedMs / game.limitMs) * PERCENT}%`);
    box.dataset['status'] = mergeConflictStatus(game);
  };

  const showMerged = (blockIndex: number): void => {
    const element = box.querySelector<HTMLElement>(`.conflict[data-block="${blockIndex}"]`);
    const block = blocks[blockIndex];
    if (element === null || block === undefined) return;
    element.classList.add('is-merged');
    element.innerHTML = renderMerged(block);
  };

  const showMistake = (blockIndex: number): void => {
    const element = box.querySelector<HTMLElement>(`.conflict[data-block="${blockIndex}"]`);
    element?.animate([...MISTAKE_SHAKE], MISTAKE_SHAKE_MS);
    element?.setAttribute('data-penalty', `−${WRONG_PICK_PENALTY_MS / MS_PER_SECOND} s`);
  };

  const pick = ({ blockIndex, pick: choice }: PickTarget): void => {
    const before = game;
    game = pickResolution(game, blockIndex, choice);
    if (game.mistakes > before.mistakes) showMistake(blockIndex);
    if (game.resolved[blockIndex] === true && before.resolved[blockIndex] === false) showMerged(blockIndex);
    render();
  };

  box.addEventListener('click', (event) => {
    const picked = readPickTarget(event.target);
    if (picked !== null) pick(picked);
  });
  render();

  return {
    brief: copy.brief,
    hint: 'Read the notes. Click a side, or press 1, 2 or 3 for the first open conflict. The clock is already running.',
    tick: (elapsedMs) => {
      game = tickMergeConflict(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const choice = PICK_KEYS[event.key];
      if (choice === undefined) return false;
      pick({ blockIndex: findFirstOpenBlock(game), pick: choice });
      return true;
    },
    progress: () => `${game.resolved.filter((isResolved) => isResolved).length}/${game.answers.length} merged`,
    status: () => mergeConflictStatus(game),
    statusText: () => STATUS_TEXTS[mergeConflictStatus(game)],
    destroy: () => box.remove(),
  };
};
