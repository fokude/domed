// Checks that every remote typed in src/shared/remotes.ts is declared in default.project.json,
// and the other way round. A remote missing from the project file makes the game hang on
// WaitForChild, which only shows up in Studio, so this catches it in `npm run check` and CI.

const fs = require("fs");

const typed = new Set(
	[...fs.readFileSync("src/shared/remotes.ts", "utf8").matchAll(/>\(\s*"(\w+)"\s*,?\s*\)/g)].map((m) => m[1]),
);

const project = JSON.parse(fs.readFileSync("default.project.json", "utf8"));
const remotesNode = project.tree?.ReplicatedStorage?.Remotes ?? {};
const declared = new Set(Object.keys(remotesNode).filter((key) => !key.startsWith("$")));

const missing = [...typed].filter((name) => !declared.has(name));
const unused = [...declared].filter((name) => !typed.has(name));

if (missing.length > 0)
	console.error(`Typed in remotes.ts but not declared in default.project.json: ${missing.join(", ")}`);
if (unused.length > 0)
	console.error(`Declared in default.project.json but not typed in remotes.ts: ${unused.join(", ")}`);
if (missing.length > 0 || unused.length > 0) process.exit(1);
console.log(`Remotes match (${typed.size}).`);
