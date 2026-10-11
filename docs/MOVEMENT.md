# Movement

How DOMED's movement works, and the Roblox engine behavior it is built around. The code is
`src/client/movement.ts`; tuning lives in `MovementConfig` in `src/shared/config.ts`.

Keep this file in step with the code. When a change works around engine behavior, add it
to [Engine quirks](#engine-quirks) so it isn't undone later.

## Moves

| Move        | Input                                                                    | Config                                        |
| ----------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| Air strafe  | A or D while turning the mouse in the air                                | `airAccelerate`, `airSpeedCap`, `maxAirSpeed` |
| Bunny hop   | Hold Space, or scroll, through landings                                  | `bhopWindow`, `bhopSpeedLoss`                 |
| Double jump | Space in the air                                                         | `doubleJumpVelocity`                          |
| Wall jump   | Space in the air next to a wall                                          | `wallJump*`, `maxWallJumps`                   |
| Wall slide  | Hold into a wall while falling                                           | `wallSlide*`                                  |
| Slide       | Ctrl or C while running fast; hold it on landing to slide out of the air | `slide*`                                      |
| Dodge       | Double-tap W, A, S or D on the ground                                    | `dodge*`                                      |

Every move after double jump has an `...Enabled` switch so it can be trialled and cut. Use
`/map MovementLab` in Studio to test them.

## Who owns velocity

The Humanoid and this module take turns, and most bugs come from both trying at once.

- **On the ground**, the Humanoid moves the character. The exception is a slide, which is
  driven _through_ the Humanoid rather than around it (see Slide).
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

**Walls in the air.** Because the module sets velocity directly, it handles walls itself:
a spherecast along the velocity removes the into-wall component so players slide along
walls. If physics reports less than 30% of the intended speed, something blocked the
player and the module adopts the measured velocity.

**Double jump** sets vertical speed and redirects horizontal momentum toward the input
direction, keeping at least walk speed.

**Wall jump.** Space in the air probes eight horizontal directions for a wall within
`wallJumpRange` of the body. Speed along the wall is kept, and the player is pushed away
from it (`wallJumpPush`) and up (`wallJumpVelocity`). The same wall can't be used twice in
a row, so two facing walls can be climbed but a single wall can't. Wall jumps don't use the
double jump. Each kick climbs about 6 studs; a full climb is about 25 to 30 studs.

**Wall slide.** While falling faster than `wallSlideFallSpeed` with the wish direction
pointing into a wall in reach, fall speed is capped at `wallSlideFallSpeed`.

**Slide.** Starts above `slideMinSpeed`, boosted to at least `slideStartSpeed`, and loses
`slideFriction` of its speed per second until it drops below 75% of walk speed or lasts
`slideMaxTime`. Each step sets the Humanoid's `WalkSpeed` to the slide speed and calls
`Move` with the slide direction, so the Humanoid itself carries the slide. The camera drops
by `slideCameraDrop`; the head hitbox does not move. Jumping out carries the slide speed
into the air.

**Dodge.** Two presses of the same movement key within `dodgeDoubleTapWindow` on the ground
launch the player in that direction relative to the camera, with `dodgeCooldown` between
dodges.

**Launches** (`launchCharacter`) are used by jump pads, dodges and body-shot knockback. From
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
   Humanoid is walking is cancelled within a physics step. Fix: drive ground movement
   through the Humanoid by setting `WalkSpeed` and calling `Move`.
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
   server can't push a player by setting velocity. Knockback is sent to the victim's client
   through the `Knockback` remote.
7. **`Workspace:Spherecast` ignores parts the sphere starts inside.** The wall probe starts
   at the root, so it relies on the root never being inside a wall.
