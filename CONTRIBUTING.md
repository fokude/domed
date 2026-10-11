# Contributing

Setup is in README.md. The rules every contributor follows, human or agent, are in AGENTS.md.
This file has recipes for the changes you're most likely to make.

## Workflow

1. Make one change at a time: a feature, a fix, or a tuning tweak.
2. Test it in Studio (`npm run watch`, `rojo serve`, Play).
3. Run `npm run check`.
4. Commit with a short message that says what changed, and update any docs it affects.

Larger features are easier to review on a branch with a pull request; CI runs on pull
requests too.

## Recipes

**Tune a number** (speeds, timers, score targets). Change it in `src/shared/config.ts`.
Everything reads from there.

**Edit or make a map.** Follow docs/MAPPING.md for markers and attributes, and
docs/MAP_DESIGN.md for layout. Measure the result with `/openness`.

**Add a remote event.**

1. Declare it under `ReplicatedStorage.Remotes` in `default.project.json`.
2. Give it a typed entry in `src/shared/remotes.ts`.
3. On the server, treat every argument as `unknown` and validate it before use.

**Add replicated match state** (something the HUD needs to show). Add a typed key to
`MatchStateValues` in `src/shared/matchState.ts`, set it on the server with `setMatchState`,
and read it on the client with `getMatchState` and `onMatchStateChanged`.

**Add a game mode.**

1. Add its id and display name in `src/shared/modes.ts`, and its tuning in `config.ts`.
2. Write a class implementing `GameMode` in `src/server/match/modes/`. Team modes use
   `TeamRoster` from `src/server/match/teams.ts`.
3. Register it in `MODE_FACTORIES` in `src/server/match/controller.ts`.
4. Add the mode to the `modes` list of each map that supports it, with any markers it needs.
5. If the HUD needs to show something new, add replicated match state for it.

**Add a HUD element.** Make a client module with an `init` function that builds its own
ScreenGui using `create` from `src/client/ui.ts`, and call it from `main.client.ts`.
