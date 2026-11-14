# The ending

Finishing 2024's checklist finishes the game. Before this, the last era's button opened a card with four
numbers on it. Five eras of work deserve more than that.

## What an ending has to do

1. **Pay off the core fantasy.** The game is "your website through web history". The ending should show
   *your* site, not a generic one, through all of it.
2. **Use what the player did.** The site name, the framework, what they bought, how big it got.
3. **Keep the tone.** Affectionate satire of the web industry, never cynical about the people who build for it.
4. **Give the last era's theme a point.** 2024 is about AI eating the web; the ending should take a side,
   or let the player take one.
5. **Leave a door open** for replay and a prestige system (see `future.md`).

## The candidates

Five candidates were considered. Three were built and played on desktop and phone (`tests/ending.test.ts`
and a Playwright walkthrough of every act); two were rejected on paper.

| | Idea | Core fantasy | Uses your game | Tone | 2024 theme | Replay hook | Cost |
|---|---|---|---|---|---|---|---|
| **A. The Web Attic** | A Wayback-style archive: pick a year, scroll your site as it was the day you relaunched it | Strongest: it *is* the fantasy | Every page, every purchase, real numbers | Nostalgic | None on its own | Low | Medium: needs per-era records |
| **B. The exit** | A parody AI giant buys the site; "Our incredible journey" post; your 1997 guestbook becomes training data | Weak alone | Offer is 10× your lifetime earnings | Sharp satire | Strong: AI swallows the web | Medium | Low |
| **C. Full circle** | You keep it, open Notepad, type `<H1>Hello World!</H1>`; the small web is back | Medium | Your first page, your name | Warm | Strong: the human web answers back | Medium | Low |
| D. The AI takes over | The site's assistant starts writing the site; you're locked out | Weak | Little | Bleak | Strong | None | Medium |
| E. Link rot | The host shuts down, the site is a 404, only the archive remembers | Medium | Little | Bleak | Weak | None | Low |

D and E were rejected: both end on the player losing what they built, with no choice in it. That's a
fine short story, but a poor reward for four hours of play.

## Decision: A, then a choice between B and C

- **Act 1, the Web Attic (A)** is always shown. It's the only candidate that pays off all five eras, and it
  costs nothing the game shouldn't have anyway: a record of each era (`EraRecord`) taken at every relaunch.
  The page is drawn again by the game's own era renderers, from a snapshot of the parts of the state that shape
  a page, so the 1997 page in the archive is the one the player actually had, address included.
- **Act 2, one more email**: an acquisition offer from Omnivore AI. **Sell it** (B) or **Keep it yours** (C).
  B and C were the two best candidates, and they disagree with each other, which makes the choice mean
  something. It's also the only decision in the ending, and the first thing in the game that asks the player
  what they *think* rather than what they can afford.
- **Act 3, the credits**: a row per era (time played, visitors and earnings when it ended), the lifetime
  totals, then Back to the attic, Start over, or Keep playing.

The finish button becomes **Watch the ending again**, so the attic stays reachable after Keep playing.

## How it's built

- `src/engine/era-records.ts`: `createEraRecord`, `recordEra` (in `advanceEra`, before the relaunch and at
  the finish; a second finish replaces the record, never adds one), `listEraRecords`, `calculateEraDurationsMs`.
- `SiteSnapshot` is a `Pick<GameState, …>` of the nine fields that decide what the page looks like. Saves made
  before a feature existed restore it at level 0 inside old records, as they do for the live game.
- `src/ui/ending.ts`: one pure function per act, so the tests read the same markup the player sees. The archive
  renders `renderSite` into a `.site` box that scrolls but takes no clicks (`pointer-events: none` inside).
- Playtest presets carry believable records for the eras before them, so `ai-2024:end` → Finish shows the
  whole ending.

## Findings from playing it

- The overlay is a grid, so the card's minimum width was the archive's unbreakable address line: on a phone
  the card ran off the screen. `min-width: 0` on the card fixed it.
- The playtest preset offered less than the money in hand: its lifetime earnings left out the era's own
  budget. Fixed in the preset (a real game can't get there: money is always part of lifetime earnings).
- The display font draws "2025" so it reads as "2029" at button size; the button says "What happened next"
  instead.
- A 20-digit visitor count wraps badly in the credits tile; the credits use the game's compact numbers. The
  "incredible journey" post keeps the full number, where its length is the joke.

## Not done yet

- The choice has no consequence after the credits. It's the natural hook for New Game+ (see `future.md`):
  selling could fund the next run, keeping could carry the domain and a legacy bonus.
- The offer comes from one buyer. The original idea was several parody giants bidding, each wanting a
  different part of what you built (your users, your posts, your domain).
