// Body-shot knockback, shared by player shots and bot shots: a push along the shot with a
// little lift, so targets leave the ground instead of being dragged by friction.

import { WeaponConfig } from "shared/config";

export function knockbackImpulse(shotDirection: Vector3): Vector3 {
	const strength = WeaponConfig.bodyShotKnockback;
	return shotDirection.Unit.mul(strength).add(new Vector3(0, strength * WeaponConfig.bodyShotLift, 0));
}
