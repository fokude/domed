# Map design

Principles for DOMED maps, drawn from published level design writing and adapted to what makes
DOMED different: any hit kills, everyone has the same railgun, players bunny hop at up to 140
studs/s and rocket jump off surfaces, and matches are 5v5. MAPPING.md covers the technical side
(markers, attributes).

## What DOMED needs

- **Movement is the defence.** Any hit kills, so players survive by being hard to hit: fast,
  airborne, changing direction. Maps have to let them move. Clutter that stops a bhop or a
  rocket jump is worse than an open sightline.
- **Speed needs runways.** Bhopping takes distance to build. Maps need long, clear lanes with
  nothing to clip on, ending in places where fights happen.
- **Height is reached by rocket jump.** Rocket jumps and double jumps are how players get up,
  so high ground sits within rocket-jump reach of nearby surfaces, not only at the top of ramps.
- **Room to breathe.** Big spaces, high ceilings, few walls. A map should feel like an arena,
  not a maze.
- **5v5 means teams.** Team Deathmatch and CTF, so maps should be symmetric between two sides.

### Why this changed (October 2026)

The first rules were written for headshot-only. They said "instagib maps are built to keep
openness low" and aimed for about 25% openness, with rooms, 14-stud corridors, 18-stud
ceilings and cover breaking every long sightline. Each map pass added pillars, screens and
pockets to bring the numbers down. After the move to instagib with rocket jumps (WEAPON.md,
MOVEMENT.md), the owner found the maps cramped: "way too much obstacles really restricting
movement", too little runway, too claustrophobic. Fast, airborne targets are hard to hit
across open space, so long sightlines cost far less than they did under headshot-only, and
clutter costs far more.

### Reference games

DOMED draws on the whole fast arena shooter genre, not one game. What these share is open
space, height reached by movement, and few small obstacles:

- **Quake III Arena** instagib and rocket-jump play: The Longest Yard is open platforms in the
  sky, reached by jump pads and rocket jumps.
- **Unreal Tournament** instagib: Facing Worlds is two towers across open ground and long
  sightlines, and still one of the most played instagib maps.
- **Xonotic** and **Warsow / Warfork**: fast movement shooters with instagib modes, whose maps
  are built around strafe-jumping and keeping momentum.
- **Team Fortress 2**'s Soldier: rocket jumping off floors and walls, the model for DOMED's
  right-click.
- **Ratz Instagib**: reviews say some of its maps are "way too cramped for 5+ players", and
  that its high ground is reached by jumping.

These are archetypes to learn from, never layouts to copy (see Roster).

## Targets

| Measure                                                          | Target                                                       | Source                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Openness: share of random standing spots that can see each other | 35 to 50%                                                    | Owner playtests after the instagib move    |
| Spawn exposure: share of standing spots that can see a spawn     | under 20%                                                    | InstaGib Arena map brief                   |
| Runway                                                           | at least one clear lane 150+ studs long and 40+ wide per map | Owner playtests; DOMED scale below         |
| Ceiling                                                          | 40 studs or open air                                         | Rocket jump plus double jump reach (below) |
| Height tiers                                                     | 3 to 4, each reachable by rocket jump from the one below     | Ratz Instagib reviews; Q3 and UT maps      |
| Void edges                                                       | only where deliberate; main runways get a lip or wall        | Owner playtests                            |
| CTF carry time, flag to capture                                  | 20 to 25 seconds at a normal pace                            | Unreal Tournament: Blitz level design      |
| Routes between bases                                             | 3 lanes; about 3 large loops                                 | Titanfall 2 (Respawn); Celia Wagar         |
| Exits from a team's spawn area                                   | at least 2, each 20+ studs wide                              | Unreal Tournament: Blitz level design      |

The openness target is a starting range, not a measured optimum: retune it from playtests.
Use `/openness` in a Studio playtest to measure the current map (it samples 250 standing spots
across every floor). `npm run preview -- <MapId>` measures the same thing offline
(see MAPPING.md).

### Current measurements

Offline, from `npm run preview` (approximate; confirm in Studio with `/openness`):

| Map             | Openness | Spawn exposure | Notes                                                                                                    |
| --------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| Bastion         | 17%      | 9%             | Meets both targets                                                                                       |
| Gridline        | 26%      | 21%            | Covered arcades down both sides; spawns in pockets (was 31% and 90%)                                     |
| Halcyon Station | 31%      | 10%            | Spawn pockets and escape pods; the walkable tube roofs and balcony stay open by design (was 40% and 86%) |
| Infernal Spire  | 19%      | 10%            | Gallery tunnel round the lake, spawn rooms, lava columns (was 72% and 99.6%)                             |
| Skyreach        | 28%      | 14%            | Open-air sky islands; a little above target, by nature of the map                                        |
| Foundry         | 10%      | 18%            | Close quarters by design: well under the open-map target                                                 |

These were measured against the old 25% openness target. Free-for-all maps that scatter spawns
everywhere score high on spawn exposure almost by design; openness is the clearer signal for
them.

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

**Foundry** first measured 32% open, because the sampler counted its unreachable roof; the
`PlayableTop` map attribute now excludes spots above the playable space. The exposure plan
then showed spawns in the open in the corners and Furnace Row (68%), so every spawn moved into
a pocket: a wall across the back of the room with the way out at one end (18%). At 10% open
it's far tighter than the 25% target, which is its role: the roster's close-quarters map.

**Gridline** was a narrow open field (160 wide) with spawns on top of the base platforms and
in the open field (90% exposure). It now has a covered neon arcade down each side, making three
real lanes and widening it to 244. Base spawns sit behind a wall wider and taller than their
line, and free-for-all spawns moved into pockets in the arcades' outer walls.

**Halcyon Station**'s spawns lined each hangar bay facing straight down the open center bridge
into the other bay (86% exposure). Bay spawns now sit in a pocket behind a wall wider than
their line; cargo stacks where the bridge meets each bay break the 348-stud straight line; and
free-for-all spawns moved from the open balcony into escape pods off the glass tubes (10%).
Staggered bulkheads in the tubes, cover on the bridge and pylons around the reactor brought
openness from 40% to 31%. The rest is the walkable tube roofs and the balcony overlooking the
atrium, which are the low-gravity map's character.

### DOMED scale

A character is about 5.5 studs tall, so a stud is roughly 0.3 m.

- **Walking** is 32 studs/s, a good bhop is 50 to 80, and the cap is 140.
- **Rocket jump** from standing reaches about 20 studs; jump first and it goes further. With a
  double jump on top, about 35 studs. A tier 15 to 20 studs above another is a comfortable
  rocket jump.
- **Footprint.** Main maps about **350 to 450 by 250 to 300 studs**, and nothing smaller than
  about 300 by 220.
- **CTF.** 20 to 25 seconds of carrying at around 32 to 45 studs/s (carriers are capped at 55)
  means a base-to-base route of roughly **600 to 900 studs**.
- **Spaces.** Corridors at least 30 studs wide, rooms at least 60, so a bhop can turn without
  hitting a wall.
- **Jumps.** A jump is about 7.5 studs high and a double jump about 15. Gaps should be clearly
  jumpable or clearly not.

## Principles

**Clear floors.** Nothing knee-high or waist-high in the middle of a lane: no crates, low walls
or scattered boxes. Cover comes from a few big structures (platforms, towers, the edges of
higher tiers) that players move around and over, not small obstacles they clip on.

**Lanes.** Give each map three readable routes between the sides, such as high, middle and
low, or left, center and right. Lanes should connect at a few crossing points, forming loops.

**Loops, not dead ends.** Players should never have to stop and turn around on a main route
(Tim Willits, id Software). In CTF the flag rooms are the only acceptable dead ends.

**Sightlines.** Long sightlines are fine; a fast target is hard to hit across open space. Break
up only the ones that would let a player watch a spawn or a whole route from safety.

**Height.** Three to four tiers, each a rocket jump above the last, with one contested high
point. High ground should be strong but exposed, with at least three ways up.

**Speed runways.** At least one long, clear lane for building bhop speed, ending at a fight,
not a wall.

**Edges.** Falling off the map is part of the game, but only at deliberate edges. Main runways
and the ground around spawns get a lip or wall, so a missed strafe doesn't end in the void.

**Spawns.** Spawns sit back from the front, out of sight of the main fights, with two or more
wide exits.

**CTF bases.** It should be obvious whose flag room it is. Defenders should be able to see a
carrier on the move. Give flag rooms at least two entrances.

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
- [InstaGib Arena map redesign](https://github.com/8tp/instagib-arena/pull/49), the spawn exposure target and the original openness target
- [Ratz Instagib Early Access review](https://www.pcgamesn.com/ratz-instagib/ratz-instagib-early-access-review), PCGamesN, and [Steam reviews](https://steamcommunity.com/app/338170/reviews/?browsefilter=toprated): cramped maps and jump-reached high ground
- [Lvlworld map reviews](https://lvlworld.com/review/id:2431): open layouts with height variation suit rocket jumping
