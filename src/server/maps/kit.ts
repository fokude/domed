// Helpers for building maps in code. Positions passed to these are top surfaces unless noted,
// because that is what matters for layout: where players stand. Maps built here are meant to
// be baked into Studio models and finished by hand (see docs/MAPPING.md).

import { ModeId, TEAM_COLORS, TeamId } from "shared/modes";
import { PerkId } from "shared/perks";
import { DEFAULT_ARC_HEIGHT, LIGHTING_FOLDER, MapAttribute, MapTag, PAD_TARGET_LINK } from "shared/mapMarkers";

const CollectionService = game.GetService("CollectionService");

export interface Style {
	color: Color3;
	material?: Enum.Material;
	transparency?: number;
	reflectance?: number;
	collide?: boolean;
	castShadow?: boolean;
}

function applyStyle(part: BasePart, style: Style) {
	part.Anchored = true;
	part.Color = style.color;
	part.Material = style.material ?? Enum.Material.SmoothPlastic;
	part.Transparency = style.transparency ?? 0;
	part.Reflectance = style.reflectance ?? 0;
	part.CanCollide = style.collide ?? true;
	part.CastShadow = style.castShadow ?? true;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
}

// `cframe` is the part's center, as with any Roblox part.
export function block(parent: Instance, size: Vector3, cframe: CFrame, style: Style, name = "Block"): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Size = size;
	part.CFrame = cframe;
	applyStyle(part, style);
	part.Parent = parent;
	return part;
}

// Axis-aligned block whose top face is centered on `top`.
export function slab(parent: Instance, top: Vector3, size: Vector3, style: Style, name = "Slab"): Part {
	return block(parent, size, new CFrame(top.sub(new Vector3(0, size.Y / 2, 0))), style, name);
}

// Vertical cylinder whose top face is centered on `top`.
export function cylinder(
	parent: Instance,
	top: Vector3,
	height: number,
	diameter: number,
	style: Style,
	name = "Cylinder",
): Part {
	const part = block(
		parent,
		new Vector3(height, diameter, diameter),
		new CFrame(top.sub(new Vector3(0, height / 2, 0))).mul(CFrame.Angles(0, 0, math.pi / 2)),
		style,
		name,
	);
	part.Shape = Enum.PartType.Cylinder;
	return part;
}

export function wedge(parent: Instance, size: Vector3, cframe: CFrame, style: Style, name = "Wedge"): WedgePart {
	const part = new Instance("WedgePart");
	part.Name = name;
	part.Size = size;
	part.CFrame = cframe;
	applyStyle(part, style);
	part.Parent = parent;
	return part;
}

// Solid ramp from `low` to `high` (both top-surface points). WedgeParts slope down toward
// their front face, so the front points at the low end.
export function ramp(parent: Instance, low: Vector3, high: Vector3, width: number, style: Style): WedgePart {
	const height = high.Y - low.Y;
	const flatLow = new Vector3(low.X, 0, low.Z);
	const flatHigh = new Vector3(high.X, 0, high.Z);
	const length = flatHigh.sub(flatLow).Magnitude;
	const center = flatLow
		.add(flatHigh)
		.div(2)
		.add(new Vector3(0, low.Y + height / 2, 0));
	return wedge(
		parent,
		new Vector3(width, height, length),
		CFrame.lookAt(center, center.add(flatLow.sub(flatHigh))),
		style,
		"Ramp",
	);
}

// Thin walkway between two top-surface points; it tilts if they differ in height.
export function plank(
	parent: Instance,
	from: Vector3,
	to: Vector3,
	width: number,
	thickness: number,
	style: Style,
	name = "Bridge",
): Part {
	const length = to.sub(from).Magnitude;
	const frame = CFrame.lookAt(from.add(to).div(2), to).mul(new CFrame(0, -thickness / 2, 0));
	return block(parent, new Vector3(width, thickness, length), frame, style, name);
}

// Point on a horizontal circle. Angle 0 points toward -Z, increasing counterclockwise from above.
export function onCircle(center: Vector3, radius: number, angle: number): Vector3 {
	return new CFrame(center).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, 0, -radius)).Position;
}

// Flat ring made of straight segments. `center` is the top surface at the ring's center.
export function ring(
	parent: Instance,
	center: Vector3,
	radius: number,
	width: number,
	thickness: number,
	segments: number,
	style: Style,
	name = "Ring",
): Part[] {
	const outerRadius = radius + width / 2;
	const segmentLength = 2 * outerRadius * math.tan(math.pi / segments) + 0.2;
	const parts: Part[] = [];
	for (let i = 0; i < segments; i++) {
		const angle = (i / segments) * 2 * math.pi;
		const frame = new CFrame(center).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, -thickness / 2, -radius));
		parts.push(block(parent, new Vector3(segmentLength, thickness, width), frame, style, name));
	}
	return parts;
}

export function pointLight(part: BasePart, color: Color3, range: number, brightness: number): PointLight {
	const light = new Instance("PointLight");
	light.Color = color;
	light.Range = range;
	light.Brightness = brightness;
	light.Parent = part;
	return light;
}

export function flames(part: BasePart, color: Color3, secondaryColor: Color3, size: number): Fire {
	const fire = new Instance("Fire");
	fire.Color = color;
	fire.SecondaryColor = secondaryColor;
	fire.Size = size;
	fire.Heat = size;
	fire.Parent = part;
	return fire;
}

const MarkerStyle: Style = {
	color: Color3.fromRGB(80, 255, 120),
	transparency: 0.5,
	collide: false,
	castShadow: false,
};

function tag<T extends Instance>(instance: T, name: string): T {
	CollectionService.AddTag(instance, name);
	return instance;
}

// Neon in a team's color, for base trim and flag stands.
export function teamGlow(team: TeamId): Style {
	return { color: TEAM_COLORS[team], material: Enum.Material.Neon, collide: false, castShadow: false };
}

// Decoration that shots and line-of-sight checks pass through, like backdrops and barriers.
export function scenery<T extends BasePart>(part: T): T {
	part.CanQuery = false;
	return part;
}

// Neon strips along the top edges of a box whose top face is centered on `top`.
export function outline(parent: Instance, top: Vector3, width: number, depth: number, style: Style) {
	const thickness = 0.4;
	for (const side of [-1, 1]) {
		const alongX = new Vector3(width, 0.4, thickness);
		const alongZ = new Vector3(thickness, 0.4, depth);
		slab(parent, top.add(new Vector3(0, 0.2, (side * (depth - thickness)) / 2)), alongX, style, "Edge");
		slab(parent, top.add(new Vector3((side * (width - thickness)) / 2, 0.2, 0)), alongZ, style, "Edge");
	}
}

// A wall standing on `base` along X (or Z) at `fixed`, from `from` to `to`, leaving a doorway
// in each `gaps` range.
export function wallWithGaps(
	parent: Instance,
	alongX: boolean,
	fixed: number,
	from: number,
	to: number,
	gaps: [number, number][],
	base: number,
	height: number,
	style: Style,
	thickness = 2,
) {
	const cuts = [math.min(from, to)];
	for (const [a, b] of gaps) {
		cuts.push(math.min(a, b), math.max(a, b));
	}
	cuts.push(math.max(from, to));
	for (let k = 0; k < cuts.size(); k += 2) {
		const [start, finish] = [cuts[k], cuts[k + 1]];
		if (finish - start < 0.5) continue;
		const middle = (start + finish) / 2;
		const top = alongX ? new Vector3(middle, base + height, fixed) : new Vector3(fixed, base + height, middle);
		const size = alongX
			? new Vector3(finish - start, height, thickness)
			: new Vector3(thickness, height, finish - start);
		slab(parent, top, size, style, "Wall");
	}
}

// A 2-stud floor plate with its top at `top` over a rectangle, leaving out `holes` (each
// [x1, x2, z1, z2]) for stairwells. Built from cells merged into runs, so it stays a handful of
// parts. Hole edges should fall on the cell grid.
export function plateWithHoles(
	parent: Instance,
	top: number,
	x1: number,
	x2: number,
	z1: number,
	z2: number,
	holes: [number, number, number, number][],
	style: Style,
	cell = 10,
) {
	const inHole = (x: number, z: number) =>
		holes.some(([hx1, hx2, hz1, hz2]) => x > hx1 && x < hx2 && z > hz1 && z < hz2);
	for (let z = z1; z < z2; z += cell) {
		let runStart: number | undefined;
		for (let x = x1; x <= x2; x += cell) {
			const solid = x < x2 && !inHole(x + cell / 2, z + cell / 2);
			if (solid && runStart === undefined) runStart = x;
			if (!solid && runStart !== undefined) {
				const center = new Vector3((runStart + x) / 2, top, z + cell / 2);
				slab(parent, center, new Vector3(x - runStart, 2, cell), style, "Floor");
				runStart = undefined;
			}
		}
	}
}

export function hazard<T extends BasePart>(part: T): T {
	return tag(part, MapTag.Hazard);
}

// Spawn marker standing on `position`, facing `lookAt`. Team spawns are also used in
// free-for-all modes.
export function spawnMarker(parent: Instance, position: Vector3, lookAt: Vector3, team?: TeamId): Part {
	const center = position.add(new Vector3(0, 2.5, 0));
	const marker = block(
		parent,
		new Vector3(3, 5, 1.5),
		CFrame.lookAt(center, new Vector3(lookAt.X, center.Y, lookAt.Z)),
		MarkerStyle,
		"Spawn",
	);
	if (team) marker.SetAttribute(MapAttribute.Team, team);
	return tag(marker, MapTag.Spawn);
}

export function flagBaseMarker(parent: Instance, position: Vector3, team: TeamId): Part {
	const marker = slab(parent, position.add(new Vector3(0, 1, 0)), new Vector3(4, 1, 4), MarkerStyle, "FlagBase");
	marker.SetAttribute(MapAttribute.Team, team);
	return tag(marker, MapTag.FlagBase);
}

// Pad sitting on `position` that lands players on `target`. The loader computes the launch
// velocity, so either end can be moved freely in Studio.
export function jumpPad(parent: Instance, position: Vector3, target: Vector3, arcHeight: number, style: Style): Part {
	const pad = slab(parent, position.add(new Vector3(0, 0.6, 0)), new Vector3(8, 0.6, 8), style, "JumpPad");
	if (arcHeight !== DEFAULT_ARC_HEIGHT) pad.SetAttribute(MapAttribute.ArcHeight, arcHeight);
	tag(pad, MapTag.JumpPad);

	const marker = block(parent, new Vector3(2, 2, 2), new CFrame(target), MarkerStyle, "PadTarget");
	marker.Shape = Enum.PartType.Ball;
	tag(marker, MapTag.PadTarget);

	const link = new Instance("ObjectValue");
	link.Name = PAD_TARGET_LINK;
	link.Value = marker;
	link.Parent = pad;
	return pad;
}

// Domination or Hardpoint zone centered on `position` (floor level). Without `mode` the point
// is used by both. Hardpoints rotate in label order.
export function controlPointMarker(
	parent: Instance,
	position: Vector3,
	label: string,
	radius = 12,
	mode?: "Domination" | "Hardpoint",
): Part {
	const marker = slab(parent, position.add(new Vector3(0, 1, 0)), new Vector3(4, 1, 4), MarkerStyle, "ControlPoint");
	marker.SetAttribute(MapAttribute.Label, label);
	if (radius !== 12) marker.SetAttribute(MapAttribute.Radius, radius);
	if (mode) marker.SetAttribute(MapAttribute.PointMode, mode);
	return tag(marker, MapTag.ControlPoint);
}

// Perk orb standing on `position` (floor level). `respawn` overrides the perk's default delay.
export function perkMarker(parent: Instance, position: Vector3, perk: PerkId, respawn?: number): Part {
	const marker = slab(parent, position.add(new Vector3(0, 1, 0)), new Vector3(3, 1, 3), MarkerStyle, "Perk");
	marker.SetAttribute(MapAttribute.PerkType, perk);
	if (respawn !== undefined) marker.SetAttribute(MapAttribute.Respawn, respawn);
	return tag(marker, MapTag.Perk);
}

export type DummyPattern = "Static" | "Strafe" | "Circle" | "Fast" | "Hop";

// Training dummy standing on `position`, facing `lookAt`.
export function dummyMarker(
	parent: Instance,
	position: Vector3,
	lookAt: Vector3,
	pattern: DummyPattern,
	shielded = false,
): Part {
	const marker = spawnMarker(parent, position, lookAt);
	CollectionService.RemoveTag(marker, MapTag.Spawn);
	marker.Name = "Dummy";
	marker.SetAttribute(MapAttribute.DummyPattern, pattern);
	if (shielded) marker.SetAttribute(MapAttribute.Shielded, true);
	return tag(marker, MapTag.Dummy);
}

export interface MapInfo {
	name: string;
	tagline: string;
	modes: ModeId[];
	gravity: number;
	killHeight: number;
	// The highest height players can stand at, for indoor maps with an unreachable roof.
	playableTop?: number;
	themeColor: Color3;
	devOnly?: boolean;
	// Background music, as "rbxassetid://<id>". See docs/FEEDBACK.md for choosing tracks.
	music?: string;
}

export function setMapInfo(map: Model, info: MapInfo) {
	map.SetAttribute(MapAttribute.DisplayName, info.name);
	map.SetAttribute(MapAttribute.Tagline, info.tagline);
	map.SetAttribute(MapAttribute.Modes, info.modes.join(","));
	map.SetAttribute(MapAttribute.Gravity, info.gravity);
	map.SetAttribute(MapAttribute.KillHeight, info.killHeight);
	if (info.playableTop !== undefined) map.SetAttribute(MapAttribute.PlayableTop, info.playableTop);
	map.SetAttribute(MapAttribute.ThemeColor, info.themeColor);
	if (info.devOnly) map.SetAttribute(MapAttribute.DevOnly, true);
	if (info.music !== undefined && info.music !== "") map.SetAttribute(MapAttribute.Music, info.music);
}

export interface LightingSettings {
	clockTime: number;
	brightness: number;
	ambient: Color3;
	outdoorAmbient: Color3;
	atmosphere?: { density: number; color: Color3; decay: Color3; glare: number; haze: number };
	bloom?: { intensity: number; size: number; threshold: number };
	colorCorrection?: { tint: Color3; contrast: number; saturation: number; brightness: number };
}

// Lighting lives in the map so it can be tuned in Studio: Lighting properties as attributes on
// the folder, post-processing effects as children copied into Lighting when the map loads.
export function setMapLighting(map: Model, settings: LightingSettings) {
	const folder = new Instance("Folder");
	folder.Name = LIGHTING_FOLDER;
	folder.SetAttribute("ClockTime", settings.clockTime);
	folder.SetAttribute("Brightness", settings.brightness);
	folder.SetAttribute("Ambient", settings.ambient);
	folder.SetAttribute("OutdoorAmbient", settings.outdoorAmbient);

	if (settings.atmosphere) {
		const atmosphere = new Instance("Atmosphere");
		atmosphere.Density = settings.atmosphere.density;
		atmosphere.Color = settings.atmosphere.color;
		atmosphere.Decay = settings.atmosphere.decay;
		atmosphere.Glare = settings.atmosphere.glare;
		atmosphere.Haze = settings.atmosphere.haze;
		atmosphere.Parent = folder;
	}
	if (settings.bloom) {
		const bloom = new Instance("BloomEffect");
		bloom.Intensity = settings.bloom.intensity;
		bloom.Size = settings.bloom.size;
		bloom.Threshold = settings.bloom.threshold;
		bloom.Parent = folder;
	}
	if (settings.colorCorrection) {
		const correction = new Instance("ColorCorrectionEffect");
		correction.TintColor = settings.colorCorrection.tint;
		correction.Contrast = settings.colorCorrection.contrast;
		correction.Saturation = settings.colorCorrection.saturation;
		correction.Brightness = settings.colorCorrection.brightness;
		correction.Parent = folder;
	}
	folder.Parent = map;
}
