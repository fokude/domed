// Two brutalist fortresses facing each other across a desert plaza at golden hour. Built for
// 5v5 to the targets in docs/MAP_DESIGN.md: three lanes between the bases (an elevated
// aqueduct broken by gatehouse rooms, a central plaza around a sunken court and a contested
// tower, and a sunken canal), crossing points that form loops, and bases with a hidden spawn
// room, an upper-floor flag room, and a roof.
//
// Red's base is at +Z and Blue's at -Z; everything is mirrored between them.
//
// Heights: canal -10, court -6, ground 0, upper floors and aqueduct 18, roofs 36, tower 44.

import { TeamId } from "shared/modes";
import {
	controlPointMarker,
	cylinder,
	flagBaseMarker,
	jumpPad,
	onCircle,
	perkMarker,
	plank,
	plateWithHoles,
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

const HALF_WIDTH = 160;
const LANE_WALL_X = 70;
const LANES_END = 200; // where the lanes meet the forecourt in front of each base
const BASE_FRONT = 220;
const BASE_BACK = 320;
const MAP_END = 332;

const GROUND = 0;
const CANAL = -10;
const COURT = -6;
const UPPER = 18;
const ROOF = 36;
const TOWER = 44;
const STOREY = 16; // wall height between floors

const AQUEDUCT_X = -110;
const AQUEDUCT_HALF = 11;
const GATEHOUSES = [-110, 0, 110];
const CANAL_X = 110;
const CANAL_HALF = 13;
const COURT_HALF = 50;
const TOWER_HALF = 14;

const Sandstone: Style = { color: Color3.fromRGB(205, 170, 120), material: Enum.Material.Sandstone };
const Concrete: Style = { color: Color3.fromRGB(188, 178, 162), material: Enum.Material.Concrete };
const DarkConcrete: Style = { color: Color3.fromRGB(110, 102, 94), material: Enum.Material.Concrete };
const Paving: Style = { color: Color3.fromRGB(160, 140, 115), material: Enum.Material.Pavement };
const Water: Style = { color: Color3.fromRGB(60, 120, 130), material: Enum.Material.Slate, reflectance: 0.2 };
const Copper: Style = {
	color: Color3.fromRGB(255, 140, 40),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Pad: Style = { color: Color3.fromRGB(255, 140, 40), material: Enum.Material.Neon };
const Barrier: Style = { color: new Color3(), transparency: 1 };
const Backdrop: Style = { color: Color3.fromRGB(196, 150, 100), material: Enum.Material.Sandstone, collide: false };

// Signed range [a, b] along Z as [low, high].
function zRange(a: number, b: number): [number, number] {
	return [math.min(a, b), math.max(a, b)];
}

function buildGround(map: Model) {
	const thickness = 12;
	const laneLength = BASE_FRONT * 2;
	// West strip under the aqueduct, and the two strips either side of the canal.
	slab(map, new Vector3(-115, GROUND, 0), new Vector3(90, thickness, laneLength), Sandstone, "Ground");
	slab(map, new Vector3(83.5, GROUND, 0), new Vector3(27, thickness, laneLength), Sandstone, "Ground");
	slab(map, new Vector3(141.5, GROUND, 0), new Vector3(37, thickness, laneLength), Sandstone, "Ground");
	// Plaza, around the sunken court.
	for (const side of [-1, 1]) {
		const length = BASE_FRONT - COURT_HALF;
		slab(
			map,
			new Vector3(0, GROUND, side * (COURT_HALF + length / 2)),
			new Vector3(LANE_WALL_X * 2, thickness, length),
			Paving,
			"Plaza",
		);
		slab(
			map,
			new Vector3(side * 60, GROUND, 0),
			new Vector3(LANE_WALL_X - COURT_HALF, thickness, COURT_HALF * 2),
			Paving,
			"Plaza",
		);
	}
}

function buildBoundary(map: Model) {
	const top = 40;
	for (const side of [-1, 1]) {
		const sideWall = new Vector3(4, top + 12, MAP_END * 2 + 8);
		const endWall = new Vector3(HALF_WIDTH * 2 + 8, top + 12, 4);
		slab(map, new Vector3(side * (HALF_WIDTH + 2), top, 0), sideWall, DarkConcrete, "Boundary");
		slab(map, new Vector3(0, top, side * (MAP_END + 2)), endWall, DarkConcrete, "Boundary");
		const sideBarrier = new Vector3(4, 300, MAP_END * 2 + 8);
		const endBarrier = new Vector3(HALF_WIDTH * 2 + 8, 300, 4);
		scenery(slab(map, new Vector3(side * (HALF_WIDTH + 2), top + 300, 0), sideBarrier, Barrier, "Barrier"));
		scenery(slab(map, new Vector3(0, top + 300, side * (MAP_END + 2)), endBarrier, Barrier, "Barrier"));
	}
}

// Walls between the lanes, open at three crossings that tie the lanes into loops.
function buildLaneWalls(map: Model) {
	const crossings: [number, number][] = [
		[-122, -98],
		[-15, 15],
		[98, 122],
	];
	for (const side of [-1, 1]) {
		wallWithGaps(map, false, side * LANE_WALL_X, -LANES_END, LANES_END, crossings, GROUND, 14, DarkConcrete);
	}
}

// East lane: a sunken channel with staggered pillars, crossed by bridges at the crossings.
function buildCanal(map: Model) {
	slab(map, new Vector3(CANAL_X, CANAL, 0), new Vector3(CANAL_HALF * 2, 2, LANES_END * 2), Water, "CanalFloor");
	for (const side of [-1, 1]) {
		ramp(
			map,
			new Vector3(CANAL_X, CANAL, side * LANES_END),
			new Vector3(CANAL_X, GROUND, side * BASE_FRONT),
			CANAL_HALF * 2,
			Sandstone,
		);
		const edge = new Vector3(CANAL_X + side * (CANAL_HALF - 0.2), 0.05, 0);
		slab(map, edge, new Vector3(0.4, 0.1, LANES_END * 2), Copper, "CanalEdge");
	}

	const pillars: [number, number][] = [
		[-6, 40],
		[6, 75],
		[-6, 145],
		[6, 175],
	];
	for (const side of [-1, 1]) {
		for (const [offset, z] of pillars) {
			slab(
				map,
				new Vector3(CANAL_X + offset * side, 2, side * z),
				new Vector3(10, 12, 4),
				DarkConcrete,
				"Pillar",
			);
		}
	}
	for (const z of [-110, 0, 110]) {
		slab(map, new Vector3(CANAL_X, 0.5, z), new Vector3(CANAL_HALF * 2 + 4, 1, 10), Concrete, "Bridge");
	}
}

// West lane: an elevated speed runway. Gatehouse rooms break it into stretches of about 100
// studs so it never becomes one long sightline.
function buildAqueduct(map: Model) {
	const deckLength = BASE_FRONT * 2;
	slab(map, new Vector3(AQUEDUCT_X, UPPER, 0), new Vector3(AQUEDUCT_HALF * 2, 2, deckLength), Concrete, "Aqueduct");
	for (const side of [-1, 1]) {
		const edge = new Vector3(AQUEDUCT_X + side * (AQUEDUCT_HALF + 0.2), UPPER + 0.3, 0);
		slab(map, edge, new Vector3(0.4, 0.6, deckLength), Copper, "AqueductEdge");
	}
	for (let z = -BASE_FRONT + 10; z < BASE_FRONT; z += 30) {
		for (const x of [AQUEDUCT_X - 9, AQUEDUCT_X + 9]) {
			slab(map, new Vector3(x, UPPER - 2, z), new Vector3(3, UPPER - 2, 3), DarkConcrete, "Arch");
		}
	}

	for (const gz of GATEHOUSES) {
		const [x1, x2] = [AQUEDUCT_X - 18, AQUEDUCT_X + 18];
		slab(map, new Vector3(AQUEDUCT_X, UPPER, gz), new Vector3(36, 2, 30), Concrete, "GatehouseFloor");
		for (const face of [-1, 1]) {
			wallWithGaps(
				map,
				true,
				gz + face * 15,
				x1,
				x2,
				[[AQUEDUCT_X - 7, AQUEDUCT_X + 7]],
				UPPER,
				STOREY,
				DarkConcrete,
			);
		}
		for (const x of [x1, x2]) {
			wallWithGaps(map, false, x, gz - 15, gz + 15, [[gz - 6, gz + 6]], UPPER, STOREY, DarkConcrete);
		}
		slab(map, new Vector3(AQUEDUCT_X, ROOF, gz), new Vector3(36, 2, 30), Concrete, "GatehouseRoof");
		slab(map, new Vector3(AQUEDUCT_X, ROOF + 0.3, gz), new Vector3(36.4, 0.6, 30.4), Copper, "GatehouseTrim");
	}

	// Pads up onto the middle gatehouse roof, which bridges to the tower.
	for (const side of [-1, 1]) {
		jumpPad(map, new Vector3(AQUEDUCT_X, UPPER, side * 32), new Vector3(AQUEDUCT_X, ROOF, side * 8), 8, Pad);
	}
	const bridgeStart = new Vector3(AQUEDUCT_X + 18, ROOF, 0);
	plank(map, bridgeStart, new Vector3(-TOWER_HALF, TOWER, 0), 8, 1.5, Concrete, "SkyBridge");

	// On-ramps from the ground, angled so they feed into the flow rather than across it.
	for (const side of [-1, 1]) {
		for (const z of [60, 170]) {
			ramp(
				map,
				new Vector3(-LANE_WALL_X - 2, GROUND, side * (z - 25)),
				new Vector3(AQUEDUCT_X + AQUEDUCT_HALF + 0.5, UPPER, side * z),
				10,
				Sandstone,
			);
		}
	}
}

// Center lane: a paved bowl around a sunken court, with the tower as the contested high point.
// The tower has four routes up: two pads in the court, the sky bridge, and the east ramp.
function buildPlaza(map: Model) {
	slab(map, new Vector3(0, COURT, 0), new Vector3(COURT_HALF * 2, 2, COURT_HALF * 2), Paving, "Court");
	for (const side of [-1, 1]) {
		for (const x of [-30, 30]) {
			ramp(map, new Vector3(x, COURT, side * 30), new Vector3(x, GROUND, side * COURT_HALF), 12, Paving);
		}
		jumpPad(map, new Vector3(0, COURT, side * 30), new Vector3(0, TOWER, side * 8), 8, Pad);
	}

	const towerSize = new Vector3(TOWER_HALF * 2, TOWER - COURT, TOWER_HALF * 2);
	slab(map, new Vector3(0, TOWER, 0), towerSize, DarkConcrete, "Tower");
	slab(
		map,
		new Vector3(0, TOWER + 0.3, 0),
		towerSize.mul(new Vector3(1, 0, 1)).add(new Vector3(0.4, 0.6, 0.4)),
		Copper,
		"TowerTrim",
	);
	for (const x of [-1, 1]) {
		for (const z of [-1, 1]) {
			const corner = new Vector3(x * (TOWER_HALF - 1.5), TOWER + 12, z * (TOWER_HALF - 1.5));
			slab(map, corner, new Vector3(3, 12, 3), DarkConcrete, "Spire");
			slab(map, corner.add(new Vector3(0, 0.6, 0)), new Vector3(3.4, 0.6, 3.4), Copper, "SpireCap");
		}
	}
	ramp(map, new Vector3(LANE_WALL_X + 14, GROUND, 0), new Vector3(TOWER_HALF, TOWER, 0), 10, Concrete);

	for (const side of [-1, 1]) {
		for (const x of [-35, 35]) {
			const monolith = new Vector3(x, 26, side * 95);
			slab(map, monolith, new Vector3(8, 26, 8), DarkConcrete, "Monolith");
			slab(map, monolith.add(new Vector3(0, 0.6, 0)), new Vector3(8.4, 0.6, 8.4), Copper, "MonolithCap");
		}
		slab(map, new Vector3(0, 5, side * 150), new Vector3(30, 5, 3), DarkConcrete, "Plinth");
	}
}

function buildBase(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;
	const doorways: [number, number][] = [
		[AQUEDUCT_X - 15, AQUEDUCT_X + 15],
		[-15, 15],
		[CANAL_X - 15, CANAL_X + 15],
	];
	const depth = MAP_END - BASE_FRONT;
	const floorCenter = new Vector3(0, GROUND, z(BASE_FRONT + depth / 2));
	slab(map, floorCenter, new Vector3(HALF_WIDTH * 2, 12, depth), Concrete, "BaseFloor");

	// Ground floor: a front hall, and a spawn room behind it with two exits.
	wallWithGaps(map, true, z(BASE_FRONT + 1), -HALF_WIDTH, HALF_WIDTH, doorways, GROUND, STOREY, DarkConcrete);
	wallWithGaps(map, true, z(BASE_BACK + 1), -HALF_WIDTH, HALF_WIDTH, [], GROUND, STOREY, DarkConcrete);
	wallWithGaps(
		map,
		true,
		z(280),
		-HALF_WIDTH,
		HALF_WIDTH,
		[
			[-68, -52],
			[52, 68],
		],
		GROUND,
		STOREY,
		DarkConcrete,
	);
	for (const x of [-95, -30, 30, 95]) {
		slab(map, new Vector3(x, STOREY, z(250)), new Vector3(6, STOREY, 6), DarkConcrete, "Column");
	}

	// Upper floor and roof, with stairwells: hall to upper floor, upper floor to roof.
	const [hallLow, hallHigh] = zRange(z(230), z(270));
	const stairHoles: [number, number, number, number][] = [-60, 60].map((x) => [x - 10, x + 10, hallLow, hallHigh]);
	const [roofLow, roofHigh] = zRange(z(270), z(300));
	const roofHoles: [number, number, number, number][] = [-125, 125].map((x) => [x - 15, x + 15, roofLow, roofHigh]);
	const [baseLow, baseHigh] = zRange(z(BASE_FRONT), z(BASE_BACK));
	plateWithHoles(map, UPPER, -HALF_WIDTH, HALF_WIDTH, baseLow, baseHigh, stairHoles, Concrete);
	plateWithHoles(map, ROOF, -HALF_WIDTH, HALF_WIDTH, baseLow, baseHigh, roofHoles, Concrete);
	for (const x of [-60, 60]) {
		ramp(map, new Vector3(x, GROUND, z(230)), new Vector3(x, UPPER, z(270)), 12, Concrete);
	}
	for (const x of [-125, 125]) {
		ramp(map, new Vector3(x, UPPER, z(300)), new Vector3(x, ROOF, z(270)), 12, Concrete);
	}

	wallWithGaps(map, true, z(BASE_FRONT + 1), -HALF_WIDTH, HALF_WIDTH, doorways, UPPER, STOREY, DarkConcrete);
	wallWithGaps(map, true, z(BASE_BACK + 1), -HALF_WIDTH, HALF_WIDTH, [], UPPER, STOREY, DarkConcrete);

	// Flag room at the back of the upper floor, with three entrances.
	wallWithGaps(map, true, z(270), -40, 40, [[-8, 8]], UPPER, STOREY, DarkConcrete);
	for (const x of [-40, 40]) {
		wallWithGaps(map, false, x, z(270), z(BASE_BACK), [[z(285), z(300)]], UPPER, STOREY, DarkConcrete);
	}
	const flagSpot = new Vector3(0, UPPER + 0.5, z(300));
	cylinder(map, flagSpot, 0.5, 10, DarkConcrete, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);

	// Roof parapet, team trim on the front face, and pads from the forecourt up to the roof.
	wallWithGaps(map, true, z(BASE_FRONT + 1), -HALF_WIDTH, HALF_WIDTH, [], ROOF, 3, DarkConcrete);
	wallWithGaps(map, true, z(BASE_BACK + 1), -HALF_WIDTH, HALF_WIDTH, [], ROOF, 3, DarkConcrete);
	for (const height of [UPPER, ROOF]) {
		const trim = new Vector3(0, height + 0.3, z(BASE_FRONT - 0.2));
		slab(map, trim, new Vector3(HALF_WIDTH * 2, 0.6, 0.4), glow, "TeamTrim");
	}
	for (const x of [-40, 40]) {
		jumpPad(map, new Vector3(x, GROUND, z(208)), new Vector3(x, ROOF, z(232)), 12, Pad);
	}

	for (const x of [-110, -70, -30, 30, 70, 110]) {
		spawnMarker(map, new Vector3(x, GROUND, z(305)), new Vector3(x, GROUND, 0), team);
	}
}

// Desert floor and mesas on the horizon. Scenery only.
function buildBackdrop(map: Model) {
	scenery(slab(map, new Vector3(0, -14, 0), new Vector3(2000, 2, 2000), { ...Backdrop, collide: true }, "Desert"));
	const mesas: [number, number, number][] = [
		[0.3, 820, 160],
		[1.2, 900, 240],
		[2.1, 860, 190],
		[3.3, 940, 280],
		[4.3, 840, 170],
		[5.4, 900, 220],
	];
	for (const [angle, distance, height] of mesas) {
		const base = onCircle(new Vector3(0, -14, 0), distance, angle);
		scenery(
			slab(map, base.add(new Vector3(0, height, 0)), new Vector3(height * 1.3, height, height), Backdrop, "Mesa"),
		);
	}
}

export const Bastion: MapBuilder = {
	id: "Bastion",
	build(map) {
		setMapInfo(map, {
			name: "Bastion",
			tagline: "Two fortresses, one tower. Take the aqueduct, the plaza or the canal.",
			// No free-for-all: the map is built for two teams, and far too big for one.
			modes: ["CTF", "TeamDeathmatch", "Domination", "Hardpoint"],
			gravity: 196.2,
			killHeight: -30,
			themeColor: Color3.fromRGB(255, 140, 40),
			// Music: big, cinematic desert rock with a western edge. Pick a licensed Creator Store
			// track (see docs/FEEDBACK.md).
			music: "",
		});

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(AQUEDUCT_X, UPPER, 0), "A", 12, "Domination");
		controlPointMarker(map, new Vector3(0, TOWER, 0), "B", 10, "Domination");
		controlPointMarker(map, new Vector3(CANAL_X, CANAL, 0), "C", 12, "Domination");
		// Hardpoints: larger zones with cover, rotating center first and then alternating sides.
		controlPointMarker(map, new Vector3(0, COURT, 0), "1", 30, "Hardpoint");
		controlPointMarker(map, new Vector3(AQUEDUCT_X, UPPER, 110), "2", 15, "Hardpoint");
		controlPointMarker(map, new Vector3(CANAL_X, CANAL, -110), "3", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(AQUEDUCT_X, UPPER, -110), "4", 15, "Hardpoint");
		controlPointMarker(map, new Vector3(CANAL_X, CANAL, 110), "5", 16, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(0, TOWER, 0), "Overcharge");
		perkMarker(map, new Vector3(AQUEDUCT_X, UPPER, 0), "Radar");
		perkMarker(map, new Vector3(CANAL_X, CANAL, 0), "SuperJump");
		perkMarker(map, new Vector3(0, GROUND, 125), "Shield");
		perkMarker(map, new Vector3(0, GROUND, -125), "Shield");

		buildGround(map);
		buildBoundary(map);
		buildLaneWalls(map);
		buildCanal(map);
		buildAqueduct(map);
		buildPlaza(map);
		buildBase(map, "Red", 1);
		buildBase(map, "Blue", -1);
		buildBackdrop(map);
		// The crowd floats above the desert, ringing both fortresses.
		spectatorRing(map, Vector3.zero, 400, 70, 12, Color3.fromRGB(255, 140, 40));

		setMapLighting(map, {
			clockTime: 17.2,
			brightness: 2.5,
			ambient: Color3.fromRGB(120, 100, 85),
			outdoorAmbient: Color3.fromRGB(150, 125, 100),
			atmosphere: {
				density: 0.28,
				color: Color3.fromRGB(230, 170, 120),
				decay: Color3.fromRGB(200, 120, 70),
				glare: 0.4,
				haze: 1.5,
			},
			bloom: { intensity: 0.3, size: 14, threshold: 1.5 },
			colorCorrection: {
				tint: Color3.fromRGB(255, 240, 225),
				contrast: 0.12,
				saturation: 0.15,
				brightness: 0,
			},
		});
	},
};
