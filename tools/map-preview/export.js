// Runs a code-built map's builder in Node (on the Roblox shim) and writes its parts as JSON for
// the Blender renderer. Usage: node tools/map-preview/export.js <MapId> <out.json>

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const shim = require("./roblox-shim");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const cache = new Map();

function resolve(specifier, fromFile) {
	const base = specifier.startsWith(".")
		? path.resolve(path.dirname(fromFile), specifier)
		: specifier.startsWith("shared/") || specifier.startsWith("server/") || specifier.startsWith("client/")
			? path.join(SRC, specifier)
			: undefined;
	if (!base) throw new Error(`Map preview can't load "${specifier}" (from ${fromFile})`);
	for (const candidate of [base + ".ts", path.join(base, "index.ts")]) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error(`Map preview can't find "${specifier}" (from ${fromFile})`);
}

// Loads a TypeScript module from src with the shim's globals in scope.
function load(file) {
	if (cache.has(file)) return cache.get(file).exports;
	const module = { exports: {} };
	cache.set(file, module);
	const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
		fileName: file,
	});
	const names = Object.keys(shim);
	const run = new Function("exports", "require", "module", ...names, outputText);
	run(module.exports, (specifier) => load(resolve(specifier, file)), module, ...names.map((n) => shim[n]));
	return module.exports;
}

function findBuilder(mapId) {
	const mapsDir = path.join(SRC, "server/maps");
	for (const file of fs.readdirSync(mapsDir)) {
		if (!file.endsWith(".ts")) continue;
		const source = fs.readFileSync(path.join(mapsDir, file), "utf8");
		if (!source.includes(`id: "${mapId}"`) && !source.includes(`_MAP_ID = "${mapId}"`)) continue;
		const exports = load(path.join(mapsDir, file));
		const builder = Object.values(exports).find((value) => value && value.id === mapId && value.build);
		if (builder) return builder;
	}
	throw new Error(`No code map with id "${mapId}"`);
}

function plain(value) {
	if (value instanceof shim.Color3) return [value.R, value.G, value.B];
	if (value instanceof shim.Vector3) return [value.X, value.Y, value.Z];
	return value;
}

function serialize(map) {
	const parts = [];
	for (const instance of map.GetDescendants()) {
		if (!instance.IsA("BasePart")) continue;
		const ancestors = [];
		for (let p = instance.Parent; p && p !== map; p = p.Parent) ancestors.push(p.Name);
		const attributes = {};
		for (const [key, value] of Object.entries(instance._attributes)) attributes[key] = plain(value);
		parts.push({
			className: instance.ClassName,
			name: instance.Name,
			shape: instance.Shape ? instance.Shape.Name : "Block",
			size: plain(instance.Size ?? new shim.Vector3(4, 1, 2)),
			cframe: (instance.CFrame ?? new shim.CFrame()).GetComponents(),
			color: plain(instance.Color ?? new shim.Color3(0.6, 0.6, 0.6)),
			material: instance.Material ? instance.Material.Name : "Plastic",
			transparency: instance.Transparency ?? 0,
			canCollide: instance.CanCollide ?? true,
			canQuery: instance.CanQuery ?? true,
			tags: [...instance._tags],
			attributes,
			ancestors,
		});
	}
	const mapAttributes = {};
	for (const [key, value] of Object.entries(map._attributes)) mapAttributes[key] = plain(value);
	const lighting = map.FindFirstChild("Lighting");
	const lightingAttributes = {};
	if (lighting)
		for (const [key, value] of Object.entries(lighting._attributes)) lightingAttributes[key] = plain(value);
	return { id: map.Name, attributes: mapAttributes, lighting: lightingAttributes, parts };
}

const [mapId, outFile] = process.argv.slice(2);
if (!mapId || !outFile) {
	console.error("Usage: node tools/map-preview/export.js <MapId> <out.json>");
	process.exit(1);
}
const builder = findBuilder(mapId);
const map = new shim.Instance("Model");
map.Name = mapId;
builder.build(map);
const data = serialize(map);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(data));
console.log(`Exported ${data.parts.length} parts from ${mapId} to ${outFile}`);
