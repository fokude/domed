# Movement

How DOMED's movement works, and the Roblox engine behavior it is built around. The code is
`src/client/movement.ts`; tuning lives in `MovementConfig` in `src/shared/config.ts`.

Keep this file in step with the code. When a change works around engine behavior, add it
to [Engine quirks](#engine-quirks) so it isn't undone later.

## Moves

| Move        | Input                                     | Config                                        |
| ----------- | ----------------------------------------- | --------------------------------------------- |
| Air strafe  | A or D while turning the mouse in the air | `airAccelerate`, `airSpeedCap`, `maxAirSpeed` |
| Bunny hop   | Hold Space, or scroll, through landings   | `bhopWindow`, `bhopSpeedLoss`, `hopBoost*`    |
| Double jump | Space in the air                          | `doubleJumpVelocity`                          |

Use `/map TestRange` in Studio to test movement on its bhop strip and jump pads. Wall jump, wall slide, slide and dodge
were tried and cut; see the git history if they come back.

## Who owns velocity

The Humanoid and this module take turns, and most bugs come from both trying at once.

- **On the ground**, the Humanoid moves the character.
- **In the air**, the module owns horizontal velocity. Every `RunService.PreSimulation` it
  reads the control script's `MoveDirection` as the wish direction, zeroes it so the
  Humanoid's air control does nothing, and writes `AssemblyLinearVelocity` itself. Vertical
  velocity is left to physics except for the overrides below.

The module tracks horizontal air velocity itself (`airVelocity`) rather than reading it
back each frame, because physics readings are disturbed by friction on takeoff frames.

## How each move works

**Air strafing** is Half-Life's `PM_AirAccelerate`. Only the component of velocity along
the wish direction is capped (`airSpeedCap`), so steering perpendicular to motion keeps
adding speed. Total speed is capped at `maxAirSpeed`, or at `carrierMaxSpeed` while carrying
a flag in CTF.

**Bunny hopping.** On the landing frame, if jump is held or the scroll wheel was used in
the last 0.1 s, the module forces a jump immediately. On takeoff, if the player spent no
more than `bhopWindow` on the ground, the stored air velocity carries over; otherwise air
velocity starts from the measured ground velocity.

**Hop boost.** Each chained hop below `hopBoostMaxSpeed` multiplies speed by
`1 + hopBoost`. At low speed each strafing push swings the velocity a long way, so strafing
alone gains slowly and feels sticky; the boost carries players through that range. Above
it, speed comes only from strafing.

**Walls in the air.** Because the module sets velocity directly, it handles walls itself:
a spherecast along the velocity removes the into-wall component so players slide along
walls. If physics reports less than 30% of the intended speed, something blocked the
player and the module adopts the measured velocity.

**Double jump** sets vertical speed and redirects horizontal momentum toward the input
direction, keeping at least walk speed.

**Launches** (`launchCharacter`) are used by jump pads. From
the ground they start a real jump and replace its vertical speed on the first airborne
frame. In the air they set velocity directly.

**Jump pads** are found by raycasting under the feet each physics step. A pad sets vertical
speed and adds its horizontal push to the player's momentum. The loader computes each pad's
push from its target part and the map's gravity (see MAPPING.md).

**Field of view** widens with speed, by up to `speedFovBoost`.

## Engine quirks

Roblox behavior the code depends on. Each was found in testing; check here before
simplifying the code it explains.

1. **Humanoid air control fights scripted velocity.** In the air, the Humanoid steers
   toward `MoveDirection * WalkSpeed` during the physics step, which undoes velocity set in
   `PreSimulation` and kills bunny hopping. Fix: zero `MoveDirection` with
   `Humanoid:Move(Vector3.zero)` every airborne `PreSimulation`, after reading it.
2. **The Humanoid brakes foreign velocity on the ground.** Velocity written while the
   Humanoid is walking is cancelled within a physics step. To script ground movement,
   drive it through the Humanoid by setting `WalkSpeed` and calling `Move`.
3. **`ChangeState(Freefall)` on the ground snaps back to walking.** The Humanoid sees the
   floor and lands again before a small upward velocity can lift it. Fix: start launches
   with `ChangeState(Jumping)`, then replace the vertical speed on the first airborne frame.
   Entering `Jumping` sets its own vertical speed, which is why the replacement waits a
   frame.
4. **`Touched` is unreliable for floor triggers.** R15 characters hover on `HipHeight`, so
   their feet often never touch a floor part. Fix: raycast down from the root instead.
5. **`UserInputService.MouseDeltaSensitivity` has no effect on the default first-person
   camera.** Sensitivity is left to each player's Roblox setting.
6. **Clients own their character's physics.** Movement must run on the client, and the
   server can't push a player by setting velocity. Anything that pushes a player has to run
   on, or be sent to, their client.
7. **`Workspace:Spherecast` ignores parts the sphere starts inside.** The wall probe starts
   at the root, so it relies on the root never being inside a wall.
