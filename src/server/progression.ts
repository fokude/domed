// Records lifetime stats and awards XP into each player's saved profile as they play.

import { getLiveRoot } from "shared/characters";
import { MovementConfig, XpConfig } from "shared/config";
import { levelForXp, ONBOARDING_KEYS } from "shared/progression";
import { Remotes } from "shared/remotes";
import { sanitizeSettings } from "shared/settings";
import { logOnboardingStep } from "./analytics";
import { getProfile, updateProfile } from "./data/profiles";

const Players = game.GetService("Players");

const SPEED_SAMPLE_INTERVAL = 0.25;
const PLAY_TIME_INTERVAL = 60;
// Speeds above this are physics glitches or exploits rather than bhops, so they don't count.
const MAX_CREDIBLE_SPEED = MovementConfig.maxAirSpeed + 10;

export type Objective = "flagCapture" | "pointCapture" | "hardpointSecond";

const OBJECTIVE_XP: Record<Objective, number> = {
	flagCapture: XpConfig.flagCapture,
	pointCapture: XpConfig.pointCapture,
	hardpointSecond: XpConfig.hardpointSecond,
};

// Records below these aren't announced when beaten: a new player's first runs and kills would
// otherwise announce a "record" every few seconds.
const MIN_ANNOUNCED_SPEED = MovementConfig.hopBoostMaxSpeed;
const MIN_ANNOUNCED_HEADSHOT = 50;

// A new top speed is announced once the player stops accelerating, with the peak, rather than
// on every rising sample. Holds the record being set and whether it beat an announced level.
const risingSpeed = new Map<Player, { speed: number; announce: boolean }>();

// XP earned by each player in the current match, for the per-match cap and the summary.
const matchXp = new Map<Player, number>();

function awardXp(player: Player, amount: number) {
	const earned = matchXp.get(player) ?? 0;
	const granted = math.min(amount, XpConfig.matchCap - earned);
	if (granted <= 0) return;
	matchXp.set(player, earned + granted);
	updateProfile(player, (data) => {
		data.xp += granted;
	});
	if (levelForXp(getProfile(player)?.xp ?? 0).level >= 2) logOnboardingStep(player, "level2");
}

export function startMatchXp() {
	matchXp.clear();
}

export function recordKill(shooter: Player, distance: number) {
	const previous = getProfile(shooter)?.stats.longestHeadshot;
	const studs = math.floor(distance);
	updateProfile(shooter, (data) => {
		data.stats.kills += 1;
		data.stats.longestHeadshot = math.max(data.stats.longestHeadshot, studs);
	});
	if (previous !== undefined && previous >= MIN_ANNOUNCED_HEADSHOT && studs > previous) {
		Remotes.PersonalBest.FireClient(shooter, "longestHeadshot", studs);
	}
	awardXp(shooter, XpConfig.kill);
	logOnboardingStep(shooter, "firstKill");
}

export function recordDeath(player: Player) {
	updateProfile(player, (data) => {
		data.stats.deaths += 1;
	});
}

export function recordObjective(player: Player, objective: Objective) {
	updateProfile(player, (data) => {
		if (objective === "flagCapture") data.stats.flagCaptures += 1;
		else if (objective === "pointCapture") data.stats.pointCaptures += 1;
		else data.stats.hardpointSeconds += 1;
	});
	awardXp(player, OBJECTIVE_XP[objective]);
}

// Counts the match and win, pays completion and win XP to players who took part, and tells
// each player what they earned.
export function recordMatchEnd(participants: Player[], winners: Player[]) {
	for (const player of participants) {
		const won = winners.includes(player);
		const levelBefore = levelForXp(getProfile(player)?.xp ?? 0).level;
		updateProfile(player, (data) => {
			data.stats.matches += 1;
			if (won) data.stats.wins += 1;
		});
		if ((matchXp.get(player) ?? 0) > 0) {
			awardXp(player, XpConfig.matchCompleted);
			if (won) awardXp(player, XpConfig.win);
		}
		const profile = getProfile(player);
		if (!profile) continue;
		const level = levelForXp(profile.xp).level;
		Remotes.MatchXp.FireClient(player, matchXp.get(player) ?? 0, level, level > levelBefore);
	}
	matchXp.clear();
}

// Top speed is measured on the server from replicated physics, so a modified client can't
// claim a speed it never reached.
function sampleSpeeds() {
	for (const player of Players.GetPlayers()) {
		const root = getLiveRoot(player);
		if (!root) continue;
		const velocity = root.AssemblyLinearVelocity;
		const speed = math.floor(new Vector3(velocity.X, 0, velocity.Z).Magnitude);
		const best = getProfile(player)?.stats.topSpeed;
		const rising = risingSpeed.get(player);
		if (best === undefined || speed <= best || speed > MAX_CREDIBLE_SPEED) {
			// Speed stopped climbing: announce the record just set.
			if (rising) {
				risingSpeed.delete(player);
				if (rising.announce) Remotes.PersonalBest.FireClient(player, "topSpeed", rising.speed);
			}
			continue;
		}
		risingSpeed.set(player, {
			speed,
			announce: (rising?.announce ?? false) || best >= MIN_ANNOUNCED_SPEED,
		});
		updateProfile(player, (data) => {
			data.stats.topSpeed = speed;
		});
	}
}

export function startProgression() {
	Players.PlayerRemoving.Connect((player) => {
		matchXp.delete(player);
		risingSpeed.delete(player);
	});
	Remotes.MarkOnboarding.OnServerEvent.Connect((player, key) => {
		const valid = ONBOARDING_KEYS.find((candidate) => candidate === key);
		if (!valid) return;
		updateProfile(player, (data) => {
			data.onboarding[valid] = true;
		});
	});

	Remotes.SaveSettings.OnServerEvent.Connect((player, settings) => {
		const clean = sanitizeSettings(settings);
		updateProfile(player, (data) => {
			data.settings = clean;
		});
	});

	task.spawn(() => {
		for (;;) {
			task.wait(SPEED_SAMPLE_INTERVAL);
			sampleSpeeds();
		}
	});
	task.spawn(() => {
		for (;;) {
			task.wait(PLAY_TIME_INTERVAL);
			for (const player of Players.GetPlayers()) {
				updateProfile(player, (data) => {
					data.stats.playSeconds += PLAY_TIME_INTERVAL;
				});
			}
		}
	});
}
