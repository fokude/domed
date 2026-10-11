# Railgun

Everyone carries the same one-shot railgun. Code: `client/weapon.ts` (firing),
`server/combat.ts` (validation); tuning in `WeaponConfig` in `shared/config.ts`.

| Setting             | Value  | Notes                                                 |
| ------------------- | ------ | ----------------------------------------------------- |
| Cooldown            | 0.75 s | Halved while Overcharged (see PERKS.md)               |
| Range               | 1000   | Studs                                                 |
| Body-shot knockback | 70     | Body shots never kill; they push the target           |
| Server leniency     | 0.15 s | Shots this much early still count, for network jitter |

## Body shots

Body shots never kill directly; they push the target. A player who dies to a hazard or falls
out of the map within 4 seconds of a body shot counts as the shooter's kill, with the kill
feed, XP and kill feedback (but not the longest-headshot record). It makes body shots near
edges and lava worth taking without body-shot damage, which was rejected because it would
make spraying at bodies a strategy (see SKILL_FLOOR.md). Teammates can't be credited, and
the credit is tied to the character that was pushed, so it can't carry over a respawn.

## Shove

F or right-click shoves the nearest enemy within 8 studs, inside a 45-degree cone in front of
you and in line of sight. It never damages; it pushes 1.5 times as hard as a body shot, mostly
horizontally, and has its own 2-second cooldown (the short white bar under the rail's). Like
a body shot, it counts as a hit against a shield and earns the kill if the target lands in a
hazard or the void within 4 seconds. The server picks the target, so a client can't shove
from across the map.

**Why:** missing a shot up close left a player helpless for the whole cooldown. The shove
gives that moment a play, rewards closing in rather than sitting back, and makes ledges and
lava part of fights, with knockback kill credit already in place. It follows Unreal
Tournament's melee and Impact Hammer, which knock players around.

**Rejected: melee damage.** A melee kill would be a second way to kill besides the headshot,
which dilutes the game's identity the same way body-shot damage would. Every kill stays a
headshot or the environment.

**Later:** shoving a wall or the floor could launch the shover, like UT's Impact Hammer jump,
as a movement trick. Worth trying once the basic shove feels right. Watch in playtests for
players trading shoves back and forth (fix: brief immunity after being shoved) and for ledge
camping.

## Why the cooldown is 0.75 seconds

The cooldown sets how much a miss costs. Too long and missing feels like "waiting an
eternity", which playtesting showed: headshots on fast-moving targets are hard, so players
miss often. Too short and spamming shots replaces aiming, and careful aim stops paying off.

- **Instagib heritage.** Quake III Arena's railgun fires once every 1.5 seconds, and DOMED's
  instagib roots (Quake, Unreal Tournament) all use a slow rail. A full-length rail cooldown
  suits body-shot kills; headshot-only is much harder, so DOMED is faster.
- **History.** It started at 0.9 seconds and was cut to 0.75 after the owner found misses too
  punishing. A cut to around 0.6 was considered and rejected: the owner wanted careful aim
  still rewarded, so the change stays small.
- **Rejected: click as fast as you like while Overcharged.** Uncapped fire rate rewards auto
  clickers and cheats, which the server could no longer tell apart from real clicks.

## Sources

- [Railgun (Q3)](<https://quake.fandom.com/wiki/Railgun_(Q3)>): 1.5 second rate of fire
- [Instagib (QWiki)](https://www.quakeworld.nu/wiki/Instagib): the mode's history in Quake
  and Unreal Tournament
