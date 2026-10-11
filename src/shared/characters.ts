// Safe reads of player characters, which can be missing, dead, or still loading.

export function isAlive(character: Model): boolean {
	const humanoid = character.FindFirstChildOfClass("Humanoid");
	return humanoid !== undefined && humanoid.Health > 0;
}

// The player's HumanoidRootPart, if they have a living character.
export function getLiveRoot(player: Player): BasePart | undefined {
	const character = player.Character;
	const root = character?.FindFirstChild("HumanoidRootPart");
	return character && isAlive(character) && root?.IsA("BasePart") ? root : undefined;
}
