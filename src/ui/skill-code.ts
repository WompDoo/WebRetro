import { findChosenFramework, UPGRADE_IDS } from '../engine';
import type { EraId, FrameworkId, GameState, UpgradeId } from '../engine';

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
    'learn-rest-apis': {
      'server.js': ['app.get("/api/posts.json", function (req, res) {', '  db.posts.find().limit(20).toArray(function (err, posts) {', '    res.json(posts); // the app, the widgets and other people\'s mashups all read this', '  });', '});'],
    },
    'learn-sass': {
      'style.scss': ['// compiled to style.css by `grunt watch` on every save', '$brand: #0088cc;', '.navbar {', '  .brand { color: $brand; }', '  a:hover { color: darken($brand, 10%); }', '}'],
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

/** What every 2018 framework's npm, server and stylesheet get from the skills that aren't about the framework. */
const PLATFORM_SHARED_FILES: Readonly<Partial<Record<UpgradeId, Readonly<Record<string, readonly string[]>>>>> = {
  'mobile-first': {
    'styles.scss': ['// mobile first: the phone layout is the default, desktops get the extras', '.stories { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; }', '@media (min-width: 768px) {', '  .pricing { grid-template-columns: repeat(3, 1fr); }', '}'],
  },
  'learn-payments': {
    terminal: ['$ npm install checkout-js', '+ checkout-js@3.2.0', 'added 1 package and audited 31872 packages in 6.1s'],
    'api/checkout.js': ['export default async function checkout(req, res) {', '  const session = await payments.sessions.create({ plan: req.body.plan, trialDays: 14 });', '  res.json({ url: session.url }); // a free trial that asks for a card', '}'],
  },
  'learn-oauth': {
    terminal: ['$ npm install passport passport-oauth2 jsonwebtoken', '+ passport@0.4.0', '+ jsonwebtoken@8.3.0', 'added 14 packages and audited 31886 packages in 7.4s'],
    'server.js': ['app.get("/auth/callback", async (req, res) => {', '  const { access_token, refresh_token } = await oauth.exchange(req.query.code);', '  res.cookie("session", jwt.sign({ sub: user.id }, SECRET, { expiresIn: "1h" }), { httpOnly: true });', '});'],
  },
  'learn-websockets': {
    terminal: ['$ npm install socket.io', '+ socket.io@2.1.1', 'added 47 packages and audited 31933 packages in 8.9s'],
    'server.js': ['const io = require("socket.io")(server);', 'io.on("connection", (socket) => {', '  socket.emit("chat", "Hi! 👋 Any questions?"); // a bot, until someone answers', '});'],
  },
};

const NPM_AUDIT_LINES: readonly string[] = ['found 1203 vulnerabilities (409 low, 711 moderate, 83 high)', '  run `npm audit fix` to fix them, or `npm audit` for details'];

const PLATFORM_EMPTY_FILES: Readonly<Record<string, string>> = {
  terminal: '$ npm install\naudited 31871 packages in 41.2s\n',
  'styles.scss': '// styles.scss: the 2011 styles, still. Design mobile first to start over from the phone.\n',
};

/** 2018 before a framework: the 2011 page, with npm doing the typing. */
const PLATFORM_CODE: EraCode = {
  mainFile: 'index.html',
  opening: ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">', '<title>myhomepage</title>'],
  legacy: ['<link href="css/bootstrap.min.css" rel="stylesheet">', '<script src="js/jquery-1.7.2.min.js"></script>', '</head>', '<body>', '<div class="container">', '  <div class="hero-unit"><h1>Hello, world!</h1></div>', '  <!-- 4,000 lines of jQuery below. TODO: pick a framework -->', '</div>'],
  legacyReplacedBy: null,
  skills: {},
  files: PLATFORM_SHARED_FILES,
  emptyFile: (fileName) => PLATFORM_EMPTY_FILES[fileName] ?? `// ${fileName}\n`,
  closing: ['</body>', '</html>', ''],
};

const REACT_CODE: EraCode = {
  mainFile: 'App.jsx',
  opening: ["import React, { Component } from 'react';", "import { connect } from 'react-redux';", "import { Hero, Stories, PricingTable, ChatBubble } from './components';", "import './App.css';", '', 'class App extends Component {', '  render() {', '    return (', '      <div className="App">', '        <Hero title="The all-in-one platform for everything" />', '        {this.props.posts.map(post => <Post key={post.id} {...post} />)}'],
  legacy: [],
  legacyReplacedBy: null,
  skills: {
    'mobile-first': ['        <Stories items={this.props.stories} />'],
    'learn-payments': ['        <PricingTable plans={["Free", "Pro", "Enterprise"]} highlighted="Pro" />'],
    'learn-websockets': ['        <ChatBubble greeting="Hi! 👋 Any questions?" />'],
  },
  files: {
    ...PLATFORM_SHARED_FILES,
    'learn-react': {
      terminal: ['$ npx create-react-app myhomepage', '$ npm install redux react-redux react-router-dom redux-thunk', '+ react@16.4.1', '+ react-redux@5.0.7', 'added 1203 packages from 754 contributors in 48.2s', ...NPM_AUDIT_LINES],
    },
    'nextjs-ssr': {
      'pages/index.js': ['export default class Index extends React.Component {', '  static async getInitialProps() {', '    return { posts: await fetchPosts() }; // runs on the server: no window, no document', '  }', '  render() { return <App posts={this.props.posts} />; }', '}'],
      terminal: ['$ npm install next', '+ next@7.0.0', 'added 382 packages in 31.0s'],
    },
  },
  emptyFile: (fileName) => PLATFORM_EMPTY_FILES[fileName] ?? `// ${fileName}\n`,
  closing: ['      </div>', '    );', '  }', '}', '', 'const mapStateToProps = state => ({ posts: state.posts, stories: state.stories });', 'export default connect(mapStateToProps)(App);', ''],
};

const ANGULAR_CODE: EraCode = {
  mainFile: 'app.component.ts',
  opening: ["import { Component, OnInit } from '@angular/core';", "import { Observable } from 'rxjs';", "import { PostService } from './post.service';", '', '@Component({', "  selector: 'app-root',", "  templateUrl: './app.component.html',", "  styleUrls: ['./app.component.scss']", '})', 'export class AppComponent implements OnInit {', '  posts$: Observable<Post[]>;'],
  legacy: [],
  legacyReplacedBy: null,
  skills: {
    'mobile-first': ['  stories$ = this.storyService.today();'],
    'learn-payments': ["  plans: Plan[] = [{ name: 'Free' }, { name: 'Pro', highlighted: true }, { name: 'Enterprise' }];"],
    'learn-websockets': ['  messages$ = webSocket<Message>(environment.chatUrl);'],
    'angular-universal': ['  // rendered on the server first: no window, no document, no localStorage. Ask isPlatformBrowser() first.'],
  },
  files: {
    ...PLATFORM_SHARED_FILES,
    'learn-angular': {
      'app.component.html': ['<app-hero title="The all-in-one platform for everything"></app-hero>', '<app-post *ngFor="let post of posts$ | async" [post]="post"></app-post>'],
      'app.module.ts': ['@NgModule({', '  declarations: [AppComponent, HeroComponent, PostComponent],', '  imports: [BrowserModule, HttpClientModule],', '  providers: [PostService],', '  bootstrap: [AppComponent]', '})', 'export class AppModule {}'],
      terminal: ['$ ng new myhomepage --style=scss --routing', '$ ng generate component hero', 'CREATE src/app/hero/hero.component.scss (0 bytes)', 'CREATE src/app/hero/hero.component.html (23 bytes)', 'CREATE src/app/hero/hero.component.spec.ts (614 bytes)', 'CREATE src/app/hero/hero.component.ts (262 bytes)', 'UPDATE src/app/app.module.ts (388 bytes)'],
    },
    'mobile-first': { ...PLATFORM_SHARED_FILES['mobile-first'], 'app.component.html': ['<app-stories [stories]="stories$ | async"></app-stories>'] },
    'learn-payments': { ...PLATFORM_SHARED_FILES['learn-payments'], 'app.component.html': ['<app-pricing-table [plans]="plans"></app-pricing-table>'] },
    'learn-websockets': { ...PLATFORM_SHARED_FILES['learn-websockets'], 'app.component.html': ['<app-chat-bubble [messages]="messages$ | async"></app-chat-bubble>'] },
    'angular-universal': {
      'app.server.module.ts': ['@NgModule({', '  imports: [AppModule, ServerModule, ModuleMapLoaderModule],', '  bootstrap: [AppComponent]', '})', 'export class AppServerModule {}'],
      terminal: ['$ ng generate universal --client-project myhomepage', 'CREATE src/main.server.ts (220 bytes)', 'CREATE src/app/app.server.module.ts (318 bytes)', 'UPDATE angular.json (4207 bytes)'],
    },
  },
  emptyFile: (fileName) => PLATFORM_EMPTY_FILES[fileName] ?? `// ${fileName}\n`,
  closing: ['', '  constructor(private postService: PostService) {}', '', '  ngOnInit(): void {', '    this.posts$ = this.postService.getPosts();', '  }', '}', ''],
};

const VUE_CODE: EraCode = {
  mainFile: 'App.vue',
  opening: ['<template>', '  <div id="app">', '    <hero title="The all-in-one platform for everything"></hero>', '    <post v-for="post in posts" :key="post.id" :post="post"></post>'],
  legacy: [],
  legacyReplacedBy: null,
  skills: {
    'mobile-first': ['    <stories :items="stories"></stories>'],
    'learn-payments': ['    <pricing-table :plans="plans" highlighted="Pro"></pricing-table>'],
    'learn-websockets': ['    <chat-bubble greeting="Hi! 👋 Any questions?"></chat-bubble>'],
  },
  files: {
    ...PLATFORM_SHARED_FILES,
    'learn-vue': {
      terminal: ['$ npm install -g @vue/cli', '$ vue create myhomepage', '? Please pick a preset: default (babel, eslint)', '🎉  Successfully created project myhomepage.', '$ npm run serve'],
    },
    'nuxt-ssr': {
      'pages/index.vue': ['<script>', 'export default {', '  async asyncData({ $axios }) {', "    return { posts: await $axios.$get('/api/posts') }; // runs on the server first", '  }', '};', '</script>'],
      terminal: ['$ npx create-nuxt-app myhomepage', '✨  Generating Nuxt.js project in myhomepage'],
    },
  },
  emptyFile: (fileName) => PLATFORM_EMPTY_FILES[fileName] ?? `// ${fileName}\n`,
  closing: ['  </div>', '</template>', '', '<script>', 'export default {', "  name: 'App',", '  data() {', '    return { posts: [], stories: [], plans: [] };', '  },', '  async created() {', "    this.posts = await fetch('/api/posts').then(response => response.json());", '  }', '};', '</script>', '', '<style scoped>', '#app { font-family: Avenir, Helvetica, Arial, sans-serif; }', '</style>', ''],
};

const ERA_CODE: Readonly<Record<EraId, EraCode>> = {
  'homepage-1997': HOMEPAGE_CODE,
  'web2-2005': WEB2_CODE,
  'social-2011': SOCIAL_CODE,
  'platform-2018': PLATFORM_CODE,
};

/** Once a framework is picked, its code replaces the era's: the rewrite starts from an empty main file. */
const FRAMEWORK_CODE: Readonly<Record<FrameworkId, EraCode>> = {
  react: REACT_CODE,
  angular: ANGULAR_CODE,
  vue: VUE_CODE,
};

function codeFor(state: GameState): EraCode {
  const framework = findChosenFramework(state);
  return framework === null ? ERA_CODE[state.eraId] : FRAMEWORK_CODE[framework];
}

function knowsSkill(state: GameState, skillId: UpgradeId | null): boolean {
  return skillId !== null && state.purchasedUpgradeIds.includes(skillId);
}

function learnedSkills(state: GameState): readonly UpgradeId[] {
  return UPGRADE_IDS.filter((upgradeId) => knowsSkill(state, upgradeId));
}

export function mainEditorFile(state: GameState): string {
  return codeFor(state).mainFile;
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
  const code = codeFor(state);
  return fileName === code.mainFile ? buildMainFile(state, code) : buildOtherFile(state, code, fileName);
}
