// Builds the arena from code at server start so the whole map lives in source control.
// Floor top sits at Y = 0 and the arena is centered on the origin.

import { MatchConfig } from "shared/config";

const CollectionService = game.GetService("CollectionService");
const Lighting = game.GetService("Lighting");
const Workspace = game.GetService("Workspace");

const ARENA_SIZE = 240;
const WALL_HEIGHT = 50;
const BARRIER_HEIGHT = 300;
const CENTER_HEIGHT = 24;
const TOWER_HEIGHT = 16;
const ROOT_HEIGHT = 3; // HumanoidRootPart height above the feet, used for pad trajectories

const Colors = {
	Floor: Color3.fromRGB(40, 42, 48),
	Wall: Color3.fromRGB(28, 30, 36),
	Structure: Color3.fromRGB(70, 74, 84),
	Trim: Color3.fromRGB(255, 70, 40),
	Pad: Color3.fromRGB(0, 220, 255),
};

function block(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material = Enum.Material.Concrete,
): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Anchored = true;
	part.Size = size;
	part.CFrame = cframe;
	part.Color = color;
	part.Material = material;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.Parent = parent;
	return part;
}

// WedgeParts slope down toward their front face, so point the front at the low end.
function ramp(parent: Instance, low: Vector3, high: Vector3, width: number) {
	const height = high.Y - low.Y;
	const flatLow = new Vector3(low.X, 0, low.Z);
	const flatHigh = new Vector3(high.X, 0, high.Z);
	const length = flatHigh.sub(flatLow).Magnitude;
	const center = flatLow
		.add(flatHigh)
		.div(2)
		.add(new Vector3(0, low.Y + height / 2, 0));

	const wedge = new Instance("WedgePart");
	wedge.Name = "Ramp";
	wedge.Anchored = true;
	wedge.Size = new Vector3(width, height, length);
	wedge.CFrame = CFrame.lookAt(center, center.add(flatLow.sub(flatHigh)));
	wedge.Color = Colors.Structure;
	wedge.Material = Enum.Material.DiamondPlate;
	wedge.Parent = parent;
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

function jumpPad(parent: Instance, position: Vector3, target: Vector3, arcHeight: number) {
	const pad = block(
		parent,
		"JumpPad",
		new Vector3(8, 1, 8),
		new CFrame(position.add(new Vector3(0, 0.5, 0))),
		Colors.Pad,
		Enum.Material.Neon,
	);
	const rootOffset = new Vector3(0, ROOT_HEIGHT, 0);
	pad.SetAttribute("Launch", launchVelocity(position.add(rootOffset), target.add(rootOffset), arcHeight));
	CollectionService.AddTag(pad, "JumpPad");
}

function spawnPoint(parent: Instance, position: Vector3) {
	const spawn = new Instance("SpawnLocation");
	spawn.Anchored = true;
	spawn.Neutral = true;
	spawn.Duration = MatchConfig.spawnProtection;
	spawn.Size = new Vector3(6, 1, 6);
	spawn.CFrame = CFrame.lookAt(position.add(new Vector3(0, 0.5, 0)), new Vector3(0, 0.5, 0));
	spawn.Color = Colors.Trim;
	spawn.Material = Enum.Material.Neon;
	spawn.Transparency = 0.4;
	spawn.Parent = parent;
}

function buildShell(arena: Folder) {
	const half = ARENA_SIZE / 2;
	block(
		arena,
		"Floor",
		new Vector3(ARENA_SIZE, 4, ARENA_SIZE),
		new CFrame(0, -2, 0),
		Colors.Floor,
		Enum.Material.Slate,
	);

	for (const side of [Vector3.xAxis, Vector3.xAxis.mul(-1), Vector3.zAxis, Vector3.zAxis.mul(-1)]) {
		const alongX = side.Z !== 0;
		const wallSize = alongX ? new Vector3(ARENA_SIZE + 8, 1, 4) : new Vector3(4, 1, ARENA_SIZE + 8);
		const offset = side.mul(half + 2);

		block(
			arena,
			"Wall",
			wallSize.mul(new Vector3(1, WALL_HEIGHT, 1)),
			new CFrame(offset.add(new Vector3(0, WALL_HEIGHT / 2, 0))),
			Colors.Wall,
		);

		const barrier = block(
			arena,
			"Barrier",
			wallSize.mul(new Vector3(1, BARRIER_HEIGHT, 1)),
			new CFrame(offset.add(new Vector3(0, WALL_HEIGHT + BARRIER_HEIGHT / 2, 0))),
			Colors.Wall,
		);
		barrier.Transparency = 1;
		barrier.CanQuery = false;

		const trimSize = alongX ? new Vector3(ARENA_SIZE, 0.6, 0.6) : new Vector3(0.6, 0.6, ARENA_SIZE);
		block(
			arena,
			"Trim",
			trimSize,
			new CFrame(side.mul(half - 0.3).add(new Vector3(0, 0.3, 0))),
			Colors.Trim,
			Enum.Material.Neon,
		);
	}
}

function buildCenter(arena: Folder) {
	block(
		arena,
		"CenterPlatform",
		new Vector3(40, 2, 40),
		new CFrame(0, CENTER_HEIGHT - 1, 0),
		Colors.Structure,
		Enum.Material.DiamondPlate,
	);
	for (const x of [-16, 16]) {
		for (const z of [-16, 16]) {
			block(
				arena,
				"Pillar",
				new Vector3(4, CENTER_HEIGHT - 2, 4),
				new CFrame(x, (CENTER_HEIGHT - 2) / 2, z),
				Colors.Wall,
			);
		}
	}

	ramp(arena, new Vector3(0, 0, 70), new Vector3(0, CENTER_HEIGHT, 20), 12);
	ramp(arena, new Vector3(0, 0, -70), new Vector3(0, CENTER_HEIGHT, -20), 12);

	for (const x of [-34, 34]) {
		jumpPad(arena, new Vector3(x, 0, 0), new Vector3(0, CENTER_HEIGHT, 0), 8);
	}
}

function buildTowers(arena: Folder) {
	for (const x of [-85, 85]) {
		for (const z of [-85, 85]) {
			block(
				arena,
				"Tower",
				new Vector3(26, TOWER_HEIGHT, 26),
				new CFrame(x, TOWER_HEIGHT / 2, z),
				Colors.Structure,
			);
			jumpPad(arena, new Vector3(x * 0.72, 0, z * 0.72), new Vector3(x, TOWER_HEIGHT, z), 8);
		}
		block(
			arena,
			"Catwalk",
			new Vector3(8, 1, 144),
			new CFrame(x, TOWER_HEIGHT - 0.5, 0),
			Colors.Structure,
			Enum.Material.DiamondPlate,
		);
	}
}

function buildCover(arena: Folder) {
	const pillarSpots = [
		new Vector3(40, 0, 40),
		new Vector3(-40, 0, 40),
		new Vector3(40, 0, -40),
		new Vector3(-40, 0, -40),
		new Vector3(60, 0, 0),
		new Vector3(-60, 0, 0),
		new Vector3(0, 0, 95),
		new Vector3(0, 0, -95),
	];
	for (const spot of pillarSpots) {
		block(arena, "Cover", new Vector3(6, 18, 6), new CFrame(spot.add(new Vector3(0, 9, 0))), Colors.Wall);
	}
}

function buildSpawns(arena: Folder) {
	const spots = [
		new Vector3(0, 0, 105),
		new Vector3(0, 0, -105),
		new Vector3(105, 0, 0),
		new Vector3(-105, 0, 0),
		new Vector3(50, 0, 105),
		new Vector3(-50, 0, -105),
		new Vector3(105, 0, -50),
		new Vector3(-105, 0, 50),
	];
	for (const spot of spots) {
		spawnPoint(arena, spot);
	}
}

function setLighting() {
	Lighting.ClockTime = 14;
	Lighting.Brightness = 2;
	Lighting.Ambient = Color3.fromRGB(70, 70, 80);
	Lighting.OutdoorAmbient = Color3.fromRGB(90, 90, 100);
}

export function buildArena(): Folder {
	// Remove the Baseplate template's defaults so players only spawn in the arena.
	for (const name of ["Arena", "Baseplate", "SpawnLocation"]) {
		Workspace.FindFirstChild(name)?.Destroy();
	}

	const arena = new Instance("Folder");
	arena.Name = "Arena";

	buildShell(arena);
	buildCenter(arena);
	buildTowers(arena);
	buildCover(arena);
	buildSpawns(arena);
	setLighting();

	arena.Parent = Workspace;
	return arena;
}
