# Architecture

## Source layout

`src/shared`, `src/server`, and `src/client` compile into `out/` and are synced by Rojo to
`ReplicatedStorage.TS`, `ServerScriptService.TS`, and `StarterPlayerScripts.TS`
respectively. Gameplay tuning lives in `src/shared/config.ts`.

## Remotes

RemoteEvents are declared as instances in `default.project.json` under
`ReplicatedStorage.Remotes`, and given TypeScript signatures in `src/shared/remotes.ts`.
Adding a remote means updating both; a remote missing from the project file makes
`WaitForChild` hang forever.

The server receives remote arguments as `unknown` and validates them before use.

## Match flow

`server/match/controller.ts` runs matches back to back:

1. **Playing.** Load the map, create the mode, and deploy every player. Players who join
   mid-match start in the menu and deploy with Play.
2. **Results.** Combat and respawns stop and the podium shows.
3. **Voting.** Everyone returns to the menu and votes on the next map and mode.

Match state that clients need (phase, timer, scores, flag status, vote options) lives as
attributes on `ReplicatedStorage.MatchState`, typed in `shared/matchState.ts`. Attributes
reach players who join mid-match, which one-off remote events would miss.

Characters never load on their own (`CharacterAutoLoads` is off). `server/spawning.ts`
decides who is deployed, where they spawn, and when they respawn.

## Game modes

Each mode is a class implementing `GameMode` (`server/match/modes/types.ts`). It sets
combat rules (who can damage whom), picks spawns, reacts to deaths, and reports when a win
condition is met. Deathmatch and CTF live alongside it.

## Movement

On the ground the default Humanoid handles walking. In the air, `client/movement.ts` takes
over horizontal velocity, because the Humanoid's air control would pull the player back
toward `WalkSpeed` and make bunny hopping impossible. Air acceleration follows Half-Life's
`PM_AirAccelerate`: only velocity along the input direction is capped, so strafing while
turning gains speed. Landing and jumping again within `bhopWindow` keeps that speed.

The same module adds the rest of the kit: double jump, wall jump, wall slide, slide (which
also overrides the Humanoid on the ground) and a UT-style double-tap dodge. Each has an
`...Enabled` switch in `MovementConfig` so moves can be trialled and cut.

Because the module sets velocity directly, it has to handle walls itself: a spherecast
removes the into-wall component of velocity so the player slides, and if physics reports a
much lower speed than intended, the module assumes something blocked the player and adopts
the physics velocity.

## Hit detection

The client raycasts and reports what it hit. The server checks the claim is plausible (fire
rate, shooter and target positions within a speed-based lag allowance, line of sight through
the arena) before awarding a kill. Fast targets with small hitboxes make purely server-side
raycasts miss under normal latency. The tradeoff is that a cheating client can still claim
hits that pass these checks.

## Maps

Maps are Models with tagged marker parts and attributes. See [MAPPING.md](MAPPING.md) for
the conventions. `server/maps/loader.ts` clones a map into the workspace and turns its
markers into spawns, flag bases and jump pad velocities. `server/maps/library.ts` collects
Studio-authored maps from `ServerStorage.Maps` and maps still defined in code.
