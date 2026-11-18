// Analytical O(1) collision & debounce primitives - zero allocation
// Extracted from DunJun src/systems/collide.ts & src/systems/spell.ts

import {
  COLLISION_DURATION,
  FINGERTIP_COLLIDER_RADIUS,
  PALM_COLLIDER_RADIUS,
  WRIST_COLLIDER_RADIUS,
} from '../constants.js';
import type { HandContactMode, HandContactPart, SingleHandState, Vec3 } from '../types.js';
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

// --- Hand-to-environment sphere collision (zero-GC) ---

/**
 * Options for testHandSphereCollision. Callers in a render loop should pre-allocate one
 * options object and mutate its fields per call instead of passing a fresh literal.
 */
export interface HandSphereTestOptions {
  /** 'touch' / 'consumable' (default 'touch'): any tracked pose. 'combat': non-idle gesture required. */
  mode?: HandContactMode;
  /** Host-resolved gesture override (emulator, game-specific promotion). Defaults to hand.gesture. */
  gesture?: string;
  /** Combat only: gesture (or list of gestures) the hand must be in to register. */
  requiredGesture?: string | readonly string[];
  /** Extra radius added to every hand sphere (meters). Default 0. */
  radiusPadding?: number;
  /** Palm sphere radius at palmCenter. Default PALM_COLLIDER_RADIUS (0.05). */
  palmRadius?: number;
  /** Wrist sphere radius at wristPosition. Default WRIST_COLLIDER_RADIUS (0.04). */
  wristRadius?: number;
  /** Index fingertip sphere radius at indexTipPosition. Default FINGERTIP_COLLIDER_RADIUS (0.025). */
  fingertipRadius?: number;
  /** Swept palm-vs-target test between previous and current frame. Default true. */
  swept?: boolean;
  /** Target world position on the previous frame. When omitted, the target is treated as static. */
  prevTargetX?: number;
  prevTargetY?: number;
  prevTargetZ?: number;
  /** Combat only: debounce repeated hits via CollisionCooldownTracker.tryTrigger. */
  cooldown?: CollisionCooldownTracker;
  /** Cooldown key: target id. Required for the cooldown to apply. */
  targetId?: string | number;
  /** Cooldown key: hand name. Defaults to the handedness passed by Haath.testHandSphere. */
  handedness?: string;
  /** Cooldown timestamp. Defaults to performance.now(). */
  nowMs?: number;
}

function sphereHitSq(
  hx: number, hy: number, hz: number,
  tx: number, ty: number, tz: number,
  r: number,
): boolean {
  const dx = hx - tx;
  const dy = hy - ty;
  const dz = hz - tz;
  return dx * dx + dy * dy + dz * dz < r * r;
}

function gestureMatches(gesture: string, required: string | readonly string[]): boolean {
  if (typeof required === 'string') return gesture === required;
  for (let i = 0; i < required.length; i++) {
    if (required[i] === gesture) return true;
  }
  return false;
}

/**
 * Tests a target sphere against the full anatomical hand volume:
 * palm center, wrist, and index fingertip spheres, plus an optional swept palm segment
 * (relative motion of palm vs target between frames) so fast targets cannot tunnel.
 *
 * Returns the hand part that registered contact, or 'none'. Allocation-free.
 */
export function testHandSphereCollision(
  hand: SingleHandState,
  targetX: number,
  targetY: number,
  targetZ: number,
  targetRadius: number,
  options?: HandSphereTestOptions,
  handedness: string = '',
): HandContactPart {
  if (!hand || !hand.tracked) return 'none';

  const mode = options?.mode ?? 'touch';
  const gesture = options?.gesture ?? hand.gesture;

  // Gesture gating first (cheap): combat needs an active, matching gesture
  if (mode === 'combat') {
    if (!gesture || gesture === 'idle') return 'none';
    const required = options?.requiredGesture;
    if (required !== undefined && !gestureMatches(gesture, required)) return 'none';
  }

  const pad = options?.radiusPadding ?? 0;
  const palmR = (options?.palmRadius ?? PALM_COLLIDER_RADIUS) + pad + targetRadius;
  const wristR = (options?.wristRadius ?? WRIST_COLLIDER_RADIUS) + pad + targetRadius;
  const tipR = (options?.fingertipRadius ?? FINGERTIP_COLLIDER_RADIUS) + pad + targetRadius;

  const pc = hand.palmCenter;
  const wr = hand.wristPosition;
  const tp = hand.indexTipPosition;

  let part: HandContactPart = 'none';
  if (sphereHitSq(pc[0], pc[1], pc[2], targetX, targetY, targetZ, palmR)) {
    part = 'palm';
  } else if (sphereHitSq(tp[0], tp[1], tp[2], targetX, targetY, targetZ, tipR)) {
    part = 'indexTip';
  } else if (sphereHitSq(wr[0], wr[1], wr[2], targetX, targetY, targetZ, wristR)) {
    part = 'wrist';
  } else if ((options?.swept ?? true) && hand.hasPrevPalm) {
    // Relative segment r0 -> r1 (palm minus target, previous and current frame);
    // contact when its closest approach to the origin is inside the palm radius.
    const ptx = options?.prevTargetX ?? targetX;
    const pty = options?.prevTargetY ?? targetY;
    const ptz = options?.prevTargetZ ?? targetZ;
    const pp = hand.prevPalmCenter;
    const r0x = pp[0] - ptx;
    const r0y = pp[1] - pty;
    const r0z = pp[2] - ptz;
    const dx = (pc[0] - targetX) - r0x;
    const dy = (pc[1] - targetY) - r0y;
    const dz = (pc[2] - targetZ) - r0z;
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd > 1e-12) {
      let t = -(r0x * dx + r0y * dy + r0z * dz) / dd;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const cx = r0x + t * dx;
      const cy = r0y + t * dy;
      const cz = r0z + t * dz;
      if (cx * cx + cy * cy + cz * cz < palmR * palmR) part = 'sweep';
    }
  }

  if (part === 'none') return 'none';

  // Combat debounce: a hit inside the cooldown window is suppressed
  if (mode === 'combat' && options?.cooldown && options.targetId !== undefined) {
    const handKey = options.handedness ?? handedness;
    if (!options.cooldown.tryTrigger(options.targetId, handKey, gesture, options.nowMs)) {
      return 'none';
    }
  }

  return part;
}
