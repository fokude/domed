// Hidden skill rating for team modes, used only to balance teams within a server. Players never
// see it, so there's no number to protect and no reason to play passively.
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

// Updates every player on `team` given how it did against `opponents`. `score` is 1 for a win,
// 0.5 for a draw and 0 for a loss.
function updateTeam(team: Player[], own: TeamTotals, opponents: TeamTotals, score: number) {
	const c = math.sqrt(own.sigmaSquared + opponents.sigmaSquared + 2 * RatingConfig.beta ** 2);
	const expected = math.exp(own.mu / c) / (math.exp(own.mu / c) + math.exp(opponents.mu / c));
	const gamma = math.sqrt(own.sigmaSquared) / c;
	const omega = (own.sigmaSquared / c) * (score - expected);
	const delta = ((gamma * own.sigmaSquared) / c ** 2) * expected * (1 - expected);

	for (const player of team) {
		const rating = getRating(player);
		const share = rating.sigma ** 2 / own.sigmaSquared;
		updateProfile(player, (data) => {
			data.rating = {
				mu: rating.mu + share * omega,
				sigma: rating.sigma * math.sqrt(math.max(1 - share * delta, RatingConfig.kappa)),
			};
		});
	}
}

// Rates a finished team match. Only players present at the end are rated.
export function rateTeamMatch(red: Player[], blue: Player[], winner: TeamId | undefined) {
	if (red.size() === 0 || blue.size() === 0) return;
	const redTotals = totals(red);
	const blueTotals = totals(blue);
	const redScore = winner === undefined ? 0.5 : winner === "Red" ? 1 : 0;
	updateTeam(red, redTotals, blueTotals, redScore);
	updateTeam(blue, blueTotals, redTotals, 1 - redScore);
}
