// Two-Finger Swipe ("brush") Recognizer
// Pose gate: index + middle extended and held together, ring + pinky curled, thumb tucked.
// Motion gate: the index/middle tip midpoint travels SWIPE_MIN_DIST within SWIPE_WINDOW_MS,
// mostly along one screen axis (up/down = world up, left/right = head right) and mostly
// sideways to the finger pointing direction.
//
// Why the motion gate matters: the static classifier labels (*, 1, 1, 0, 0) as 'gun'. A held gun
// is either still (aiming) or moves along the finger axis (recoil), so it can never fire a swipe.
// The 'gun' sign itself is left untouched for backwards compatibility.
//
// Zero per-frame allocation: all sample storage is pre-allocated per hand.

import {
  FLOATS_PER_JOINT,
  JOINT_INDEX,
  SWIPE_AXIS_DOMINANCE,
  SWIPE_COOLDOWN_MS,
  SWIPE_MAX_FINGER_DOT,
  SWIPE_MIN_DIST,
  SWIPE_POSE_GRACE_FRAMES,
  SWIPE_SAMPLE_CAPACITY,
  SWIPE_TIP_GAP,
  SWIPE_WINDOW_MS,
} from '../constants.js';
import type { FingerExtensionState, SwipeState } from '../types.js';
import { isThumbReallyOut } from './singleHand.js';

export interface TwoFingerSwipeConfig {
  tipGap?: number;
  minDist?: number;
  windowMs?: number;
  axisDominance?: number;
  maxFingerDot?: number;
  cooldownMs?: number;
  poseGraceFrames?: number;
  requireThumbTucked?: boolean;
}

export function createSwipeState(): SwipeState {
  return {
    posed: false,
    fired: false,
    direction: 'none',
    distance: 0,
    velocity: 0,
    deltaUp: 0,
    deltaRight: 0,
  };
}

/**
 * True when the hand holds the two-finger brush pose (index + middle together, ring + pinky curled,
 * thumb tucked). Stateless and allocation free.
 */
export function isTwoFingerBrushPose(
  poses: Float32Array,
  frameOffset: number,
  fingers: FingerExtensionState,
  tipGap: number = SWIPE_TIP_GAP,
  requireThumbTucked = true,
): boolean {
  if (!fingers.index || !fingers.middle || fingers.ring || fingers.pinky) return false;
  if (requireThumbTucked && fingers.thumb && isThumbReallyOut(poses, frameOffset)) return false;
  const io = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const mo = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
  const dx = poses[io] - poses[mo];
  const dy = poses[io + 1] - poses[mo + 1];
  const dz = poses[io + 2] - poses[mo + 2];
  return dx * dx + dy * dy + dz * dz <= tipGap * tipGap;
}

/**
 * Per-hand two-finger swipe tracker. Call update() once per tracked frame.
 */
export class TwoFingerSwipeRecognizer {
  private readonly _tipGap: number;
  private readonly _minDist: number;
  private readonly _windowMs: number;
  private readonly _axisDominance: number;
  private readonly _maxFingerDot: number;
  private readonly _cooldownMs: number;
  private readonly _graceFrames: number;
  private readonly _requireThumbTucked: boolean;

  // Ring buffer of [x, y, z, tMs] samples of the index/middle tip midpoint
  private readonly _cap: number;
  private readonly _samples: Float32Array;
  private readonly _times: Float64Array;
  private _head = 0;
  private _count = 0;

  private _lostFrames = 0;
  private _lastFireMs = -Infinity;
  private _hasPrev = false;
  private _prevX = 0;
  private _prevY = 0;
  private _prevZ = 0;

  constructor(config: TwoFingerSwipeConfig = {}) {
    this._tipGap = config.tipGap ?? SWIPE_TIP_GAP;
    this._minDist = config.minDist ?? SWIPE_MIN_DIST;
    this._windowMs = config.windowMs ?? SWIPE_WINDOW_MS;
    this._axisDominance = config.axisDominance ?? SWIPE_AXIS_DOMINANCE;
    this._maxFingerDot = config.maxFingerDot ?? SWIPE_MAX_FINGER_DOT;
    this._cooldownMs = config.cooldownMs ?? SWIPE_COOLDOWN_MS;
    this._graceFrames = config.poseGraceFrames ?? SWIPE_POSE_GRACE_FRAMES;
    this._requireThumbTucked = config.requireThumbTucked ?? true;
    this._cap = SWIPE_SAMPLE_CAPACITY;
    this._samples = new Float32Array(this._cap * 3);
    this._times = new Float64Array(this._cap);
  }

  /**
   * @param headRight Horizontal head-right unit vector [x, y, z] (y should be ~0).
   */
  update(
    poses: Float32Array,
    frameOffset: number,
    fingers: FingerExtensionState,
    aimDirection: Float32Array,
    headRight: Float32Array,
    nowMs: number,
    out: SwipeState,
  ): SwipeState {
    out.fired = false;
    out.deltaUp = 0;
    out.deltaRight = 0;

    const posedNow = isTwoFingerBrushPose(poses, frameOffset, fingers, this._tipGap, this._requireThumbTucked);
    if (!posedNow) {
      // Tolerate a few frames of tracking dropout during a fast stroke before dropping the stroke
      this._lostFrames++;
      if (this._lostFrames > this._graceFrames) {
        this._clearStroke();
        out.posed = false;
      }
      return out;
    }
    this._lostFrames = 0;
    out.posed = true;

    // Midpoint of index and middle tips
    const io = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const mo = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
    const x = 0.5 * (poses[io] + poses[mo]);
    const y = 0.5 * (poses[io + 1] + poses[mo + 1]);
    const z = 0.5 * (poses[io + 2] + poses[mo + 2]);

    const rx = headRight[0];
    const ry = headRight[1];
    const rz = headRight[2];

    // Continuous per-frame deltas (for smooth scrolling consumers)
    if (this._hasPrev) {
      out.deltaUp = y - this._prevY;
      out.deltaRight = (x - this._prevX) * rx + (y - this._prevY) * ry + (z - this._prevZ) * rz;
    }
    this._prevX = x;
    this._prevY = y;
    this._prevZ = z;
    this._hasPrev = true;

    // Push sample
    const slot = this._head;
    this._samples[slot * 3] = x;
    this._samples[slot * 3 + 1] = y;
    this._samples[slot * 3 + 2] = z;
    this._times[slot] = nowMs;
    this._head = (this._head + 1) % this._cap;
    if (this._count < this._cap) this._count++;

    if (nowMs - this._lastFireMs < this._cooldownMs) return out;

    // Oldest sample still inside the time window
    let oldest = -1;
    for (let age = this._count - 1; age >= 1; age--) {
      const s = (this._head - 1 - age + this._cap * 2) % this._cap;
      if (nowMs - this._times[s] <= this._windowMs) {
        oldest = s;
        break;
      }
    }
    if (oldest < 0) return out;

    const dx = x - this._samples[oldest * 3];
    const dy = y - this._samples[oldest * 3 + 1];
    const dz = z - this._samples[oldest * 3 + 2];
    const total = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (total < this._minDist) return out;

    const up = dy;
    const right = dx * rx + dy * ry + dz * rz;
    const absUp = up < 0 ? -up : up;
    const absRight = right < 0 ? -right : right;
    const primary = absUp >= absRight ? absUp : absRight;
    if (primary < this._minDist) return out;
    if (primary / total < this._axisDominance) return out;

    // Reject motion along the finger axis (gun aim / recoil / poke thrust)
    const along = (dx * aimDirection[0] + dy * aimDirection[1] + dz * aimDirection[2]) / total;
    if ((along < 0 ? -along : along) > this._maxFingerDot) return out;

    const dt = nowMs - this._times[oldest];
    out.fired = true;
    out.direction = absUp >= absRight ? (up > 0 ? 'up' : 'down') : right > 0 ? 'right' : 'left';
    out.distance = primary;
    out.velocity = dt > 0 ? primary / (dt / 1000) : 0;
    this._lastFireMs = nowMs;
    // A new stroke is required for the next swipe
    this._count = 0;
    this._head = 0;
    return out;
  }

  private _clearStroke(): void {
    this._count = 0;
    this._head = 0;
    this._hasPrev = false;
    this._lostFrames = 0;
  }

  reset(out?: SwipeState): void {
    this._clearStroke();
    if (out) {
      out.posed = false;
      out.fired = false;
      out.direction = 'none';
      out.distance = 0;
      out.velocity = 0;
      out.deltaUp = 0;
      out.deltaRight = 0;
    }
  }
}
