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
  CLAP_FACING_TOLERANCE_FRAMES,
  CLAP_ORIGIN_MIN_DIST,
  CLAP_PALM_OPPOSE_DOT,
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
const _v1 = new Float32Array(3);
const _v2 = new Float32Array(3);

// Clap palm-facing scratch (palm normals, palm-center delta, proximal-joint edges)
const _nL = new Float32Array(3);
const _nR = new Float32Array(3);
const _palmEdgeA = new Float32Array(3);
const _palmEdgeB = new Float32Array(3);
const _centerDelta = new Float32Array(3);

// Palm normal sign per hand. Raw cross(thumbProx->pinkyProx, thumbProx->middleProx) is outward
// for the LEFT palm (palm-down, fingers forward gives -Y) but points out of the dorsal side for
// the RIGHT palm (palm-down gives +Y), so the right hand is negated. Mirrored joint layout.
const PALM_NORMAL_SIGN_LEFT = 1;
const PALM_NORMAL_SIGN_RIGHT = -1;

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

  // Definite 3-point plane:
  // P1 = Left Index Tip (lIx, lIy, lIz)
  // P2 = Right Index Tip (rIx, rIy, rIz)
  // P3 = Left Thumb Tip (lTx, lTy, lTz)
  // v1 = P2 - P1 (across along top edge)
  _v1[0] = rIx - lIx;
  _v1[1] = rIy - lIy;
  _v1[2] = rIz - lIz;

  // v2 = P3 - P1 (down left edge)
  _v2[0] = lTx - lIx;
  _v2[1] = lTy - lIy;
  _v2[2] = lTz - lIz;

  // Normal n = normalize(v1 x v2)
  v3Cross(out.normal, _v1, _v2);
  const nLen = Math.sqrt(out.normal[0]*out.normal[0] + out.normal[1]*out.normal[1] + out.normal[2]*out.normal[2]);
  if (nLen > 1e-4) {
    out.normal[0] /= nLen;
    out.normal[1] /= nLen;
    out.normal[2] /= nLen;
  } else {
    // Collinear/degenerated fallback pointing forward into dungeon (-Z)
    out.normal[0] = 0;
    out.normal[1] = 0;
    out.normal[2] = -1;
  }

  // Enforce orientation pointing in the opposite direction of enemy travel towards player (forward in -Z)
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
function _extractPalm(hand: any): [number, number, number] {
  const p = hand.palmCenter ?? hand.palmPosition;
  if (!p) return [0, 0, 0];
  if (Array.isArray(p) || p instanceof Float32Array) return [p[0], p[1], p[2]];
  return [p.x ?? 0, p.y ?? 0, p.z ?? 0];
}

function _extractForward(hand: any): [number, number, number] {
  const f = hand.palmForward;
  if (!f) return [0, 0, -1];
  if (Array.isArray(f) || f instanceof Float32Array) return [f[0], f[1], f[2]];
  return [f.x ?? 0, f.y ?? 0, f.z ?? -1];
}

export function evaluateBlastFromPoses(
  ...args: any[]
): BlastState {
  let left: SingleHandState;
  let right: SingleHandState;
  let deltaSeconds: number;
  let nowMs: number;
  let out: BlastState;
  let lastFireMsRef: { lastFireMs: number };
  let palmDistThreshold: number = BLAST_PALM_DIST;
  let forwardDotThreshold: number = BLAST_FORWARD_DOT;
  let chargeDurationMs: number = BLAST_CHARGE_DURATION_MS;
  let thrustSpeedThreshold: number = BLAST_THRUST_SPEED;
  let cooldownMs: number = BLAST_COOLDOWN_MS;

  if (args.length >= 7 && (args[0] instanceof Float32Array || typeof args[1] === 'number')) {
    // Pose buffer overload: (leftBuf, leftOffset, rightBuf, rightOffset, left, right, out, deltaSeconds, nowMs, ...)
    left = args[4];
    right = args[5];
    out = args[6];
    deltaSeconds = args[7] ?? 0.016;
    nowMs = args[8] ?? 0;
    lastFireMsRef = args[9] ?? { lastFireMs: -Infinity };
    if (args[10] !== undefined) palmDistThreshold = args[10];
    if (args[11] !== undefined) forwardDotThreshold = args[11];
    if (args[12] !== undefined) chargeDurationMs = args[12];
    if (args[13] !== undefined) thrustSpeedThreshold = args[13];
    if (args[14] !== undefined) cooldownMs = args[14];
  } else {
    // Direct state overload: (left, right, deltaSeconds, nowMs, out, lastFireMsRef, ...)
    left = args[0];
    right = args[1];
    deltaSeconds = args[2] ?? 0.016;
    nowMs = args[3] ?? 0;
    out = args[4];
    lastFireMsRef = args[5] ?? { lastFireMs: -Infinity };
    if (args[6] !== undefined) palmDistThreshold = args[6];
    if (args[7] !== undefined) forwardDotThreshold = args[7];
    if (args[8] !== undefined) chargeDurationMs = args[8];
    if (args[9] !== undefined) thrustSpeedThreshold = args[9];
    if (args[10] !== undefined) cooldownMs = args[10];
  }

  out.triggered = false;

  if (!left || !right || !left.tracked || !right.tracked) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  // Both hands must be open or thehro or have >= 4 fingers extended
  const leftOpen = left.sign === 'open' || left.sign === 'thehro' || (left.fingers && left.fingers.count >= 4);
  const rightOpen = right.sign === 'open' || right.sign === 'thehro' || (right.fingers && right.fingers.count >= 4);
  if (!leftOpen || !rightOpen) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  const leftPalm = _extractPalm(left);
  const rightPalm = _extractPalm(right);
  const leftForward = _extractForward(left);
  const rightForward = _extractForward(right);

  // Distance between palms
  const palmDist = Math.hypot(leftPalm[0] - rightPalm[0], leftPalm[1] - rightPalm[1], leftPalm[2] - rightPalm[2]);
  if (palmDist > palmDistThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  // Both palms must face forward (into -Z)
  if (leftForward[2] > forwardDotThreshold || rightForward[2] > forwardDotThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }

  out.active = true;

  // Origin: midpoint between palm positions
  out.origin[0] = 0.5 * (leftPalm[0] + rightPalm[0]);
  out.origin[1] = 0.5 * (leftPalm[1] + rightPalm[1]);
  out.origin[2] = 0.5 * (leftPalm[2] + rightPalm[2]);

  // Direction: normalized average of palmForward vectors
  out.direction[0] = 0.5 * (leftForward[0] + rightForward[0]);
  out.direction[1] = 0.5 * (leftForward[1] + rightForward[1]);
  out.direction[2] = 0.5 * (leftForward[2] + rightForward[2]);
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
  const lSpeed = (left as any).motionSpeed ?? ((left as any).wristSpeed ?? 0);
  const rSpeed = (right as any).motionSpeed ?? ((right as any).wristSpeed ?? 0);
  const avgSpeed = 0.5 * (lSpeed + rSpeed);
  const lVelZ = left.velocity ? (Array.isArray(left.velocity) || left.velocity instanceof Float32Array ? left.velocity[2] : (left.velocity as any).z ?? 0) : 0;
  const rVelZ = right.velocity ? (Array.isArray(right.velocity) || right.velocity instanceof Float32Array ? right.velocity[2] : (right.velocity as any).z ?? 0) : 0;
  const thrustingForward =
    avgSpeed >= thrustSpeedThreshold && (lVelZ < 0 || rVelZ < 0);
  const canFire = nowMs - lastFireMsRef.lastFireMs > cooldownMs;

  if (canFire && (thrustingForward || out.charge >= 1.0)) {
    out.triggered = true;
    lastFireMsRef.lastFireMs = nowMs;
  }

  return out;
}

/**
 * Palm normal from the proximal joints (thumb, middle, pinky), oriented out of the palm.
 * Writes normalize(sign * cross(thumbProx->pinkyProx, thumbProx->middleProx)) into out.
 * Returns false on degenerate geometry (collinear joints), leaving out unspecified.
 */
function palmNormalFromJoints(buf: Float32Array, offset: number, sign: number, out: Float32Array): boolean {
  const thumbOff = offset + JOINT_INDEX.THUMB_PROXIMAL * FLOATS_PER_JOINT;
  const middleOff = offset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
  const pinkyOff = offset + JOINT_INDEX.PINKY_PROXIMAL * FLOATS_PER_JOINT;

  v3Sub(_palmEdgeA, buf, buf, pinkyOff, thumbOff); // thumbProx -> pinkyProx
  v3Sub(_palmEdgeB, buf, buf, middleOff, thumbOff); // thumbProx -> middleProx
  v3Cross(out, _palmEdgeA, _palmEdgeB);

  const len = v3Len(out);
  if (len < 1e-6) return false;
  const inv = sign / len;
  out[0] *= inv;
  out[1] *= inv;
  out[2] *= inv;
  return true;
}

export class TwoHandRecognizer {
  private _lastClapTimeMs = -Infinity;
  private _frame = 0;
  private _lastPalmFacingFrame = -Infinity;
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
    const clapPalmOpposeDot = config.clapPalmOpposeDot ?? CLAP_PALM_OPPOSE_DOT;
    const clapFacingToleranceFrames = config.clapFacingToleranceFrames ?? CLAP_FACING_TOLERANCE_FRAMES;
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

    // 3a. Palm-facing gate (evaluated every tracked frame so the contact frame can use a short look-back)
    //     - palm normals opposed: dot(nL, nR) < clapPalmOpposeDot
    //     - each palm faces the other hand: dot(nL, cR - cL) > 0 and dot(nR, cL - cR) > 0
    //     Missing joint buffers fail closed (no clap).
    this._frame++;
    let palmFacing = false;
    if (leftBuf && leftOffset >= 0 && rightBuf && rightOffset >= 0
      && palmNormalFromJoints(leftBuf, leftOffset, PALM_NORMAL_SIGN_LEFT, _nL)
      && palmNormalFromJoints(rightBuf, rightOffset, PALM_NORMAL_SIGN_RIGHT, _nR)) {
      const opposed = v3Dot(_nL, _nR) < clapPalmOpposeDot;
      v3Sub(_centerDelta, right.palmCenter, left.palmCenter); // cR - cL
      const leftFaces = v3Dot(_nL, _centerDelta) > 0; // nL . (cR - cL) > 0
      const rightFaces = v3Dot(_nR, _centerDelta) < 0; // nR . (cL - cR) > 0 (negated delta)
      palmFacing = opposed && leftFaces && rightFaces;
    }
    if (palmFacing) this._lastPalmFacingFrame = this._frame;
    const palmFacingRecent = this._frame - this._lastPalmFacingFrame <= clapFacingToleranceFrames;

    if (validOrigin) {
      if (this.state.clap.state === 'contact') {
        if (wristDist >= clapSeparationDist) {
          this.state.clap.state = 'separated';
        }
      } else {
        const dualFist = left.sign === 'fist' && right.sign === 'fist';
        if (wristDist <= clapContactDist && !dualFist && palmFacingRecent) {
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
    this._frame = 0;
    this._lastPalmFacingFrame = -Infinity;
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
