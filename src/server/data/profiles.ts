// Loads and saves each player's progression with ProfileStore, which session-locks profiles so
// two servers can never overwrite each other's saves, retries failed saves, and saves on leave
// and shutdown. Without DataStore access (Studio with API access off) it uses mock profiles.

import ProfileStore from "@rbxts/profile-store";
import { RatingConfig } from "shared/config";
import { levelForXp, PlayerProfile, PROFILE_ATTRIBUTE, VisibleProfile } from "shared/progression";
import { setLevelStat } from "../stats";

const HttpService = game.GetService("HttpService");
const Players = game.GetService("Players");

const TEMPLATE: PlayerProfile = {
	xp: 0,
	stats: {
		kills: 0,
		deaths: 0,
		wins: 0,
		matches: 0,
		flagCaptures: 0,
		pointCaptures: 0,
		hardpointSeconds: 0,
		playSeconds: 0,
		topSpeed: 0,
		longestHeadshot: 0,
	},
	onboarding: {},
	rating: { mu: RatingConfig.initialMu, sigma: RatingConfig.initialSigma },
};

const store = ProfileStore.New("PlayerProfiles", TEMPLATE);
const profiles = new Map<Player, ProfileStore.Profile<PlayerProfile>>();

// Sends the player's profile to their client, minus the hidden rating.
function publish(player: Player, data: PlayerProfile) {
	const visible: VisibleProfile = { xp: data.xp, stats: data.stats, onboarding: data.onboarding };
	player.SetAttribute(PROFILE_ATTRIBUTE, HttpService.JSONEncode(visible));
	setLevelStat(player, levelForXp(data.xp).level);
}

function load(player: Player) {
	const profile = store.StartSessionAsync(`Player_${player.UserId}`, {
		Cancel: () => player.Parent !== Players,
	});
	if (!profile) {
		// Playing on without a profile would silently lose progress.
		if (player.Parent === Players) player.Kick("Couldn't load your profile. Please rejoin.");
		return;
	}
	profile.AddUserId(player.UserId);
	profile.Reconcile();
	profile.OnSessionEnd.Connect(() => {
		profiles.delete(player);
		if (player.Parent === Players) player.Kick("Your profile was opened somewhere else. Please rejoin.");
	});

	if (player.Parent !== Players) {
		profile.EndSession();
		return;
	}
	profiles.set(player, profile);
	publish(player, profile.Data);
}

// The player's saved data, if their profile is loaded.
export function getProfile(player: Player): PlayerProfile | undefined {
	return profiles.get(player)?.Data;
}

// Changes a player's saved data and sends the update to their client. Does nothing if the
// profile isn't loaded (still loading, or the player is leaving).
export function updateProfile(player: Player, change: (data: PlayerProfile) => void) {
	const profile = profiles.get(player);
	if (!profile || !profile.IsActive()) return;
	change(profile.Data);
	publish(player, profile.Data);
}

export function startProfiles() {
	Players.PlayerAdded.Connect((player) => task.spawn(load, player));
	Players.GetPlayers().forEach((player) => task.spawn(load, player));
	Players.PlayerRemoving.Connect((player) => {
		profiles.get(player)?.EndSession();
		profiles.delete(player);
	});
}
