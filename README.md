# DOMED: Headshot Arena

A Roblox arena shooter in the style of Quake and Unreal Tournament. Bunny hop, air strafe,
and double jump around the map. The only weapon is a railgun, and only headshots kill.
Body shots knock the target back.

Written in TypeScript with [roblox-ts](https://roblox-ts.com) and synced into Roblox Studio
with [Rojo](https://rojo.space).

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

## Scripts

| Command | Does |
|---|---|
| `npm run build` | Compile once |
| `npm run watch` | Compile on save |
| `npm run lint` | ESLint and Prettier checks |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code fits together.
