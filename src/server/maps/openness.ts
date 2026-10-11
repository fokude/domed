// Measures how exposed a map is, using the metrics from docs/MAP_DESIGN.md:
//   openness:        share of pairs of random standing spots that can see each other
//   spawn exposure:  share of random standing spots that can see at least one spawn
// Spots are sampled on every walkable floor, including upper floors, at eye height.

import { LoadedMap } from "./loader";
import { MapTag } from "./markers";

const CollectionService = game.GetService("CollectionService");
const Workspace = game.GetService("Workspace");

const SAMPLE_COUNT = 250;
const EYE_HEIGHT = 5;
const HEADROOM = 6;
// Yield this often so a long measurement doesn't trip the script timeout.
const RAYS_PER_YIELD = 2000;

export interface OpennessReport {
	spots: number;
	openness: number;
	spawnExposure: number;
}

function playableBounds(arena: Model): [Vector3, Vector3] {
	let low = new Vector3(math.huge, math.huge, math.huge);
	let high = new Vector3(-math.huge, -math.huge, -math.huge);
	for (const part of arena.GetDescendants()) {
		// Scenery (backdrops, barriers) can't be queried or stood on, so it doesn't count.
		if (!part.IsA("BasePart") || !part.CanQuery || !part.CanCollide) continue;
		const half = part.Size.div(2);
		low = low.Min(part.Position.sub(half));
		high = high.Max(part.Position.add(half));
	}
	return [low, high];
}

// Every walkable floor in a vertical column: surfaces facing up, not hazards, above the kill
// height, with room to stand.
function floorsInColumn(x: number, z: number, top: number, bottom: number, map: LoadedMap, params: RaycastParams) {
	const floors: Vector3[] = [];
	let start = new Vector3(x, top, z);
	for (let guard = 0; guard < 12 && start.Y > bottom; guard++) {
		const hit = Workspace.Raycast(start, new Vector3(0, bottom - start.Y, 0), params);
		if (!hit) break;
		const standable =
			hit.Normal.Y > 0.7 &&
			hit.Position.Y > map.killHeight &&
			!CollectionService.HasTag(hit.Instance, MapTag.Hazard) &&
			!Workspace.Raycast(hit.Position.add(new Vector3(0, 0.1, 0)), new Vector3(0, HEADROOM, 0), params);
		if (standable) floors.push(hit.Position);
		start = hit.Position.sub(new Vector3(0, 0.5, 0));
	}
	return floors;
}

export function measureOpenness(map: LoadedMap): OpennessReport {
	const params = new RaycastParams();
	params.FilterType = Enum.RaycastFilterType.Include;
	params.FilterDescendantsInstances = [map.arena];

	const [low, high] = playableBounds(map.arena);
	const spots: Vector3[] = [];
	for (let attempt = 0; attempt < SAMPLE_COUNT * 20 && spots.size() < SAMPLE_COUNT; attempt++) {
		const x = low.X + math.random() * (high.X - low.X);
		const z = low.Z + math.random() * (high.Z - low.Z);
		const floors = floorsInColumn(x, z, high.Y + 5, low.Y - 5, map, params);
		if (floors.size() > 0) spots.push(floors[math.random(0, floors.size() - 1)].add(new Vector3(0, EYE_HEIGHT, 0)));
	}

	let rays = 0;
	const canSee = (from: Vector3, to: Vector3) => {
		rays += 1;
		if (rays % RAYS_PER_YIELD === 0) task.wait();
		return Workspace.Raycast(from, to.sub(from), params) === undefined;
	};

	let visiblePairs = 0;
	let pairCount = 0;
	for (let i = 0; i < spots.size(); i++) {
		for (let j = i + 1; j < spots.size(); j++) {
			pairCount += 1;
			if (canSee(spots[i], spots[j])) visiblePairs += 1;
		}
	}

	const spawnEyes = map.spawns.map((spawn) => spawn.cframe.Position.add(new Vector3(0, 1.5, 0)));
	const exposed = spots.filter((spot) => spawnEyes.some((eye) => canSee(spot, eye))).size();

	return {
		spots: spots.size(),
		openness: pairCount > 0 ? visiblePairs / pairCount : 0,
		spawnExposure: spots.size() > 0 ? exposed / spots.size() : 0,
	};
}
