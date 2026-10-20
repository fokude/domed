# Kill feedback

What landing a kill feels like. Code: `client/killFeedback.ts` (visuals and escalation) and
`client/sounds.ts` (every sound cue in one table).

## Goal

A kill should feel like the best thing that can happen in the game, every time, without
giving the killer any advantage in the next fight. Satisfaction comes from game feel, not from
manipulative hooks: no random rewards, no loss aversion, nothing designed to keep players
playing against their interest. Roblox's audience is young, which makes this matter more.

## What happens on a kill

| Layer           | Detail                                             | Who sees it |
| --------------- | -------------------------------------------------- | ----------- |
| Headline        | "GIBBED" pops in oversized and settles, then fades | Killer      |
| Crosshair burst | A ring expands from the crosshair                  | Killer      |
| Edge flash      | A brief red flash at the screen edges              | Killer      |
| XP popup        | "+10 XP" drifts up beside the crosshair            | Killer      |
| Sound           | A bright tick layered over a low thump             | Killer      |
| Hit burst       | Particles burst where the victim was hit           | Everyone    |
| Death sound     | Plays for the victim                               | Victim      |

**Headshots** still kill like any hit, but they look and sound special. The headline reads
"DOMED" instead of "GIBBED", in pink (`Palette.Headshot`, kept apart from multi-kill gold),
pops in bigger, and the crosshair ring and edge flash match. An extra ping plays over the
kill sound, the hit burst is bigger and pink for everyone, the hitmarker is bigger and pink,
the kill feed says DOMED instead of GIBBED, and the victim's banner and recap say DOMED BY and
HEADSHOT FROM. Why: after the move to instagib (WEAPON.md) the owner wanted headshots to stay
the flashiest kill, and the game's name already means one. They earn nothing extra (no bonus
XP or score), so the kill rules stay simple and nobody is pushed back into headshot-only
play. The ping is a placeholder until a Creator Store sound is picked.

**Multi-kills** (each within 4 seconds of the last) escalate the headline (DOUBLE KILL, TRIPLE
KILL, QUAD KILL, UNSTOPPABLE), turn it gold, and raise the kill sound's pitch each step. If
every kill in the chain was a headshot it reads DOUBLE DOME, TRIPLE DOME, QUAD DOME instead,
in the headshot pink; one body kill switches the chain to the KILL names, since "dome" means a
headshot.
**Streaks** (kills without dying) call out milestones at 3, 5, 10 and 15. Training dummy kills
(on the Test Range and in the warm-up) escalate multi-kills but earn no XP popup and don't
count toward streaks, so practice can't carry a streak into a match. Shield hits, shield
breaks and perk pickups each have their own cue.

**Ring-outs** (knocking someone into a hazard or off the map) used to get a gold "RING OUT!"
headline and a crowd roar for everyone. They went with knockback when DOMED moved to
instagib (see WEAPON.md).

**Death recap**: the killed player sees how far away the killer was and how fast they were
moving, under the respawn countdown, and the killer is outlined through walls until respawn.
A death you can explain feels fair and shows what to aim for (see SKILL_FLOOR.md). The victim
is out of the fight while it shows, so the outline gives nothing away that matters.

**Near misses**: when a clean miss passes within 4 studs of the center of someone the shooter
could have hit (a player, bot or training dummy), "CLOSE" flashes under the crosshair. That's
just outside a character's arms and feet. It tells new players they're nearly there; the
server decides, so it can't be faked, and it's only shown to the shooter. It measured 2.5
studs from the head under headshot-only.

**Personal bests** ("NEW TOP SPEED: 92", "LONGEST KILL: 140 STUDS") call out in gold the
moment a saved record falls. Speed records announce once the player stops accelerating, with
the peak, and low records (under 50 speed or 50 studs) stay quiet so new players aren't
flooded. They show improvement that doesn't depend on winning fights (see SKILL_FLOOR.md).

## Server-wide moments

Personal feedback (your kills, hitmarkers, near misses, personal bests) stays on your screen:
it comes often, and broadcasting it would be noise. Rare, spectacular moments go to the whole
lobby, so a server feels like one shared event, and everyone learns who to hunt, as Unreal
Tournament's announcer did:

| Moment                       | Everyone sees                                    | Sound             |
| ---------------------------- | ------------------------------------------------ | ----------------- |
| Streak of 5 / 10 / 15        | "VOLT IS ON A KILLING SPREE" / RAMPAGE / GODLIKE | Sting; roar at 15 |
| Ending a streak of 5 or more | "NOVA SHUT DOWN VOLT!"                           | Crowd roar        |

Streaks are tracked on the server (`server/streaks.ts`); bots' kills don't build streaks.

**When moments collide.** Each kind of feedback has its own channel, so they don't fight:
your headline (kills), the line under it (your streaks, personal bests), and the
broadcast banner under the match bar (server-wide moments, `client/announcer.ts`). The banner
shows one announcement at a time for about two seconds through a small priority queue: a
shutdown or GODLIKE jumps ahead of a killing spree, at most three wait, the lowest priority is
dropped first when it's full, and anything older than four seconds is dropped as stale.
Broadcasts about you are skipped, since your own callout covers them. The crowd is one voice:
only one roar plays at a time (another can't start within 2 seconds, `playSoundThrottled` in
`sounds.ts`), so shutdowns and GODLIKEs in a burst never stack. The roar is a placeholder
sound until a Creator Store crowd cheer is picked.

## Why this design

- **Layered, multi-sensory feedback.** The "juice" approach: flash, motion, floating text,
  particles and sound together turn an ordinary action into a satisfying one, as Martin
  Jonasson and Petri Purho showed in their talk _Juice It or Lose It_ (2012). Feedback lands
  hardest when what players see and hear line up.
- **Escalation.** Unreal Tournament (1999) introduced the multi-kill announcement (double kill,
  multi kill, and so on), since adopted widely. DOMED is UT-inspired, so its escalation follows
  the same pattern. A rising pitch on chained kills is a classic arcade way to make a streak
  feel like it's building.
- **No competitive cost.** Effects avoid the middle of the screen except the crosshair burst,
  which is brief and thin. There is deliberately **no screen shake, camera kick or hit-stop**
  (freezing frames on impact), common juice techniques that would move or interrupt a player's
  aim in a one-shot game. The hit burst shows everyone where a kill happened, which the falling
  body already shows.
- **Silent kills feel unrewarding.** Before this pass, kills had no sound at all.

## Changing sounds

All sounds are placeholders built from the few sounds that ship inside the Roblox client, so
they work without uploads. To replace one, find a sound in the Creator Store (Toolbox, Audio)
and put its id in `SOUND_CUES` in `src/client/sounds.ts` as `"rbxassetid://<id>"`, adjusting
volume and pitch to taste. The kill cue is pitched up per multi-kill step, so pick something
short and bright.

## Music

Each map can have its own background track, set by the map's `Music` attribute (`music` in
`setMapInfo`, or the attribute on a Studio map). The client loops it and crossfades between
tracks when the arena changes (warm-up to match and back). Players pick the volume in Settings:
Off, Low, Medium (default) or High. Volumes are kept low because gunfire and footsteps carry
information, and Off is a real option for players who listen to their own music.

Use tracks from the Creator Store's audio library (Toolbox, Audio), which Roblox licenses for
use in experiences, so there are no copyright problems. Never upload commercial music. Paste
the id as `"rbxassetid://<id>"`. Each map's file notes the genre it calls for, matching its
identity: heavy metal for Infernal Spire, synthwave for Gridline, and so on.

## Sources

- Martin Jonasson and Petri Purho, _Juice It or Lose It_ (2012), summarized in
  [Making a juicy game](https://rpgplayground.com/research-making-a-juicy-game/)
- [Where Does Game Feel Come From: Flash, Shake, Floating Text, Sound, Particle Feedback](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- [Unreal Tournament series multi-kill messages](https://en.namu.wiki/w/%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%86%A0%EB%84%88%EB%A8%BC%ED%8A%B8%20%EC%8B%9C%EB%A6%AC%EC%A6%88/%EB%A9%80%ED%8B%B0%20%ED%82%AC%20%EB%A9%94%EC%8B%9C%EC%A7%80)
- [The "Juice" Problem: How Exaggerated Feedback is Harming Game Design](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design),
  a counterpoint on overdoing it, and part of why feedback here stays out of the player's aim
