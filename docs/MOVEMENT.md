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
| Rocket jump | Right-click at a nearby surface           | `rocketJump*`                                 |

**Walk speed** is 32 studs/s (`walkSpeed`), raised from 26 after the move to instagib: the
owner wanted base movement noticeably faster, since moving is how players survive one-hit
kills. Air acceleration scales with walk speed (as Quake's does with the wish speed), so
strafing also gains speed about 23% faster. The 140 cap is unchanged.

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

**Rocket jump** (right-click, in `client/weapon.ts`; the push is `rocketJumpCharacter` in
`movement.ts`) works like a TF2 Soldier's. Right-click fires a normal rail shot (same beam, no explosion) along the look
direction. Where it lands, it blasts the shooter away from that point, if the point is within
`rocketJumpRadius` (20 studs) of their root. Inside `rocketJumpFullRadius` (10 studs) the
blast is full strength (`rocketJumpVelocity`, 90 studs/s), fading linearly to nothing at 20.
Aim at your feet to go straight up (about 20 studs high at normal gravity), down and behind you
to launch forward, or at a wall to kick off it. Aiming at open sky does nothing.

- **Jump first, then blast.** As in Quake and TF2, the best rocket jump is a jump followed by a
  blast at the floor: the blast adds to the jump's upward speed, and in the air no ground
  friction eats the horizontal momentum. The full-strength radius is 10 studs so a blast at
  the top of a jump (the root is about 3 studs above the feet, plus 7.5 studs of jump) still
  gets full strength. It was 4 studs (fading to nothing at 12), which made jump-then-blast
  weak or dead, the opposite of how it should feel.

- **No damage.** The shot never hits anyone; kills stay on left-click. The server sees it as a
  missed rail shot, so other players see the beam.
- **Shares the rail's cooldown.** One weapon with two fire modes: a rocket jump uses up your
  shot (0.75 s, halved by Overcharge), so jumping away costs you a shot. The server's fire-rate
  check covers both.
- **No airtime limit.** The surface requirement already stops endless flight in open air;
  blasting up a wall again and again is a skill, as in TF2. Watch for players climbing onto
  roofs maps weren't built for.
- **It can pass the speed cap.** A blast raises the air speed cap to the new speed, and the cap
  then eases back to `maxAirSpeed` at `rocketJumpSpeedDecay` (100 studs/s per second).
  Strafing can't hold the extra speed because the cap only goes down. Flag carriers keep
  `carrierMaxSpeed`. The server's speed check allows for the blast (`movementCheck.ts`), and
  top-speed records still ignore anything past `maxAirSpeed` + 10, so records stay about
  strafing.
- **An upward blast cancels any fall first**, so it always lifts.

Why: the move to instagib (WEAPON.md) followed Ratz Instagib, whose
[Steam page](https://store.steampowered.com/app/338170) describes a dedicated rocket-jump
button that makes moving targets harder to hit. How Ratz's rocket jump works in detail wasn't
researched; the mechanics here follow TF2's Soldier, which the owner named. Any hit kills, so
a quick way out of a sightline matters more. It takes right-click from the removed shove.

History and rejected options:

- **First version pushed along the look direction** (look up to fly up), from a misreading of
  the request. The owner wanted the TF2 rocket jump: shoot, and fly away from the shot.
- **Rejected: recoil that works anywhere** (aim down to fly up, even mid-air). Simpler, but
  loses the surface skill; the owner picked the TF2 blast.
- **Rejected: the rocket shot killing**, either as a second rail shot or with blast damage. It
  would add a second way to kill; nobody dies to a rocket jump they didn't aim at them.
- **Rejected: rocket jump plus shove on one button** (blast a player to push them, a surface
  to launch yourself). Too complex to read; the owner preferred separate controls.
- **Strength.** It started at 80 studs/s; the owner found it far too
  weak for a movement shooter, so it went to 180, then was halved to 90 after the owner tried it. Untested in Studio. Maps built before it
  may have roofs and ledges that are now reachable; check them with `npm run preview` and in
  playtests.

**Launches** (`launchCharacter`) are used by jump pads and the rocket jump. From
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
