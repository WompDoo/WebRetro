# Playing it as different people

The balance sim (`npm run sim`) plays two well-tuned bots and fails CI when an era leaves its 45–60 minute window.
It answers "is the pacing right for a good player?" and nothing else. This is the other question: **what happens
to everyone else?**

`npm run players` plays the whole game, 1997 to the ending, as nine kinds of player, using the same bot (`sim/bot.ts`)
with a different policy each. It reports each era's time, where a player gets stuck (an era over three hours), and
anything the engine should never do: money that isn't a number, pop-ups or infections piling up without end, debt.
`SIM_START=social-2011` starts from an era's playtest preset, which finds each era's problems without playing the
ones before it. It isn't a CI gate: it's a tool for finding design problems, and slow players are allowed to be slow.

## The players

| Player | Plays like |
|---|---|
| optimizer | the balance bot: 6 keys/s, best payback, fixes trouble in 3 s |
| casual | 2 keys/s, looks at the shop every 20 s, takes 30 s to notice trouble |
| idle | plays actively for 20 minutes, then stops typing and checks in every 5 minutes |
| ad-free | never places an ad |
| ad-heavy | fills every ad slot before anything else |
| ignores-trouble | never closes a pop-up, plays a minigame, renews a certificate or buys a defense |
| skips-minigames | does the one-click chores, never plays a minigame, buys the defense a ticket names |
| no-framework | sits out the framework wars: never learns React, Angular or Vue |
| buys-everything | buys whatever is cheapest, useful or not, until only the savings are left |

Every player reads the tips: a visit to the shop ends by doing what the tip says, where the tip names a button.

## What we found

### 1. The casual player never left 1997 (fixed)

A player who takes half a minute to close a pop-up was still in 1997 after three hours, at 62.6K of the 70K
visitors a second the checklist asked for, with the money long saved.

Why: late in an era the features stop paying back (a level costs 50,000 seconds of income), so traffic levels off.
1997 levels off at about 77K a second for anyone, and the goal was 70K: 91% of the ceiling. The checklist counted
*live* visitors, and each open pop-up costs 10% of them, so one pop-up open at the wrong moment was enough
(77K × 0.9 = 69.3K). A casual player usually has two or three open. **The goal was a cliff, not a slope.** Starting
the casual player at 2005, 2011 or 2018 finished every later era: 1997 was the only cliff.

Solutions tried:

| Fix | Result | Verdict |
|---|---|---|
| Lower the 1997 goal | Works for this bot; any player a little slower falls off the same cliff; the checklist still ticks and unticks as pop-ups come and go | Tuning a number to one bot |
| Latch the goal once reached | Needs new state; a lucky traffic spike would tick it | Rewards luck |
| **Count visitors on a usual day** | Gate counts the site without the trouble of the moment (pop-ups, infections, an expired certificate) *and without the luck* (traffic spikes, the quick-fix bonus). Trouble still costs income | **Chosen** |

`calculateUsualVisitorsPerSecond` is the checklist's measure now; the HUD still shows live visitors. The rule reads
both ways: **trouble shouldn't untick the goal, and luck shouldn't tick it.** The second half mattered: the balance
bots fix trouble in three seconds and so often carry the quick-fix bonus, which used to tick the old goal early.
Without it, 1997 took the active bot 41 minutes instead of 35, so the goal came down to 65K, which puts 1997 back at
32 minutes. The same luck had been carrying 2018 and 2024: the bots' visitors at those relaunches (500B–2T, 50–200T)
were spike numbers. 2018's goal went from 150B to 100B and 2024's from 15T to 11T. In 2018 that barely moved the time:
there the change works through the bots' saving (once the visitors goal is ticked, a bot only buys what speeds up
the savings), not through visitors. The checklist row's tooltip says pop-ups and outages don't count.

### 2. An ad too many holds the goal out of reach (fixed)

The buys-everything player placed a sixth banner in 1997. Each ad drives visitors away, and with traffic levelled off
that ad alone held the site at 62K for good. Nothing told the player.

Fix: `isVisitorsGoalBlockedByAds` checks whether one ad fewer would meet the visitors goal, and a tip says exactly
that: "Your ads drive away just enough visitors to miss the goal: with one fewer, you'd reach it. Remove one under
Ops." It teaches the trade-off the ads row describes in numbers. With it, buys-everything left 1997.

### 3. A player who spends everything before an ad earns nothing (fixed, small)

At the very start a player can spend their typed money on tags and a feature before placing an ad, and sit at $0 a
second; only typing gets them out. Not a softlock (typing always works), but a dead end for a confused new player.
Fix: **the first banner is free**, as 1997's banner exchanges were (your banner on their sites, theirs on yours). The
shop button says "+ Free". It costs the balance nothing measurable (1997: 40.9 vs 41.0 minutes).

### 4. Debt happens, and is meant to

The optimizer's money dipped to −$1.8Q in 2024. That's a GDPR fine (about 67 seconds of revenue) arriving after the
bot spent its money, and the first debt is a hallucination refund right after the 2024 relaunch. Both are designed
("a fine can take you below zero: the next income pays it back") and repay in about a minute. Kept as it is.

### 5. Ignoring all trouble stops you in 1997 (by design, documented)

The ignores-trouble player stayed in 1997: five pop-ups always open (0.9⁵ = 59% of traffic) and two dead features.
With the usual-day goal the checklist no longer counts those against it, but the money comes in at half speed. The
game is about keeping a site running; a player who never does is meant to stall. Every hazard has a passive fix, so
the realistic version of this player is the next one.

### 6. Skipping every minigame works, slowly

The skips-minigames player finishes every era by buying the defense each ticket names: 398 minutes against the
balance bot's 213. It's the design's promise (every hazard has an active fix and a passive fix) tested end to end.
Before it bought those defenses, 1997 took it 87 minutes; now 39. The bot values a purchase by the income it adds, so
insurance always looks like a loss. That's a bot limit, not a game one: the ticket names the defense, and a player
reads it. 2011 (111 min) and 2024 (117 min) stay slow: their hazards (password leaks, DDoS; scrapers, hallucinations)
are the ones whose defenses cost the most. A cheaper passive path there is an open question, not a bug.

### 7. Sitting out the framework wars costs about 40 minutes

no-framework finished, 2018 in 69 minutes and 2024 in 81 (optimizer: 56 and 56). The Bootstrap page keeps working,
it just can't build what the frameworks unlock. A fair price for a principled stand.

### 8. Ad-free can't leave 1997 (by design, an idea for later)

Typing alone can't save $6.5M. Ads are the economy, so this is expected, but "no ads" is a natural challenge run:
see `future.md` (a tip jar, memberships, sponsorship as the ad-free economy).

### 9. Idle play stops in 2011

idle got through 1997 (116 min) and 2005 (157 min), then stalled in 2011: pop-ups and infections pile up between
five-minute check-ins, and 2011's hazards need answering. This is a typing game first; idle progress is a bonus, and
offline progress already covers a closed tab. Documented, not changed.

### 10. buys-everything stalls in 2011

It buys features faster than hosting, the server overloads (down 11% of the time), and it never settles into saving.
A person gets the server-overload tip; a bot that can't reason about hosting doesn't. Documented as a bot limit.

## How the harness is built

- `sim/bot.ts` is the bot both sims share: what it can buy, how it scores, how it reacts. Extracted from the balance
  sim, whose output was then diffed against a saved run of the same seed: **identical**, so the refactor changed
  nothing it shouldn't.
- A profile names its policy by id (`'neutral'`, `'ad-free'`, …), and the policy functions live in a table in
  `bot.ts`. The balance sim sends profiles to worker threads, and a function can't cross that boundary (structured
  clone): the first version passed functions and crashed with `DataCloneError`. Same rule as server-rendered state
  sent to the browser: only data crosses.
- `tests/gate-fairness.test.ts` pins the three engine rules: the usual-day count, the ad-too-many check and tip, the
  free first banner.

## Final numbers

Seed 1997, on the rules above. Minutes per era; "stalls" means more than three hours in that era.

| Player | 1997 | 2005 | 2011 | 2018 | 2024 | Total |
|---|---|---|---|---|---|---|
| balance bot, active (CI) | 32 | 44 | 43 | 49 | 45 | 213 |
| balance bot, relaxed (CI) | 43 | 55 | 57 | 68 | 65 | 288 |
| casual | 62 | 80 | 91 | 93 | 100 | 426 |
| skips-minigames | 39 | 70 | 111 | 61 | 117 | 398 |
| ad-heavy¹ | 38 | 44 | 50 | 54 | 61 | 247 |
| no-framework¹ | 32 | 48 | 51 | 69 | 81 | 281 |
| idle¹ | 116 | 157 | stalls | | | |
| buys-everything¹ | 138 | 166 | stalls | | | |
| ad-free¹ | stalls | | | | | |
| ignores-trouble¹ | stalls | | | | | |

¹ From runs before the last retune (1997 at 70K, 2018 and 2024 at the old goals). The ones that finished would
finish a little faster now; the ones that stall do so for reasons the retune doesn't touch.

What it says about the game: every player who answers trouble one way or another finishes. A casual player's full
game is about seven hours, which is long; the casual eras run 60–100 minutes against a 45–60 target. That's the
next pacing question: whether the target should be a range per kind of player rather than per bot.
