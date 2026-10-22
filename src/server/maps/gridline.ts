// A synthwave arena at sunset: purple floor under a magenta and cyan grid that runs out to the
// horizon, chrome structures, and a striped sun. Built around speed lanes: a sunken trench down
// the middle to build speed in, raised embankments down both sides as the high runways, an open
// field between them, and an overpass across the middle at the top. Billboards and speaker
// stacks on the field are its only cover. Each team's flag is on a platform at its end, and its
// spawn room is behind the end wall. Red's base is at +Z, Blue's at -Z. Earlier versions are
// recorded in docs/MAP_DESIGN.md.
//
// Heights: trench -10, field 0, base platforms 8, embankments 18, overpass 36.

import { TeamId } from "shared/modes";
import {
	block,
	controlPointMarker,
	cylinder,
	flagBaseMarker,
	gableRoof,
	jumpPad,
	outline,
	perkMarker,
	ramp,
	ring,
	scenery,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
	teamGlow,
	wallWithGaps,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const HALF_WIDTH = 140;
const HALF_LENGTH = 210;
const TRENCH = -6;
const BASE = 8;
const EMBANKMENT = 18;
const OVERPASS = 36;
// Side walls stay low above the embankments so the sunset is visible; an invisible barrier
// keeps players in.
const SIDE_WALL_HEIGHT = EMBANKMENT + 12;
const END_WALL_HEIGHT = 40;

const TRENCH_HALF_WIDTH = 20;
const TRENCH_HALF_LENGTH = 150;
const TRENCH_RAMP_END = 185;
// Embankments: 36 wide along each side wall, with a bank up from the field and a ramp at each end.
const EMBANKMENT_INNER = 104;
const BANK_WIDTH = 20;
const EMBANKMENT_HALF_LENGTH = 150;
const FLAG_Z = 192;
// Spawn rooms behind the end walls, entered through two doors in the field's corners.
const ROOM_DEPTH = 40;
const ROOM_HALF_WIDTH = 100;
const ROOM_HEIGHT = 24;
const DOOR_HEIGHT = 18;
const DOORS: [number, number][] = [
	[-90, -70],
	[70, 90],
];

const Floor: Style = { color: Color3.fromRGB(42, 20, 64), material: Enum.Material.SmoothPlastic, reflectance: 0.3 };
const Chrome: Style = { color: Color3.fromRGB(175, 180, 200), material: Enum.Material.Metal };
const Wall: Style = { color: Color3.fromRGB(110, 96, 150), material: Enum.Material.SmoothPlastic };
const Magenta: Style = {
	color: Color3.fromRGB(255, 60, 200),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Cyan: Style = {
	color: Color3.fromRGB(0, 230, 255),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Pad: Style = { color: Color3.fromRGB(0, 230, 255), material: Enum.Material.Neon };
const Sun: Style = {
	color: Color3.fromRGB(255, 110, 90),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const SunStripe: Style = { color: Color3.fromRGB(60, 24, 80), collide: false, castShadow: false };
const Barrier: Style = { color: new Color3(), transparency: 1 };

// A block with a neon outline round its top.
function coverBlock(parent: Instance, top: Vector3, size: Vector3, style: Style, glow: Style, name: string) {
	slab(parent, top, size, style, name);
	outline(parent, top, size.X, size.Z, glow);
}

// The field and trench floors, the trench's ramps, and the grid.
function buildGround(map: Model) {
	const sideWidth = HALF_WIDTH - TRENCH_HALF_WIDTH;
	const sideCenter = TRENCH_HALF_WIDTH + sideWidth / 2;
	const endLength = HALF_LENGTH - TRENCH_RAMP_END;
	for (const side of [-1, 1]) {
		slab(map, new Vector3(side * sideCenter, 0, 0), new Vector3(sideWidth, 8, HALF_LENGTH * 2), Floor, "Floor");
		slab(
			map,
			new Vector3(0, 0, side * (TRENCH_RAMP_END + endLength / 2)),
			new Vector3(TRENCH_HALF_WIDTH * 2, 8, endLength),
			Floor,
			"Floor",
		);
		ramp(
			map,
			new Vector3(0, TRENCH, side * TRENCH_HALF_LENGTH),
			new Vector3(0, 0, side * TRENCH_RAMP_END),
			TRENCH_HALF_WIDTH * 2,
			Floor,
		);
		slab(
			map,
			new Vector3(side * (TRENCH_HALF_WIDTH - 0.2), 0.05, 0),
			new Vector3(0.4, 0.1, TRENCH_RAMP_END * 2),
			Cyan,
			"TrenchEdge",
		);
		slab(
			map,
			new Vector3(side * (TRENCH_HALF_WIDTH - 0.2), TRENCH + 0.05, 0),
			new Vector3(0.4, 0.1, TRENCH_HALF_LENGTH * 2),
			Magenta,
			"TrenchLine",
		);
	}
	slab(
		map,
		new Vector3(0, TRENCH, 0),
		new Vector3(TRENCH_HALF_WIDTH * 2, 2, TRENCH_HALF_LENGTH * 2),
		Floor,
		"TrenchFloor",
	);

	// Grid: magenta lines run lengthwise, cyan lines across.
	const fieldWidth = EMBANKMENT_INNER - BANK_WIDTH - TRENCH_HALF_WIDTH;
	for (const side of [-1, 1]) {
		for (const x of [40, 65]) {
			slab(map, new Vector3(side * x, 0.05, 0), new Vector3(0.3, 0.1, HALF_LENGTH * 2), Magenta, "Grid");
		}
		for (let z = -HALF_LENGTH + 20; z < HALF_LENGTH; z += 20) {
			slab(
				map,
				new Vector3(side * (TRENCH_HALF_WIDTH + fieldWidth / 2), 0.05, z),
				new Vector3(fieldWidth, 0.1, 0.3),
				Cyan,
				"Grid",
			);
		}
	}
}

// The grid continues outside the arena to the horizon, below the playable floor.
function buildLandscape(map: Model) {
	const level = -20;
	const extent = 2000;
	scenery(slab(map, new Vector3(0, level, 0), new Vector3(extent, 2, extent), Floor, "Landscape"));
	for (let offset = -960; offset <= 960; offset += 80) {
		scenery(
			slab(map, new Vector3(offset, level + 0.05, 0), new Vector3(0.6, 0.1, extent), Magenta, "LandscapeGrid"),
		);
		scenery(slab(map, new Vector3(0, level + 0.05, offset), new Vector3(extent, 0.1, 0.6), Cyan, "LandscapeGrid"));
	}
}

// Low side walls, tall end walls with the spawn room doors, and invisible barriers above them.
function buildShell(map: Model) {
	for (const side of [-1, 1]) {
		const wallX = side * (HALF_WIDTH + 2);
		coverBlock(
			map,
			new Vector3(wallX, SIDE_WALL_HEIGHT, 0),
			new Vector3(4, SIDE_WALL_HEIGHT + 8, HALF_LENGTH * 2 + 8),
			Wall,
			Magenta,
			"Wall",
		);
		scenery(
			slab(
				map,
				new Vector3(wallX, SIDE_WALL_HEIGHT + 300, 0),
				new Vector3(4, 300, HALF_LENGTH * 2 + 8),
				Barrier,
				"Barrier",
			),
		);

		const wallZ = side * (HALF_LENGTH + 2);
		wallWithGaps(map, true, wallZ, -HALF_WIDTH - 4, HALF_WIDTH + 4, DOORS, 0, END_WALL_HEIGHT, Wall, 4);
		for (const [a, b] of DOORS) {
			slab(
				map,
				new Vector3((a + b) / 2, END_WALL_HEIGHT, wallZ),
				new Vector3(b - a, END_WALL_HEIGHT - DOOR_HEIGHT, 4),
				Wall,
				"Lintel",
			);
		}
		scenery(
			slab(
				map,
				new Vector3(0, END_WALL_HEIGHT + 300, wallZ),
				new Vector3(HALF_WIDTH * 2 + 8, 300, 4),
				Barrier,
				"Barrier",
			),
		);
	}
}

// Raised embankments along both side walls: the high runways, 300 long, with ramps at their
// ends and pads up from the field.
function buildEmbankments(map: Model) {
	const width = HALF_WIDTH - EMBANKMENT_INNER;
	for (const side of [-1, 1]) {
		const x = side * (EMBANKMENT_INNER + width / 2);
		coverBlock(
			map,
			new Vector3(x, EMBANKMENT, 0),
			new Vector3(width, EMBANKMENT, EMBANKMENT_HALF_LENGTH * 2),
			Wall,
			Magenta,
			"Embankment",
		);
		slab(map, new Vector3(x, EMBANKMENT + 0.05, 0), new Vector3(1, 0.1, EMBANKMENT_HALF_LENGTH * 2), Cyan, "Grid");
		// The inner face is a bank you can run up, so the field and the embankment see each other.
		ramp(
			map,
			new Vector3(side * (EMBANKMENT_INNER - BANK_WIDTH), 0, 0),
			new Vector3(side * EMBANKMENT_INNER, EMBANKMENT, 0),
			EMBANKMENT_HALF_LENGTH * 2,
			Wall,
		);
		for (const tip of [-1, 1]) {
			ramp(
				map,
				new Vector3(x, 0, tip * TRENCH_RAMP_END),
				new Vector3(x, EMBANKMENT, tip * EMBANKMENT_HALF_LENGTH),
				width,
				Wall,
			);
			jumpPad(
				map,
				new Vector3(side * 75, 0, tip * 100),
				new Vector3(side * (EMBANKMENT_INNER + 14), EMBANKMENT, tip * 100),
				6,
				Pad,
			);
		}
	}
}

// The overpass across the middle, from embankment to embankment over the trench: the high
// point. Two pylons hold it up, and pads beside them lift players onto it.
function buildOverpass(map: Model) {
	coverBlock(map, new Vector3(0, OVERPASS, 0), new Vector3(EMBANKMENT_INNER * 2, 2, 30), Chrome, Magenta, "Overpass");
	for (const side of [-1, 1]) {
		coverBlock(
			map,
			new Vector3(side * 45, OVERPASS - 2, 0),
			new Vector3(10, OVERPASS - 2, 10),
			Wall,
			Cyan,
			"Pylon",
		);
		jumpPad(map, new Vector3(side * 60, 0, 0), new Vector3(side * 30, OVERPASS, 0), 8, Pad);
	}
}

// Billboards on the field, its only cover.
function buildBillboards(map: Model) {
	for (const side of [-1, 1]) {
		for (const z of [-100, 100]) {
			coverBlock(map, new Vector3(side * 55, 20, z), new Vector3(30, 20, 4), Chrome, Cyan, "Billboard");
		}
	}
}

function buildBase(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;

	for (const height of [8, 24]) {
		slab(
			map,
			new Vector3(0, height, z(HALF_LENGTH - 0.1)),
			new Vector3(HALF_WIDTH * 2, 0.4, 0.2),
			glow,
			"WallStripe",
		);
	}

	const platformTop = new Vector3(0, BASE, z(FLAG_Z));
	slab(map, platformTop, new Vector3(60, BASE, 30), Chrome, "BasePlatform");
	outline(map, platformTop, 60, 30, glow);
	ramp(map, new Vector3(0, 0, z(FLAG_Z - 35)), new Vector3(0, BASE, z(FLAG_Z - 15)), 24, Chrome);
	for (const side of [-1, 1]) {
		ramp(map, new Vector3(side * 50, 0, z(FLAG_Z)), new Vector3(side * 30, BASE, z(FLAG_Z)), 14, Chrome);
	}
	const flagSpot = new Vector3(0, BASE + 0.5, z(FLAG_Z));
	cylinder(map, flagSpot, 0.5, 10, Wall, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);

	// The spawn room behind the end wall, with a baffle inside each door so the field can't see
	// in, and a steep roof.
	const zMid = z(HALF_LENGTH + 4 + ROOM_DEPTH / 2);
	const zBack = z(HALF_LENGTH + 4 + ROOM_DEPTH);
	slab(map, new Vector3(0, 0, zMid), new Vector3(ROOM_HALF_WIDTH * 2, 8, ROOM_DEPTH + 4), Floor, "SpawnFloor");
	wallWithGaps(map, true, zBack, -ROOM_HALF_WIDTH, ROOM_HALF_WIDTH, [], 0, ROOM_HEIGHT, Wall, 4);
	for (const side of [-1, 1]) {
		wallWithGaps(map, false, side * ROOM_HALF_WIDTH, z(HALF_LENGTH), zBack, [], 0, ROOM_HEIGHT, Wall, 4);
	}
	gableRoof(map, new CFrame(0, ROOM_HEIGHT, zMid), ROOM_HALF_WIDTH * 2 + 4, ROOM_DEPTH + 8, 25, Wall);
	for (const [a, b] of DOORS) {
		slab(
			map,
			new Vector3((a + b) / 2, DOOR_HEIGHT, z(HALF_LENGTH + 16)),
			new Vector3(b - a + 20, DOOR_HEIGHT, 2),
			Wall,
			"DoorBaffle",
		);
	}
	block(map, new Vector3(ROOM_HALF_WIDTH * 2 - 10, 0.4, 1), new CFrame(0, ROOM_HEIGHT - 1, zMid), glow, "RoomLight");

	const row = zBack - sign * 6;
	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(map, new Vector3(x, 0, row), new Vector3(x > 0 ? 80 : -80, 0, z(HALF_LENGTH)), team);
	}
	for (const side of [-1, 1]) {
		spawnMarker(map, new Vector3(side * 55, 0, row), new Vector3(side * 80, 0, z(HALF_LENGTH)));
	}
}

// Outrun sun on the horizon, off to one side so both teams see it the same way.
function buildSun(map: Model) {
	const sun = block(map, new Vector3(2, 260, 260), new CFrame(420, 90, 0), Sun, "Sun");
	sun.Shape = Enum.PartType.Cylinder;
	scenery(sun);
	const stripes: [number, number][] = [
		[30, 8],
		[52, 6],
		[70, 4],
		[84, 3],
	];
	for (const [height, thickness] of stripes) {
		scenery(block(map, new Vector3(1, thickness, 280), new CFrame(418, height, 0), SunStripe, "SunStripe"));
	}
}

export const Gridline: MapBuilder = {
	id: "Gridline",
	build(map) {
		setMapInfo(map, {
			name: "Gridline",
			tagline: "Ride the trench. Own the sunset.",
			modes: ["CTF", "Deathmatch", "TeamDeathmatch", "Domination", "Hardpoint"],
			gravity: 196.2,
			killHeight: -30,
			themeColor: Color3.fromRGB(255, 60, 200),
			// Music: synthwave with driving drums and arpeggios. Pick a licensed Creator Store track
			// (see docs/FEEDBACK.md).
			music: "",
		});

		buildGround(map);
		buildLandscape(map);
		buildShell(map);
		buildEmbankments(map);
		buildOverpass(map);
		buildBillboards(map);
		buildBase(map, "Red", 1);
		buildBase(map, "Blue", -1);
		buildSun(map);
		spectatorRing(map, Vector3.zero, 310, 50, Color3.fromRGB(255, 60, 200));

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(-65, 0, 0), "A", 14, "Domination");
		controlPointMarker(map, new Vector3(0, OVERPASS, 0), "B", 12, "Domination");
		controlPointMarker(map, new Vector3(65, 0, 0), "C", 14, "Domination");
		// Hardpoints: the trench first, then the embankments, alternating ends.
		controlPointMarker(map, new Vector3(0, TRENCH, 0), "1", 18, "Hardpoint");
		controlPointMarker(map, new Vector3(-115, EMBANKMENT, 90), "2", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(115, EMBANKMENT, -90), "3", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(-115, EMBANKMENT, -90), "4", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(115, EMBANKMENT, 90), "5", 16, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(0, OVERPASS, 0), "Overcharge");
		perkMarker(map, new Vector3(0, TRENCH, 0), "Radar");
		perkMarker(map, new Vector3(0, TRENCH, 100), "SuperJump");
		perkMarker(map, new Vector3(0, TRENCH, -100), "SuperJump");
		perkMarker(map, new Vector3(-115, EMBANKMENT, 40), "Shield");
		perkMarker(map, new Vector3(115, EMBANKMENT, -40), "Shield");

		setMapLighting(map, {
			clockTime: 17.8,
			brightness: 2,
			ambient: Color3.fromRGB(165, 135, 175),
			outdoorAmbient: Color3.fromRGB(180, 145, 185),
			atmosphere: {
				density: 0.25,
				color: Color3.fromRGB(255, 120, 170),
				decay: Color3.fromRGB(255, 140, 60),
				glare: 0.5,
				haze: 2,
			},
			bloom: { intensity: 0.4, size: 12, threshold: 1.6 },
			colorCorrection: {
				tint: Color3.fromRGB(255, 228, 240),
				contrast: 0.1,
				saturation: 0.3,
				brightness: 0,
			},
		});
	},
};
