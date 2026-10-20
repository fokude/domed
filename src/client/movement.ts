// Movement layered on top of the default Humanoid: Quake-style air strafing and bunny
// hopping, and a double jump.
//
// On the ground the Humanoid moves the character as usual. While airborne this module owns horizontal velocity: the Humanoid's built-in air control would
// otherwise drag the player back toward WalkSpeed and make bunny hopping impossible.
//
// docs/MOVEMENT.md explains each move and the engine quirks this code works around.

import { MovementConfig as Config, CtfConfig, PerkConfig } from "shared/config";
import { MapAttribute, MapTag } from "shared/mapMarkers";
import { CARRYING_FLAG_ATTRIBUTE } from "shared/matchState";
import { PerkAttribute } from "shared/perks";
import { Remotes } from "shared/remotes";

const CollectionService = game.GetService("CollectionService");
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const WALL_PROBE_RADIUS = 1.4;
const JUMP_PAD_DEBOUNCE = 0.4;
// How far below the root to look for a jump pad. The root sits about 3 studs above the feet;
// the extra catches players landing on a pad from above.
const PAD_PROBE_DEPTH = 5;
// A scroll tick counts as a jump press for this long, so scrolling just before landing still hops.
const SCROLL_JUMP_BUFFER = 0.1;
// If physics leaves us below this fraction of our intended speed, something blocked us.
const BLOCKED_SPEED_RATIO = 0.3;

const player = Players.LocalPlayer;

let humanoid: Humanoid | undefined;
let root: BasePart | undefined;

let airVelocity = Vector3.zero;
let groundTime = math.huge;
let wasAirborne = false;
let keepVelocityOnTakeoff = false;
// Vertical speed to apply on the first airborne frame of a launch from the ground.
let pendingVerticalVelocity: number | undefined;
let doubleJumpUsed = false;
// Air speed cap, raised by a rocket jump and easing back to maxAirSpeed.
let launchSpeedCap = 0;
// Set when a Super Jump is used, until the server clears the perk, so it can't fire twice.
let superJumpSpent = false;
// MoveDirection is zeroed while airborne, so input handlers read the last real value here.
let wishDirection = Vector3.zero;
let lastPadLaunch = 0;
const jumpPads: BasePart[] = [];
const padProbeParams = new RaycastParams();
padProbeParams.FilterType = Enum.RaycastFilterType.Include;
padProbeParams.FilterDescendantsInstances = [];
let lastScrollAt = -math.huge;

// Moves other modules react to, such as onboarding tips.
export type MovementEvent = "bhop" | "doubleJump";
const movementListeners: ((event: MovementEvent) => void)[] = [];

export function onMovementEvent(listener: (event: MovementEvent) => void) {
	movementListeners.push(listener);
}

function emit(event: MovementEvent) {
	for (const listener of movementListeners) listener(event);
}

const wallProbeParams = new RaycastParams();
wallProbeParams.FilterType = Enum.RaycastFilterType.Exclude;

function flatten(vector: Vector3): Vector3 {
	return new Vector3(vector.X, 0, vector.Z);
}

function isAirborne(target: Humanoid): boolean {
	const state = target.GetState();
	return state === Enum.HumanoidStateType.Freefall || state === Enum.HumanoidStateType.Jumping;
}

function isJumpHeld(): boolean {
	if (UserInputService.GetFocusedTextBox()) return false;
	return (
		UserInputService.IsKeyDown(Enum.KeyCode.Space) ||
		UserInputService.IsGamepadButtonDown(Enum.UserInputType.Gamepad1, Enum.KeyCode.ButtonA)
	);
}

function wantsToJump(): boolean {
	return isJumpHeld() || os.clock() - lastScrollAt <= SCROLL_JUMP_BUFFER;
}

function getLiveBody(): [Humanoid, BasePart] | undefined {
	if (humanoid && root && humanoid.Health > 0) return [humanoid, root];
	return undefined;
}

// Half-Life's PM_AirAccelerate: only the component of velocity along the wish direction
// is capped, so steering perpendicular to your motion keeps adding speed.
function airAccelerate(velocity: Vector3, wishDirection: Vector3, dt: number): Vector3 {
	const flatWish = flatten(wishDirection);
	if (flatWish.Magnitude < 0.01) return velocity;
	const wish = flatWish.Unit;

	const addSpeed = Config.airSpeedCap - velocity.Dot(wish);
	if (addSpeed <= 0) return velocity;

	const accelSpeed = math.min(Config.airAccelerate * Config.walkSpeed * dt, addSpeed);
	const result = velocity.add(wish.mul(accelSpeed));
	return result;
}

// Removes the part of our velocity that points into a wall, so we slide along it.
function clipToWalls(velocity: Vector3, rootPart: BasePart, dt: number): Vector3 {
	const speed = velocity.Magnitude;
	if (speed < 0.1) return velocity;

	const hit = Workspace.Spherecast(
		rootPart.Position,
		WALL_PROBE_RADIUS,
		velocity.Unit.mul(speed * dt + 1),
		wallProbeParams,
	);
	if (!hit) return velocity;

	const flatNormal = flatten(hit.Normal);
	if (flatNormal.Magnitude < 0.1) return velocity;
	const normal = flatNormal.Unit;

	const intoWall = velocity.Dot(normal);
	return intoWall < 0 ? velocity.sub(normal.mul(intoWall)) : velocity;
}

// Chained hops below hopBoostMaxSpeed gain a little speed each, to get through the sluggish
// low-speed range where strafing barely accelerates. Above it, speed comes from strafing only.
function boostHop(velocity: Vector3): Vector3 {
	const speed = velocity.Magnitude;
	if (speed < 1 || speed >= Config.hopBoostMaxSpeed) return velocity;
	return velocity.Unit.mul(math.min(speed * (1 + Config.hopBoost), Config.hopBoostMaxSpeed));
}

function onPreSimulation(dt: number) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	checkJumpPad(rootPart);
	const actualVelocity = rootPart.AssemblyLinearVelocity;

	if (!isAirborne(currentHumanoid)) {
		if (wasAirborne) {
			wasAirborne = false;
			groundTime = 0;
			doubleJumpUsed = false;
			// Re-jump on the landing frame itself; waiting for the Humanoid's own auto-jump
			// leaves us on the ground long enough for friction to eat the hop.
			if (wantsToJump()) currentHumanoid.ChangeState(Enum.HumanoidStateType.Jumping);
		}
		groundTime += dt;
		return;
	}

	// The control script has already set this frame's MoveDirection. Read it as our wish
	// direction, then zero it so the Humanoid's air control doesn't fight our velocity.
	wishDirection = currentHumanoid.MoveDirection;
	currentHumanoid.Move(Vector3.zero);

	const justTookOff = !wasAirborne;
	if (justTookOff) {
		wasAirborne = true;
		if (keepVelocityOnTakeoff) {
			keepVelocityOnTakeoff = false;
		} else if (groundTime <= Config.bhopWindow) {
			airVelocity = boostHop(airVelocity.mul(1 - Config.bhopSpeedLoss));
			emit("bhop");
		} else {
			airVelocity = flatten(actualVelocity);
		}
	}

	airVelocity = airAccelerate(airVelocity, wishDirection, dt);
	// Rocket jumps can pass maxAirSpeed; the cap eases back down so strafing can't hold the extra.
	// Flag carriers stay at their own cap so defenders can catch them.
	launchSpeedCap = math.max(Config.maxAirSpeed, launchSpeedCap - Config.rocketJumpSpeedDecay * dt);
	const maxSpeed = player.GetAttribute(CARRYING_FLAG_ATTRIBUTE) === true ? CtfConfig.carrierMaxSpeed : launchSpeedCap;
	if (airVelocity.Magnitude > maxSpeed) airVelocity = airVelocity.Unit.mul(maxSpeed);
	airVelocity = clipToWalls(airVelocity, rootPart, dt);

	// Ground friction during a bhop legitimately lowers the takeoff frame's speed, so only
	// trust the physics reading after we've been airborne for a frame.
	const actualFlat = flatten(actualVelocity);
	if (!justTookOff && actualFlat.Magnitude < airVelocity.Magnitude * BLOCKED_SPEED_RATIO) {
		airVelocity = actualFlat;
	}

	let verticalVelocity = actualVelocity.Y;
	if (justTookOff && pendingVerticalVelocity !== undefined) {
		verticalVelocity = pendingVerticalVelocity;
		pendingVerticalVelocity = undefined;
	}

	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, verticalVelocity, airVelocity.Z);
}

function onRenderStepped(dt: number) {
	const camera = Workspace.CurrentCamera;
	if (!camera) return;
	const range = Config.maxAirSpeed - Config.walkSpeed;
	const speedFraction = math.clamp((getSpeed() - Config.walkSpeed) / range, 0, 1);
	const targetFov = Config.baseFov + Config.speedFovBoost * speedFraction;
	camera.FieldOfView += (targetFov - camera.FieldOfView) * math.min(1, dt * 8);
}

function onInputBegan(input: InputObject) {
	if (UserInputService.GetFocusedTextBox()) return;
	if (input.KeyCode !== Enum.KeyCode.Space && input.KeyCode !== Enum.KeyCode.ButtonA) return;

	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	if (!isAirborne(currentHumanoid) || doubleJumpUsed) return;
	doubleJumpUsed = true;
	emit("doubleJump");

	// Like UT's double jump, the second jump redirects momentum toward the input direction.
	const wish = flatten(wishDirection);
	if (wish.Magnitude > 0.01) {
		airVelocity = wish.Unit.mul(math.max(airVelocity.Magnitude, Config.walkSpeed));
	}
	// A held Super Jump perk turns this double jump into a much bigger one.
	let jumpVelocity = Config.doubleJumpVelocity;
	if (player.GetAttribute(PerkAttribute.SuperJump) === true && !superJumpSpent) {
		superJumpSpent = true;
		jumpVelocity = PerkConfig.superJumpVelocity;
		Remotes.UsePerk.FireServer("SuperJump");
	}
	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, jumpVelocity, airVelocity.Z);
}

// Scroll wheel jumps on the ground only; in the air it buffers a hop and never spends the double jump.
function onInputChanged(input: InputObject, gameProcessed: boolean) {
	if (input.UserInputType !== Enum.UserInputType.MouseWheel || gameProcessed) return;
	lastScrollAt = os.clock();

	const body = getLiveBody();
	if (body && !isAirborne(body[0])) body[0].ChangeState(Enum.HumanoidStateType.Jumping);
}

function onCharacterAdded(newCharacter: Model) {
	humanoid = newCharacter.WaitForChild("Humanoid") as Humanoid;
	root = newCharacter.WaitForChild("HumanoidRootPart") as BasePart;
	wallProbeParams.FilterDescendantsInstances = [newCharacter];

	airVelocity = Vector3.zero;
	groundTime = math.huge;
	wasAirborne = false;
	keepVelocityOnTakeoff = false;
	doubleJumpUsed = false;
	launchSpeedCap = 0;
}

function trackJumpPad(pad: Instance) {
	if (!pad.IsA("BasePart")) return;
	jumpPads.push(pad);
	padProbeParams.FilterDescendantsInstances = jumpPads;
}

function untrackJumpPad(pad: Instance) {
	const index = jumpPads.indexOf(pad as BasePart);
	if (index === -1) return;
	jumpPads.remove(index);
	padProbeParams.FilterDescendantsInstances = jumpPads;
}

// Pads are found by probing under the feet every frame rather than with Touched: R15
// characters hover on their HipHeight, so their feet often never touch the pad.
function checkJumpPad(rootPart: BasePart) {
	if (os.clock() - lastPadLaunch < JUMP_PAD_DEBOUNCE) return;
	const hit = Workspace.Raycast(rootPart.Position, new Vector3(0, -PAD_PROBE_DEPTH, 0), padProbeParams);
	const launch = hit?.Instance.GetAttribute(MapAttribute.Launch);
	if (!typeIs(launch, "Vector3")) return;
	lastPadLaunch = os.clock();

	// The pad sets vertical speed and adds its push to the player's own momentum, so they keep
	// the direction they were moving in rather than being redirected onto a fixed path.
	const momentum = flatten(rootPart.AssemblyLinearVelocity);
	launchCharacter(new Vector3(momentum.X + launch.X, launch.Y, momentum.Z + launch.Z), false);
}

export function getSpeed(): number {
	return root ? flatten(root.AssemblyLinearVelocity).Magnitude : 0;
}

// Sets (or adds to) the character's velocity in a way the air controller won't undo.
export function launchCharacter(velocity: Vector3, additive: boolean) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;

	const newVelocity = additive ? rootPart.AssemblyLinearVelocity.add(velocity) : velocity;
	if (!additive) doubleJumpUsed = false;
	applyLaunch(currentHumanoid, rootPart, newVelocity);
}

// Blasts the character by `blast` on top of its momentum. An upward blast cancels any fall
// first, so a rocket jump always lifts.
export function rocketJumpCharacter(blast: Vector3) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	const current = rootPart.AssemblyLinearVelocity;
	const startY = blast.Y > 0 ? math.max(current.Y, 0) : current.Y;
	const newVelocity = new Vector3(current.X, startY, current.Z).add(blast);
	launchSpeedCap = math.max(launchSpeedCap, flatten(newVelocity).Magnitude);
	applyLaunch(currentHumanoid, rootPart, newVelocity);
}

function applyLaunch(currentHumanoid: Humanoid, rootPart: BasePart, newVelocity: Vector3) {
	airVelocity = flatten(newVelocity);
	if (!isAirborne(currentHumanoid)) {
		// A real jump is the only reliable way off the ground: in any other state the Humanoid
		// sees the floor and snaps back to walking. The jump's own vertical speed is replaced on
		// the first airborne frame.
		keepVelocityOnTakeoff = true;
		pendingVerticalVelocity = newVelocity.Y;
		currentHumanoid.ChangeState(Enum.HumanoidStateType.Jumping);
	}
	rootPart.AssemblyLinearVelocity = newVelocity;
}

export function initMovement() {
	player.GetAttributeChangedSignal(PerkAttribute.SuperJump).Connect(() => {
		if (player.GetAttribute(PerkAttribute.SuperJump) === true) superJumpSpent = false;
	});
	player.CharacterAdded.Connect(onCharacterAdded);
	if (player.Character) task.spawn(onCharacterAdded, player.Character);

	CollectionService.GetTagged(MapTag.JumpPad).forEach(trackJumpPad);
	CollectionService.GetInstanceAddedSignal(MapTag.JumpPad).Connect(trackJumpPad);
	CollectionService.GetInstanceRemovedSignal(MapTag.JumpPad).Connect(untrackJumpPad);

	RunService.PreSimulation.Connect(onPreSimulation);
	RunService.RenderStepped.Connect(onRenderStepped);
	UserInputService.InputBegan.Connect(onInputBegan);
	UserInputService.InputChanged.Connect(onInputChanged);
}
