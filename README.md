# Under Construction

An incremental game about building a website, from a bare `Hello World!` in 1997 to today.
You write code to earn freelance money, learn HTML tag by tag, build features that bring
in visitors, place ads that pay for it all, and fight pop-ups, viruses (with a snake
minigame) and spam. Each era ends with a relaunch.

## Run it

```bash
npm install
npm run build      # writes dist/under-construction.html (one self-contained page)
```

Open `dist/preview.html` in a browser to play locally.

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
Work happens on branches; a pull request merges into `main` once CI is green.

## Layout

- `src/engine/`: the game itself. Pure TypeScript, no DOM. State in, state out.
  - `content/`: eras, features, skills and boosts, defenses. Adding content means adding data here.
  - `economy.ts`: everything derived from state (traffic, revenue, costs). Only money is stored.
  - `simulation.ts`: advances the game by elapsed time; offline progress never spawns hazards.
  - `snake.ts`: the virus-removal minigame rules.
- `src/ui/`: a thin DOM layer that renders the state and turns clicks into engine actions.
- `src/page.html`: markup and CSS for the page, with the game script inlined at build time.
- `sim/`: the balance simulation. `tests/`: unit tests.
