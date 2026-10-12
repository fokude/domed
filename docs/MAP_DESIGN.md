# Map design

Principles for DOMED maps, drawn from published level design writing and adapted to what makes
DOMED different: one headshot kills, everyone has the same railgun, players bunny hop at up to
140 studs/s, and matches are 5v5. MAPPING.md covers the technical side (markers, attributes).

## What DOMED needs

- **Sightlines decide fights.** With one-shot kills, whoever sees the other first usually wins.
  Too many open angles makes deaths feel random. Instagib maps are built to keep openness low.
- **Speed needs runways.** Bhopping is most of the fun, and it takes distance to build. Maps need
  long, safe lanes to build speed in, ending in places where fights happen.
- **Rooms give fights structure.** Interiors break sightlines, create close fights that reward
  movement, and give teams places to hold.
- **5v5 means teams.** Team Deathmatch and CTF, so maps should be symmetric between two sides.

## Targets

| Measure                                                          | Target                                                 | Source                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Openness: share of random standing spots that can see each other | about 25%                                              | InstaGib Arena map brief                           |
| Spawn exposure: share of standing spots that can see a spawn     | under 20%                                              | InstaGib Arena map brief                           |
| Height tiers                                                     | 3 to 4, with one contested high point                  | InstaGib Arena, from Q3, UT and Ratz Instagib maps |
| CTF carry time, flag to capture                                  | 20 to 25 seconds at a normal pace                      | Unreal Tournament: Blitz level design              |
| Routes between bases                                             | 3 lanes; about 3 large loops with smaller ones between | Titanfall 2 (Respawn); Celia Wagar                 |
| Chokepoints                                                      | 3 to 4, impossible to cover all from one spot          | The Level Design Book                              |
| Entrances to a strong position                                   | at least 3                                             | Deathmatch Map Design: The Architecture of Flow    |
| Exits from a team's spawn area                                   | at least 2                                             | Unreal Tournament: Blitz level design              |

Use `/openness` in a Studio playtest to measure the current map (it samples 250 standing spots
across every floor). `npm run preview -- <MapId>` measures the same thing offline
(see MAPPING.md).

### Current measurements

Offline, from `npm run preview` (approximate; confirm in Studio with `/openness`):

| Map             | Openness | Spawn exposure | Notes                                                                        |
| --------------- | -------- | -------------- | ---------------------------------------------------------------------------- |
| Bastion         | 17%      | 9%             | Meets both targets                                                           |
| Gridline        | 31%      | 90%            | Spawns spread across an open map                                             |
| Halcyon Station | 40%      | 86%            | Spawns spread across an open map                                             |
| Infernal Spire  | 19%      | 10%            | Gallery tunnel round the lake, spawn rooms, lava columns (was 72% and 99.6%) |
| Skyreach        | 28%      | 14%            | Open-air sky islands; a little above target, by nature of the map            |

Free-for-all maps that scatter spawns everywhere score high on spawn exposure almost by
design; openness is the clearer signal for them.

**The Infernal Spire redesign** was the first map built with the preview loop. The original
was an open lava lake with spawns on the open ring. Three iterations: spawn rooms behind
the rampart and columns in the lava (openness 35%, but the renders showed the rooms had been
built facing outward, sealing the spawns); turned around (spawn exposure 74%, since a wide
doorway shows a wide arc of the ring); then screen walls inside each doorway, which also give
every room two ways out, and wider columns (24% and 14%). The screens' side gaps were widened
after the floor plan showed them too tight to leave at speed.

After a playtest the owner wanted the ring to be "a long room" rather than a walkway beside a
wall, with fights inside it, and the map to feel more like Doom. The ring became a roofed
gallery: an inner wall opening onto the lake only at the four bridges and four jump-pad
balconies, sixteen pillars staggered against alternate walls so the curve can't be watched
end to end, and a battlement roof reached through skylights above the pads (a new high tier).
Rust-red brick and iron grating replaced plain basalt. It measures 19% open: a little under the
target, which suits a map built around a tunnel.

**Skyreach** took four passes. First pass: 38% open and 61% spawn exposure, since the spawn
temples' screens were narrower than the spawns behind them. Wider temples and screens, an
obelisk on the Crown and bigger monoliths brought it to 33% and 31%; the exposure plan showed
the raised mid islands looking into the temples past the screens, so the temples got solid
fronts and side doors (14%). Ruined walls on the low islands' inner edges brought openness to
28%, which suits an open-air map.

### DOMED scale

A character is about 5.5 studs tall, so a stud is roughly 0.3 m.

- **Walking** is 26 studs/s, a good bhop is 50 to 80, and the cap is 140.
- **Footprint.** InstaGib Arena standardized on 96 by 72 m maps for small groups. DOMED has more
  players and moves faster, so main maps should be about **350 to 450 by 250 to 300 studs**.
- **CTF.** 20 to 25 seconds of carrying at around 26 to 40 studs/s (carriers are capped at 55)
  means a base-to-base route of roughly **500 to 700 studs**.
- **Rooms and corridors** need space to strafe: corridors at least 14 studs wide, rooms at least
  30, and ceilings at least 18 studs so a double jump doesn't hit the ceiling.
- **Jumps.** A jump is about 7.5 studs high and a double jump about 15. Gaps should be clearly
  jumpable or clearly not.

## Principles

**Lanes.** Give each map three readable routes between the sides, such as high, middle and
low, or left, center and right. Respawn moved Titanfall 2 to three-lane layouts because "any
point to any point" maps made deaths hard to understand. Lanes should connect at a few
crossing points, forming loops.

**Loops, not dead ends.** Players should never have to stop and turn around on a main route
(Tim Willits, id Software). Overlay a few large loops with smaller ones between them. In CTF the
flag rooms are the only acceptable dead ends.

**Control sightlines.** Mix short and long sightlines, but make long ones rare lanes players
choose to cross. Break the rest with walls, height changes and turns. Prefer 45-degree turns
to 90-degree ones, so fights don't line up head-on across open ground.

**Bowls and chokepoints.** Alternate open combat bowls, where fights happen, with tighter
chokepoints that funnel attacks. The contrast is what makes both readable.

**Height.** Three to four tiers, with one contested high point per map. High ground should be
strong but exposed, and reachable by at least three routes.

**Speed runways.** Give each map at least one long, protected route for building bhop speed:
a trench, an aqueduct, a long hall. It should end at a fight, not a wall.

**Spawns.** Spawns sit back from the front, at least halfway into a base in CTF, with two or
more exits, and out of sight of the areas the enemy fights in.

**CTF bases.** It should be obvious whose flag room it is. Defenders should be able to see a
carrier on the move, so bases shouldn't be mazes. Give flag rooms at least two entrances.

**Cover.** Err on too little. Build cover from the architecture, such as pillars, walls and
height changes, rather than scattering boxes.

**Landmarks.** Every area needs something memorable to navigate by, like a tower, a sun, a
statue or a color.

**Personality.** Each map has its own theme and feel. Layout rules are shared; identity isn't.

## Roster

Six maps, each with a distinct role, so rotation varies in scale, pace and feel as well as
looks. Classic arena maps inspire archetypes only: layouts, themes and names are DOMED's own,
since recognizable copies of commercial maps carry IP risk and add nothing a fresh layout
can't.

| Map             | Role                                                   | Archetype                  | Modes                                       |
| --------------- | ------------------------------------------------------ | -------------------------- | ------------------------------------------- |
| Bastion         | The big 5v5 map: two fortresses, three lanes           | Classic CTF                | CTF, Team Deathmatch, Domination, Hardpoint |
| Infernal Spire  | Circular arena: climb the central spire over lava      | King of the hill           | Deathmatch, Team Deathmatch, Domination     |
| Gridline        | Mid-size synthwave map built around a speed trench     | Speed lanes                | All five                                    |
| Halcyon Station | Low-gravity station interiors: hangars, tubes, reactor | Indoor low gravity         | All five                                    |
| Skyreach        | Floating sky islands linked by jump pads, air control  | Quake 3's The Longest Yard | Deathmatch, Team Deathmatch, Domination     |
| Foundry         | Dense industrial interior, many levels, close fights   | Unreal Tournament's Deck16 | Deathmatch, Team Deathmatch, Hardpoint      |

Every map is measured with `npm run preview` against the targets above before it ships, and
checked in Studio with `/openness`.

## Sources

- [Mapping for CTF](https://beyondunrealwiki.github.io/pages/mapping-for-ctf.html), Unreal Wiki
- [Unreal Tournament: Blitz Level Design](https://80.lv/articles/unreal-tournament-blitz-level-design), 80.lv
- [Secrets of the Sages: Level Design](https://www.gamedeveloper.com/design/secrets-of-the-sages-level-design), Game Developer (Tim Willits, Paul Jaquays, Cliff Bleszinski)
- [Titanfall dev speaks to the value of slower, simpler multiplayer](https://www.gamedeveloper.com/design/-i-titanfall-i-dev-speaks-to-the-value-of-slower-simpler-multiplayer), Game Developer
- [Deathmatch Map Design: The Architecture of Flow](https://www.gamedeveloper.com/design/deathmatch-map-design-the-architecture-of-flow), Game Developer
- [Good FPS Map Design](https://critpoints.net/2018/02/18/good-fps-map-design/), Celia Wagar
- [Map balance](https://book.leveldesignbook.com/process/combat/balance) and [Metrics](https://book.leveldesignbook.com/process/blockout/metrics), The Level Design Book
- [InstaGib Arena map redesign](https://github.com/8tp/instagib-arena/pull/49), openness measurements and size targets
