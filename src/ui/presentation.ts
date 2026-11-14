import type { EraId } from '../engine';
import { AI_POPUPS, HOMEPAGE_POPUPS, PLATFORM_POPUPS, SOCIAL_POPUPS, WEB2_POPUPS } from './popup-copy';
import type { PopupCopy } from './popup-copy';

export interface MessageCopy {
  readonly author: string;
  readonly text: string;
}

export interface TextAdCopy {
  readonly title: string;
  readonly url: string;
  readonly text: string;
}

export interface BlogPostCopy {
  readonly title: string;
  readonly date: string;
  readonly excerpt: string;
}

export interface EraStory {
  readonly yearSpan: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly whatsNew: readonly string[];
  readonly confirmLabel: string;
}

/** How code arrives in the editor: typed a few characters at a time, or pasted a line at a time. */
export interface TypingStyle {
  readonly pastesWholeLines: boolean;
  readonly typoLabel: string;
  readonly fixLabel: string;
}

const TYPED_BY_HAND: TypingStyle = { pastesWholeLines: false, typoLabel: 'typo!', fixLabel: 'fixed' };
/** 2018: every keystroke runs npm install. A typo installs a lookalike package with something nasty in it. */
export const NPM_INSTALL_TYPING: TypingStyle = { pastesWholeLines: true, typoLabel: 'typosquat!', fixLabel: 'uninstalled' };
/** 2024: every keystroke accepts an AI suggestion. A typo is a function the AI made up. */
const AI_AUTOCOMPLETE_TYPING: TypingStyle = { pastesWholeLines: true, typoLabel: 'hallucinated!', fixLabel: 'rejected' };

export interface EraPresentation {
  readonly year: number;
  readonly browserTitle: string;
  readonly siteUrl: string;
  readonly editorTitle: string;
  readonly editorMenu: readonly string[];
  readonly editorTabs: readonly string[];
  readonly editorHighlightsSyntax: boolean;
  readonly typing: TypingStyle;
  readonly popups: readonly PopupCopy[];
  readonly guestbook: readonly MessageCopy[];
  readonly musicTracks: readonly string[];
  readonly entryStory: EraStory | null;
  readonly antivirusTitle: string;
}

export const ERA_PRESENTATION: Readonly<Record<EraId, EraPresentation>> = {
  'homepage-1997': {
    year: 1997,
    browserTitle: '{name} - Web Navigator',
    siteUrl: 'http://members.freewebspace.net/~{site}/index.htm',
    editorTitle: 'INDEX.HTM - Text Editor',
    editorMenu: ['File', 'Edit', 'Search', 'Help'],
    editorTabs: [],
    editorHighlightsSyntax: false,
    typing: TYPED_BY_HAND,
    popups: HOMEPAGE_POPUPS,
    guestbook: [
      { author: 'xX_SkaterBoi_Xx', text: 'cool site!!! check out mine 2' },
      { author: 'Webmistress Jen', text: 'Love the background. Linked you from my page :)' },
      { author: 'Anonymous', text: 'how do u make the text blink??' },
      { author: 'CyberDude2000', text: 'First!!! oh wait' },
      { author: 'grandma_dot', text: 'Very nice page dear. Is this the email?' },
      { author: 'MIDI_Mike', text: 'what song is that playing. AWESOME' },
      { author: 'NetSurfer98', text: 'Your page took 3 minutes to load. Worth it.' },
      { author: 'darkangel', text: 'add me to ur webring plz' },
    ],
    musicTracks: ['song.mid', 'theme_from_game.mid', 'ballad_remix.mid', 'track03.mid'],
    entryStory: null,
    antivirusTitle: 'ANTIVIRUS.EXE',
  },
  'web2-2005': {
    year: 2005,
    browserTitle: '{site} | blog',
    siteUrl: 'http://www.{site}.com/blog/',
    editorTitle: 'blog.php — CodeStudio',
    editorMenu: [],
    editorTabs: ['blog.php', 'ajax.js', 'style.css'],
    // Plain until Syntax highlighting is bought: that boost is what turns the colours on.
    editorHighlightsSyntax: false,
    typing: TYPED_BY_HAND,
    popups: WEB2_POPUPS,
    guestbook: [
      { author: 'web2fan', text: 'nice redesign!! so glossy' },
      { author: 'tagger_tom', text: 'subscribed to your RSS feed' },
      { author: 'ajaxian_amy', text: 'the comments load without a page refresh?? magic' },
      { author: 'beta_tester', text: 'found a bug, but it IS beta' },
      { author: 'linklover', text: 'added you to my blogroll' },
      { author: 'podcatcher', text: 'more episodes please' },
    ],
    musicTracks: ['Ep. 12: Is AJAX a fad?', 'Ep. 13: Tags vs folders', 'Ep. 14: Rounded corners explained'],
    entryStory: {
      yearSpan: '2000 → 2005',
      heading: 'The bubble bursts',
      paragraphs: [
        'March 2000. The dot-com bubble bursts. Ad rates crash and half your webring goes offline overnight.',
        'Then somebody coins “Web 2.0”. Websites stop being pages you read and turn into places where people post.',
        'Your homepage needs a relaunch: rounded corners, glossy gradients and a beta sticker. One problem: you still build everything with tables.'
      ],
      whatsNew: [
        'Your site keeps its 1997 look until you learn CSS. Learn the Web 2.0 look after that to make it glossy.',
        'Blogs, comments and tag clouds, each unlocked by a new skill.',
        'Your old features get new names: the guestbook becomes a shoutbox, the webring a blogroll.',
        'Ads pay less after the crash, and you have room for more of them. Contextual text ads annoy visitors less, so your best ad count changes.',
        'Spam bots now target your comments.',
      ],
      confirmLabel: 'Relaunch as Web 2.0',
    },
    antivirusTitle: 'Antivirus 2005 · Quick scan',
  },
  'social-2011': {
    year: 2011,
    browserTitle: '{site}',
    siteUrl: 'http://www.{site}.com/#!/home',
    editorTitle: 'index.html — Lime Text',
    editorMenu: [],
    editorTabs: ['index.html', 'app.js', 'style.css'],
    editorHighlightsSyntax: true,
    // Nobody types code in 2011: every keystroke pastes a whole answer from a Q&A site.
    typing: { pastesWholeLines: true, typoLabel: 'duplicate!', fixLabel: 'accepted' },
    popups: SOCIAL_POPUPS,
    guestbook: [
      { author: 'Sam K.', text: 'liked your post!' },
      { author: 'Ana P.', text: 'is this mobile friendly?? cant read it on my phone' },
      { author: 'Jo', text: 'shared this with 400 friends' },
      { author: 'Theo', text: 'first! (from my phone)' },
      { author: 'mel_b', text: 'pls make an app' },
      { author: 'Rik', text: 'checked in here #awesome' },
    ],
    musicTracks: ['Ep. 41: Is Flash dead?', 'Ep. 42: Responsive everything', 'Ep. 43: Hashbang URLs, why'],
    entryStory: {
      yearSpan: '2006 → 2011',
      heading: 'Everyone has a phone now',
      paragraphs: [
        'A phone with no keyboard and a real web browser comes out. By 2011, four in ten of your visitors are on a phone, and your glossy 2005 blog makes them pinch, zoom and scroll sideways.',
        'Everyone is on a social network. Visitors arrive from their friends’ shares now, not from your blogroll.',
        'And Flash is dying: phones never ran it, and desktop browsers started blocking it. Your Flash intro goes, and your podcast player shows a missing-plugin box.',
      ],
      whatsNew: [
        'Four in ten visitors are on phones. Most of them leave until you learn responsive design. The browser’s Phone switch shows you what they see.',
        'Out with the old: features that went out of fashion retire (listed below). Lighter pages load faster on phones.',
        'Your podcast player ran on Flash: rebuild it with HTML5 video and audio.',
        'Learn Bootstrap and your site gets the look every 2011 site had.',
        'Your racks don’t come along: you move to the cloud, and add instances as you grow.',
        'New trouble: botnets for hire flood your busiest page, and user tables leak onto paste sites. DDoS protection and bcrypt make them stop.',
        'Code comes from a Q&A site now: every keystroke pastes a whole answer. Some get marked as duplicate.',
      ],
      confirmLabel: 'Relaunch for 2011',
    },
    antivirusTitle: 'AntiMalware Free · Quick scan',
  },
  'platform-2018': {
    year: 2018,
    browserTitle: '{site} — The all-in-one platform',
    siteUrl: 'https://www.{site}.com/',
    // The title has no room for the editor's name: it shows the size of node_modules instead.
    editorTitle: 'index.html',
    editorMenu: [],
    editorTabs: ['index.html', 'terminal'],
    editorHighlightsSyntax: true,
    typing: NPM_INSTALL_TYPING,
    popups: PLATFORM_POPUPS,
    guestbook: [
      { author: 'jess.codes', text: 'this is 🔥🔥🔥' },
      { author: 'mike_t', text: 'does it have dark mode' },
      { author: 'priya', text: 'signed up from my phone in 10 seconds, nice' },
      { author: 'dev_dan', text: 'what stack is this? asking for a medium post' },
      { author: 'anna.k', text: 'why does it ask for notifications on every visit' },
      { author: 'growth_guru', text: 'love the onboarding funnel' },
    ],
    musicTracks: ['Ep. 88: Is jQuery dead?', 'Ep. 89: React, Angular or Vue?', 'Ep. 90: Do you need Kubernetes? (You don’t)'],
    entryStory: {
      yearSpan: '2012 → 2018',
      heading: 'Everything is a platform',
      paragraphs: [
        'Websites stopped being pages. They’re apps now: they load once, then JavaScript builds everything you see. Three frameworks fight over how, and every team has to pick a side.',
        'Six in ten visitors are on a phone, and they leave if your page takes longer than three seconds. The browser grades every page on its own speed test.',
        'And the social networks closed their doors. After a data scandal, Facespace switched off the API your “Sign in with…” buttons ran on.',
      ],
      whatsNew: [
        'The framework wars: learn React, Angular or Vue. You can only pick one. It rewrites your site as a single-page app, and the others say it’s already dead.',
        'Single-page apps are blank until the JavaScript has loaded and run, and search engines index the blank page. Learn your framework’s server rendering to fix it.',
        'Facespace’s login API is gone: “Sign in with…” shows an error until you build your own login.',
        'Out with the old: features that went out of fashion retire (listed below), and so does the “Get our app!” banner.',
        'Your cloud instances don’t come along: everything runs in containers on Kubernetes now. Add pods as you grow.',
        'Code arrives by npm install now: every keystroke installs a package. Typos install the wrong one.',
        'The status bar runs a speed test on every page: one score out of 100, and the numbers behind it.',
      ],
      confirmLabel: 'Relaunch as a platform',
    },
    antivirusTitle: 'Shield Security · Quick scan',
  },
  'ai-2024': {
    year: 2024,
    browserTitle: '{site} — now with AI',
    siteUrl: 'https://{site}.com/',
    editorTitle: 'page.tsx',
    editorMenu: [],
    editorTabs: ['page.tsx', 'terminal'],
    editorHighlightsSyntax: true,
    typing: AI_AUTOCOMPLETE_TYPING,
    popups: AI_POPUPS,
    guestbook: [
      { author: 'prompt_queen', text: 'is this AI generated? asking for a friend' },
      { author: 'dev_dan', text: 'your chatbot says my order shipped in 2019' },
      { author: 'anna.k', text: 'finally, dark mode' },
      { author: 'jess.codes', text: 'can I talk to a human please' },
      { author: 'mike_t', text: 'the ✨ button is on everything now' },
      { author: 'grandma_rose', text: 'the AI helper is very polite. it got my name wrong' },
    ],
    musicTracks: ['Ep. 140: Is coding dead? (No)', 'Ep. 141: Every app is a chat app now', 'Ep. 142: We asked an AI to host this episode'],
    entryStory: {
      yearSpan: '2019 → 2024',
      heading: 'AI everywhere',
      paragraphs: [
        'A chatbot learned to write, then to code, then to draw. Within a year every product had a ✨ button, and every pitch deck said “AI”.',
        'Search changed under your feet. An AI answer sits above the links now, made from pages like yours, and three in ten searchers read it and never click.',
        'And the crawlers came: bots copying the whole web for training data, a thousand requests a second, from addresses that change every minute.',
      ],
      whatsNew: [
        'You asked an AI to redesign the site over a weekend. It did: big type, a bento grid, a sparkle on every button.',
        'AI answers keep three in ten of your would-be visitors. Write for AI answers to get quoted, with a link.',
        'Call an LLM API, learn retrieval, image models and recommenders: an AI assistant, AI-written articles, “Ask AI” search, an image generator and a “For you” feed.',
        'New trouble: AI crawlers swarm your busiest page, and your assistant sometimes promises things you never said. A bot shield and guardrails stop them.',
        'Out with the old: stories and the human live chat retire (listed below). The assistant takes the chat’s corner.',
        'Your Kubernetes pods don’t come along: whatever thinks runs on rented GPUs now.',
        'Your editor finishes your lines: every keystroke accepts an AI suggestion, and some of them call functions that don’t exist.',
      ],
      confirmLabel: 'Relaunch with AI',
    },
    antivirusTitle: 'Device Security · Quick scan',
  },
};

export const BANNER_ADS: readonly string[] = [
  'You are the 1,000,000th visitor!',
  'Get FREE web space! 2 MB!',
  'Make $$$ from home!!!',
  'FREE screensavers! Download now',
  'Win a 56k modem!',
  'Your PC is running SLOW',
];

export const TEXT_ADS: readonly TextAdCopy[] = [
  { title: 'Cheap web hosting', url: 'www.hostcheap.example', text: 'Unlimited bandwidth*. 99¢ a month.' },
  { title: 'Make your site Web 2.0', url: 'www.glossify.example', text: 'Gradients, reflections, beta badges.' },
  { title: 'Ringtones for your phone', url: 'www.ringz.example', text: 'Every hit song, in polyphonic.' },
  { title: 'Learn AJAX in 24 hours', url: 'www.ajaxbook.example', text: 'Stop reloading. Start loading.' },
  { title: 'Free blog templates', url: 'www.templatez.example', text: 'Rounded corners included.' },
  { title: 'Domain names $6.99', url: 'www.dotcom-again.example', text: 'The bubble is back. Probably.' },
  { title: 'Online poker', url: 'www.pokerz.example', text: 'Everyone is doing it.' },
  { title: 'Podcast microphones', url: 'www.micshop.example', text: 'Sound like a radio pro.' },
  { title: 'SEO experts', url: 'www.rankone.example', text: 'We put your keywords in the keywords.' },
  { title: 'Digital cameras', url: 'www.megapixel.example', text: 'Now with 5 megapixels.' },
];

/** An ad on a 2011 or 2018 page: who paid, the line that's meant to make you click, and the small print. */
export interface DisplayAdCopy {
  readonly advertiser: string;
  readonly headline: string;
  readonly text: string;
}

/** 2011: sponsored posts in the right-hand column, between your friends' likes. */
export const SPONSORED_POSTS: readonly DisplayAdCopy[] = [
  { advertiser: 'FarmTown', headline: 'Your crops are wilting!', text: 'Your friends sent you 3 cows. Play now.' },
  { advertiser: 'Slim in 30', headline: '1 weird trick to lose belly fat', text: 'Doctors hate her.' },
  { advertiser: 'Deal of the Day', headline: '90% off a spa day', text: '12,000 bought. 400 left.' },
  { advertiser: 'EmpireBuilder', headline: 'Build your empire tonight', text: 'The most addictive game of 2011.' },
  { advertiser: 'PhotoBook', headline: 'Turn your albums into a book', text: 'Free shipping this week only.' },
  { advertiser: 'CollegeNow', headline: 'Get your degree online', text: 'From your phone. In your pajamas.' },
  { advertiser: 'PetVille', headline: 'Your puppy misses you', text: 'Feed him before your friends see.' },
  { advertiser: 'SnapFilter', headline: 'Make every photo look like 1977', text: 'Square. Faded. Vintage. Free.' },
  { advertiser: 'GroupGift', headline: 'Chip in for Sarah’s birthday', text: '14 friends already did. You know Sarah.' },
  { advertiser: 'Sponsored', headline: 'Like us for a chance to win a tablet', text: 'Share with 5 friends to enter.' },
  { advertiser: 'MemeMaker', headline: 'Make your own rage comic', text: 'FFFFFFUUUUUU in 3 clicks.' },
  { advertiser: 'Sponsored', headline: 'Is your password strong enough?', text: 'Find out. Just type it here.' },
];

/** 2024: every ad is for an AI product, or written by one. */
export const AI_ERA_ADS: readonly DisplayAdCopy[] = [
  { advertiser: 'PromptPro', headline: 'Write like a human. With AI.', text: 'Undetectable*. Try it free.' },
  { advertiser: 'RentAGPU', headline: 'GPUs available today', text: 'Your waitlist position: 4,812.' },
  { advertiser: 'Sponsored', headline: 'This AI made $10k while I slept', text: 'Here’s the exact prompt.' },
  { advertiser: 'CoachBot', headline: 'Your AI health coach', text: 'It will never judge you. It will remind you.' },
  { advertiser: 'SoloLaunch', headline: 'Launch a startup this weekend', text: 'No code, no co-founder, no customers.' },
  { advertiser: 'Sponsored', headline: 'Doctors are stunned by this AI app', text: 'Number 7 is a chatbot.' },
  { advertiser: 'MeetNotes', headline: 'Never take notes again', text: 'An AI joins your calls. All of them.' },
  { advertiser: 'HeadshotAI', headline: 'Professional headshots in 5 minutes', text: 'From 12 selfies. Your ears may vary.' },
  { advertiser: 'Sponsored', headline: 'I replaced my whole team with agents', text: 'Thread 🧵 1/47' },
  { advertiser: 'ChatCRM', headline: 'Your CRM now talks back', text: 'It has opinions about your pipeline.' },
  { advertiser: 'VibeCode', headline: 'Ship an app without reading code', text: 'Debugging sold separately.' },
  { advertiser: 'DeckGenie', headline: 'A pitch deck from one sentence', text: 'Investors can’t tell. Investors also use it.' },
  { advertiser: 'Sponsored', headline: 'The prompt that writes prompts', text: 'Prompt engineering is dead. Long live prompts.' },
  { advertiser: 'TutorBot', headline: 'Homework help, instantly', text: 'Teachers have an AI too.' },
  { advertiser: 'GPUStock', headline: 'Fractional GPU shares from $5', text: 'Own 0.0001 of the future.' },
  { advertiser: 'FriendAI', headline: 'A friend who’s always online', text: 'Premium friendship: $19.99 a month.' },
];

/** With retargeting cookies: ads for the very things your visitors looked at somewhere else this week. */
export const RETARGETED_ADS: readonly DisplayAdCopy[] = [
  { advertiser: 'Sneakr', headline: 'Still thinking about these shoes?', text: 'They’re still in your cart. And in every ad.' },
  { advertiser: 'StayFinder', headline: 'Your room in Lisbon is still available', text: 'Prices for your dates went up 4%.' },
  { advertiser: 'DeskCo', headline: 'Remember that standing desk?', text: 'You looked at it 6 times. Here it is again.' },
  { advertiser: 'BoxChef', headline: 'You left 3 meals in your box', text: 'Come back for 50% off. Just this once. Again.' },
  { advertiser: 'SleepWell', headline: 'You already bought a mattress', text: 'So here is another mattress.' },
  { advertiser: 'TaskPilot', headline: 'Still deciding on a to-do app?', text: 'You visited our pricing page at 2:14am.' },
  { advertiser: 'GuitarHub', headline: 'That guitar you looked at', text: 'Strings not included. Ads included.' },
  { advertiser: 'FlyCheap', headline: 'Flights to Lisbon, again', text: 'You booked last week. We know. Book again?' },
  { advertiser: 'LampLand', headline: 'The lamp from Tuesday is back in stock', text: 'You closed the tab. We didn’t.' },
  { advertiser: 'CoatCo', headline: 'Still cold?', text: 'You searched “warm coat” in July.' },
  { advertiser: 'BabyBox', headline: 'Congratulations!', text: 'You looked at one stroller for a friend.' },
  { advertiser: 'GymFit', headline: 'Your free trial is waiting', text: 'You signed up in January. It’s November.' },
  { advertiser: 'CarDeals', headline: 'The car you priced is $200 cheaper', text: 'In a town 400 miles away.' },
  { advertiser: 'PlantPal', headline: 'Your fiddle-leaf fig misses you', text: 'You never bought it. It misses you anyway.' },
  { advertiser: 'BookNook', headline: 'Readers who viewed this also viewed it', text: 'Here it is a seventh time.' },
  { advertiser: 'SofaStory', headline: 'The sofa is the same price as yesterday', text: 'We just wanted to remind you.' },
];

/** 2018: programmatic ads, sold in an auction while the page loads, that follow you around the web. */
export const PROGRAMMATIC_ADS: readonly DisplayAdCopy[] = [
  { advertiser: 'Sneakr', headline: 'New season sneakers are here', text: 'Free returns. Free everything, almost.' },
  { advertiser: 'BoxChef', headline: 'Dinner in a box for $9', text: 'Use code PODCAST for 60% off.' },
  { advertiser: 'Sponsored', headline: 'You won’t believe what these child stars look like now', text: 'Slide 1 of 47' },
  { advertiser: 'PipelineCRM', headline: 'The #1 CRM for teams like yours', text: 'Book a demo. Then another one.' },
  { advertiser: 'SleepWell', headline: 'The last mattress you’ll ever buy', text: '100-night trial. Free returns.' },
  { advertiser: 'Sponsored', headline: 'Doctors are stunned by this one fruit', text: 'Number 7 will surprise you' },
  { advertiser: 'TaskPilot', headline: 'Get more done in 2018', text: 'Join 10 million productive people.' },
  { advertiser: 'Sponsored', headline: 'This is the car of the year (and it’s not even close)', text: 'Read more' },
  { advertiser: 'Sponsored', headline: '23 photos taken at exactly the right moment', text: 'Number 14 is a cat.' },
  { advertiser: 'CodeCamp', headline: 'Become a developer in 12 weeks', text: 'Learn React, Angular and Vue. Pick one later.' },
  { advertiser: 'CryptoCoinz', headline: 'Is it too late to buy?', text: 'Asking for everyone in December.' },
  { advertiser: 'Sponsored', headline: 'Locals are furious about this one weird bill trick', text: 'Sponsored by your bank.' },
  { advertiser: 'StreamBox', headline: 'Cut the cord', text: 'Then subscribe to nine streaming services.' },
  { advertiser: 'FitBand', headline: 'Your steps, your sleep, your data', text: 'Mostly our data.' },
];

export const BLOG_POSTS: readonly BlogPostCopy[] = [
  { title: 'Why AJAX changes everything', date: 'Mar 14, 2005', excerpt: 'Pages that update without reloading. I may never press F5 again.' },
  { title: 'I finally ditched table layouts', date: 'Apr 2, 2005', excerpt: 'It took 400 lines of CSS hacks, but every box is a div now.' },
  { title: 'My site is in perpetual beta', date: 'Apr 19, 2005', excerpt: 'Version numbers are for people who finish things.' },
  { title: '10 gradient tutorials you need', date: 'May 7, 2005', excerpt: 'Number 6 adds a reflection under your logo. You will cry.' },
  { title: 'Tags vs folders: a manifesto', date: 'Jun 1, 2005', excerpt: 'Folders are hierarchical. Tags are free. Choose freedom.' },
];

export const COMMENTS: readonly MessageCopy[] = [
  { author: 'jen_k', text: 'Great post! Bookmarked it on my social bookmarks page.' },
  { author: 'dave', text: 'First!' },
  { author: 'css_wizard', text: 'Have you tried the clearfix hack? Life changing.' },
  { author: 'mo', text: 'Does this work in the old browser though?' },
  { author: 'tag_queen', text: 'tagged: awesome, ajax, must-read' },
  { author: 'lurker', text: 'Been reading for months. Finally commenting. Hi!' },
];

export const BLOGROLL: readonly string[] = [
  'jen’s linklog',
  'the daily permalink',
  'rounded corners weekly',
  'folksonomy fans',
  'css hacks & tips',
  'my friend’s podcast',
];

/** Contextual ads: the same slots, matched to what the page is about. */
export const CONTEXTUAL_TEXT_ADS: readonly TextAdCopy[] = [
  { title: 'Learn AJAX in 24 hours', url: 'www.ajaxbook.example', text: 'XMLHttpRequest for the rest of us.' },
  { title: 'Start your own blog', url: 'www.bloghost.example', text: 'Free templates, comments and RSS.' },
  { title: 'Web 2.0 logo generator', url: 'www.logo20.example', text: 'Reflection and beta badge included.' },
  { title: 'Tag your photos', url: 'www.taggr.example', text: 'Folksonomy for your holiday snaps.' },
  { title: 'PHP hosting with MySQL', url: 'www.lamphost.example', text: 'Your database, our servers.' },
  { title: 'Rounded corners in 5 images', url: 'www.cornerkit.example', text: 'Four GIFs and a table. CSS3 is years away.' },
  { title: 'Get your RSS on every portal', url: 'www.feedblast.example', text: 'Syndicate to 400 start pages.' },
  { title: 'Wiki software, free', url: 'www.wikiwiki.example', text: 'Anyone can edit. Everyone will.' },
  { title: 'Make money blogging', url: 'www.blogcash.example', text: 'Put text ads on your blog. Like this one.' },
  { title: 'Mashup your maps', url: 'www.mappr.example', text: 'Pins on a map, from your own data.' },
];

/** What readers tag your posts with once they can: nobody can spell the word. */
export const READER_TAGS: readonly string[] = ['folksonmy', 'ajaxx', 'web2.0', 'teh blog', 'awsome', 'beta!!!'];

export const TAGS: readonly string[] = [
  'ajax', 'web 2.0', 'beta', 'mashup', 'rss', 'folksonomy', 'social', 'wiki', 'podcast',
  'blog', 'tags', 'long tail', 'permalink', 'css', 'gradients', 'xhtml',
];
