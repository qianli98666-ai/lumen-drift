# lumen-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/qianli98666-ai/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/qianli98666-ai/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumen Drift is an original arcade space-salvage game: pilot the skiff Kestrel through 10 waves of a drifting debris field, gather lumen shards, chain combos and choose 1 of 3 upgrades between waves — with a Warden boss every 5th wave, synthesized sound and a full title, upgrade, victory and restart loop.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: game/ is plain static files. Move with WASD or the arrow keys, aim with the mouse, hold click or Space to fire, Shift to dash, P to pause, M to mute. Clear wave 10 to clear the sector; press R on the end screen to fly again.

## How it is built

- `game/` — the playable game as static files: `index.html`, `css/game.css` and `js/` split by job (loop, input, audio, player, enemies, waves, upgrades, particles, render, screenshots).
- `main.ts` — the hand-in program (Node 22, standard library only): copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `screenshots/` — four real renders of the game's own code: title, play, upgrade choice and sector-cleared victory.
- `shots.json` — the `?shot=` scenes the screenshots were taken from.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ksr8yfyv&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
