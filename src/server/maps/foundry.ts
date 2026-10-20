// Foundry: a forge at a planet's core, the tournament's close-quarters arena. Dense and indoor,
// in the spirit of Unreal Tournament's industrial deathmatch maps (an archetype, not a copy):
// a three-by-three grid of rooms where fights are short and sudden. In the middle, the
// Crucible Hall: a pit of molten metal, a bridge across it, and a crane platform
// above, reached by jump pads. Red's bay is north (-Z), Blue's south (+Z); the long Furnace
// Row on the east side is the speed runway, and the two-level Mezzanine is on the west.
//
// Heights: floor 0, mezzanine gallery and bridge 18, crane 34, roof 52.

import {
	block,
	controlPointMarker,
	cylinder,
	hazard,
	jumpPad,
	perkMarker,
	plank,
	plateWithHoles,
	pointLight,
	ramp,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
	wallWithGaps,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const Steel: Style = { color: Color3.fromRGB(70, 72, 78), material: Enum.Material.DiamondPlate };
const DarkSteel: Style = { color: Color3.fromRGB(44, 44, 50), material: Enum.Material.Metal };
const Concrete: Style = { color: Color3.fromRGB(96, 92, 88), material: Enum.Material.Concrete };
const Rust: Style = { color: Color3.fromRGB(120, 70, 45), material: Enum.Material.CorrodedMetal };
const Hazard: Style = { color: Color3.fromRGB(240, 190, 30), material: Enum.Material.SmoothPlastic };
const Molten: Style = { color: Color3.fromRGB(255, 120, 20), material: Enum.Material.Neon, collide: false };
const Glow: Style = {
	color: Color3.fromRGB(255, 140, 40),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Pad: Style = { color: Color3.fromRGB(255, 200, 40), material: Enum.Material.Neon };

const GLOW = Color3.fromRGB(255, 140, 50);

const X_EDGE = 110;
const Z_EDGE = 130;
const COLUMN = 35; // walls between the west, center and east columns
const ROW = 45; // walls between the north, middle and south rows
const GALLERY = 18;
const CRANE = 34;
const ROOF = 52;
const WALL = ROOF; // internal walls run floor to roof
const PIT_HALF = 10;
// Spawn pockets: a wall across the back of a room, this far from the outer wall, with the
// way out at one end. Nothing in front can see into the pocket.
const POCKET_DEPTH = 26;
const POCKET_GAP = 10;

function light(arena: Model, position: Vector3, range = 30, brightness = 1.4) {
	const lamp = block(arena, new Vector3(2, 0.6, 2), new CFrame(position), Glow, "Lamp");
	pointLight(lamp, GLOW, range, brightness);
}

function buildShell(arena: Model) {
	// Floor with the crucible pit cut out of the middle.
	plateWithHoles(arena, 0, -X_EDGE, X_EDGE, -Z_EDGE, Z_EDGE, [[-PIT_HALF, PIT_HALF, -PIT_HALF, PIT_HALF]], Concrete);
	slab(arena, new Vector3(0, ROOF + 2, 0), new Vector3(X_EDGE * 2, 2, Z_EDGE * 2), DarkSteel, "Roof");
	for (const side of [-1, 1]) {
		wallWithGaps(arena, false, side * X_EDGE, -Z_EDGE, Z_EDGE, [], 0, ROOF, DarkSteel, 4);
		wallWithGaps(arena, true, side * Z_EDGE, -X_EDGE, X_EDGE, [], 0, ROOF, DarkSteel, 4);
	}
}

// Walls between the rooms, with 14-stud doorways.
function buildWalls(arena: Model) {
	for (const side of [-1, 1]) {
		const x = side * COLUMN;
		// Center column to the side columns: the bay doors near each end, two doors into the
		// Crucible Hall, and (west only) the slot the bridge passes through.
		const gaps: [number, number][] = [
			[-80, -66],
			[-25, -11],
			[11, 25],
			[66, 80],
		];
		if (side < 0) gaps.push([-5, 5]);
		wallWithGaps(arena, false, x, -Z_EDGE, Z_EDGE, gaps, 0, WALL, Steel, 3);

		// Row walls in the west and center columns (the east Furnace Row runs unbroken).
		const z = side * ROW;
		wallWithGaps(arena, true, z, -X_EDGE, -COLUMN, [[-80, -66]], 0, WALL, Steel, 3);
		wallWithGaps(
			arena,
			true,
			z,
			-COLUMN,
			COLUMN,
			[
				[-25, -11],
				[11, 25],
			],
			0,
			WALL,
			Steel,
			3,
		);
	}
}

// The Crucible Hall: molten pit, bridge, landing, crane platform and pads.
function buildCrucible(arena: Model) {
	hazard(slab(arena, new Vector3(0, -4, 0), new Vector3(PIT_HALF * 2, 2, PIT_HALF * 2), Molten, "MoltenMetal"));
	slab(arena, new Vector3(0, -6, 0), new Vector3(PIT_HALF * 2 + 2, 2, PIT_HALF * 2 + 2), DarkSteel, "PitFloor");
	for (const side of [-1, 1]) {
		// Hazard-striped lips around the pit.
		slab(
			arena,
			new Vector3(side * (PIT_HALF + 0.5), 0.3, 0),
			new Vector3(1, 0.3, PIT_HALF * 2 + 2),
			Hazard,
			"PitLip",
		);
		slab(
			arena,
			new Vector3(0, 0.3, side * (PIT_HALF + 0.5)),
			new Vector3(PIT_HALF * 2 + 2, 0.3, 1),
			Hazard,
			"PitLip",
		);
	}
	const glow = block(arena, new Vector3(2, 2, 2), new CFrame(0, -2, 0), Glow, "PitGlow");
	pointLight(glow, GLOW, 60, 3);

	// The bridge at gallery height runs from the Mezzanine across the pit to a landing on the
	// east side, held up by a support that doubles as cover.
	plank(arena, new Vector3(-COLUMN, GALLERY, 0), new Vector3(22, GALLERY, 0), 8, 1.5, Rust, "Bridge");
	slab(arena, new Vector3(28.5, GALLERY, 0), new Vector3(13, 2, 20), Steel, "Landing");
	slab(arena, new Vector3(28.5, GALLERY - 2, 0), new Vector3(8, GALLERY - 2, 10), DarkSteel, "LandingSupport");
	// Matching cover block on the west side.
	slab(arena, new Vector3(-26, 8, 0), new Vector3(8, 8, 10), DarkSteel, "Furnace");

	// The crane platform hangs over the pit: the high point, reached only by pads.
	slab(arena, new Vector3(0, CRANE, 0), new Vector3(16, 2, 16), Steel, "Crane");
	for (const side of [-1, 1]) {
		slab(arena, new Vector3(side * 7.5, CRANE + 1.2, 0), new Vector3(1, 1.2, 16), Hazard, "CraneRail");
	}
	cylinder(arena, new Vector3(0, ROOF, 0), ROOF - CRANE - 6, 2, DarkSteel, "CraneCable");
	cylinder(arena, new Vector3(0, CRANE + 6, 0), 4, 10, Rust, "Crucible");
	for (const x of [-26, 26]) {
		for (const z of [-32, 32]) {
			jumpPad(arena, new Vector3(x, 0, z), new Vector3(x > 0 ? 4 : -4, CRANE, z > 0 ? 4 : -4), 6, Pad);
		}
	}
	for (const [x, z] of [
		[-25, -25],
		[25, -25],
		[-25, 25],
		[25, 25],
	]) {
		light(arena, new Vector3(x, ROOF - 2, z), 50, 1.2);
	}
}

// The Mezzanine (west): a gallery along the west wall at 18, two ramps up, and a crosswalk
// from the gallery to the Crucible bridge.
function buildMezzanine(arena: Model) {
	slab(arena, new Vector3(-101, GALLERY, 0), new Vector3(18, 2, ROW * 2), Steel, "Gallery");
	slab(arena, new Vector3(-63.5, GALLERY, 0), new Vector3(57, 2, 10), Steel, "Crosswalk");
	for (const side of [-1, 1]) {
		ramp(arena, new Vector3(-48, 0, side * 26), new Vector3(-92, GALLERY, side * 26), 10, Rust);
		slab(arena, new Vector3(-101, GALLERY + 1, side * (ROW - 0.5)), new Vector3(18, 1, 1), Hazard, "GalleryEdge");
		// Machinery on the floor for cover.
		slab(arena, new Vector3(-70, 7, side * 10), new Vector3(10, 7, 6), DarkSteel, "Machine");
		light(arena, new Vector3(-70, GALLERY - 3, side * 30));
	}
	controlPointMarker(arena, new Vector3(-70, 0, 0), "3", 12, "Hardpoint");
}

// The Furnace Row (east): one long hall, the speed runway, with baffle walls staggered from
// alternate sides so it can't be watched end to end, and furnaces glowing in the east wall.
function buildFurnaceRow(arena: Model) {
	const baffles: [number, boolean][] = [
		[-80, true],
		[-35, false],
		[35, true],
		[80, false],
	];
	for (const [z, westSide] of baffles) {
		const x = westSide ? COLUMN + 22 : X_EDGE - 22;
		slab(arena, new Vector3(x, 22, z), new Vector3(44, 22, 3), Steel, "Baffle");
	}
	for (let z = -110; z <= 110; z += 44) {
		const furnace = slab(arena, new Vector3(X_EDGE - 5, 14, z), new Vector3(8, 14, 16), Rust, "Furnace");
		const mouth = block(arena, new Vector3(1, 6, 10), new CFrame(X_EDGE - 9.6, 5, z), Molten, "FurnaceMouth");
		pointLight(mouth, GLOW, 28, 2);
		furnace.Name = "Furnace";
	}
	controlPointMarker(arena, new Vector3(72, 0, 0), "2", 12, "Hardpoint");
}

// A wall across the back of a room from `x1` to `x2`, leaving gaps at the given ends, so the
// strip behind it is a spawn pocket nothing in the room can see into.
function spawnPocket(arena: Model, zSide: number, x1: number, x2: number, gaps: [number, number][]) {
	const z = zSide * (Z_EDGE - POCKET_DEPTH);
	wallWithGaps(arena, true, z, x1, x2, gaps, 0, 18, Steel, 2);
	slab(
		arena,
		new Vector3((x1 + x2) / 2, 0.3, z - zSide * 1.5),
		new Vector3(math.abs(x2 - x1), 0.3, 1),
		Hazard,
		"PocketStripe",
	);
}

// A team's bay: four spawns in a pocket at the back with a way out at each end, and doors to
// the Crucible Hall, the corner room and the Furnace Row.
function buildBay(arena: Model, side: number, team: "Red" | "Blue") {
	const back = side * (Z_EDGE - 12);
	spawnPocket(arena, side, -COLUMN, COLUMN, [
		[-COLUMN, -COLUMN + POCKET_GAP],
		[COLUMN - POCKET_GAP, COLUMN],
	]);
	for (const x of [-18, -8, 8, 18]) {
		spawnMarker(arena, new Vector3(x, 0, back), new Vector3(x > 0 ? COLUMN : -COLUMN, 0, back), team);
	}
	light(arena, new Vector3(0, 20, side * (Z_EDGE - 20)), 40, 1.5);
}

// Corner storage rooms: stacked crates for cover, and spawns for free-for-all.
function buildCorner(arena: Model, xSide: number, zSide: number) {
	const cx = xSide * 72;
	const cz = zSide * 88;
	slab(arena, new Vector3(cx - 10, 8, cz), new Vector3(8, 8, 8), Rust, "Crate");
	slab(arena, new Vector3(cx + 10, 6, cz + zSide * 12), new Vector3(8, 6, 8), Rust, "Crate");
	slab(arena, new Vector3(cx + 4, 12, cz - zSide * 10), new Vector3(6, 12, 6), DarkSteel, "Crate");
	// Spawn pocket, with its way out at the inner end by the bay.
	spawnPocket(arena, zSide, -X_EDGE, -COLUMN, [[-COLUMN - POCKET_GAP, -COLUMN]]);
	spawnMarker(arena, new Vector3(-90, 0, zSide * (Z_EDGE - 12)), new Vector3(-COLUMN, 0, zSide * (Z_EDGE - 12)));
	light(arena, new Vector3(cx, 22, cz), 40, 1.2);
}

export const Foundry: MapBuilder = {
	id: "Foundry",
	build(arena) {
		setMapInfo(arena, {
			name: "Foundry",
			tagline: "Close quarters at the core. Watch the pit.",
			modes: ["Deathmatch", "TeamDeathmatch", "Hardpoint"],
			gravity: 196.2,
			killHeight: -3,
			playableTop: CRANE + 2,
			themeColor: Color3.fromRGB(255, 140, 40),
			// Music: heavy industrial electronic, pounding and metallic. Pick a licensed Creator
			// Store track (see docs/FEEDBACK.md).
			music: "",
		});

		buildShell(arena);
		buildWalls(arena);
		buildCrucible(arena);
		buildMezzanine(arena);
		buildFurnaceRow(arena);
		buildBay(arena, -1, "Red");
		buildBay(arena, 1, "Blue");
		buildCorner(arena, -1, -1);
		buildCorner(arena, -1, 1);
		// The Furnace Row's ends take the east corners' spawns, in pockets opening at the outer end.
		for (const zSide of [-1, 1]) {
			spawnPocket(arena, zSide, COLUMN, X_EDGE, [[X_EDGE - POCKET_GAP, X_EDGE]]);
			spawnMarker(
				arena,
				new Vector3(55, 0, zSide * (Z_EDGE - 12)),
				new Vector3(X_EDGE, 0, zSide * (Z_EDGE - 12)),
			);
		}
		// The crowd watches through the roof's windows, so to speak: stands above the forge.
		spectatorRing(arena, Vector3.zero, 190, 60, Color3.fromRGB(255, 140, 40));

		// Hardpoints rotate along the center line, so neither team is closer: the bridge, the
		// Furnace Row, the Mezzanine, then the crane.
		controlPointMarker(arena, new Vector3(-12, GALLERY, 0), "1", 8, "Hardpoint");
		controlPointMarker(arena, new Vector3(0, CRANE, 0), "4", 8, "Hardpoint");

		perkMarker(arena, new Vector3(0, CRANE, 0), "Overcharge");
		perkMarker(arena, new Vector3(-101, GALLERY, 0), "Shield");
		perkMarker(arena, new Vector3(95, 0, 0), "Radar");
		perkMarker(arena, new Vector3(-72, 0, -88), "SuperJump");
		perkMarker(arena, new Vector3(-72, 0, 88), "SuperJump");

		setMapLighting(arena, {
			clockTime: 0,
			brightness: 0.5,
			ambient: Color3.fromRGB(90, 70, 60),
			outdoorAmbient: Color3.fromRGB(90, 70, 60),
			bloom: { intensity: 0.9, size: 24, threshold: 0.9 },
			colorCorrection: {
				tint: Color3.fromRGB(255, 236, 220),
				contrast: 0.12,
				saturation: 0.05,
				brightness: 0,
			},
		});
	},
};
