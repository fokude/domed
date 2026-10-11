# DOMED

Roblox headshot-only movement shooter for 5v5, written in roblox-ts and synced into Studio
with Rojo. Humans and coding agents both work on this repository; these rules apply to both.

Start with README.md, then docs/ARCHITECTURE.md (which includes a map of where everything
lives and the codebase rules). CONTRIBUTING.md has recipes for common changes.

## Commands

- `npm run check`: lint and compile. Run it before every commit; CI runs the same steps plus a
  Rojo place build on every push and pull request.
- `npm run format`: fix lint formatting and format the Markdown docs.
- `rojo build -o <temp file>`: run when `default.project.json` changes.

Plain `tsc` can't read roblox-ts's types; always compile with `npm run build` or
`npm run check`. When chaining shell commands, check each result: a failed step must stop
the rest, or a broken change can be committed.

## Verifying gameplay

Gameplay can only be confirmed in Roblox Studio. Agents can't run Studio, so say clearly
what is untested rather than implying it works, and list what the person testing should try.
Studio chat commands: `/map <MapId> [mode]`, `/end`, `/openness`, and `/map TestRange [mode]`
for the test map, where every feature can be tried solo against training dummies.

## Commits

- One commit per feature, fix or tuning change, with a short, specific message. When several
  changes are pending, split them, even if they share a file.
- Never commit internal strategy, revenue or business notes. They belong in
  `project_artefacts/`, which is gitignored and stays local.
- Don't commit generated output (`out/`, `include/`) or place files.

## Docs to keep in sync

Documentation grows and changes with the code. Docs record why decisions were made, not just
what the code does: when research or outside sources shaped a decision, cite them next to it
with links, and write down notable options that were rejected and why.

Update these in the same commit as the change they describe:

- docs/ARCHITECTURE.md: structure, match flow, the file map, known gaps.
- docs/MOVEMENT.md: any change to movement or physics. Add new engine workarounds to its
  Engine quirks list.
- docs/MAPPING.md: map markers and attributes.
- docs/RATING.md: skill rating, team balance, and the reasoning and sources behind them.
- docs/PERKS.md: perks, their design rules, and the reasoning behind them.
- docs/FEEDBACK.md: kill feedback and sounds, and the reasoning behind them.
- docs/WEAPON.md: railgun tuning and the reasoning behind it.
- docs/SETTINGS.md: player settings, their options and defaults, and the reasoning behind them.
- docs/MAP_DESIGN.md: researched layout principles and targets. Check new or changed maps
  against it; ask the owner to run `/openness` in Studio to measure them.
- README.md: setup, scripts, Studio commands, modes.

## roblox-ts gotchas

- Interface members called as methods must be declared and implemented as methods (classes
  work well); assigning arrow functions fails to compile.
- Luau keywords (`end`, `local`, `then`, `until`, ...) and roblox-ts reserved names (`pairs`, `next`, ...)
  can't be identifiers.
- Arrays of enum items need an explicit type, such as `Enum.KeyCode[]`, before `includes` or
  `indexOf` will accept a general `KeyCode`.
- Vector3 and CFrame math uses methods: `a.add(b)`, `a.mul(n)`, `cf.mul(other)`.
