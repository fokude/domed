// Exports a code-built map and renders previews of it in Blender, so a layout can be reviewed
// without Studio. Usage: npm run preview -- <MapId> [resolution]
// Output goes to previews/<MapId>/ (gitignored). Set BLENDER to Blender's path if it isn't in
// the default Windows install location or on PATH.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const [mapId, resolution = "1000"] = process.argv.slice(2);
if (!mapId) {
	console.error("Usage: npm run preview -- <MapId> [resolution]");
	process.exit(1);
}

function findBlender() {
	if (process.env.BLENDER) return process.env.BLENDER;
	const foundation = "C:/Program Files/Blender Foundation";
	if (fs.existsSync(foundation)) {
		const versions = fs.readdirSync(foundation).sort().reverse();
		for (const version of versions) {
			const exe = path.join(foundation, version, "blender.exe");
			if (fs.existsSync(exe)) return exe;
		}
	}
	return "blender";
}

const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "previews", mapId);
const json = path.join(root, "previews", `${mapId}.json`);
execFileSync("node", [path.join(__dirname, "export.js"), mapId, json], { stdio: "inherit" });
execFileSync(findBlender(), ["-b", "-P", path.join(__dirname, "render.py"), "--", json, outDir, resolution], {
	stdio: ["ignore", "ignore", "inherit"],
});
console.log(`Previews in ${path.relative(root, outDir)}: ${fs.readdirSync(outDir).join(", ")}`);
