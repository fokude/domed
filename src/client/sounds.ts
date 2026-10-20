// Sound cues. Every sound the game plays is listed here, so changing one is a one-line edit.
//
// The defaults are placeholders built from the few sounds that ship inside the Roblox client
// (rbxasset://sounds/...), so they work with no uploads. Replace them with audio from the
// Creator Store: paste its asset id as "rbxassetid://<id>". See docs/FEEDBACK.md.

const SoundService = game.GetService("SoundService");

export type SoundCue =
	| "kill"
	| "killThump"
	| "headshot"
	| "shieldHit"
	| "shieldBreak"
	| "perkPickup"
	| "death"
	| "personalBest"
	| "rocketJump"
	| "crowdRoar"
	| "announce";

interface CueSettings {
	id: string;
	volume: number;
	pitch: number;
}

const TICK = "rbxasset://sounds/volume_slider.ogg";

export const SOUND_CUES: Record<SoundCue, CueSettings> = {
	// Layered on a kill: a bright tick (pitched up per multi-kill) over a low thump.
	kill: { id: TICK, volume: 1, pitch: 1.6 },
	killThump: { id: "rbxasset://sounds/action_jump_land.mp3", volume: 0.8, pitch: 0.7 },
	// Layered on top of the kill cue for headshots: a bright electronic ping.
	headshot: { id: "rbxasset://sounds/electronicpingshort.wav", volume: 0.9, pitch: 1.2 },
	// A shield took a hit and holds.
	shieldHit: { id: TICK, volume: 0.6, pitch: 0.9 },
	shieldBreak: { id: "rbxasset://sounds/impact_water.mp3", volume: 0.7, pitch: 1.8 },
	perkPickup: { id: TICK, volume: 0.8, pitch: 1.2 },
	death: { id: "rbxasset://sounds/ouch.ogg", volume: 0.6, pitch: 1 },
	personalBest: { id: TICK, volume: 0.9, pitch: 2 },
	rocketJump: { id: "rbxasset://sounds/swoosh.wav", volume: 0.7, pitch: 0.8 },
	// A short sting under server-wide announcements.
	announce: { id: TICK, volume: 0.7, pitch: 0.8 },
	// The crowd, under the biggest announcements. One roar at a time (see
	// playSoundThrottled). Placeholder until a Creator Store crowd cheer is picked.
	crowdRoar: { id: "rbxasset://sounds/impact_water.mp3", volume: 0.8, pitch: 0.6 },
};

const lastPlayed = new Map<SoundCue, number>();

// Plays a cue unless it already played within `cooldown` seconds, so big shared cues (a crowd
// roar) don't stack into noise when events come in bursts.
export function playSoundThrottled(cue: SoundCue, cooldown: number) {
	const now = os.clock();
	if (now - (lastPlayed.get(cue) ?? -math.huge) < cooldown) return;
	lastPlayed.set(cue, now);
	playSound(cue);
}

// Plays a cue once. `pitchScale` multiplies the cue's pitch, for escalation.
export function playSound(cue: SoundCue, pitchScale = 1) {
	const settings = SOUND_CUES[cue];
	const sound = new Instance("Sound");
	sound.SoundId = settings.id;
	sound.Volume = settings.volume;
	sound.PlaybackSpeed = settings.pitch * pitchScale;
	sound.Parent = SoundService;
	sound.Ended.Connect(() => sound.Destroy());
	sound.Play();
}
