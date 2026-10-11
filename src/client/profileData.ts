// The local player's saved profile, as sent by the server in the Profile attribute.

import { PlayerProfile, PROFILE_ATTRIBUTE } from "shared/progression";

const HttpService = game.GetService("HttpService");
const Players = game.GetService("Players");

const player = Players.LocalPlayer;

// Undefined until the server has loaded the profile.
export function getMyProfile(): PlayerProfile | undefined {
	const json = player.GetAttribute(PROFILE_ATTRIBUTE);
	if (!typeIs(json, "string")) return undefined;
	const [ok, value] = pcall(() => HttpService.JSONDecode(json));
	return ok ? (value as PlayerProfile) : undefined;
}

export function onMyProfileChanged(callback: () => void): RBXScriptConnection {
	return player.GetAttributeChangedSignal(PROFILE_ATTRIBUTE).Connect(callback);
}
