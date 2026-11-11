import { UPGRADE_IDS } from '../engine';
import type { EraId, GameState, UpgradeId } from '../engine';

/**
 * The code you type is the code you know. In 1997 it starts as Hello World; in 2005 it starts
 * as the same old table layout. Every skill you learn adds its code to what scrolls by.
 * From 2005 the editor has files: each skill puts its code where it belongs (CSS in style.css,
 * JavaScript in ajax.js), and the tabs switch between them.
 */
interface EraCode {
  readonly mainFile: string;
  readonly opening: readonly string[];
  /** Typed until you learn the skill that replaces it. */
  readonly legacy: readonly string[];
  readonly legacyReplacedBy: UpgradeId | null;
  /** What each skill adds to the main file. */
  readonly skills: Readonly<Partial<Record<UpgradeId, readonly string[]>>>;
  /** What each skill puts in files of their own. */
  readonly files: Readonly<Partial<Record<UpgradeId, Readonly<Record<string, readonly string[]>>>>>;
  /** What a file shows before any skill has written to it. */
  readonly emptyFile: (fileName: string) => string;
  readonly closing: readonly string[];
}

const HOMEPAGE_CODE: EraCode = {
  mainFile: 'INDEX.HTM',
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
  files: {},
  emptyFile: () => '',
  closing: ['</BODY>', '</HTML>', ''],
};

const WEB2_EMPTY_FILES: Readonly<Record<string, string>> = {
  'ajax.js': '// ajax.js: nothing here yet.\n// Learn AJAX, jQuery or web APIs and your JavaScript goes in this file.\n',
  'style.css': '/* style.css: still empty. */\n/* Learn CSS and your styles move out of the <table> tags into this file. */\n',
};

const WEB2_CODE: EraCode = {
  mainFile: 'blog.php',
  opening: ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">', '<html xmlns="http://www.w3.org/1999/xhtml">', '<head>', '<title>myhomepage 2.0</title>'],
  legacy: ['</head>', '<body bgcolor="#000020">', '<table width="100%" border="0" cellpadding="4">', '<tr><td width="150" valign="top"><!-- nav --></td>', '<td valign="top"><!-- TODO: redo this with divs, everyone says tables are bad now --></td></tr>', '</table>'],
  legacyReplacedBy: 'learn-css',
  skills: {
    'learn-css': ['<link rel="stylesheet" type="text/css" href="style.css" />', '</head>', '<body>', '<div id="header"><h1>myhomepage</h1></div>', '<div id="content" class="clearfix"></div>', '<div id="sidebar"></div>'],
    'learn-php': ['<?php', 'include("config.php");', 'mysql_connect($db_host, $db_user, $db_pass);', '$posts = mysql_query("SELECT * FROM posts ORDER BY created DESC LIMIT 10");', 'while ($post = mysql_fetch_array($posts)) {', '  echo "<div class=\\"post\\"><h2>" . $post["title"] . "</h2>";', '}', '// TODO: escape this before launch', '$comments = mysql_query("SELECT * FROM comments WHERE post_id = " . $_GET["id"]);', '?>'],
    'learn-ajax': ['<script type="text/javascript" src="ajax.js"></script>'],
    'learn-flash': ['<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="550" height="400">', '  <param name="movie" value="intro.swf" />', '  <embed src="intro.swf" quality="high" width="550" height="400"></embed>', '</object>', '<!-- intro.fla, frame 1: stop(); logo_mc.onEnterFrame = function() { this._rotation += 5; }; -->'],
    'learn-jquery': ['<script type="text/javascript" src="jquery-1.2.6.min.js"></script>'],
    'prepared-statements': ['<?php', '$stmt = $pdo->prepare("SELECT * FROM comments WHERE post_id = ?");', '$stmt->execute(array($_GET["id"]));', '// no more DROP TABLE surprises', '?>'],
    'learn-rss': ['<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />', '<?php foreach ($tags as $tag) { echo "<a href=\\"/tag/$tag\\">$tag</a> "; } ?>'],
  },
  files: {
    'learn-css': {
      'style.css': ['#header { background: #336699; color: #fff; }', '#content { float: left; width: 70%; }', '#sidebar { float: right; width: 25%; }', '.clearfix:after { content: "."; display: block; height: 0; clear: both; visibility: hidden; }', '* html .clearfix { height: 1%; } /* old browser fix, do not touch */'],
    },
    'web2-design': {
      'style.css': ['#header { background: url(gloss.png) repeat-x; height: 120px; }', '.box { -moz-border-radius: 10px; -webkit-border-radius: 10px; }', '.logo { -webkit-box-reflect: below 0 -webkit-gradient(linear, left top, left bottom, from(transparent), to(white)); }', '.beta { float: right; background: url(starburst.png); }'],
    },
    'learn-ajax': {
      'ajax.js': ['var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");', 'xhr.onreadystatechange = function() {', '  if (xhr.readyState == 4 && xhr.status == 200) {', '    document.getElementById("comments").innerHTML = xhr.responseText;', '  }', '};', 'xhr.open("GET", "comments.php?post=" + postId, true);', 'xhr.send(null);'],
    },
    'learn-jquery': {
      'ajax.js': ['$(document).ready(function() {', '  $("a.thumb").lightbox();', '  $(".post").hide().fadeIn("slow");', '});'],
    },
    'learn-web-apis': {
      'ajax.js': ['var map = new MapWidget(document.getElementById("map"));', 'loadJSON("http://api.example.com/places?format=json", function(places) {', '  for (var i = 0; i < places.length; i++) { map.addPin(places[i].lat, places[i].lng); }', '});'],
    },
    'learn-url-rewriting': {
      '.htaccess': ['# .htaccess', 'RewriteEngine On', 'RewriteRule ^blog/([0-9]+)/([0-9]+)/([a-z0-9-]+)/?$ index.php?year=$1&month=$2&slug=$3 [L]'],
    },
    j2ee: {
      'web.xml': ['<?xml version="1.0" encoding="UTF-8"?>', '<web-app xmlns="http://java.sun.com/xml/ns/j2ee" version="2.4">', '  <servlet><servlet-name>HelloWorld</servlet-name><servlet-class>com.example.HelloWorldServlet</servlet-class></servlet>', '  <servlet-mapping><servlet-name>HelloWorld</servlet-name><url-pattern>/hello</url-pattern></servlet-mapping>', '</web-app>', '<!-- 13 more files like this one to go -->'],
    },
    rails: {
      'config/routes.rb': ['# config/routes.rb', 'ActionController::Routing::Routes.draw do |map|', '  map.resources :posts, :has_many => :comments', 'end', '# app/controllers/posts_controller.rb', 'class PostsController < ApplicationController', '  def index; @posts = Post.find(:all, :order => "created_at DESC"); end', 'end'],
    },
  },
  emptyFile: (fileName) => WEB2_EMPTY_FILES[fileName] ?? `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${fileName}: required, apparently. Nobody remembers why. -->\n`,
  closing: ['</body>', '</html>', ''],
};

const SOCIAL_EMPTY_FILES: Readonly<Record<string, string>> = {
  'app.js': '// app.js: empty.\n// Paste in some social plugins or HTML5 media code and it fills up.\n',
  'style.css': '/* style.css: just the 2005 styles. Learn responsive design for some media queries. */\n',
};

const SOCIAL_CODE: EraCode = {
  mainFile: 'index.html',
  opening: ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8">', '<title>myhomepage</title>'],
  legacy: ['<link rel="stylesheet" href="style.css">', '</head>', '<body>', '<div id="header"><h1>myhomepage</h1></div>', '<div id="content" class="clearfix"><!-- still the 2005 layout. TODO: Bootstrap? --></div>'],
  legacyReplacedBy: 'learn-bootstrap',
  skills: {
    'responsive-design': ['<meta name="viewport" content="width=device-width, initial-scale=1.0">'],
    'learn-bootstrap': ['<link href="css/bootstrap.min.css" rel="stylesheet">', '</head>', '<body>', '<div class="navbar navbar-fixed-top"><div class="navbar-inner"><div class="container">', '  <a class="brand" href="#">myhomepage</a>', '</div></div></div>', '<div class="container">', '  <div class="hero-unit">', '    <h1>Hello, world!</h1>', '    <p><a class="btn btn-primary btn-large">Learn more &raquo;</a></p>', '  </div>', '  <div class="row"><div class="span4"><h2>Heading</h2></div><div class="span4"><h2>Heading</h2></div><div class="span4"><h2>Heading</h2></div></div>', '</div>'],
    'html5-media': ['<video src="intro.mp4" poster="intro.jpg" controls preload="none"></video>', '<audio src="episode-42.mp3" controls></audio>', '<!-- no plugin. it even plays on phones. -->'],
    'social-plugins': ['<div class="fs-like" data-href="http://www.myhomepage.com" data-layout="button_count"></div>', '<a href="https://chirper.example/share" class="chirp-button">Chirp</a>', '<script src="app.js"></script>'],
  },
  files: {
    'responsive-design': {
      'style.css': ['@media (max-width: 767px) {', '  .span4 { float: none; width: auto; }', '  .navbar .nav { display: none; } /* hamburger menu instead */', '}', 'img { max-width: 100%; }'],
    },
    'html5-media': {
      'app.js': ['var video = document.querySelector("video");', 'if (!video.canPlayType("video/mp4")) { video.src = "intro.webm"; } // every browser wants a different file'],
    },
    'social-plugins': {
      'app.js': ['(function(d) {', '  var js = d.createElement("script");', '  js.src = "//connect.facespace.example/en_US/all.js#xfbml=1";', '  d.getElementsByTagName("head")[0].appendChild(js);', '}(document));', '// copied from the top answer (247 votes)'],
    },
    'learn-masonry': {
      'app.js': ['$(".gallery").masonry({', '  itemSelector: ".photo",', '  columnWidth: 160', '}); // Pinterest did it, so we do it'],
    },
    'parallax-scrolling': {
      'app.js': ['$(window).scroll(function () {', '  var y = $(window).scrollTop();', '  $(".hero-far").css("top", y * 0.5); // every scroll event, on the main thread', '});'],
    },
    'retina-images': {
      'style.css': ['@media (-webkit-min-device-pixel-ratio: 2) {', '  .hero { background-image: url(hero@2x.jpg); background-size: 1200px 600px; }', '}'],
    },
    'learn-bcrypt': {
      'server.js': ['var bcrypt = require("bcrypt");', 'bcrypt.hash(password, 10, function (err, hash) {', '  db.users.update({ name: name }, { $set: { password: hash } }); // no more plain text', '});'],
    },
    'learn-nodejs': {
      'server.js': ['var app = require("express")();', 'var server = require("http").createServer(app);', 'var io = require("socket.io").listen(server);', 'io.sockets.on("connection", function (socket) {', '  socket.on("like", function (data) {', '    io.sockets.emit("activity", data); // callback inside a callback inside a callback', '  });', '});', 'server.listen(3000);'],
    },
  },
  emptyFile: (fileName) => SOCIAL_EMPTY_FILES[fileName] ?? `// ${fileName}\n`,
  closing: ['</body>', '</html>', ''],
};

const ERA_CODE: Readonly<Record<EraId, EraCode>> = {
  'homepage-1997': HOMEPAGE_CODE,
  'web2-2005': WEB2_CODE,
  'social-2011': SOCIAL_CODE,
};

function knowsSkill(state: GameState, skillId: UpgradeId | null): boolean {
  return skillId !== null && state.purchasedUpgradeIds.includes(skillId);
}

function learnedSkills(state: GameState): readonly UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => knowsSkill(state, upgradeId));
}

export function mainEditorFile(eraId: EraId): string {
  return ERA_CODE[eraId].mainFile;
}

function buildMainFile(state: GameState, code: EraCode): string {
  const legacy = knowsSkill(state, code.legacyReplacedBy) ? [] : code.legacy;
  const learned = learnedSkills(state).flatMap((upgradeId) => code.skills[upgradeId] ?? []);
  return [...code.opening, ...legacy, ...learned, ...code.closing].join('\n');
}

function buildOtherFile(state: GameState, code: EraCode, fileName: string): string {
  const lines = learnedSkills(state).flatMap((upgradeId) => code.files[upgradeId]?.[fileName] ?? []);
  return lines.length === 0 ? code.emptyFile(fileName) : [...lines, ''].join('\n');
}

/** The code typed into one file: the main file holds the page, the others what your skills put there. */
export function buildEditorSource(state: GameState, fileName: string): string {
  const code = ERA_CODE[state.eraId];
  return fileName === code.mainFile ? buildMainFile(state, code) : buildOtherFile(state, code, fileName);
}
