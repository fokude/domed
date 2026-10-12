// The local player's settings: loaded from their profile, changed from the Settings panel,
// and saved to the server a second after the last change, so clicking through options sends
// one save. Features read settings here and listen for changes. See docs/SETTINGS.md.

import { DEFAULT_SETTINGS, PlayerSettings, sanitizeSettings } from "shared/settings";
import { Remotes } from "shared/remotes";
import { getMyProfile, onMyProfileChanged } from "./profileData";

const SAVE_DELAY = 1;

let current: PlayerSettings = DEFAULT_SETTINGS;
let saveToken = 0;
const listeners: (() => void)[] = [];

export function getSettings(): PlayerSettings {
	return current;
}

export function onSettingsChanged(listener: () => void) {
	listeners.push(listener);
}

function apply(settings: PlayerSettings) {
	current = settings;
	for (const listener of listeners) listener();
}

// Applies a change right away and saves it once the player stops changing things.
export function changeSettings(update: Partial<PlayerSettings>) {
	apply({ ...current, ...update });
	const token = ++saveToken;
	task.delay(SAVE_DELAY, () => {
		if (saveToken === token) Remotes.SaveSettings.FireServer(current);
	});
}

// Takes the saved settings from the profile. Once the player has changed something this
// session, their client's settings win, so profile updates (echoes of our own saves) can't
// undo an edit in progress.
function loadFromProfile() {
	const profile = getMyProfile();
	if (!profile || saveToken > 0) return;
	apply(sanitizeSettings(profile.settings));
}

export function initPlayerSettings() {
	onMyProfileChanged(loadFromProfile);
	loadFromProfile();
}
