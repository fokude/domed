// Two brutalist fortresses facing each other across a desert plaza at golden hour: the big 5v5
// map. Three lanes run between the fortresses: the aqueduct, a raised runway down the west side
// that joins both ramparts; the open plaza in the middle, around the tower; and the canal, a
// sunken channel down the east side. Each fortress is a rampart across the map with the flag on
// top and two gates through it, a courtyard behind, and the spawn room behind the back wall.
// Earlier versions are recorded in docs/MAP_DESIGN.md.
//
// Red's fortress is at +Z and Blue's at -Z; everything is mirrored between them.
//
// Heights: canal -6, ground 0, bunkers 10, aqueduct and ramparts 18, tower 40.

import { TeamId } from "shared/modes";
import {
	controlPointMarker,
	cylinder,
	flagBaseMarker,
	gableRoof,
	jumpPad,
	onCircle,
	outline,
	perkMarker,
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

const HALF_WIDTH = 150;
const HALF_LENGTH = 300;

const CANAL = -6;
const GROUND = 0;
const BUNKER = 10;
const RAMPART = 18;
const TOWER = 40;
const BOUNDARY_HEIGHT = 40;

// The aqueduct: a solid raised runway along the west wall, from rampart to rampart.
const AQUEDUCT_INNER = -100;
// The canal along the east wall, with ramps up to the ground at each end.
const CANAL_INNER = 100;
const CANAL_HALF_LENGTH = 145;
const CANAL_RAMP_END = 170;
// Each rampart runs the width of the map, with a gate through it either side of the flag.
const RAMPART_FRONT = 230;
const RAMPART_BACK = 262;
const GATES: [number, number][] = [
	[-72, -48],
	[48, 72],
];
const GATE_HEIGHT = 14;
const FLAG_Z = 246;
const TOWER_HALF = 15;
// Spawn rooms behind the fortresses' back walls, entered from the courtyards.
const ROOM_DEPTH = 40;
const ROOM_HALF_WIDTH = 110;
const ROOM_HEIGHT = 24;
const DOOR_HEIGHT = 18;
const DOORS: [number, number][] = [
	[-90, -70],
	[70, 90],
];

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

// Paving everywhere, with the canal cut out of the east side.
function buildGround(map: Model) {
	plateWithHoles(
		map,
		GROUND,
		-HALF_WIDTH,
		HALF_WIDTH,
		-HALF_LENGTH,
		HALF_LENGTH,
		[[CANAL_INNER, HALF_WIDTH, -CANAL_RAMP_END, CANAL_RAMP_END]],
		Paving,
	);
}

// Boundary walls round the map, with the spawn room doors in the end walls, and invisible
// barriers above.
function buildBoundary(map: Model) {
	for (const side of [-1, 1]) {
		const x = side * (HALF_WIDTH + 2);
		slab(
			map,
			new Vector3(x, BOUNDARY_HEIGHT, 0),
			new Vector3(4, BOUNDARY_HEIGHT + 12, HALF_LENGTH * 2 + 8),
			DarkConcrete,
			"Boundary",
		);
		scenery(
			slab(
				map,
				new Vector3(x, BOUNDARY_HEIGHT + 300, 0),
				new Vector3(4, 300, HALF_LENGTH * 2 + 8),
				Barrier,
				"Barrier",
			),
		);

		const z = side * (HALF_LENGTH + 2);
		wallWithGaps(map, true, z, -HALF_WIDTH - 4, HALF_WIDTH + 4, DOORS, -12, BOUNDARY_HEIGHT + 12, DarkConcrete, 4);
		for (const [a, b] of DOORS) {
			slab(
				map,
				new Vector3((a + b) / 2, BOUNDARY_HEIGHT, z),
				new Vector3(b - a, BOUNDARY_HEIGHT - DOOR_HEIGHT, 4),
				DarkConcrete,
				"Lintel",
			);
		}
		scenery(
			slab(
				map,
				new Vector3(0, BOUNDARY_HEIGHT + 300, z),
				new Vector3(HALF_WIDTH * 2 + 8, 300, 4),
				Barrier,
				"Barrier",
			),
		);
	}
}

// West lane: the aqueduct, a raised runway 50 wide from one rampart to the other. Copper
// channels run along its top; pads lift players up from the plaza.
function buildAqueduct(map: Model) {
	const width = HALF_WIDTH + AQUEDUCT_INNER;
	const x = -HALF_WIDTH + width / 2;
	slab(map, new Vector3(x, RAMPART, 0), new Vector3(width, RAMPART, RAMPART_FRONT * 2), Concrete, "Aqueduct");
	slab(
		map,
		new Vector3(AQUEDUCT_INNER - 0.5, RAMPART + 0.1, 0),
		new Vector3(1, 0.1, RAMPART_FRONT * 2),
		Copper,
		"AqueductEdge",
	);
	// Arches cut in relief along the inner face.
	for (let z = -200; z <= 200; z += 40) {
		slab(map, new Vector3(AQUEDUCT_INNER + 0.2, 12, z), new Vector3(0.6, 10, 20), DarkConcrete, "Arch");
	}
	for (const zSide of [-1, 1]) {
		jumpPad(map, new Vector3(-80, GROUND, zSide * 60), new Vector3(-118, RAMPART, zSide * 60), 6, Pad);
	}
}

// East lane: the canal, a sunken channel 50 wide, shallow enough to jump out of anywhere, with
// ramps at both ends.
function buildCanal(map: Model) {
	const width = HALF_WIDTH - CANAL_INNER;
	const x = CANAL_INNER + width / 2;
	slab(map, new Vector3(x, CANAL, 0), new Vector3(width, 2, CANAL_HALF_LENGTH * 2), Water, "Canal");
	for (const side of [-1, 1]) {
		ramp(
			map,
			new Vector3(x, CANAL, side * CANAL_HALF_LENGTH),
			new Vector3(x, GROUND, side * CANAL_RAMP_END),
			width,
			Sandstone,
		);
	}
	slab(
		map,
		new Vector3(CANAL_INNER + 0.2, GROUND + 0.1, 0),
		new Vector3(0.4, 0.1, CANAL_RAMP_END * 2),
		Copper,
		"CanalEdge",
	);
	slab(
		map,
		new Vector3(CANAL_INNER + 0.5, GROUND, 0),
		new Vector3(1, GROUND - CANAL, CANAL_RAMP_END * 2),
		Sandstone,
		"CanalWall",
	);
}

// Center lane: the open plaza, with the tower in the middle (the high point, reached by pads or
// a rocket jump off its walls) and four bunkers as cover and the first step up.
function buildPlaza(map: Model) {
	slab(map, new Vector3(0, TOWER, 0), new Vector3(TOWER_HALF * 2, TOWER, TOWER_HALF * 2), Sandstone, "Tower");
	outline(map, new Vector3(0, TOWER, 0), TOWER_HALF * 2, TOWER_HALF * 2, Copper);
	for (const side of [-1, 1]) {
		jumpPad(map, new Vector3(side * 32, GROUND, 0), new Vector3(side * 6, TOWER, 0), 8, Pad);
		for (const zSide of [-1, 1]) {
			slab(map, new Vector3(side * 50, BUNKER, zSide * 110), new Vector3(34, BUNKER, 24), Concrete, "Bunker");
			outline(map, new Vector3(side * 50, BUNKER, zSide * 110), 34, 24, Copper);
		}
	}
	ring(map, new Vector3(0, GROUND + 0.1, 0), 40, 1, 0.2, 32, Copper, "PlazaRing");
}

// A fortress: the rampart across the map with the flag on top and two gates through it, ramps
// up from the field and the courtyard, and the spawn room behind the back wall.
function buildFortress(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;
	const depth = RAMPART_BACK - RAMPART_FRONT;
	const mid = z((RAMPART_FRONT + RAMPART_BACK) / 2);

	// The rampart: solid between the gates, bridged over them.
	const cuts = [-HALF_WIDTH];
	for (const [a, b] of GATES) cuts.push(a, b);
	cuts.push(HALF_WIDTH);
	for (let k = 0; k < cuts.size(); k += 2) {
		const [from, to] = [cuts[k], cuts[k + 1]];
		slab(
			map,
			new Vector3((from + to) / 2, RAMPART, mid),
			new Vector3(to - from, RAMPART + 6, depth),
			Concrete,
			"Rampart",
		);
	}
	for (const [a, b] of GATES) {
		slab(
			map,
			new Vector3((a + b) / 2, RAMPART, mid),
			new Vector3(b - a, RAMPART - GATE_HEIGHT, depth),
			Concrete,
			"GateBridge",
		);
		slab(
			map,
			new Vector3((a + b) / 2, GATE_HEIGHT - 0.5, z(RAMPART_FRONT - 0.2)),
			new Vector3(b - a, 0.6, 0.4),
			glow,
			"GateGlow",
		);
	}
	slab(
		map,
		new Vector3(0, RAMPART + 0.1, z(RAMPART_FRONT + 0.5)),
		new Vector3(HALF_WIDTH * 2, 0.1, 1),
		glow,
		"RampartEdge",
	);

	// Ways up: a ramp near the canal, pads in front of the flag, and ramps from the courtyard.
	// The aqueduct joins the rampart's west end.
	ramp(
		map,
		new Vector3(100, GROUND, z(RAMPART_FRONT - 30)),
		new Vector3(100, RAMPART, z(RAMPART_FRONT)),
		24,
		Concrete,
	);
	for (const side of [-1, 1]) {
		jumpPad(
			map,
			new Vector3(side * 25, GROUND, z(RAMPART_FRONT - 18)),
			new Vector3(side * 25, RAMPART, z(FLAG_Z)),
			6,
			Pad,
		);
		ramp(
			map,
			new Vector3(side * 115, GROUND, z(HALF_LENGTH - 4)),
			new Vector3(side * 115, RAMPART, z(RAMPART_BACK)),
			20,
			Concrete,
		);
	}

	const flagSpot = new Vector3(0, RAMPART + 0.5, z(FLAG_Z));
	cylinder(map, flagSpot, 0.5, 10, DarkConcrete, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);
	slab(map, new Vector3(0, 30, z(HALF_LENGTH - 0.2)), new Vector3(HALF_WIDTH * 2, 0.6, 0.4), glow, "TeamStripe");

	// The spawn room behind the back wall, with a baffle inside each door and a steep roof.
	const zMid = z(HALF_LENGTH + 4 + ROOM_DEPTH / 2);
	const zBack = z(HALF_LENGTH + 4 + ROOM_DEPTH);
	slab(map, new Vector3(0, GROUND, zMid), new Vector3(ROOM_HALF_WIDTH * 2, 2, ROOM_DEPTH + 4), Paving, "SpawnFloor");
	wallWithGaps(map, true, zBack, -ROOM_HALF_WIDTH, ROOM_HALF_WIDTH, [], -2, ROOM_HEIGHT + 2, DarkConcrete, 4);
	for (const side of [-1, 1]) {
		wallWithGaps(
			map,
			false,
			side * ROOM_HALF_WIDTH,
			z(HALF_LENGTH),
			zBack,
			[],
			-2,
			ROOM_HEIGHT + 2,
			DarkConcrete,
			4,
		);
	}
	gableRoof(map, new CFrame(0, ROOM_HEIGHT, zMid), ROOM_HALF_WIDTH * 2 + 4, ROOM_DEPTH + 8, 25, Sandstone);
	for (const [a, b] of DOORS) {
		slab(
			map,
			new Vector3((a + b) / 2, DOOR_HEIGHT, z(HALF_LENGTH + 16)),
			new Vector3(b - a + 20, DOOR_HEIGHT, 2),
			DarkConcrete,
			"DoorBaffle",
		);
	}
	slab(map, new Vector3(0, ROOM_HEIGHT - 1, zMid), new Vector3(ROOM_HALF_WIDTH * 2 - 10, 0.4, 1), glow, "RoomLight");

	const row = zBack - sign * 6;
	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(map, new Vector3(x, GROUND, row), new Vector3(x > 0 ? 80 : -80, GROUND, z(HALF_LENGTH)), team);
	}
	for (const side of [-1, 1]) {
		spawnMarker(map, new Vector3(side * 55, GROUND, row), new Vector3(side * 80, GROUND, z(HALF_LENGTH)), team);
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

		buildGround(map);
		buildBoundary(map);
		buildAqueduct(map);
		buildCanal(map);
		buildPlaza(map);
		buildFortress(map, "Red", 1);
		buildFortress(map, "Blue", -1);
		buildBackdrop(map);
		// The crowd floats above the desert, ringing both fortresses.
		spectatorRing(map, Vector3.zero, 400, 70, Color3.fromRGB(255, 140, 40));

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(-125, RAMPART, 0), "A", 14, "Domination");
		controlPointMarker(map, new Vector3(0, TOWER, 0), "B", 12, "Domination");
		controlPointMarker(map, new Vector3(125, CANAL, 0), "C", 14, "Domination");
		// Hardpoints: the tower first, then the side lanes, alternating ends.
		controlPointMarker(map, new Vector3(0, TOWER, 0), "1", 14, "Hardpoint");
		controlPointMarker(map, new Vector3(-125, RAMPART, 110), "2", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(125, CANAL, -110), "3", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(-125, RAMPART, -110), "4", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(125, CANAL, 110), "5", 16, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(0, TOWER, 0), "Overcharge");
		perkMarker(map, new Vector3(-125, RAMPART, 0), "Radar");
		perkMarker(map, new Vector3(125, CANAL, 0), "SuperJump");
		perkMarker(map, new Vector3(0, GROUND, 150), "Shield");
		perkMarker(map, new Vector3(0, GROUND, -150), "Shield");

		setMapLighting(map, {
			clockTime: 17.2,
			brightness: 2.5,
			ambient: Color3.fromRGB(160, 145, 130),
			outdoorAmbient: Color3.fromRGB(180, 160, 140),
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
