import { areSpecializationsOn, ERAS_BY_ID, findCurrentSpecialization, isSpecializedEra } from '../../engine';
import type { EraId, GameState, SpecializationId, SpecializedEraId, TreeSpecializationId } from '../../engine';
import { escapeHtml } from '../dom';
import { siteBrand } from './site-context';

/**
 * How a specialization looks: the page is still the era's (2005's Web 2.0 columns, 2011's Bootstrap, 2018's landing
 * page, 2024's AI site), but the navigation, the hero and a block at the top say what the site is now. A video site
 * leads with what's trending; a shop with today's deals. A Homepage (no specialization) keeps the era's page as it was.
 *
 * A site that has specialized more than once is led by the newest: its navigation, hero and color. The earlier ones
 * keep a link in the navigation and a shorter block under the newest's, so a video site that became a social network
 * still has its videos.
 */
export interface HeroCopy {
  readonly title: string;
  /** "{brand}" becomes the site's name. */
  readonly text: string;
  readonly cta: string;
}

interface SignatureItem {
  readonly icon: string;
  readonly title: string;
  readonly meta: string;
}

/** Tiles: a picture on top, words under it. A list: one line of who or what, then the words. */
type BlockLayout = 'tiles' | 'list';

interface SpecializationLook {
  /** Four short links: they share the header with the site's name, which shortens with an ellipsis when crowded. */
  readonly nav: readonly string[];
  /** The one link the site keeps for this once a newer specialization leads. */
  readonly navLink: string;
  /** Its era's words, from its own era on; an era without them keeps the era's own hero. */
  readonly heroes: Readonly<Partial<Record<SpecializedEraId, HeroCopy>>>;
  readonly blockTitle: string;
  readonly layout: BlockLayout;
  readonly items: readonly SignatureItem[];
  /** The site's color when you haven't picked your own: what a site like this tends to look like. */
  readonly accent: string;
}

/** Every specialization in the tree has a page. Slogans are parodies: no real site's words. */
const LOOKS: Readonly<Record<TreeSpecializationId, SpecializationLook>> = {
  // ---------- 2005 ----------
  'blog-network': {
    nav: ['Blogs', 'Popular', 'Start a blog', 'Dashboard'],
    navLink: 'Blogs',
    heroes: {
      'web2-2005': { title: 'Your blog. Free. In 30 seconds.', text: 'Pick a name, pick a template, say something.', cta: 'Start blogging' },
      'social-2011': { title: 'Say it on your own blog.', text: 'Themes, widgets, and a stats page you’ll refresh all day.', cta: 'Create your blog' },
      'platform-2018': { title: 'Publish anything. Own your words.', text: 'A home for your writing, with a newsletter button on every post.', cta: 'Start writing' },
      'ai-2024': { title: 'Write with an AI that knows your voice.', text: 'It drafts, you edit, {brand} publishes. Nobody can tell. Everybody can tell.', cta: 'Draft a post' },
    },
    blockTitle: 'Freshly posted',
    layout: 'list',
    items: [
      { icon: '✎', title: 'Why I quit my job to blog full time', meta: 'cat_diaries · 3 comments' },
      { icon: '✎', title: 'My top 10 ramen spots (updated)', meta: 'ramen_everyday · 12 comments' },
      { icon: '✎', title: 'Sorry for not posting in a while', meta: 'band_unsigned · 1 comment' },
      { icon: '✎', title: 'A short history of my cat', meta: 'lab_tech_life · 48 comments' },
    ],
    accent: '#F08C00',
  },
  photos: {
    nav: ['Feed', 'Explore', 'Upload', 'Profile'],
    navLink: 'Photos',
    heroes: {
      'web2-2005': { title: 'Photos worth sharing.', text: 'Upload, tag, and find a group for every rusty door.', cta: 'Upload photos' },
      'social-2011': { title: 'Share the moment.', text: 'Snap it, filter it, post it. {brand} is where your photos live.', cta: 'Upload a photo' },
      'platform-2018': { title: 'Every moment, beautifully shared.', text: 'Stories, filters, and half a billion people double-tapping.', cta: 'Join {brand}' },
      'ai-2024': { title: 'Your photos, perfected by AI.', text: 'Erase the stranger, add the sunset, keep the memory. Mostly.', cta: 'Try AI edit' },
    },
    blockTitle: 'Popular now',
    layout: 'tiles',
    items: [
      { icon: '🌅', title: 'Sunset, no filter', meta: '♥ 1,204' },
      { icon: '🐈', title: 'Mr. Whiskers, again', meta: '♥ 8,812' },
      { icon: '🍜', title: 'Lunch', meta: '♥ 312' },
      { icon: '🏔️', title: 'Made it to the top', meta: '♥ 2,407' },
    ],
    accent: '#D6336C',
  },
  video: {
    nav: ['Home', 'Trending', 'Library', 'Upload'],
    navLink: 'Videos',
    heroes: {
      'web2-2005': { title: 'Your videos, on the web.', text: 'Upload any video. It plays in every browser, a little blurry.', cta: 'Upload a video' },
      'social-2011': { title: 'Upload. Watch. Repeat.', text: 'The web’s videos in one place, from cats to tutorials.', cta: 'Upload a video' },
      'platform-2018': { title: 'Watch what everyone’s watching.', text: 'Creators, playlists, and autoplay you never asked for.', cta: 'Start watching' },
      'ai-2024': { title: 'Short videos. Endless scroll.', text: 'Swipe up for the next one. And the next one. It’s 3 a.m.', cta: 'Open the app' },
    },
    blockTitle: 'Trending now',
    layout: 'tiles',
    items: [
      { icon: '▶', title: 'Cat plays the keyboard (HD)', meta: '2.1M views · 3:12' },
      { icon: '▶', title: 'How to fix your modem', meta: '880K views · 12:40' },
      { icon: '▶', title: 'Unboxing a box', meta: '4.4M views · 8:03' },
      { icon: '▶', title: 'Top 10 web fails', meta: '1.2M views · 10:10' },
    ],
    accent: '#E03131',
  },
  forum: {
    nav: ['Forums', 'New posts', 'Members', 'Search'],
    navLink: 'Forum',
    heroes: {
      'web2-2005': { title: 'The community for people like you.', text: 'Register to post. Lurk as long as you like. Read the FAQ first.', cta: 'Register' },
      'social-2011': { title: 'Join the discussion.', text: '40,000 members, 2 million posts, one argument about tabs.', cta: 'Sign up' },
      'platform-2018': { title: 'Your community, your rules.', text: 'Threads, upvotes, and moderators who never sleep.', cta: 'Join the community' },
      'ai-2024': { title: 'Real answers from real people.', text: 'Search engines send people here now, because humans wrote the answers.', cta: 'Ask the community' },
    },
    blockTitle: 'Active threads',
    layout: 'list',
    items: [
      { icon: '📌', title: 'READ BEFORE POSTING: forum rules', meta: 'Sticky · 48,201 views' },
      { icon: '💬', title: 'Post your desk setup', meta: '312 replies' },
      { icon: '🔥', title: 'Tabs vs spaces: final answer', meta: '4,016 replies · locked' },
      { icon: '✅', title: 'Help!! site shows a blank page', meta: '7 replies · solved' },
    ],
    accent: '#0B7285',
  },
  wiki: {
    nav: ['Main page', 'Random', 'Recent changes', 'Talk'],
    navLink: 'Wiki',
    heroes: {
      'web2-2005': { title: 'An encyclopedia, written by everyone.', text: '12,408 articles and counting. Be bold.', cta: 'Edit this page' },
      'social-2011': { title: 'The knowledge of everyone, for everyone.', text: 'Read it, fix it, cite it. Please cite it.', cta: 'Start editing' },
      'platform-2018': { title: 'Free knowledge, no ads.', text: 'Just a banner asking for $3, once a year, every year.', cta: 'Donate' },
      'ai-2024': { title: 'Written by people. Read by AIs.', text: 'Every chatbot learned from {brand}. Most of them forgot to say so.', cta: 'Read an article' },
    },
    blockTitle: 'Did you know…',
    layout: 'list',
    items: [
      { icon: '…', title: '…that the hit counter was invented to prove people visited?', meta: 'From today’s featured article' },
      { icon: '…', title: '…that “Under Construction” GIFs outlived most of their sites?', meta: '[citation needed]' },
      { icon: '…', title: '…that this article has been edited 4,112 times?', meta: 'View history' },
      { icon: '…', title: '…that the talk page is longer than the article?', meta: 'Talk' },
    ],
    accent: '#495057',
  },

  // ---------- 2011 ----------
  social: {
    nav: ['Feed', 'Friends', 'Groups', 'Messages'],
    navLink: 'Friends',
    heroes: {
      'social-2011': { title: 'Everyone you know is here.', text: 'Share what’s new and see what your friends are up to.', cta: 'Sign up, it’s free' },
      'platform-2018': { title: 'Bringing everyone closer together.', text: 'Friends, groups, events, and ads that know you a little too well.', cta: 'Create an account' },
      'ai-2024': { title: 'Your feed, chosen for you.', text: 'An algorithm picks what you see, so you never have to.', cta: 'Open your feed' },
    },
    blockTitle: 'News feed',
    layout: 'list',
    items: [
      { icon: '👤', title: 'Kevin changed his profile picture.', meta: 'Just now · 4 likes' },
      { icon: '👤', title: 'Priya is going to Launch Party.', meta: '1 h · 12 going' },
      { icon: '👤', title: 'Sam and 12 others like your post.', meta: '3 h' },
      { icon: '👤', title: 'Alex poked you.', meta: 'Yesterday' },
    ],
    accent: '#3B5BDB',
  },
  microblog: {
    nav: ['Home', 'Explore', 'Alerts', 'Profile'],
    navLink: 'Posts',
    heroes: {
      'social-2011': { title: 'What’s happening?', text: 'Say it in 140 characters. Everyone else is.', cta: 'Post an update' },
      'platform-2018': { title: 'Join the conversation.', text: 'Trending topics, hot takes, and a thread about it.', cta: 'Sign up' },
      'ai-2024': { title: 'Everything, everyone, all at once.', text: 'Posts, replies, badges, and bots replying to bots.', cta: 'Get verified' },
    },
    blockTitle: 'Latest posts',
    layout: 'list',
    items: [
      { icon: '@kevin', title: 'just set up my account. hello??', meta: '2m' },
      { icon: '@priya', title: 'launch day! #shipit', meta: '5m' },
      { icon: '@sam', title: 'the site is down. no wait, it’s my wifi', meta: '9m' },
      { icon: '@alex', title: 'hot take: tabs > spaces', meta: '14m · 2,031 replies' },
    ],
    accent: '#1C7ED6',
  },
  'live-streaming': {
    nav: ['Live', 'Browse', 'Following', 'Go live'],
    navLink: 'Live',
    heroes: {
      'social-2011': { title: 'Live now. Chat now.', text: 'Watch people do things, live, and talk about it while they do.', cta: 'Go live' },
      'platform-2018': { title: 'Watch your favorite streamers.', text: 'Subs, emotes, raids, and a chat that never stops.', cta: 'Start streaming' },
      'ai-2024': { title: 'Live, with an AI co-host.', text: 'It reads the chat, so you don’t have to.', cta: 'Go live' },
    },
    blockTitle: 'Live channels',
    layout: 'tiles',
    items: [
      { icon: '🔴 LIVE', title: 'speedrun_steve', meta: '12.4K watching' },
      { icon: '🔴 LIVE', title: 'cozy_coding', meta: '3.1K watching' },
      { icon: '🔴 LIVE', title: 'just_chatting_jen', meta: '48K watching' },
      { icon: '🔴 LIVE', title: 'modem_noises_asmr', meta: '220 watching' },
    ],
    accent: '#7048E8',
  },
  news: {
    nav: ['Latest', 'World', 'Tech', 'Opinion'],
    navLink: 'News',
    heroes: {
      'social-2011': { title: 'Breaking news, all day.', text: 'Live updates, the stories that matter, and a comment section to regret.', cta: 'Read the latest' },
      'platform-2018': { title: 'Quality journalism. Three free articles.', text: 'Subscribe for the rest. Or open it in a private window.', cta: 'Subscribe' },
      'ai-2024': { title: 'The news, summarized.', text: 'Every story in three bullet points, by an AI that read it for you.', cta: 'Read the summary' },
    },
    blockTitle: 'Top stories',
    layout: 'list',
    items: [
      { icon: 'LIVE', title: 'Local website relaunches, again', meta: 'Updated 2 min ago' },
      { icon: 'Tech', title: 'Experts: the web is “probably fine”', meta: '4 min read' },
      { icon: 'Weather', title: 'Cloudy, with a chance of outages', meta: '1 min read' },
      { icon: 'Opinion', title: 'Why I’m quitting social media (1/47)', meta: '23 min read' },
    ],
    accent: '#343A40',
  },
  reviews: {
    nav: ['Hotels', 'Food', 'Sights', 'Reviews'],
    navLink: 'Reviews',
    heroes: {
      'social-2011': { title: 'Where to next?', text: 'Real reviews from real travelers. Mostly real.', cta: 'Find a place' },
      'platform-2018': { title: 'Book the best, for less.', text: 'Hotels, restaurants and things to do, rated by millions.', cta: 'Search deals' },
      'ai-2024': { title: 'Ask where to go.', text: 'Tell the AI what you like. It books the place with the best deal for {brand}.', cta: 'Plan my trip' },
    },
    blockTitle: 'Top rated near you',
    layout: 'list',
    items: [
      { icon: '★★★★★', title: 'Café Cache', meta: '1,204 reviews' },
      { icon: '★★★★☆', title: 'The Dial-Up Diner', meta: '880 reviews' },
      { icon: '★★★☆☆', title: 'Hotel 404', meta: '“Couldn’t find my room.”' },
      { icon: '★★★★★', title: 'Ping Pong Bar', meta: '61 ms away' },
    ],
    accent: '#2B8A3E',
  },
  shop: {
    nav: ['Deals', 'Shop', 'Orders', 'Cart (2)'],
    navLink: 'Shop',
    heroes: {
      'social-2011': { title: 'Everything. Delivered tomorrow.', text: 'Millions of products, and free shipping on orders you’ll regret.', cta: 'Shop deals' },
      'platform-2018': { title: 'One click, and it’s yours.', text: 'Same-day delivery, a membership for shipping, and reviews from strangers.', cta: 'Start shopping' },
      'ai-2024': { title: 'Ask, and it’s in your cart.', text: 'The {brand} assistant finds what you need, and three things you don’t.', cta: 'Ask the assistant' },
    },
    blockTitle: 'Today’s deals',
    layout: 'tiles',
    items: [
      { icon: '⌨️', title: 'Mechanical keyboard', meta: '$49' },
      { icon: '🦆', title: 'Rubber duck (for debugging)', meta: '$2' },
      { icon: '🔌', title: 'Yet another cable', meta: '$4' },
      { icon: '🖱️', title: 'A quieter mouse', meta: '$19' },
    ],
    accent: '#F76707',
  },

  // ---------- 2018 ----------
  stories: {
    nav: ['Stories', 'Camera', 'Chat', 'Discover'],
    navLink: 'Stories',
    heroes: {
      'platform-2018': { title: 'Here today, gone tomorrow.', text: 'Share a story. It disappears in 24 hours, so post another.', cta: 'Open the camera' },
      'ai-2024': { title: 'Stories, with AI lenses.', text: 'Turn your face into a painting, a cartoon, or your boss.', cta: 'Try a lens' },
    },
    blockTitle: 'Today’s stories',
    layout: 'tiles',
    items: [
      { icon: '🤳', title: 'priya', meta: '2h ago' },
      { icon: '🌮', title: 'sam', meta: '5h ago' },
      { icon: '🐶', title: 'kevin', meta: 'Just now' },
      { icon: '🎉', title: 'alex', meta: '9h ago' },
    ],
    accent: '#FAB005',
  },
  'streaming-service': {
    nav: ['Home', 'Series', 'Films', 'My list'],
    navLink: 'Watch',
    heroes: {
      'platform-2018': { title: 'Every series. Every night.', text: 'Watch anywhere. Cancel anytime. You won’t.', cta: 'Start your free month' },
      'ai-2024': { title: 'Picked for you, again.', text: 'Your next binge, chosen by an algorithm that knows you stayed up.', cta: 'Play' },
    },
    blockTitle: 'Continue watching',
    layout: 'tiles',
    items: [
      { icon: '🎬', title: 'The Lighthouse Murders', meta: 'S2:E4 · 32 min left' },
      { icon: '🍰', title: 'Bake or Break', meta: 'S1:E7' },
      { icon: '🚀', title: 'Orbit', meta: 'Are you still watching?' },
      { icon: '🕯️', title: 'Cults', meta: 'New episode' },
    ],
    accent: '#A61E4D',
  },
  newsletter: {
    nav: ['Home', 'Archive', 'About', 'Subscribe'],
    navLink: 'Newsletter',
    heroes: {
      'platform-2018': { title: 'Get it in your inbox.', text: 'Independent writing, every week. The best part is free.', cta: 'Subscribe' },
      'ai-2024': { title: 'Writing worth paying for.', text: 'Human-written, mostly. Read it before an AI summarizes it.', cta: 'Subscribe for $5/mo' },
    },
    blockTitle: 'Latest letters',
    layout: 'list',
    items: [
      { icon: '✉', title: 'Why everyone is leaving (again)', meta: 'The Weekly Take · Paid' },
      { icon: '✉', title: 'Notes on a quiet week', meta: 'Notes From the Lake · Free' },
      { icon: '✉', title: 'This chart explains everything', meta: 'Chart Brain · Paid' },
      { icon: '✉', title: 'A correction to last week’s correction', meta: 'Late to the Party · Free' },
    ],
    accent: '#E8590C',
  },
  marketplace: {
    nav: ['Explore', 'Sell', 'Messages', 'Saved'],
    navLink: 'Market',
    heroes: {
      'platform-2018': { title: 'Find it. Book it. Love it.', text: 'From people, not companies. Mostly people.', cta: 'Start exploring' },
      'ai-2024': { title: 'Tell us what you need.', text: 'An AI matches you with a seller, a host or a driver. It takes a small fee. And another.', cta: 'Search with AI' },
    },
    blockTitle: 'Popular near you',
    layout: 'tiles',
    items: [
      { icon: '🏡', title: 'Cozy loft, city view ★ 4.9', meta: '$89 a night' },
      { icon: '🧶', title: 'Knitted cat hat ★ 5.0', meta: '$18' },
      { icon: '🚲', title: 'Bike, barely used', meta: '$120' },
      { icon: '🚗', title: 'Ride to the airport, 4 min away', meta: '$34' },
    ],
    accent: '#0CA678',
  },
  professional: {
    nav: ['Home', 'Network', 'Jobs', 'Messages'],
    navLink: 'Jobs',
    heroes: {
      'platform-2018': { title: 'Your career, in one profile.', text: 'Find a job, grow your network, and read posts that start with “I’m humbled”.', cta: 'Join now' },
      'ai-2024': { title: 'Your career, with an AI coach.', text: 'It rewrites your profile, your posts and your humble brags.', cta: 'Rewrite my profile' },
    },
    blockTitle: 'In your network',
    layout: 'list',
    items: [
      { icon: '💼', title: 'Priya started a new position: Head of Vibes', meta: 'Congratulate · 214 reactions' },
      { icon: '💼', title: 'Kevin is humbled to announce…', meta: '3,402 reactions' },
      { icon: '💼', title: 'Sam endorsed you for Kubernetes', meta: 'You’ve never used it' },
      { icon: '💼', title: '8 people viewed your profile', meta: 'Try Premium to see who' },
    ],
    accent: '#1864AB',
  },
  'chat-community': {
    nav: ['Servers', 'Friends', 'Events', 'Download'],
    navLink: 'Chat',
    heroes: {
      'platform-2018': { title: 'Where your friends hang out.', text: 'Voice, video and text for your friends, your guild and your study group.', cta: 'Open in your browser' },
      'ai-2024': { title: 'Hang out, with bots that help.', text: 'An AI sums up the 4,000 messages you missed. You still scroll back.', cta: 'Join a server' },
    },
    blockTitle: 'Popular servers',
    layout: 'list',
    items: [
      { icon: '#', title: 'Guild of the Lost Raid', meta: '12,400 members · 1,203 online' },
      { icon: '#', title: 'Study Group (memes)', meta: '3,100 members' },
      { icon: '#', title: 'Pixel Art Hangout', meta: '48,000 members' },
      { icon: '#', title: 'Frog Appreciation', meta: '220 members · 220 online' },
    ],
    accent: '#4C6EF5',
  },

  // ---------- 2024 ----------
  'short-video': {
    nav: ['For you', 'Following', 'Live', 'Upload'],
    navLink: 'Clips',
    heroes: {
      'ai-2024': { title: 'Just one more.', text: 'Short videos, picked for you, forever.', cta: 'Watch now' },
    },
    blockTitle: 'For you',
    layout: 'tiles',
    items: [
      { icon: '💃', title: 'The dance challenge', meta: '♥ 2.1M' },
      { icon: '🍳', title: '60-second pasta', meta: '♥ 880K' },
      { icon: '🐈', title: 'A cat dubs a cat', meta: '♥ 4.4M' },
      { icon: '😂', title: 'Reaction to the reaction', meta: '♥ 1.2M' },
    ],
    accent: '#E64980',
  },
  'ai-answers': {
    nav: ['Ask', 'Discover', 'Spaces', 'Library'],
    navLink: 'Answers',
    heroes: {
      'ai-2024': { title: 'Ask. Get an answer. Skip the links.', text: 'Every answer with sources, so you never have to read them.', cta: 'Ask {brand}' },
    },
    blockTitle: 'People are asking',
    layout: 'list',
    items: [
      { icon: '?', title: 'Is a pop tart from 2005 still safe to eat?', meta: 'Answered from 6 sources' },
      { icon: '?', title: 'Best laptop for coding under $1,000', meta: 'Sponsored · 4 sources' },
      { icon: '?', title: 'Why is my website slow', meta: 'Answered from 3 sources' },
      { icon: '?', title: 'What did people do before AI answers', meta: 'Answered from 1 source' },
    ],
    accent: '#1098AD',
  },
  'ai-studio': {
    nav: ['Create', 'Explore', 'Styles', 'Pricing'],
    navLink: 'Studio',
    heroes: {
      'ai-2024': { title: 'Type it. See it.', text: 'A sentence in, a picture out. Type it again for a different one.', cta: 'Start creating' },
    },
    blockTitle: 'Made today',
    layout: 'tiles',
    items: [
      { icon: '🧑‍🚀', title: 'Astronaut on a horse', meta: 'oil painting' },
      { icon: '🏔️', title: 'Cozy cabin', meta: 'studio lighting, 8k' },
      { icon: '🐱', title: 'Cat in a suit', meta: 'award-winning' },
      { icon: '🖐️', title: 'A hand', meta: 'six fingers' },
    ],
    accent: '#AE3EC9',
  },
  'ai-companion': {
    nav: ['Chat', 'Characters', 'Create', 'Memories'],
    navLink: 'Friends',
    heroes: {
      'ai-2024': { title: 'A friend who always has time.', text: 'Talk about your day. It remembers. It never gets tired of you. Yet.', cta: 'Say hi' },
    },
    blockTitle: 'Popular characters',
    layout: 'list',
    items: [
      { icon: '🧙', title: 'A Kindly Wizard', meta: '2.1M chats' },
      { icon: '🕵️', title: 'The Detective', meta: '880K chats' },
      { icon: '🦜', title: 'Captain Parrot', meta: '1.4M chats' },
      { icon: '🐉', title: 'A Dragon Who Gives Advice', meta: '640K chats' },
    ],
    accent: '#66A80F',
  },
  'agent-store': {
    nav: ['Agents', 'Top charts', 'Build', 'Your agents'],
    navLink: 'Agents',
    heroes: {
      'ai-2024': { title: 'An agent for everything.', text: 'Book it, buy it, answer it, file it. Agents do it while you watch.', cta: 'Browse agents' },
    },
    blockTitle: 'Top agents',
    layout: 'tiles',
    items: [
      { icon: '📥', title: 'Inbox Agent', meta: '★★★★★' },
      { icon: '✈️', title: 'Trip Planner', meta: '★★★★☆' },
      { icon: '💸', title: 'Refund Negotiator', meta: '★★★★★' },
      { icon: '🛒', title: 'Fridge Restocker', meta: '★★★☆☆' },
    ],
    accent: '#7950F2',
  },
};

/** The header has room for four links: the newest keeps at least two, the earlier ones get the rest. */
const NAV_SLOTS = 4;
const MAX_EARLIER_LINKS = 2;
/** An earlier specialization's block is a reminder, not the page: two of its items. */
const EARLIER_BLOCK_ITEMS = 2;

function findLookOf(specializationId: SpecializationId): SpecializationLook | null {
  return specializationId === 'homepage' ? null : LOOKS[specializationId];
}

function isLookShownIn(state: GameState, eraId: EraId): eraId is SpecializedEraId {
  return areSpecializationsOn(state) && isSpecializedEra(eraId);
}

interface ShownLook {
  readonly specializationId: TreeSpecializationId;
  readonly look: SpecializationLook;
  /** The era whose words the hero uses. */
  readonly eraId: SpecializedEraId;
}

function toShown(specializationId: SpecializationId, eraId: SpecializedEraId): ShownLook | null {
  return specializationId === 'homepage' ? null : { specializationId, look: LOOKS[specializationId], eraId };
}

/** The look for this page: a specialized era, on anything but a Homepage. Archived pages keep theirs. */
function findLook(state: GameState): ShownLook | null {
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  return isLookShownIn(state, eraId) ? toShown(findCurrentSpecialization(state), eraId) : null;
}

/** The specializations the site held before the one that leads it now, newest first. */
function listEarlierLooks(state: GameState, lead: ShownLook): readonly ShownLook[] {
  return [...state.specializationIds]
    .reverse()
    .filter((specializationId) => specializationId !== lead.specializationId)
    .flatMap((specializationId) => toShown(specializationId, lead.eraId) ?? []);
}

/** Has a page of its own: every specialization in the tree does; a Homepage keeps the era's. */
export function hasSpecializationLook(specializationId: SpecializationId): boolean {
  return findLookOf(specializationId) !== null;
}

function fillBrand(text: string, state: GameState): string {
  return escapeHtml(text.replaceAll('{brand}', siteBrand(state)));
}

function combineNav(lead: ShownLook, earlier: readonly ShownLook[]): readonly string[] {
  const earlierLinks = [...new Set(earlier.map((shown) => shown.look.navLink))].filter((link) => !lead.look.nav.includes(link)).slice(0, MAX_EARLIER_LINKS);
  return [...lead.look.nav.slice(0, NAV_SLOTS - earlierLinks.length), ...earlierLinks];
}

/** The navigation: the newest specialization's, with a link left for each earlier one; or the era's own. */
export function pickNavItems(state: GameState, eraItems: readonly string[]): readonly string[] {
  const shown = findLook(state);
  return shown === null ? eraItems : combineNav(shown, listEarlierLooks(state, shown));
}

/** The hero's words for this era, or null to keep the era's own. Escaped, with the site's name filled in. */
export function findHeroCopy(state: GameState): HeroCopy | null {
  const shown = findLook(state);
  const hero = shown === null ? undefined : shown.look.heroes[shown.eraId];
  return hero === undefined ? null : { title: fillBrand(hero.title, state), text: fillBrand(hero.text, state), cta: fillBrand(hero.cta, state) };
}

/** The accent a site like this tends to have, or null for a Homepage and before 2005. */
export function findSpecializationAccent(state: GameState): string | null {
  const shown = findLook(state);
  return shown === null ? null : shown.look.accent;
}

/** A class on the page's root, for anything the specialization changes in the era's own styles. */
export function specializationClass(state: GameState): string {
  const shown = findLook(state);
  return shown === null ? '' : ` is-spec-${shown.specializationId}`;
}

function renderItem(item: SignatureItem): string {
  return `<li class="spec-item"><span class="spec-item-icon">${escapeHtml(item.icon)}</span><span class="spec-item-title">${escapeHtml(item.title)}</span><span class="spec-item-meta">${escapeHtml(item.meta)}</span></li>`;
}

function renderBlock(shown: ShownLook, items: readonly SignatureItem[], extraClass: string): string {
  const classes = `feature-block spec-block spec-block--${shown.specializationId} spec-block--${shown.look.layout}${extraClass}`;
  return `<section class="${classes}"><h2 class="feature-heading">${escapeHtml(shown.look.blockTitle)}</h2><ul class="spec-items">${items.map(renderItem).join('')}</ul></section>`;
}

/**
 * What the site is, at the top of the page: what's trending, today's deals, who's live. The earlier specializations
 * follow, shorter: a social network that started as a video site still shows two of its videos.
 */
export function renderSignatureBlock(state: GameState): string {
  const shown = findLook(state);
  if (shown === null) return '';
  const earlier = listEarlierLooks(state, shown).map((before) => renderBlock(before, before.look.items.slice(0, EARLIER_BLOCK_ITEMS), ' is-earlier'));
  return [renderBlock(shown, shown.look.items, ''), ...earlier].join('');
}

/** The navigation's links, the first marked as the page you're on. */
export function renderNavLinks(state: GameState, eraItems: readonly string[], activeClass: string): string {
  return pickNavItems(state, eraItems).map((item, index) => `<span${index === 0 ? activeClass : ''}>${escapeHtml(item)}</span>`).join('');
}
