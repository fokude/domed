// Match flow, scoring, and server-side validation of railgun shots.
//
// Hit detection is client-authoritative: the shooter's client says what it hit and the
// server checks the claim is plausible (fire rate, shooter position, target position,
// line of sight). With fast movement and tiny head hitboxes, server-side raycasts would
// miss constantly because of latency.

import { MatchConfig, MovementConfig, WeaponConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { buildArena } from "./mapBuilder";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

// Seconds of client clock drift allowed when checking fire rate.
const COOLDOWN_LENIENCY = 0.15;
// Positional slack for lag checks: a fixed margin plus distance covered in this many seconds.
const LAG_BASE_STUDS = 6;
const LAG_SECONDS = 0.35;

type MatchState = "Playing" | "Intermission";
type StatName = "Kills" | "Deaths";

const arena = buildArena();
let matchState: MatchState = "Playing";
const lastShotAt = new Map<Player, number>();

const lineOfSightParams = new RaycastParams();
lineOfSightParams.FilterType = Enum.RaycastFilterType.Include;
lineOfSightParams.FilterDescendantsInstances = [arena];

Players.RespawnTime = MatchConfig.respawnTime;

function getStat(player: Player, name: StatName): IntValue | undefined {
	const stat = player.FindFirstChild("leaderstats")?.FindFirstChild(name);
	return stat?.IsA("IntValue") ? stat : undefined;
}

function lagTolerance(character: Model): number {
	const root = character.FindFirstChild("HumanoidRootPart");
	const speed = root?.IsA("BasePart") ? root.AssemblyLinearVelocity.Magnitude : 0;
	return LAG_BASE_STUDS + speed * LAG_SECONDS;
}

function endRound(winner: Player) {
	matchState = "Intermission";
	Remotes.Announce.FireAllClients(`${winner.DisplayName} WINS`, MatchConfig.intermissionTime);
	task.wait(MatchConfig.intermissionTime);

	for (const player of Players.GetPlayers()) {
		for (const name of ["Kills", "Deaths"] as const) {
			const stat = getStat(player, name);
			if (stat) stat.Value = 0;
		}
		player.LoadCharacter();
	}

	matchState = "Playing";
	Remotes.Announce.FireAllClients("FIGHT", 1.5);
}

function awardKill(shooter: Player, victim: Player) {
	const kills = getStat(shooter, "Kills");
	if (kills) kills.Value += 1;

	Remotes.HitConfirm.FireClient(shooter, "kill");
	Remotes.KillFeed.FireAllClients(shooter, victim);

	if (kills && kills.Value >= MatchConfig.killsToWin && matchState === "Playing") {
		task.spawn(endRound, shooter);
	}
}

function onFire(shooter: Player, origin: unknown, hitPosition: unknown, claimedHitPart: unknown) {
	if (!typeIs(origin, "Vector3") || !typeIs(hitPosition, "Vector3")) return;
	if (claimedHitPart !== undefined && !(typeIs(claimedHitPart, "Instance") && claimedHitPart.IsA("BasePart"))) {
		return;
	}
	const hitPart = claimedHitPart as BasePart | undefined;

	const character = shooter.Character;
	const humanoid = character?.FindFirstChildOfClass("Humanoid");
	const head = character?.FindFirstChild("Head");
	if (!character || !humanoid || humanoid.Health <= 0 || !head?.IsA("BasePart")) return;

	const now = os.clock();
	if (now - (lastShotAt.get(shooter) ?? -math.huge) < WeaponConfig.cooldown - COOLDOWN_LENIENCY) return;
	lastShotAt.set(shooter, now);

	if (origin.sub(head.Position).Magnitude > lagTolerance(character)) return;
	if (hitPosition.sub(origin).Magnitude > WeaponConfig.range + 1) return;

	Remotes.ShotFired.FireAllClients(shooter, origin, hitPosition);

	if (!hitPart || matchState !== "Playing") return;

	const victimCharacter = hitPart.Parent;
	if (!victimCharacter?.IsA("Model")) return;
	const victim = Players.GetPlayerFromCharacter(victimCharacter);
	if (!victim || victim === shooter) return;

	const victimHumanoid = victimCharacter.FindFirstChildOfClass("Humanoid");
	if (!victimHumanoid || victimHumanoid.Health <= 0) return;
	if (victimCharacter.FindFirstChildOfClass("ForceField")) return;
	if (hitPosition.sub(hitPart.Position).Magnitude > hitPart.Size.Magnitude + lagTolerance(victimCharacter)) return;

	const shotVector = hitPosition.sub(origin);
	const obstruction = Workspace.Raycast(origin, shotVector, lineOfSightParams);
	if (obstruction && obstruction.Position.sub(hitPosition).Magnitude > 1.5) return;

	if (hitPart.Name === "Head") {
		victimHumanoid.Health = 0;
		awardKill(shooter, victim);
	} else {
		const knockback = WeaponConfig.bodyShotKnockback;
		Remotes.Knockback.FireClient(victim, shotVector.Unit.mul(knockback).add(new Vector3(0, knockback * 0.35, 0)));
		Remotes.HitConfirm.FireClient(shooter, "body");
	}
}

function onCharacterAdded(player: Player, character: Model) {
	const humanoid = character.WaitForChild("Humanoid") as Humanoid;
	humanoid.WalkSpeed = MovementConfig.walkSpeed;
	humanoid.UseJumpPower = false;
	humanoid.JumpHeight = MovementConfig.jumpHeight;

	humanoid.Died.Connect(() => {
		const deaths = getStat(player, "Deaths");
		if (deaths) deaths.Value += 1;
	});
}

function onPlayerAdded(player: Player) {
	const leaderstats = new Instance("Folder");
	leaderstats.Name = "leaderstats";
	for (const name of ["Kills", "Deaths"]) {
		const stat = new Instance("IntValue");
		stat.Name = name;
		stat.Parent = leaderstats;
	}
	leaderstats.Parent = player;

	player.CharacterAdded.Connect((character) => onCharacterAdded(player, character));
	if (player.Character) onCharacterAdded(player, player.Character);
}

Remotes.Fire.OnServerEvent.Connect(onFire);
Players.PlayerAdded.Connect(onPlayerAdded);
Players.PlayerRemoving.Connect((player) => lastShotAt.delete(player));
for (const player of Players.GetPlayers()) {
	onPlayerAdded(player);
}
