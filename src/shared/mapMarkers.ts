// Map marker conventions shared by map authoring (Studio or the kit), the server loader, and
// the client (jump pads).
// docs/MAPPING.md documents these for map makers; keep the two in sync.

export const MapTag = {
	Spawn: "Spawn",
	FlagBase: "FlagBase",
	JumpPad: "JumpPad",
	PadTarget: "PadTarget",
	Hazard: "Hazard",
	ControlPoint: "ControlPoint",
	Perk: "Perk",
	// Training dummies, for test maps.
	Dummy: "Dummy",
} as const;

export const MapAttribute = {
	DisplayName: "DisplayName",
	Tagline: "Tagline",
	// Background music for the map: a Creator Store audio id, as "rbxassetid://<id>".
	Music: "Music",
	// Comma-separated mode ids, e.g. "Deathmatch,CTF".
	Modes: "Modes",
	Gravity: "Gravity",
	KillHeight: "KillHeight",
	// Optional: the highest height players can stand at, such as under an indoor map's roof.
	// Measurements ignore standing spots above it (a roof nobody can reach).
	PlayableTop: "PlayableTop",
	// Accent color for the map's vote card.
	ThemeColor: "ThemeColor",
	// Test maps: reachable with /map in Studio, never in rotation or votes.
	DevOnly: "DevOnly",
	// On Spawn and FlagBase markers.
	Team: "Team",
	// On jump pads: how far above the higher end the arc peaks.
	ArcHeight: "ArcHeight",
	// On ControlPoint markers: the point's letter, and the zone radius in studs.
	Label: "Label",
	Radius: "Radius",
	// On ControlPoint markers: "Domination" or "Hardpoint" to use a point in one mode only.
	PointMode: "PointMode",
	// On Perk markers: which perk the orb gives (SuperJump, Shield, Overcharge, Radar).
	PerkType: "PerkType",
	// On Perk markers: seconds before the orb comes back, overriding the perk's default.
	Respawn: "Respawn",
	// On Dummy markers: how it moves (Static, Strafe, Circle, Fast, Hop), and whether it has a
	// shield that absorbs the first headshot.
	DummyPattern: "DummyPattern",
	Shielded: "Shielded",
	// Set on jump pads by the loader, read by the client.
	Launch: "Launch",
} as const;

// Name of the ObjectValue under a jump pad that points at its PadTarget.
export const PAD_TARGET_LINK = "Target";
// Folder in a map holding lighting attributes and post-processing effects.
export const LIGHTING_FOLDER = "Lighting";
// Folder in a map holding visual-only art (such as Blender meshes). Everything in it is made
// non-solid and invisible to shots when the map loads; gameplay runs on the simple geometry
// outside it. See docs/MAPPING.md.
export const ART_FOLDER = "Art";

// HumanoidRootPart height above the feet.
export const ROOT_HEIGHT = 3;
export const DEFAULT_ARC_HEIGHT = 8;
