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

Numbers it builds on (`player-types.md`): the balance bot finishes in about 3.5 hours, the relaxed bot in about 4.5,
a casual player in about 7. Any plan that only adds time makes the casual player's game too long already.

## 1. Prestige: start a new site, carry a legacy

The game is already about relaunching: every era is a fresh start that keeps what mattered. Prestige is that same
move one level up: **the ending is the relaunch, and 1997 is the next era.**

**Currency: Backlinks.** Earned at the ending: one per order of magnitude of lifetime visitors past a threshold
(`floor(log10(visitors)) − 10`, so a typical first run earns 4–6), plus one per era finished under 45 minutes. Log
scale, so the second run can't earn ten times the first by playing ten times longer. The name fits: backlinks are
what an old site leaves to a new one.

The ending's choice was considered as a carry-over (sold: exit money; kept: your domain) and **decided against**:
Sell / Keep stays a story beat. Every finished run earns Backlinks the same way.

**What Backlinks buy** (permanent and small; the first version has the two the decision picked):

| Perk | Effect | Why it's safe |
|---|---|---|
| **Muscle memory** | Typing earns 10% more per level | Typing is a fixed share of income (14–26%); can't run away |
| **Regulars** (bonuses for the buildables) | Every feature brings 5% more visitors per level of the perk | A flat share on everything built: it shortens every era a little and makes no single build mandatory |
| Known tags (later) | Start each era with its first skill learned | Skips the slowest minute of each era, not its decisions |
| Early warning (later) | Hazards' first spawn comes 2 minutes later in each era | Shortens the scariest moment, keeps the hazard |
| Ops runbook (later) | Ops items cost 20% less | Ops are era-bound already |

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
3. The 2000 crash half-era for run three.

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

## 5. Known issues, from the sweeps

- Idle play stalls in 2011: hazards pile up between five-minute check-ins. Offline progress covers a closed tab;
  an "away mode" (defenses auto-bought, minigames auto-lost at a cost) would cover an open one.
- A player who buys features faster than hosting can overload into a loop; the server tip is the only guard.
- The framework-spread check in CI runs one seed and sits within a few points of its limit on some seeds: it
  measures luck as well as balance. Three seeds, as the docs' own medians do, would make CI as stable as the
  balancing.
- Display-font digits ("2025" reads as "2029" at button size): numbers on buttons should use the numbers font.
