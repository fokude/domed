# DOMED: Headshot Arena

A Roblox arena shooter in the style of Quake and Unreal Tournament. Bunny hop, air strafe,
and double jump around the map. The only weapon is a railgun, and only headshots kill.
Body shots knock the target back.

Written in TypeScript with [roblox-ts](https://roblox-ts.com) and synced into Roblox Studio
with [Rojo](https://rojo.space).

Built for 5v5: Team Deathmatch, Capture the Flag, Domination and Hardpoint, plus
free-for-all Deathmatch. Team modes appear once enough players are in a server (4, or 6 for
CTF); smaller lobbies play a shorter free-for-all. Perk orbs (Super Jump, Shield, Overcharge, Radar) spawn at fixed spots on
every map. When
publishing, set **Max Players** to 10 in Studio's Game Settings (Places tab); player count
isn't set in code.

## Prerequisites

- [Roblox Studio](https://create.roblox.com)
- [Node.js](https://nodejs.org) 20.19 or newer
- [Rojo](https://rojo.space/docs/v7/getting-started/installation/) 7.7, both the CLI and the
  Studio plugin. The plugin version must match the CLI; `rojo plugin install` installs the
  matching one.

## Getting started

```sh
npm install
npm run watch    # recompiles src/ into out/ on save
```

In a second terminal:

```sh
rojo serve
```

Then in Studio:

1. Open any place. A new Baseplate works; the game removes the template's baseplate and spawn.
2. Open **Plugins → Rojo** and click **Connect**.
3. Press **Play**. Use **Test → Clients and Servers** with two or more players to test combat.

### Testing in Studio

Type these in chat during a Studio playtest. They're ignored on live servers.

| Command               | Does                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| `/map <MapId> [mode]` | Switch to that map right away, e.g. `/map InfernalSpire`                       |
| `/end`                | End the match, then show results and start the warm-up                         |
| `/openness`           | Measure the current map's openness and spawn exposure (see docs/MAP_DESIGN.md) |
| `/bots [count]`       | Fill free-for-all to this many players and bots; no count restores the default |

`/map TestRange [mode]` loads the test map, for trying every feature solo: training dummies
that move like players (static, strafing, circling, fast, hopping, shielded, and a cluster for
multi-kills), all four perks on 5-second respawns, two control points (add `Domination` or
`Hardpoint`), a bhop strip and jump pads.

## Scripts

| Command          | Does                                                 |
| ---------------- | ---------------------------------------------------- |
| `npm run build`  | Compile once                                         |
| `npm run watch`  | Compile on save                                      |
| `npm run lint`   | ESLint and Prettier checks                           |
| `npm run check`  | Lint and compile: what CI runs, minus the Rojo build |
| `npm run format` | Fix lint formatting and format the Markdown docs     |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code fits together.
To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md); [AGENTS.md](AGENTS.md) has the rules
that humans and coding agents both follow.
