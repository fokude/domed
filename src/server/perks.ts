// Perk orbs: glowing pickups at fixed spots on the map, each respawning on its own timer.
// Taking one grants its effect (stored as player attributes) and is announced to everyone.
// Perks are lost on death. See docs/PERKS.md.

import { getLiveRoot } from "shared/characters";
import { PerkConfig } from "shared/config";
import { DEPLOYED_ATTRIBUTE, getMatchState } from "shared/matchState";
import { PERK_INFO, PerkAttribute, PerkId } from "shared/perks";
import { Remotes } from "shared/remotes";
import { LoadedMap } from "./maps/loader";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const Workspace = game.GetService("Workspace");

const TICK_INTERVAL = 0.1;
const ORB_HEIGHT = 3;
const SHIELD_BUBBLE = "PerkShieldBubble";

interface Orb {
	perk: PerkId;
	position: Vector3;
	part: Part;
	label: BillboardGui;
	light: PointLight;
	availableAt: number;
	respawn: number;
}

let orbs: Orb[] = [];
let folder: Folder | undefined;
let sinceTick = 0;

function buildOrb(parent: Instance, perk: PerkId, position: Vector3, respawn?: number): Orb {
	const info = PERK_INFO[perk];
	const part = new Instance("Part");
	part.Name = `${perk}Orb`;
	part.Shape = Enum.PartType.Ball;
	part.Size = Vector3.one.mul(2.5);
	part.Position = position.add(new Vector3(0, ORB_HEIGHT, 0));
	part.Anchored = true;
	part.CanCollide = false;
	part.CanQuery = false;
	part.CanTouch = false;
	part.Material = Enum.Material.Neon;
	part.Color = info.color;
	part.Parent = parent;

	const light = new Instance("PointLight");
	light.Color = info.color;
	light.Range = 14;
	light.Brightness = 2;
	light.Parent = part;

	const label = new Instance("BillboardGui");
	label.Size = UDim2.fromOffset(140, 24);
	label.StudsOffset = new Vector3(0, 2.5, 0);
	label.MaxDistance = 150;
	label.Parent = part;
	const text = new Instance("TextLabel");
	text.Size = UDim2.fromScale(1, 1);
	text.BackgroundTransparency = 1;
	text.Font = Enum.Font.GothamBlack;
	text.TextScaled = true;
	text.TextColor3 = info.color;
	text.TextStrokeTransparency = 0.3;
	text.Text = info.name;
	text.Parent = label;

	return { perk, position, part, label, light, availableAt: 0, respawn: respawn ?? PerkConfig.respawn[perk] };
}

function setOrbVisible(orb: Orb, visible: boolean) {
	orb.part.Transparency = visible ? 0 : 1;
	orb.label.Enabled = visible;
	orb.light.Enabled = visible;
}

// A see-through bubble welded around a character, showing they're shielded.
export function addShieldBubble(character: Model) {
	const root = character.FindFirstChild("HumanoidRootPart");
	if (!root?.IsA("BasePart") || character.FindFirstChild(SHIELD_BUBBLE)) return;
	const bubble = new Instance("Part");
	bubble.Name = SHIELD_BUBBLE;
	bubble.Shape = Enum.PartType.Ball;
	bubble.Size = Vector3.one.mul(7);
	bubble.Material = Enum.Material.ForceField;
	bubble.Color = PERK_INFO.Shield.color;
	bubble.CanCollide = false;
	bubble.CanQuery = false;
	bubble.CanTouch = false;
	bubble.Massless = true;
	bubble.CastShadow = false;
	bubble.CFrame = root.CFrame;
	const weld = new Instance("WeldConstraint");
	weld.Part0 = root;
	weld.Part1 = bubble;
	weld.Parent = bubble;
	bubble.Parent = character;
}

function grant(player: Player, perk: PerkId) {
	const now = Workspace.GetServerTimeNow();
	if (perk === "SuperJump") player.SetAttribute(PerkAttribute.SuperJump, true);
	else if (perk === "Overcharge")
		player.SetAttribute(PerkAttribute.OverchargeUntil, now + PerkConfig.overchargeDuration);
	else if (perk === "Radar") player.SetAttribute(PerkAttribute.RadarUntil, now + PerkConfig.radarDuration);
	else {
		player.SetAttribute(PerkAttribute.Shield, PerkConfig.shieldHits);
		if (player.Character) addShieldBubble(player.Character);
		setShieldBubbleStrength(player.Character, PerkConfig.shieldHits);
	}
	Remotes.PerkTaken.FireAllClients(player, perk);
}

function clearPerks(player: Player) {
	for (const attribute of [
		PerkAttribute.SuperJump,
		PerkAttribute.Shield,
		PerkAttribute.OverchargeUntil,
		PerkAttribute.RadarUntil,
	]) {
		player.SetAttribute(attribute, undefined);
	}
	player.Character?.FindFirstChild(SHIELD_BUBBLE)?.Destroy();
}

function tick() {
	const phase = getMatchState("Phase");
	if (phase !== "Playing" && phase !== "Warmup") return;
	const now = os.clock();
	for (const orb of orbs) {
		if (now < orb.availableAt) continue;
		if (orb.part.Transparency !== 0) setOrbVisible(orb, true);
		const taker = Players.GetPlayers().find((player) => {
			const root = getLiveRoot(player);
			return (
				root !== undefined &&
				player.GetAttribute(DEPLOYED_ATTRIBUTE) === true &&
				root.Position.sub(orb.part.Position).Magnitude <= PerkConfig.pickupRadius
			);
		});
		if (!taker) continue;
		grant(taker, orb.perk);
		orb.availableAt = now + orb.respawn;
		setOrbVisible(orb, false);
	}
}

// The bubble fades as the shield weakens, so attackers can see it's about to break.
function shieldTransparency(hitsLeft: number): number {
	return (1 - hitsLeft / PerkConfig.shieldHits) * 0.6;
}

// Shows a shield's strength on its bubble: fainter as it weakens, gone at zero.
export function setShieldBubbleStrength(character: Model | undefined, hitsLeft: number) {
	const bubble = character?.FindFirstChild(SHIELD_BUBBLE);
	if (hitsLeft <= 0) bubble?.Destroy();
	else if (bubble?.IsA("BasePart")) bubble.Transparency = shieldTransparency(hitsLeft);
}

// Hits a shield has left after taking a hit: a headshot breaks it outright, other hits wear it
// down by one. The one rule for players and training dummies.
export function shieldHitsAfter(hitsLeft: number, isHead: boolean): number {
	return isHead ? 0 : math.max(0, hitsLeft - 1);
}

// "absorbed": the shield took the hit and holds. "broken": it took the hit and broke.
export type ShieldHit = "absorbed" | "broken";

// Applies a hit to a player's shield, if they have one. A headshot breaks it outright; body
// shots wear it down until it breaks.
export function hitShield(player: Player, isHead: boolean): ShieldHit | undefined {
	const hits = player.GetAttribute(PerkAttribute.Shield);
	if (!typeIs(hits, "number") || hits <= 0) return undefined;
	const left = shieldHitsAfter(hits, isHead);
	player.SetAttribute(PerkAttribute.Shield, left > 0 ? left : undefined);
	setShieldBubbleStrength(player.Character, left);
	return left > 0 ? "absorbed" : "broken";
}

// Places the map's orbs for a new match.
export function startPerks(map: LoadedMap) {
	stopPerks();
	folder = new Instance("Folder");
	folder.Name = "Perks";
	orbs = map.perks.map((spawn) => buildOrb(folder!, spawn.perk, spawn.position, spawn.respawn));
	folder.Parent = map.arena;
}

export function stopPerks() {
	folder?.Destroy();
	folder = undefined;
	orbs = [];
	Players.GetPlayers().forEach(clearPerks);
}

export function startPerkSystem() {
	RunService.Heartbeat.Connect((dt) => {
		sinceTick += dt;
		if (sinceTick < TICK_INTERVAL) return;
		sinceTick = 0;
		tick();
	});
	// Perks are lost on death: every new character starts clean.
	const watch = (player: Player) => player.CharacterAdded.Connect(() => clearPerks(player));
	Players.PlayerAdded.Connect(watch);
	Players.GetPlayers().forEach(watch);
	Remotes.UsePerk.OnServerEvent.Connect((player, perk) => {
		if (perk === "SuperJump") player.SetAttribute(PerkAttribute.SuperJump, undefined);
	});
}
