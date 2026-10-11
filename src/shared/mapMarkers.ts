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
} as const;

export const MapAttribute = {
	DisplayName: "DisplayName",
	Tagline: "Tagline",
	// Comma-separated mode ids, e.g. "Deathmatch,CTF".
	Modes: "Modes",
	Gravity: "Gravity",
	KillHeight: "KillHeight",
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
	// Set on jump pads by the loader, read by the client.
	Launch: "Launch",
} as const;

// Name of the ObjectValue under a jump pad that points at its PadTarget.
export const PAD_TARGET_LINK = "Target";
// Folder in a map holding lighting attributes and post-processing effects.
export const LIGHTING_FOLDER = "Lighting";

// HumanoidRootPart height above the feet.
export const ROOT_HEIGHT = 3;
export const DEFAULT_ARC_HEIGHT = 8;
