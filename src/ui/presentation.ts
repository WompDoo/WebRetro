import type { EraId } from '../engine';
import { HOMEPAGE_POPUPS, WEB2_POPUPS } from './popup-copy';
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

export interface EraPresentation {
  readonly year: number;
  readonly browserTitle: string;
  readonly siteUrl: string;
  readonly editorTitle: string;
  readonly editorMenu: readonly string[];
  readonly editorTabs: readonly string[];
  readonly editorHighlightsSyntax: boolean;
  readonly popups: readonly PopupCopy[];
  readonly guestbook: readonly MessageCopy[];
  readonly musicTracks: readonly string[];
  readonly entryStory: EraStory | null;
  readonly antivirusTitle: string;
}

export const ERA_PRESENTATION: Readonly<Record<EraId, EraPresentation>> = {
  'homepage-1997': {
    year: 1997,
    browserTitle: 'My Homepage - Web Navigator',
    siteUrl: 'http://members.freewebspace.net/~you/index.htm',
    editorTitle: 'INDEX.HTM - Text Editor',
    editorMenu: ['File', 'Edit', 'Search', 'Help'],
    editorTabs: [],
    editorHighlightsSyntax: false,
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
    browserTitle: 'myhomepage | blog',
    siteUrl: 'http://www.myhomepage.com/blog/',
    editorTitle: 'blog.php — CodeStudio',
    editorMenu: [],
    editorTabs: ['blog.php', 'ajax.js', 'style.css'],
    editorHighlightsSyntax: true,
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
};

export const BANNER_ADS: readonly string[] = [
  'You are the 1,000,000th visitor! CLICK HERE',
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

export const TAGS: readonly string[] = [
  'ajax', 'web 2.0', 'beta', 'mashup', 'rss', 'folksonomy', 'social', 'wiki', 'podcast',
  'blog', 'tags', 'long tail', 'permalink', 'css', 'gradients', 'xhtml',
];
