// Player settings, saved in the profile. Clients send changes; the server cleans them with
// sanitizeSettings before saving, since remote arguments can't be trusted.

export type CrosshairStyle = "Dot" | "Cross" | "CrossDot" | "Circle";
export type CrosshairColor = "White" | "Green" | "Cyan" | "Yellow" | "Pink";
export type CrosshairSize = "Small" | "Medium" | "Large";

export const CROSSHAIR_STYLES: CrosshairStyle[] = ["Dot", "Cross", "CrossDot", "Circle"];
export const CROSSHAIR_SIZES: CrosshairSize[] = ["Small", "Medium", "Large"];
// No red: the hitmarker flashes red on headshots, and red is hard to see for the most common
// kinds of color blindness.
export const CROSSHAIR_COLORS: Record<CrosshairColor, Color3> = {
	White: new Color3(1, 1, 1),
	Green: Color3.fromRGB(0, 255, 120),
	Cyan: Color3.fromRGB(0, 220, 255),
	Yellow: Color3.fromRGB(255, 230, 0),
	Pink: Color3.fromRGB(255, 80, 200),
};
export const CROSSHAIR_COLOR_IDS: CrosshairColor[] = ["White", "Green", "Cyan", "Yellow", "Pink"];

export interface CrosshairSettings {
	style: CrosshairStyle;
	color: CrosshairColor;
	size: CrosshairSize;
	outline: boolean;
}

export interface PlayerSettings {
	crosshair: CrosshairSettings;
}

// Matches the original crosshair: a small white dot with a dark outline.
export const DEFAULT_SETTINGS: PlayerSettings = {
	crosshair: { style: "Dot", color: "White", size: "Small", outline: true },
};

function pick<T extends defined>(options: T[], value: unknown, fallback: T): T {
	return options.find((option) => option === value) ?? fallback;
}

// Turns untrusted input into valid settings, falling back to defaults field by field.
export function sanitizeSettings(input: unknown): PlayerSettings {
	const crosshair = typeIs(input, "table") ? (input as { crosshair?: unknown }).crosshair : undefined;
	const raw = (typeIs(crosshair, "table") ? crosshair : {}) as Partial<Record<keyof CrosshairSettings, unknown>>;
	const fallback = DEFAULT_SETTINGS.crosshair;
	return {
		crosshair: {
			style: pick(CROSSHAIR_STYLES, raw.style, fallback.style),
			color: pick(CROSSHAIR_COLOR_IDS, raw.color, fallback.color),
			size: pick(CROSSHAIR_SIZES, raw.size, fallback.size),
			outline: typeIs(raw.outline, "boolean") ? raw.outline : fallback.outline,
		},
	};
}
