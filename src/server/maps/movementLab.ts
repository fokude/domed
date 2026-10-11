// Test map for trying movement features. Load it in Studio with /map MovementLab; it never
// appears in rotation or votes. Floor lines are every 10 studs for judging distances.

import { block, jumpPad, setMapInfo, setMapLighting, slab, spawnMarker, Style } from "./kit";
import { MapBuilder } from "./types";

const FLOOR_SIZE = 240;

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

export const MovementLab: MapBuilder = {
	id: "MovementLab",
	build(map) {
		setMapInfo(map, {
			name: "Movement Lab",
			tagline: "Test map",
			modes: ["Deathmatch"],
			gravity: 196.2,
			killHeight: -20,
			themeColor: Color3.fromRGB(255, 190, 40),
			devOnly: true,
		});

		buildFloor(map);
		buildStrip(map);
		buildPads(map);

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
