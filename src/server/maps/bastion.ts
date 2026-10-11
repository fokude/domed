// A brutalist fortress in the desert at golden hour. An elevated ring road circles the map for
// building bhop speed; inside it, a courtyard of obelisks surrounds a three-floor fortress of
// rooms and halls around a central shaft, with a ramp route spiralling up to the roof.
//
// The fortress sits on a 15-stud tile grid, 8 by 8 tiles. Floors are rebuilt from tiles so
// stairwell holes can be left out of the floor above each ramp.

import {
	block,
	cylinder,
	jumpPad,
	onCircle,
	ramp,
	ring,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
} from "./kit";
import { MapBuilder } from "./types";

const TILE = 15;
const TILES = 8;
const HALF = (TILE * TILES) / 2; // 60
const ATRIUM_HALF = TILE; // the shaft is the middle 2 by 2 tiles
const WALL_HEIGHT = 16;
const LEVELS = [0, 18, 36]; // floor tops; the roof is at 54
const ROOF = 54;

const RING_RADIUS = 150;
const RING_WIDTH = 26;
const RING_HEIGHT = 8;
const COURTYARD_RADIUS = 170;

const Sandstone: Style = { color: Color3.fromRGB(205, 170, 120), material: Enum.Material.Sandstone };
const Concrete: Style = { color: Color3.fromRGB(188, 178, 162), material: Enum.Material.Concrete };
const DarkConcrete: Style = { color: Color3.fromRGB(110, 102, 94), material: Enum.Material.Concrete };
const Asphalt: Style = { color: Color3.fromRGB(58, 56, 60), material: Enum.Material.Asphalt };
const Copper: Style = {
	color: Color3.fromRGB(255, 140, 40),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const LaneMark: Style = { color: Color3.fromRGB(240, 200, 80), collide: false, castShadow: false };
const Pad: Style = { color: Color3.fromRGB(255, 140, 40), material: Enum.Material.Neon };
const Barrier: Style = { color: new Color3(), transparency: 1 };
const Backdrop: Style = { color: Color3.fromRGB(196, 150, 100), material: Enum.Material.Sandstone, collide: false };

function tileCenter(index: number): number {
	return -HALF + TILE / 2 + index * TILE;
}

function isAtrium(i: number, j: number): boolean {
	return (i === 3 || i === 4) && (j === 3 || j === 4);
}

function noQuery<T extends BasePart>(part: T): T {
	part.CanQuery = false;
	return part;
}

// Stairwell holes: tiles left out of a floor so the ramp from the floor below comes up through.
const HOLES: Record<number, [number, number][]> = {
	[LEVELS[1]]: [
		[6, 1],
		[6, 2],
	],
	[LEVELS[2]]: [
		[1, 5],
		[1, 6],
	],
	[ROOF]: [
		[5, 6],
		[6, 6],
	],
};

function buildFloorPlate(map: Model, top: number) {
	const holes = HOLES[top] ?? [];
	for (let i = 0; i < TILES; i++) {
		for (let j = 0; j < TILES; j++) {
			if (isAtrium(i, j) || holes.some(([hi, hj]) => hi === i && hj === j)) continue;
			slab(map, new Vector3(tileCenter(i), top, tileCenter(j)), new Vector3(TILE, 2, TILE), Concrete, "Floor");
		}
	}
}

// A wall run along one axis between `from` and `to`, with a doorway left in each `gaps` range.
function wallWithGaps(
	map: Model,
	alongX: boolean,
	fixed: number,
	from: number,
	to: number,
	gaps: [number, number][],
	base: number,
	thickness: number,
) {
	const cuts = [from];
	for (const [start, finish] of gaps) {
		cuts.push(start, finish);
	}
	cuts.push(to);
	for (let k = 0; k < cuts.size(); k += 2) {
		const [start, finish] = [cuts[k], cuts[k + 1]];
		if (finish - start < 0.5) continue;
		const middle = (start + finish) / 2;
		const position = alongX
			? new Vector3(middle, base + WALL_HEIGHT, fixed)
			: new Vector3(fixed, base + WALL_HEIGHT, middle);
		const size = alongX
			? new Vector3(finish - start, WALL_HEIGHT, thickness)
			: new Vector3(thickness, WALL_HEIGHT, finish - start);
		slab(map, position, size, DarkConcrete, "Wall");
	}
}

function buildWalls(map: Model, base: number) {
	const outerGaps: [number, number][] = [
		[-45, -35],
		[-8, 8],
		[35, 45],
	];
	for (const side of [-1, 1]) {
		const edge = side * (HALF + 1);
		wallWithGaps(map, true, edge, -HALF - 2, HALF + 2, outerGaps, base, 2);
		wallWithGaps(map, false, edge, -HALF, HALF, outerGaps, base, 2);
	}

	// Partitions split each floor into four corner rooms and four halls around the shaft. Every
	// partition has a doorway 30 to 45 studs out, which the stair ramps also pass through.
	for (const side of [-1, 1]) {
		for (const half of [-1, 1]) {
			const from = half > 0 ? ATRIUM_HALF : -HALF;
			const to = half > 0 ? HALF : -ATRIUM_HALF;
			const gap: [number, number] = half > 0 ? [30, 45] : [-45, -30];
			wallWithGaps(map, false, side * ATRIUM_HALF, from, to, [gap], base, 2);
			wallWithGaps(map, true, side * ATRIUM_HALF, from, to, [gap], base, 2);
		}
	}
}

function buildTrim(map: Model, height: number) {
	for (const side of [-1, 1]) {
		slab(
			map,
			new Vector3(0, height + 0.6, side * (HALF + 2.2)),
			new Vector3(HALF * 2 + 4.4, 0.6, 0.4),
			Copper,
			"Trim",
		);
		slab(
			map,
			new Vector3(side * (HALF + 2.2), height + 0.6, 0),
			new Vector3(0.4, 0.6, HALF * 2 + 4.4),
			Copper,
			"Trim",
		);
	}
}

function buildFortress(map: Model) {
	for (const level of LEVELS) {
		if (level > 0) buildFloorPlate(map, level);
		buildWalls(map, level);
	}
	buildFloorPlate(map, ROOF);
	for (const level of [...LEVELS.filter((level) => level > 0), ROOF]) buildTrim(map, level);

	// Roof parapet.
	for (const side of [-1, 1]) {
		slab(
			map,
			new Vector3(0, ROOF + 3, side * (HALF + 1)),
			new Vector3(HALF * 2 + 4, 3, 2),
			DarkConcrete,
			"Parapet",
		);
		slab(map, new Vector3(side * (HALF + 1), ROOF + 3, 0), new Vector3(2, 3, HALF * 2), DarkConcrete, "Parapet");
	}

	// The stair route spirals up: ground to floor 1 in the south-east room, floor 1 to 2 in the
	// north-west room, floor 2 to the roof in the north-east room.
	ramp(map, new Vector3(37.5, 0, -45), new Vector3(37.5, LEVELS[1], -15), 12, Concrete);
	ramp(map, new Vector3(-37.5, LEVELS[1], 45), new Vector3(-37.5, LEVELS[2], 15), 12, Concrete);
	ramp(map, new Vector3(45, LEVELS[2], 37.5), new Vector3(15, ROOF, 37.5), 12, Concrete);

	// Big outdoor ramps up to the first floor's north and south doorways.
	for (const side of [-1, 1]) {
		ramp(map, new Vector3(0, 0, side * 100), new Vector3(0, LEVELS[1], side * HALF), 14, Sandstone);
	}

	// Shaft pads up to each level, and corner pads from the courtyard onto the roof.
	jumpPad(map, new Vector3(9, 0, 0), new Vector3(22.5, LEVELS[1], 0), 8, Pad);
	jumpPad(map, new Vector3(0, 0, -9), new Vector3(0, LEVELS[1], -22.5), 8, Pad);
	jumpPad(map, new Vector3(-9, 0, 0), new Vector3(-22.5, LEVELS[2], 0), 8, Pad);
	jumpPad(map, new Vector3(0, 0, 9), new Vector3(0, ROOF, 22.5), 8, Pad);
	for (let k = 0; k < 4; k++) {
		const angle = math.pi / 4 + (k * math.pi) / 2;
		jumpPad(map, onCircle(Vector3.zero, 100, angle), onCircle(new Vector3(0, ROOF, 0), 74, angle), 12, Pad);
	}
}

function buildGrounds(map: Model) {
	cylinder(map, Vector3.zero, 6, COURTYARD_RADIUS * 2, Sandstone, "Courtyard");

	// Elevated ring road with a parapet and a dashed center line.
	ring(map, new Vector3(0, RING_HEIGHT, 0), RING_RADIUS, RING_WIDTH, RING_HEIGHT, 40, Asphalt, "RingRoad");
	ring(
		map,
		new Vector3(0, RING_HEIGHT + 4, 0),
		RING_RADIUS + RING_WIDTH / 2 + 1,
		2,
		4,
		40,
		DarkConcrete,
		"RingParapet",
	);
	ring(map, new Vector3(0, RING_HEIGHT + 4.6, 0), RING_RADIUS + RING_WIDTH / 2 + 1, 2.2, 0.6, 40, Copper, "RingTrim");
	// Starts at the parapet's top so there's no gap to jump through.
	ring(map, new Vector3(0, 312, 0), RING_RADIUS + RING_WIDTH / 2 + 3, 2, 300, 40, Barrier, "Barrier").forEach(
		noQuery,
	);
	for (let k = 0; k < 40; k++) {
		const angle = (k / 40) * 2 * math.pi;
		block(
			map,
			new Vector3(8, 0.1, 0.5),
			new CFrame(Vector3.zero)
				.mul(CFrame.Angles(0, angle, 0))
				.mul(new CFrame(0, RING_HEIGHT + 0.05, -RING_RADIUS)),
			LaneMark,
			"LaneMark",
		);
	}

	// Ramps between the courtyard and the ring.
	for (let k = 0; k < 8; k++) {
		const angle = (k * math.pi) / 4;
		ramp(
			map,
			onCircle(Vector3.zero, 115, angle),
			onCircle(new Vector3(0, RING_HEIGHT, 0), RING_RADIUS - RING_WIDTH / 2 + 0.5, angle),
			12,
			Sandstone,
		);
	}

	// Obelisks for cover between the fortress and the ring.
	for (let k = 0; k < 8; k++) {
		const angle = math.pi / 8 + (k * math.pi) / 4;
		const base = onCircle(Vector3.zero, 108, angle);
		slab(map, base.add(new Vector3(0, 34, 0)), new Vector3(8, 34, 8), DarkConcrete, "Obelisk");
		slab(map, base.add(new Vector3(0, 34.6, 0)), new Vector3(8.4, 0.6, 8.4), Copper, "ObeliskCap");
	}
}

// Desert floor and mesas on the horizon. Scenery only: not collidable, not hit by shots.
function buildBackdrop(map: Model) {
	noQuery(slab(map, new Vector3(0, -2, 0), new Vector3(2000, 2, 2000), { ...Backdrop, collide: true }, "Desert"));
	const mesas: [number, number, number][] = [
		[0.3, 520, 140],
		[1.4, 640, 220],
		[2.3, 560, 170],
		[3.4, 700, 260],
		[4.4, 600, 150],
		[5.4, 680, 200],
	];
	for (const [angle, distance, height] of mesas) {
		const base = onCircle(Vector3.zero, distance, angle);
		noQuery(
			slab(
				map,
				base.add(new Vector3(0, height, 0)),
				new Vector3(height * 1.2, height + 2, height),
				Backdrop,
				"Mesa",
			),
		);
	}
}

export const Bastion: MapBuilder = {
	id: "Bastion",
	build(map) {
		setMapInfo(map, {
			name: "Bastion",
			tagline: "Circle the fortress. Breach the floors.",
			modes: ["Deathmatch", "TeamDeathmatch"],
			gravity: 196.2,
			killHeight: -20,
			themeColor: Color3.fromRGB(255, 140, 40),
		});

		buildGrounds(map);
		buildFortress(map);
		buildBackdrop(map);

		for (let k = 0; k < 8; k++) {
			const angle = math.pi / 8 + (k * math.pi) / 4;
			spawnMarker(map, onCircle(new Vector3(0, RING_HEIGHT, 0), RING_RADIUS, angle), Vector3.zero);
		}
		for (const x of [-50, 50]) {
			for (const z of [-50, 50]) {
				spawnMarker(map, new Vector3(x, 0, z), Vector3.zero);
			}
		}
		for (const z of [-40, 40]) {
			spawnMarker(map, new Vector3(0, LEVELS[2], z), Vector3.zero);
		}

		setMapLighting(map, {
			clockTime: 17.2,
			brightness: 2.5,
			ambient: Color3.fromRGB(120, 100, 85),
			outdoorAmbient: Color3.fromRGB(150, 125, 100),
			atmosphere: {
				density: 0.3,
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
