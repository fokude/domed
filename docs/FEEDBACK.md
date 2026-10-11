# Kill feedback

What landing a kill feels like. Code: `client/killFeedback.ts` (visuals and escalation) and
`client/sounds.ts` (every sound cue in one table).

## Goal

A headshot should feel like the best thing that can happen in the game, every time, without
giving the killer any advantage in the next fight. Satisfaction comes from game feel, not from
manipulative hooks: no random rewards, no loss aversion, nothing designed to keep players
playing against their interest. Roblox's audience is young, which makes this matter more.

## What happens on a kill

| Layer           | Detail                                            | Who sees it |
| --------------- | ------------------------------------------------- | ----------- |
| Headline        | "DOMED" pops in oversized and settles, then fades | Killer      |
| Crosshair burst | A ring expands from the crosshair                 | Killer      |
| Edge flash      | A brief red flash at the screen edges             | Killer      |
| XP popup        | "+10 XP" drifts up beside the crosshair           | Killer      |
| Sound           | A bright tick layered over a low thump            | Killer      |
| Head burst      | Particles burst from the victim's head            | Everyone    |
| Death sound     | Plays for the victim                              | Victim      |

**Multi-kills** (each within 4 seconds of the last) escalate the headline (DOUBLE DOME, TRIPLE
DOME, QUAD DOME, UNSTOPPABLE), turn it gold, and raise the kill sound's pitch each step.
**Streaks** (kills without dying) call out milestones at 3, 5, 10 and 15. Training dummy kills
(on the Test Range and in the warm-up) escalate multi-kills but earn no XP popup and don't
count toward streaks, so practice can't carry a streak into a match. Body shots, shield
breaks and perk pickups each have their own cue.

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
  aim in a one-shot game. The head burst shows everyone where a kill happened, which the falling
  body already shows.
- **Silent kills feel unrewarding.** Before this pass, kills had no sound at all.

## Changing sounds

All sounds are placeholders built from the few sounds that ship inside the Roblox client, so
they work without uploads. To replace one, find a sound in the Creator Store (Toolbox, Audio)
and put its id in `SOUND_CUES` in `src/client/sounds.ts` as `"rbxassetid://<id>"`, adjusting
volume and pitch to taste. The kill cue is pitched up per multi-kill step, so pick something
short and bright.

## Sources

- Martin Jonasson and Petri Purho, _Juice It or Lose It_ (2012), summarized in
  [Making a juicy game](https://rpgplayground.com/research-making-a-juicy-game/)
- [Where Does Game Feel Come From: Flash, Shake, Floating Text, Sound, Particle Feedback](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- [Unreal Tournament series multi-kill messages](https://en.namu.wiki/w/%EC%96%B8%EB%A6%AC%EC%96%BC%20%ED%86%A0%EB%84%88%EB%A8%BC%ED%8A%B8%20%EC%8B%9C%EB%A6%AC%EC%A6%88/%EB%A9%80%ED%8B%B0%20%ED%82%AC%20%EB%A9%94%EC%8B%9C%EC%A7%80)
- [The "Juice" Problem: How Exaggerated Feedback is Harming Game Design](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design),
  a counterpoint on overdoing it, and part of why feedback here stays out of the player's aim
