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

What exists: Learn CSS, PHP and MySQL, the Web 2.0 look, AJAX, RSS; blog, comments, tag cloud; spam; CAPTCHA.

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
| Hosting tiers | boosts (backend) | shared hosting → VPS → dedicated → "the cloud"; your own domain in the URL; server meter capacity |
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
- The cloud: `git push` deploys, object storage, a CDN.
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

## Known balance issues

- **Late 2005 snowballs.** In the simulation, revenue jumps about ×24 within one minute near the end
  of the era and the bot buys 13 upgrades at once: most 2005 multipliers become affordable together and
  each one makes the next cheaper. Small content changes move when the snowball starts, so the era's length
  swings (5–19 minutes). Fix by spreading 2005 boost prices further apart and making the late features cost more.
- **The Flash intro can't be undone.** It weighs 1.2 MB, which alone takes longer than 2005 visitors wait.
  It's meant as a trade-off, but you can't remove it once built. Consider an on/off switch like the defenses.

## Pop-up rules (all eras)

- Every pop-up has a safe × in the title bar. Body buttons vary per pop-up: none, a safe close,
  only the scam button, a "click here" link, or both buttons being scams.
- Falling for a scam costs 10% of your money and posts what happened to the news.
