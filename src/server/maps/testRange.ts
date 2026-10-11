// Test Range: one map where every feature can be tested solo. Load it in Studio with
// /map TestRange [mode]; it never appears in rotation or votes. Stations: training dummies to
// shoot (kill feedback, multi-kills, shields), all four perks on short respawns, two control
// points for Domination and Hardpoint, a bhop strip and jump pads. Floor lines are every 10
// studs for judging distances.

import {
	block,
	controlPointMarker,
	dummyMarker,
	jumpPad,
	perkMarker,
	setMapInfo,
	setMapLighting,
	slab,
	spawnMarker,
	Style,
} from "./kit";
import { MapBuilder } from "./types";

const FLOOR_SIZE = 240;
// Seconds before perk orbs come back here, so each can be tried repeatedly.
const PERK_RESPAWN = 5;
const FIRING_LINE_X = -30;

const Floor: Style = { color: Color3.fromRGB(150, 155, 165), material: Enum.Material.Concrete };
const Line: Style = { color: Color3.fromRGB(90, 95, 105), collide: false, castShadow: false };
const Goal: Style = { color: Color3.fromRGB(80, 200, 120), material: Enum.Material.SmoothPlastic };
const Marker: Style = { color: Color3.fromRGB(255, 190, 40), material: Enum.Material.Neon, collide: false };
const Pad: Style = { color: Color3.fromRGB(0, 220, 255), material: Enum.Material.Neon };
const Invisible: Style = { color: new Color3(), transparency: 1, collide: false, castShadow: false };

function label(parent: Instance, position: Vector3, text: string) {
	const anchor = block(parent, Vector3.one, new CFrame(position), Invisible, "Label");
	anchor.CanQuery = false;

	const gui = new Instance("BillboardGui");
	gui.Size = UDim2.fromOffset(360, 60);
	gui.MaxDistance = 300;
	gui.Parent = anchor;

	const textLabel = new Instance("TextLabel");
	textLabel.Size = UDim2.fromScale(1, 1);
	textLabel.BackgroundTransparency = 1;
	textLabel.TextScaled = true;
	textLabel.Font = Enum.Font.GothamBlack;
	textLabel.TextColor3 = new Color3(1, 1, 1);
	textLabel.TextStrokeTransparency = 0;
	textLabel.Text = text;
	textLabel.Parent = gui;
}

function buildFloor(map: Model) {
	slab(map, Vector3.zero, new Vector3(FLOOR_SIZE, 4, FLOOR_SIZE), Floor, "Floor");
	const half = FLOOR_SIZE / 2;
	for (let offset = -half + 10; offset < half; offset += 10) {
		slab(map, new Vector3(offset, 0.05, 0), new Vector3(0.2, 0.1, FLOOR_SIZE), Line, "Line");
		slab(map, new Vector3(0, 0.05, offset), new Vector3(FLOOR_SIZE, 0.1, 0.2), Line, "Line");
	}
}

// Long straight with a marker every 20 studs for judging bhop speed.
function buildStrip(map: Model) {
	for (let x = -100; x <= 100; x += 20) {
		slab(map, new Vector3(x, 0.1, 80), new Vector3(0.6, 0.1, 20), Marker, "StripMarker");
		label(map, new Vector3(x, 4, 92), tostring(x + 100));
	}
	label(map, new Vector3(0, 10, 80), "BHOP STRIP");
}

function buildPads(map: Model) {
	jumpPad(map, new Vector3(30, 0, -40), new Vector3(30, 30, -40), 0, Pad);
	label(map, new Vector3(30, 8, -40), "PAD: straight up");

	slab(map, new Vector3(0, 20, -100), new Vector3(20, 2, 20), Goal, "PadPlatform");
	jumpPad(map, new Vector3(0, 0, -50), new Vector3(0, 20, -100), 8, Pad);
	label(map, new Vector3(0, 8, -50), "PAD: aimed at the platform. Run in to test momentum");
}

// Dummies stand west of the firing line, facing it.
function buildGallery(map: Model) {
	slab(map, new Vector3(FIRING_LINE_X, 0.1, 0), new Vector3(0.6, 0.1, 180), Marker, "FiringLine");
	label(map, new Vector3(FIRING_LINE_X, 8, 0), "SHOOTING GALLERY: shoot from this line");

	const facing = (z: number) => new Vector3(FIRING_LINE_X, 0, z);
	dummyMarker(map, new Vector3(-75, 0, -50), facing(-50), "Static");
	dummyMarker(map, new Vector3(-90, 0, -25), facing(-25), "Strafe");
	dummyMarker(map, new Vector3(-90, 0, 0), facing(0), "Circle");
	dummyMarker(map, new Vector3(-105, 0, 25), facing(25), "Fast");
	dummyMarker(map, new Vector3(-95, 0, 50), facing(50), "Hop");
	dummyMarker(map, new Vector3(-75, 0, 60), facing(60), "Static", true);

	// A tight cluster for practicing multi-kills.
	const cluster: [number, number][] = [
		[-70, -80],
		[-70, -86],
		[-76, -80],
		[-76, -86],
	];
	for (const [x, z] of cluster) {
		dummyMarker(map, new Vector3(x, 0, z), facing(z), "Static");
	}
	label(map, new Vector3(-73, 9, -83), "MULTI-KILL CLUSTER");
}

function buildPerks(map: Model) {
	const perks = ["SuperJump", "Shield", "Overcharge", "Radar"] as const;
	perks.forEach((perk, index) => perkMarker(map, new Vector3(60, 0, -20 + index * 20), perk, PERK_RESPAWN));
	label(map, new Vector3(60, 10, 10), `PERKS: respawn every ${PERK_RESPAWN}s`);
}

// Two points for testing Domination captures and Hardpoint rotation alone.
function buildPoints(map: Model) {
	controlPointMarker(map, new Vector3(90, 0, -60), "A", 10);
	controlPointMarker(map, new Vector3(90, 0, 60), "B", 10);
	label(map, new Vector3(90, 9, 0), "CONTROL POINTS: /map TestRange Domination");
}

export const TestRange: MapBuilder = {
	id: "TestRange",
	build(map) {
		setMapInfo(map, {
			name: "Test Range",
			tagline: "Test map",
			modes: ["Deathmatch", "Domination", "Hardpoint"],
			gravity: 196.2,
			killHeight: -20,
			themeColor: Color3.fromRGB(255, 190, 40),
			devOnly: true,
		});

		buildFloor(map);
		buildStrip(map);
		buildPads(map);
		buildGallery(map);
		buildPerks(map);
		buildPoints(map);

		for (const x of [-10, 10]) {
			for (const z of [-10, 10]) {
				spawnMarker(map, new Vector3(x, 0, z), new Vector3(x, 0, 100));
			}
		}

		setMapLighting(map, {
			clockTime: 13,
			brightness: 2,
			ambient: Color3.fromRGB(110, 110, 120),
			outdoorAmbient: Color3.fromRGB(130, 130, 140),
		});
	},
};
