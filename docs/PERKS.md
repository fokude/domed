# Perks

Glowing orbs at fixed spots on each map, each granting a one-time or short effect. Code:
`server/perks.ts` (orbs, granting, shields), `client/perks.ts` (HUD panel, Radar, pickup
feed), `shared/perks.ts` (definitions, Overcharge cooldown); tuning in `PerkConfig` in
`src/shared/config.ts`.

| Perk       | Effect                                                                | Respawn | Counterplay                               |
| ---------- | --------------------------------------------------------------------- | ------- | ----------------------------------------- |
| Super Jump | The next double jump launches far higher                              | 25 s    | None needed: pure movement                |
| Shield     | Absorbs one headshot or three hits, and rail knockback while it lasts | 40 s    | A visible bubble that fades as it weakens |
| Radar      | Outlines enemies through walls for 4 s                                | 45 s    | Shooting still needs real line of sight   |
| Overcharge | Rail recharges twice as fast for 10 s                                 | 60 s    | The player's beams turn gold              |

Every pickup is announced in the kill feed. Perks are lost on death.

The Shield breaks on the first headshot, or after three hits of any kind. It first absorbed
one headshot and ignored body shots, which played like god mode: headshots are hard, so a
shielded player could shrug off fire for a long time. Counting body shots means sustained
pressure always breaks it, and the fading bubble shows how close it is. Rejected: needing
three headshots, which would make the Shield even stronger.

While it holds, the Shield also stops rail knockback, so a shielded player can't be pushed
off a ledge by shots (the owner's call after playtesting: a shield that still lets you be
knocked into lava doesn't feel like protection). Shoves still push a shielded player, and
wear the shield down: up close, the shove is the answer to a Shield.

## Why perks

Pickups are a core part of arena shooters: Quake and Unreal Tournament maps are built around
them. Level design writing treats power-ups as focal points that pull players across a map and
create fights over map control (The Level Design Book: "The location of desirable
power-weapons and vehicles inevitably exert a gravitational pull"; Tim Willits on placing
items to force players to move around the map). For DOMED they add a layer of timing and map
knowledge on top of aim and movement, and moments worth clipping.

## Design rules

- **Fixed spots, known timers.** Orbs always respawn in the same place after the same delay,
  as in classic arena shooters, so learning the timings is a skill and orbs become fights.
  Random spawns would make them luck.
- **Visible and announced.** Each orb glows and is labeled at a distance; every pickup shows in
  the kill feed; the Shield shows as a bubble and Overcharge as gold beams. Players should
  always be able to see why they lost a fight.
- **Stronger perks respawn slower** and sit at contested spots (tower tops, center platforms).
  Perks that favor one side come in mirrored pairs so neither team is closer.
- **Never take away the chance to react.** DOMED's one-shot kills make this matter more than in
  most shooters.
- **The server enforces anything that affects combat.** Shields are checked in the server's
  shot validation, and Overcharge's shorter cooldown is applied by the server's fire-rate check
  as well as the client.

## Rejected

- **Wall-piercing shots.** In a one-shot game, dying through a wall with no chance to react
  feels like being cheated, and frustration is what drives players away. Radar keeps the power
  fantasy of knowing where enemies are while still requiring a real shot.

## Sources

- [Map balance](https://book.leveldesignbook.com/process/combat/balance), The Level Design Book
- [Secrets of the Sages: Level Design](https://www.gamedeveloper.com/design/secrets-of-the-sages-level-design),
  Game Developer (Tim Willits on item placement)
