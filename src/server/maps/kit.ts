// Building blocks for maps. Positions passed to these helpers are top surfaces unless noted,
// because that is what matters for layout: where players stand.

const CollectionService = game.GetService("CollectionService");
const Lighting = game.GetService("Lighting");
const Workspace = game.GetService("Workspace");

export const HAZARD_TAG = "Hazard";
export const JUMP_PAD_TAG = "JumpPad";

// HumanoidRootPart height above the feet, used for spawn heights and pad trajectories.
const ROOT_HEIGHT = 3;

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

// Velocity that carries a body from `from` to `to`, peaking `arcHeight` above the higher point.
function launchVelocity(from: Vector3, to: Vector3, arcHeight: number): Vector3 {
	const gravity = Workspace.Gravity;
	const apex = math.max(from.Y, to.Y) + arcHeight;
	const verticalSpeed = math.sqrt(2 * gravity * (apex - from.Y));
	const flightTime = verticalSpeed / gravity + math.sqrt((2 * (apex - to.Y)) / gravity);
	const horizontal = new Vector3(to.X - from.X, 0, to.Z - from.Z);
	return horizontal.div(flightTime).add(new Vector3(0, verticalSpeed, 0));
}

// Pad sitting on `position` that lands players on `target`. Requires Workspace.Gravity to be
// set for the map before building.
export function jumpPad(parent: Instance, position: Vector3, target: Vector3, arcHeight: number, style: Style): Part {
	const pad = slab(parent, position.add(new Vector3(0, 0.6, 0)), new Vector3(8, 0.6, 8), style, "JumpPad");
	const rootOffset = new Vector3(0, ROOT_HEIGHT, 0);
	pad.SetAttribute("Launch", launchVelocity(position.add(rootOffset), target.add(rootOffset), arcHeight));
	CollectionService.AddTag(pad, JUMP_PAD_TAG);
	return pad;
}

export function hazard<T extends BasePart>(part: T): T {
	CollectionService.AddTag(part, HAZARD_TAG);
	return part;
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

// Spawn standing on `position`, facing `lookAt` horizontally.
export function spawnAt(position: Vector3, lookAt: Vector3): CFrame {
	const root = position.add(new Vector3(0, ROOT_HEIGHT + 0.5, 0));
	return CFrame.lookAt(root, new Vector3(lookAt.X, root.Y, lookAt.Z));
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

const LIGHTING_EFFECT_CLASSES = new Set([
	"Atmosphere",
	"BloomEffect",
	"BlurEffect",
	"ColorCorrectionEffect",
	"DepthOfFieldEffect",
	"SunRaysEffect",
]);

// Replaces post-processing effects, including the Baseplate template's defaults. The Sky is
// kept: its stars show at night, which several maps rely on.
export function applyLighting(settings: LightingSettings) {
	for (const child of Lighting.GetChildren()) {
		if (LIGHTING_EFFECT_CLASSES.has(child.ClassName)) child.Destroy();
	}
	Workspace.Terrain.FindFirstChildOfClass("Clouds")?.Destroy();

	Lighting.ClockTime = settings.clockTime;
	Lighting.Brightness = settings.brightness;
	Lighting.Ambient = settings.ambient;
	Lighting.OutdoorAmbient = settings.outdoorAmbient;
	Lighting.GlobalShadows = true;

	if (settings.atmosphere) {
		const atmosphere = new Instance("Atmosphere");
		atmosphere.Density = settings.atmosphere.density;
		atmosphere.Color = settings.atmosphere.color;
		atmosphere.Decay = settings.atmosphere.decay;
		atmosphere.Glare = settings.atmosphere.glare;
		atmosphere.Haze = settings.atmosphere.haze;
		atmosphere.Parent = Lighting;
	}
	if (settings.bloom) {
		const bloom = new Instance("BloomEffect");
		bloom.Intensity = settings.bloom.intensity;
		bloom.Size = settings.bloom.size;
		bloom.Threshold = settings.bloom.threshold;
		bloom.Parent = Lighting;
	}
	if (settings.colorCorrection) {
		const correction = new Instance("ColorCorrectionEffect");
		correction.TintColor = settings.colorCorrection.tint;
		correction.Contrast = settings.colorCorrection.contrast;
		correction.Saturation = settings.colorCorrection.saturation;
		correction.Brightness = settings.colorCorrection.brightness;
		correction.Parent = Lighting;
	}
}
