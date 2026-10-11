// Settings panel in the menu: crosshair style, color, size and outline, with a live preview.
// See docs/SETTINGS.md.

import {
	CROSSHAIR_COLOR_IDS,
	CROSSHAIR_COLORS,
	CROSSHAIR_SIZES,
	CROSSHAIR_STYLES,
	CrosshairSettings,
} from "shared/settings";
import {
	createCrosshairFrame,
	drawCrosshair,
	getCrosshairSettings,
	onCrosshairChanged,
	setCrosshairSettings,
} from "./crosshair";
import { addMenuButton, getMenuContent, registerMenuPanel, toggleMenuPanel } from "./menu";
import { create, Palette } from "./ui";

const PANEL_ID = "settings";
const OPTION = Color3.fromRGB(45, 48, 56);
const ROW_HEIGHT = 56;

const STYLE_NAMES: Record<string, string> = { Dot: "DOT", Cross: "CROSS", CrossDot: "CROSS + DOT", Circle: "CIRCLE" };

// Called after any change, so every option button can show whether it's selected.
const refreshers: (() => void)[] = [];

function change(update: Partial<CrosshairSettings>) {
	setCrosshairSettings({ ...getCrosshairSettings(), ...update });
}

function optionRow(parent: Instance, order: number, title: string): Frame {
	const row = create(
		"Frame",
		{ LayoutOrder: order, Size: new UDim2(1, 0, 0, ROW_HEIGHT), BackgroundTransparency: 1 },
		parent,
	);
	create(
		"TextLabel",
		{
			Size: new UDim2(1, 0, 0, 18),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 14,
			TextColor3: Palette.Muted,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: title,
		},
		row,
	);
	const options = create(
		"Frame",
		{ Position: UDim2.fromOffset(0, 22), Size: new UDim2(1, 0, 0, 30), BackgroundTransparency: 1 },
		row,
	);
	create("UIListLayout", { FillDirection: Enum.FillDirection.Horizontal, Padding: new UDim(0, 6) }, options);
	return options;
}

// A selectable button. `swatch` makes it a color square instead of a text button.
function option(parent: Instance, text: string, isSelected: () => boolean, onClick: () => void, swatch?: Color3) {
	const button = create(
		"TextButton",
		{
			Size: swatch ? UDim2.fromOffset(30, 30) : UDim2.fromOffset(text.size() * 9 + 24, 30),
			BackgroundColor3: swatch ?? OPTION,
			AutoButtonColor: true,
			Font: Enum.Font.GothamBold,
			TextSize: 14,
			TextColor3: Palette.White,
			Text: swatch ? "" : text,
		},
		parent,
	);
	create("UICorner", { CornerRadius: new UDim(0, 4) }, button);
	const stroke = create(
		"UIStroke",
		{ Color: Palette.Accent, Thickness: 2, ApplyStrokeMode: Enum.ApplyStrokeMode.Border },
		button,
	);
	button.Activated.Connect(onClick);
	refreshers.push(() => (stroke.Enabled = isSelected()));
}

function refresh() {
	for (const refresher of refreshers) refresher();
}

function build() {
	const panel = create(
		"Frame",
		{ Size: UDim2.fromScale(1, 1), BackgroundColor3: Palette.Panel, BackgroundTransparency: 0.15 },
		getMenuContent(),
	);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, panel);
	create(
		"UIPadding",
		{ PaddingLeft: new UDim(0, 24), PaddingRight: new UDim(0, 24), PaddingTop: new UDim(0, 20) },
		panel,
	);
	create(
		"TextLabel",
		{
			Size: new UDim2(1, 0, 0, 34),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 30,
			TextColor3: Palette.White,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "CROSSHAIR",
		},
		panel,
	);

	const rows = create(
		"Frame",
		{ Position: UDim2.fromOffset(0, 48), Size: new UDim2(1, -180, 1, -68), BackgroundTransparency: 1 },
		panel,
	);
	create("UIListLayout", { Padding: new UDim(0, 8), SortOrder: Enum.SortOrder.LayoutOrder }, rows);

	const current = getCrosshairSettings;
	const styles = optionRow(rows, 1, "STYLE");
	for (const style of CROSSHAIR_STYLES) {
		option(
			styles,
			STYLE_NAMES[style],
			() => current().style === style,
			() => change({ style }),
		);
	}
	const colors = optionRow(rows, 2, "COLOR");
	for (const color of CROSSHAIR_COLOR_IDS) {
		option(
			colors,
			color,
			() => current().color === color,
			() => change({ color }),
			CROSSHAIR_COLORS[color],
		);
	}
	const sizes = optionRow(rows, 3, "SIZE");
	for (const size of CROSSHAIR_SIZES) {
		option(
			sizes,
			size.upper(),
			() => current().size === size,
			() => change({ size }),
		);
	}
	const outline = optionRow(rows, 4, "OUTLINE");
	option(
		outline,
		"ON",
		() => current().outline,
		() => change({ outline: true }),
	);
	option(
		outline,
		"OFF",
		() => !current().outline,
		() => change({ outline: false }),
	);

	// Preview on a dark and a light half, since maps range from night to bright daylight.
	const preview = create(
		"Frame",
		{
			AnchorPoint: new Vector2(1, 0),
			Position: new UDim2(1, 0, 0, 48),
			Size: UDim2.fromOffset(160, 160),
			BackgroundColor3: Color3.fromRGB(30, 32, 40),
			BorderSizePixel: 0,
			ClipsDescendants: true,
		},
		panel,
	);
	create(
		"Frame",
		{
			Position: UDim2.fromScale(0.5, 0),
			Size: UDim2.fromScale(0.5, 1),
			BackgroundColor3: Color3.fromRGB(205, 210, 215),
			BorderSizePixel: 0,
		},
		preview,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, preview);
	const previewCrosshair = createCrosshairFrame(preview);
	previewCrosshair.ZIndex = 2;

	onCrosshairChanged(() => {
		drawCrosshair(previewCrosshair, getCrosshairSettings());
		refresh();
	});
	drawCrosshair(previewCrosshair, getCrosshairSettings());
	refresh();
	registerMenuPanel(PANEL_ID, panel);
}

export function initSettingsScreen() {
	build();
	addMenuButton("SETTINGS", 7, () => toggleMenuPanel(PANEL_ID));
}
