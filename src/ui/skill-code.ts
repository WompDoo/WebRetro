import { UPGRADE_IDS } from '../engine';
import type { EraId, GameState, UpgradeId } from '../engine';

/**
 * The code you type is the code you know. In 1997 it starts as Hello World; in 2005 it starts
 * as the same old table layout. Every skill you learn adds its code to what scrolls by.
 */
interface EraCode {
  readonly opening: readonly string[];
  /** Typed until you learn the skill that replaces it. */
  readonly legacy: readonly string[];
  readonly legacyReplacedBy: UpgradeId | null;
  readonly skills: Readonly<Partial<Record<UpgradeId, readonly string[]>>>;
  readonly closing: readonly string[];
}

const HOMEPAGE_CODE: EraCode = {
  opening: ['<HTML>', '<HEAD>', '<TITLE>My Homepage</TITLE>', '</HEAD>', '<BODY>', '<H1>Hello World!</H1>', '<!-- my first web page -->'],
  legacy: [],
  legacyReplacedBy: null,
  skills: {
    'img-tag': ['<IMG SRC="http://counter.example/count.cgi?id=you" ALT="hit counter">', '<IMG SRC="construction.gif" WIDTH="88" HEIGHT="31" ALT="under construction">'],
    'font-tags': ['<CENTER>', '<FONT FACE="Comic Sans MS" SIZE="6" COLOR="#FF00FF">Welcome to My Homepage!!!</FONT>', '<P><FONT COLOR="#FF0000">Hi!! I like computers, my cat, and pizza.</FONT></P>', '</CENTER>'],
    'body-background': ['<BODY BGCOLOR="#000020" TEXT="#F0F0F0" LINK="#FFFF00" VLINK="#FF00FF" BACKGROUND="stars.gif">'],
    hyperlinks: ['<A HREF="links.htm">Cool links</A> | <A HREF="mailto:webmaster@example.com">Email me!</A>', '<A HREF="http://www.webring.example/next?site=42">Next site &gt;&gt;</A>'],
    'marquee-blink': ['<MARQUEE BEHAVIOR="alternate">*** Best viewed in 800x600 ***</MARQUEE>', '<BLINK>NEW!</BLINK> Please sign my guestbook!!'],
    'cgi-forms': ['<FORM ACTION="/cgi-bin/guestbook.pl" METHOD="POST">', '<INPUT TYPE="text" NAME="message" SIZE="40">', '<INPUT TYPE="submit" VALUE="Sign it!">', '</FORM>', '#!/usr/bin/perl', 'print "Content-type: text/html\\n\\n";', 'open(GUESTBOOK, ">>guestbook.txt");', 'print GUESTBOOK "$name says: $message<BR>\\n";', 'close(GUESTBOOK);'],
    'table-layouts': ['<TABLE BORDER="1" CELLPADDING="4" CELLSPACING="0" WIDTH="600">', '<TR><TD WIDTH="150" BGCOLOR="#000080" VALIGN="top">', '<A HREF="index.htm">Home</A><BR><A HREF="about.htm">About me</A>', '</TD><TD VALIGN="top">', '<!-- TODO: make it look right in the other browser too -->', '</TD></TR>', '</TABLE>'],
    'embed-tag': ['<EMBED SRC="song.mid" AUTOSTART="true" LOOP="true" HIDDEN="true">', '<NOEMBED><BGSOUND SRC="song.mid" LOOP="infinite"></NOEMBED>'],
    'learn-javascript': ['<SCRIPT LANGUAGE="JavaScript">', '<!-- hide from old browsers', 'function welcomeVisitor() {', '  alert("Welcome!!! Please sign my guestbook!!!");', '}', 'window.status = "Welcome to my homepage!!! *** Welcome!!! ***";', '// -->', '</SCRIPT>'],
  },
  closing: ['</BODY>', '</HTML>', ''],
};

const WEB2_CODE: EraCode = {
  opening: ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">', '<html xmlns="http://www.w3.org/1999/xhtml">', '<head>', '<title>myhomepage 2.0</title>'],
  legacy: ['</head>', '<body bgcolor="#000020">', '<table width="100%" border="0" cellpadding="4">', '<tr><td width="150" valign="top"><!-- nav --></td>', '<td valign="top"><!-- TODO: redo this with divs, everyone says tables are bad now --></td></tr>', '</table>'],
  legacyReplacedBy: 'learn-css',
  skills: {
    'learn-css': ['<style type="text/css">', '#header { background: #336699; color: #fff; }', '#content { float: left; width: 70%; }', '#sidebar { float: right; width: 25%; }', '.clearfix:after { content: "."; display: block; height: 0; clear: both; visibility: hidden; }', '* html .clearfix { height: 1%; } /* old browser fix, do not touch */', '</style>', '</head>', '<body>', '<div id="header"><h1>myhomepage</h1></div>', '<div id="content" class="clearfix"></div>', '<div id="sidebar"></div>'],
    'learn-php': ['<?php', 'include("config.php");', 'mysql_connect($db_host, $db_user, $db_pass);', '$posts = mysql_query("SELECT * FROM posts ORDER BY created DESC LIMIT 10");', 'while ($post = mysql_fetch_array($posts)) {', '  echo "<div class=\\"post\\"><h2>" . $post["title"] . "</h2>";', '}', '// TODO: escape this before launch', '$comments = mysql_query("SELECT * FROM comments WHERE post_id = " . $_GET["id"]);', '?>'],
    'web2-design': ['<style type="text/css">', '#header { background: url(gloss.png) repeat-x; height: 120px; }', '.box { -moz-border-radius: 10px; -webkit-border-radius: 10px; }', '.logo { -webkit-box-reflect: below 0 -webkit-gradient(linear, left top, left bottom, from(transparent), to(white)); }', '.beta { float: right; background: url(starburst.png); }', '</style>'],
    'learn-ajax': ['<script type="text/javascript">', 'var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");', 'xhr.onreadystatechange = function() {', '  if (xhr.readyState == 4 && xhr.status == 200) {', '    document.getElementById("comments").innerHTML = xhr.responseText;', '  }', '};', 'xhr.open("GET", "comments.php?post=" + postId, true);', 'xhr.send(null);', '</script>'],
    'learn-rss': ['<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />', '<?php foreach ($tags as $tag) { echo "<a href=\\"/tag/$tag\\">$tag</a> "; } ?>'],
  },
  closing: ['</body>', '</html>', ''],
};

const ERA_CODE: Readonly<Record<EraId, EraCode>> = {
  'homepage-1997': HOMEPAGE_CODE,
  'web2-2005': WEB2_CODE,
};

export function buildEditorSource(state: GameState): string {
  const code = ERA_CODE[state.eraId];
  const knows = (skillId: UpgradeId | null): boolean => skillId !== null && state.purchasedUpgradeIds.includes(skillId);
  const legacy = knows(code.legacyReplacedBy) ? [] : code.legacy;
  const learned = UPGRADE_IDS.filter((upgradeId) => knows(upgradeId)).flatMap((upgradeId) => code.skills[upgradeId] ?? []);
  return [...code.opening, ...legacy, ...learned, ...code.closing].join('\n');
}
