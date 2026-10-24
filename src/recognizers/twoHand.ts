// Two-Handed Spatial & Temporal Recognizers
// Extracted from DunJun:
// - GestureSystem.update() (L322-372): Triangle / Diamond normal & centroid solver
// - LongGestureSystem.clapOps() (L604-658): Double-clap hysteresis state machine
// - LongGestureSystem.areHandsCrossed() (L599-602): Hands-crossed detector

import {
  BLAST_CHARGE_DURATION_MS,
  BLAST_COOLDOWN_MS,
  BLAST_FORWARD_DOT,
  BLAST_PALM_DIST,
  BLAST_THRUST_SPEED,
  CLAP_CONTACT_DIST,
  CLAP_DOUBLE_MAX_MS,
  CLAP_DOUBLE_MIN_MS,
  CLAP_ORIGIN_MIN_DIST,
  CLAP_SEPARATION_DIST,
  FLOATS_PER_JOINT,
  JOINT_INDEX,
  TRIANGLE_FINGER_DOT,
  TRIANGLE_THUMB_DIST,
  TRIANGLE_TIP_DIST,
} from '../constants.js';
import { v3Cross, v3Dist, v3Dot, v3Len, v3Normalize, v3Sub } from '../math/vec3.js';
import type { BlastState, HaathConfig, SingleHandState, TriangleState, TwoHandState } from '../types.js';

// Pre-allocated module-level scratch vectors for zero-GC triangle math
const _dL = new Float32Array(3);
const _dR = new Float32Array(3);
const _apex = new Float32Array(3);
const _base = new Float32Array(3);
const _u = new Float32Array(3);
const _w = new Float32Array(3);

export function createTwoHandState(): TwoHandState {
  return {
    fingerCount: 0,
    handsCrossed: false,
    wristDistance: Infinity,
    clap: {
      state: 'separated',
      singleClap: false,
      doubleClap: false,
    },
    triangle: {
      active: false,
      centroid: new Float32Array(3),
      normal: new Float32Array([0, 0, -1]),
    },
    blast: {
      active: false,
      triggered: false,
      charge: 0,
      origin: new Float32Array(3),
      direction: new Float32Array([0, 0, -1]),
    },
  };
}

/**
 * Evaluates bimanual triangle / diamond formation from left and right joint pose buffers.
 * Ensures forward normal aims into -Z (nz <= 0).
 */
export function evaluateTriangleFromPoses(
  leftBuf: Float32Array,
  leftOffset: number,
  rightBuf: Float32Array,
  rightOffset: number,
  out: TriangleState,
  tipDistThreshold: number = TRIANGLE_TIP_DIST,
  thumbDistThreshold: number = TRIANGLE_THUMB_DIST,
  fingerDotThreshold: number = TRIANGLE_FINGER_DOT,
): TriangleState {
  const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const lThumbTipOff = leftOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const rThumbTipOff = rightOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;

  // 1. Proximity Gates
  const tipDist = v3Dist(leftBuf, rightBuf, lIndexTipOff, rIndexTipOff);
  if (tipDist > tipDistThreshold) {
    out.active = false;
    return out;
  }

  const thumbDist = v3Dist(leftBuf, rightBuf, lThumbTipOff, rThumbTipOff);
  if (thumbDist > thumbDistThreshold) {
    out.active = false;
    return out;
  }

  // 2. Convergence Gate (index vectors angled toward each other)
  const lIndexInterOff = leftOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const rIndexInterOff = rightOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;

  v3Sub(_dL, leftBuf, leftBuf, lIndexTipOff, lIndexInterOff);
  v3Normalize(_dL, _dL);

  v3Sub(_dR, rightBuf, rightBuf, rIndexTipOff, rIndexInterOff);
  v3Normalize(_dR, _dR);

  if (v3Dot(_dL, _dR) > fingerDotThreshold) {
    out.active = false;
    return out;
  }

  // 3. 3D Plane Normal & Centroid
  const lIx = leftBuf[lIndexTipOff];
  const lIy = leftBuf[lIndexTipOff + 1];
  const lIz = leftBuf[lIndexTipOff + 2];

  const rIx = rightBuf[rIndexTipOff];
  const rIy = rightBuf[rIndexTipOff + 1];
  const rIz = rightBuf[rIndexTipOff + 2];

  const lTx = leftBuf[lThumbTipOff];
  const lTy = leftBuf[lThumbTipOff + 1];
  const lTz = leftBuf[lThumbTipOff + 2];

  const rTx = rightBuf[rThumbTipOff];
  const rTy = rightBuf[rThumbTipOff + 1];
  const rTz = rightBuf[rThumbTipOff + 2];

  // Apex midpoint a = 0.5 * (L_index_tip + R_index_tip)
  _apex[0] = 0.5 * (lIx + rIx);
  _apex[1] = 0.5 * (lIy + rIy);
  _apex[2] = 0.5 * (lIz + rIz);

  // Base midpoint b = 0.5 * (L_thumb_tip + R_thumb_tip)
  _base[0] = 0.5 * (lTx + rTx);
  _base[1] = 0.5 * (lTy + rTy);
  _base[2] = 0.5 * (lTz + rTz);

  // Centroid c = 0.5 * (a + b)
  out.centroid[0] = 0.5 * (_apex[0] + _base[0]);
  out.centroid[1] = 0.5 * (_apex[1] + _base[1]);
  out.centroid[2] = 0.5 * (_apex[2] + _base[2]);

  // Up vector u = a - b
  _u[0] = _apex[0] - _base[0];
  _u[1] = _apex[1] - _base[1];
  _u[2] = _apex[2] - _base[2];

  // Across vector w = 0.5*(R_index + R_thumb) - 0.5*(L_index + L_thumb)
  _w[0] = 0.5 * (rIx + rTx) - 0.5 * (lIx + lTx);
  _w[1] = 0.5 * (rIy + rTy) - 0.5 * (lIy + lTy);
  _w[2] = 0.5 * (rIz + rTz) - 0.5 * (lIz + lTz);

  // Normal n = normalize(u x w), negated if nz > 0 so n always aims into -Z
  v3Cross(out.normal, _u, _w);
  v3Normalize(out.normal, out.normal);
  if (out.normal[2] > 0) {
    out.normal[0] = -out.normal[0];
    out.normal[1] = -out.normal[1];
    out.normal[2] = -out.normal[2];
  }

  out.active = true;
  return out;
}

/**
 * Evaluates bimanual dual-palm forward burst / charge orb (Blast archetype).
 * Active when both hands are open and palms face forward within palmDistThreshold.
 * Fires triggered pulse on ballistic forward thrust or full charge.
 */
export function evaluateBlastFromPoses(
  left: SingleHandState,
  right: SingleHandState,
  deltaSeconds: number,
  nowMs: number,
  out: BlastState,
  lastFireMsRef: { lastFireMs: number },
  palmDistThreshold: number = BLAST_PALM_DIST,
  forwardDotThreshold: number = BLAST_FORWARD_DOT,
  chargeDurationMs: number = BLAST_CHARGE_DURATION_MS,
  thrustSpeedThreshold: number = BLAST_THRUST_SPEED,
  cooldownMs: number = BLAST_COOLDOWN_MS,
): BlastState {
  out.triggered = false;

  if (!left.tracked || !right.tracked) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  // Both hands must be open or thehro or have >= 4 fingers extended
  const leftOpen = left.sign === 'open' || left.sign === 'thehro' || left.fingers.count >= 4;
  const rightOpen = right.sign === 'open' || right.sign === 'thehro' || right.fingers.count >= 4;
  if (!leftOpen || !rightOpen) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  // Distance between palms
  const palmDist = v3Dist(left.palmPosition, right.palmPosition);
  if (palmDist > palmDistThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  // Both palms must face forward (into -Z)
  if (left.palmForward[2] > forwardDotThreshold || right.palmForward[2] > forwardDotThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  out.active = true;

  // Origin: midpoint between palm positions
  out.origin[0] = 0.5 * (left.palmPosition[0] + right.palmPosition[0]);
  out.origin[1] = 0.5 * (left.palmPosition[1] + right.palmPosition[1]);
  out.origin[2] = 0.5 * (left.palmPosition[2] + right.palmPosition[2]);

  // Direction: normalized average of palmForward vectors
  out.direction[0] = 0.5 * (left.palmForward[0] + right.palmForward[0]);
  out.direction[1] = 0.5 * (left.palmForward[1] + right.palmForward[1]);
  out.direction[2] = 0.5 * (left.palmForward[2] + right.palmForward[2]);
  v3Normalize(out.direction, out.direction);
  if (out.direction[2] > 0) {
    out.direction[0] = -out.direction[0];
    out.direction[1] = -out.direction[1];
    out.direction[2] = -out.direction[2];
  }

  // Accumulate charge
  if (chargeDurationMs > 0 && deltaSeconds > 0) {
    out.charge = Math.min(1.0, out.charge + (deltaSeconds * 1000) / chargeDurationMs);
  } else {
    out.charge = 1.0;
  }

  // Check forward thrust velocity or full charge trigger
  const avgSpeed = 0.5 * (left.motionSpeed + right.motionSpeed);
  const thrustingForward =
    avgSpeed >= thrustSpeedThreshold && (left.velocity[2] < 0 || right.velocity[2] < 0);
  const canFire = nowMs - lastFireMsRef.lastFireMs > cooldownMs;

  if (canFire && (thrustingForward || out.charge >= 1.0)) {
    out.triggered = true;
    lastFireMsRef.lastFireMs = nowMs;
    out.charge = 0;
  }

  return out;
}

export class TwoHandRecognizer {
  private _lastClapTimeMs = -Infinity;
  private readonly _blastFireRef = { lastFireMs: -Infinity };
  public readonly state: TwoHandState = createTwoHandState();

  update(
    left: SingleHandState,
    right: SingleHandState,
    leftBuf: Float32Array | null,
    leftOffset: number,
    rightBuf: Float32Array | null,
    rightOffset: number,
    nowMs: number,
    config: HaathConfig = {},
    deltaSeconds = 0,
  ): TwoHandState {
    const clapOriginMinDist = config.clapOriginMinDist ?? CLAP_ORIGIN_MIN_DIST;
    const clapSeparationDist = config.clapSeparationDist ?? CLAP_SEPARATION_DIST;
    const clapContactDist = config.clapContactDist ?? CLAP_CONTACT_DIST;
    const clapDoubleMinMs = config.clapDoubleMinMs ?? CLAP_DOUBLE_MIN_MS;
    const clapDoubleMaxMs = config.clapDoubleMaxMs ?? CLAP_DOUBLE_MAX_MS;
    const triangleTipDist = config.triangleTipDist ?? TRIANGLE_TIP_DIST;
    const triangleThumbDist = config.triangleThumbDist ?? TRIANGLE_THUMB_DIST;
    const triangleFingerDot = config.triangleFingerDot ?? TRIANGLE_FINGER_DOT;
    const blastPalmDist = config.blastPalmDist ?? BLAST_PALM_DIST;
    const blastForwardDot = config.blastForwardDot ?? BLAST_FORWARD_DOT;
    const blastChargeDurationMs = config.blastChargeDurationMs ?? BLAST_CHARGE_DURATION_MS;
    const blastThrustSpeed = config.blastThrustSpeed ?? BLAST_THRUST_SPEED;
    const blastCooldownMs = config.blastCooldownMs ?? BLAST_COOLDOWN_MS;

    this.state.clap.singleClap = false;
    this.state.clap.doubleClap = false;

    this.state.fingerCount =
      (left.tracked ? left.fingers.count : 0) + (right.tracked ? right.fingers.count : 0);

    if (!left.tracked || !right.tracked) {
      this.state.handsCrossed = false;
      this.state.wristDistance = Infinity;
      this.state.triangle.active = false;
      this.state.blast.active = false;
      this.state.blast.triggered = false;
      this.state.blast.charge = 0;
      return this.state;
    }

    // 1. Hands-crossed check: leftWrist.x > rightWrist.x
    this.state.handsCrossed = left.wristPosition[0] > right.wristPosition[0];

    // 2. Euclidean wrist distance
    const wristDist = v3Dist(left.wristPosition, right.wristPosition);
    this.state.wristDistance = wristDist;

    // 3. Double-Clap Hysteresis State Machine
    const leftOriginDist = v3Len(left.wristPosition);
    const rightOriginDist = v3Len(right.wristPosition);
    const validOrigin =
      leftOriginDist >= clapOriginMinDist && rightOriginDist >= clapOriginMinDist;

    if (validOrigin) {
      if (this.state.clap.state === 'contact') {
        if (wristDist >= clapSeparationDist) {
          this.state.clap.state = 'separated';
        }
      } else {
        const dualFist = left.sign === 'fist' && right.sign === 'fist';
        if (wristDist <= clapContactDist && !dualFist) {
          this.state.clap.state = 'contact';
          this.state.clap.singleClap = true;

          const elapsed = nowMs - this._lastClapTimeMs;
          if (
            this._lastClapTimeMs > -Infinity &&
            elapsed >= clapDoubleMinMs &&
            elapsed <= clapDoubleMaxMs
          ) {
            this.state.clap.doubleClap = true;
            this._lastClapTimeMs = -Infinity;
          } else {
            this._lastClapTimeMs = nowMs;
          }
        }
      }
    }

    // 4. Bimanual Triangle / Diamond Solver
    if (leftBuf && leftOffset >= 0 && rightBuf && rightOffset >= 0) {
      evaluateTriangleFromPoses(
        leftBuf,
        leftOffset,
        rightBuf,
        rightOffset,
        this.state.triangle,
        triangleTipDist,
        triangleThumbDist,
        triangleFingerDot,
      );
    } else {
      this.state.triangle.active = false;
    }

    // 5. Dual-Palm Blast / Burst Solver
    evaluateBlastFromPoses(
      left,
      right,
      deltaSeconds,
      nowMs,
      this.state.blast,
      this._blastFireRef,
      blastPalmDist,
      blastForwardDot,
      blastChargeDurationMs,
      blastThrustSpeed,
      blastCooldownMs,
    );

    return this.state;
  }

  reset(): void {
    this._lastClapTimeMs = -Infinity;
    this._blastFireRef.lastFireMs = -Infinity;
    this.state.fingerCount = 0;
    this.state.handsCrossed = false;
    this.state.wristDistance = Infinity;
    this.state.clap.state = 'separated';
    this.state.clap.singleClap = false;
    this.state.clap.doubleClap = false;
    this.state.triangle.active = false;
    this.state.blast.active = false;
    this.state.blast.triggered = false;
    this.state.blast.charge = 0;
  }
}
