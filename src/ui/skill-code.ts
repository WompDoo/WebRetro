import { UPGRADE_IDS } from '../engine';
import type { GameState, UpgradeId } from '../engine';
import { ERA_PRESENTATION } from './presentation';

/**
 * The code you type in 1997 is the code you know. It starts as Hello World,
 * and every skill you learn adds its tags to what scrolls through the editor.
 */
const HOMEPAGE_OPENING: readonly string[] = ['<HTML>', '<HEAD>', '<TITLE>My Homepage</TITLE>', '</HEAD>', '<BODY>', '<H1>Hello World!</H1>', '<!-- my first web page -->'];
const HOMEPAGE_CLOSING: readonly string[] = ['</BODY>', '</HTML>', ''];

const SKILL_CODE: Readonly<Partial<Record<UpgradeId, readonly string[]>>> = {
  'img-tag': ['<IMG SRC="http://counter.example/count.cgi?id=you" ALT="hit counter">', '<IMG SRC="construction.gif" WIDTH="88" HEIGHT="31" ALT="under construction">'],
  'font-tags': ['<CENTER>', '<FONT FACE="Comic Sans MS" SIZE="6" COLOR="#FF00FF">Welcome to My Homepage!!!</FONT>', '<P><FONT COLOR="#FF0000">Hi!! I like computers, my cat, and pizza.</FONT></P>', '</CENTER>'],
  'body-background': ['<BODY BGCOLOR="#000020" TEXT="#F0F0F0" LINK="#FFFF00" VLINK="#FF00FF" BACKGROUND="stars.gif">'],
  hyperlinks: ['<A HREF="links.htm">Cool links</A> | <A HREF="mailto:webmaster@example.com">Email me!</A>', '<A HREF="http://www.webring.example/next?site=42">Next site &gt;&gt;</A>'],
  'marquee-blink': ['<MARQUEE BEHAVIOR="alternate">*** Best viewed in 800x600 ***</MARQUEE>', '<BLINK>NEW!</BLINK> Please sign my guestbook!!'],
  'cgi-forms': ['<FORM ACTION="/cgi-bin/guestbook.pl" METHOD="POST">', '<INPUT TYPE="text" NAME="message" SIZE="40">', '<INPUT TYPE="submit" VALUE="Sign it!">', '</FORM>', '#!/usr/bin/perl', 'print "Content-type: text/html\\n\\n";', 'open(GUESTBOOK, ">>guestbook.txt");', 'print GUESTBOOK "$name says: $message<BR>\\n";', 'close(GUESTBOOK);'],
  'table-layouts': ['<TABLE BORDER="1" CELLPADDING="4" CELLSPACING="0" WIDTH="600">', '<TR><TD WIDTH="150" BGCOLOR="#000080" VALIGN="top">', '<A HREF="index.htm">Home</A><BR><A HREF="about.htm">About me</A>', '</TD><TD VALIGN="top">', '<!-- TODO: make it look right in the other browser too -->', '</TD></TR>', '</TABLE>'],
  'embed-tag': ['<EMBED SRC="song.mid" AUTOSTART="true" LOOP="true" HIDDEN="true">', '<NOEMBED><BGSOUND SRC="song.mid" LOOP="infinite"></NOEMBED>'],
  'learn-javascript': ['<SCRIPT LANGUAGE="JavaScript">', '<!-- hide from old browsers', 'function welcomeVisitor() {', '  alert("Welcome!!! Please sign my guestbook!!!");', '}', 'window.status = "Welcome to my homepage!!! *** Welcome!!! ***";', '// -->', '</SCRIPT>'],
};

function buildHomepageSource(state: GameState): string {
  const learned = UPGRADE_IDS.filter((upgradeId) => state.purchasedUpgradeIds.includes(upgradeId));
  const body = learned.flatMap((upgradeId) => SKILL_CODE[upgradeId] ?? []);
  return [...HOMEPAGE_OPENING, ...body, ...HOMEPAGE_CLOSING].join('\n');
}

export function buildEditorSource(state: GameState): string {
  return state.eraId === 'homepage-1997' ? buildHomepageSource(state) : ERA_PRESENTATION[state.eraId].codeSnippet;
}
