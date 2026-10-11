// A map built in code. Building fills an empty Model with geometry, markers, map attributes
// and a lighting folder, the same as a map made by hand in Studio.
export interface MapBuilder {
	id: string;
	build(map: Model): void;
}
