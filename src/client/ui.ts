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
