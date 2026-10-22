// A white, sterile space station under the stars, in low gravity. One long hall under a glass
// roof, with windows onto space down both sides. In the middle, the reactor rises out of an
// open shaft to space: two bridges cross the shaft, a balcony rings it, and the reactor's cap
// is the high point. Side lanes down the windows are the speed runways, cargo modules break up
// the floor between them, and each end is a hangar bay with its flag on a raised dock. Players
// spawn in rooms behind the end walls. Falling into the shaft means drifting into space. Red's
// bay is at +Z, Blue's at -Z. Earlier versions are recorded in docs/MAP_DESIGN.md.
//
// Heights: deck 0, docks 10, cargo modules 18, balcony 22, reactor cap 45, glass roof 74.
// Low gravity (120) makes every jump about 1.6 times higher.

import { TeamId } from "shared/modes";
import {
	cylinder,
	flagBaseMarker,
	gableRoof,
	jumpPad,
	outline,
	perkMarker,
	plateWithHoles,
	pointLight,
	ramp,
	ring,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
	teamGlow,
	wallWithGaps,
	controlPointMarker,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const Hull: Style = { color: Color3.fromRGB(235, 238, 242), material: Enum.Material.SmoothPlastic };
const Panel: Style = { color: Color3.fromRGB(200, 205, 212), material: Enum.Material.SmoothPlastic };
const Trim: Style = { color: Color3.fromRGB(60, 66, 76), material: Enum.Material.Metal };
const Glass: Style = { color: Color3.fromRGB(200, 230, 255), material: Enum.Material.Glass, transparency: 0.55 };
const Accent: Style = {
	color: Color3.fromRGB(90, 230, 220),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Reactor: Style = { color: Color3.fromRGB(180, 240, 255), material: Enum.Material.Neon };
const Pad: Style = { color: Color3.fromRGB(90, 230, 220), material: Enum.Material.Neon };

const ACCENT_LIGHT = Color3.fromRGB(150, 240, 235);

const X_EDGE = 140;
const Z_EDGE = 200;
const WALL_HEIGHT = 74;
const DOCK = 10;
const CARGO = 18;
const BALCONY = 22;
const CAP = 45;
// The reactor shaft: a square hole in the deck, open to space.
const SHAFT_HALF = 50;
const BRIDGE_X = 32;
const BRIDGE_WIDTH = 24;
const BALCONY_WIDTH = 16;
const FLAG_Z = 175;
// Spawn rooms behind the end walls, this deep, entered through two doors behind the side lanes.
const ROOM_DEPTH = 40;
const ROOM_HALF_WIDTH = 110;
const ROOM_HEIGHT = 24;
const DOOR_HEIGHT = 18;
const DOORS: [number, number][] = [
	[-100, -80],
	[80, 100],
];

function stripLight(map: Model, top: Vector3, size: Vector3, range = 40) {
	const strip = slab(map, top, size, Accent, "Light");
	pointLight(strip, ACCENT_LIGHT, range, 1.2);
}

// Deck, side walls with long windows onto space, end walls with the spawn room doors, and the
// glass roof that keeps players in.
function buildShell(map: Model) {
	plateWithHoles(
		map,
		0,
		-X_EDGE,
		X_EDGE,
		-Z_EDGE,
		Z_EDGE,
		[[-SHAFT_HALF, SHAFT_HALF, -SHAFT_HALF, SHAFT_HALF]],
		Hull,
	);
	for (const side of [-1, 1]) {
		const x = side * (X_EDGE + 2);
		slab(map, new Vector3(x, 10, 0), new Vector3(4, 10, Z_EDGE * 2), Hull, "SideWall");
		slab(map, new Vector3(x, 60, 0), new Vector3(1, 50, Z_EDGE * 2), Glass, "Window");
		slab(map, new Vector3(x, WALL_HEIGHT, 0), new Vector3(4, WALL_HEIGHT - 60, Z_EDGE * 2), Hull, "SideWall");
		slab(map, new Vector3(side * (X_EDGE - 0.1), 10.2, 0), new Vector3(0.2, 0.4, Z_EDGE * 2), Accent, "Stripe");

		wallWithGaps(map, true, side * (Z_EDGE + 2), -X_EDGE - 4, X_EDGE + 4, DOORS, 0, WALL_HEIGHT, Hull, 4);
		for (const [a, b] of DOORS) {
			slab(
				map,
				new Vector3((a + b) / 2, WALL_HEIGHT, side * (Z_EDGE + 2)),
				new Vector3(b - a, WALL_HEIGHT - DOOR_HEIGHT, 4),
				Hull,
				"Lintel",
			);
		}
		for (const x of [-100, 0, 100]) {
			stripLight(map, new Vector3(x, 45, side * (Z_EDGE - 0.3)), new Vector3(20, 0.6, 0.4), 60);
		}
	}
	slab(map, new Vector3(0, WALL_HEIGHT + 2, 0), new Vector3(X_EDGE * 2 + 8, 2, Z_EDGE * 2 + 8), Glass, "GlassRoof");
}

// The reactor shaft: bridges across it, a lip round its edge, the reactor rising out of it with
// its cap as the high point, and the balcony ringing it.
function buildReactor(map: Model) {
	for (const side of [-1, 1]) {
		slab(map, new Vector3(side * BRIDGE_X, 0, 0), new Vector3(BRIDGE_WIDTH, 2, SHAFT_HALF * 2), Panel, "Bridge");
		stripLight(map, new Vector3(side * BRIDGE_X, 0.1, 0), new Vector3(2, 0.2, SHAFT_HALF * 2 - 4), 30);
		jumpPad(map, new Vector3(side * BRIDGE_X, 0, 0), new Vector3(side * 6, CAP, 0), 10, Pad);
	}

	// A glass lip round the shaft, open where the bridges meet the deck.
	const bridgeEdge = BRIDGE_X + BRIDGE_WIDTH / 2;
	const bridgeInner = BRIDGE_X - BRIDGE_WIDTH / 2;
	for (const side of [-1, 1]) {
		slab(map, new Vector3(side * SHAFT_HALF, 2, 0), new Vector3(1, 2, SHAFT_HALF * 2), Glass, "ShaftLip");
		for (const [a, b] of [
			[-SHAFT_HALF, -bridgeEdge],
			[-bridgeInner, bridgeInner],
			[bridgeEdge, SHAFT_HALF],
		]) {
			slab(map, new Vector3((a + b) / 2, 2, side * SHAFT_HALF), new Vector3(b - a, 2, 1), Glass, "ShaftLip");
		}
	}

	const core = cylinder(map, new Vector3(0, CAP - 3, 0), CAP + 97, 14, Reactor, "ReactorCore");
	pointLight(core, ACCENT_LIGHT, 80, 3);
	cylinder(map, new Vector3(0, CAP - 3, 0), CAP + 97, 22, Glass, "ReactorShell");
	cylinder(map, new Vector3(0, CAP, 0), 3, 30, Trim, "ReactorCap");
	ring(map, new Vector3(0, CAP + 0.1, 0), 13.5, 1, 0.2, 24, Accent, "CapRing");

	// The balcony: a square ring over the shaft's edge, on four corner pylons.
	const reach = SHAFT_HALF + BALCONY_WIDTH / 2;
	for (const side of [-1, 1]) {
		slab(
			map,
			new Vector3(0, BALCONY, side * reach),
			new Vector3(reach * 2 + BALCONY_WIDTH, 2, BALCONY_WIDTH),
			Panel,
			"Balcony",
		);
		slab(map, new Vector3(side * reach, BALCONY, 0), new Vector3(BALCONY_WIDTH, 2, reach * 2), Panel, "Balcony");
		for (const zSide of [-1, 1]) {
			slab(
				map,
				new Vector3(side * reach, BALCONY - 2, zSide * reach),
				new Vector3(8, BALCONY - 2, 8),
				Trim,
				"Pylon",
			);
		}
	}
	outline(map, new Vector3(0, BALCONY, 0), (reach + BALCONY_WIDTH / 2) * 2, (reach + BALCONY_WIDTH / 2) * 2, Accent);
}

// Cargo modules: four big blocks between the shaft and the bays, the floor's cover and the step
// up to the balcony. Their roofs are standable.
function buildCargo(map: Model) {
	for (const x of [-80, 80]) {
		for (const z of [-105, 105]) {
			slab(map, new Vector3(x, CARGO, z), new Vector3(30, CARGO, 40), Panel, "CargoModule");
			outline(map, new Vector3(x, CARGO, z), 30, 40, Accent);
		}
	}
}

// A hangar bay at one end: the team's flag on a raised dock in the middle, ramps up from both
// sides, and its spawn room behind the end wall.
function buildBay(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;

	slab(map, new Vector3(0, DOCK, z(FLAG_Z)), new Vector3(44, DOCK, 30), Panel, "Dock");
	outline(map, new Vector3(0, DOCK, z(FLAG_Z)), 44, 30, glow);
	for (const side of [-1, 1]) {
		ramp(map, new Vector3(side * 46, 0, z(FLAG_Z)), new Vector3(side * 22, DOCK, z(FLAG_Z)), 14, Panel);
	}
	const flagSpot = new Vector3(0, DOCK, z(FLAG_Z));
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);
	slab(map, new Vector3(0, 30, z(Z_EDGE - 0.2)), new Vector3(120, 0.6, 0.4), glow, "TeamStripe");

	// The spawn room behind the end wall, with a baffle inside each door so the hall can't see
	// in, and a steep roof.
	const zMid = z(Z_EDGE + 4 + ROOM_DEPTH / 2);
	const zBack = z(Z_EDGE + 4 + ROOM_DEPTH);
	slab(map, new Vector3(0, 0, zMid), new Vector3(ROOM_HALF_WIDTH * 2, 2, ROOM_DEPTH + 4), Hull, "SpawnFloor");
	wallWithGaps(map, true, zBack, -ROOM_HALF_WIDTH, ROOM_HALF_WIDTH, [], 0, ROOM_HEIGHT, Hull, 4);
	for (const side of [-1, 1]) {
		wallWithGaps(map, false, side * ROOM_HALF_WIDTH, z(Z_EDGE), zBack, [], 0, ROOM_HEIGHT, Hull, 4);
	}
	gableRoof(map, new CFrame(0, ROOM_HEIGHT, zMid), ROOM_HALF_WIDTH * 2 + 4, ROOM_DEPTH + 8, 25, Panel);
	for (const [a, b] of DOORS) {
		slab(
			map,
			new Vector3((a + b) / 2, DOOR_HEIGHT, z(Z_EDGE + 16)),
			new Vector3(b - a + 20, DOOR_HEIGHT, 2),
			Hull,
			"DoorBaffle",
		);
	}
	for (const x of [-60, 0, 60]) stripLight(map, new Vector3(x, ROOM_HEIGHT - 1, zMid), new Vector3(10, 0.4, 2), 36);

	const row = zBack - sign * 6;
	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(map, new Vector3(x, 0, row), new Vector3(x > 0 ? 90 : -90, 0, z(Z_EDGE)), team);
	}
	for (const side of [-1, 1]) {
		spawnMarker(map, new Vector3(side * 60, 0, row), new Vector3(side * 90, 0, z(Z_EDGE)));
	}
}

export const HalcyonStation: MapBuilder = {
	id: "HalcyonStation",
	build(map) {
		setMapInfo(map, {
			name: "Halcyon Station",
			tagline: "Low gravity. Long falls.",
			modes: ["CTF", "Deathmatch", "TeamDeathmatch", "Domination", "Hardpoint"],
			gravity: 120,
			killHeight: -60,
			// The glass roof isn't playable space.
			playableTop: CAP + 2,
			themeColor: Color3.fromRGB(90, 230, 220),
			// Music: cold, spacious ambient electronic with a steady pulse. Pick a licensed Creator
			// Store track (see docs/FEEDBACK.md).
			music: "",
		});

		buildShell(map);
		buildReactor(map);
		buildCargo(map);
		buildBay(map, "Red", 1);
		buildBay(map, "Blue", -1);
		// The crowd floats outside the station's windows.
		spectatorRing(map, Vector3.zero, 290, 40, Color3.fromRGB(90, 230, 220));

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(-120, 0, 0), "A", 14, "Domination");
		controlPointMarker(map, new Vector3(0, CAP, 0), "B", 12, "Domination");
		controlPointMarker(map, new Vector3(120, 0, 0), "C", 14, "Domination");
		// Hardpoints: the reactor cap first, then the side lanes, alternating ends.
		controlPointMarker(map, new Vector3(0, CAP, 0), "1", 14, "Hardpoint");
		controlPointMarker(map, new Vector3(-120, 0, 100), "2", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(120, 0, -100), "3", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(-120, 0, -100), "4", 16, "Hardpoint");
		controlPointMarker(map, new Vector3(120, 0, 100), "5", 16, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(0, CAP, 0), "Overcharge");
		perkMarker(map, new Vector3(SHAFT_HALF + BALCONY_WIDTH / 2, BALCONY, 0), "Radar");
		perkMarker(map, new Vector3(0, 0, 125), "SuperJump");
		perkMarker(map, new Vector3(0, 0, -125), "SuperJump");
		perkMarker(map, new Vector3(-120, 0, 40), "Shield");
		perkMarker(map, new Vector3(120, 0, -40), "Shield");

		setMapLighting(map, {
			clockTime: 0,
			brightness: 2.5,
			ambient: Color3.fromRGB(205, 210, 220),
			outdoorAmbient: Color3.fromRGB(190, 200, 210),
			bloom: { intensity: 0.6, size: 20, threshold: 1.3 },
			colorCorrection: {
				tint: Color3.fromRGB(245, 250, 255),
				contrast: 0.1,
				saturation: -0.15,
				brightness: 0.05,
			},
		});
	},
};
