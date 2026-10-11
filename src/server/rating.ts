// Hidden skill rating, used only to balance teams within a server. Team matches and free-for-all
// both feed it. Players never see it, so there's no number to protect and no reason to play
// passively.
//
// The model is Weng-Lin Bradley-Terry, as used by OpenSkill: each player has a skill estimate
// (mu) and an uncertainty (sigma). A team's strength is the sum of its players' mu. After a
// match each player's mu moves by how surprising the result was, scaled by their own
// uncertainty, so new players settle quickly and established players move slowly.
//
// Matches OpenSkill's BradleyTerryFull model with its default parameters:
// https://openskill.me/en/stable/api/openskill.models.weng_lin.bradley_terry_full.html
// Paper: Weng and Lin, "A Bayesian Approximation Method for Online Ranking", JMLR 12 (2011).

import { RatingConfig } from "shared/config";
import { TeamId } from "shared/modes";
import { PlayerRating } from "shared/progression";
import { getProfile, updateProfile } from "./data/profiles";

export function getRating(player: Player): PlayerRating {
	return getProfile(player)?.rating ?? { mu: RatingConfig.initialMu, sigma: RatingConfig.initialSigma };
}

interface TeamTotals {
	mu: number;
	sigmaSquared: number;
}

function totals(players: Player[]): TeamTotals {
	let mu = 0;
	let sigmaSquared = 0;
	for (const player of players) {
		const rating = getRating(player);
		mu += rating.mu;
		sigmaSquared += rating.sigma ** 2;
	}
	return { mu, sigmaSquared };
}

// Rates a finished match between any number of sides (teams, or single players in
// free-for-all). `ranks` gives each side's placing: lower is better, equal is a draw. `weight`
// scales how far ratings move, for noisier results.
function rateRanked(sides: Player[][], ranks: number[], weight: number) {
	const sideTotals = sides.map(totals);
	const updates = new Map<Player, { mu: number; sigma: number }>();

	sides.forEach((side, i) => {
		const own = sideTotals[i];
		let omega = 0;
		let delta = 0;
		sides.forEach((_, q) => {
			if (q === i) return;
			const opponent = sideTotals[q];
			const c = math.sqrt(own.sigmaSquared + opponent.sigmaSquared + 2 * RatingConfig.beta ** 2);
			const expected = 1 / (1 + math.exp((opponent.mu - own.mu) / c));
			const score = ranks[q] > ranks[i] ? 1 : ranks[q] === ranks[i] ? 0.5 : 0;
			const gamma = math.sqrt(own.sigmaSquared) / c;
			omega += (own.sigmaSquared / c) * (score - expected);
			delta += ((gamma * own.sigmaSquared) / c ** 2) * expected * (1 - expected);
		});

		for (const player of side) {
			const rating = getRating(player);
			const share = rating.sigma ** 2 / own.sigmaSquared;
			updates.set(player, {
				mu: rating.mu + share * omega * weight,
				sigma: rating.sigma * math.sqrt(math.max(1 - share * delta * weight, RatingConfig.kappa)),
			});
		}
	});

	// Applied after every side is computed, so each update uses the ratings from before the match.
	for (const [player, rating] of updates) {
		updateProfile(player, (data) => {
			data.rating = rating;
		});
	}
}

// Rates a finished team match. Only players present at the end are rated.
export function rateTeamMatch(red: Player[], blue: Player[], winner: TeamId | undefined) {
	if (red.size() === 0 || blue.size() === 0) return;
	const ranks = winner === undefined ? [1, 1] : winner === "Red" ? [1, 2] : [2, 1];
	rateRanked([red, blue], ranks, 1);
}

// Kills each player scored on each other player during a free-for-all.
export type DuelRecord = Map<Player, Map<Player, number>>;

// Rates players head to head: for every pair who fought, the share of kills between them is the
// result, compared with what their ratings predicted. Beating a strong player counts for more
// than beating a weak one. Pairs with few duels count proportionally less, and `weight` scales
// the whole update (free-for-all and Team Deathmatch use different weights). See docs/RATING.md.
export function rateHeadToHead(players: Player[], duels: DuelRecord, weight: number) {
	const kills = (a: Player, b: Player) => duels.get(a)?.get(b) ?? 0;
	const updates = new Map<Player, { mu: number; sigma: number }>();

	for (const player of players) {
		const own = getRating(player);
		const ownVariance = own.sigma ** 2;
		let omega = 0;
		let delta = 0;
		let fought = false;
		for (const opponent of players) {
			if (opponent === player) continue;
			const [won, lost] = [kills(player, opponent), kills(opponent, player)];
			const fights = won + lost;
			if (fights === 0) continue;
			fought = true;
			const rival = getRating(opponent);
			const c = math.sqrt(ownVariance + rival.sigma ** 2 + 2 * RatingConfig.beta ** 2);
			const expected = 1 / (1 + math.exp((rival.mu - own.mu) / c));
			const pairWeight = math.min(fights, RatingConfig.duelsForFullWeight) / RatingConfig.duelsForFullWeight;
			const gamma = own.sigma / c;
			omega += pairWeight * (ownVariance / c) * (won / fights - expected);
			delta += pairWeight * ((gamma * ownVariance) / c ** 2) * expected * (1 - expected);
		}
		if (!fought) continue;
		updates.set(player, {
			mu: own.mu + omega * weight,
			sigma: own.sigma * math.sqrt(math.max(1 - delta * weight, RatingConfig.kappa)),
		});
	}

	for (const [player, rating] of updates) {
		updateProfile(player, (data) => {
			data.rating = rating;
		});
	}
}
