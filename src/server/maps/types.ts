import { ModeId, TeamId } from "shared/modes";

export interface BuiltMap {
	// Free-for-all spawns. Team modes use teamSpawns.
	spawns: CFrame[];
	teamSpawns?: Record<TeamId, CFrame[]>;
	flagBases?: Record<TeamId, Vector3>;
	// Characters below this height die, for lava floors and drops into the void.
	killHeight: number;
}

export interface MapDefinition {
	id: string;
	name: string;
	tagline: string;
	modes: ModeId[];
	gravity: number;
	build(arena: Folder): BuiltMap;
}
