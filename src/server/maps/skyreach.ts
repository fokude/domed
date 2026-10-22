// Skyreach: floating marble ruins in the upper atmosphere of a gas giant at sunrise, the
// tournament's open-air arena, in the spirit of Quake 3's floating arenas (an archetype, not a
// copy). Two long promenades down the east and west sides are the speed runways; each team's
// island sits at one end, with a temple on its back edge where players spawn; wide bridges join
// the islands to the promenades in a loop. Over the open sky in the middle, four mid islands
// and the Crown, a contested platform reached by jump pads and rocket jumps. Falling means a
// long drop into the clouds. Lower gravity rewards air strafing.
//
// Heights: promenades 0, team islands 10, mid islands 28, the Crown 48. Red's island is north
// (-Z), Blue's south (+Z).

import {
	block,
	controlPointMarker,
	cylinder,
	jumpPad,
	perkMarker,
	plank,
	pointLight,
	scenery,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
} from "./kit";
import { spectatorRing } from "./spectators";
import { MapBuilder } from "./types";

const Marble: Style = { color: Color3.fromRGB(232, 226, 214), material: Enum.Material.Marble };
const Stone: Style = { color: Color3.fromRGB(150, 140, 160), material: Enum.Material.Slate };
const Gold: Style = { color: Color3.fromRGB(230, 180, 70), material: Enum.Material.Metal, reflectance: 0.2 };
const Glow: Style = {
	color: Color3.fromRGB(120, 230, 230),
	material: Enum.Material.Neon,
	collide: false,
	castShadow: false,
};
const Pad: Style = { color: Color3.fromRGB(120, 230, 230), material: Enum.Material.Neon };
const Cloud: Style = {
	color: Color3.fromRGB(255, 236, 222),
	material: Enum.Material.SmoothPlastic,
	transparency: 0.25,
	collide: false,
};
const Barrier: Style = { color: new Color3(), transparency: 1 };

const GLOW = Color3.fromRGB(120, 230, 230);

const PROMENADE = 0;
const ISLAND = 10;
const MID = 28;
const CROWN = 48;
// Promenades: 50 wide, 280 long.
const PROMENADE_X = 135;
const PROMENADE_HALF_WIDTH = 25;
const PROMENADE_HALF_LENGTH = 140;
// Team islands: 140 wide, from the front edge back to the temple's terrace.
const ISLAND_HALF_WIDTH = 70;
const ISLAND_FRONT = 110;
const ISLAND_BACK = 204;
// The temple on each team island's back edge: front wall, side walls and roof, open at the back
// onto a terrace, so its spawns can only be seen from behind it.
const TEMPLE_FRONT = 160;
const TEMPLE_BACK = 184;
const TEMPLE_HALF_WIDTH = 30;
const TEMPLE_HEIGHT = 16;
const BRIDGE_Z = 130;
const BRIDGE_WIDTH = 24;
const MID_X = 70;
const MID_Z = 55;
const MID_SIZE = 44;
const CROWN_DIAMETER = 44;

// An island: a marble top over a tapering rock underside, so it reads as floating.
function island(arena: Model, top: Vector3, size: Vector3, name: string) {
	slab(arena, top, size, Marble, name);
	slab(arena, top.sub(new Vector3(0, size.Y - 0.6, 0)), new Vector3(size.X + 1, 0.6, size.Z + 1), Gold, "Trim");
	for (let layer = 1; layer <= 3; layer++) {
		const shrink = layer * 0.22;
		slab(
			arena,
			top.sub(new Vector3(0, size.Y + (layer - 1) * 6, 0)),
			new Vector3(size.X * (1 - shrink), 6, size.Z * (1 - shrink)),
			Stone,
			"IslandRock",
		);
	}
}

// A low marble lip along an edge, so a missed strafe on a runway doesn't end in the void.
function lip(arena: Model, from: Vector3, to: Vector3) {
	const middle = from.add(to).div(2);
	const size = new Vector3(math.max(math.abs(to.X - from.X), 2), 2, math.max(math.abs(to.Z - from.Z), 2));
	slab(arena, middle.add(new Vector3(0, 2, 0)), size, Marble, "Lip");
}

// The east and west promenades, lipped on their outer edges and open to the sky on the inner.
function buildPromenades(arena: Model) {
	for (const side of [-1, 1]) {
		const x = side * PROMENADE_X;
		island(
			arena,
			new Vector3(x, PROMENADE, 0),
			new Vector3(PROMENADE_HALF_WIDTH * 2, 6, PROMENADE_HALF_LENGTH * 2),
			"Promenade",
		);
		const outer = x + side * (PROMENADE_HALF_WIDTH - 1);
		lip(
			arena,
			new Vector3(outer, PROMENADE, -PROMENADE_HALF_LENGTH),
			new Vector3(outer, PROMENADE, PROMENADE_HALF_LENGTH),
		);
		for (const z of [-PROMENADE_HALF_LENGTH + 1, PROMENADE_HALF_LENGTH - 1]) {
			lip(
				arena,
				new Vector3(x - PROMENADE_HALF_WIDTH, PROMENADE, z),
				new Vector3(x + PROMENADE_HALF_WIDTH, PROMENADE, z),
			);
		}
		// Gold columns along the outer lip: landmarks at speed, and nothing in the lane.
		for (const z of [-100, -50, 0, 50, 100]) {
			cylinder(arena, new Vector3(outer + side * 2, 24, z), 22, 3, Gold, "Column");
			const flame = block(arena, new Vector3(2, 2, 2), new CFrame(outer + side * 2, 25, z), Glow, "ColumnLight");
			pointLight(flame, GLOW, 30, 1);
		}
		// Pads from the promenade's middle up to the mid islands either side.
		for (const zSide of [-1, 1]) {
			jumpPad(
				arena,
				new Vector3(x - side * 12, PROMENADE, zSide * MID_Z),
				new Vector3(side * (MID_X + 6), MID, zSide * MID_Z),
				8,
				Pad,
			);
		}
	}
}

// A team's island: a wide front deck, the temple, the terrace behind it, and bridges down to
// both promenades.
function buildTeamIsland(arena: Model, sign: number, team: "Red" | "Blue") {
	const z = (distance: number) => sign * distance;
	const depth = ISLAND_BACK - ISLAND_FRONT;
	island(
		arena,
		new Vector3(0, ISLAND, z((ISLAND_FRONT + ISLAND_BACK) / 2)),
		new Vector3(ISLAND_HALF_WIDTH * 2, 6, depth),
		"TeamIsland",
	);

	// Lips on the back and sides, open where the bridges leave.
	lip(
		arena,
		new Vector3(-ISLAND_HALF_WIDTH, ISLAND, z(ISLAND_BACK - 1)),
		new Vector3(ISLAND_HALF_WIDTH, ISLAND, z(ISLAND_BACK - 1)),
	);
	for (const side of [-1, 1]) {
		const x = side * (ISLAND_HALF_WIDTH - 1);
		lip(arena, new Vector3(x, ISLAND, z(ISLAND_FRONT)), new Vector3(x, ISLAND, z(BRIDGE_Z - BRIDGE_WIDTH / 2)));
		lip(arena, new Vector3(x, ISLAND, z(BRIDGE_Z + BRIDGE_WIDTH / 2)), new Vector3(x, ISLAND, z(ISLAND_BACK)));
		plank(
			arena,
			new Vector3(side * (ISLAND_HALF_WIDTH - 2), ISLAND, z(BRIDGE_Z)),
			new Vector3(side * (PROMENADE_X - PROMENADE_HALF_WIDTH + 2), PROMENADE, z(BRIDGE_Z)),
			BRIDGE_WIDTH,
			2,
			Gold,
			"SkyBridge",
		);
		// Pads at the front corners, up to the mid islands.
		jumpPad(
			arena,
			new Vector3(side * 45, ISLAND, z(ISLAND_FRONT + 12)),
			new Vector3(side * MID_X, MID, z(MID_Z + 6)),
			8,
			Pad,
		);
	}

	// The temple.
	const templeMid = (TEMPLE_FRONT + TEMPLE_BACK) / 2;
	const templeDepth = TEMPLE_BACK - TEMPLE_FRONT;
	const wallTop = ISLAND + TEMPLE_HEIGHT;
	slab(
		arena,
		new Vector3(0, wallTop, z(TEMPLE_FRONT + 1)),
		new Vector3(TEMPLE_HALF_WIDTH * 2, TEMPLE_HEIGHT, 2),
		Marble,
		"TempleWall",
	);
	for (const side of [-1, 1]) {
		slab(
			arena,
			new Vector3(side * (TEMPLE_HALF_WIDTH - 1), wallTop, z(templeMid)),
			new Vector3(2, TEMPLE_HEIGHT, templeDepth),
			Marble,
			"TempleWall",
		);
		cylinder(
			arena,
			new Vector3(side * (TEMPLE_HALF_WIDTH - 1), wallTop, z(TEMPLE_BACK + 1)),
			TEMPLE_HEIGHT,
			3,
			Gold,
			"TempleColumn",
		);
	}
	slab(
		arena,
		new Vector3(0, wallTop + 2, z(templeMid)),
		new Vector3(TEMPLE_HALF_WIDTH * 2 + 4, 2, templeDepth + 4),
		Marble,
		"TempleRoof",
	);
	const light = block(arena, new Vector3(1, 1, 1), new CFrame(0, wallTop - 2, z(templeMid)), Glow, "TempleLight");
	pointLight(light, Color3.fromRGB(255, 220, 170), 30, 1.2);

	// Spawns face out of the open back, toward the terrace and the way round either side.
	for (const x of [-15, -5, 5, 15]) {
		spawnMarker(
			arena,
			new Vector3(x, ISLAND, z(TEMPLE_FRONT + 8)),
			new Vector3(x * 4, ISLAND, z(ISLAND_BACK)),
			team,
		);
	}
	for (const side of [-1, 1]) {
		spawnMarker(
			arena,
			new Vector3(side * 22, ISLAND, z(TEMPLE_FRONT + 14)),
			new Vector3(side * 60, ISLAND, z(ISLAND_BACK)),
		);
	}
}

// The mid islands over the open sky, each with a pad up to the Crown.
function buildMidIslands(arena: Model) {
	for (const xSide of [-1, 1]) {
		for (const zSide of [-1, 1]) {
			const top = new Vector3(xSide * MID_X, MID, zSide * MID_Z);
			island(arena, top, new Vector3(MID_SIZE, 5, MID_SIZE), "MidIsland");
			jumpPad(
				arena,
				top.add(new Vector3(-xSide * 12, 0, -zSide * 12)),
				new Vector3(xSide * 8, CROWN, zSide * 8),
				10,
				Pad,
			);
		}
	}
}

// The Crown: a round platform at the top, with a tall obelisk in the middle as the map's
// landmark. Fights circle it, and it blocks the sightline straight across the center.
function buildCrown(arena: Model) {
	cylinder(arena, new Vector3(0, CROWN, 0), 4, CROWN_DIAMETER, Marble, "Crown");
	cylinder(arena, new Vector3(0, CROWN - 4, 0), 10, CROWN_DIAMETER - 12, Stone, "CrownRock");
	cylinder(arena, new Vector3(0, CROWN - 14, 0), 14, CROWN_DIAMETER - 24, Stone, "CrownRock");
	block(
		arena,
		new Vector3(8, 26, 8),
		new CFrame(0, CROWN + 13, 0).mul(CFrame.Angles(0, math.pi / 4, 0)),
		Stone,
		"Obelisk",
	);
	const crest = block(
		arena,
		new Vector3(8.4, 2, 8.4),
		new CFrame(0, CROWN + 22, 0).mul(CFrame.Angles(0, math.pi / 4, 0)),
		Glow,
		"ObeliskCrest",
	);
	pointLight(crest, GLOW, 50, 2);
}

// Floating monoliths over the open sky between the Crown and the islands, breaking the
// sightlines across the middle without standing in any lane. Each slightly tilted, as if
// drifting.
function buildMonoliths(arena: Model) {
	const spots: [Vector3, number][] = [
		[new Vector3(-80, 22, 0), 0],
		[new Vector3(80, 22, 0), 0],
		[new Vector3(0, 22, -80), math.pi / 2],
		[new Vector3(0, 22, 80), math.pi / 2],
	];
	spots.forEach(([position, turn], i) => {
		const frame = new CFrame(position).mul(CFrame.Angles(0, turn, 0));
		block(
			arena,
			new Vector3(8, 44, 36),
			frame.mul(CFrame.Angles(0.06 * (i % 2 === 0 ? 1 : -1), 0, 0.08)),
			Stone,
			"Monolith",
		);
		const rune = block(arena, new Vector3(8.4, 28, 1.2), frame, Glow, "MonolithRune");
		pointLight(rune, GLOW, 24, 1);
	});
}

function buildSky(arena: Model) {
	// A sea of clouds far below; falling into it is the kill height.
	for (let i = 0; i < 10; i++) {
		const angle = (i / 10) * 2 * math.pi;
		const radius = 60 + (i % 3) * 70;
		const position = new Vector3(math.sin(angle) * radius, -60 - (i % 4) * 6, -math.cos(angle) * radius);
		scenery(slab(arena, position, new Vector3(140, 8, 100), Cloud, "Cloud"));
	}
	scenery(slab(arena, new Vector3(0, -90, 0), new Vector3(1200, 2, 1200), Cloud, "CloudSea"));
	// Invisible walls round the play space, so nobody rocket jumps away into the sky.
	for (const side of [-1, 1]) {
		scenery(block(arena, new Vector3(4, 300, 470), new CFrame(side * 200, 150, 0), Barrier, "Barrier"));
		scenery(block(arena, new Vector3(404, 300, 4), new CFrame(0, 150, side * 235), Barrier, "Barrier"));
	}
}

export const Skyreach: MapBuilder = {
	id: "Skyreach",
	build(arena) {
		setMapInfo(arena, {
			name: "Skyreach",
			tagline: "Islands in the sky. Mind the drop.",
			modes: ["Deathmatch", "TeamDeathmatch", "Domination"],
			gravity: 160,
			killHeight: -30,
			themeColor: Color3.fromRGB(120, 230, 230),
			// Music: soaring, bright electronic or orchestral. Pick a licensed Creator Store track
			// (see docs/FEEDBACK.md).
			music: "",
		});

		buildPromenades(arena);
		buildTeamIsland(arena, -1, "Red");
		buildTeamIsland(arena, 1, "Blue");
		buildMidIslands(arena);
		buildCrown(arena);
		buildMonoliths(arena);
		buildSky(arena);
		spectatorRing(arena, Vector3.zero, 320, 50, Color3.fromRGB(230, 180, 70));

		// Domination: the west promenade, the Crown, the east promenade; equally far from both
		// teams.
		controlPointMarker(arena, new Vector3(-PROMENADE_X, PROMENADE, 0), "A", 14, "Domination");
		controlPointMarker(arena, new Vector3(0, CROWN, 0), "B", 12, "Domination");
		controlPointMarker(arena, new Vector3(PROMENADE_X, PROMENADE, 0), "C", 14, "Domination");

		// Perks: Overcharge on the Crown; the rest in pairs placed point-symmetrically.
		perkMarker(arena, new Vector3(0, CROWN, 10), "Overcharge");
		perkMarker(arena, new Vector3(MID_X, MID, -MID_Z), "Shield");
		perkMarker(arena, new Vector3(-MID_X, MID, MID_Z), "Shield");
		perkMarker(arena, new Vector3(-MID_X, MID, -MID_Z), "Radar");
		perkMarker(arena, new Vector3(MID_X, MID, MID_Z), "Radar");
		perkMarker(arena, new Vector3(-PROMENADE_X, PROMENADE, 90), "SuperJump");
		perkMarker(arena, new Vector3(PROMENADE_X, PROMENADE, -90), "SuperJump");

		setMapLighting(arena, {
			clockTime: 6.4,
			brightness: 3,
			ambient: Color3.fromRGB(150, 130, 140),
			outdoorAmbient: Color3.fromRGB(190, 160, 150),
			atmosphere: {
				density: 0.3,
				color: Color3.fromRGB(255, 200, 170),
				decay: Color3.fromRGB(120, 140, 200),
				glare: 0.4,
				haze: 1.4,
			},
			bloom: { intensity: 0.6, size: 30, threshold: 0.9 },
			colorCorrection: {
				tint: Color3.fromRGB(255, 244, 236),
				contrast: 0.08,
				saturation: 0.12,
				brightness: 0.02,
			},
		});
	},
};
