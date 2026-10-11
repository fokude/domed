# Hard but sticky

DOMED is hard on purpose: one-shot headshots and air strafing are the game, and they stay.
"A game for everyone is a game for no one." This doc collects research on why players stick
with hard games, and how DOMED helps new players climb without lowering the floor. Check new
features against it.

## What keeps players in hard games

1. **Failure is fast and cheap.** Celeste kills the player thousands of times but rarely
   frustrates, because it doesn't linger on death and restarts the room instantly. Players on
   forums say the same of Celeste and Dark Souls: the instant retry makes the next attempt
   feel free.
2. **Deaths feel fair.** Players keep going when a death is their own fault and they can see
   what to do better, and quit when it feels random or the controls are to blame.
3. **Competence comes early.** Self-determination theory names competence (feeling
   effective) as a core need, alongside autonomy and relatedness. Flow theory puts
   engagement between boredom and anxiety: challenge just above skill. Research finds players
   enjoy a game more when they feel competent; nobody likes to lose constantly.
4. **Improvement is visible.** Players stick with shooters they're bad at when they can see
   themselves getting better: a stat going up, a rank climbing, a personal best.
5. **Friends.** Relatedness is the third core need. Community posts repeatedly say hard or
   ranked play only stays fun with friends, and better friends pull weaker ones up.
6. **Depth for those who stay.** A high skill ceiling keeps the players who get hooked, and
   arena shooters have it in abundance.

## Where hard games lose players

- **Stomped from the first minute.** Quake 3 is called one of the least newcomer-friendly
  games; one new Quake Live player describes quitting at 7 kills to 63 deaths. Players blame
  Quake Live for dropping skill matching, leaving casual players against experts. Quake
  Champions lost new players to lopsided, skill-blind matches. Much of the arena shooter
  genre's decline is this.
- **No early wins.** Epic added bots to Fortnite so new players "grow in skill" with a few
  kills a match instead of dying seconds after landing, and scales bots down as skill rises.
- **Slow first impressions.** Roblox developers report that new-player retention drops
  sharply in the first five minutes, that players "get it" or leave within about a minute,
  and that loading screens and slow text cost players in the first seconds. One game raised
  day-one retention by removing its tutorial and letting play teach.

## How DOMED applies this

| Principle           | Already in DOMED                                                                      |
| ------------------- | ------------------------------------------------------------------------------------- |
| Fast, cheap failure | 1.5 s respawns in free-for-all and Team Deathmatch; spawn protection                  |
| Fair deaths         | Client-side hits (what you see is what lands); visible beams show who shot you        |
| Early competence    | Body-shot knockback; teams balanced by hidden rating; warm-up and dummies             |
| Visible improvement | Levels, lifetime stats, top speed and longest headshot records, announced when beaten |
| Friends             | Short matches suited to dropping in together                                          |
| Depth               | Air strafing, bhop, long-range headshots in the air                                   |
| Fast first minute   | First-time players skip the menu; one lesson at a time on screen, cleared by doing it |

## Ideas that keep the identity

None of these change one-shot headshots or air strafing. Ranked by expected value:

1. **Bots** to fill near-empty servers and give early wins: Fortnite's lesson. Already on
   the roadmap.
2. **Death recap.** A moment after dying, show who killed you, from how far and how fast they
   were moving. It turns a "random death" into "they were bhopping at 90 from 140 studs":
   fair, and something to aspire to.
3. **Near-miss feedback.** Shipped. When a shot passes just over a head, flash "CLOSE". It tells new
   players they're nearly there, and teaches that only heads count.
4. **Personal bests during play.** Shipped. "NEW TOP SPEED" or "LONGEST HEADSHOT" the moment it
   happens, from stats already saved. Visible improvement that doesn't need kills.
5. **Knockback kill credit.** Knocking someone into a hazard or off the map counts as your
   kill. Rewards body shots near edges without body-shot damage.
6. **Faster first impression.** Shipped. First-time players skip the menu and drop straight
   into the warm-up or match (spawn protection covers a mid-match landing). Instead of a card
   of rules, one lesson shows at a time (shoot, bunny hop, air strafe, double jump) and clears
   the moment the player does it; moves they already know are skipped. The how-to-play card
   stays in the menu. Judge it by the funnel's joined-to-deployed step and first-kill rate.
7. **Friends together.** Prefer keeping Roblox friends on the same team when balance allows,
   and add an invite button.

Rejected: body-shot damage, which makes spraying at bodies a strategy and dilutes every
kill; aim assist in player fights, which undermines what a headshot means.

## Sources

Research:

- [No one likes to lose: the effect of game difficulty on competency, flow, and enjoyment (Penn State)](https://pure.psu.edu/en/publications/no-one-likes-to-lose-the-effect-of-game-difficulty-on-competency-/)
- [The Impact of Game Design on Player Stickiness](https://www.researchgate.net/publication/398881340_The_Impact_of_Game_Design_on_Player_Stickiness)
- [Why Do We Suffer for Fun? Ordeal Pleasure in Souls-like Games](https://arxiv.org/pdf/2603.26677)
- [Dynamic Difficulty Adjustment in Games](https://www.intechopen.com/chapters/1228576): the
  flow channel and self-determination theory

Designers and press:

- [Celeste (Wikipedia)](<https://en.wikipedia.org/wiki/Celeste_(video_game)>) and
  [What Makes Celeste's Assist Mode Special](https://flockbay.com/blog/what-makes-celestes-assist-mode-special/):
  instant retries, and difficulty help that keeps the core
- [Fortnite bots (Fortnite Wiki)](https://fortnite.fandom.com/wiki/Bots) and
  [TechRadar on Fortnite's v10.40 bots](https://www.techradar.com/news/fortnite-v1040-update-brings-new-bots-to-make-you-a-better-player)
- [Kotaku: Quake Champions beta](https://kotaku.com/quake-champions-beta-is-a-bloody-disaster-1795225874)
- [Arena shooter (Wikipedia)](https://en.wikipedia.org/wiki/Arena_shooter)
- [How Rivals built a true competitive shooter on Roblox](https://www.maxpowergaming.co/post/how-rivals-built-a-true-competitive-shooter-on-roblox)

Community:

- [ResetEra: Do you get frustrated when you die in the game?](https://www.resetera.com/threads/do-you-get-frustrated-when-you-die-in-the-game.1290012/)
- [ResetEra: Death of the arena shooter](https://www.resetera.com/threads/death-of-the-arena-shooter.130957/)
- [Steam: Quake Live discussion](https://steamcommunity.com/app/282440/discussions/0/152393186483515632)
  and [AnandTech: Quake Live players?](https://forums.anandtech.com/threads/quake-live-players.261739/post-27321949):
  the skill gap from a new player's side
- [Steam: Counter-Strike 2 discussion on improving](https://steamcommunity.com/app/730/discussions/0/412446292774789569)
- Roblox DevForum:
  [New user first-session retention analytics](https://devforum.roblox.com/t/analytics-new-user-first-session-retention-new-and-returning-users/2890832),
  [Day 1 retention: losing half my players in under 2 minutes](https://devforum.roblox.com/t/my-day-1-retention-is-awful-23-losing-half-my-players-in-under-2-minutes-what-am-i-doing-wrong-with-onboarding/4186434),
  [Suggestions to improve D1 retention](https://devforum.roblox.com/t/suggestions-on-how-to-improve-d1-retention/4369566)
