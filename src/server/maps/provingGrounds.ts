import { applyLighting, jumpPad, ramp, slab, spawnAt, Style } from "./kit";
import { MapDefinition } from "./types";

const ARENA_SIZE = 240;
const WALL_HEIGHT = 50;
const CENTER_HEIGHT = 24;
const TOWER_HEIGHT = 16;

const Floor: Style = { color: Color3.fromRGB(40, 42, 48), material: Enum.Material.Slate };
const Wall: Style = { color: Color3.fromRGB(28, 30, 36), material: Enum.Material.Concrete };
const Structure: Style = { color: Color3.fromRGB(70, 74, 84), material: Enum.Material.DiamondPlate };
const Trim: Style = { color: Color3.fromRGB(255, 70, 40), material: Enum.Material.Neon };
const Pad: Style = { color: Color3.fromRGB(0, 220, 255), material: Enum.Material.Neon };
const Barrier: Style = { color: Color3.fromRGB(0, 0, 0), transparency: 1 };

export const ProvingGrounds: MapDefinition = {
	id: "provingGrounds",
	name: "Proving Grounds",
	tagline: "Where it started",
	modes: ["Deathmatch"],
	gravity: 196.2,
	build(arena) {
		const half = ARENA_SIZE / 2;
		slab(arena, Vector3.zero, new Vector3(ARENA_SIZE, 4, ARENA_SIZE), Floor, "Floor");

		for (const side of [Vector3.xAxis, Vector3.xAxis.mul(-1), Vector3.zAxis, Vector3.zAxis.mul(-1)]) {
			const alongX = side.Z !== 0;
			const footprint = alongX ? new Vector3(ARENA_SIZE + 8, 0, 4) : new Vector3(4, 0, ARENA_SIZE + 8);
			const base = side.mul(half + 2);
			slab(arena, base.add(new Vector3(0, WALL_HEIGHT, 0)), footprint.add(new Vector3(0, WALL_HEIGHT, 0)), Wall);
			const barrier = slab(
				arena,
				base.add(new Vector3(0, 350, 0)),
				footprint.add(new Vector3(0, 300, 0)),
				Barrier,
			);
			barrier.CanQuery = false;
			const trimFootprint = alongX ? new Vector3(ARENA_SIZE, 0.6, 0.6) : new Vector3(0.6, 0.6, ARENA_SIZE);
			slab(arena, side.mul(half - 0.3).add(new Vector3(0, 0.6, 0)), trimFootprint, Trim);
		}

		slab(arena, new Vector3(0, CENTER_HEIGHT, 0), new Vector3(40, 2, 40), Structure, "CenterPlatform");
		for (const x of [-16, 16]) {
			for (const z of [-16, 16]) {
				slab(arena, new Vector3(x, CENTER_HEIGHT - 2, z), new Vector3(4, CENTER_HEIGHT - 2, 4), Wall, "Pillar");
			}
		}
		ramp(arena, new Vector3(0, 0, 70), new Vector3(0, CENTER_HEIGHT, 20), 12, Structure);
		ramp(arena, new Vector3(0, 0, -70), new Vector3(0, CENTER_HEIGHT, -20), 12, Structure);
		for (const x of [-34, 34]) {
			jumpPad(arena, new Vector3(x, 0, 0), new Vector3(0, CENTER_HEIGHT, 0), 8, Pad);
		}

		for (const x of [-85, 85]) {
			for (const z of [-85, 85]) {
				slab(arena, new Vector3(x, TOWER_HEIGHT, z), new Vector3(26, TOWER_HEIGHT, 26), Structure, "Tower");
				jumpPad(arena, new Vector3(x * 0.72, 0, z * 0.72), new Vector3(x, TOWER_HEIGHT, z), 8, Pad);
			}
			slab(arena, new Vector3(x, TOWER_HEIGHT, 0), new Vector3(8, 1, 144), Structure, "Catwalk");
		}

		const coverSpots = [
			new Vector3(40, 0, 40),
			new Vector3(-40, 0, 40),
			new Vector3(40, 0, -40),
			new Vector3(-40, 0, -40),
			new Vector3(60, 0, 0),
			new Vector3(-60, 0, 0),
			new Vector3(0, 0, 95),
			new Vector3(0, 0, -95),
		];
		for (const spot of coverSpots) {
			slab(arena, spot.add(new Vector3(0, 18, 0)), new Vector3(6, 18, 6), Wall, "Cover");
		}

		applyLighting({
			clockTime: 14,
			brightness: 2,
			ambient: Color3.fromRGB(70, 70, 80),
			outdoorAmbient: Color3.fromRGB(90, 90, 100),
		});

		const spawnSpots = [
			new Vector3(0, 0, 105),
			new Vector3(0, 0, -105),
			new Vector3(105, 0, 0),
			new Vector3(-105, 0, 0),
			new Vector3(50, 0, 105),
			new Vector3(-50, 0, -105),
			new Vector3(105, 0, -50),
			new Vector3(-105, 0, 50),
		];
		return {
			spawns: spawnSpots.map((spot) => spawnAt(spot, Vector3.zero)),
			killHeight: -50,
		};
	},
};
