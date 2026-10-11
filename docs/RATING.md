# Skill rating and team balance

How DOMED keeps teams fair, and why it works this way. Code: `server/rating.ts`,
`server/match/teams.ts`; tuning in `RatingConfig` and `TeamBalanceConfig` in
`src/shared/config.ts`.

## Goals

- **Fair teams inside each server.** Roblox decides which server a player joins; DOMED balances
  the teams within it. There's no lobby, queue or cross-server matchmaking.
- **Fun over grind.** DOMED is meant to be fast and aggressive. The rating is hidden: there's no
  rank to protect, so nothing rewards passive, careful play.
- **Fresh matches.** Teams should be fair but not identical every round.

## The model

Each player has a skill estimate (μ) and an uncertainty (σ), updated after every match with the
Weng-Lin Bradley-Terry model as implemented by OpenSkill (`BradleyTerryFull`, default
parameters: μ 25, σ 25/3, β 25/6, κ 0.0001). A team's strength is the sum of its players' μ.
After a match, each player's μ moves by how surprising the result was, scaled by their own
uncertainty: new players settle quickly, established players move slowly.

**Why this model:** Elo is built for one-on-one games and handles teams and uneven team sizes
poorly. TrueSkill handles teams but is patented. OpenSkill is an open implementation of the
Weng-Lin method, designed for teams and multiplayer games, and our implementation matches its
reference code.

## What each mode's rating counts

| Mode                       | Rated on                                               | Weight   |
| -------------------------- | ------------------------------------------------------ | -------- |
| CTF, Domination, Hardpoint | Team result only                                       | 1        |
| Team Deathmatch            | Team result, plus head-to-head kills between opponents | 1 + 0.25 |
| Free-for-all               | Head-to-head kills                                     | 0.5      |

**Head to head** means: for every pair of players who fought, the share of kills between them
is treated as a result and compared with what their ratings predicted, so beating a strong
player counts for more than beating a weak one. Pairs with fewer than 3 duels count
proportionally less.

**Why individual performance counts at all.** Team results alone converge slowly in 5v5,
because each result is shared by five players. Microsoft's TrueSkill 2 added in-game evidence,
including each player's kill count, to the result-only TrueSkill and raised prediction accuracy
on Halo 5 matches from 52% to 68%. Faster, more accurate ratings mean new players get fair
teams sooner.

**Why only some modes count kills.** In Team Deathmatch the team score is the sum of kills, so
rewarding kills can't pull players away from the objective. In CTF, Domination and Hardpoint
it would: a player farming kills instead of capturing would gain rating while their team
loses. Those modes rate on the result alone.

**Why free-for-all counts, at half weight.** Small lobbies play free-for-all by default, so
without it players would reach their first team match with an untested rating. Aim and
movement are the same skill in every mode. Free-for-all fights are noisier (third parties,
who happened to be nearby, late joiners), so they move ratings half as much. Head to head
replaced ranking players by final placing, which said little about whom a player actually beat.

Only players present at the end of a match are rated.

## Team balance

At match start the server builds the most balanced split by total μ, plus 64 random splits. Any
split within a small margin (`TeamBalanceConfig.tolerance`) of the best balance counts as fair,
and of those, the one that repeats the fewest teammate pairs from the previous match is chosen.
Players who join mid-match go to the smaller team, or the weaker one when sizes match.

**Why the randomness:** a purely deterministic split gives the same lobby the same teams and
the same result every round, which gets stale quickly.

## Decided against, for now

- **Visible ranks.** They make players play to protect a number. Possible later as a separate
  ranked mode once ratings have history.
- **Cross-server matchmaking and queues.** These need hundreds of players online at once;
  below that, queues are long and lobbies half empty. Revisit with real player numbers.
  Roblox's configurable server matchmaking may allow skill-aware server choice without a
  custom lobby.
- **Win streak bonuses.** In games that use them, a streak mostly signals that the hidden
  rating disagrees with the visible rank. With no visible rank, the uncertainty (σ) already
  makes ratings move faster when results are surprising.

## Sources

- [OpenSkill BradleyTerryFull](https://openskill.me/en/stable/api/openskill.models.weng_lin.bradley_terry_full.html)
  and [its source](https://openskill.me/en/stable/_modules/openskill/models/weng_lin/bradley_terry_full.html),
  which the implementation was checked against
- Weng and Lin, [A Bayesian Approximation Method for Online Ranking](https://jmlr.csail.mit.edu/papers/volume12/weng11a/weng11a.pdf),
  JMLR 12 (2011)
- Minka, Cleven and Zaykov, [TrueSkill 2: An improved Bayesian skill rating system](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/trueskill2.pdf),
  Microsoft Research (2018)
- [Skill Issues: An Analysis of CS:GO Skill Rating Systems](https://arxiv.org/pdf/2410.02831) (2024)
