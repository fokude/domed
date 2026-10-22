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

| Map             | Openness | Spawn exposure | Notes                                                                                                  |
| --------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Bastion         | 37%      | 6%             | Rebuilt for instagib: aqueduct, plaza and canal lanes between rampart fortresses (was 17% and 9%)      |
| Gridline        | 36%      | 12%            | Rebuilt for instagib: speed trench, banked embankment runways, overpass (was 26% and 21%)              |
| Halcyon Station | 36%      | 14%            | Rebuilt for instagib: one hall round the reactor shaft, side-lane runways (was 31% and 10%)            |
| Infernal Spire  | 36%      | 10%            | Rebuilt for instagib: open octagonal hall, ring runway round the lava, spire tiers (was 19% and 10%)   |
| Skyreach        | 44%      | 5%             | Rebuilt for instagib: promenade runways, team islands, open sky with monoliths (was 28% and 14%)       |
| Foundry         | 37%      | 16%            | Rebuilt for instagib: one open hall, rocket-jump tiers, spawn rooms behind the walls (was 10% and 18%) |

All six were rebuilt to the instagib targets in October 2026; the old numbers in brackets
were measured against the old 25% openness target. Spawn exposure now comes mostly from spots
inside the spawn rooms themselves, which always see their own spawns, so smaller or fewer
spawn rooms lower it more than anything in the arena does.

**Bastion** was rebuilt for instagib in October 2026, last of the six. It had lane walls,
gatehouse rooms breaking up the aqueduct, staggered pillars in a 26-wide canal, a sunken court
and two-storey fortresses with corridors and flag rooms: the most walls of any map. Now it is
300 by 600 with three open lanes: the aqueduct, a solid runway 50 wide at 18 down the west
side, joining both ramparts; the plaza in the middle, open but for the tower (the high point
at 40, reached by pads or a rocket jump off its walls) and four bunkers at 10; and the canal,
50 wide and 6 deep down the east side, shallow enough to jump out of anywhere. Each fortress is
a rampart across the map at 18 with the flag on top, two gates through it, ramps up from the
field and the courtyard behind, and the spawn room behind the back wall as on Foundry. The
flags are 492 studs apart, the longest route in the roster but still short of the CTF target
(see DOMED scale). It measured 37% open and 6% exposure on the first pass.

**Infernal Spire** was rebuilt for instagib in October 2026, second after Foundry. Its roofed
gallery tunnel, 24 wide with sixteen pillars in it, was the most cramped space in the roster.
Now the hall is an octagon of rust-red brick, open to the sky: a basalt ring 67 studs wide
runs all the way round the lava lake as the speed runway (about 900 studs per lap), with a lip
along the lava's edge. Four iron bridges, 30 wide, cross the lava on the diagonals to the
spire. Tiers: the ring at 0; corner bastions and the spire's base at 10; four basalt columns
in the lava and the spire's middle at 25 (vents lift players from the ring to the columns,
and bone bridges run on to the spire); the crown at 40. The walls are 60 tall with an
invisible barrier above.

Spawns took two passes. A spawn room behind each of the four cardinal walls measured 22%
exposure and 27% openness: the arena itself couldn't see in (baffle walls inside the doors,
as on Foundry), but the rooms were a quarter of all sampled spots, and spots inside a spawn
room see its spawns. Two rooms, north and south, holding the free-for-all spawns too as on
Foundry, brought it to 10% and 36%. The rooms' roofs are steep gables so the sampler (and
anyone who got up there) can't stand on them; a see-through flat roof was tried and let the
columns see in.

The previous version's history: **the Infernal Spire redesign** was the first map built with the preview loop. The original
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

**Skyreach** was rebuilt for instagib in October 2026. Its islands were 34 to 48 studs
across with colonnades, parapets and ruined walls on them, joined by 6-stud bridges: too
small to land a rocket jump at speed. Now two promenades, 50 by 280, run down the east and
west sides as the runways, lipped on their outer edges and open to the sky on the inner.
Each team's island (140 by 94, at 10) joins both promenades by 24-wide bridges, so the outside
is one loop. Over the open sky in the middle sit four mid islands (44 by 44, at 28) and the
Crown (at 48), reached by pads and rocket jumps. Each team's temple is on its island's back
edge, walled at the front and sides and open at the back onto a terrace, so its spawns can
only be seen from behind it (5% exposure, from the terrace and the temple itself). With
nothing but the islands, the map measured 58% open, too open even for an open-air map; four
floating monoliths over the sky, clear of every lane, brought it to 44%.

The previous version's history: **Skyreach** took four passes. First pass: 38% open and 61% spawn exposure, since the spawn
temples' screens were narrower than the spawns behind them. Wider temples and screens, an
obelisk on the Crown and bigger monoliths brought it to 33% and 31%; the exposure plan showed
the raised mid islands looking into the temples past the screens, so the temples got solid
fronts and side doors (14%). Ruined walls on the low islands' inner edges brought openness to
28%, which suits an open-air map.

**Foundry** was rebuilt in October 2026 as the pilot for the instagib rules. It had been a
three-by-three grid of rooms with 14-stud doorways, baffle walls down its runway, crates and a
roof at 52 (10% open): exactly the clutter the owner found restricted movement. Now it is one
360 by 260 hall open to the sky, so the colosseum crowd looks down into it. Four tiers, each a
rocket jump above the last: the floor, four big ingot stacks at 10 (the floor's only cover,
big enough to land on at speed), full-width team catwalks at 20 with ramps alongside their
front edges, and the crane at 38 over the molten pit, also reached by two jump pads. Walls are
70 tall so nobody rocket jumps out. The side lanes past the wall furnaces are 260-stud
runways, and the lanes in front of the catwalks run 300.

Spawns took two passes. Pockets under the catwalks measured 40% exposure, since their open
ends faced the side lanes. Spawn rooms behind the north and south walls, entered through four
20-stud doors under each catwalk, measured 50%: from the middle of the hall, rays passed
diagonally through the inner doors to the free-for-all spawns at the back. A baffle wall just
inside each door, wider than the door, brought it to 16%; openness is 37% (the spawn rooms,
which are sampled too, pull it down a little).

The previous version's history: it first measured 32% open, because the sampler counted its unreachable roof; the
`PlayableTop` map attribute now excludes spots above the playable space. The exposure plan
then showed spawns in the open in the corners and Furnace Row (68%), so every spawn moved into
a pocket: a wall across the back of the room with the way out at one end (18%). At 10% open
it's far tighter than the 25% target, which is its role: the roster's close-quarters map.

**Gridline** was rebuilt for instagib in October 2026. Its covered arcades (18-stud roofs,
pillars every 25 studs), lane walls, chicanes in a 24-wide trench and billboards everywhere
were the clutter the owner found restricted movement. Now it is 280 by 420: a 40-wide trench
down the middle (6 deep, 300 long) to build speed in, an open field either side with four
billboards as its only cover, and embankments at 18 down both side walls as the high runways,
reached by a bank up from the field, ramps at their ends and pads. An overpass at 36 crosses
the middle from embankment to embankment, the high point. Flags sit on platforms at each end,
380 studs apart, with the spawn rooms behind the end walls as on Foundry. First pass, with a
10-deep trench, sheer embankments and speaker stacks on the field, measured 26% open: the
trench and the embankment tops each saw only themselves. A shallower trench without the
speakers measured 32%, and banking the embankments' inner faces 36%.

The previous version's history: **Gridline** was a narrow open field (160 wide) with spawns on top of the base platforms and
in the open field (90% exposure). It now has a covered neon arcade down each side, making three
real lanes and widening it to 244. Base spawns sit behind a wall wider and taller than their
line, and free-for-all spawns moved into pockets in the arcades' outer walls.

**Halcyon Station** was rebuilt for instagib in October 2026. Its tubes were 14 studs wide
with bulkheads in them, the bridge 14 wide with cover on it, and the bays 110 wide: far too
tight for low-gravity rocket jumps. Now it's one hall, 280 by 400, under a glass roof at 74
with windows onto space down both sides. In the middle, a 100-stud shaft open to space, with
the reactor rising out of it: two 24-wide bridges cross the shaft, a balcony rings it at 22,
and the reactor's cap at 45 is the high point (pads from the bridges, or a rocket jump from
the balcony). Low gravity makes a rocket jump climb about 34 studs, so tiers are further
apart than on full-gravity maps. Four cargo modules (roofs at 18) are the floor's cover;
40-stud side lanes down the windows run the full 400 as runways. Each end is a hangar bay
with the flag on a raised dock and the spawn room behind the end wall, entered past baffles
as on Foundry. Cargo modules 36 by 50 measured 34% open; 30 by 40 measure 36%. The flags are
350 studs apart, as before; CTF route lengths are still to be revisited (see DOMED scale).

The previous version's history: **Halcyon Station**'s spawns lined each hangar bay facing straight down the open center bridge
into the other bay (86% exposure). Bay spawns now sit in a pocket behind a wall wider than
their line; cargo stacks where the bridge meets each bay break the 348-stud straight line; and
free-for-all spawns moved from the open balcony into escape pods off the glass tubes (10%).
Staggered bulkheads in the tubes, cover on the bridge and pylons around the reactor brought
openness from 40% to 31%. The rest is the walkable tube roofs and the balcony overlooking the
atrium, which are the low-gravity map's character.

### DOMED scale

A character is about 5.5 studs tall, so a stud is roughly 0.3 m.

- **Walking** is 45 studs/s, a good bhop is 60 to 100, and the cap is 140.
- **Rocket jump** from standing reaches about 20 studs; jump first and it goes further. With a
  double jump on top, about 35 studs. A tier 15 to 20 studs above another is a comfortable
  rocket jump.
- **Footprint.** Main maps about **350 to 450 by 250 to 300 studs**, and nothing smaller than
  about 300 by 220.
- **CTF.** 20 to 25 seconds of carrying at around 45 to 55 studs/s (carriers are capped at 55)
  means a base-to-base route of roughly **900 to 1,300 studs**, longer than any current map: with walking this fast, the carrier cap or the carry-time target needs revisiting before CTF maps are rebuilt.
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

**Visibility.** In a one-hit game, a player you can't see is a death you can't explain. Every
map must keep players readable against every surface: ambient light of at least about 150
grey, fog no denser than about 0.3, and no true darkness. Mood comes from the tint, sky and
colors, never from dimming the whole map. The owner found the night and dusk maps "really
bad" for visibility in October 2026; their ambient light was raised, Infernal Spire's fog
thinned, and Foundry moved to daylight.

**Landmarks.** Every area needs something memorable to navigate by, like a tower, a sun, a
statue or a color.

**Personality.** Each map has its own theme and feel. Layout rules are shared; identity isn't.

## Roster

Six maps, each with a distinct role, so rotation varies in scale, pace and feel as well as
looks. Classic arena maps inspire archetypes only: layouts, themes and names are DOMED's own,
since recognizable copies of commercial maps carry IP risk and add nothing a fresh layout
can't.

| Map             | Role                                                        | Archetype                  | Modes                                       |
| --------------- | ----------------------------------------------------------- | -------------------------- | ------------------------------------------- |
| Bastion         | The big 5v5 map: two fortresses, three lanes                | Classic CTF                | CTF, Team Deathmatch, Domination, Hardpoint |
| Infernal Spire  | Lava hall: ring runway round the lake, climb the spire      | King of the hill           | Deathmatch, Team Deathmatch, Domination     |
| Gridline        | Synthwave field: speed trench, embankment runways, overpass | Speed lanes                | All five                                    |
| Halcyon Station | Low-gravity station hall round an open reactor shaft        | Indoor low gravity         | All five                                    |
| Skyreach        | Sky promenades round an open sky, the Crown in the middle   | Quake 3's The Longest Yard | Deathmatch, Team Deathmatch, Domination     |
| Foundry         | Open forge hall around a molten pit, rocket-jump tiers      | Rocket-jump arena          | Deathmatch, Team Deathmatch, Hardpoint      |

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
