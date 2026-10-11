# DOMED

Roblox headshot-only movement shooter, written in roblox-ts and synced into Studio with Rojo.
Start with README.md, then docs/ARCHITECTURE.md.

## Verifying changes

Run each step on its own and check its result. Shell chains in this environment don't
reliably stop on failure, so a failed check can let a bad commit through.

1. `npx eslint src` (use `--fix` first for formatting)
2. `npm run build`, and read the output for errors
3. `rojo build -o <temp file>` when `default.project.json` changes

Plain `tsc` can't read roblox-ts's types; always build with `npm run build`.

Gameplay can only be confirmed in Studio. Say what is untested rather than implying it
works. Studio chat commands: `/map <MapId> [mode]`, `/end`, and `/map MovementLab` for the
movement test map.

## Docs to keep in sync

- docs/MOVEMENT.md: any change to movement or physics. Add new engine workarounds to its
  Engine quirks list.
- docs/MAPPING.md: map markers, attributes and design guidelines.
- docs/ARCHITECTURE.md: structure and match flow.

## Commits

One commit per feature, fix or tuning change, with a short, specific message. When several
changes are pending, split them, even if they share a file.

## roblox-ts gotchas

- Interface members called as methods must be declared and implemented as methods (classes
  work well); assigning arrow functions fails to compile.
- `end` and other Luau keywords can't be identifiers.
- Arrays of enum items need an explicit type, such as `Enum.KeyCode[]`, before `includes` or
  `indexOf` will accept a general `KeyCode`.
- Vector3 and CFrame math uses methods: `a.add(b)`, `a.mul(n)`, `cf.mul(other)`.
