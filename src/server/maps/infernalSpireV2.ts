// Infernal Spire, redesigned with the map preview loop (docs/MAPPING.md) to cut its openness:
// the original measured 72% openness and 99.6% spawn exposure against targets of ~25% and
// under 20%. Same citadel over a lava lake, with two changes: players spawn in rooms recessed
// into the rampart, and basalt columns rise from the lava to break sightlines across it.
// Dev-only until a playtest decides between this and the original (infernalSpire.ts).

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
import { MapBuilder } from "./types";

const Basalt: Style = { color: Color3.fromRGB(38, 32, 32), material: Enum.Material.Basalt };
const Obsidian: Style = { color: Color3.fromRGB(26, 18, 26), material: Enum.Material.Slate };
const Iron: Style = { color: Color3.fromRGB(72, 56, 50), material: Enum.Material.CorrodedMetal };
const Bone: Style = { color: Color3.fromRGB(215, 200, 170), material: Enum.Material.Limestone };
const Lava: Style = { color: Color3.fromRGB(255, 100, 30), material: Enum.Material.CrackedLava, collide: false };
const Rune: Style = { color: Color3.fromRGB(255, 60, 20), material: Enum.Material.Neon, collide: false };
const Vent: Style = { color: Color3.fromRGB(255, 120, 0), material: Enum.Material.Neon };
const Barrier: Style = { color: new Color3(), transparency: 1 };

const FIRE = Color3.fromRGB(255, 120, 30);
const EMBER = Color3.fromRGB(120, 20, 10);

const CENTER = Vector3.zero;
const QUARTER = math.pi / 2;
const EIGHTH = math.pi / 4;

const RING_HEIGHT = 12;
const RING_RADIUS = 108;
const RING_WIDTH = 20;
const RAMPART_RADIUS = 120;
const RAMPART_TOP = 40;
const TIER_TOPS = [26, 44, 60];
const TIER_DIAMETERS = [64, 40, 22];
const ISLAND_RADIUS = 68;
const ISLAND_HEIGHT = 30;

// The rampart is built in this many segments; doorways replace some of them.
const RAMPART_SEGMENTS = 48;
// Spawn rooms behind the rampart, one behind each doorway, between the bridges and the pads.
const DOOR_ANGLES = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => EIGHTH / 2 + i * EIGHTH);
const DOOR_HEIGHT = 12;
const ROOM_DEPTH = 18;
const ROOM_WIDTH = 28;
const ROOM_HEIGHT = 16;
// A screen wall just inside each doorway hides the spawns from the ring and splits the way
// out into two exits, one each side.
const SCREEN_WIDTH = 6;
// Basalt columns in the lava, one in front of each doorway, screening the spawn rooms and
// breaking sightlines across the lake.
const COLUMN_RADIUS = 86;
const COLUMN_WIDTH = 24;
const COLUMN_TOP = 56;
const BARRIER_RADIUS = RAMPART_RADIUS + ROOM_DEPTH + 6;

function at(radius: number, angle: number, height: number): Vector3 {
	return onCircle(CENTER, radius, angle).add(new Vector3(0, height, 0));
}

// A frame at `radius` and `angle` around the ring. Its +Z axis points toward the center and -Z
// away from it.
function ringFrame(radius: number, angle: number, height: number): CFrame {
	return new CFrame(CENTER).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, height, -radius));
}

function brazier(parent: Instance, base: Vector3) {
	cylinder(parent, base.add(new Vector3(0, 4, 0)), 4, 2.5, Iron, "Brazier");
	const bowl = cylinder(parent, base.add(new Vector3(0, 5, 0)), 1, 5, Iron, "BrazierBowl");
	flames(bowl, FIRE, EMBER, 7);
	pointLight(bowl, FIRE, 40, 2);
}

function isDoorway(segmentAngle: number): boolean {
	return DOOR_ANGLES.some((door) => math.abs(((segmentAngle - door + math.pi) % (2 * math.pi)) - math.pi) < 0.01);
}

// The outer wall, with a doorway into a spawn room at each door angle.
function buildRampart(arena: Model) {
	ring(arena, new Vector3(0, RING_HEIGHT, 0), RING_RADIUS, RING_WIDTH, 4, 24, Basalt, "Walkway");

	const segmentLength = 2 * (RAMPART_RADIUS + 2) * math.tan(math.pi / RAMPART_SEGMENTS) + 0.2;
	const wallHeight = RAMPART_TOP - RING_HEIGHT;
	for (let i = 0; i < RAMPART_SEGMENTS; i++) {
		const angle = EIGHTH / 2 + (i / RAMPART_SEGMENTS) * 2 * math.pi;
		if (isDoorway(angle)) {
			// Lintel over the doorway.
			const lintelHeight = wallHeight - DOOR_HEIGHT;
			block(
				arena,
				new Vector3(segmentLength, lintelHeight, 4),
				ringFrame(RAMPART_RADIUS, angle, RAMPART_TOP - lintelHeight / 2),
				Basalt,
				"Lintel",
			);
		} else {
			block(
				arena,
				new Vector3(segmentLength, wallHeight, 4),
				ringFrame(RAMPART_RADIUS, angle, RING_HEIGHT + wallHeight / 2),
				Basalt,
				"Rampart",
			);
		}
	}

	const barrier = ring(arena, new Vector3(0, 340, 0), BARRIER_RADIUS, 4, 300, 24, Barrier, "Barrier");
	barrier.forEach((part) => (part.CanQuery = false));

	for (let i = 0; i < 48; i += 2) {
		const angle = (i / 48) * 2 * math.pi;
		block(arena, new Vector3(6, 5, 4), ringFrame(RAMPART_RADIUS, angle, RAMPART_TOP + 2.5), Basalt, "Merlon");
	}
	for (let i = 0; i < 12; i++) {
		const angle = (i / 12) * 2 * math.pi;
		slab(arena, at(RING_RADIUS, angle, RING_HEIGHT - 4), new Vector3(8, RING_HEIGHT, 8), Obsidian, "Support");
	}
	// Braziers mark the pads, between the doorways.
	for (let i = 0; i < 4; i++) {
		const angle = EIGHTH + i * QUARTER;
		brazier(arena, at(RING_RADIUS + 6, angle + 0.06, RING_HEIGHT));
		brazier(arena, at(RING_RADIUS + 6, angle - 0.06, RING_HEIGHT));
	}
}

// A small room behind each doorway: floor, roof, side walls and a back wall on the outer side.
// Two spawns stand at the back facing the center, so a spawning player sees the doorway and
// the column beyond it.
function buildSpawnRooms(arena: Model) {
	const middle = RAMPART_RADIUS + 2 + ROOM_DEPTH / 2;
	for (const angle of DOOR_ANGLES) {
		const frame = ringFrame(middle, angle, 0);
		const inRoom = (x: number, y: number, z: number) => frame.mul(new CFrame(x, y, z));
		block(arena, new Vector3(ROOM_WIDTH, 4, ROOM_DEPTH), inRoom(0, RING_HEIGHT - 2, 0), Basalt, "RoomFloor");
		block(
			arena,
			new Vector3(ROOM_WIDTH, 3, ROOM_DEPTH),
			inRoom(0, RING_HEIGHT + ROOM_HEIGHT + 1.5, 0),
			Obsidian,
			"RoomRoof",
		);
		for (const side of [-1, 1]) {
			block(
				arena,
				new Vector3(2, ROOM_HEIGHT, ROOM_DEPTH),
				inRoom((side * (ROOM_WIDTH - 2)) / 2, RING_HEIGHT + ROOM_HEIGHT / 2, 0),
				Basalt,
				"RoomWall",
			);
		}
		block(
			arena,
			new Vector3(ROOM_WIDTH, ROOM_HEIGHT, 2),
			inRoom(0, RING_HEIGHT + ROOM_HEIGHT / 2, -(ROOM_DEPTH / 2 - 1)),
			Basalt,
			"RoomWall",
		);
		block(
			arena,
			new Vector3(SCREEN_WIDTH, ROOM_HEIGHT, 2),
			inRoom(0, RING_HEIGHT + ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 6),
			Basalt,
			"Screen",
		);
		const torch = block(
			arena,
			new Vector3(1, 1, 1),
			inRoom(0, RING_HEIGHT + ROOM_HEIGHT - 2, -(ROOM_DEPTH / 2 - 2.5)),
			Rune,
			"Torch",
		);
		pointLight(torch, FIRE, 24, 1.5);

		for (const side of [-1, 1]) {
			const spot = inRoom(side * 5, RING_HEIGHT, -(ROOM_DEPTH / 2 - 4)).Position;
			spawnMarker(arena, spot, CENTER);
		}
	}
}

// Columns of basalt rising out of the lava in front of each doorway.
function buildColumns(arena: Model) {
	for (const angle of DOOR_ANGLES) {
		block(
			arena,
			new Vector3(COLUMN_WIDTH, COLUMN_TOP, COLUMN_WIDTH),
			ringFrame(COLUMN_RADIUS, angle, COLUMN_TOP / 2),
			Obsidian,
			"Column",
		);
		// A cap of bone, so the columns read as part of the citadel rather than bare rock.
		block(
			arena,
			new Vector3(COLUMN_WIDTH + 2, 2, COLUMN_WIDTH + 2),
			ringFrame(COLUMN_RADIUS, angle, COLUMN_TOP + 1),
			Bone,
			"ColumnCap",
		);
	}
}

function buildSpire(arena: Model) {
	cylinder(arena, new Vector3(0, TIER_TOPS[2], 0), TIER_TOPS[2], 12, Obsidian, "SpireCore");
	TIER_TOPS.forEach((top, tier) => {
		cylinder(arena, new Vector3(0, top, 0), 4, TIER_DIAMETERS[tier], Basalt, `Tier${tier + 1}`);
		ring(arena, new Vector3(0, top + 0.15, 0), TIER_DIAMETERS[tier] / 2 - 2, 1, 0.3, 24, Rune, "Rune");
	});

	for (let i = 0; i < 4; i++) {
		const angle = EIGHTH + i * QUARTER;
		slab(arena, at(24, angle, TIER_TOPS[0] - 4), new Vector3(5, TIER_TOPS[0] - 4, 5), Obsidian, "Buttress");
	}

	// Bone fangs ring the crown.
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * 2 * math.pi;
		const center = at(TIER_DIAMETERS[2] / 2 - 1, angle, TIER_TOPS[2] + 3.5);
		const outward = at(TIER_DIAMETERS[2] / 2, angle, TIER_TOPS[2] + 3.5);
		wedge(arena, new Vector3(1.5, 7, 3), CFrame.lookAt(center, outward), Bone, "Fang");
	}
	const altar = cylinder(arena, new Vector3(0, TIER_TOPS[2] + 1, 0), 1, 6, Iron, "Altar");
	flames(altar, FIRE, EMBER, 14);
	pointLight(altar, FIRE, 60, 3);

	// Iron bridges from the walkway up to the first tier.
	for (let i = 0; i < 4; i++) {
		const angle = i * QUARTER;
		plank(
			arena,
			at(RING_RADIUS - RING_WIDTH / 2 + 1, angle, RING_HEIGHT),
			at(TIER_DIAMETERS[0] / 2 - 1, angle, TIER_TOPS[0]),
			10,
			1.5,
			Iron,
		);
	}

	// Vents climb the spire: tier 1 to 2, tier 2 to the crown.
	for (const angle of [0, math.pi]) {
		jumpPad(arena, at(28, angle, TIER_TOPS[0]), at(12, angle, TIER_TOPS[1]), 10, Vent);
	}
	for (const angle of [QUARTER, QUARTER * 3]) {
		jumpPad(arena, at(15, angle, TIER_TOPS[1]), at(5, angle, TIER_TOPS[2]), 10, Vent);
	}
}

function buildIslands(arena: Model) {
	for (let i = 0; i < 4; i++) {
		const angle = EIGHTH + i * QUARTER;
		const center = at(ISLAND_RADIUS, angle, ISLAND_HEIGHT);
		slab(arena, center, new Vector3(18, 3, 18), Basalt, "Island");
		cylinder(arena, center.sub(new Vector3(0, 3, 0)), ISLAND_HEIGHT - 3, 4, Obsidian, "IslandPillar");
		brazier(arena, at(ISLAND_RADIUS + 6, angle, ISLAND_HEIGHT));

		// Narrow bone bridge from the island up to the second tier.
		plank(
			arena,
			at(ISLAND_RADIUS - 8, angle, ISLAND_HEIGHT),
			at(TIER_DIAMETERS[1] / 2 - 1, angle, TIER_TOPS[1]),
			5,
			1,
			Bone,
			"BoneBridge",
		);

		jumpPad(arena, at(RING_RADIUS - 4, angle, RING_HEIGHT), center, 8, Vent);
	}
}

export const InfernalSpireV2: MapBuilder = {
	id: "InfernalSpireV2",
	build(arena) {
		setMapInfo(arena, {
			name: "Infernal Spire (redesign)",
			tagline: "Climb the citadel. Don't touch the lava.",
			modes: ["Deathmatch", "TeamDeathmatch", "Domination"],
			gravity: 196.2,
			killHeight: -2,
			themeColor: Color3.fromRGB(255, 100, 30),
			devOnly: true,
		});

		// Domination points, on the center line so neither side is closer.
		controlPointMarker(arena, new Vector3(-22, TIER_TOPS[0], 0), "A", 8, "Domination");
		controlPointMarker(arena, new Vector3(0, TIER_TOPS[2], 0), "B", 8, "Domination");
		controlPointMarker(arena, new Vector3(22, TIER_TOPS[0], 0), "C", 8, "Domination");

		// Perk orbs: strong perks at contested spots, team-side perks in mirrored pairs.
		perkMarker(arena, new Vector3(0, TIER_TOPS[2] + 1, 0), "Overcharge");
		perkMarker(arena, new Vector3(0, TIER_TOPS[1], 12), "Radar");
		perkMarker(arena, at(RING_RADIUS, QUARTER, RING_HEIGHT), "SuperJump");
		perkMarker(arena, at(RING_RADIUS, QUARTER * 3, RING_HEIGHT), "SuperJump");
		perkMarker(arena, at(ISLAND_RADIUS + 3, EIGHTH, ISLAND_HEIGHT), "Shield");
		perkMarker(arena, at(ISLAND_RADIUS + 3, EIGHTH * 5, ISLAND_HEIGHT), "Shield");
		hazard(slab(arena, Vector3.zero, new Vector3(340, 4, 340), Lava, "Lava"));
		buildRampart(arena);
		buildSpawnRooms(arena);
		buildColumns(arena);
		buildSpire(arena);
		buildIslands(arena);

		setMapLighting(arena, {
			clockTime: 0,
			brightness: 1,
			ambient: Color3.fromRGB(70, 30, 25),
			outdoorAmbient: Color3.fromRGB(110, 45, 30),
			atmosphere: {
				density: 0.4,
				color: Color3.fromRGB(130, 45, 25),
				decay: Color3.fromRGB(70, 15, 5),
				glare: 0,
				haze: 2.5,
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
