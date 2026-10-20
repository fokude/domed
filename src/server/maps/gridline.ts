// A synthwave arena at sunset: purple floor under a magenta and cyan grid that runs out to the
// horizon, chrome structures, and a striped sun. Laid out for one-shot rails and fast movement
// in three lanes: covered neon arcades down each side, and an open field between them with a
// sunken trench to build speed out of sight, lane walls and billboards that break long
// sightlines, and an exposed raised platform in the middle. Every spawn sits in a pocket out
// of sight. Red's base is at +Z, Blue's at -Z.

import { TeamId } from "shared/modes";
import {
	block,
	controlPointMarker,
	cylinder,
	flagBaseMarker,
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
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const HALF_WIDTH = 122;
const HALF_LENGTH = 200;
// Side walls stay low so the sunset is visible; an invisible barrier keeps players in.
const SIDE_WALL_HEIGHT = 12;
const END_WALL_HEIGHT = 40;
const BASE_HEIGHT = 6;
const ARCH_HEIGHT = 22;

const TRENCH_HALF_WIDTH = 12;
const TRENCH_DEPTH = 6;
const TRENCH_HALF_LENGTH = 105;
const TRENCH_RAMP_END = 125;
const LANE_WALL_X = 28;
const LANE_WALL_HEIGHT = 12;
const ROOF_HEIGHT = 16;
// The neon arcades: covered halls along each side, between an inner wall and the side wall.
const ARCADE_INNER_X = 80;
const ARCADE_HALF_LENGTH = 150;
const ARCADE_HEIGHT = 18;
// Doorways through the arcades' inner walls, between them and the open field.
const ARCADE_DOORS: [number, number][] = [
	[-127, -113],
	[-67, -53],
	[-7, 7],
	[53, 67],
	[113, 127],
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

// Cover piece with a neon top edge.
function coverBlock(parent: Instance, top: Vector3, size: Vector3, style: Style, glow: Style, name: string) {
	slab(parent, top, size, style, name);
	outline(parent, top, size.X, size.Z, glow);
}

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
	}

	// Grid: magenta lines run lengthwise, cyan lines across.
	for (const x of [20, 40, 60, 90, 110]) {
		for (const side of [-1, 1]) {
			slab(map, new Vector3(side * x, 0.05, 0), new Vector3(0.3, 0.1, HALF_LENGTH * 2), Magenta, "Grid");
		}
	}
	for (let z = -HALF_LENGTH + 20; z < HALF_LENGTH; z += 20) {
		for (const side of [-1, 1]) {
			slab(map, new Vector3(side * sideCenter, 0.05, z), new Vector3(sideWidth, 0.1, 0.3), Cyan, "Grid");
		}
		if (math.abs(z) >= TRENCH_RAMP_END) {
			slab(map, new Vector3(0, 0.05, z), new Vector3(TRENCH_HALF_WIDTH * 2, 0.1, 0.3), Cyan, "Grid");
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
		const barrier = slab(
			map,
			new Vector3(wallX, SIDE_WALL_HEIGHT + 300, 0),
			new Vector3(4, 300, HALF_LENGTH * 2 + 8),
			Barrier,
			"Barrier",
		);
		scenery(barrier);
	}
}

// Sunken lane down the middle: build speed out of sight, with staggered blocks so no one can
// see its whole length, and bridges overhead.
function buildTrench(map: Model) {
	slab(
		map,
		new Vector3(0, -TRENCH_DEPTH, 0),
		new Vector3(TRENCH_HALF_WIDTH * 2, 2, TRENCH_HALF_LENGTH * 2),
		Floor,
		"TrenchFloor",
	);
	for (const side of [-1, 1]) {
		slab(
			map,
			new Vector3(side * (TRENCH_HALF_WIDTH - 0.2), 0.05, 0),
			new Vector3(0.4, 0.1, TRENCH_RAMP_END * 2),
			Cyan,
			"TrenchEdge",
		);
		slab(
			map,
			new Vector3(side * (TRENCH_HALF_WIDTH - 0.2), -TRENCH_DEPTH + 0.05, 0),
			new Vector3(0.4, 0.1, TRENCH_HALF_LENGTH * 2),
			Magenta,
			"TrenchLine",
		);
		ramp(
			map,
			new Vector3(0, -TRENCH_DEPTH, side * TRENCH_HALF_LENGTH),
			new Vector3(0, 0, side * TRENCH_RAMP_END),
			TRENCH_HALF_WIDTH * 2,
			Floor,
		);
	}

	const chicanes: [number, number][] = [
		[-6.5, -75],
		[6.5, -35],
		[-6.5, 35],
		[6.5, 75],
	];
	for (const [x, z] of chicanes) {
		coverBlock(map, new Vector3(x, 3, z), new Vector3(11, 9, 4), Chrome, Cyan, "Chicane");
	}

	for (const z of [-55, 55]) {
		coverBlock(map, new Vector3(0, 1, z), new Vector3(TRENCH_HALF_WIDTH * 2 + 4, 1, 8), Chrome, Magenta, "Bridge");
	}
}

// Walls with gaps between the trench and the side lanes, and staggered billboards in the lanes.
function buildLanes(map: Model) {
	const segments: [number, number][] = [
		[-110, -70],
		[-50, -10],
		[10, 50],
		[70, 110],
	];
	const billboards: [number, number][] = [
		[50, -85],
		[66, -25],
		[50, 25],
		[66, 85],
	];
	for (const side of [-1, 1]) {
		for (const [from, to] of segments) {
			const top = new Vector3(side * LANE_WALL_X, LANE_WALL_HEIGHT, (from + to) / 2);
			coverBlock(map, top, new Vector3(2, LANE_WALL_HEIGHT, to - from), Wall, Magenta, "LaneWall");
		}
		for (const [x, z] of billboards) {
			coverBlock(map, new Vector3(side * x, 10, z), new Vector3(20, 10, 3), Chrome, Cyan, "Billboard");
		}
	}
}

// A covered arcade down each side: a roof, an inner wall with doorways onto the field, pillars
// staggered against alternate walls so it can't be watched end to end, and neon underfoot and
// overhead. Free-for-all spawns sit in pockets in the outer wall.
function buildArcades(map: Model) {
	for (const side of [-1, 1]) {
		const innerX = side * ARCADE_INNER_X;
		const midX = side * ((ARCADE_INNER_X + HALF_WIDTH) / 2);
		const width = HALF_WIDTH - ARCADE_INNER_X;
		const arcadeDoors = ARCADE_DOORS.map(([a, b]) => [a, b] as [number, number]);
		for (const [from, to] of segmentsBetween(-ARCADE_HALF_LENGTH, ARCADE_HALF_LENGTH, arcadeDoors)) {
			coverBlock(
				map,
				new Vector3(innerX, ARCADE_HEIGHT, (from + to) / 2),
				new Vector3(2, ARCADE_HEIGHT, to - from),
				Wall,
				Magenta,
				"ArcadeWall",
			);
		}
		slab(
			map,
			new Vector3(midX, ARCADE_HEIGHT + 2, 0),
			new Vector3(width + 2, 2, ARCADE_HALF_LENGTH * 2),
			Wall,
			"ArcadeRoof",
		);
		slab(
			map,
			new Vector3(midX, ARCADE_HEIGHT - 0.2, 0),
			new Vector3(1, 0.3, ARCADE_HALF_LENGTH * 2),
			Cyan,
			"ArcadeStrip",
		);

		for (let z = -ARCADE_HALF_LENGTH + 25; z < ARCADE_HALF_LENGTH; z += 25) {
			const nearInner = math.floor((z + ARCADE_HALF_LENGTH) / 25) % 2 === 0;
			const x = nearInner ? side * (ARCADE_INNER_X + 7) : side * (HALF_WIDTH - 7);
			coverBlock(
				map,
				new Vector3(x, ARCADE_HEIGHT, z),
				new Vector3(5, ARCADE_HEIGHT, 5),
				Chrome,
				Magenta,
				"ArcadePillar",
			);
		}

		// Spawn pockets in the outer wall, each opening onto the arcade.
		for (const z of [-90, 90]) {
			for (const edge of [-1, 1]) {
				slab(
					map,
					new Vector3(side * (HALF_WIDTH - 8), ARCADE_HEIGHT, z + edge * 8),
					new Vector3(16, ARCADE_HEIGHT, 2),
					Wall,
					"PocketWall",
				);
			}
			slab(
				map,
				new Vector3(side * (HALF_WIDTH - 14), ARCADE_HEIGHT, z),
				new Vector3(2, ARCADE_HEIGHT, 6),
				Wall,
				"PocketScreen",
			);
			spawnMarker(map, new Vector3(side * (HALF_WIDTH - 5), 0, z), new Vector3(side * ARCADE_INNER_X, 0, z + 20));
		}
	}
}

// Wall segments from `from` to `to`, leaving out the given gaps.
function segmentsBetween(from: number, to: number, gaps: [number, number][]): [number, number][] {
	const cuts = [from];
	for (const [a, b] of gaps) cuts.push(a, b);
	cuts.push(to);
	const segments: [number, number][] = [];
	for (let i = 0; i < cuts.size(); i += 2) {
		if (cuts[i + 1] - cuts[i] > 0.5) segments.push([cuts[i], cuts[i + 1]]);
	}
	return segments;
}

// Raised platform over the trench: sees everything, but everyone sees you.
function buildCenter(map: Model) {
	coverBlock(map, new Vector3(0, ROOF_HEIGHT, 0), new Vector3(32, 1.5, 32), Chrome, Magenta, "Roof");
	for (const x of [-14, 14]) {
		for (const z of [-14, 14]) {
			slab(map, new Vector3(x, ROOF_HEIGHT - 1.5, z), new Vector3(3, ROOF_HEIGHT - 1.5, 3), Wall, "RoofPillar");
		}
	}
	for (const x of [-9, 9]) {
		coverBlock(map, new Vector3(x, ROOF_HEIGHT + 3, x * -0.6), new Vector3(8, 3, 2), Wall, Cyan, "RoofCover");
	}
	for (const side of [-1, 1]) {
		jumpPad(map, new Vector3(side * 20, 0, 0), new Vector3(side * 8, ROOF_HEIGHT, 0), 8, Pad);
	}
}

function buildBase(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;

	slab(
		map,
		new Vector3(0, END_WALL_HEIGHT, z(HALF_LENGTH + 2)),
		new Vector3(HALF_WIDTH * 2 + 8, END_WALL_HEIGHT + 8, 4),
		Wall,
		"EndWall",
	);
	for (const height of [8, 24]) {
		slab(
			map,
			new Vector3(0, height, z(HALF_LENGTH - 0.1)),
			new Vector3(HALF_WIDTH * 2, 0.4, 0.2),
			glow,
			"WallStripe",
		);
	}
	const barrier = slab(
		map,
		new Vector3(0, END_WALL_HEIGHT + 300, z(HALF_LENGTH + 2)),
		new Vector3(HALF_WIDTH * 2 + 8, 300, 4),
		Barrier,
		"Barrier",
	);
	scenery(barrier);

	const platformTop = new Vector3(0, BASE_HEIGHT, z(175));
	slab(map, platformTop, new Vector3(72, BASE_HEIGHT, 50), Chrome, "BasePlatform");
	outline(map, platformTop, 72, 50, glow);
	for (const x of [-24, 0, 24]) {
		ramp(map, new Vector3(x, 0, z(130)), new Vector3(x, BASE_HEIGHT, z(150)), 12, Chrome);
	}

	const flagSpot = new Vector3(0, BASE_HEIGHT + 0.5, z(180));
	cylinder(map, flagSpot, 0.5, 10, Wall, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);

	// Spawns sit in a pocket behind a wall wider and taller than their line, with the way out
	// at each end, so nobody is shot before they can move.
	coverBlock(map, new Vector3(0, BASE_HEIGHT + 12, z(186)), new Vector3(52, 12, 2), Wall, glow, "SpawnWall");
	for (const x of [-18, 18]) {
		coverBlock(map, new Vector3(x, BASE_HEIGHT + 6, z(165)), new Vector3(8, 6, 3), Chrome, glow, "Cover");
	}

	coverBlock(map, new Vector3(0, ARCH_HEIGHT, z(150)), new Vector3(HALF_WIDTH * 2, 1.5, 8), Chrome, glow, "Arch");
	for (const x of [-76, -40, 40, 76]) {
		slab(map, new Vector3(x, ARCH_HEIGHT - 1.5, z(150)), new Vector3(3, ARCH_HEIGHT - 1.5, 3), Wall, "ArchPillar");
	}
	for (const x of [-30, 30]) {
		jumpPad(map, new Vector3(x, BASE_HEIGHT, z(180)), new Vector3(x, ARCH_HEIGHT, z(150)), 6, Pad);
	}

	for (const x of [-20, -12, -4, 4, 12, 20]) {
		spawnMarker(map, new Vector3(x, BASE_HEIGHT, z(193)), new Vector3(x > 0 ? 40 : -40, BASE_HEIGHT, z(193)), team);
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

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(-54, 0, 0), "A", 12, "Domination");
		controlPointMarker(map, new Vector3(0, ROOF_HEIGHT, 0), "B", 10, "Domination");
		controlPointMarker(map, new Vector3(54, 0, 0), "C", 12, "Domination");
		// Hardpoints: larger zones with cover, rotating center first and then alternating sides.
		controlPointMarker(map, new Vector3(0, -6, 0), "1", 18, "Hardpoint");
		controlPointMarker(map, new Vector3(-54, 0, 30), "2", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(54, 0, -30), "3", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(-54, 0, -30), "4", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(54, 0, 30), "5", 16, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(0, ROOF_HEIGHT, 0), "Overcharge");
		perkMarker(map, new Vector3(0, -TRENCH_DEPTH, 0), "Radar");
		perkMarker(map, new Vector3(0, -TRENCH_DEPTH, 90), "SuperJump");
		perkMarker(map, new Vector3(0, -TRENCH_DEPTH, -90), "SuperJump");
		perkMarker(map, new Vector3(-66, 0, 60), "Shield");
		perkMarker(map, new Vector3(66, 0, -60), "Shield");

		buildGround(map);
		buildLandscape(map);
		buildShell(map);
		buildTrench(map);
		buildLanes(map);
		buildCenter(map);
		buildArcades(map);
		buildBase(map, "Red", 1);
		buildBase(map, "Blue", -1);
		buildSun(map);

		spectatorRing(map, Vector3.zero, 270, 46, Color3.fromRGB(255, 60, 200));

		setMapLighting(map, {
			clockTime: 17.8,
			brightness: 2,
			ambient: Color3.fromRGB(120, 80, 140),
			outdoorAmbient: Color3.fromRGB(150, 100, 160),
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
