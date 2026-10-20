# Lore

The creative direction behind DOMED's world. Gameplay rules live elsewhere; this is the "why
does this place look and sound like this" bible. Every map, sound, callout and cosmetic should
fit it.

## The premise

You're a competitor in an intergalactic combat tournament, broadcast live to the whole galaxy.
Competitors are dropped into arenas the tournament builds on worlds across the stars, armed
with the one weapon the rules allow, and score by doming each other for the crowd. The
working name is **The Domed Circuit**.

## Tone

**Bright, loud and showy: a game show, not a war.** Crowds roar, the announcer hypes every
multi-kill, winners take the podium under the lights. Danger is real but played for spectacle
and fun, never gore or grimness, which suits an arcade shooter and Roblox's young audience.

## How it shows up

- **Arenas on different worlds.** Each map is a venue the tournament built somewhere wild: a
  hellish citadel over lava, a synthwave grid, islands in the sky, a space station. That's why
  every map can look completely different while belonging to one game.
- **Spectators around every arena.** Floating stands, hovering camera drones and holographic
  scoreboards ring each map. It's DOMED's shared visual signature, and it makes every arena
  read as a stage. `spectatorRing` in `maps/spectators.ts` places stands of crowd silhouettes
  under a banner in the arena's color, with camera drones; it all goes in the map's `Art`
  folder, so it's visual only.
- **The crowd reacts.** The crowd roars for the biggest moments: a GODLIKE streak, or a
  shutdown that ends someone's run. Ring-outs used to be the crowd-pleaser, and went with
  knockback in the move to instagib (see WEAPON.md).
- **The announcer is the tournament's voice.** Multi-kill and streak callouts ("DOUBLE DOME",
  "GODLIKE") are the broadcast hyping the action.
- **Ceremony.** The end-of-match podium is a winners' ceremony; the warm-up is the practice
  hall where competitors loosen up before going live.
- **Sponsors.** Cosmetics (beam colors, kill effects, skins) can be framed as sponsorships and
  team colors.

## Rules

- **Original names only.** Nothing borrowed from Unreal Tournament (Liandri), Apex Legends or
  Dungeon Crawler Carl, which inspired the premise. The tournament, worlds and announcer are
  DOMED's own.
- **Spectacle over story.** Lore lives in the world, the callouts and the presentation, not in
  text players must read. Nobody has to know the lore to enjoy a match.
- **Keep it friendly.** Competitors get domed and respawn; nobody dies for real.

## Inspirations

- Unreal Tournament: a corporate-run tournament of fighters across arenas on different worlds.
- Dungeon Crawler Carl (Matt Dinniman): a deadly contest staged as a galaxy-wide TV show,
  with sponsors and a crowd that loves a spectacle.
- Game shows and sports broadcasts: announcers, podiums, crowds.

The owner chose this direction for its personality, and because a televised tournament is a
well-tested fantasy that ties DOMED's varied maps, callouts and announcer together.
