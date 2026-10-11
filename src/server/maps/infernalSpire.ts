// A ruined citadel over a lava lake. A rampart ring encloses a tiered obsidian spire,
// with floating basalt islands between them. Falling means lava.

import {
	block,
	cylinder,
	flames,
	hazard,
	jumpPad,
	onCircle,
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

const RING_HEIGHT = 12;
const RING_RADIUS = 108;
const RING_WIDTH = 20;
const RAMPART_RADIUS = 120;
const RAMPART_TOP = 40;
const TIER_TOPS = [26, 44, 60];
const TIER_DIAMETERS = [64, 40, 22];
const ISLAND_RADIUS = 68;
const ISLAND_HEIGHT = 30;

const CENTER = Vector3.zero;
const QUARTER = math.pi / 2;
const EIGHTH = math.pi / 4;

function at(radius: number, angle: number, height: number): Vector3 {
	return onCircle(CENTER, radius, angle).add(new Vector3(0, height, 0));
}

function brazier(parent: Instance, base: Vector3) {
	cylinder(parent, base.add(new Vector3(0, 4, 0)), 4, 2.5, Iron, "Brazier");
	const bowl = cylinder(parent, base.add(new Vector3(0, 5, 0)), 1, 5, Iron, "BrazierBowl");
	flames(bowl, FIRE, EMBER, 7);
	pointLight(bowl, FIRE, 40, 2);
}

function buildRampart(arena: Model) {
	ring(arena, new Vector3(0, RING_HEIGHT, 0), RING_RADIUS, RING_WIDTH, 4, 24, Basalt, "Walkway");
	ring(arena, new Vector3(0, RAMPART_TOP, 0), RAMPART_RADIUS, 4, RAMPART_TOP - RING_HEIGHT, 24, Basalt, "Rampart");
	const barrier = ring(arena, new Vector3(0, 340, 0), RAMPART_RADIUS + 3, 4, 300, 24, Barrier, "Barrier");
	barrier.forEach((part) => (part.CanQuery = false));

	for (let i = 0; i < 48; i += 2) {
		const angle = (i / 48) * 2 * math.pi;
		block(
			arena,
			new Vector3(6, 5, 4),
			new CFrame(CENTER).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, RAMPART_TOP + 2.5, -RAMPART_RADIUS)),
			Basalt,
			"Merlon",
		);
	}
	for (let i = 0; i < 12; i++) {
		const angle = (i / 12) * 2 * math.pi;
		slab(arena, at(RING_RADIUS, angle, RING_HEIGHT - 4), new Vector3(8, RING_HEIGHT, 8), Obsidian, "Support");
	}
	for (let i = 0; i < 8; i++) {
		brazier(arena, at(RING_RADIUS - 8, EIGHTH / 2 + i * EIGHTH, RING_HEIGHT));
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

	// Vents climb the spire: tier 1 to 2, tier 2 to the crown. They sit far enough out, with a
	// high enough arc, to clear the overhang of the tier above. Tier 1 vents sit where the iron
	// bridges land, so running off a bridge carries straight on upward.
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

export const InfernalSpire: MapBuilder = {
	id: "InfernalSpire",
	build(arena) {
		setMapInfo(arena, {
			name: "Infernal Spire",
			tagline: "Climb the citadel. Don't touch the lava.",
			modes: ["Deathmatch"],
			gravity: 196.2,
			killHeight: -2,
		});
		hazard(slab(arena, Vector3.zero, new Vector3(320, 4, 320), Lava, "Lava"));
		buildRampart(arena);
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

		for (let i = 0; i < 8; i++) {
			spawnMarker(arena, at(RING_RADIUS, EIGHTH / 2 + i * EIGHTH, RING_HEIGHT), CENTER);
		}
		for (let i = 0; i < 4; i++) {
			spawnMarker(arena, at(ISLAND_RADIUS - 4, EIGHTH + i * QUARTER, ISLAND_HEIGHT), CENTER);
		}
	},
};
