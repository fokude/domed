// Loads a map Model into the workspace and turns its markers into gameplay data.

import { MODE_IDS, ModeId, TEAM_IDS, TeamId } from "shared/modes";
import { DEFAULT_ARC_HEIGHT, LIGHTING_FOLDER, MapAttribute, MapTag, PAD_TARGET_LINK, ROOT_HEIGHT } from "./markers";

const CollectionService = game.GetService("CollectionService");
const Lighting = game.GetService("Lighting");
const Workspace = game.GetService("Workspace");

const DEFAULT_GRAVITY = 196.2;
const DEFAULT_KILL_HEIGHT = -100;

export interface MapInfo {
	id: string;
	name: string;
	tagline: string;
	modes: ModeId[];
}

export interface SpawnPoint {
	cframe: CFrame;
	team?: TeamId;
}

export interface LoadedMap {
	info: MapInfo;
	arena: Model;
	spawns: SpawnPoint[];
	flagBases: Map<TeamId, Vector3>;
	killHeight: number;
}

const LIGHTING_EFFECT_CLASSES = new Set([
	"Atmosphere",
	"BloomEffect",
	"BlurEffect",
	"ColorCorrectionEffect",
	"DepthOfFieldEffect",
	"SunRaysEffect",
]);

function attribute<T extends AttributeValue>(instance: Instance, name: string, check: string, fallback: T): T {
	const value = instance.GetAttribute(name);
	return typeOf(value) === check ? (value as T) : fallback;
}

function readTeam(instance: Instance): TeamId | undefined {
	const team = instance.GetAttribute(MapAttribute.Team);
	return TEAM_IDS.find((id) => id === team);
}

export function readMapInfo(map: Model): MapInfo {
	const modes = attribute(map, MapAttribute.Modes, "string", "Deathmatch")
		.split(",")
		.mapFiltered((mode) => MODE_IDS.find((id) => id === mode.gsub("%s", "")[0]));
	return {
		id: map.Name,
		name: attribute(map, MapAttribute.DisplayName, "string", map.Name),
		tagline: attribute(map, MapAttribute.Tagline, "string", ""),
		modes,
	};
}

function tagged(root: Instance, tag: string): Instance[] {
	return root.GetDescendants().filter((descendant) => CollectionService.HasTag(descendant, tag));
}

function feetPosition(part: BasePart): Vector3 {
	return part.Position.sub(new Vector3(0, part.Size.Y / 2, 0));
}

function applyLighting(folder: Instance | undefined) {
	for (const child of Lighting.GetChildren()) {
		if (LIGHTING_EFFECT_CLASSES.has(child.ClassName)) child.Destroy();
	}
	Workspace.Terrain.FindFirstChildOfClass("Clouds")?.Destroy();

	const settings = folder ?? new Instance("Folder");
	Lighting.ClockTime = attribute(settings, "ClockTime", "number", 14);
	Lighting.Brightness = attribute(settings, "Brightness", "number", 2);
	Lighting.Ambient = attribute(settings, "Ambient", "Color3", Color3.fromRGB(70, 70, 80));
	Lighting.OutdoorAmbient = attribute(settings, "OutdoorAmbient", "Color3", Color3.fromRGB(90, 90, 100));
	for (const effect of settings.GetChildren()) {
		effect.Clone().Parent = Lighting;
	}
}

// Velocity that carries a body from `from` to `to`, peaking `arcHeight` above the higher point.
function launchVelocity(from: Vector3, to: Vector3, arcHeight: number): Vector3 {
	const gravity = Workspace.Gravity;
	const apex = math.max(from.Y, to.Y) + arcHeight;
	const verticalSpeed = math.sqrt(2 * gravity * (apex - from.Y));
	const flightTime = verticalSpeed / gravity + math.sqrt((2 * (apex - to.Y)) / gravity);
	const horizontal = new Vector3(to.X - from.X, 0, to.Z - from.Z);
	return horizontal.div(flightTime).add(new Vector3(0, verticalSpeed, 0));
}

function setUpJumpPads(arena: Model) {
	const rootOffset = new Vector3(0, ROOT_HEIGHT, 0);
	for (const pad of tagged(arena, MapTag.JumpPad)) {
		const link = pad.FindFirstChild(PAD_TARGET_LINK);
		const target = link?.IsA("ObjectValue") ? link.Value : undefined;
		if (!pad.IsA("BasePart") || !target?.IsA("BasePart")) {
			warn(`Jump pad ${pad.GetFullName()} has no ${PAD_TARGET_LINK} pointing at a part`);
			continue;
		}
		const padTop = pad.Position.add(new Vector3(0, pad.Size.Y / 2, 0));
		const arcHeight = attribute(pad, MapAttribute.ArcHeight, "number", DEFAULT_ARC_HEIGHT);
		pad.SetAttribute(
			MapAttribute.Launch,
			launchVelocity(padTop.add(rootOffset), target.Position.add(rootOffset), arcHeight),
		);
		link?.Destroy();
	}
}

function collectSpawns(arena: Model): SpawnPoint[] {
	const spawns: SpawnPoint[] = [];
	for (const marker of tagged(arena, MapTag.Spawn)) {
		if (!marker.IsA("BasePart")) continue;
		const root = feetPosition(marker).add(new Vector3(0, ROOT_HEIGHT + 0.5, 0));
		const look = new Vector3(marker.CFrame.LookVector.X, 0, marker.CFrame.LookVector.Z);
		spawns.push({ cframe: CFrame.lookAt(root, root.add(look)), team: readTeam(marker) });
	}
	return spawns;
}

function collectFlagBases(arena: Model): Map<TeamId, Vector3> {
	const bases = new Map<TeamId, Vector3>();
	for (const marker of tagged(arena, MapTag.FlagBase)) {
		const team = readTeam(marker);
		if (marker.IsA("BasePart") && team) bases.set(team, feetPosition(marker));
	}
	return bases;
}

// Replaces the current map. Gravity is set before jump pads are configured because their
// launch velocities depend on it.
export function loadMap(source: Model): LoadedMap {
	for (const name of ["Arena", "Baseplate", "SpawnLocation"]) {
		Workspace.FindFirstChild(name)?.Destroy();
	}

	const arena = source.Clone();
	arena.Name = "Arena";
	Workspace.Gravity = attribute(arena, MapAttribute.Gravity, "number", DEFAULT_GRAVITY);

	const lighting = arena.FindFirstChild(LIGHTING_FOLDER);
	applyLighting(lighting);
	lighting?.Destroy();

	setUpJumpPads(arena);
	const spawns = collectSpawns(arena);
	const flagBases = collectFlagBases(arena);
	for (const tag of [MapTag.Spawn, MapTag.FlagBase, MapTag.PadTarget]) {
		tagged(arena, tag).forEach((marker) => marker.Destroy());
	}

	arena.Parent = Workspace;
	return {
		info: readMapInfo(source),
		arena,
		spawns,
		flagBases,
		killHeight: attribute(arena, MapAttribute.KillHeight, "number", DEFAULT_KILL_HEIGHT),
	};
}
