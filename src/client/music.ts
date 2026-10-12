// Background music: each map (and the warm-up) can have its own track, set by the map's Music
// attribute and replicated as match state. Tracks loop and crossfade when the arena changes,
// at the volume chosen in Settings. See docs/FEEDBACK.md.

import { getMatchState, onMatchStateChanged } from "shared/matchState";
import { MUSIC_LEVELS } from "shared/settings";
import { getSettings, onSettingsChanged } from "./playerSettings";

const SoundService = game.GetService("SoundService");
const TweenService = game.GetService("TweenService");

const FADE_SECONDS = 2;

let playing: Sound | undefined;
let playingId = "";

function targetVolume(): number {
	return MUSIC_LEVELS[getSettings().music];
}

function fadeTo(sound: Sound, volume: number, after?: () => void) {
	const tween = TweenService.Create(sound, new TweenInfo(FADE_SECONDS), { Volume: volume });
	if (after) tween.Completed.Connect(after);
	tween.Play();
}

function switchTrack() {
	const id = getMatchState("Music") ?? "";
	if (id === playingId) return;
	playingId = id;
	const old = playing;
	if (old) fadeTo(old, 0, () => old.Destroy());
	playing = undefined;
	if (id === "") return;

	const sound = new Instance("Sound");
	sound.Name = "Music";
	sound.SoundId = id;
	sound.Looped = true;
	sound.Volume = 0;
	sound.Parent = SoundService;
	sound.Play();
	fadeTo(sound, targetVolume());
	playing = sound;
}

export function initMusic() {
	onMatchStateChanged(["Music"], switchTrack);
	switchTrack();
	onSettingsChanged(() => {
		if (playing) playing.Volume = targetVolume();
	});
}
