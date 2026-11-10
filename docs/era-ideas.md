# Era ideas

Each era is a snapshot year standing for a span of web history. Built so far: 1997 and 2005, plus the performance indicator.
Everything on the page is site dressing: fake content and simple loops, never a working app.

| Era | Covers | Status |
|---|---|---|
| 1997 Personal homepage | mid-90s to the 2000 crash | built |
| 2005 Web 2.0 | 2001–2009 | built, including the expansion below |
| 2011 Social & mobile | 2010–2015 | ideas |
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

**You arrive with:** the glossy 2005 blog, which doesn't fit on phones. Mobile visitors bounce until you learn
responsive design. Flash is dead: the Flash intro and the MIDI player show a puzzle piece until rebuilt.

**Looks (frontend)**
- **Responsive design**: before it, a phone-sized frame shows your site scrolling sideways. Media queries are
  this era's "Learn CSS" moment.
- **Bootstrap**: the page becomes the template everyone used: a big "Hello, world!" hero, three columns with icons.
- **Masonry tiles**: the page breaks into Pinterest-style tiles. The editor types `$('.grid').masonry(...)`,
  because it was a jQuery plugin.
- **Parallax scrolling**: background layers drift at different speeds. Animate only `transform`.
- **Scroll-jacking one-pager**: a toggle. On: "Site of the Day" awards (more traffic), but scrolling snaps
  section by section, some visitors leave, and you live with it too.
- Hamburger menu, infinite scroll, like and share buttons with counts, "Get our app!" banners.
- HTML5 video replaces Flash; retina images are blurry until you learn `@2x` images.
- Skeuomorphic textures (leather, linen, stitching) that a later era will strip away.

**Backend**
- Node.js and npm, MongoDB ("is it web scale?"), REST and JSON APIs.
- The cloud: `git push` deploys, object storage, autoscaling. It replaces the 2005 racks as the hosting
  ladder (moved here from 2005: the cloud took off around 2010, not in 2005).
- OAuth "Sign in with…" buttons (parody social networks).
- Sass in the editor, Grunt build files.

**Hazards:** DDoS attacks, password leaks and account takeovers, mobile visitors bouncing, Flash-dead features.

**Typing tool:** copy-paste from a Q&A site. Each keystroke pastes a whole answer; a typo becomes
"copied the wrong answer (marked as duplicate)".

**Performance indicator:** a YSlow-style letter grade plus a separate mobile score.

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
| Virus | the snake minigame | Antivirus: 10% of revenue, cleans after 6 s |
| Spam flood | 4 clicks | CAPTCHA: comments bring 10% fewer visitors |
| SQL injection | 3 clicks to restore | Learn prepared statements (a skill, no downside) |
| Traffic spike | none | Hosting headroom, or the static page cache |

A defense must show what it protects, not only what it costs: the shop lists both lines, and CAPTCHA puts
a visible CAPTCHA box under the comments. Before that it read as a pure cost.

## Proposal: a minigame per hazard

The snake is the only hazard with a real active fix; the others are click-N-times. Short task minigames,
like the ones in party games where everyone does chores, would give each hazard its own 5–15 second task.
All web-themed and original:

| Hazard | Minigame idea | Feel |
|---|---|---|
| Virus (1997) | Snake (exists) | arcade |
| Spam flood | Sort the comments: swipe spam to the trash, real comments to the page | fast sorting |
| SQL injection | Restore from backup: drag the right dated backup into the database slot | matching |
| Server overload | Rewire the rack: connect each server to the matching switch port by color | connecting |
| Traffic spike | Hold the line: keep a load meter in the green by tapping before it peaks | timing |
| Broken build (2018) | Untangle `node_modules`: click the duplicate packages | spotting |
| Prompt injection (2024) | Find the guestbook entry that says "ignore previous instructions" | spotting |

Design rules:
- **Same contract as the snake**: a pure engine module (state in, state out, unit-tested) plus a thin modal.
  `snake.ts` and `snake-modal.ts` become the template; a shared `MinigameModal` shell does open, close,
  retry and win.
- **Short and optional.** Every minigame has a passive fix you can buy instead, so it is never a chore wall.
- **Scales with the problem.** Like the virus food, an older infection makes its minigame a little harder.
- **One input model.** Click/tap and drag only, so every minigame works on a phone (needed for the mobile
  layout) and later gets keyboard support from the options menu.
- **Era-styled.** The 1997 games look like Windows 95 dialogs, 2005 like glossy widgets.

Suggested order: build the shared modal shell and the spam sorter first (spam already exists and its fix is the
weakest), then SQL restore, then rack wiring together with a server-overload hazard.

## Balance notes

- **Late 2005 used to snowball** (income ×24 in one simulated minute, era over in 5 minutes). Fixed by
  spreading 2005 prices, making late features cost and produce more, and splitting hosting into six
  tiers about 4× apart: when traffic is stuck at capacity, an upgrade multiplies income by that gap.
  Now the steepest minute is ×4.7–8.1 and 2005 takes 12–16 minutes for the scripted players.
- **An overloaded server serves what it can.** Past 200% load most visitors get a 503 page, but traffic
  is capped at capacity, never zero. Dropping to zero caused a death spiral: no income, so no upgrade.
- **The Flash intro can be switched off.** Switchable features keep their levels; switched off they add
  no visitors and no page weight. The 2011 scroll-jacking toggle can reuse this.
- The simulation prints each player's steepest minute (income growth within one minute) to spot snowballs.
- **The old top hosting tier was hiding a snowball.** With cheap capacity, demand jumped ×20 in one
  minute at the end of 2005: the $100M "cloud" was the real brake. The dated ladder brakes with smaller steps
  instead: steepest minute ×6.7 (active) and ×4.2 (relaxed), 2005 takes 11–13 minutes.

## Pop-up rules (all eras)

- Every pop-up has a safe × in the title bar. Body buttons vary per pop-up: none, a safe close,
  only the scam button, a "click here" link, or both buttons being scams.
- Falling for a scam costs 10% of your money and posts what happened to the news.
