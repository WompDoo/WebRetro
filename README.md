# Under Construction

An incremental game about building a website, from a bare `Hello World!` in 1997 to today.
Playable now: 1997 (personal homepage), 2005 (Web 2.0) and 2011 (social and mobile).
You write code to earn freelance money, learn HTML tag by tag, build features that bring
in visitors, place ads that pay for it all, and fight pop-ups, viruses, spam and SQL injections
with short minigames. Each era ends with a relaunch.

## Run it

```bash
npm install
npm run build      # writes dist/under-construction.html (one self-contained page)
```

Open `dist/preview.html` in a browser to play locally.

## Playtest

A hidden panel for testing any era without playing up to it. Turn it on with `?playtest` in the address
(for example `https://wompdoo.github.io/WebRetro/?playtest`), or tap the Money number five times quickly,
which also works inside the claude.ai preview and on phones. A 🧪 Playtest button then stays in the corner.

- **Jump to an era**: the start of any era, or its end with the checklist done and Launch ready. Presets are
  built from the game's own data (`src/engine/playtest.ts`), and a test checks every end preset passes its gate.
- **Your own game is safe**: the first jump backs it up; *Back to my own game* restores it.
- **Money** (+10 minutes of income, ×10), **any minigame** on demand, a **pop-up** or a **traffic spike**,
  and **game speed** 1×, 10× or 60× for testing idle play.
- *Hide the playtest button* turns it off again.

## Develop

```bash
npm run typecheck  # strict TypeScript, no emit
npm test           # unit tests (node:test)
npm run sim        # headless balance simulation: how long each era takes
```

`SIM_TIMELINE=active npm run sim` prints a minute-by-minute log for the scripted player.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run sim`: fails if any scripted player can't finish every era. Timing is printed, not enforced.

Each run uploads the built `under-construction.html` as an artifact, so every pull request has a playable copy.
Actions are pinned to commit SHAs; Dependabot opens weekly pull requests to keep them and the npm dev dependencies current.
Work happens on branches; a pull request merges into `main` once CI is green.

## GitHub Pages

`.github/workflows/pages.yml` publishes the game on every push to `main` (and on demand from the Actions
tab). It type-checks, tests and builds, then deploys `dist/preview.html` as the site's `index.html`.

One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Pages on a private repository needs a paid GitHub plan, and the published site is public either way.
Don't add a second Pages workflow (the settings page offers a Jekyll starter): the last deploy to finish
wins, and a Jekyll build of this repository is just the README.

## Layout

- `src/engine/`: the game itself. Pure TypeScript, no DOM. State in, state out.
  - `content/`: eras, features, skills and boosts, defenses. Adding content means adding data here.
  - `economy.ts`: everything derived from state (traffic, revenue, costs). Only money is stored.
  - `simulation.ts`: advances the game by elapsed time; offline progress never spawns hazards.
  - `snake.ts` and `minigames/`: the rules of every minigame, one pure module each.
- `src/ui/`: a thin DOM layer that renders the state and turns clicks into engine actions.
  - `main.ts` starts the game; `store.ts` holds the one mutable game state; `actions.ts` maps every
    `data-action` button to an engine action; `renderer.ts` re-renders what changed, by signature.
  - `sites/`: the fake website, one layout per era, built from shared feature blocks.
  - `minigames/`: one modal shell that runs any minigame, plus a small view per game.
  - `issues.ts` and `render-issues.ts`: the issue tracker, as data and as era-styled markup.
  - `editor-buffers.ts`: what's typed in each editor tab, pure so it can be tested; `code-editor.ts` draws it.
  - `browser-chrome.ts`: the browser around the site: address, status bar, and the Desktop/Phone switch.
- `src/styles/95-phone.css`: the phone layout (bottom tabs, sticky stats); everything above 780px is untouched by it.
- `src/page.html`: the page markup. Styles and the game script are inlined at build time.
- `src/styles/`: the stylesheet, one file per area. Files are joined in name order, so the number
  prefix is the cascade order: a later file wins a tie.
- `sim/`: the balance simulation. `tests/`: unit tests.
