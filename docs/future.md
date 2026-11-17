# What comes next: prestige, replay, length, content

The first full game is built: five eras, an ending, and nine kinds of player who can (or deliberately can't) finish it.
This is the design thinking for what comes after, written to be argued with. Each section ends with a recommendation.

## Decided

| Question | Decision |
|---|---|
| What to build next | **Prestige**, as in section 1, without the ending carry |
| Where a new run starts | **From the credits**: a "Start a new site (+N Backlinks)" button beside Start over and Keep playing |
| First perks | **Muscle memory** (typing) and **bonuses for the buildables**; Known tags, Early warning and Ops runbook wait |
| Why prestige at all | **Each run adds content the last one didn't have**: a faster replay alone isn't a reason (see "New in run two") |
| Backlinks during play | **Projected**: the stats show what finishing now would earn, so later runs can chase a number |
| Slower players (a casual game is about 7 hours) | **Keep as is**: slow is allowed; no catch-up bonus, no global shortening |
| CI's framework-spread check on one seed | **Keep one seed**: an occasional red run from luck is accepted over a slower CI |
| Should Sell / Keep matter after the ending | **No, it stays flavor**: a story beat, no gameplay difference |
| Buffs, not only hazards | **Both sources**: on fire from typing without typos, and offers won in minigames. Built: a sponsor's code (ads ×2, 40 s) and a launch window, a timing game (Launch day: visitors ×1.5, 45 s; a merge-conflict quiz came first and was replaced); each offer is a random kind among the ones that would do something, and a failed one is gone |
| Making the site yours | **Routes, plus customization**: unlock routes by what you build, pick one at the relaunch out of 2005; the unlocks are visible all run (section 5) |
| Auto-typing | **Hired help, one per era**: a little brother (1.5 keystrokes/s, a quarter of your speed) up to an AI coding agent (8/s, faster than an active player's 6). Era-bound like typing skills, paid offline, never on fire |

Numbers it builds on (`player-types.md`): the balance bot finishes in about 3.5 hours, the relaxed bot in about 4.5,
a casual player in about 7. Any plan that only adds time makes the casual player's game too long already.

## 1. Prestige: start a new site, carry a legacy

The game is already about relaunching: every era is a fresh start that keeps what mattered. Prestige is that same
move one level up: **the ending is the relaunch, and 1997 is the next era.**

**Currency: Backlinks.** Earned at the ending: one per order of magnitude of lifetime visitors past a threshold
(`floor(log10(visitors)) − 10`, so a typical first run earns 4–6), plus one per era finished under 45 minutes (20
for a half-era: surviving the crash well). Log
scale, so the second run can't earn ten times the first by playing ten times longer. The name fits: backlinks are
what an old site leaves to a new one.

The ending's choice was considered as a carry-over (sold: exit money; kept: your domain) and **decided against**:
Sell / Keep stays a story beat. Every finished run earns Backlinks the same way.

**What Backlinks buy** (permanent and small; seven perks, each level twice the price of the last):

| Perk | Effect | Why it's safe |
|---|---|---|
| **Muscle memory** | Typing earns 10% more per level | Typing is a fixed share of income (14–26%); can't run away |
| **Regulars** (bonuses for the buildables) | Every feature brings 5% more visitors per level of the perk | A flat share on everything built: it shortens every era a little and makes no single build mandatory |
| **Templates** (bonuses for the buildables) | Every feature costs 10% less per level, compounding | Cheaper building, same choices |
| **Ops runbook** | Ops items cost 20% less per level, compounding | Ops are era-bound already |
| **Known tags** (up to 3) | Each era starts with its cheapest skill learned, one more per level; never a framework | Skips the slowest minutes of each era, not its decisions; the framework stays a choice |
| **Early warning** (up to 3) | Each era's trouble arrives 2 minutes later per level | Shortens the scariest moment, keeps the hazard |
| **Old savings** | A new site starts with $1,000 per level | Only the first minutes of 1997 |

The five added later work two ways. Templates and the runbook are effects like the first two (two new effect kinds,
`feature-cost-multiplier` and `ops-cost-multiplier`). Known tags, Early warning and Old savings act once, when a site
or an era starts (`src/engine/era-start.ts`, called at every relaunch and from `startNextRun`). With seven perks and
5–9 Backlinks a run, every run is a choice.

| Second run, with a first run's Backlinks | optimizer | casual |
|---|---|---|
| First run | 283 min | 421 min |
| Muscle memory 2, Regulars 2 | 221 min | 366 min |
| Spread over the seven perks (one level of most, two of Regulars) | 226 min | 333 min |

Spreading helps the casual player most: Early warning, Known tags and Templates ease what slows a slower player.

**New in run two: the reason to prestige.** A perk only makes the same game faster. Every finished run unlocks
something the last one didn't have, so the second playthrough is a different one:

| Run | Unlocks | Why it's new play, not just more |
|---|---|---|
| 2 | One **legacy buildable per era**, things the web had that a first-time builder never found: a 1997 live webcam (one frame a minute), a 2005 wiki (anyone can edit, everyone will), a 2011 deal of the day, a 2018 community chat, a 2024 agent store | New features with new synergies and their own hazards (the wiki gets vandalised; the webcam's server melts on a link from a big site) |
| 3 | **The 2000 crash**, a 25-minute half-era between 1997 and 2005: ad money collapses and the site has to survive on what it built | A defensive era, unlike any other; the run's Backlinks reward surviving it well |
| 4 | **Site archetypes** in the intro wizard (fan site, web shop, news site) | Same eras, different feature trees and gates |

Each unlock is announced in the credits ("Next run: a wiki in 2005, a live cam in 1997, …"), so the button says
what the new site gets, not only how many Backlinks. Unlocks come from finished runs, not from Backlinks, so nobody
has to choose between content and perks.

**Projected Backlinks:** after the first finish, the stats strip shows "Backlinks if you finish now: N". The first
run never shows it, so it stays about the site.

**Target pacing:** first run 4–5 h, second ~3 h, third ~2.5 h, then flat. Diminishing perk prices
(`cost = 2^level`) and log-scale income make the curve level off by itself.

**Pitfalls to avoid:**
- *The first run must not feel wrong.* No perk should be so good that run one feels like a tutorial for run two.
- *Don't prestige mid-game.* Prestige only at the ending; an era reset button would undercut the relaunch.
- *State design:* a separate `LegacyState` in its own storage key, versioned, never inside `GameState`: Start over
  clears the game, never the legacy. The era records already in `GameState` become the legacy's museum: every
  finished run's Web Attic, side by side.

**Built (PR 1):** the legacy (its own save key, so Start over never clears it), Backlinks, the credits' "Start a new
site (+N Backlinks)", a legacy screen to spend them, Muscle memory and Regulars, and the projected count in the header
after a first finish. Start over from the side panel pays a finished run in first, so finishing always counts.
Measured with `npm run players` (a second run starts with what a first run's Backlinks buy):

| Player | Run 1 | Run 2 | Change |
|---|---|---|---|
| optimizer | 283 min, earns 8 Backlinks | 228 min | −19% |
| casual | 421 min, earns 7 Backlinks | 387 min | −8% |

Short of the −30% the plan aimed for, and kept that way on purpose: the reason to play run two is its new content
(PR 2), which adds play, so the perks only need to pay for it. A run earns 5–9 Backlinks: about one level of each
perk per run.

**Built (PR 2):** the five run-two features, one per era: a 1997 live webcam, a 2005 wiki (forum regulars write
it), a 2011 deal of the day (shares tip it), a 2018 community chat (newsletter readers fill it) and a 2024 agent store
(the assistant sells it). `FEATURE_FIRST_RUNS` marks them; they're in the shop only from run two, never on a
checklist (`getCoreFeatureIdsOfEra`), and the webcam, wiki and deal retire at the next relaunch as they faded. The
legacy screen names them under "New on your next site". Every page layout of every era places them
(`tests/layouts.test.ts`, run 2). The playtest panel can turn the game in hand into a second run.

| Player | Run 1 | Run 2, perks only | Run 2, perks and new features |
|---|---|---|---|
| optimizer | 283 min | 228 min | 221 min |
| casual | 421 min | 387 min | 366 min |

The new features are extras with their own synergies, so they add choices and a little income rather than time.
Not built yet: their own trouble (the wiki vandalised, the webcam's server melting under a big link).

**Recommendation (decided):** build it in three PRs:
1. The legacy (`LegacyState`, its own versioned save), Backlinks, the credits button, Muscle memory and Regulars, the
   projected count. A second sim bot starts with perks so run two's pacing is measured, not guessed.
2. The five legacy buildables for run two, each with its page, its hazard and its place on every era's layout.
3. The 2000 crash half-era for run three (built, below).

**Built (PR 3): the 2000 crash.** A half-era between 1997 and 2005 that only a third run plays. Y2K came and went;
in March the bubble burst, and a banner pays a fifth of what it did (0.03 a visitor against 1997's 0.15) while it
annoys visitors as much as ever. The site is still the 1997 homepage, typed in the same editor with the same skills,
with the crash's news under its title and the dot-coms' closing-down banners. What's new is money that doesn't come
from ads:

| New in 2000 | What it does |
|---|---|
| Learn to send mail from a script (skill) | Unlocks the two features |
| Free e-cards (feature, gate: level 25) | Every card sent is a link back to you |
| Free email (feature) | you@yoursite.com; grows with the e-cards |
| Donate button, affiliate links (boosts) | Pay per visitor, ads or not: the first income in the game that isn't ads |
| Dancing hamsters (boost) | Doubles the e-cards |

It plays differently: once donations and affiliate links pay, a banner can cost more in visitors than it earns, and
the best crash site often runs fewer banners than its 1997 self. A tip says so when it's true, judged on a usual day
so a passing pop-up can't flip it. All of it retires in 2005. **Decided here: the crash's features retire without a
trade-in.** They're stopgaps that live one short era, and they bring most of the crash's visitors, so a trade-in
handed 2005 a $15–25M head start (2005 usually starts near zero) and cut it from 48 to 29 minutes. Without it, 2005
takes as long as it would have without the crash (40 minutes either way on the same perks).

How the chain works: an era has a `fromRun`, and the run's eras (`getErasOfRun`) decide what comes next;
`isEraUnlocked` checks the run too, so nothing of the crash shows up in a run that skips it. A half-era has a
`baseEraId` (1997 for the crash): it types with that era's editor and skills, and keeps its ops. The goal bar, the
relaunch button and the relaunch story read the next era from the run, and 2005 has a second story for players who
come to it through the crash. The playtest panel steps a game through runs one to three.

| Player (seed 1997) | 1997 | 2000 | 2005 | 2011 | 2018 | 2024 | Total |
|---|---|---|---|---|---|---|---|
| optimizer, run 3 (two runs of perks) | 17 | 21 | 44 | 40 | 57 | 49 | 228 min |
| casual, run 3 | 33 | 32 | 65 | 73 | 73 | 77 | 353 min |

The crash adds 21 minutes for the optimizer and 32 for the casual player: the half-era length it was meant to be.
The optimizer just misses the 20-minute mark; a player who drops the banners early and buys the affiliate links first
makes it. Runs vary by about ±17 minutes between seeds, so compare runs on the same seed.

## 2. Replayability: different games, not the same game faster

Prestige makes the same game shorter. Replay value comes from making it different:

- **Challenge runs**, straight from the player types that can't finish today: *No ads* (needs an ad-free economy,
  see content), *Hands off* (no minigames: defenses only), *Holdout* (no framework, ever), *Speedrun* (under 3 h).
  Each one a badge on the archive page; some unlock a perk.
- **Site archetypes at the intro wizard.** The wizard already names the site; let it pick what kind: *homepage*
  (today's game), *fan site* (forums and galleries carry the gates), *web shop* (a cart from 1999, payments from
  2011, subscriptions from 2018), *news site* (comments, then paywalls, then AI summaries eating your traffic). Same
  eras, different feature trees and gates: the cheapest way to double the content, since the eras, hazards and pages
  are shared.
- **Era events, seeded:** one historical shock per era, drawn from a small pool: the 2000 dot-com crash (ad value
  halves for ten minutes), the Slashdot effect, a framework's breaking major version, a search update that buries
  half your traffic, a cloud region outage. A daily seed gives everyone the same events, so runs can be compared.
- **The framework carries further.** React, Angular and Vue diverge in 2018 and mostly converge in 2024. Give each a
  2024 path of its own (server components, signals, Nuxt's AI starter), so the choice in 2018 shapes the last era.

**Recommendation:** challenge runs first (cheap, and the player-types harness already plays them), archetypes
second (biggest content gain per line of code).

## 3. Lengthening: density, not grind

The tempting way to lengthen an incremental game is bigger numbers between the gates. The casual player already
needs 60–100 minutes an era; inflating would push their game past nine hours. Lengthen with **eras and decisions**,
not with waiting.

- **Half-eras between the big ones**, each about 25 minutes, each about one turn of the web:
  - *2000: the crash.* Ad money collapses; survive on what you built. A defensive era, unlike any other.
  - *2008: the App Store.* The phone becomes a second site you build separately, before 2011 makes one responsive.
  - *2014: flat design and the SPA hangover.* Everything flat, everything a single-page app, and the first
    performance budgets.
  - *2021: the crypto spring and the remote-work boom.* Web3 features that pay well and then don't.
- **A sixth era, 2030: agents.** Most visitors are AI agents browsing for people. You build for machines (structured
  data, APIs, llms.txt is a skill now) and sell to the humans who still come. A natural place for the ending's
  question to come back.
- **Optional goals inside eras** (three per era, a small permanent bonus each): reach a number before the gate asks,
  survive an era without an expired certificate, ship with the page under its era's weight budget. They add play
  for players who want it and nothing for those who don't.

**Recommendation:** optional goals now (cheap, they also feed the Backlinks), then the 2000 crash as the first
half-era, since it plays differently from everything else and tests whether half-eras are fun.

## 4. Future content

From the era notes that aren't built yet, and from what the player types ran into:

- **An ad-free economy.** A tip jar (1999), memberships (2013), sponsorships, the paywall (built, 2024). Makes the
  *No ads* challenge possible and gives the ad trade-off a real alternative instead of a single path.
- **Cheaper passive fixes in 2011 and 2024.** Skipping minigames costs 2011 and 2024 about twice as long; their
  defenses cost the most. A mid-price option there would bring the passive path in line with 2005 and 2018.
- **2024's unbuilt ideas:** prompt injection in the guestbook (a pirate-poem chatbot until fixed), "Summarize with
  AI" buttons longer than the post, passkeys, the cloud bill as its own readout.
- **Server components** as 2024's answer to the 2018 blank page: PHP again, with a build step.
- **Players' sites in the webring.** An opt-in exchange of site names and archive snapshots: other people's 1997
  pages in your webring, and their guestbook entries in yours. Async, no accounts, and the most "web" feature the
  game could have.
- **Accessibility**, set aside so far: keyboard play through every minigame, screen-reader text for the pages,
  reduced motion everywhere (partly done). Necessary before anything public.
- **Sound:** the MIDI player and the podcast player could actually play something, muted by default.

## 5. Your site, your way: routes and customization (designed, not built)

Every player builds the same site today: the archive at the end shows everyone the same five pages. Two things change
that, at very different costs. **Decided:** both: routes for what the site becomes, customization for how it looks.

### Customization: the archive becomes yours (cheap)

At each relaunch (and any time from a Design tab), a few choices that fit the era's tools:

| Era | What you choose |
|---|---|
| 1997 | Background tile (starfield, flames, a photo of your cat), text colour, the MIDI that autoplays, the welcome line |
| 2000 | The banner over the crash ticker ("still here!!!" or your own) |
| 2005 | The gloss colour, rounded or square, the beta sticker's word |
| 2011 | A Bootstrap theme (three swatches), the hero photo |
| 2018 | Brand colour, light or dark, the hero promise |
| 2024 | The gradient, the "✨ AI" wording |

- Stored per era (`state.design[eraId]`), so the archive replays *your* 1997 page, not the default one.
- The site name already works this way; this is the same idea for the look.
- It changes nothing in the economy, so it needs no balance pass and no new sim bot.
- Cost: a picker per era, and each renderer reading its choices. About one PR.

### Routes: what your site becomes (the big one)

**Decided:** 1997 is a personal homepage for everyone, because that's how the web started. At the relaunch out of 2005,
the end of Web 2.0, you choose **one route** for the rest of the run, from the routes you've **unlocked** by what you
built. You can unlock several; you take one. What unlocks each route is **on screen the whole run**, so choosing is
something you work towards, not a surprise at the door.

How it plays:

- **From the first minute, a Routes list** sits under the checklist in the objective panel (on a phone, in the goal
  sheet). Every route is a card: its icon, a one-line pitch, and its conditions with progress ("Photo gallery level
  9/15 · Comments level 10 ✓"). A route you can't reach this run says why ("from run two").
- **An unlock is a few feature levels**, sometimes with a skill, from 1997, the 2000 crash or 2005. Reaching them unlocks
  the route for good, with a news line ("New route unlocked: Photo sharing"); levels lost later don't take it back.
- **The thresholds sit well above the checklist.** A typical 2005 ends with its features around level 5 and the blog at
  15, so "level 15" is a choice to focus, and focusing on everything costs the era time.
- **At the relaunch out of 2005** the overlay shows the unlocked routes as cards, the locked ones greyed with what's
  missing. **Platform** (today's path: blog, then platform, then AI product) is always there, so nobody is stuck.
- **The route shapes 2011, 2018 and 2024**: each era's checklist, one or two features of its own per era, a signature
  pressure, a way of making money, the page's hero and names, and the ending's story.
- **Some routes split again** at the relaunch out of 2011, into a sub-route unlocked the same way by what you built in
  2011. Social media is too big for one road.

The routes (in game every company is a parody; the "like" column is for us):

| Route | Like | Unlocks with (by the end of 2005) | Signature pressure (a system we have) | Money | Sub-routes at 2018 |
|---|---|---|---|---|---|
| **Platform** | today's path | always | as today | as today | — |
| **Social network** | the big friends network | Blog 25 · Comments 15 | privacy: password leaks, and GDPR fines ×1.5 in 2018 | targeted ads | Friends feed · Professional network |
| **Photo sharing** | the photo app | Photo gallery 15 · Comments 10 | storage: server load ×1.5 | ads in the feed | Stories · Pinboard |
| **Microblog** | 140 characters | **Shoutbox** 10 · Comments 10 | virality: traffic spikes ×2, and a "fail walrus" page when the server gives | weak ads, kept alive by funding rounds | — |
| **Video site** | user video | Flash intro 10 · MIDI player 40 | bandwidth: server load ×2, hosting is the game | pre-roll ads: worth ×1.5, annoying ×1.4 | Creators · Streaming service |
| **Live streaming** | live channels | Webcam 10 (run two on) · Comments 10 | live chat: spam ×1.5, and server load | tips and subscriptions | — |
| **News site** | news and RSS | Blog 25 · Webring 40 · Learn RSS | breaking-news spikes; in 2024, AI answers take its clicks | ads, then a paywall | Newsroom · Aggregator |
| **Reviews** | reviews and maps | Map mashup 10 · Comments 10 | fake reviews: the spam hazard and its minigame | a cut of every booking | — |
| **Shop** | the online store | **Shop window** 10 · Photo gallery 5 | fraud (the password-leak hazard reskinned), and Black Friday spikes | sales: money per visitor without ads | Marketplace · Bargain bin |

- **Two small new 2005 features seed routes** that nothing before 2011 can: a **shoutbox** (the mid-2000s sidebar
  chat) for the microblog, and a **shop window** (products with "Buy now" buttons) for the shop. Like the run-two
  features, no checklist asks for them.
- **Comments are in five routes**, because in 2005 comments were what made a site social. The other condition is
  what tells the routes apart.
- **Live streaming needs the webcam**, a run-two feature, so it's a reason to play again: in run one its card says
  "from run two".
- **Not a route: the adult web.** The game is shared by link and played by anyone. Its history (online payments,
  streaming and pop-ups all grew up there) is a joke 1997's pop-ups already tell. At most, a card that never unlocks:
  "18+: Kevin's idea. Vetoed."

What a route changes, era by era (one example; every route gets the same treatment):

| Video site | 2011 | 2018 | 2024 |
|---|---|---|---|
| Checklist asks for | the video player at a high level, HTML5 video (Flash dies, as today) | recommendations; then Creators (a partner program) or Streaming service (subscriptions, originals) | the short-video feed, AI clips |
| Pressure | server load ×2 | copyright takedowns, a reskin of the spam minigame | AI-generated slop flooding uploads |
| Page | a grid of thumbnails and an upload button | autoplay, a "Up next" column | a vertical feed |
| Ending | "From a homepage with a MIDI file to the web's biggest video site." | | |

Data model:

```ts
type RouteId = 'platform' | 'social' | 'photos' | 'microblog' | 'video' | 'streaming' | 'news' | 'reviews' | 'shop';
type RouteCondition =
  | { readonly kind: 'feature-level'; readonly featureId: FeatureId; readonly level: number }
  | { readonly kind: 'skill'; readonly upgradeId: UpgradeId }
  | { readonly kind: 'from-run'; readonly run: number };
interface RouteDefinition {
  readonly id: RouteId;
  readonly unlock: readonly RouteCondition[];
  readonly eras: Readonly<Partial<Record<EraId, RouteEraDefinition>>>; // 2011, 2018, 2024
  readonly subRoutes: readonly SubRouteId[];
}
interface RouteEraDefinition {
  readonly gate: readonly EraGateRequirement[];
  readonly features: readonly FeatureId[];
  readonly effects: readonly UpgradeEffect[]; // the signature pressure and the money model
}
// state.unlockedRoutes: RouteId[] (ever reached), state.route: RouteId, state.subRoute: SubRouteId | null
```

- **The economy is effects.** A route's pressure and money model are `UpgradeEffect`s, summarized like the perks, so
  "server load ×2" or "ads ×1.5" needs no new engine code. What's new is checklists, a few features, and copy.
- **The page is the biggest cost.** Each era's page is built from feature sections, so a route keeps the era's look
  (the 2011 Bootstrap site, the 2018 landing page) and changes the hero, the section order and a block or two.
- **Balance:** one sim bot per route, one more entry in CI's matrix each, every route's eras in the usual band. The bot
  needs to chase an unlock on purpose, which is the one new piece of bot logic.

Order of work:

1. **The choice, visible.** Route definitions with their unlock conditions, the Routes list with progress from 1997,
   the unlock news, and the pick in the relaunch out of 2005. A route changes only the names, the hero line and the
   ending at first. This alone answers "what could my site become?" and lets the unlocks be felt and tuned.
2. **The first real route: Video site** in 2011. Its pressure is the most distinct (bandwidth), and it reuses the most
   (the 2011 video player, Flash dying, HTML5 video).
3. **Photo sharing and Social network** in 2011 (the photo gallery's masonry, share buttons, the activity feed).
4. **The shoutbox and the shop window**, then Microblog, Shop, News and Reviews in 2011.
5. **Through 2018 and 2024**, with the sub-routes at the relaunch out of 2011.

**Open questions for you:**

1. Should run two require a route you haven't taken, or only suggest one?
2. Should the archive show the routes you unlocked but didn't take, as "what could have been"?

## 6. Known issues, from the sweeps

- Idle play stalls in 2011: hazards pile up between five-minute check-ins. Offline progress covers a closed tab;
  an "away mode" (defenses auto-bought, minigames auto-lost at a cost) would cover an open one.
- A player who buys features faster than hosting can overload into a loop; the server tip is the only guard.
- The framework-spread check in CI runs one seed and sits within a few points of its limit on some seeds: it
  measures luck as well as balance. Three seeds, as the docs' own medians do, would make CI as stable as the
  balancing.
- Display-font digits ("2025" reads as "2029" at button size): numbers on buttons should use the numbers font.
- Quick fix is on 34–75% of the time (an infection fixed fast gives 60 seconds of +15% visitors, and infections are
  frequent), so its chip is nearly always showing: a buff that never ends reads as a constant. It predates the other
  buffs and the eras were paced with it, so changing it (say 20 seconds at +40%) means re-pacing every era: a
  decision of its own.
