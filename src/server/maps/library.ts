// Where maps come from. Maps edited in Studio live in ServerStorage.Maps (synced by Rojo from
// the repo's maps/ folder). Maps still defined in code are baked into ServerStorage.BakedMaps.
//
// To turn code maps into editable Studio maps, run this in the Studio command bar (edit mode):
//   require(game.ServerScriptService.TS.maps.library).bakeMaps()
// then save each model under ServerStorage.BakedMaps to maps/<Name>.rbxmx (right-click,
// Save to File). See docs/MAPPING.md.

import { Gridline } from "./gridline";
import { HalcyonStation } from "./halcyonStation";
import { InfernalSpire } from "./infernalSpire";
import { MovementLab } from "./movementLab";
import { readMapInfo, MapInfo } from "./loader";
import { MapBuilder } from "./types";

const ServerStorage = game.GetService("ServerStorage");

const CODE_MAPS: MapBuilder[] = [InfernalSpire, Gridline, HalcyonStation, MovementLab];

export function bakeMaps(): Folder {
	ServerStorage.FindFirstChild("BakedMaps")?.Destroy();
	const folder = new Instance("Folder");
	folder.Name = "BakedMaps";
	for (const builder of CODE_MAPS) {
		const map = new Instance("Model");
		map.Name = builder.id;
		builder.build(map);
		map.Parent = folder;
	}
	folder.Parent = ServerStorage;
	return folder;
}

// Code maps are rebuilt on every server start so they always match the code. A Studio-authored
// map with the same name takes precedence.
function collectMaps(): Map<string, Model> {
	const maps = new Map<string, Model>();
	const baked = bakeMaps();
	for (const source of [baked, ServerStorage.FindFirstChild("Maps")]) {
		for (const child of source?.GetChildren() ?? []) {
			if (child.IsA("Model")) maps.set(child.Name, child);
		}
	}
	return maps;
}

let maps: Map<string, Model> | undefined;

function getMaps(): Map<string, Model> {
	maps ??= collectMaps();
	return maps;
}

export function listMaps(): MapInfo[] {
	const infos: MapInfo[] = [];
	getMaps().forEach((map) => infos.push(readMapInfo(map)));
	return infos;
}

export function getMapModel(id: string): Model | undefined {
	return getMaps().get(id);
}
