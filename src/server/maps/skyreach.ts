// Skyreach: floating marble ruins in the upper atmosphere of a gas giant at sunrise, the
// tournament's open-air arena. Built around air control in the spirit of Quake 3's floating
// arenas (an archetype, not a copy): four low islands at the compass points where players
// spawn, four higher islands on the diagonals, and the Crown, a contested platform in the
// middle reached only by jump pads. Floating monoliths break the sightlines across open sky.
// Falling means a long drop into the clouds. Lower gravity rewards air strafing.
//
// Heights: low islands 10, mid islands 30, the Crown 56. North (angle 0) is Red's side and
// south is Blue's; west and east are shared.

import {
	block,
	controlPointMarker,
	cylinder,
	jumpPad,
	onCircle,
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

const CENTER = Vector3.zero;
const QUARTER = math.pi / 2;
const EIGHTH = math.pi / 4;

const LOW = 10;
const MID = 30;
const CROWN = 56;
const LOW_RADIUS = 112;
const MID_RADIUS = 78;
const LOW_SIZE = new Vector3(48, 6, 40);
const MID_SIZE = 34;
const CROWN_DIAMETER = 40;
const MONOLITH_RADIUS = 48;
const CARDINALS = [0, QUARTER, 2 * QUARTER, 3 * QUARTER];
const DIAGONALS = CARDINALS.map((angle) => angle + EIGHTH);

function at(radius: number, angle: number, height: number): Vector3 {
	return onCircle(CENTER, radius, angle).add(new Vector3(0, height, 0));
}

// A frame at `radius` and `angle`, with +Z pointing toward the center.
function ringFrame(radius: number, angle: number, height: number): CFrame {
	return new CFrame(CENTER).mul(CFrame.Angles(0, angle, 0)).mul(new CFrame(0, height, -radius));
}

// An island: a marble top over a tapering rock underside, so it reads as floating.
function island(arena: Model, top: Vector3, size: Vector3, frame: CFrame, name: string) {
	block(arena, size, frame.Rotation.add(top.sub(new Vector3(0, size.Y / 2, 0))), Marble, name);
	block(
		arena,
		new Vector3(size.X + 1, 0.6, size.Z + 1),
		frame.Rotation.add(top.sub(new Vector3(0, 0.6, 0))),
		Gold,
		"Trim",
	);
	for (let layer = 1; layer <= 3; layer++) {
		const shrink = layer * 0.22;
		const depth = size.Y + layer * 6;
		block(
			arena,
			new Vector3(size.X * (1 - shrink), 6, size.Z * (1 - shrink)),
			frame.Rotation.add(top.sub(new Vector3(0, depth, 0))),
			Stone,
			"IslandRock",
		);
	}
}

// A small temple on each low island where players spawn. Its front is solid, so nothing in
// the arena can see in; the doors are in the side walls, one each side, and each spawn faces
// its door.
function spawnTemple(arena: Model, angle: number, team: "Red" | "Blue" | undefined) {
	const frame = ringFrame(LOW_RADIUS + 8, angle, LOW);
	const onTemple = (x: number, y: number, z: number) => frame.mul(new CFrame(x, y, z));
	const width = 36;
	const depth = 18;
	const height = 14;
	const door = 8;
	for (const z of [-depth / 2, depth / 2]) {
		block(arena, new Vector3(width, height, 2), onTemple(0, height / 2, z), Marble, "TempleWall");
	}
	for (const side of [-1, 1]) {
		// Side wall from the back to the doorway, which is at the front corner.
		const wallLength = depth - door;
		block(
			arena,
			new Vector3(2, height, wallLength),
			onTemple((side * (width - 2)) / 2, height / 2, -depth / 2 + wallLength / 2),
			Marble,
			"TempleWall",
		);
		cylinder(arena, onTemple(side * 9, height, depth / 2 + 2).Position, height, 3, Gold, "TempleColumn");
		const exit = onTemple(side * (width / 2 + 6), 0, depth / 2 - door / 2).Position;
		spawnMarker(arena, onTemple(side * 7, 0, -2).Position, exit, team);
	}
	block(arena, new Vector3(width + 2, 2, depth + 2), onTemple(0, height + 1, 0), Marble, "TempleRoof");
	const light = block(arena, new Vector3(1, 1, 1), onTemple(0, height - 2, 0), Glow, "TempleLight");
	pointLight(light, Color3.fromRGB(255, 220, 170), 24, 1.2);
}

function buildLowIslands(arena: Model) {
	CARDINALS.forEach((angle, i) => {
		const frame = ringFrame(LOW_RADIUS, angle, 0);
		island(arena, at(LOW_RADIUS, angle, LOW), LOW_SIZE, frame, "LowIsland");
		// North is Red's, south is Blue's; west and east are shared.
		spawnTemple(arena, angle, i === 0 ? "Red" : i === 2 ? "Blue" : undefined);

		// Jump pads from the inner corners up to both neighboring mid islands.
		for (const side of [-1, 1]) {
			jumpPad(
				arena,
				at(LOW_RADIUS - 14, angle + side * 0.16, LOW),
				at(MID_RADIUS, angle + side * EIGHTH, MID),
				8,
				Pad,
			);
		}
		// A ruined wall on the island's inner edge, between the pads: cover from the Crown and
		// the far islands.
		const inner = ringFrame(LOW_RADIUS - 13, angle, LOW);
		block(arena, new Vector3(14, 10, 3), inner.mul(new CFrame(0, 5, 0)), Marble, "RuinWall");
		block(arena, new Vector3(4, 6, 3), inner.mul(new CFrame(9, 3, 0)), Marble, "RuinWall");
		// A narrow ramp-bridge to the next mid island clockwise: a walking route up, so the mid
		// islands don't depend on pads alone.
		plank(
			arena,
			at(LOW_RADIUS - 6, angle + 0.22, LOW),
			at(MID_RADIUS + 10, angle + EIGHTH - 0.12, MID),
			6,
			1.5,
			Gold,
			"SkyBridge",
		);
	});
}

// The mid islands, each with a broken colonnade for cover and a pad up to the Crown.
function buildMidIslands(arena: Model) {
	for (const angle of DIAGONALS) {
		const frame = ringFrame(MID_RADIUS, angle, 0);
		island(arena, at(MID_RADIUS, angle, MID), new Vector3(MID_SIZE, 5, MID_SIZE), frame, "MidIsland");
		const onIsland = (x: number, z: number) => frame.mul(new CFrame(x, MID, z));
		// Colonnade: four columns and a lintel on the outer side, and a low wall on the inner
		// side facing the Crown.
		for (const x of [-12, -4, 4, 12]) {
			cylinder(arena, onIsland(x, -10).Position.add(new Vector3(0, 12, 0)), 12, 3, Marble, "Column");
		}
		block(arena, new Vector3(30, 2, 4), onIsland(0, -10).mul(new CFrame(0, 13, 0)), Marble, "Lintel");
		block(arena, new Vector3(16, 5, 2), onIsland(0, 10).mul(new CFrame(0, 2.5, 0)), Marble, "Parapet");
		jumpPad(arena, onIsland(0, 4).Position, at(10, angle, CROWN), 10, Pad);
	}
}

// The Crown: a round platform at the top, with a gold ring of short pillars for cover.
function buildCrown(arena: Model) {
	cylinder(arena, new Vector3(0, CROWN, 0), 4, CROWN_DIAMETER, Marble, "Crown");
	cylinder(arena, new Vector3(0, CROWN - 4, 0), 10, CROWN_DIAMETER - 12, Stone, "CrownRock");
	cylinder(arena, new Vector3(0, CROWN - 14, 0), 14, CROWN_DIAMETER - 24, Stone, "CrownRock");
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * 2 * math.pi + EIGHTH / 2;
		cylinder(arena, at(CROWN_DIAMETER / 2 - 4, angle, CROWN + 4), 4, 3, Gold, "CrownPillar");
	}
	// A tall obelisk in the middle: fights on the Crown circle it, and it blocks sightlines
	// across the center of the map.
	block(arena, new Vector3(8, 26, 8), new CFrame(0, CROWN + 13, 0).mul(CFrame.Angles(0, EIGHTH, 0)), Stone, "Obelisk");
	const crest = block(arena, new Vector3(8.4, 2, 8.4), new CFrame(0, CROWN + 22, 0).mul(CFrame.Angles(0, EIGHTH, 0)), Glow, "ObeliskCrest");
	pointLight(crest, Color3.fromRGB(120, 230, 230), 50, 2);
	const beacon = cylinder(arena, new Vector3(0, CROWN + 0.2, 0), 0.2, 8, Glow, "CrownBeacon");
	pointLight(beacon, Color3.fromRGB(120, 230, 230), 40, 2);
}

// Floating monoliths between the Crown and the mid islands, breaking sightlines across the
// middle of the map. Each slowly tilted, as if drifting.
function buildMonoliths(arena: Model) {
	CARDINALS.forEach((angle, i) => {
		const position = at(MONOLITH_RADIUS, angle, 34 + (i % 2) * 6);
		block(
			arena,
			new Vector3(18, 40, 7),
			new CFrame(position)
				.mul(CFrame.Angles(0, angle, 0))
				.mul(CFrame.Angles(0.08, 0, 0.12 * (i % 2 === 0 ? 1 : -1))),
			Stone,
			"Monolith",
		);
		const rune = block(
			arena,
			new Vector3(1.2, 24, 6.4),
			new CFrame(position).mul(CFrame.Angles(0, angle, 0)),
			Glow,
			"MonolithRune",
		);
		pointLight(rune, Color3.fromRGB(120, 230, 230), 20, 1);
	});
}

function buildSky(arena: Model) {
	// A sea of clouds far below; falling into it is the kill height.
	for (let i = 0; i < 10; i++) {
		const angle = (i / 10) * 2 * math.pi;
		const radius = 60 + (i % 3) * 70;
		scenery(slab(arena, at(radius, angle, -60 - (i % 4) * 6), new Vector3(140, 8, 100), Cloud, "Cloud"));
	}
	scenery(slab(arena, new Vector3(0, -90, 0), new Vector3(1200, 2, 1200), Cloud, "CloudSea"));
	const walls = new Vector3(0, 150, 0);
	for (const angle of CARDINALS) {
		const wall = block(arena, new Vector3(400, 300, 4), ringFrame(190, angle, walls.Y), Barrier, "Barrier");
		wall.CanQuery = false;
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

		buildLowIslands(arena);
		buildMidIslands(arena);
		buildCrown(arena);
		buildMonoliths(arena);
		buildSky(arena);
		spectatorRing(arena, CENTER, 175, 50, 8, Color3.fromRGB(230, 180, 70), EIGHTH / 2);

		// Domination: west island, the Crown, east island; equally far from both teams.
		controlPointMarker(arena, at(LOW_RADIUS, QUARTER, LOW), "A", 12, "Domination");
		controlPointMarker(arena, new Vector3(0, CROWN, 0), "B", 10, "Domination");
		controlPointMarker(arena, at(LOW_RADIUS, 3 * QUARTER, LOW), "C", 12, "Domination");

		// Perks: Overcharge on the Crown; the rest in pairs placed symmetrically.
		perkMarker(arena, new Vector3(0, CROWN, 6), "Overcharge");
		perkMarker(arena, at(MID_RADIUS, DIAGONALS[0], MID), "Shield");
		perkMarker(arena, at(MID_RADIUS, DIAGONALS[2], MID), "Shield");
		perkMarker(arena, at(MID_RADIUS, DIAGONALS[1], MID), "Radar");
		perkMarker(arena, at(MID_RADIUS, DIAGONALS[3], MID), "Radar");
		perkMarker(arena, at(LOW_RADIUS - 12, QUARTER, LOW), "SuperJump");
		perkMarker(arena, at(LOW_RADIUS - 12, 3 * QUARTER, LOW), "SuperJump");

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
