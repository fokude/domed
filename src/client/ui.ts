// Colors shared across the UI, so screens stay consistent.
export const Palette = {
	White: new Color3(1, 1, 1),
	Black: new Color3(0, 0, 0),
	Muted: Color3.fromRGB(170, 175, 185),
	// DOMED red: Play button, kill text, selection.
	Accent: Color3.fromRGB(255, 60, 40),
	Panel: Color3.fromRGB(20, 22, 28),
	Cyan: Color3.fromRGB(0, 220, 255),
};

// Creates an instance and applies properties before parenting, so it never appears half-built.
export function create<T extends keyof CreatableInstances>(
	className: T,
	properties: Partial<WritableInstanceProperties<CreatableInstances[T]>>,
	parent: Instance,
): CreatableInstances[T] {
	const instance = new Instance(className);
	for (const [key, value] of pairs(properties)) {
		(instance as unknown as Record<string, unknown>)[key as string] = value;
	}
	instance.Parent = parent;
	return instance;
}
