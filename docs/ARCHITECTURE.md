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

## Movement

On the ground the default Humanoid handles walking. In the air, `client/movement.ts` takes
over horizontal velocity, because the Humanoid's air control would pull the player back
toward `WalkSpeed` and make bunny hopping impossible. Air acceleration follows Half-Life's
`PM_AirAccelerate`: only velocity along the input direction is capped, so strafing while
turning gains speed. Landing and jumping again within `bhopWindow` keeps that speed.

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

## Map

`server/mapBuilder.ts` builds the arena from code at server start, so the map is in source
control and reviewable in diffs. Jump pad launch velocities are computed from the target
landing point, so moving a pad or its target keeps it accurate.
