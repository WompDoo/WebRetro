import { formatCompactNumber } from '../../engine';
import type { SpecializationFeatureId } from '../../engine';
import { escapeHtml } from '../dom';
import { heading, levelOf } from './site-context';
import type { FeatureRenderer, SiteContext } from './site-context';

/**
 * The blocks of each specialization's own feature: a short list that grows with the feature's level, a count, and the
 * button everyone on that kind of site pressed. The same block works on every era's layout; a specialization's page
 * (its navigation, hero and colors) is what dresses it.
 */
interface ExclusiveBlockCopy {
  readonly entries: readonly string[];
  /** How many of whatever the block counts each level adds: members, sales, remixes. */
  readonly countPerLevel: number;
  readonly countLabel: string;
  readonly action: string;
}

const BASE_ENTRIES = 2;
const MAX_ENTRIES = 5;

const EXCLUSIVE_BLOCKS: Readonly<Record<SpecializationFeatureId, ExclusiveBlockCopy>> = {
  'member-blogs': {
    entries: ['🖊 Cat Diaries', '🖊 Life of a Lab Tech', '🖊 Ramen Every Day', '🖊 My Band (Unsigned)', '🖊 Dad Jokes Daily'],
    countPerLevel: 40,
    countLabel: 'blogs started',
    action: 'Start your own blog',
  },
  'photo-groups': {
    entries: ['📷 Rusty Doors', '📷 Clouds That Look Like Things', '📷 Macro Bugs', '📷 Abandoned Malls', '📷 Coffee Art'],
    countPerLevel: 120,
    countLabel: 'members',
    action: 'Join a group',
  },
  channels: {
    entries: ['▶ CatPlaysPiano', '▶ ReviewingEverything', '▶ UnboxingDaily', '▶ SkateFails', '▶ CookingWithGran'],
    countPerLevel: 900,
    countLabel: 'subscribers',
    action: 'Subscribe',
  },
  subforums: {
    entries: ['💬 General Chat', '💬 Help & Support', '💬 Off-Topic', '💬 Buy / Sell / Trade', '💬 The Flame Pit'],
    countPerLevel: 300,
    countLabel: 'posts today',
    action: 'New topic',
  },
  'talk-pages': {
    entries: ['Talk:Yoghurt (edit war)', 'Talk:Pluto (it’s complicated)', 'Talk:Toast (merge proposed)', 'Talk:Moon landing (protected)', 'Talk:This site (notability?)'],
    countPerLevel: 90,
    countLabel: 'comments',
    action: 'Join the discussion',
  },
  groups: {
    entries: ['👥 Class of 2005', '👥 Neighbours of Elm Street', '👥 Bring Back the Old Layout', '👥 Dog Owners United', '👥 I Bet This Pickle Gets More Fans Than…'],
    countPerLevel: 2_000,
    countLabel: 'members',
    action: 'Join group',
  },
  'trending-topics': {
    entries: ['#MondayMotivation', '#SandwichGate', '#NowPlaying', '#FailWhale', '#ThrowbackThursday'],
    countPerLevel: 5_000,
    countLabel: 'posts an hour',
    action: 'See all trends',
  },
  'emotes-and-raids': {
    entries: ['🔴 speedrun_sam is live', '🔴 cozy_builds is live', '🔴 chess_dad is live', '🔴 retro_rita is live', '🔴 lofi_beats is live'],
    countPerLevel: 400,
    countLabel: 'watching',
    action: 'Raid',
  },
  listicles: {
    entries: ['17 Cats Who Have Had Enough', '23 Things Only Night Owls Know', 'Which Sandwich Are You?', '9 Maps That Will Change How You See Maps', 'You Won’t Believe Number 7'],
    countPerLevel: 15_000,
    countLabel: 'shares',
    action: 'Read more',
  },
  'check-ins': {
    entries: ['📍 Joe’s Coffee · Mayor: you', '📍 Burger Barn ★★★★☆', '📍 City Library ★★★★★', '📍 Taco Truck ★★★★½', '📍 Laundromat ★★☆☆☆'],
    countPerLevel: 250,
    countLabel: 'check-ins today',
    action: 'Check in',
  },
  'product-listings': {
    entries: ['📦 Rubber duck, 4-pack · $9.99', '📦 Phone stand · $12.49', '📦 Tent for two · $79.00', '📦 Another phone stand · $11.99', '📦 Socks, 12 pairs · $15.99'],
    countPerLevel: 700,
    countLabel: 'orders today',
    action: 'Add to cart',
  },
  'filters-and-lenses': {
    entries: ['🐶 Dog ears', '🌸 Flower crown', '🤖 Robot voice', '🔄 Face swap', '🌈 Rainbow'],
    countPerLevel: 50_000,
    countLabel: 'stories today',
    action: 'Try a lens',
  },
  originals: {
    entries: ['🎬 The Lighthouse Murders · S2', '🎬 Bake or Break', '🎬 Orbit · a space drama', '🎬 Cults: the docu-series', '🎬 The Cliffhanger (cancelled)'],
    countPerLevel: 80_000,
    countLabel: 'hours watched',
    action: 'Play',
  },
  'paid-newsletters': {
    entries: ['✉ The Weekly Take · $5/mo', '✉ Notes From the Lake · $7/mo', '✉ Chart Brain · $10/mo', '✉ Late to the Party · $5/mo', '✉ Unbundled · $8/mo'],
    countPerLevel: 600,
    countLabel: 'paying readers',
    action: 'Subscribe',
  },
  'seller-dashboards': {
    entries: ['🧶 KnitWitStudio · 4.9★', '🪴 PlantDad · 4.8★', '🕯 WickedWicks · 5.0★', '🖼 PrintPalace · 4.7★', '🧸 TeddyWorks · 4.9★'],
    countPerLevel: 90,
    countLabel: 'sales today',
    action: 'Open a shop',
  },
  'job-board': {
    entries: ['💼 Junior Developer (5+ years)', '💼 Rockstar Ninja Guru', '💼 Head of Vibes', '💼 Intern (unpaid, passionate)', '💼 Senior Prompt Whisperer'],
    countPerLevel: 300,
    countLabel: 'applicants',
    action: 'Apply in one click',
  },
  servers: {
    entries: ['🎮 Guild of the Lost Raid', '📚 Study Group (memes)', '🎨 Pixel Art Hangout', '🏎 Sim Racing League', '🐸 Frog Appreciation'],
    countPerLevel: 1_500,
    countLabel: 'members online',
    action: 'Join server',
  },
  'duets-and-remixes': {
    entries: ['🎵 Dance challenge, remixed', '😂 Reaction to the reaction', '🎤 Duet, off-key on purpose', '🍳 The recipe, but faster', '🐈 A cat dubs a cat'],
    countPerLevel: 300_000,
    countLabel: 'remixes',
    action: 'Duet this',
  },
  'sources-panel': {
    entries: ['[1] an encyclopedia', '[2] a forum post from 2009', '[3] a news site', '[4] a recipe blog, no life story', '[5] this site'],
    countPerLevel: 9_000,
    countLabel: 'answers cited',
    action: 'Show all sources',
  },
  'prompt-gallery': {
    entries: ['🖼 astronaut riding a horse, oil painting', '🖼 cozy cabin, studio lighting, 8k', '🖼 a cat in a business suit', '🖼 your logo, vaporwave mall style', '🖼 hands, five fingers each (beta)'],
    countPerLevel: 25_000,
    countLabel: 'images today',
    action: 'Remix this prompt',
  },
  characters: {
    entries: ['🧙 A Kindly Wizard', '🕵 The Detective', '🦜 Captain Parrot', '👩‍🏫 The Nice Maths Teacher', '🐉 A Dragon Who Gives Advice'],
    countPerLevel: 12_000,
    countLabel: 'chats today',
    action: 'Start chatting',
  },
  'agent-listings': {
    entries: ['🤖 Inbox Agent · ★★★★★ (by agents)', '🤖 Trip Planner · ★★★★☆', '🤖 Refund Negotiator · ★★★★★', '🤖 Agent Recruiter · ★★★★★', '🤖 Fridge Restocker · ★★★☆☆'],
    countPerLevel: 40_000,
    countLabel: 'tasks done',
    action: 'Hire this agent',
  },
};

function renderExclusiveBlock(context: SiteContext, featureId: SpecializationFeatureId): string {
  const copy = EXCLUSIVE_BLOCKS[featureId];
  const level = levelOf(context, featureId);
  const entries = copy.entries.slice(0, Math.min(BASE_ENTRIES + level, MAX_ENTRIES)).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  const count = `${formatCompactNumber(level * copy.countPerLevel)} ${escapeHtml(copy.countLabel)}`;
  return `${heading(context, featureId)}<ul class="spec-feature-list">${entries}</ul><p class="post-meta">${count} · <span class="fake-link">${escapeHtml(copy.action)}</span></p>`;
}

export const SPECIALIZATION_FEATURE_RENDERERS = Object.fromEntries(
  (Object.keys(EXCLUSIVE_BLOCKS) as readonly SpecializationFeatureId[]).map((featureId) => [featureId, (context: SiteContext) => renderExclusiveBlock(context, featureId)]),
) as Readonly<Record<SpecializationFeatureId, FeatureRenderer>>;
