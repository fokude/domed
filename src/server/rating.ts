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
import { readStat } from "./stats";

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

// Rates a free-for-all from final placings: most kills first, fewest deaths breaking ties, and
// players level on both counted as a draw. Counts less than a team match because placings
// depend on who was in the lobby and when they joined.
export function rateFreeForAll(players: Player[]) {
	if (players.size() < 2) return;
	const placed = players.map((player) => ({
		player,
		kills: readStat(player, "Kills"),
		deaths: readStat(player, "Deaths"),
	}));
	placed.sort((a, b) => (a.kills !== b.kills ? a.kills > b.kills : a.deaths < b.deaths));
	const ranks: number[] = [];
	placed.forEach((entry, index) => {
		const previous = placed[index - 1];
		const tied = previous !== undefined && previous.kills === entry.kills && previous.deaths === entry.deaths;
		ranks.push(tied ? ranks[index - 1] : index + 1);
	});
	rateRanked(
		placed.map((entry) => [entry.player]),
		ranks,
		RatingConfig.freeForAllWeight,
	);
}
