// Analytical O(1) collision & debounce primitives - zero allocation
// Extracted from DunJun src/systems/collide.ts & src/systems/spell.ts

import { COLLISION_DURATION } from '../constants.js';
import type { Vec3 } from '../types.js';
import type { Vec3Like } from './vec3.js';

function getX(v: Vec3Like): number {
  return 'x' in v ? v.x : v[0];
}

function getY(v: Vec3Like): number {
  return 'y' in v ? v.y : v[1];
}

function getZ(v: Vec3Like): number {
  return 'z' in v ? v.z : v[2];
}

/**
 * Fast squared-distance sphere-sphere overlap check:
 * (ax - bx)^2 + (ay - by)^2 + (az - bz)^2 < (ar + br)^2
 */
export function intersectSphereSphere(
  ax: number,
  ay: number,
  az: number,
  ar: number,
  bx: number,
  by: number,
  bz: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  const r = ar + br;
  return dx * dx + dy * dy + dz * dz < r * r;
}

/**
 * Cylinder-sphere (laser beam) intersection check:
 * Projects r = targetPos - origin onto laser unit normal n.
 * Rejects if axial projection a < 0 or a > length.
 * Hits when lateral distance squared ||r||^2 - a^2 < (width / 2 + targetRadius)^2.
 */
export function intersectLaserSphere(
  origin: Vec3Like,
  normal: Vec3Like,
  length: number,
  width: number,
  targetPos: Vec3Like,
  targetRadius: number,
): boolean {
  const rx = getX(targetPos) - getX(origin);
  const ry = getY(targetPos) - getY(origin);
  const rz = getZ(targetPos) - getZ(origin);

  const nx = getX(normal);
  const ny = getY(normal);
  const nz = getZ(normal);

  const a = rx * nx + ry * ny + rz * nz;
  if (a < 0 || a > length) return false;

  const rSq = rx * rx + ry * ry + rz * rz;
  const lateralSq = Math.max(0, rSq - a * a);
  const hitRadius = width * 0.5 + targetRadius;
  return lateralSq < hitRadius * hitRadius;
}

/**
 * Thin-disc-sphere intersection check:
 * Axial offset a = (targetPos - discPos) . discNormal, lateral squared ||r||^2 - a^2.
 * Hits when |a| < (discTube + targetRadius) and lateralSq < (discRadius + targetRadius)^2.
 */
export function intersectDiscSphere(
  discPos: Vec3Like,
  discNormal: Vec3Like,
  discRadius: number,
  discTube: number,
  targetPos: Vec3Like,
  targetRadius: number,
): boolean {
  const rx = getX(targetPos) - getX(discPos);
  const ry = getY(targetPos) - getY(discPos);
  const rz = getZ(targetPos) - getZ(discPos);

  const nx = getX(discNormal);
  const ny = getY(discNormal);
  const nz = getZ(discNormal);

  const a = rx * nx + ry * ny + rz * nz;
  if (Math.abs(a) >= discTube + targetRadius) return false;

  const rSq = rx * rx + ry * ry + rz * rz;
  const lateralSq = Math.max(0, rSq - a * a);
  const radialThreshold = discRadius + targetRadius;
  return lateralSq < radialThreshold * radialThreshold;
}

/**
 * Encapsulates DunJun's isActiveCollision / isTimeOutCollision (COLLISION_DURATION = 200ms)
 * so a single strike against a target cannot double-trigger within 200ms for the same
 * (targetId, hand, gesture).
 */
export class CollisionCooldownTracker {
  private readonly _cooldownMs: number;
  private readonly _lastHitTime = new Map<string, number>();

  constructor(cooldownMs: number = COLLISION_DURATION) {
    this._cooldownMs = cooldownMs;
  }

  private _key(targetId: string | number, hand: string, gesture: string): string {
    return `${targetId}:${hand}:${gesture}`;
  }

  /**
   * Returns true if the collision for (targetId, hand, gesture) is currently inside its cooldown window.
   */
  isActiveCollision(
    targetId: string | number,
    hand: string,
    gesture: string,
    nowMs: number = performance.now(),
  ): boolean {
    const prev = this._lastHitTime.get(this._key(targetId, hand, gesture));
    if (prev === undefined) return false;
    return nowMs - prev < this._cooldownMs;
  }

  /**
   * Returns true if the cooldown has elapsed (ready to trigger again).
   */
  isTimeOutCollision(
    targetId: string | number,
    hand: string,
    gesture: string,
    nowMs: number = performance.now(),
  ): boolean {
    return !this.isActiveCollision(targetId, hand, gesture, nowMs);
  }

  /**
   * Checks if (targetId, hand, gesture) can trigger at nowMs; if so, records the timestamp and returns true.
   */
  tryTrigger(
    targetId: string | number,
    hand: string,
    gesture: string,
    nowMs: number = performance.now(),
  ): boolean {
    const key = this._key(targetId, hand, gesture);
    const prev = this._lastHitTime.get(key);
    if (prev !== undefined && nowMs - prev < this._cooldownMs) {
      return false;
    }
    this._lastHitTime.set(key, nowMs);
    return true;
  }

  reset(): void {
    this._lastHitTime.clear();
  }
}

// --- Phase 1 Vec3 wrapper aliases (zero-GC) ---

export function sphereSphere(
  centerA: Vec3,
  radiusA: number,
  centerB: Vec3,
  radiusB: number,
): boolean {
  return intersectSphereSphere(
    centerA.x,
    centerA.y,
    centerA.z,
    radiusA,
    centerB.x,
    centerB.y,
    centerB.z,
    radiusB,
  );
}

export function cylinderSphere(
  origin: Vec3,
  dir: Vec3,
  length: number,
  radius: number,
  sphereCenter: Vec3,
  sphereRadius: number,
): boolean {
  return intersectLaserSphere(origin, dir, length, radius * 2, sphereCenter, sphereRadius);
}

export function discSphere(
  discCenter: Vec3,
  discNormal: Vec3,
  discRadius: number,
  sphereCenter: Vec3,
  sphereRadius: number,
): boolean {
  return intersectDiscSphere(discCenter, discNormal, discRadius, 0, sphereCenter, sphereRadius);
}
