# Railgun

Everyone carries the same one-shot railgun. Code: `client/weapon.ts` (firing),
`server/combat.ts` (validation); tuning in `WeaponConfig` in `shared/config.ts`.

| Setting             | Value  | Notes                                                 |
| ------------------- | ------ | ----------------------------------------------------- |
| Cooldown            | 0.75 s | Halved while Overcharged (see PERKS.md)               |
| Range               | 1000   | Studs                                                 |
| Body-shot knockback | 70     | Body shots never kill; they push the target           |
| Server leniency     | 0.15 s | Shots this much early still count, for network jitter |

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
