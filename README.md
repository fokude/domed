# DOMED: Headshot Arena

A Roblox arena shooter in the style of Quake and Unreal Tournament. Bunny hop, air strafe,
and double jump around the map. The only weapon is a railgun, and only headshots kill.
Body shots knock the target back.

## Development

Written in TypeScript with [roblox-ts](https://roblox-ts.com), compiled to Luau, and synced
into Roblox Studio with [Rojo](https://rojo.space) 7.7.

```sh
npm install
npm run watch    # terminal 1: recompile src/ to out/ on save
rojo serve       # terminal 2: sync out/ into Studio
```

1. Open a Baseplate place in Roblox Studio.
2. Open **Plugins → Rojo** and click **Connect**.
3. Press **Play**. The arena is built from code at server start.

Use **Test → Clients and Servers** with two or more players to test combat.

Other scripts: `npm run build` compiles once, and `npm run lint` runs ESLint with Prettier.

## Layout

| Path | Lands in | Purpose |
|---|---|---|
| `src/shared/config.ts` | `ReplicatedStorage.TS` | Tuning for movement, weapon, and match |
| `src/shared/remotes.ts` | `ReplicatedStorage.TS` | Typed handles to the RemoteEvents |
| `src/server/main.server.ts` | `ServerScriptService.TS` | Match flow, scoring, shot validation |
| `src/server/mapBuilder.ts` | `ServerScriptService.TS` | Builds the arena, jump pads, and spawns |
| `src/client/main.client.ts` | `StarterPlayerScripts.TS` | Client entry point and camera setup |
| `src/client/movement.ts` | `StarterPlayerScripts.TS` | Air strafing, bunny hopping, double jump, jump pads |
| `src/client/weapon.ts` | `StarterPlayerScripts.TS` | Railgun firing and beam effects |
| `src/client/hud.ts` | `StarterPlayerScripts.TS` | Crosshair, speedometer, kill feed, banners |

`default.project.json` declares the RemoteEvents under `ReplicatedStorage.Remotes`. If you add
one, declare it there and add its signature to `src/shared/remotes.ts`.

## Design notes

**Movement.** On the ground the default Humanoid handles walking. In the air, `movement.ts`
takes over horizontal velocity and applies Half-Life-style air acceleration. Landing and
jumping again within `bhopWindow` keeps your speed.

**Hit detection.** The client raycasts and reports what it hit. The server checks that the
claim is plausible (fire rate, positions within a speed-based lag allowance, line of sight
through the arena) before awarding a kill. Fast targets with small hitboxes make purely
server-side raycasts miss under normal latency. The tradeoff is that a cheating client could
still claim hits that pass these checks.
