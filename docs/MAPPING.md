# Making maps

Maps are Roblox Models built in Studio. Gameplay code never refers to specific parts; it reads
tagged **marker** parts and **attributes** when the map loads. Anything else in the model is
yours to shape however you like.

See [MAP_DESIGN.md](MAP_DESIGN.md) for layout principles and targets.

## Where maps live

Each map is a file in `maps/`, for example `maps/InfernalSpire.rbxmx`. Rojo syncs the folder
into `ServerStorage.Maps`, and the file name becomes the map's id.

## Editing a map

1. Run `npm run watch` and `rojo serve`, and connect from Studio.
2. Edit the model under `ServerStorage.Maps`. To see it in the 3D view while you work, drag a
   copy into Workspace, edit that, then move it back over the original when you're done.
3. Save the model back to its file: right-click it, **Save to File**, and overwrite
   `maps/<Name>.rbxmx`.
4. Press Play to test, then commit the `.rbxmx` file.

To make a new map, start from a copy of an existing one so the markers and attributes are
already set up.

## Map attributes

Set these on the map Model itself.

| Attribute     | Type    | Meaning                                                              |
| ------------- | ------- | -------------------------------------------------------------------- |
| `DisplayName` | string  | Name shown to players                                                |
| `Tagline`     | string  | One line shown in the map vote                                       |
| `Modes`       | string  | Comma-separated: `Deathmatch`, `CTF`                                 |
| `Gravity`     | number  | Workspace gravity while this map is loaded (default 196.2)           |
| `KillHeight`  | number  | Players below this Y die, for lava and drops into the void           |
| `ThemeColor`  | Color3  | Accent color of the map's card in the vote                           |
| `DevOnly`     | boolean | Test map: loadable with `/map` in Studio, never in rotation or votes |

## Markers

Add tags in the **Tag Editor** (View, then Tags) or the Properties panel.

| Tag            | On   | Meaning                                                                                                                                                                                                                                                                                                                            |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Spawn`        | Part | Player spawns standing on the part's bottom face, facing its front. Optional `Team` attribute (`Red` or `Blue`); team spawns are also used in deathmatch                                                                                                                                                                           |
| `FlagBase`     | Part | Where a team's flag sits in CTF. Needs a `Team` attribute                                                                                                                                                                                                                                                                          |
| `JumpPad`      | Part | Launches players. Needs an ObjectValue child named `Target` pointing at a `PadTarget` part. Optional `ArcHeight` attribute (default 8)                                                                                                                                                                                             |
| `PadTarget`    | Part | Where a jump pad lands players. Place it at foot level                                                                                                                                                                                                                                                                             |
| `Hazard`       | Part | Kills on touch, like lava. Make it non-collidable so players sink into it                                                                                                                                                                                                                                                          |
| `ControlPoint` | Part | A Domination or Hardpoint zone, centered where the part stands. Needs a `Label` attribute (`A`, `B`, ...); optional `Radius` (default 12) and `PointMode` (`Domination` or `Hardpoint` to use it in one mode only; hardpoints rotate in label order). Put points on the center line or in mirrored pairs so neither team is closer |
| `Perk`         | Part | A perk orb, floating above where the part stands. Needs a `PerkType` attribute (`SuperJump`, `Shield`, `Overcharge`, `Radar`). See PERKS.md for placement rules. Optional `Respawn` overrides the respawn time in seconds                                                                                                          |
| `Dummy`        | Part | A training dummy for test maps, standing where the part stands and facing its front. Optional `DummyPattern` (`Static`, `Strafe`, `Circle`, `Fast`, `Hop`; default `Static`) and `Shielded` (true to give it a one-hit shield). Dummies can be shot like players but give no XP or stats, and respawn 2 seconds after dying        |

`Spawn`, `FlagBase`, `PadTarget`, `ControlPoint`, `Perk` and `Dummy` parts are removed when the map loads, so they can be as
visible as you like while editing. Jump pad strength is computed from the pad, the target and
the map's gravity, so move either end freely. A player standing still lands on the target;
players keep their own momentum on top of the pad's push, so fast players carry further.

## Lighting

A Folder named `Lighting` in the map holds its atmosphere:

- Attributes `ClockTime`, `Brightness`, `Ambient` and `OutdoorAmbient` set the matching
  Lighting properties.
- Effects inside it (Atmosphere, BloomEffect, ColorCorrectionEffect, and so on) are copied
  into Lighting when the map loads, replacing the previous map's effects.

To tune lighting, move the effects into Lighting, adjust them while looking at the map, then
move them back into the folder and save the map.

## Art pass with Blender

Maps are built in two layers: **gameplay geometry** (simple Parts that players stand on and
shoot against) and **art** (detailed meshes, often from Blender, that players see). Keep them
separate:

1. **Graybox first.** Build and playtest the layout from simple Parts, in code or in Studio.
   Check it against MAP_DESIGN.md and run `/openness`. Only add art once it plays well.
2. **Model the art around the graybox** in Blender, using the graybox as a reference (export it
   from Studio, or match its measurements: 1 Blender unit is imported as 1 stud).
3. **Import** with the official
   [Roblox Blender plugin](https://github.com/Roblox/roblox-blender-plugin), which uploads
   straight from Blender, or Studio's 3D Importer (FBX, OBJ or glTF).
4. **Put every art mesh in a Folder named `Art`** in the map. When the map loads, everything
   in it becomes visual only: not solid, invisible to shots and line-of-sight checks, and
   anchored. Movement and hit detection keep running on the gameplay geometry.
5. **Hide the gray parts the art covers** (Transparency 1), but leave them solid and
   queryable.

**Why not collide with the art directly:** collision for detailed meshes is approximate, so
players snag on bumps, lose bunny-hop speed on uneven floors, and shots hit (or pass) where
nothing is visible. In a one-shot movement shooter, clean and predictable surfaces matter more
than anywhere. Simple collision under detailed art is the usual practice in shooters.

**The one rule art must follow:** anything that looks solid enough to block movement or a shot
must have gameplay geometry behind it. Art that blocks a sightline with nothing solid behind it
lets shots pass through a visible wall.

**Budgets:**

- Under 20,000 triangles per mesh (Roblox's limit); far fewer for props that repeat.
- Textures at 1024×1024 at most, smaller for small props: mobile devices have little memory.
- Build from a kit of reusable modular pieces (wall panels, trims, pillars, railings) rather
  than unique large meshes; repeated meshes load once.
- Watertight meshes with no n-gons, as Roblox's specifications require.

Sources: [Roblox mesh specifications](https://create.roblox.com/docs/art/modeling/specifications),
[Roblox Blender plugin](https://github.com/Roblox/roblox-blender-plugin) and
[its documentation](https://github.com/Roblox/creator-docs/blob/main/content/en-us/art/modeling/roblox-blender-plugin.md).

## Previewing a map without Studio

`npm run preview -- <MapId>` renders a code-built map in Blender (5.x, installed locally) to
`previews/<MapId>/`:

- `plan.png`: top-down view in the map's colors. Spawns are arrows in team colors pointing the
  way they face; jump pads cyan, perks gold, control point zones white.
- `cut_<h>.png`: floor plans with everything above height h cut away, one per level, so
  interiors under roofs and upper floors can be read.
- `heights.png`: top-down, colored by height from blue (low) to red (high).
- `overview.png`: the whole map from a raised corner.
- `spawn_<n>_<team>.png`: eye-level views from spawns at the game's field of view.
- `metrics.json` and `exposure.png`: openness and spawn exposure, measured offline the same
  way as `/openness` (250 standing spots, sight rays between them), and a plan marking which
  spots can see a spawn (red) or not (green).

It runs the map's builder in Node on a small stand-in for Roblox's API
(`tools/map-preview/roblox-shim.js`), exports the parts as JSON, and renders them with
Blender's fast Workbench engine in a few seconds. Use it to check a layout change before
playtesting: whether spawns look into open fire, whether a lane reads as intended, whether
heights are varied. The offline numbers approximate `/openness` (cylinders and balls are
faceted); confirm important ones in Studio. A playtest is still the final judge.

Why: maps were built entirely by coordinates in code, with nobody (agent or human) seeing them
until a Studio session. A render after each change gives the build, look, adjust loop that
level designers rely on.

## Maps still defined in code

Some maps are still built by code in `src/server/maps/`, and are rebuilt every time the server
starts. To turn them into Studio maps, run this in the Studio command bar (not in Play mode):

```lua
require(game.ServerScriptService.TS.maps.library).bakeMaps()
```

The baked models appear under `ServerStorage.BakedMaps`. Save each one to `maps/<Name>.rbxmx`.
A map in `maps/` overrides a code map with the same name, so the code version can then be
deleted.
