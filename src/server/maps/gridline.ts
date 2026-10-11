// A neon arena inside a digital void. Black glass floor under a glowing grid, two bases at
// opposite ends lit in team colors, side catwalks, and a core that beams light into the sky.
// Symmetric along Z: Red's base is at +Z, Blue's at -Z.

import { TEAM_COLORS, TeamId } from "shared/modes";
import {
	block,
	cylinder,
	flagBaseMarker,
	jumpPad,
	ramp,
	ring,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
} from "./kit";
import { MapBuilder } from "./types";

const HALF_WIDTH = 80;
const HALF_LENGTH = 200;
const WALL_HEIGHT = 40;
const BASE_HEIGHT = 6;
const ARCH_HEIGHT = 22;
const CATWALK_HEIGHT = 14;
const CATWALK_X = 64;
const CORE_HEIGHT = 4;

// Three value layers keep shapes readable: a deep navy floor, mid-tone blue-grey structures,
// and walls in between, all against a lit blue haze rather than black.
const Floor: Style = { color: Color3.fromRGB(18, 22, 38), material: Enum.Material.SmoothPlastic, reflectance: 0.25 };
const Panel: Style = { color: Color3.fromRGB(78, 90, 118), material: Enum.Material.Metal };
const Wall: Style = { color: Color3.fromRGB(36, 44, 66), material: Enum.Material.SmoothPlastic };
const Grid: Style = {
	color: Color3.fromRGB(70, 160, 255),
	material: Enum.Material.Neon,
	transparency: 0.15,
	collide: false,
	castShadow: false,
};
const Glow: Style = { color: Color3.fromRGB(200, 240, 255), material: Enum.Material.Neon, collide: false };
const Pad: Style = { color: Color3.fromRGB(0, 220, 255), material: Enum.Material.Neon };
const Barrier: Style = { color: new Color3(), transparency: 1 };

function teamGlow(team: TeamId): Style {
	return { color: TEAM_COLORS[team], material: Enum.Material.Neon, collide: false, castShadow: false };
}

// Neon strips along the top edges of a box, the signature Tron look.
function outline(parent: Instance, top: Vector3, width: number, depth: number, style: Style) {
	const thickness = 0.4;
	for (const side of [-1, 1]) {
		slab(
			parent,
			top.add(new Vector3(0, 0.2, (side * (depth - thickness)) / 2)),
			new Vector3(width, 0.4, thickness),
			style,
			"Edge",
		);
		slab(
			parent,
			top.add(new Vector3((side * (width - thickness)) / 2, 0.2, 0)),
			new Vector3(thickness, 0.4, depth),
			style,
			"Edge",
		);
	}
}

function buildShell(map: Model) {
	slab(map, Vector3.zero, new Vector3(HALF_WIDTH * 2, 4, HALF_LENGTH * 2), Floor, "Floor");
	for (let x = -HALF_WIDTH + 20; x < HALF_WIDTH; x += 20) {
		slab(map, new Vector3(x, 0.05, 0), new Vector3(0.3, 0.1, HALF_LENGTH * 2), Grid, "Grid");
	}
	for (let z = -HALF_LENGTH + 20; z < HALF_LENGTH; z += 20) {
		slab(map, new Vector3(0, 0.05, z), new Vector3(HALF_WIDTH * 2, 0.1, 0.3), Grid, "Grid");
	}

	for (const side of [-1, 1]) {
		const wallX = side * (HALF_WIDTH + 2);
		slab(map, new Vector3(wallX, WALL_HEIGHT, 0), new Vector3(4, WALL_HEIGHT, HALF_LENGTH * 2 + 8), Wall, "Wall");
		for (const height of [8, 24]) {
			slab(
				map,
				new Vector3(side * (HALF_WIDTH - 0.1), height, 0),
				new Vector3(0.2, 0.4, HALF_LENGTH * 2),
				Glow,
				"WallStripe",
			);
		}
		const barrier = slab(
			map,
			new Vector3(wallX, WALL_HEIGHT + 300, 0),
			new Vector3(4, 300, HALF_LENGTH * 2 + 8),
			Barrier,
			"Barrier",
		);
		barrier.CanQuery = false;
	}
}

function buildBase(map: Model, team: TeamId, sign: number) {
	const glow = teamGlow(team);
	const z = (distance: number) => sign * distance;

	slab(map, new Vector3(0, WALL_HEIGHT, z(HALF_LENGTH + 2)), new Vector3(HALF_WIDTH * 2 + 8, WALL_HEIGHT, 4), Wall);
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
		new Vector3(0, WALL_HEIGHT + 300, z(HALF_LENGTH + 2)),
		new Vector3(HALF_WIDTH * 2 + 8, 300, 4),
		Barrier,
		"Barrier",
	);
	barrier.CanQuery = false;

	const platformTop = new Vector3(0, BASE_HEIGHT, z(175));
	slab(map, platformTop, new Vector3(72, BASE_HEIGHT, 50), Panel, "BasePlatform");
	outline(map, platformTop, 72, 50, glow);
	for (const x of [-24, 0, 24]) {
		ramp(map, new Vector3(x, 0, z(122)), new Vector3(x, BASE_HEIGHT, z(150)), 12, Panel);
	}

	const flagSpot = new Vector3(0, BASE_HEIGHT + 0.5, z(180));
	cylinder(map, flagSpot, 0.5, 10, Panel, "FlagDais");
	ring(map, flagSpot.add(new Vector3(0, 0.1, 0)), 4.6, 0.6, 0.2, 20, glow, "DaisRing");
	flagBaseMarker(map, flagSpot, team);

	for (const x of [-18, 18]) {
		const coverTop = new Vector3(x, BASE_HEIGHT + 6, z(165));
		slab(map, coverTop, new Vector3(8, 6, 3), Panel, "Cover");
		outline(map, coverTop, 8, 3, glow);
	}

	const archTop = new Vector3(0, ARCH_HEIGHT, z(150));
	slab(map, archTop, new Vector3(HALF_WIDTH * 2, 1.5, 8), Panel, "Arch");
	outline(map, archTop, HALF_WIDTH * 2, 8, glow);
	for (const x of [-76, -40, 40, 76]) {
		slab(map, new Vector3(x, ARCH_HEIGHT - 1.5, z(150)), new Vector3(3, ARCH_HEIGHT - 1.5, 3), Panel, "ArchPillar");
	}
	for (const x of [-30, 30]) {
		jumpPad(map, new Vector3(x, BASE_HEIGHT, z(185)), new Vector3(x, ARCH_HEIGHT, z(150)), 6, Pad);
	}

	for (const x of [-30, -18, -6, 6, 18, 30]) {
		spawnMarker(map, new Vector3(x, BASE_HEIGHT, z(193)), new Vector3(x, BASE_HEIGHT, 0), team);
	}
}

function buildCatwalks(map: Model) {
	for (const side of [-1, 1]) {
		const x = side * CATWALK_X;
		const top = new Vector3(x, CATWALK_HEIGHT, 0);
		slab(map, top, new Vector3(10, 1.5, 220), Panel, "Catwalk");
		outline(map, top, 10, 220, Glow);
		for (let z = -88; z <= 88; z += 44) {
			slab(
				map,
				new Vector3(x, CATWALK_HEIGHT - 1.5, z),
				new Vector3(2, CATWALK_HEIGHT - 1.5, 2),
				Panel,
				"Support",
			);
		}
		for (const direction of [-1, 1]) {
			ramp(map, new Vector3(x, 0, direction * 150), new Vector3(x, CATWALK_HEIGHT, direction * 110), 10, Panel);
		}
		jumpPad(map, new Vector3(side * 46, 0, 0), top, 6, Pad);
		for (const direction of [-1, 1]) {
			spawnMarker(map, new Vector3(x, CATWALK_HEIGHT, direction * 100), Vector3.zero);
		}
	}
}

function buildMidfield(map: Model) {
	const coreTop = new Vector3(0, CORE_HEIGHT, 0);
	cylinder(map, coreTop, CORE_HEIGHT, 40, Panel, "Core");
	ring(map, coreTop.add(new Vector3(0, 0.1, 0)), 19, 0.6, 0.2, 32, Glow, "CoreRing");
	const beam = cylinder(
		map,
		new Vector3(0, 160, 0),
		156,
		3,
		{ ...Glow, transparency: 0.4, castShadow: false },
		"Beam",
	);
	beam.CanQuery = false;

	// Slanted light walls for cover around the core.
	for (const x of [-1, 1]) {
		for (const z of [-1, 1]) {
			const frame = new CFrame(x * 36, 3.5, z * 42).mul(CFrame.Angles(0, math.rad(35 * x * z), 0));
			block(map, new Vector3(2, 7, 22), frame, Panel, "LightWall");
			block(map, new Vector3(2.2, 0.3, 22), frame.mul(new CFrame(0, 3.6, 0)), Glow, "LightWallEdge");
		}
	}

	for (const x of [-24, 24]) {
		for (const z of [-84, 84]) {
			const top = new Vector3(x, 10, z);
			slab(map, top, new Vector3(10, 10, 10), Panel, "DataCube");
			outline(map, top, 10, 10, Glow);
		}
	}
}

export const Gridline: MapBuilder = {
	id: "Gridline",
	build(map) {
		setMapInfo(map, {
			name: "Gridline",
			tagline: "Neon lanes, no cover from the light.",
			modes: ["CTF", "Deathmatch"],
			gravity: 196.2,
			killHeight: -20,
		});

		buildShell(map);
		buildBase(map, "Red", 1);
		buildBase(map, "Blue", -1);
		buildCatwalks(map);
		buildMidfield(map);

		setMapLighting(map, {
			clockTime: 0,
			brightness: 1,
			ambient: Color3.fromRGB(70, 80, 110),
			outdoorAmbient: Color3.fromRGB(80, 95, 130),
			atmosphere: {
				density: 0.3,
				color: Color3.fromRGB(30, 60, 120),
				decay: Color3.fromRGB(10, 20, 60),
				glare: 0,
				haze: 1.5,
			},
			bloom: { intensity: 1, size: 28, threshold: 0.9 },
			colorCorrection: {
				tint: Color3.fromRGB(230, 240, 255),
				contrast: 0.15,
				saturation: 0.25,
				brightness: 0,
			},
		});
	},
};
