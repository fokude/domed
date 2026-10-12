// The crosshair, drawn from the player's settings (playerSettings.ts). The same drawing is used
// for the HUD and the preview in the Settings panel.

import { CROSSHAIR_COLORS, CrosshairSettings } from "shared/settings";
import { changeSettings, getSettings, onSettingsChanged } from "./playerSettings";
import { create } from "./ui";

const SIZE_SCALE = { Small: 1, Medium: 1.5, Large: 2 };
const OUTLINE = new Color3(0, 0, 0);

// A centered, zero-size frame the crosshair's pieces are drawn around.
export function createCrosshairFrame(parent: Instance): Frame {
	return create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.5),
			Size: UDim2.fromOffset(0, 0),
			BackgroundTransparency: 1,
		},
		parent,
	);
}

function bar(container: Frame, size: Vector2, offset: Vector2, color: Color3, outline: boolean) {
	const piece = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromOffset(offset.X, offset.Y),
			Size: UDim2.fromOffset(size.X, size.Y),
			BackgroundColor3: color,
			BorderSizePixel: 0,
		},
		container,
	);
	if (outline) create("UIStroke", { Color: OUTLINE, Thickness: 1 }, piece);
}

function ring(container: Frame, diameter: number, thickness: number, color: Color3) {
	const circle = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Size: UDim2.fromOffset(diameter, diameter),
			BackgroundTransparency: 1,
		},
		container,
	);
	create("UICorner", { CornerRadius: new UDim(1, 0) }, circle);
	create("UIStroke", { Color: color, Thickness: thickness }, circle);
}

export function drawCrosshair(container: Frame, settings: CrosshairSettings) {
	container.ClearAllChildren();
	const scale = SIZE_SCALE[settings.size];
	const color = CROSSHAIR_COLORS[settings.color];
	const { style, outline } = settings;

	if (style === "Dot" || style === "CrossDot") {
		const dot = math.round(4 * scale);
		bar(container, new Vector2(dot, dot), Vector2.zero, color, outline);
	}
	if (style === "Cross" || style === "CrossDot") {
		const length = math.round(7 * scale);
		const gap = math.round(4 * scale);
		const reach = gap + length / 2;
		bar(container, new Vector2(length, 2), new Vector2(-reach, 0), color, outline);
		bar(container, new Vector2(length, 2), new Vector2(reach, 0), color, outline);
		bar(container, new Vector2(2, length), new Vector2(0, -reach), color, outline);
		bar(container, new Vector2(2, length), new Vector2(0, reach), color, outline);
	}
	if (style === "Circle") {
		const diameter = math.round(16 * scale);
		// An outline is a thicker dark ring underneath.
		if (outline) ring(container, diameter, 4, OUTLINE);
		ring(container, diameter, 2, color);
		bar(container, new Vector2(2, 2), Vector2.zero, color, outline);
	}
}

export function getCrosshairSettings(): CrosshairSettings {
	return getSettings().crosshair;
}

export function onCrosshairChanged(callback: () => void) {
	onSettingsChanged(callback);
}

export function setCrosshairSettings(settings: CrosshairSettings) {
	changeSettings({ crosshair: settings });
}

export function initCrosshair(hud: ScreenGui) {
	const frame = createCrosshairFrame(hud);
	drawCrosshair(frame, getCrosshairSettings());
	onSettingsChanged(() => drawCrosshair(frame, getCrosshairSettings()));
}
