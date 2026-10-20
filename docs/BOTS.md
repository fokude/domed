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
- **Who they fight.** Players and each other, so a server with only bots in view still has
  fights going on, and bots act like other competitors rather than turrets aimed at you. The
  owner asked for this. A bot spots the nearest visible player or bot within 250 studs.
- **Aim.** A bot waits a reaction time
  (0.9 s), and fires 60% slower than a player. Each shot aims at the torso with a random error
  whose radius grows with distance and the target's speed, so moving targets are harder to
  hit, as for players. The error is spread evenly through a ball (2.5 studs plus 0.05 per stud
  of distance and 0.06 per unit of target speed).
  **History.** Under headshot-only, bots aimed at the head. After the move to instagib they
  aimed at the torso with 2.5 times the spread, and the owner found them "wayyy too strong".
  Part of that was a bug: the error picked a random direction and scaled it by a uniformly
  random length, which bunches shots near the center, so bots hit far more often than their
  spread implied. The error is now uniform in the ball (rejection sampling), the spread is
  about twice as wide again, reaction went from 0.6 to 0.9 s and the fire rate from 1.3 to
  1.6 times the rail cooldown. Untested; tune `BotConfig` after playtests.
  Bots aim twice as wide at other bots (`botTargetSpreadScale`) as at players, so bot fights
  last a few shots instead of trading instant kills.
- **Spawn protection.** Bots get the same 1.5 seconds of spawn protection as players, as a
  real ForceField: nobody can target or hit them, so bots spawning near each other don't kill
  each other on the spot. Spawn-protected players aren't targeted either, and shields work
  against bots as against players. A bot's own shots used to pass through every bot (its ray
  ignored the whole Bots folder); now they only ignore the shooter.
- **Rewards.** Killing a bot counts as a kill for the match score and pays XP, with full kill
  feedback.
- **Standings.** Bots are ranked with players in the free-for-all standings: the live top
  three, the end-of-match podium, and the winner. A bot can win a match, in which case no
  player is the winner. Each bot's kills and deaths for the match live in
  `ReplicatedStorage.BotStandings` (one folder per bot, like a player's leaderstats), cleared
  when the next match starts. Bots don't appear in Roblox's own player list, which only shows
  real players. They still never affect ratings or count toward the longest-kill record, so
  they can't inflate anything saved that measures skill against players. Until October 2026
  bots were kept out of standings entirely; the owner wanted them to act as competitors.
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
