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
  readonly badge: string;
  readonly browserTitle: string;
  readonly siteUrl: string;
  readonly browserStatus: string;
  readonly editorTitle: string;
  readonly editorMenu: readonly string[];
  readonly editorTabs: readonly string[];
  readonly editorHighlightsSyntax: boolean;
  readonly codeSnippet: string;
  readonly popups: readonly PopupCopy[];
  readonly guestbook: readonly MessageCopy[];
  readonly musicTracks: readonly string[];
  readonly entryStory: EraStory | null;
  readonly antivirusTitle: string;
}

const HOMEPAGE_CODE = [
  '<HTML>',
  '<HEAD>',
  '<TITLE>~*~ Welcome to My Homepage!!! ~*~</TITLE>',
  '<META NAME="keywords" CONTENT="cool, homepage, free, games, cool, cool, cool">',
  '</HEAD>',
  '<BODY BGCOLOR="#000020" TEXT="#00FF00" LINK="#FFFF00" VLINK="#FF00FF" BACKGROUND="stars.gif">',
  '<CENTER>',
  '<FONT FACE="Comic Sans MS" SIZE="6" COLOR="#FF00FF">Welcome to my homepage!!!</FONT>',
  '<BR><IMG SRC="construction.gif" WIDTH="88" HEIGHT="31" ALT="under construction">',
  '<MARQUEE BEHAVIOR="alternate">*** Best viewed in 800x600 ***</MARQUEE>',
  '<TABLE BORDER="1" CELLPADDING="4" CELLSPACING="0" WIDTH="600">',
  '<TR><TD BGCOLOR="#000080"><FONT COLOR="#FFFF00"><B>About me</B></FONT></TD></TR>',
  '<TR><TD>Hi!! I like computers, my cat, and pizza. This is my page.</TD></TR>',
  '</TABLE>',
  '<BLINK>NEW!</BLINK> Please sign my <A HREF="guestbook.cgi">guestbook</A>!!',
  '<EMBED SRC="song.mid" AUTOSTART="true" LOOP="true" HIDDEN="true">',
  '<!-- TODO: make it look right in the other browser too -->',
  '<IMG SRC="/cgi-bin/counter.cgi?page=index" ALT="hit counter">',
  '<SCRIPT LANGUAGE="JavaScript">',
  '<!-- hide from old browsers',
  'function welcomeVisitor() {',
  '  alert("Welcome!!! Please sign my guestbook!!!");',
  '}',
  'window.status = "Welcome to my homepage!!! *** Welcome!!! ***";',
  '// -->',
  '</SCRIPT>',
  '#!/usr/bin/perl',
  'print "Content-type: text/html\\n\\n";',
  'open(GUESTBOOK, ">>guestbook.txt");',
  'print GUESTBOOK "$name says: $message<BR>\\n";',
  'close(GUESTBOOK);',
  '<A HREF="http://www.webring.example/next?site=42">Next site &gt;&gt;</A>',
  '<FONT SIZE="1">Last updated: 10/31/97. (c) 1997 Webmaster.</FONT>',
  '</CENTER>',
  '</BODY>',
  '</HTML>',
  '',
].join('\n');

const WEB2_CODE = [
  '<?php',
  'include("config.php");',
  'mysql_connect($db_host, $db_user, $db_pass);',
  'mysql_select_db("myhomepage");',
  '$posts = mysql_query("SELECT * FROM posts ORDER BY created DESC LIMIT 10");',
  'while ($post = mysql_fetch_array($posts)) {',
  '  echo "<div class=\\"post\\"><h2>" . $post["title"] . "</h2>";',
  '  echo nl2br($post["body"]) . "</div>";',
  '}',
  '// TODO: escape this before launch',
  '$comments = mysql_query("SELECT * FROM comments WHERE post_id = " . $_GET["id"]);',
  '?>',
  '<script type="text/javascript">',
  'var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");',
  'xhr.onreadystatechange = function() {',
  '  if (xhr.readyState == 4 && xhr.status == 200) {',
  '    document.getElementById("comments").innerHTML = xhr.responseText;',
  '  }',
  '};',
  'xhr.open("GET", "comments.php?post=" + postId, true);',
  'xhr.send(null);',
  '</script>',
  '<style type="text/css">',
  '#header { background: url(gloss.png) repeat-x; height: 120px; }',
  '.box { -moz-border-radius: 10px; -webkit-border-radius: 10px; }',
  '.beta { float: right; } /* clearfix hack below, do not touch */',
  '.clearfix:after { content: "."; display: block; height: 0; clear: both; visibility: hidden; }',
  '* html .clearfix { height: 1%; } /* old browser fix */',
  '</style>',
  '<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />',
  '',
].join('\n');

export const ERA_PRESENTATION: Readonly<Record<EraId, EraPresentation>> = {
  'homepage-1997': {
    year: 1997,
    badge: '1997 · Personal homepage',
    browserTitle: 'My Homepage - Web Navigator',
    siteUrl: 'http://members.freewebspace.net/~you/index.htm',
    browserStatus: 'Document: Done',
    editorTitle: 'INDEX.HTM - Text Editor',
    editorMenu: ['File', 'Edit', 'Search', 'Help'],
    editorTabs: [],
    editorHighlightsSyntax: false,
    codeSnippet: HOMEPAGE_CODE,
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
    badge: '2005 · Web 2.0',
    browserTitle: 'myhomepage | blog',
    siteUrl: 'http://www.myhomepage.com/blog/',
    browserStatus: 'Done',
    editorTitle: 'blog.php — CodeStudio',
    editorMenu: [],
    editorTabs: ['blog.php', 'ajax.js', 'style.css'],
    editorHighlightsSyntax: true,
    codeSnippet: WEB2_CODE,
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
        'Your homepage needs a relaunch: rounded corners, glossy gradients and a beta sticker.',
      ],
      whatsNew: [
        'Blogs, comments and tag clouds.',
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
