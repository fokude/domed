// Every player spawns at the same size and body shape, so nobody is a smaller target and maps
// read the same for everyone. Players keep their clothes, accessories, face and skin colours;
// scales and body parts are Roblox's defaults, the same as bots. See docs/ARCHITECTURE.md.

const Players = game.GetService("Players");

const descriptions = new Map<Player, HumanoidDescription>();

// Copies only the look of `own` onto a default description.
function standardize(own: HumanoidDescription): HumanoidDescription {
	const description = new Instance("HumanoidDescription");
	description.Shirt = own.Shirt;
	description.Pants = own.Pants;
	description.GraphicTShirt = own.GraphicTShirt;
	description.Face = own.Face;
	description.HeadColor = own.HeadColor;
	description.TorsoColor = own.TorsoColor;
	description.LeftArmColor = own.LeftArmColor;
	description.RightArmColor = own.RightArmColor;
	description.LeftLegColor = own.LeftLegColor;
	description.RightLegColor = own.RightLegColor;
	description.SetAccessories(own.GetAccessories(true), true);
	return description;
}

// Yields the first time, while the player's avatar is fetched. Falls back to a default avatar.
function descriptionFor(player: Player): HumanoidDescription {
	const cached = descriptions.get(player);
	if (cached) return cached;
	// @rbxts/types types the user id as an unrelated `User` type; the engine takes a number.
	const [ok, own] = pcall(() => Players.GetHumanoidDescriptionFromUserIdAsync(player.UserId as never));
	const description = ok ? standardize(own) : new Instance("HumanoidDescription");
	if (player.Parent) descriptions.set(player, description);
	return description;
}

// Use instead of player.LoadCharacter(). Yields; `stillWanted` is checked again afterwards in
// case things changed while the avatar was fetched.
export function loadStandardCharacter(player: Player, stillWanted: () => boolean) {
	const description = descriptionFor(player);
	if (player.Parent && stillWanted()) player.LoadCharacterWithHumanoidDescriptionAsync(description);
}

// Fetches early so the first spawn doesn't wait.
export function prefetchAvatar(player: Player) {
	task.spawn(() => descriptionFor(player));
}

export function forgetAvatar(player: Player) {
	descriptions.delete(player);
}
