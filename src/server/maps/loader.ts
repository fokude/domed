import { BuiltMap, MapDefinition } from "./types";

const Workspace = game.GetService("Workspace");

export interface LoadedMap {
	definition: MapDefinition;
	arena: Folder;
	layout: BuiltMap;
}

// Replaces the current map. Gravity is set first because jump pads compute their launch
// velocities from it while building.
export function loadMap(definition: MapDefinition): LoadedMap {
	for (const name of ["Arena", "Baseplate", "SpawnLocation"]) {
		Workspace.FindFirstChild(name)?.Destroy();
	}
	Workspace.Gravity = definition.gravity;

	const arena = new Instance("Folder");
	arena.Name = "Arena";
	const layout = definition.build(arena);
	arena.Parent = Workspace;

	return { definition, arena, layout };
}
