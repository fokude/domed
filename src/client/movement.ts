// Quake-style movement layered on top of the default Humanoid.
//
// On the ground the Humanoid moves the character as usual. While airborne this module
// owns horizontal velocity: the Humanoid's built-in air control would otherwise drag
// the player back toward WalkSpeed and make bunny hopping impossible.

import { MovementConfig as Config } from "shared/config";

const CollectionService = game.GetService("CollectionService");
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const WALL_PROBE_RADIUS = 1.4;
const JUMP_PAD_DEBOUNCE = 0.4;
// A scroll tick counts as a jump press for this long, so scrolling just before landing still hops.
const SCROLL_JUMP_BUFFER = 0.1;
// If physics leaves us below this fraction of our intended speed, something blocked us.
const BLOCKED_SPEED_RATIO = 0.3;

const player = Players.LocalPlayer;

let character: Model | undefined;
let humanoid: Humanoid | undefined;
let root: BasePart | undefined;

let airVelocity = Vector3.zero;
let groundTime = math.huge;
let wasAirborne = false;
let keepVelocityOnTakeoff = false;
let doubleJumpUsed = false;
// MoveDirection is zeroed while airborne, so input handlers read the last real value here.
let wishDirection = Vector3.zero;
let lastPadLaunch = 0;
let lastScrollAt = -math.huge;

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
	return result.Magnitude > Config.maxAirSpeed ? result.Unit.mul(Config.maxAirSpeed) : result;
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

function onPreSimulation(dt: number) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
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
			airVelocity = airVelocity.mul(1 - Config.bhopSpeedLoss);
		} else {
			airVelocity = flatten(actualVelocity);
		}
	}

	airVelocity = airAccelerate(airVelocity, wishDirection, dt);
	airVelocity = clipToWalls(airVelocity, rootPart, dt);

	// Ground friction during a bhop legitimately lowers the takeoff frame's speed, so only
	// trust the physics reading after we've been airborne for a frame.
	const actualFlat = flatten(actualVelocity);
	if (!justTookOff && actualFlat.Magnitude < airVelocity.Magnitude * BLOCKED_SPEED_RATIO) {
		airVelocity = actualFlat;
	}

	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, actualVelocity.Y, airVelocity.Z);
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
	const isJumpKey = input.KeyCode === Enum.KeyCode.Space || input.KeyCode === Enum.KeyCode.ButtonA;
	if (!isJumpKey || UserInputService.GetFocusedTextBox()) return;

	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	if (!isAirborne(currentHumanoid) || doubleJumpUsed) return;
	doubleJumpUsed = true;

	// Like UT's double jump, the second jump redirects momentum toward the input direction.
	const wish = flatten(wishDirection);
	if (wish.Magnitude > 0.01) {
		airVelocity = wish.Unit.mul(math.max(airVelocity.Magnitude, Config.walkSpeed));
	}
	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, Config.doubleJumpVelocity, airVelocity.Z);
}

// Scroll wheel jumps on the ground only; in the air it buffers a hop and never spends the double jump.
function onInputChanged(input: InputObject, gameProcessed: boolean) {
	if (input.UserInputType !== Enum.UserInputType.MouseWheel || gameProcessed) return;
	lastScrollAt = os.clock();

	const body = getLiveBody();
	if (body && !isAirborne(body[0])) body[0].ChangeState(Enum.HumanoidStateType.Jumping);
}

function onCharacterAdded(newCharacter: Model) {
	character = newCharacter;
	humanoid = newCharacter.WaitForChild("Humanoid") as Humanoid;
	root = newCharacter.WaitForChild("HumanoidRootPart") as BasePart;
	wallProbeParams.FilterDescendantsInstances = [newCharacter];

	airVelocity = Vector3.zero;
	groundTime = math.huge;
	wasAirborne = false;
	keepVelocityOnTakeoff = false;
	doubleJumpUsed = false;
}

function hookJumpPad(pad: Instance) {
	if (!pad.IsA("BasePart")) return;
	pad.Touched.Connect((hit) => {
		if (!character || !hit.IsDescendantOf(character)) return;
		const launch = pad.GetAttribute("Launch");
		if (!typeIs(launch, "Vector3") || os.clock() - lastPadLaunch < JUMP_PAD_DEBOUNCE) return;
		lastPadLaunch = os.clock();
		launchCharacter(launch, false);
	});
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
	airVelocity = flatten(newVelocity);
	if (!additive) doubleJumpUsed = false;

	if (!isAirborne(currentHumanoid)) {
		keepVelocityOnTakeoff = true;
		// Freefall rather than Jumping: entering Jumping would overwrite our vertical velocity.
		currentHumanoid.ChangeState(Enum.HumanoidStateType.Freefall);
	}
	rootPart.AssemblyLinearVelocity = newVelocity;
}

export function initMovement() {
	player.CharacterAdded.Connect(onCharacterAdded);
	if (player.Character) task.spawn(onCharacterAdded, player.Character);

	for (const pad of CollectionService.GetTagged("JumpPad")) {
		hookJumpPad(pad);
	}
	CollectionService.GetInstanceAddedSignal("JumpPad").Connect(hookJumpPad);

	RunService.PreSimulation.Connect(onPreSimulation);
	RunService.RenderStepped.Connect(onRenderStepped);
	UserInputService.InputBegan.Connect(onInputBegan);
	UserInputService.InputChanged.Connect(onInputChanged);
}
