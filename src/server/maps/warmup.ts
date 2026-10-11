// The warm-up arena players wait in between matches while they vote: the Test Range's
// stations (training dummies, perks, bhop strip, jump pads) without its control points.
// Players can't hurt each other here. Never in rotation or votes.

import { setMapInfo, setMapLighting, spawnMarker } from "./kit";
import { buildFloor, buildGallery, buildPads, buildPerks, buildStrip, RANGE_LIGHTING } from "./testRange";
import { MapBuilder } from "./types";

export const WARMUP_MAP_ID = "Warmup";
const PERK_RESPAWN = 10;
const SPAWN_RING_RADIUS = 16;
const SPAWN_COUNT = 12;

export const Warmup: MapBuilder = {
	id: WARMUP_MAP_ID,
	build(map) {
		setMapInfo(map, {
			name: "Warm-up",
			tagline: "Between matches",
			modes: [],
			gravity: 196.2,
			killHeight: -20,
			themeColor: Color3.fromRGB(255, 190, 40),
			devOnly: true,
		});

		buildFloor(map);
		buildStrip(map);
		buildPads(map);
		buildGallery(map);
		buildPerks(map, PERK_RESPAWN);

		// A ring of spawns facing the shooting gallery, enough for full lobbies.
		for (let i = 0; i < SPAWN_COUNT; i++) {
			const angle = (i / SPAWN_COUNT) * math.pi * 2;
			const position = new Vector3(math.cos(angle) * SPAWN_RING_RADIUS, 0, math.sin(angle) * SPAWN_RING_RADIUS);
			spawnMarker(map, position, position.add(new Vector3(-100, 0, 0)));
		}

		setMapLighting(map, RANGE_LIGHTING);
	},
};
