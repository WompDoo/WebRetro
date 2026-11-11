# Era ideas

Each era is a snapshot year standing for a span of web history. Built so far: 1997, 2005 and the core of 2011, plus the performance indicator.
Everything on the page is site dressing: fake content and simple loops, never a working app.

| Era | Covers | Status |
|---|---|---|
| 1997 Personal homepage | mid-90s to the 2000 crash | built |
| 2005 Web 2.0 | 2001–2009 | built, including the expansion below |
| 2011 Social & mobile | 2010–2015 | core built (see below); content to come |
| 2018 Platform | 2016–2022 | ideas |
| 2024 AI | 2023–now | ideas |

## Rules for every era

- **You arrive knowing the previous era's skills.** The page keeps the old look until you learn the new
  ones. The world (browser, editor, pop-ups) changes at the relaunch; your site doesn't.
- **Every skill must visibly change something**: the page, the browser window or the editor.
  Boosts may stay invisible multipliers.
- **Both frontend and backend.** Frontend changes what the page looks like; backend shows up in the
  browser window (URL, status bar, error pages) and in the editor (files, languages, tabs).
- **Every era reinvents an older one.** Masonry returns as bento grids, PHP returns as server components,
  pop-ups return as cookie banners. Each era opens with a "hello": Hello World (1997), Bootstrap's
  "Hello, world!" hero (2011), the AI's "Hello! How can I help you today?" (2024).
- **Legacy features can break.** When an era kills a technology (Flash, MIDI plugins), the old feature
  shows a "plugin not supported" puzzle piece and brings in nothing until you rebuild it the new way.
- **Out of fashion retires.** Each relaunch retires what that era's web stopped doing (`sunsetIn` on a
  feature): it leaves the page and the shop, brings no visitors and adds no page weight. The relaunch story
  lists what goes, by the name the player knew it, and the Build tab keeps a "Retired" list. This keeps
  pages from filling up with dead trends and doubles as balance: old traffic makes way for the new era's.
  **Trade-in:** the relaunch pays back half of what the retiring features earned in their lifetime. Every
  feature keeps a tally (`featureEarnings`): visitor revenue, split by the visitors each feature brings in.
  In 2011 that is $160–200M, about half the price of Bootstrap: a head start, not a shortcut.
- **The phone follows the era.** From the first era with phone visitors, the browser has a Desktop/Phone
  switch. Phone view draws the real page on a phone of the era (2011: black glass slab, round home button):
  laid out at desktop width and shrunk until the page is responsive, reflowed after. Later eras restyle the
  phone (`[data-era] .device-frame`), not the mechanism. On the phone, pop-ups fill the screen (interstitials)
  and infections arrive as notification banners at the phone's own size, so they can be tapped even when
  the page is shrunk; tapping one opens its minigame. Banners sit above the pop-ups, never over their ×.
  The phone scrolls by swiping, not with a scrollbar: drag the screen, flick it and it glides to a stop. The page
  follows the pointer exactly at any zoom; a press that barely moves is still a tap (`src/ui/swipe.ts`).
- **Real company names stay out of the game.** Technologies are fine (PHP, React); companies get
  parody names ("Sign in with Facespace").

## The performance indicator (from 2005 on)

A derived engine number, shown in the browser's status bar, that **costs visitors** when it's slow:

```
Done (4.2 s) · 182 KB · Server ▮▮▮▮▮▮▯▯ 74%
```

- **Page weight** (KB) comes from what you've built. A Flash intro is enormous.
- **Load time** = page weight on the era's connection (28.8k modem, DSL, 3G, 4G, fiber).
  Above about 3 seconds, visitors start bouncing.
- **Server load** = traffic against your hosting tier. Over 100% the load time balloons; at 200% the
  whole site becomes a 503 page.
- After every purchase the page "reloads": a progress bar in the status bar; in 1997 images reveal top-down.
- The indicator itself ages:

| Era | What it looks like |
|---|---|
| 1997 | "Document: Done (34 s)" on a 28.8k modem |
| 2005 | Status bar time, page weight and a server meter |
| 2011 | A YSlow-style letter grade (A to F) plus a mobile score |
| 2018 | A Lighthouse-style score circle (green, orange, red) with Core Web Vitals |
| 2024 | The score circle plus a cloud bill, mostly your chatbot's |

## 2005 Web 2.0: expansion (built)

What exists: Learn CSS, PHP and MySQL, the Web 2.0 look, AJAX, RSS; blog, comments, tag cloud; spam; CAPTCHA;
memcached, a CDN and a static page cache as server boosts.

| Idea | Kind | What you see |
|---|---|---|
| Learn Flash | skill, unlocks Flash intro | a full-page intro animation with a **Skip intro** button; heavy page weight |
| Learn URL rewriting | skill (backend) | the address bar goes from `index.php?id=42&cat=3&sid=8f3a…` to `/blog/2005/04/my-first-post/` |
| Learn jQuery | skill, unlocks lightbox gallery | thumbnails; now and then one opens enlarged in a dark overlay |
| Learn web APIs | skill, unlocks map mashup | a map tile with pins and info bubbles |
| Learn prepared statements | skill (backend) | protects against SQL injection; you notice the errors stop |
| Forum | feature | thread list: "Re: Re: Re: help!!", sticky posts, member counts |
| AJAX comments | visual on comments | new comments arrive with a spinner, then the yellow fade |
| IE6 hacks | boost | before it, transparent images show gray boxes behind them (the real IE6 PNG bug) |
| Valid XHTML badge, bookmark buttons | boosts | a row of tiny 80×15 badges in the footer |
| Glitter text | boost | sparkly MySpace-style headings |
| Drop the vowels | boost | the logo changes from "myhomepage" to **"myhmpg"** |
| SVN | boost (backend) | editor title `blog.php (rev 142)`, the occasional "Committed revision 143" |
| Rails | skill or boost (backend) | the editor switches to Ruby and gains a `config/routes.rb` tab |
| J2EE | joke boost (backend) | the editor's tabs explode into 14 XML files to print Hello World |
| Hosting ladder | Ops tab (backend) | ten dated steps from shared hosting (2001) to a second data center (2008), then extra racks; see below |
| SQL injection | hazard (backend) | a PHP error printed in your blog ("Warning: mysql_fetch_array(): supplied argument is not a valid MySQL result resource on line 42") and a `'; DROP TABLE comments;--` comment |
| Front-page traffic spike | hazard (backend) | traffic surges; without capacity the whole site becomes a 503 page until it passes |

## 2011 Social & mobile

**Built (the core):**
- The relaunch story ("Everyone has a phone now"), the checklist (every 2011 feature, Like and share buttons
  level 15, 1B visitors/s, $550B) and the new ending: 2011 is the last era of the prototype for now.
- **Phones:** four in ten visitors are on a phone, and three in four of them leave until you learn responsive
  design. The browser's Phone switch shows them the page: shrunk from desktop width, then fitting.
- **Retired at the relaunch:** the hit counter, the beta sticker, the blogroll, the tag cloud and the Flash intro.
- **Flash is dead:** the podcast player shows a "missing plug-in" box and brings nothing until Learn HTML5 video
  and audio rebuilds it. Engine: `pluginDiesIn` on a feature, so 2018 can kill something too.
- **Bootstrap:** the page becomes the Bootstrap 2 template: dark navbar (a hamburger once responsive),
  "Hello, world!" hero, then a span8 column of content and a span4 sidebar of wells under small grey headers.
  Helvetica at 14 px, link-blue post titles, thumbnails, a striped table. Until then the 2011 site keeps its
  2005 look.
- **Features:** Like and share buttons (counters per network), HTML5 video player, live activity feed (infinite
  scroll, busier with every share). Skills: responsive design, Bootstrap, HTML5 media, social plugins, Node.js.
- **The cloud:** each era has its own hosting ladder; the relaunch starts at "The cloud: 2 instances" (free),
  growing about a quarter per step. The racks stay in 2005.
- **Typing:** a dark code editor where every keystroke pastes a whole line from a Q&A site ("duplicate!",
  "accepted"). Files: index.html, app.js, style.css, and server.js with Node.js.
- **Hazards:** password leaks (the forum's or the wall's user table on a paste site; Hash passwords with bcrypt
  ends them) and DDoS attacks (a botnet floods the busiest page; DDoS protection, a scrubbing service that takes
  5% of revenue, stops them). Both reuse the infection plumbing: tickets, phone banners, minigames, quick fixes.
- **Looks**, each a trade-off:
  - *Learn jQuery Masonry*: photo albums tile like bricks; album traffic ×1.6.
  - *Learn parallax scrolling*: a layered landscape in the hero drifts slower than the page (a scroll listener sets
    `--site-scroll`; CSS moves the layers with `transform`); all traffic ×1.08 for 450 KB of background images.
  - *Scroll-jacking one-pager*: a switchable 2011 feature (needs parallax). Full-height chapters the page snaps to,
    "Site of the Day" awards, and 900 KB that phones feel in their load time and mobile score.
  - *Serve @2x images*: until you do, photos are blurry on phones (the phone view and real phones show it;
    desktops never notice). All traffic ×1.05 for 300 KB more.
  - *"Get our app!" banner* (a boost): ad value ×1.2, all traffic ×0.97.
- **Backend:**
  - *Learn REST and JSON APIs* (skill): `/api/posts.json` in server.js; the feed ×1.3, keystrokes ×1.3, and it
    unlocks *Sign in with…*, a 2011 feature (Facespace and Chirper buttons, busier with every live activity;
    the navbar offers it too).
  - *Learn Sass* (skill): a style.scss tab compiled by Grunt on save; fewer typos, keystrokes ×1.2.
  - Boosts: *Switch to MongoDB* ("web scale"; server load ×0.8), *Deploy with git push* (keystrokes ×1.25,
    fewer typos), *Turn on autoscaling* (server load ×0.7).
- **Performance:** "Grade B · Mobile 69/100" in the status bar. Pop-ups: like-gates, app banners, the first cookie
  notices, phishing through a friend's chat. The issue tracker becomes Mentions: complaints posted at you.

**Parked:** skeuomorphic textures (leather, linen, stitching) until 2018, whose relaunch strips them away.

## 2018 Platform

**You arrive with:** the 2011 site: skeuomorphic, no cookie banner, everything bolted on.

**Looks (frontend)**
- **Flat design**: learning it strips the gloss and textures, one gradient at a time.
- **The SaaS landing page**: hero with stock photos of people laughing, three feature cards, testimonials,
  a pricing table.
- **A single-page app**: before server-side rendering, a blank page with a spinner ("You need to enable
  JavaScript to run this app"), then everything pops in. **Learn SSR** fixes the blank page; hydration
  shows as a brief "looks ready but isn't clickable" moment.
- Loading skeletons, sticky headers, carousels, chat bubbles, dark-mode toggle, "Add to home screen".
- **Layout shift**: ads load late and shove your content down mid-read.

**Backend**
- Microservices: the guestbook is now seven services and three micro-frontends. The editor fills with
  `docker-compose.yml`, `Dockerfile` and Kubernetes YAML.
- Serverless functions, GraphQL, static site generators, CI/CD pipelines, monitoring dashboards.
- `node_modules` keeps growing: the editor shows its size climbing toward a gigabyte.

**Hazards**
- **GDPR cookie walls** (May 2018): the 1997 pop-up comes back, required by law. "Accept all" is big;
  "Reject all" hides behind "Manage options". No banner at all means a fine.
- **Full-screen timed ads** with "Skip in 5". You can't close them until the timer ends; they cost visitors.
- **A deleted dependency** breaks the build (the left-pad incident); "1,203 vulnerabilities found".
- **A critical vulnerability in a logging library** (a nod to Log4Shell) for the backend.
- Ad-blocker walls, paywalls ("You have 2 free articles left"), newsletter pop-ups, notification prompts.

**Typing tool:** `npm install`. Each keystroke installs a package; typos install the wrong one.

**Performance indicator:** a Lighthouse-style score circle with Core Web Vitals. Layout shift from ads
shows up in it.

## 2024 AI

**You arrive with:** the 2018 single-page app, blank until the JavaScript loads.

**Looks (frontend)**
- **"✨ Ask AI" bubble** on every page. Site dressing only: canned replies that are confidently wrong
  about your own site ("Your guestbook was founded in 1887 by a cat."). Built like the guestbook entries.
- **"Summarize with AI"** buttons on every blog post, producing summaries longer than the post.
- **Bento grids**: masonry is back, with rounded corners.
- AI-written filler ("In today's fast-paced digital landscape…"), AI images with the wrong number of
  fingers, gradient blobs, giant type, scroll animations again.
- "Continue with…" passkeys, "Join our Discord", cookie banners that never left.
- The editor fills with utility-class soup: `class="flex items-center justify-between px-4 md:px-6 dark:bg-gray-900"`.

**Backend**
- LLM APIs, vector databases, "You are a helpful assistant" system prompts.
- **Learn server components**: render HTML on the server. Like PHP in 2005.
- Edge functions, GPU bills, rate limits.

**Hazards**
- **AI scrapers** that ignore robots.txt and take your content.
- **Prompt injection**: a guestbook entry saying "ignore previous instructions" makes the Ask AI bubble
  answer every question with a pirate poem until you fix it.
- **The cloud bill**: your chatbot costs more than it earns.
- CAPTCHAs that ask you to click every traffic light; deepfake phishing.

**Typing tool:** an AI pair programmer. Each keystroke writes a whole file; a typo becomes a
"hallucination" (confident, wrong code) that the next keystroke has to fix.

**Performance indicator:** the score circle plus the cloud bill.

**Ending:** acquisition offers from parody tech giants, based on what you built, plus a "refuse to sell" ending.

## Small things players asked for (built)

- **Editor tabs are real files.** From 2005 each skill puts its code where it belongs: CSS in `style.css`,
  JavaScript in `ajax.js`, rewrite rules in `.htaccess`. Clicking a tab opens that file; a file no skill has
  written to yet says which skill fills it. Three players tried to click them before they did anything.
  Each tab keeps what you typed in it: switch away and back and you carry on where you were
  (`src/ui/editor-buffers.ts`). A typo left in a tab is fixed on the way out, since the engine fixes the bug
  on the next keystroke wherever it lands. A relaunch starts every file over.
- **Multi-buy.** The Build tab buys 1, 5 or 10 levels per click, all or none, at the price of buying them
  one by one.
- **Learn it for real.** Learned skills (and bought boosts that are real technologies) link to MDN, the
  official docs or Wikipedia. Joke boosts stay plain text, so nothing looks clickable that isn't.

## The 2005 hosting ladder (built)

How a growing site scaled between 2001 and 2009, in the order people did it. Each step carries about 2.3×
the last; the year is when that step became the usual next move.

| Year | Step | Capacity (visitors/s) |
|---|---|---|
| 2001 | Shared hosting | 15K |
| 2002 | Business hosting plan ("unlimited" bandwidth) | 35K |
| 2003 | Virtual private server | 80K |
| 2004 | Dedicated server | 190K |
| 2004 | Separate database server | 440K |
| 2005 | Load balancer and three web servers | 1M |
| 2005 | Database replicas | 2.3M |
| 2006 | Colocation rack | 5.3M |
| 2007 | Sharded database | 12M |
| 2008 | Second data center | 28M |
| 2009 | +1 rack, +2 racks, … (repeatable) | +6M each |

- **There is always a next step.** Demand keeps growing as long as you buy features, so any fixed top tier
  breaks eventually (it did: playing on after the ending pushed the old "cloud" tier past 200%). Racks keep
  going; their price is what stops you.
- **Efficiency is the second lever.** Memcached and a CDN each halve the server load per visitor, so the
  same machines carry 4×. A static page cache makes traffic spikes harmless: they put no load on the
  server, but you still only earn from what your hosting carries (a cache is protection, not a jackpot).

## Hazards: every problem has an active fix and a passive fix

| Hazard | Active fix (you, now) | Passive fix (money, with a trade-off) |
|---|---|---|
| Pop-up | click the × | Premium ad network: ads pay 25% less |
| Virus | one of three arcade minigames, picked at random | Antivirus: 10% of revenue, cleans after 6 s |
| Spam flood | the comment sorter minigame | CAPTCHA: comments bring 10% fewer visitors |
| SQL injection | the backup restore minigame | Learn prepared statements (a skill, no downside) |
| Traffic spike | none | Hosting headroom, or the static page cache |

A defense must show what it protects, not only what it costs: the shop lists both lines, and CAPTCHA puts
a visible CAPTCHA box under the comments. Before that it read as a pure cost.

## The issue tracker (built)

Everything that needs you is a ticket: every infection, an overloaded or downed server, and a traffic spike
you aren't cached for. Pop-ups stay on the page, where you close them.

- **Era-styled.** 1997 is an email inbox ("From: cooldude97@freemail.example · ur guestbook has a VIRUS!!!");
  2005 is a bug tracker (#1041 CRITICAL · NEW · assigned to you). 2011 can be a social feed of complaints,
  2018 a ticket board, 2024 an AI that summarizes your tickets wrongly.
- **Two buttons.** "Fix it" opens the minigame or the shop tab that fixes it; "Prevent:" points at the passive
  fix while you don't have it on (Antivirus, CAPTCHA, prepared statements, the page cache).
- Most urgent first: critical, major, minor. Countdowns and server load update in place, so a button never
  gets rebuilt under your finger.
- `listIssues(state)` is a pure function with its own tests; the era styles only render it.

## Phones (built)

- **Money always on top:** a sticky bar with money, visitors and revenue, and the objective as one line
  ("0 of 4 done") that opens the checklist when tapped. The Launch button shows as soon as it is ready.
- **One section at a time,** picked from a bottom tab bar: Site, Code, Shop, Inbox (Issues in 2005). Each
  fills the screen and scrolls on its own; the page itself never scrolls.
- **Badges:** Site shows open pop-ups and Inbox open tickets (red); with no tickets, Inbox counts unread news
  (blue). Shop shows a dot when there is a new skill, boost, defense or hosting step to afford. A count of every
  affordable feature level was always 30-something, which is noise.
- A new game starts on Code, where the earning starts; a returning player lands on Site. The tip sits above
  the editor on Code.
- Safe-area padding for notches and the home indicator. Tablets and desktops keep their layouts.
- No Desktop/Phone switch on a phone: you're already looking at the page on one.

## Minigames (built)

Every infection opens a short minigame; winning it fixes the feature. The game is rolled when the infection
appears, so closing and reopening it gives the same one.

| Minigame | For | How it plays | Harder with age (levels 1–3) |
|---|---|---|---|
| Snake | virus | eat the virus fragments without crashing | 1–3 fragments |
| Virus scan | virus | click the virus while it peeks out of one of nine files; 3 clean-file clicks fail | 3/5/7 hits, shorter peeks |
| Firewall | virus | slide the firewall, shoot the marching viruses before they reach your files | 1–3 rows of five |
| Sort the comments | spam | spam to the trash, real comments to the page; 3 wrong calls fail | 6/8/10 comments |
| Restore a backup | SQL injection | pick the newest backup from before the attack; 2 wrong picks fail | 3/4/5 backups, closer together |
| Reset the passwords | password leak | spinning plates: crackers fill every account's bar at once, a click resets one; hold out until they give up | 3/4/5 accounts, faster, 10/13/16 s |
| Close the gates | DDoS | requests stream down three lanes; shut a lane's gate for bots, open it for visitors; 3 bots through or 3 visitors turned away fail | faster, more bots, 12/15/18 s |
| Cross the traffic | DDoS | hop your admin connection across lanes of bot traffic to the server; a bot sends you back; 3 hits fail | 3/4/5 lanes, faster, 1/2/3 crossings |

Rules they all follow:
- **A pure engine module** each (`src/engine/minigames/`, plus `snake.ts`): state in, state out, seeded,
  unit-tested. The UI side is one shared modal shell (`ui/minigames/minigame-modal.ts`) with a small view per
  game. Adding a minigame means one engine module, one view and one line in the shell's table.
- **Difficulty grows with age.** Every infection reaches level 2 after 2:30 and level 3 after 5:00, like the
  virus food used to. The overlay shows the level and the countdown.
- **Fix it fast:** winning within 30 s of the infection appearing gives +15% traffic for a minute.
- **The time budget:** minigames should take a tenth of play time or less. Hazards fire less often than when
  fixes were clicks (virus every 1:40–3:00, spam 2:00–3:20, SQL 3:00–5:00, password leak 4:20–6:40, DDoS
  4:00–6:00); the simulation prints the share: 2–3% in 1997, 6–7% in 2005 and 11% in 2011. 2011 runs a little
  over because the scripted players never buy DDoS protection (its revenue cut reads as a loss); people do.
- **A pool of games per hazard:** each kind of infection lists its games (`INFECTION_MINIGAMES`) and rolls one
  when it appears. Viruses have three, DDoS two, the rest one. A hazard that comes back often should get more.
- **Touch first.** Every game works with taps, swipes and the pointer, and has keys too.
- Original and web-themed: inspired by party-game chores in spirit, not copied from any game.

Next candidates: rack wiring (server overload as a hazard), "hold the line" during a traffic spike, untangle
`node_modules` (2018), find the prompt injection in the guestbook (2024). A pool of several games per hazard,
like viruses and DDoS have, can come later for the others.

## Balance notes

- **End goals scale with content.** Every 2011 batch reruns the sim and moves the goals so the era keeps its length:
  the looks batch added multipliers and a feature, and 2011 dropped to 9.5–11.4 minutes, so the goals went from
  500M visitors/s and $250B to 800M and $450B (back to 10.7–12.8); the backend batch, to 1B and $550B
  (10.8–12.3). "Every 2011 feature" grows on its own.
- **2011 pacing:** 11–13 minutes for the scripted players, like the other eras. Retiring the tag cloud and the
  Flash intro took their traffic away (relaxed 12 → 17 minutes); the 2011 features bring half as much again
  (share buttons 750K, video 2.25M, activity feed 6M visitors/s per level) to win it back. The visitor gate
  was the bottleneck, not the budget: cutting the budget 40% saved only 1.4 minutes. Two fixes got it there: cloud steps
  grow geometrically (a flat +12M per instance at ×1.3 the price stopped scaling at about 20 instances), and the
  budget is about two minutes of end-of-era income (a $2T budget meant 19 minutes of saving with nothing to buy).
- **The relaunch costs something:** phone visitors bouncing and Flash dying cut income for the first minute of
  2011, until responsive design and HTML5 media win it back. Tuned so it reads as a challenge, not a punishment.
- **The steepest-minute check now measures underlying income** (no infections, pop-ups, spikes or quick-fix
  bonus). Before, cleaning an infection that took out your biggest feature read as a ×30 "snowball".

- **Late 2005 used to snowball** (income ×24 in one simulated minute, era over in 5 minutes). Fixed by
  spreading 2005 prices, making late features cost and produce more, and splitting hosting into six
  tiers about 4× apart: when traffic is stuck at capacity, an upgrade multiplies income by that gap.
  Now the steepest minute is ×4.7–8.1 and 2005 takes 12–16 minutes for the scripted players.
- **An overloaded server serves what it can.** Past 200% load most visitors get a 503 page, but traffic
  is capped at capacity, never zero. Dropping to zero caused a death spiral: no income, so no upgrade.
- **The Flash intro could be switched off in 2005.** Switchable features keep their levels; switched off they
  add no visitors and no page weight. The 2011 scroll-jacking toggle can reuse this.
- The simulation prints each player's steepest minute (income growth within one minute) to spot snowballs.
- **The scripted players used to hoard.** While saving for an unaffordable item they bought nothing, even
  things that pay for themselves first, then spent everything at once. They now buy those meanwhile, like a
  person would. That made them faster (2005 in 9–11 minutes) and showed a real late-2005 snowball the
  hoarding hid: ×13–14 within the era's last minute. Next balance pass: the late 2005 features.
- **The old top hosting tier was hiding a snowball.** With cheap capacity, demand jumped ×20 in one
  minute at the end of 2005: the $100M "cloud" was the real brake. The dated ladder brakes with smaller steps
  instead: steepest minute ×6.7 (active) and ×4.2 (relaxed), 2005 takes 11–13 minutes.

## Pop-up rules (all eras)

- Every pop-up has a safe × in the title bar. Body buttons vary per pop-up: none, a safe close,
  only the scam button, a "click here" link, or both buttons being scams.
- Falling for a scam costs 10% of your money and posts what happened to the news.
