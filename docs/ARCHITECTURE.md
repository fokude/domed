# Architecture

## Source layout

`src/shared`, `src/server`, and `src/client` compile into `out/` and are synced by Rojo to
`ReplicatedStorage.TS`, `ServerScriptService.TS`, and `StarterPlayerScripts.TS`
respectively. Gameplay tuning lives in `src/shared/config.ts`.

## Where things live

**Shared** (`src/shared`, used by server and client)

| File             | Owns                                                          |
| ---------------- | ------------------------------------------------------------- |
| `config.ts`      | Every tuning value: movement, weapon, match and mode settings |
| `modes.ts`       | Mode and team ids, team colors, mode display names            |
| `remotes.ts`     | Typed handles to the RemoteEvents                             |
| `matchState.ts`  | Replicated match state attributes, and player attribute names |
| `mapMarkers.ts`  | Map marker tags and attribute names                           |
| `standings.ts`   | Player ranking (kills, then deaths)                           |
| `characters.ts`  | Safe reads of player characters                               |
| `progression.ts` | Saved profile types, and the XP-to-level curve                |

**Server** (`src/server`)

| File                  | Owns                                                           |
| --------------------- | -------------------------------------------------------------- |
| `main.server.ts`      | Entry point: wires the modules together                        |
| `combat.ts`           | Validating railgun shots, kills and knockback                  |
| `spawning.ts`         | Deploying players, spawn positions, respawns, spawn protection |
| `hazards.ts`          | Lava and falling out of the map                                |
| `movementCheck.ts`    | Flagging and kicking speed hacks and teleports                 |
| `analytics.ts`        | Onboarding funnel and custom events for the Creator Dashboard  |
| `stats.ts`            | Kills and deaths on the leaderboard                            |
| `data/profiles.ts`    | Loading and saving player profiles with ProfileStore           |
| `progression.ts`      | Recording lifetime stats into profiles                         |
| `rating.ts`           | Hidden team-mode skill rating                                  |
| `dev.ts`              | Studio-only chat commands                                      |
| `match/controller.ts` | The match loop: play, results, vote                            |
| `match/voting.ts`     | Map vote options and tallying                                  |
| `match/teams.ts`      | Red and Blue teams, balancing, team scores and spawns          |
| `match/modes/*.ts`    | One file per game mode                                         |
| `maps/loader.ts`      | Loading a map Model and reading its markers                    |
| `maps/library.ts`     | Finding maps: Studio-authored, and those still built in code   |
| `maps/kit.ts`         | Building blocks for maps built in code                         |
| `maps/openness.ts`    | The `/openness` measurement                                    |
| `maps/<name>.ts`      | Maps built in code, one per file                               |

**Client** (`src/client`)

| File               | Owns                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `main.client.ts`   | Entry point: camera setup and wiring server events to the UI          |
| `movement.ts`      | All movement (see MOVEMENT.md)                                        |
| `weapon.ts`        | Firing the railgun and drawing beams                                  |
| `menu.ts`          | Main menu and the orbiting menu camera                                |
| `mapVote.ts`       | Vote cards in the menu                                                |
| `hud.ts`           | Crosshair, hitmarker, cooldown, kill feed, banners, respawn countdown |
| `matchBar.ts`      | Timer and team scores at the top of the screen                        |
| `objectives.ts`    | Control point strip in Domination and Hardpoint                       |
| `onboarding.ts`    | The how-to-play card in the menu and one-time in-game tips            |
| `profileData.ts`   | Reading the local player's saved profile                              |
| `profileScreen.ts` | The Profile panel in the menu: level, XP and lifetime stats           |
| `podium.ts`        | Live top three in Deathmatch, and the end-of-match podium             |
| `speedometer.ts`   | Speed readout and its effects                                         |
| `teammates.ts`     | Teammate outlines                                                     |
| `ui.ts`            | The `create` helper for building UI                                   |

## Rules of the codebase

- **One owner per concern.** Before writing a helper, check `shared/`, `maps/kit.ts` and the
  owning module above; extend them rather than copying code.
- **Names and numbers live in one place.** Tuning goes in `config.ts`, marker names in
  `mapMarkers.ts`, replicated state in `matchState.ts`. Don't hard-code strings or numbers
  that another file also uses.
- **The server never trusts the client.** Remote arguments arrive as `unknown` and are
  validated; gameplay outcomes (kills, scores, captures) are decided on the server.
- **No circular imports.** If two modules need each other, move the shared piece into a third
  module, or pass a callback (as `spawning.ts` does with its handlers).

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

Matches only run while someone is in the server: the loop waits for the first player and
ends a match early if everyone leaves. Modes are offered by player count (`ModeMinPlayers` in
`config.ts`): below four players the server sticks to free-for-all, which shortens itself for
small lobbies.

Match state that clients need (phase, timer, scores, flag status, vote options) lives as
attributes on `ReplicatedStorage.MatchState`, typed in `shared/matchState.ts`. Attributes
reach players who join mid-match, which one-off remote events would miss.

Characters never load on their own (`CharacterAutoLoads` is off). `server/spawning.ts`
decides who is deployed, where they spawn, and when they respawn.

## Game modes

Each mode is a class implementing `GameMode` (`server/match/modes/types.ts`). It sets
combat rules (who can damage whom), picks spawns, reacts to deaths, and reports when a win
condition is met. Deathmatch, Team Deathmatch, CTF, and Domination and Hardpoint (one
class, `controlPoints.ts`) live alongside it; the team modes share
`TeamRoster` (`server/match/teams.ts`) for teams, balancing, scores and spawns.

Teams are balanced within each server by a hidden skill rating (`server/rating.ts`, the
OpenSkill Weng-Lin Bradley-Terry model). At match start players are split strongest first, each
to the team with less total skill while sizes stay within one; mid-match joiners go to the
smaller team, or the weaker one if sizes match. Team matches update the rating; free-for-all
doesn't. The rating is saved in the profile but never sent to clients, so there's no visible
number to protect.

## Movement

Movement runs on the client, layered on top of the default Humanoid. See
[MOVEMENT.md](MOVEMENT.md) for each move and the engine behavior it depends on.

## Hit detection

The client raycasts and reports what it hit. The server checks the claim is plausible (fire
rate, shooter and target positions within a speed-based lag allowance, line of sight through
the arena, and that the shot doesn't go well behind or beside the way the shooter faces) before
awarding a kill. Rejected shots are logged with `[anticheat]` in the server output. Fast targets with small hitboxes make purely server-side
raycasts miss under normal latency. The tradeoff is that a cheating client can still claim
hits that pass these checks.

Movement is also client-simulated, so `movementCheck.ts` samples each character twice a second
and kicks players who repeatedly move far faster than the game allows (speed hacks,
teleports). Its thresholds are lenient so lag spikes don't cause false kicks.

## Maps

Maps are Models with tagged marker parts and attributes. See [MAPPING.md](MAPPING.md) for
the conventions. `server/maps/loader.ts` clones a map into the workspace and turns its
markers into spawns, flag bases and jump pad velocities. `server/maps/library.ts` collects
Studio-authored maps from `ServerStorage.Maps` and maps still defined in code.

## Saved data

Player progression (lifetime stats, XP, onboarding flags) is saved with ProfileStore, which
session-locks each profile so two servers can't overwrite each other's saves. Each player's
profile is copied to their `Profile` attribute as JSON for their client to read. In Studio,
saving to real DataStores needs **Enable Studio Access to API Services** in Game Settings;
without it profiles are temporary.

## Analytics

`server/analytics.ts` logs an onboarding funnel (joined, pressed Play, first kill, finished a
match, reached level 2) and two custom events: `MatchFinished` (match length, with mode and map
in custom fields 1 and 2) and `SessionLength` (minutes). They appear under Analytics in the
Creator Dashboard once the game has live traffic.

## Known gaps

Technical debt to address as the game grows:

- **No automated tests.** CI only lints and compiles. Gameplay logic (scoring, voting, spawn
  choice) would benefit from unit tests, which need a Luau runtime such as Lune or Roblox's
  Open Cloud Luau execution.
- **Client-authoritative hits.** Plausibility and aim checks stop crude cheats, but an aimbot
  that aims where the player is looking can't be detected this way.
- **Errors in per-frame mode logic** (CTF flags, control points) run in their own connection
  and aren't caught by the match loop's recovery.
- **Maps built in code** are meant to be baked into Studio models (see MAPPING.md); until then
  their layouts can only be changed in code.
