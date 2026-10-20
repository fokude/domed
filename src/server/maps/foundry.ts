// Foundry: a forge at a planet's core, open to the sky so the tournament's crowd can look down
// into it. One big hall around a pit of molten metal, built for rocket jumps: clear floors,
// long runways and tiers each a rocket jump above the last (docs/MAP_DESIGN.md). Red's catwalk
// is north (-Z), Blue's south (+Z); the long lanes down the east and west walls, past the
// furnaces, are the speed runways.
//
// Heights: floor 0, ingot stacks 10, catwalks 20, crane 38, walls 70.

import {
	block,
	controlPointMarker,
	cylinder,
	hazard,
	jumpPad,
	perkMarker,
	plateWithHoles,
	pointLight,
	ramp,
	scenery,
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
// Overhead gantry and cables: seen, never stood on.
const Overhead: Style = { color: Color3.fromRGB(44, 44, 50), material: Enum.Material.Metal, collide: false };
const Pad: Style = { color: Color3.fromRGB(255, 200, 40), material: Enum.Material.Neon };

const GLOW = Color3.fromRGB(255, 140, 50);

const X_EDGE = 180;
const Z_EDGE = 130;
const WALL_HEIGHT = 70;
const INGOT = 10;
const CATWALK = 20;
const CRANE = 38;
const PIT_HALF = 20;
// Catwalks run the full width along the north and south walls, this deep.
const CATWALK_DEPTH = 30;
const CATWALK_FRONT = Z_EDGE - CATWALK_DEPTH;
// Spawn rooms sit behind the north and south walls, this deep, under a roof at catwalk height.
const ANNEX_DEPTH = 40;
const ANNEX_HALF_WIDTH = 160;
const DOOR_HEIGHT = CATWALK - 2;
// Doorways from each spawn room into the hall, under the catwalk. Every spawn stands behind a
// solid stretch of wall between them, so the hall can't see in.
const DOORS: [number, number][] = [
	[-150, -130],
	[-80, -60],
	[60, 80],
	[130, 150],
];

function light(arena: Model, position: Vector3, range = 60, brightness = 1.6) {
	const lamp = block(arena, new Vector3(3, 1, 3), new CFrame(position), Glow, "Lamp");
	pointLight(lamp, GLOW, range, brightness);
}

function buildShell(arena: Model) {
	// Floor with the crucible pit cut out of the middle.
	plateWithHoles(arena, 0, -X_EDGE, X_EDGE, -Z_EDGE, Z_EDGE, [[-PIT_HALF, PIT_HALF, -PIT_HALF, PIT_HALF]], Concrete);
	// Tall walls and no roof: high enough that a rocket jump from the crane can't reach the top.
	for (const side of [-1, 1]) {
		wallWithGaps(arena, false, side * X_EDGE, -Z_EDGE, Z_EDGE, [], 0, WALL_HEIGHT, DarkSteel, 4);
		// North and south walls have the spawn room doorways, closed above by lintels.
		wallWithGaps(arena, true, side * Z_EDGE, -X_EDGE, X_EDGE, DOORS, 0, WALL_HEIGHT, DarkSteel, 4);
		for (const [a, b] of DOORS) {
			slab(
				arena,
				new Vector3((a + b) / 2, WALL_HEIGHT, side * Z_EDGE),
				new Vector3(b - a, WALL_HEIGHT - DOOR_HEIGHT, 4),
				DarkSteel,
				"Lintel",
			);
		}
	}
	for (const x of [-120, 0, 120]) {
		for (const z of [-1, 1]) light(arena, new Vector3(x, 45, z * (Z_EDGE - 3)));
	}
}

// The Crucible: molten pit, the crane platform hanging over it (the high point), and the
// gantry it hangs from. Pads on the floor reach the crane; so does a rocket jump from a catwalk.
function buildCrucible(arena: Model) {
	hazard(slab(arena, new Vector3(0, -4, 0), new Vector3(PIT_HALF * 2, 2, PIT_HALF * 2), Molten, "MoltenMetal"));
	slab(arena, new Vector3(0, -6, 0), new Vector3(PIT_HALF * 2 + 2, 2, PIT_HALF * 2 + 2), DarkSteel, "PitFloor");
	for (const side of [-1, 1]) {
		// Flat hazard-striped lips around the pit: marked, but nothing to trip on.
		slab(
			arena,
			new Vector3(side * (PIT_HALF + 1), 0.1, 0),
			new Vector3(2, 0.1, PIT_HALF * 2 + 4),
			Hazard,
			"PitLip",
		);
		slab(
			arena,
			new Vector3(0, 0.1, side * (PIT_HALF + 1)),
			new Vector3(PIT_HALF * 2 + 4, 0.1, 2),
			Hazard,
			"PitLip",
		);
	}
	const glow = block(arena, new Vector3(4, 2, 4), new CFrame(0, -2, 0), Glow, "PitGlow");
	pointLight(glow, GLOW, 90, 4);

	slab(arena, new Vector3(0, CRANE, 0), new Vector3(28, 2, 28), Steel, "Crane");
	for (const side of [-1, 1]) {
		slab(arena, new Vector3(side * 13.5, CRANE + 0.1, 0), new Vector3(1, 0.1, 28), Hazard, "CraneEdge");
		scenery(cylinder(arena, new Vector3(side * 12, 62, 0), 62 - CRANE - 2, 1.5, Overhead, "CraneCable"));
	}
	scenery(slab(arena, new Vector3(0, 64, 0), new Vector3(X_EDGE * 2, 4, 6), Overhead, "Gantry"));
	scenery(cylinder(arena, new Vector3(0, 58, 0), 8, 12, { ...Rust, collide: false }, "Crucible"));

	for (const side of [-1, 1]) {
		jumpPad(arena, new Vector3(side * 40, 0, 0), new Vector3(side * 8, CRANE, 0), 8, Pad);
	}
}

// Ingot stacks: four big blocks around the pit, the stepping stones between floor and catwalk
// and the main cover on the floor. Big enough to land on at speed.
function buildIngots(arena: Model) {
	for (const x of [-70, 70]) {
		for (const z of [-45, 45]) {
			slab(arena, new Vector3(x, INGOT, z), new Vector3(26, INGOT, 26), Rust, "Ingots");
			slab(arena, new Vector3(x, INGOT + 0.1, z), new Vector3(24, 0.1, 24), Glow, "IngotGlow");
		}
	}
}

// A team's catwalk along its wall: the full width of the hall at 20, with a ramp up at each end
// running alongside its front edge. The doors to the team's spawn room open underneath.
function buildCatwalk(arena: Model, side: number) {
	const z = side * (Z_EDGE - CATWALK_DEPTH / 2);
	slab(arena, new Vector3(0, CATWALK, z), new Vector3(X_EDGE * 2 - 4, 2, CATWALK_DEPTH), Steel, "Catwalk");
	slab(
		arena,
		new Vector3(0, CATWALK + 0.1, side * (CATWALK_FRONT + 0.5)),
		new Vector3(X_EDGE * 2 - 4, 0.1, 1),
		Hazard,
		"CatwalkEdge",
	);
	for (const xSide of [-1, 1]) {
		ramp(
			arena,
			new Vector3(xSide * 125, 0, side * (CATWALK_FRONT - 8)),
			new Vector3(xSide * 85, CATWALK, side * (CATWALK_FRONT - 8)),
			16,
			Steel,
		);
	}

	light(arena, new Vector3(0, CATWALK - 4, z), 50, 1.4);
}

// A spawn room behind a team's wall: team spawns in the middle and free-for-all spawns further
// out, each behind solid wall and facing its nearest door, so there are two ways out of every
// part of the room.
function buildSpawnRoom(arena: Model, side: number, team: "Red" | "Blue") {
	const zMid = side * (Z_EDGE + ANNEX_DEPTH / 2);
	const zBack = side * (Z_EDGE + ANNEX_DEPTH);
	slab(arena, new Vector3(0, 0, zMid), new Vector3(ANNEX_HALF_WIDTH * 2, 2, ANNEX_DEPTH), Concrete, "SpawnFloor");
	slab(
		arena,
		new Vector3(0, CATWALK, zMid),
		new Vector3(ANNEX_HALF_WIDTH * 2, 2, ANNEX_DEPTH),
		DarkSteel,
		"SpawnRoof",
	);
	wallWithGaps(arena, true, zBack, -ANNEX_HALF_WIDTH, ANNEX_HALF_WIDTH, [], 0, CATWALK, DarkSteel, 4);
	for (const xSide of [-1, 1]) {
		wallWithGaps(arena, false, xSide * ANNEX_HALF_WIDTH, side * Z_EDGE, zBack, [], 0, CATWALK, DarkSteel, 4);
	}

	// A baffle inside each doorway, wider than the door, so the hall can't see diagonally
	// through it into the room. Players step round it on either side.
	for (const [a, b] of DOORS) {
		slab(
			arena,
			new Vector3((a + b) / 2, DOOR_HEIGHT, side * (Z_EDGE + 14)),
			new Vector3(b - a + 20, DOOR_HEIGHT, 2),
			DarkSteel,
			"DoorBaffle",
		);
	}

	const row = zBack - side * 6;
	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(arena, new Vector3(x, 0, row), new Vector3(x > 0 ? 70 : -70, 0, side * Z_EDGE), team);
	}
	for (const xSide of [-1, 1]) {
		spawnMarker(arena, new Vector3(xSide * 105, 0, row), new Vector3(xSide * 140, 0, side * Z_EDGE));
		light(arena, new Vector3(xSide * 70, CATWALK - 3, zMid), 40, 1.2);
	}
	light(arena, new Vector3(0, CATWALK - 3, zMid), 40, 1.2);
}

// Furnaces built into the east and west walls, glowing onto the side runways. They stand out
// only 6 studs, so the lanes stay clear.
function buildFurnaces(arena: Model) {
	for (const side of [-1, 1]) {
		for (const z of [-60, 0, 60]) {
			slab(arena, new Vector3(side * (X_EDGE - 5), 24, z), new Vector3(6, 24, 22), Rust, "Furnace");
			const mouth = block(
				arena,
				new Vector3(1, 8, 14),
				new CFrame(side * (X_EDGE - 8.6), 6, z),
				Molten,
				"FurnaceMouth",
			);
			pointLight(mouth, GLOW, 40, 2);
		}
	}
}

export const Foundry: MapBuilder = {
	id: "Foundry",
	build(arena) {
		setMapInfo(arena, {
			name: "Foundry",
			tagline: "Rocket jump the crucible. Don't fall in.",
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
		buildCrucible(arena);
		buildIngots(arena);
		buildCatwalk(arena, -1);
		buildCatwalk(arena, 1);
		buildSpawnRoom(arena, -1, "Red");
		buildSpawnRoom(arena, 1, "Blue");
		buildFurnaces(arena);
		// The crowd looks down into the open forge from above the walls.
		spectatorRing(arena, Vector3.zero, 250, 80, Color3.fromRGB(255, 140, 40));

		// Hardpoints rotate along the center line, so neither team is closer: the west runway,
		// the crane, then the east runway.
		controlPointMarker(arena, new Vector3(-150, 0, 0), "1", 14, "Hardpoint");
		controlPointMarker(arena, new Vector3(0, CRANE, 0), "2", 10, "Hardpoint");
		controlPointMarker(arena, new Vector3(150, 0, 0), "3", 14, "Hardpoint");

		perkMarker(arena, new Vector3(0, CRANE, 0), "Overcharge");
		perkMarker(arena, new Vector3(-150, 0, 0), "Shield");
		perkMarker(arena, new Vector3(150, 0, 0), "Radar");
		perkMarker(arena, new Vector3(0, CATWALK, -(Z_EDGE - CATWALK_DEPTH / 2)), "SuperJump");
		perkMarker(arena, new Vector3(0, CATWALK, Z_EDGE - CATWALK_DEPTH / 2), "SuperJump");

		setMapLighting(arena, {
			// Daylight through the open top, warmed by the tint: dark forges hid players.
			clockTime: 14,
			brightness: 2.5,
			ambient: Color3.fromRGB(160, 140, 125),
			outdoorAmbient: Color3.fromRGB(170, 150, 135),
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
