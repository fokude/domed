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

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every push to `main` and every pull
request. It lints, compiles, and builds the Roblox place with Rojo, in about 20 seconds.
Results show as a check mark or cross next to each commit, in the repository's Actions tab,
or with `gh run list`. `npm run check` runs the same checks locally.

CI doesn't run the game: a green check means the code compiles and is consistent, not that
it plays correctly. Test gameplay in Studio.

## Releasing

Pushing a version tag publishes the game. The release workflow runs the CI checks, builds the
place, publishes it to Roblox through Open Cloud, and creates a GitHub release with generated
notes:

```sh
git tag v0.2.0
git push origin v0.2.0
```

Use semantic versions: bump the patch for fixes, the minor for features. Only tag commits
you've tested in Studio. New servers get the update immediately; to move players off old
servers, use **Restart servers for updates** on the Creator Dashboard. Roblox keeps every
published version, so a bad release can be rolled back from the dashboard.

The repository is the source of truth: each release replaces the whole place with what the
repo builds, so changes made only in a Studio copy of the place are lost. Experience settings
(max players, avatar type, permissions) live on Roblox and aren't affected.

The workflow needs the `ROBLOX_API_KEY` secret and the `ROBLOX_UNIVERSE_ID` and
`ROBLOX_PLACE_ID` variables in the repository's Actions settings.

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
   `TeamRoster` from `src/server/match/teams.ts`, which also rates team results
   (`roster.rateMatch`).
3. Register it in `MODE_FACTORIES` in `src/server/match/controller.ts`.
4. Add the mode to the `modes` list of each map that supports it, with any markers it needs.
5. If the HUD needs to show something new, add replicated match state for it.

**Add a HUD element.** Make a client module with an `init` function that builds its own
ScreenGui using `create` from `src/client/ui.ts`, and call it from `main.client.ts`.
