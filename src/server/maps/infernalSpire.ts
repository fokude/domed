// A hellish citadel over a lava lake, in the spirit of Doom. An octagonal hall of rust-red brick,
// open to the sky: a wide basalt ring runs all the way round the lake, the speed runway, and four
// iron bridges cross the lava to a tiered obsidian spire in the middle. Basalt columns rise out
// of the lava in front of the spawn rooms, and raised bastions fill the hall's corners. Every
// tier is a rocket jump above the last (docs/MAP_DESIGN.md). Players spawn in rooms behind the
// north and south walls; Red's is north (-Z), Blue's south (+Z). Falling means lava. Earlier
// versions are recorded in docs/MAP_DESIGN.md.
//
// Heights: lava -6, ring 0, bastions and spire base 10, columns and spire middle 25, crown 40,
// walls 60.

import {
	block,
	controlPointMarker,
	cylinder,
	flames,
	hazard,
	jumpPad,
	onCircle,
	perkMarker,
	plank,
	pointLight,
	ring,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
	wedge,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const Basalt: Style = { color: Color3.fromRGB(58, 48, 46), material: Enum.Material.Basalt };
const Obsidian: Style = { color: Color3.fromRGB(40, 30, 40), material: Enum.Material.Slate };
const Iron: Style = { color: Color3.fromRGB(86, 66, 58), material: Enum.Material.CorrodedMetal };
// Braziers and the altar are seen, never bumped into.
const IronDeco: Style = { ...Iron, collide: false };
const Bone: Style = { color: Color3.fromRGB(215, 200, 170), material: Enum.Material.Limestone };
const Lava: Style = { color: Color3.fromRGB(255, 100, 30), material: Enum.Material.CrackedLava, collide: false };
const Rune: Style = {
	color: Color3.fromRGB(255, 60, 20),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Vent: Style = { color: Color3.fromRGB(255, 120, 0), material: Enum.Material.Neon };
const Barrier: Style = { color: new Color3(), transparency: 1 };
const Hellbrick: Style = { color: Color3.fromRGB(120, 44, 32), material: Enum.Material.Brick };
const Grating: Style = { color: Color3.fromRGB(70, 58, 52), material: Enum.Material.DiamondPlate };

const FIRE = Color3.fromRGB(255, 120, 30);
const EMBER = Color3.fromRGB(120, 20, 10);

const CENTER = Vector3.zero;
const QUARTER = math.pi / 2;
const EIGHTH = math.pi / 4;
const CARDINALS = [0, 1, 2, 3].map((i) => i * QUARTER);
const DIAGONALS = CARDINALS.map((angle) => angle + EIGHTH);
const CORNERS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => EIGHTH / 2 + i * EIGHTH);

const LAVA = -6;
const BASTION = 10;
const COLUMN = 25;
const TIER_TOPS = [10, 25, 40];
const TIER_DIAMETERS = [80, 44, 22];
const WALL_HEIGHT = 60;

// The hall is an octagon: wall sides face the cardinals and diagonals, this far from the center.
const APOTHEM = 170;
const SIDE_LENGTH = 2 * APOTHEM * math.tan(math.pi / 8);
// The ring floor runs from the lava's edge to the walls.
const RING_INNER = 105;
const BRIDGE_WIDTH = 30;
const COLUMN_RADIUS = 80;
const COLUMN_WIDTH = 26;

// Spawn rooms behind the north and south walls, with two doors each. Door offsets are along the wall.
const DOORS: [number, number][] = [
	[-50, -30],
	[30, 50],
];
const DOOR_HEIGHT = 18;
const ROOM_DEPTH = 40;
const ROOM_HEIGHT = 24;
const ROOM_HALF_WIDTH = SIDE_LENGTH / 2;

function at(radius: number, angle: number, height: number): Vector3 {
	return onCircle(CENTER, radius, angle).add(new Vector3(0, height, 0));
}

// A frame at `radius` and `angle` around the hall. Its +Z axis points toward the center, -Z away
// from it, and X runs along the wall.
function ringFrame(radius: number, angle: number, height: number): CFrame {
	return new CFrame(CENTER).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, height, -radius));
}

function brazier(parent: Instance, base: Vector3) {
	cylinder(parent, base.add(new Vector3(0, 4, 0)), 4, 2.5, IronDeco, "Brazier");
	const bowl = cylinder(parent, base.add(new Vector3(0, 5, 0)), 1, 5, IronDeco, "BrazierBowl");
	flames(bowl, FIRE, EMBER, 7);
	pointLight(bowl, FIRE, 40, 2);
}

// One straight side of the octagon at `angle`, with a doorway in each of `doors` (offsets along
// the wall), closed above by lintels.
function wallSide(arena: Model, angle: number, doors: [number, number][]) {
	const half = SIDE_LENGTH / 2 + 2;
	const cuts = [-half];
	for (const [a, b] of doors) cuts.push(a, b);
	cuts.push(half);
	for (let k = 0; k < cuts.size(); k += 2) {
		const [from, to] = [cuts[k], cuts[k + 1]];
		block(
			arena,
			new Vector3(to - from, WALL_HEIGHT, 4),
			ringFrame(APOTHEM, angle, WALL_HEIGHT / 2).mul(new CFrame((from + to) / 2, 0, 0)),
			Hellbrick,
			"Wall",
		);
	}
	for (const [a, b] of doors) {
		const height = WALL_HEIGHT - DOOR_HEIGHT;
		block(
			arena,
			new Vector3(b - a, height, 4),
			ringFrame(APOTHEM, angle, DOOR_HEIGHT + height / 2).mul(new CFrame((a + b) / 2, 0, 0)),
			Hellbrick,
			"Lintel",
		);
	}
	// Merlons along the top: out of reach, they give the walls a citadel's skyline.
	for (let x = -half + 6; x < half - 3; x += 12) {
		block(
			arena,
			new Vector3(6, 5, 4),
			ringFrame(APOTHEM, angle, WALL_HEIGHT + 2.5).mul(new CFrame(x, 0, 0)),
			Basalt,
			"Merlon",
		);
	}
	// A rune strip along each wall at head height, so the walls read at speed.
	block(arena, new Vector3(SIDE_LENGTH - 10, 1, 0.6), ringFrame(APOTHEM - 2.3, angle, 30), Rune, "WallRune");
}

// The ring floor, the hall's walls, and the lip along the lava's edge (open at each bridge).
function buildHall(arena: Model) {
	hazard(slab(arena, new Vector3(0, LAVA, 0), new Vector3(250, 4, 250), Lava, "Lava"));
	const width = APOTHEM + 2 - RING_INNER;
	ring(arena, CENTER, RING_INNER + width / 2, width, 4, 8, Basalt, "RingFloor");

	for (const angle of [0, 2 * QUARTER]) wallSide(arena, angle, DOORS);
	for (const angle of [QUARTER, 3 * QUARTER, ...DIAGONALS]) wallSide(arena, angle, []);
	// Invisible barrier above the walls, so nobody rocket jumps out of the hall.
	ring(arena, new Vector3(0, 300, 0), APOTHEM, 4, 300 - WALL_HEIGHT, 8, Barrier, "Barrier").forEach(
		(part) => (part.CanQuery = false),
	);

	const lipLength = 2 * RING_INNER * math.tan(math.pi / 8);
	for (const angle of CARDINALS) {
		block(arena, new Vector3(lipLength, 2, 2), ringFrame(RING_INNER + 1, angle, 1), Iron, "LavaLip");
	}
	for (const angle of DIAGONALS) {
		const piece = (lipLength - BRIDGE_WIDTH) / 2;
		for (const side of [-1, 1]) {
			block(
				arena,
				new Vector3(piece, 2, 2),
				ringFrame(RING_INNER + 1, angle, 1).mul(new CFrame((side * (BRIDGE_WIDTH + piece)) / 2, 0, 0)),
				Iron,
				"LavaLip",
			);
		}
	}
}

// Raised basalt bastions filling the corners of the hall: cover on the ring and the first step
// up, a double jump or rocket jump from the floor. They leave the ring 40 studs clear.
function buildBastions(arena: Model) {
	for (const angle of CORNERS) {
		block(
			arena,
			new Vector3(40, BASTION - LAVA, 22),
			ringFrame(166, angle, (BASTION + LAVA) / 2),
			Obsidian,
			"Bastion",
		);
		block(arena, new Vector3(38, 0.4, 0.6), ringFrame(155.2, angle, BASTION + 0.2), Rune, "BastionEdge");
		brazier(arena, ringFrame(172, angle, BASTION).Position);
	}
}

// A room behind the north or south wall: four spawns at the back, two more further out, all behind a
// baffle wall inside each door so the hall can't see in.
function buildSpawnRoom(arena: Model, angle: number, team: "Red" | "Blue") {
	const room = (y: number, x: number, out: number) => ringFrame(APOTHEM, angle, y).mul(new CFrame(x, 0, -out));
	const width = ROOM_HALF_WIDTH * 2 + 4;
	block(arena, new Vector3(width, 4, ROOM_DEPTH + 4), room(-2, 0, ROOM_DEPTH / 2), Basalt, "RoomFloor");
	// A steep gabled roof: too steep to stand on, so it isn't counted as floor.
	const rise = 25;
	const half = ROOM_DEPTH / 2 + 2;
	const roof = new Vector3(width, rise, half);
	wedge(
		arena,
		roof,
		room(ROOM_HEIGHT + rise / 2, 0, half / 2).mul(CFrame.Angles(0, math.pi, 0)),
		Obsidian,
		"RoomRoof",
	);
	wedge(arena, roof, room(ROOM_HEIGHT + rise / 2, 0, (half * 3) / 2), Obsidian, "RoomRoof");
	block(arena, new Vector3(width, ROOM_HEIGHT, 2), room(ROOM_HEIGHT / 2, 0, ROOM_DEPTH + 1), Hellbrick, "RoomWall");
	for (const side of [-1, 1]) {
		block(
			arena,
			new Vector3(2, ROOM_HEIGHT, ROOM_DEPTH + 4),
			room(ROOM_HEIGHT / 2, side * (ROOM_HALF_WIDTH + 1), ROOM_DEPTH / 2),
			Hellbrick,
			"RoomWall",
		);
	}
	for (const [a, b] of DOORS) {
		block(
			arena,
			new Vector3(b - a + 20, DOOR_HEIGHT, 2),
			room(DOOR_HEIGHT / 2, (a + b) / 2, 14),
			Basalt,
			"DoorBaffle",
		);
	}
	for (const x of [-50, 0, 50]) {
		const torch = block(arena, new Vector3(1, 1, 1), room(ROOM_HEIGHT - 3, x, ROOM_DEPTH - 2), Rune, "Torch");
		pointLight(torch, FIRE, 36, 1.4);
	}

	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(arena, room(0, x, ROOM_DEPTH - 4).Position, room(0, x > 0 ? 40 : -40, 0).Position, team);
	}
	for (const x of [-55, 55]) {
		spawnMarker(arena, room(0, x, ROOM_DEPTH - 4).Position, room(0, x > 0 ? 40 : -40, 0).Position);
	}
}

// Basalt columns rising from the lava in front of each spawn room, reached by vents on the ring.
// They break the sightlines across the lake, and a bone bridge runs from each to the spire.
function buildColumns(arena: Model) {
	for (const angle of CARDINALS) {
		block(
			arena,
			new Vector3(COLUMN_WIDTH, COLUMN - LAVA, COLUMN_WIDTH),
			ringFrame(COLUMN_RADIUS, angle, (COLUMN + LAVA) / 2),
			Obsidian,
			"Column",
		);
		block(
			arena,
			new Vector3(COLUMN_WIDTH + 2, 2, COLUMN_WIDTH + 2),
			ringFrame(COLUMN_RADIUS, angle, COLUMN - 1),
			Bone,
			"ColumnCap",
		);
		jumpPad(arena, at(128, angle, 0), at(COLUMN_RADIUS + 4, angle, COLUMN), 8, Vent);
		plank(
			arena,
			at(COLUMN_RADIUS - COLUMN_WIDTH / 2, angle, COLUMN),
			at(TIER_DIAMETERS[1] / 2 - 1, angle, COLUMN),
			8,
			1,
			Bone,
			"BoneBridge",
		);
	}
}

// The spire: three tiers, each a rocket jump above the last, with vents climbing between them.
// Iron bridges cross the lava from the ring to the first tier.
function buildSpire(arena: Model) {
	cylinder(arena, new Vector3(0, TIER_TOPS[2], 0), TIER_TOPS[2] - LAVA, 12, Obsidian, "SpireCore");
	TIER_TOPS.forEach((top, tier) => {
		const height = top - (tier === 0 ? LAVA : TIER_TOPS[tier - 1]);
		cylinder(arena, new Vector3(0, top, 0), height, TIER_DIAMETERS[tier], Basalt, `Tier${tier + 1}`);
		ring(arena, new Vector3(0, top + 0.15, 0), TIER_DIAMETERS[tier] / 2 - 2, 1, 0.3, 24, Rune, "Rune");
	});
	const altar = cylinder(arena, new Vector3(0, TIER_TOPS[2] + 1, 0), 1, 6, IronDeco, "Altar");
	flames(altar, FIRE, EMBER, 14);
	pointLight(altar, FIRE, 60, 3);

	for (const angle of DIAGONALS) {
		plank(
			arena,
			at(RING_INNER, angle, 0),
			at(TIER_DIAMETERS[0] / 2 - 2, angle, TIER_TOPS[0]),
			BRIDGE_WIDTH,
			2,
			Grating,
			"Bridge",
		);
	}

	for (const angle of DIAGONALS) {
		jumpPad(arena, at(32, angle, TIER_TOPS[0]), at(16, angle, TIER_TOPS[1]), 8, Vent);
	}
	for (const angle of [QUARTER, 3 * QUARTER]) {
		jumpPad(arena, at(17, angle, TIER_TOPS[1]), at(5, angle, TIER_TOPS[2]), 8, Vent);
	}
}

export const InfernalSpire: MapBuilder = {
	id: "InfernalSpire",
	build(arena) {
		setMapInfo(arena, {
			name: "Infernal Spire",
			tagline: "Climb the citadel. Don't touch the lava.",
			modes: ["Deathmatch", "TeamDeathmatch", "Domination"],
			gravity: 196.2,
			killHeight: -2,
			themeColor: Color3.fromRGB(255, 100, 30),
			// Music: heavy, driving metal in the spirit of Doom. Pick a licensed track from the
			// Creator Store and set it here as "rbxassetid://<id>" (see docs/FEEDBACK.md).
			music: "",
		});

		buildHall(arena);
		buildBastions(arena);
		buildSpawnRoom(arena, 0, "Red");
		buildSpawnRoom(arena, 2 * QUARTER, "Blue");
		buildColumns(arena);
		buildSpire(arena);
		// The tournament's crowd floats above the walls, looking down into the citadel.
		spectatorRing(arena, CENTER, 260, 80, Color3.fromRGB(255, 100, 30));

		// Domination points on the east-west line, so neither team is closer: the west column,
		// the crown, the east column.
		controlPointMarker(arena, at(COLUMN_RADIUS, QUARTER, COLUMN), "A", 10, "Domination");
		controlPointMarker(arena, new Vector3(0, TIER_TOPS[2], 0), "B", 9, "Domination");
		controlPointMarker(arena, at(COLUMN_RADIUS, 3 * QUARTER, COLUMN), "C", 10, "Domination");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(arena, new Vector3(0, TIER_TOPS[2], 0), "Overcharge");
		perkMarker(arena, new Vector3(0, TIER_TOPS[1], 14), "Radar");
		perkMarker(arena, at(140, QUARTER, 0), "SuperJump");
		perkMarker(arena, at(140, 3 * QUARTER, 0), "SuperJump");
		perkMarker(arena, ringFrame(162, CORNERS[2], BASTION).Position, "Shield");
		perkMarker(arena, ringFrame(162, CORNERS[5], BASTION).Position, "Shield");

		setMapLighting(arena, {
			clockTime: 0,
			brightness: 2,
			ambient: Color3.fromRGB(150, 105, 95),
			outdoorAmbient: Color3.fromRGB(175, 120, 100),
			atmosphere: {
				density: 0.25,
				color: Color3.fromRGB(130, 45, 25),
				decay: Color3.fromRGB(70, 15, 5),
				glare: 0,
				haze: 1,
			},
			bloom: { intensity: 0.8, size: 24, threshold: 0.95 },
			colorCorrection: {
				tint: Color3.fromRGB(255, 228, 218),
				contrast: 0.15,
				saturation: 0.1,
				brightness: 0,
			},
		});
	},
};
