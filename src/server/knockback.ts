// Knockback from body shots (players' and bots') and shoves: a push along the shot with a
// little lift, so targets leave the ground instead of being dragged by friction.

import { WeaponConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { pauseTopSpeed } from "./progression";

// Seconds after being knocked back during which speed doesn't count toward a player's top
// speed record: speed someone else gave you isn't yours.
const RECORD_PAUSE = 3;

// `scale` multiplies the body-shot strength (shoves push harder).
export function knockbackImpulse(shotDirection: Vector3, scale = 1): Vector3 {
	const strength = WeaponConfig.bodyShotKnockback * scale;
	return shotDirection.Unit.mul(strength).add(new Vector3(0, strength * WeaponConfig.bodyShotLift, 0));
}

// Knocks a player back along a shot. Their client applies the push (it owns their movement).
export function knockBack(victim: Player, shotDirection: Vector3, scale = 1) {
	Remotes.Knockback.FireClient(victim, knockbackImpulse(shotDirection, scale));
	pauseTopSpeed(victim, RECORD_PAUSE);
}
