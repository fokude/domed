// Floating spectator stands: the tournament's crowd, wrapped all the way around every arena like
// an intergalactic colosseum (docs/LORE.md). Each stand is a tilted grandstand of crowd
// silhouettes under a glowing banner; stands sit edge to edge, with camera drones between some. Everything goes in the map's Art folder, so it's visual only: players
// can't stand on it and shots pass through (see docs/MAPPING.md).

import { ART_FOLDER } from "shared/mapMarkers";
import { block, cylinder, Style } from "./kit";

const Hull: Style = { color: Color3.fromRGB(46, 48, 58), material: Enum.Material.Metal, castShadow: false };
const Seat: Style = { color: Color3.fromRGB(70, 72, 84), material: Enum.Material.SmoothPlastic, castShadow: false };
const Lens: Style = { color: Color3.fromRGB(255, 60, 40), material: Enum.Material.Neon, castShadow: false };

// Crowd colors: bright and mixed, so stands read as a crowd from across the map.
const CROWD_COLORS = [
	Color3.fromRGB(255, 90, 80),
	Color3.fromRGB(80, 170, 255),
	Color3.fromRGB(255, 210, 70),
	Color3.fromRGB(120, 230, 140),
	Color3.fromRGB(230, 120, 255),
	Color3.fromRGB(240, 240, 240),
];

const ROWS = 4;
const SEATS_PER_ROW = 9;
const ROW_DEPTH = 4;
const ROW_RISE = 3;
const STAND_WIDTH = SEATS_PER_ROW * 3 + 4;
// A camera drone hovers off every this many stands.
const DRONE_EVERY = 3;

function artFolder(map: Model): Folder {
	const existing = map.FindFirstChild(ART_FOLDER);
	if (existing?.IsA("Folder")) return existing;
	const folder = new Instance("Folder");
	folder.Name = ART_FOLDER;
	folder.Parent = map;
	return folder;
}

// One floating grandstand at `position`, facing `lookAt` (usually the arena's center).
export function spectatorStand(
	map: Model,
	position: Vector3,
	lookAt: Vector3,
	bannerColor: Color3,
	seed: number,
	withDrone = true,
) {
	const art = artFolder(map);
	const frame = CFrame.lookAt(position, new Vector3(lookAt.X, position.Y, lookAt.Z));
	const onStand = (x: number, y: number, z: number) => frame.mul(new CFrame(x, y, z));
	const width = STAND_WIDTH;

	// Hull: a wedge-shaped underside, so the stand reads as floating rather than standing.
	block(art, new Vector3(width, 2, ROWS * ROW_DEPTH + 4), onStand(0, -1, ROWS * ROW_DEPTH * 0.5), Hull, "StandHull");
	block(
		art,
		new Vector3(width - 6, 4, ROWS * ROW_DEPTH - 2),
		onStand(0, -4, ROWS * ROW_DEPTH * 0.5),
		Hull,
		"StandKeel",
	);

	for (let row = 0; row < ROWS; row++) {
		const z = row * ROW_DEPTH + ROW_DEPTH / 2;
		const y = row * ROW_RISE;
		block(art, new Vector3(width - 2, ROW_RISE, ROW_DEPTH), onStand(0, y + ROW_RISE / 2, z), Seat, "StandTier");
		for (let seat = 0; seat < SEATS_PER_ROW; seat++) {
			// Not every seat is filled, so the crowd looks natural.
			if ((seat * 7 + row * 3 + seed) % 5 === 0) continue;
			const color = CROWD_COLORS[(seat + row * 2 + seed) % CROWD_COLORS.size()];
			const x = (seat - (SEATS_PER_ROW - 1) / 2) * 3;
			const body = block(
				art,
				new Vector3(1.6, 2.4, 1.2),
				onStand(x, y + ROW_RISE + 1.2, z),
				{ color, material: Enum.Material.SmoothPlastic, castShadow: false },
				"Spectator",
			);
			body.Name = "Spectator";
			block(
				art,
				new Vector3(1.2, 1.2, 1.2),
				onStand(x, y + ROW_RISE + 3, z),
				{ color: Color3.fromRGB(235, 200, 170), material: Enum.Material.SmoothPlastic, castShadow: false },
				"SpectatorHead",
			);
		}
	}

	// Banner along the back in the arena's color.
	block(
		art,
		new Vector3(width, 4, 0.6),
		onStand(0, ROWS * ROW_RISE + 6, ROWS * ROW_DEPTH + 1),
		{ color: bannerColor, material: Enum.Material.Neon, castShadow: false },
		"StandBanner",
	);

	// A camera drone hovering off one end of the stand, lens toward the arena.
	if (!withDrone) return;
	const side = seed % 2 === 0 ? 1 : -1;
	const dronePosition = onStand(side * (width / 2 + 6), 4, -4).Position;
	const drone = cylinder(art, dronePosition.add(new Vector3(0, 1, 0)), 2, 3, Hull, "CameraDrone");
	drone.CanQuery = false;
	block(
		art,
		new Vector3(0.8, 0.8, 0.8),
		CFrame.lookAt(dronePosition, lookAt).mul(new CFrame(0, 0, -1.6)),
		Lens,
		"DroneLens",
	);
}

// A closed ring of stands around an arena, `radius` from `center` at `height`: as many stands
// as fit edge to edge, so the crowd wraps the whole map with no gaps.
export function spectatorRing(map: Model, center: Vector3, radius: number, height: number, bannerColor: Color3) {
	const count = math.ceil((2 * math.pi * radius) / STAND_WIDTH);
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * 2 * math.pi;
		const position = center.add(new Vector3(math.sin(angle) * radius, height, -math.cos(angle) * radius));
		spectatorStand(map, position, center, bannerColor, i, i % DRONE_EVERY === 0);
	}
}
