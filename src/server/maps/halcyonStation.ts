// A white, sterile space station under the stars, in low gravity. Two hangar bays at opposite
// ends connect to a central reactor atrium by an open bridge and two glass-roofed tubes.
// Falling off means drifting into space. Every spawn is in a pocket: behind a wall at the back
// of each bay, or in escape pods off the tubes; cargo stacks where the bridge meets each bay
// break the straight line between them. Red's bay is at +Z, Blue's at -Z.

import { TeamId } from "shared/modes";
import {
	controlPointMarker,
	cylinder,
	flagBaseMarker,
	jumpPad,
	onCircle,
	perkMarker,
	plank,
	pointLight,
	ramp,
	ring,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
	teamGlow,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const ATRIUM_RADIUS = 48;
const BALCONY_RADIUS = 34;
const BALCONY_HEIGHT = 16;
const TUBE_X = 40;
const TUBE_HEIGHT = 12;
const BAY_HALF_WIDTH = 55;
const BAY_HEIGHT = 30;

const Hull: Style = { color: Color3.fromRGB(235, 238, 242), material: Enum.Material.SmoothPlastic };
const Panel: Style = { color: Color3.fromRGB(200, 205, 212), material: Enum.Material.SmoothPlastic };
const Trim: Style = { color: Color3.fromRGB(60, 66, 76), material: Enum.Material.Metal };
const Glass: Style = { color: Color3.fromRGB(200, 230, 255), material: Enum.Material.Glass, transparency: 0.55 };
const Accent: Style = { color: Color3.fromRGB(90, 230, 220), material: Enum.Material.Neon, collide: false };
const Reactor: Style = { color: Color3.fromRGB(180, 240, 255), material: Enum.Material.Neon };
const Pad: Style = { color: Color3.fromRGB(90, 230, 220), material: Enum.Material.Neon };

const ACCENT_LIGHT = Color3.fromRGB(150, 240, 235);

function buildShuttle(map: Model, x: number, sign: number) {
	const z = (distance: number) => sign * distance;
	slab(map, new Vector3(x, 8, z(152)), new Vector3(12, 8, 24), Hull, "ShuttleBody");
	ramp(map, new Vector3(x, 0, z(132)), new Vector3(x, 8, z(140)), 12, Hull);
	slab(map, new Vector3(x, 9.5, z(144)), new Vector3(8, 1.5, 6), Glass, "Cockpit");
	slab(map, new Vector3(x, 3, z(154)), new Vector3(30, 1, 10), Panel, "Wings");
	const engine = slab(map, new Vector3(x, 6, z(164.2)), new Vector3(8, 4, 0.4), Accent, "Engine");
	pointLight(engine, ACCENT_LIGHT, 20, 2);
}

function buildBay(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;

	slab(map, new Vector3(0, 0, z(145)), new Vector3(BAY_HALF_WIDTH * 2, 3, 50), Hull, "BayDeck");

	// Back wall with a wide window onto space.
	const wallZ = z(172);
	slab(map, new Vector3(0, 8, wallZ), new Vector3(114, 8, 4), Hull, "BayWall");
	slab(map, new Vector3(0, BAY_HEIGHT, wallZ), new Vector3(114, 8, 4), Hull, "BayWall");
	for (const side of [-1, 1]) {
		slab(map, new Vector3(side * 43.5, 22, wallZ), new Vector3(27, 14, 4), Hull, "BayWall");
	}
	slab(map, new Vector3(0, 22, wallZ), new Vector3(60, 14, 1), Glass, "Window");
	slab(map, new Vector3(0, 8.2, z(169.9)), new Vector3(110, 0.3, 0.2), glow, "WallStripe");

	for (const side of [-1, 1]) {
		const wallX = side * (BAY_HALF_WIDTH + 2);
		slab(map, new Vector3(wallX, BAY_HEIGHT, z(145)), new Vector3(4, BAY_HEIGHT, 54), Hull, "BayWall");
		slab(
			map,
			new Vector3(side * (BAY_HALF_WIDTH - 0.1), 10, z(145)),
			new Vector3(0.2, 0.5, 50),
			glow,
			"WallStripe",
		);
		slab(map, new Vector3(side * 36.5, BAY_HEIGHT + 3, z(145)), new Vector3(37, 3, 54), Panel, "Ceiling");
	}
	slab(map, new Vector3(0, BAY_HEIGHT + 3, z(145)), new Vector3(36, 1, 54), Glass, "Skylight");

	const flagSpot = new Vector3(0, 0.5, z(135));
	cylinder(map, flagSpot, 0.5, 10, Panel, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);

	buildShuttle(map, -34, sign);
	slab(map, new Vector3(30, 4, z(146)), new Vector3(6, 4, 6), Panel, "Crate");
	slab(map, new Vector3(38, 4, z(152)), new Vector3(6, 4, 6), Panel, "Crate");
	slab(map, new Vector3(34, 8, z(149)), new Vector3(5, 4, 5), Panel, "Crate");

	// Spawn pocket: a wall across the back of the bay, wider than the spawn line, with the way
	// out at each end. Spawns face their nearest exit.
	slab(map, new Vector3(0, 14, z(158)), new Vector3(56, 14, 2), Hull, "SpawnWall");
	slab(map, new Vector3(0, 14.2, z(158) - sign * 1.1), new Vector3(56, 0.4, 0.2), glow, "SpawnWallStripe");
	for (const x of [-16, -8, 0, 8, 16]) {
		spawnMarker(map, new Vector3(x, 0, z(166)), new Vector3(x >= 0 ? 40 : -40, 0, z(166)), team);
	}

	// A cargo stack where the bridge arrives, breaking the straight line down the bridge into
	// the bay and giving cover in front of the flag.
	slab(map, new Vector3(0, 8, z(124)), new Vector3(16, 8, 6), Panel, "CargoStack");
	slab(map, new Vector3(-3, 13, z(124)), new Vector3(8, 5, 5), Panel, "CargoStack");
}

// An escape pod off the middle of a tube: a small room with its door onto the tube and a
// spawn tucked beside the door, out of sight of the tube.
function buildEscapePod(map: Model, side: number, sign: number) {
	const z = sign * 75;
	const podX = side * (TUBE_X + 15);
	slab(map, new Vector3(podX, 0, z), new Vector3(14, 2, 18), Hull, "PodFloor");
	slab(map, new Vector3(podX, TUBE_HEIGHT + 0.6, z), new Vector3(14, 0.6, 18), Panel, "PodRoof");
	slab(map, new Vector3(podX + side * 7, TUBE_HEIGHT, z), new Vector3(1, TUBE_HEIGHT, 18), Hull, "PodWall");
	for (const edge of [-1, 1]) {
		slab(map, new Vector3(podX, TUBE_HEIGHT, z + edge * 9), new Vector3(14, TUBE_HEIGHT, 1), Hull, "PodWall");
	}
	const light = slab(map, new Vector3(podX, TUBE_HEIGHT - 0.1, z), new Vector3(2, 0.2, 10), Accent, "PodLight");
	pointLight(light, ACCENT_LIGHT, 16, 1);
	// Beside the door, not in line with it, so the tube can't see in.
	spawnMarker(map, new Vector3(podX, 0, z + 6), new Vector3(side * TUBE_X, 0, z));
}

function buildConnectors(map: Model) {
	for (const sign of [-1, 1]) {
		const z = (distance: number) => sign * distance;

		// Open-air bridge down the middle, with gaps in the railing.
		slab(map, new Vector3(0, 0, z(82)), new Vector3(14, 2, 76), Hull, "Bridge");
		for (const side of [-1, 1]) {
			for (const along of [55, 80, 105]) {
				slab(map, new Vector3(side * 7.5, 3, z(along)), new Vector3(0.5, 3, 10), Glass, "Railing");
			}
		}

		// Cover on the bridge, offset to alternate sides.
		for (const [along, side] of [
			[65, -1],
			[95, 1],
		] as [number, number][]) {
			slab(map, new Vector3(side * 3, 7, z(along)), new Vector3(6, 7, 2), Panel, "BridgeCover");
		}

		// Enclosed side tubes: glass on the space side, a walkable glass roof.
		for (const side of [-1, 1]) {
			const x = side * TUBE_X;
			slab(map, new Vector3(x, 0, z(75)), new Vector3(14, 2, 100), Hull, "TubeFloor");
			slab(map, new Vector3(x, 0, z(20)), new Vector3(14, 2, 12), Hull, "TubeFloor");
			slab(
				map,
				new Vector3(x - side * 7.5, TUBE_HEIGHT, z(75)),
				new Vector3(1, TUBE_HEIGHT, 100),
				Hull,
				"TubeWall",
			);
			// Glass on the space side, broken by the door to an escape pod at the middle.
			for (const [from, to] of [
				[25, 69],
				[81, 125],
			]) {
				slab(
					map,
					new Vector3(x + side * 7.5, TUBE_HEIGHT, z((from + to) / 2)),
					new Vector3(1, TUBE_HEIGHT, to - from),
					Glass,
					"TubeWindow",
				);
			}
			buildEscapePod(map, side, sign);
			// Bulkheads half-closing the tube on alternate sides, so it can't be watched end to end.
			for (const [along, half] of [
				[45, -1],
				[105, 1],
			] as [number, number][]) {
				slab(
					map,
					new Vector3(x + half * 3.5, TUBE_HEIGHT, z(along)),
					new Vector3(7, TUBE_HEIGHT, 1.5),
					Hull,
					"Bulkhead",
				);
			}
			slab(map, new Vector3(x, TUBE_HEIGHT + 0.6, z(75)), new Vector3(16, 0.6, 100), Glass, "TubeRoof");
			const strip = slab(
				map,
				new Vector3(x, TUBE_HEIGHT - 0.1, z(75)),
				new Vector3(2, 0.2, 96),
				Accent,
				"TubeLight",
			);
			pointLight(strip, ACCENT_LIGHT, 30, 1);
		}
	}
}

function buildAtrium(map: Model) {
	cylinder(map, Vector3.zero, 3, ATRIUM_RADIUS * 2, Hull, "Atrium");
	ring(map, new Vector3(0, 0.1, 0), ATRIUM_RADIUS - 1, 0.6, 0.2, 32, Accent, "AtriumRing");

	cylinder(map, new Vector3(0, 1, 0), 1, 20, Trim, "ReactorBase");
	const core = cylinder(map, new Vector3(0, 40, 0), 39, 8, Reactor, "ReactorCore");
	pointLight(core, ACCENT_LIGHT, 60, 3);
	cylinder(map, new Vector3(0, 40, 0), 39, 14, Glass, "ReactorShell");

	const balconyTop = new Vector3(0, BALCONY_HEIGHT, 0);
	ring(map, balconyTop, BALCONY_RADIUS, 10, 1.5, 24, Panel, "Balcony");
	ring(map, balconyTop.add(new Vector3(0, 3, 0)), BALCONY_RADIUS - 4.5, 0.5, 3, 24, Glass, "BalconyRailing");
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * 2 * math.pi + math.pi / 8;
		slab(
			map,
			onCircle(new Vector3(0, BALCONY_HEIGHT - 1.5, 0), BALCONY_RADIUS, angle),
			new Vector3(2, 14.5, 2),
			Trim,
			"BalconySupport",
		);
	}

	for (let i = 0; i < 4; i++) {
		const angle = math.pi / 4 + (i * math.pi) / 2;
		jumpPad(map, onCircle(Vector3.zero, 20, angle), onCircle(balconyTop, BALCONY_RADIUS, angle), 8, Pad);
	}

	// Coolant pylons around the reactor, breaking the straight lines across the atrium.
	for (let i = 0; i < 4; i++) {
		const pylon = slab(
			map,
			onCircle(new Vector3(0, 12, 0), 27, (i * math.pi) / 2),
			new Vector3(5, 12, 5),
			Trim,
			"Pylon",
		);
		const glow = slab(
			map,
			onCircle(new Vector3(0, 12.2, 0), 27, (i * math.pi) / 2),
			new Vector3(5.4, 0.4, 5.4),
			Accent,
			"PylonCap",
		);
		pointLight(glow, ACCENT_LIGHT, 18, 1);
		pylon.Name = "Pylon";
	}

	// Short gangways from the balcony down onto the tube roofs.
	for (const x of [-1, 1]) {
		for (const z of [-1, 1]) {
			plank(
				map,
				new Vector3(x * 30.4, BALCONY_HEIGHT, z * 22.8),
				new Vector3(x * TUBE_X, TUBE_HEIGHT + 0.6, z * 30),
				4,
				1,
				Panel,
				"Gangway",
			);
		}
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
			themeColor: Color3.fromRGB(90, 230, 220),
			// Music: cold, spacious ambient electronic with a steady pulse. Pick a licensed Creator
			// Store track (see docs/FEEDBACK.md).
			music: "",
		});

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(map, new Vector3(-30, 0, 0), "A", 9, "Domination");
		controlPointMarker(map, Vector3.zero, "B", 18, "Domination");
		controlPointMarker(map, new Vector3(30, 0, 0), "C", 9, "Domination");
		// Hardpoints: larger zones with cover, rotating center first and then alternating sides.
		controlPointMarker(map, Vector3.zero, "1", 22, "Hardpoint");
		controlPointMarker(map, new Vector3(-40, 0, 75), "2", 14, "Hardpoint");
		controlPointMarker(map, new Vector3(40, 0, -75), "3", 14, "Hardpoint");
		controlPointMarker(map, new Vector3(-40, 0, -75), "4", 14, "Hardpoint");
		controlPointMarker(map, new Vector3(40, 0, 75), "5", 14, "Hardpoint");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(map, new Vector3(-20, 0, 0), "Overcharge");
		perkMarker(map, new Vector3(20, 0, 0), "Radar");
		perkMarker(map, new Vector3(0, 0, 80), "SuperJump");
		perkMarker(map, new Vector3(0, 0, -80), "SuperJump");
		perkMarker(map, new Vector3(-TUBE_X, 0, 75), "Shield");
		perkMarker(map, new Vector3(TUBE_X, 0, -75), "Shield");

		buildBay(map, "Red", 1);
		buildBay(map, "Blue", -1);
		buildConnectors(map);
		buildAtrium(map);
		// The crowd floats outside the station's windows.
		spectatorRing(map, Vector3.zero, 220, 20, Color3.fromRGB(90, 230, 220));

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
