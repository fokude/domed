# Bots

Bots fill near-empty free-for-all matches. Code: `server/bots.ts`; tuning in `BotConfig` in
`src/shared/config.ts`. Studio: `/bots <count>` fills to that many players and bots, and
`/bots` alone restores the default.

## Why

- **Empty servers feel dead.** A new game rarely has players online at the same time, and a
  server with one or two people has nothing to do. Dead servers lose the players who would
  have filled them.
- **Early wins.** Hard games lose new players who die over and over without a kill (see
  SKILL_FLOOR.md). Epic added bots to Fortnite so new players "grow in skill" with a few kills
  a match, and scales them down as skill rises.

## How they work

- **When.** Only in Deathmatch, which is what servers under four players run anyway (see
  `ModeMinPlayers`). Bots join until there are `fillTo` (4) players and bots in the match,
  one per second, and leave as players deploy, dead bots first so nobody sees one vanish
  mid-fight. They're gone between matches.
- **Movement.** Server-controlled R15 characters at normal walk speed. They roam between
  spawn points by pathfinding, avoiding hazards (lava is non-collidable, so hazards get a
  pathfinding cost), and hop now and then. In a fight they strafe side to side and hop. They
  don't air strafe, so a skilled player is faster.
- **Aim.** A bot spots the nearest visible player within 250 studs, waits a reaction time
  (0.6 s), and fires 30% slower than a player. Each shot aims at the head with a random error
  whose radius grows with distance and the target's speed, so moving targets are harder to
  hit, as for players. Rough headshot odds: about 65% at 20 studs against a still target,
  about 13% at 60 studs against one moving at 30.
  Spawn-protected players aren't targeted, and shields work against bots as against players.
- **Rewards.** Killing a bot counts as a kill for the match score and pays XP, with full kill
  feedback. Bots never affect
  ratings, never appear in standings, and don't count toward the longest-headshot record, so
  they can't inflate anything that measures skill against players.
- **Clearly bots.** Named "[BOT] Name" in the kill feed and above their heads. Disguising
  bots as players is rejected: Fortnite drew criticism when bot-filled lobbies weren't made
  obvious.

## Rejected or deferred

- **Bots in team modes.** They'd need to understand objectives, and team modes only run with
  four or more players. Revisit if team lobbies are often uneven.
- **Difficulty that adapts to the player's rating.** Worth doing once real data shows how
  players fare against them; one tuning set is easier to judge first.
- **Air strafing bots.** Hard to make look human, and it would make them better than most
  new players, which defeats the point.

## Sources

- [Fortnite bots (Fortnite Wiki)](https://fortnite.fandom.com/wiki/Bots)
- [TechRadar on Fortnite v10.40 bots](https://www.techradar.com/news/fortnite-v1040-update-brings-new-bots-to-make-you-a-better-player)
- [Vice: Fortnite lobbies can now have up to 92% bots](https://www.vice.com/en/article/fortnite-lobbies-can-now-have-up-to-92-bots-players-are-furious-over-supposed-og-season-3-update/):
  the backlash against bot-heavy lobbies
