// RollingTrajectoryBuffer & Multi-Gesture 3D Trajectory Recognizer
// Provides a 5.0s sliding window buffer of key joint anchors,
// dominant-plane projection (Newell / SVD-swept normal), and 3D/2D trajectory recognition for:
// - circle_cw / circle_ccw
// - triangle
// - line_swipe (up / down / left / right / forward)
// - lightning_z
// - infinity (lemniscate / figure-8)
// - spiral_in / spiral_out
// - star (pentagram)
// - cross (+ / plus)

import { FLOATS_PER_JOINT, JOINT_INDEX } from './constants.js';
import type { HandPoseInput, JointName, Vec3 } from './types.js';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'forward';

export type TrajectoryGestureType =
  | 'circle_cw'
  | 'circle_ccw'
  | 'triangle'
  | 'line_swipe'
  | 'line_swipe_up'
  | 'line_swipe_down'
  | 'line_swipe_left'
  | 'line_swipe_right'
  | 'line_swipe_forward'
  | 'lightning_z'
  | 'infinity'
  | 'spiral_in'
  | 'spiral_out'
  | 'star'
  | 'cross';

export interface TrajectorySample {
  timeMs: number;
  x: number;
  y: number;
  z: number;
  joint?: JointName | string;
}

export interface DominantPlane {
  centroid: Float32Array; // [cx, cy, cz]
  normal: Float32Array;   // [nx, ny, nz]
  uAxis: Float32Array;    // [ux, uy, uz]
  vAxis: Float32Array;    // [vx, vy, vz]
  residual: number;       // Average distance of points to plane (meters)
}

export interface TrajectoryMatchResult {
  gesture: TrajectoryGestureType | null;
  confidence: number;            // 0.0 .. 1.0
  direction?: SwipeDirection;    // For line_swipe gestures
  durationMs: number;            // Trajectory duration
  pathLength: number;            // Total arc length (meters)
  sampleCount: number;           // Number of samples analyzed
  dominantPlane: DominantPlane | null;
  centroid: Float32Array;        // 3D center of the gesture
  scores?: Partial<Record<TrajectoryGestureType, number>>;
}

export interface RollingTrajectoryBufferConfig {
  /** Maximum history duration in milliseconds (default: 5000ms = 5.0s) */
  maxDurationMs?: number;
  /** Maximum capacity of pre-allocated ring buffer (default: 500 samples) */
  bufferCapacity?: number;
  /** Minimum samples required to attempt recognition (default: 12) */
  minSamples?: number;
  /** Minimum cumulative path length in meters to avoid static jitter (default: 0.08m) */
  minPathLength?: number;
  /** Default anchor joint name to track when poses are ingested (default: 'index-finger-tip') */
  anchorJoint?: JointName;
  /** Minimum confidence threshold for positive identification (default: 0.65) */
  minConfidence?: number;
}

const DEFAULT_MAX_DURATION_MS = 5000; // 5.0 seconds
const DEFAULT_CAPACITY = 500;
const DEFAULT_MIN_SAMPLES = 12;
const DEFAULT_MIN_PATH_LENGTH = 0.08; // 8cm
const DEFAULT_MIN_CONFIDENCE = 0.65;
const RESAMPLE_POINTS = 32;

// -----------------------------------------------------------------------------
// Canonical 2D Templates (Resampled to 32 normalized points in [-1, 1] range)
// -----------------------------------------------------------------------------

function generateCircleTemplate(clockwise: boolean): Float32Array {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  const sign = clockwise ? -1 : 1;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const t = (i / (RESAMPLE_POINTS - 1)) * 2 * Math.PI * sign;
    pts[i * 2] = Math.cos(t);
    pts[i * 2 + 1] = Math.sin(t);
  }
  return normalizeTemplate(pts);
}

function generateTriangleTemplate(): Float32Array {
  // Equilateral triangle vertices: top (0, 1), bottom-right (0.866, -0.5), bottom-left (-0.866, -0.5)
  const v = [
    [0, 1],
    [0.866, -0.5],
    [-0.866, -0.5],
    [0, 1],
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}

function generateSwipeTemplate(dir: 'up' | 'down' | 'left' | 'right'): Float32Array {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const frac = -1 + (2 * i) / (RESAMPLE_POINTS - 1);
    if (dir === 'up') {
      pts[i * 2] = 0;
      pts[i * 2 + 1] = frac;
    } else if (dir === 'down') {
      pts[i * 2] = 0;
      pts[i * 2 + 1] = -frac;
    } else if (dir === 'right') {
      pts[i * 2] = frac;
      pts[i * 2 + 1] = 0;
    } else {
      // left
      pts[i * 2] = -frac;
      pts[i * 2 + 1] = 0;
    }
  }
  return normalizeTemplate(pts);
}

function generateLightningZTemplate(): Float32Array {
  // Z pattern: top-left -> top-right -> bottom-left -> bottom-right
  const v = [
    [-0.8, 0.8],
    [0.8, 0.8],
    [-0.8, -0.8],
    [0.8, -0.8],
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}

function generateInfinityTemplate(): Float32Array {
  // Lemniscate of Bernoulli: x = cos(t), y = sin(2t)/2 for t in [0, 2pi]
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const t = (i / (RESAMPLE_POINTS - 1)) * 2 * Math.PI;
    pts[i * 2] = Math.cos(t);
    pts[i * 2 + 1] = Math.sin(2 * t) * 0.5;
  }
  return normalizeTemplate(pts);
}

function generateSpiralTemplate(spiralIn: boolean): Float32Array {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  const turns = 1.6 * 2 * Math.PI;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const alpha = i / (RESAMPLE_POINTS - 1);
    const r = spiralIn ? 1.0 - 0.75 * alpha : 0.25 + 0.75 * alpha;
    const t = alpha * turns;
    pts[i * 2] = r * Math.cos(t);
    pts[i * 2 + 1] = r * Math.sin(t);
  }
  return normalizeTemplate(pts);
}

function generateStarTemplate(): Float32Array {
  // Continuous 5-pointed star path (order: 0 -> 2 -> 4 -> 1 -> 3 -> 0)
  const v: number[][] = [];
  const vertexIndices = [0, 2, 4, 1, 3, 0];
  for (const idx of vertexIndices) {
    const angle = Math.PI / 2 + (idx * 2 * Math.PI) / 5;
    v.push([Math.cos(angle), Math.sin(angle)]);
  }
  return samplePolyline(v, RESAMPLE_POINTS);
}

function generateCrossTemplate(): Float32Array {
  // Cross pattern (+): top -> bottom, center -> left, center -> right
  // Continuous approximate stroke or 4-arm navigation
  const v = [
    [0, 1],
    [0, -1],
    [0, 0],
    [-1, 0],
    [1, 0],
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}

function samplePolyline(vertices: number[][], count: number): Float32Array {
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const dx = vertices[i + 1][0] - vertices[i][0];
    const dy = vertices[i + 1][1] - vertices[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
  }

  const out = new Float32Array(count * 2);
  const step = totalLen / (count - 1);

  let segIdx = 0;
  let segCovered = 0;

  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
    while (segIdx < segLens.length - 1 && targetDist > segCovered + segLens[segIdx]) {
      segCovered += segLens[segIdx];
      segIdx++;
    }
    const rem = targetDist - segCovered;
    const t = segLens[segIdx] > 1e-6 ? Math.min(1.0, rem / segLens[segIdx]) : 0;
    const p0 = vertices[segIdx];
    const p1 = vertices[segIdx + 1];
    out[i * 2] = p0[0] + (p1[0] - p0[0]) * t;
    out[i * 2 + 1] = p0[1] + (p1[1] - p0[1]) * t;
  }

  return normalizeTemplate(out);
}

function normalizeTemplate(pts: Float32Array): Float32Array {
  const N = pts.length / 2;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < N; i++) {
    cx += pts[i * 2];
    cy += pts[i * 2 + 1];
  }
  cx /= N;
  cy /= N;

  let maxR = 0;
  for (let i = 0; i < N; i++) {
    const x = pts[i * 2] - cx;
    const y = pts[i * 2 + 1] - cy;
    const r = Math.sqrt(x * x + y * y);
    if (r > maxR) maxR = r;
  }

  const invR = maxR > 1e-6 ? 1 / maxR : 1;
  const normalized = new Float32Array(pts.length);
  for (let i = 0; i < N; i++) {
    normalized[i * 2] = (pts[i * 2] - cx) * invR;
    normalized[i * 2 + 1] = (pts[i * 2 + 1] - cy) * invR;
  }
  return normalized;
}

// Pre-computed canonical templates
const TEMPLATES: Record<string, Float32Array> = {
  circle_cw: generateCircleTemplate(true),
  circle_ccw: generateCircleTemplate(false),
  triangle: generateTriangleTemplate(),
  line_swipe_up: generateSwipeTemplate('up'),
  line_swipe_down: generateSwipeTemplate('down'),
  line_swipe_left: generateSwipeTemplate('left'),
  line_swipe_right: generateSwipeTemplate('right'),
  lightning_z: generateLightningZTemplate(),
  infinity: generateInfinityTemplate(),
  spiral_in: generateSpiralTemplate(true),
  spiral_out: generateSpiralTemplate(false),
  star: generateStarTemplate(),
  cross: generateCrossTemplate(),
};

// -----------------------------------------------------------------------------
// RollingTrajectoryBuffer
// -----------------------------------------------------------------------------

export class RollingTrajectoryBuffer {
  private readonly _maxDurationMs: number;
  private readonly _capacity: number;
  private readonly _minSamples: number;
  private readonly _minPathLength: number;
  private readonly _anchorJoint: JointName;
  private readonly _minConfidence: number;

  // Ring buffer arrays
  private readonly _times: Float64Array;
  private readonly _positions: Float32Array; // [x0, y0, z0, x1, y1, z1, ...]
  private _head = 0;
  private _count = 0;

  // Scratch memory for plane calculation and projection
  private readonly _scratchCentroid = new Float32Array(3);
  private readonly _scratchNormal = new Float32Array(3);
  private readonly _scratchU = new Float32Array(3);
  private readonly _scratchV = new Float32Array(3);

  constructor(config: RollingTrajectoryBufferConfig = {}) {
    this._maxDurationMs = config.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
    this._capacity = config.bufferCapacity ?? DEFAULT_CAPACITY;
    this._minSamples = config.minSamples ?? DEFAULT_MIN_SAMPLES;
    this._minPathLength = config.minPathLength ?? DEFAULT_MIN_PATH_LENGTH;
    this._anchorJoint = config.anchorJoint ?? 'index-finger-tip';
    this._minConfidence = config.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

    this._times = new Float64Array(this._capacity);
    this._positions = new Float32Array(this._capacity * 3);
  }

  get capacity(): number {
    return this._capacity;
  }

  get count(): number {
    return this._count;
  }

  get maxDurationMs(): number {
    return this._maxDurationMs;
  }

  clear(): void {
    this._head = 0;
    this._count = 0;
  }

  /**
   * Appends a raw 3D position sample with timestamp.
   */
  addSample(timeMs: number, x: number, y: number, z: number, _joint?: JointName | string): void {
    const slot = this._head;
    this._times[slot] = timeMs;
    const base = slot * 3;
    this._positions[base] = x;
    this._positions[base + 1] = y;
    this._positions[base + 2] = z;

    this._head = (this._head + 1) % this._capacity;
    if (this._count < this._capacity) {
      this._count++;
    }
  }

  /**
   * Ingests full HandPoseInput and automatically tracks the configured anchor joint.
   */
  addPose(timeMs: number, pose: HandPoseInput, jointName?: JointName): boolean {
    if (!pose) return false;
    const targetJoint = jointName ?? this._anchorJoint;

    if (pose instanceof Float32Array) {
      // Direct flat pose array (25 joints * 7 floats)
      const jointIdx = this._getJointNumericIndex(targetJoint);
      if (jointIdx >= 0) {
        const offset = jointIdx * FLOATS_PER_JOINT;
        if (offset + 2 < pose.length) {
          this.addSample(timeMs, pose[offset], pose[offset + 1], pose[offset + 2], targetJoint);
          return true;
        }
      }
      return false;
    }

    // Object map { jointName: { position: { x, y, z } } }
    const jointData = (pose as Record<string, any>)[targetJoint];
    if (jointData) {
      const pos = jointData.position ?? jointData;
      if (typeof pos?.x === 'number' && typeof pos?.y === 'number' && typeof pos?.z === 'number') {
        this.addSample(timeMs, pos.x, pos.y, pos.z, targetJoint);
        return true;
      }
    }

    return false;
  }

  /**
   * Prunes samples strictly older than (nowMs - maxDurationMs).
   */
  prune(nowMs: number): void {
    if (this._count === 0) return;
    const cutoff = nowMs - this._maxDurationMs;
    while (this._count > 0) {
      const oldestSlot = (this._head - this._count + this._capacity) % this._capacity;
      if (this._times[oldestSlot] < cutoff) {
        this._count--;
      } else {
        break;
      }
    }
  }

  /**
   * Retrieves active samples in chronological order within the specified window.
   */
  getSamples(windowMs: number = this._maxDurationMs): TrajectorySample[] {
    if (this._count === 0) return [];
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const latestTime = this._times[latestSlot];
    const cutoff = latestTime - windowMs;

    const result: TrajectorySample[] = [];
    const startIdx = (this._head - this._count + this._capacity) % this._capacity;

    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      const t = this._times[slot];
      if (t >= cutoff) {
        const base = slot * 3;
        result.push({
          timeMs: t,
          x: this._positions[base],
          y: this._positions[base + 1],
          z: this._positions[base + 2],
          joint: this._anchorJoint,
        });
      }
    }
    return result;
  }

  /**
   * Returns flat Float32Array [x0, y0, z0, x1, y1, z1, ...] of points in window.
   */
  getRawPoints(windowMs: number = this._maxDurationMs): Float32Array {
    if (this._count === 0) return new Float32Array(0);
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const latestTime = this._times[latestSlot];
    const cutoff = latestTime - windowMs;

    let validCount = 0;
    const startIdx = (this._head - this._count + this._capacity) % this._capacity;

    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      if (this._times[slot] >= cutoff) {
        validCount++;
      }
    }

    const out = new Float32Array(validCount * 3);
    let outIdx = 0;
    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      if (this._times[slot] >= cutoff) {
        const base = slot * 3;
        out[outIdx++] = this._positions[base];
        out[outIdx++] = this._positions[base + 1];
        out[outIdx++] = this._positions[base + 2];
      }
    }
    return out;
  }

  /**
   * Computes the dominant 3D plane for the given window using swept normal & Newell's method.
   */
  computeDominantPlane(windowMs: number = this._maxDurationMs): DominantPlane | null {
    const pts = this.getRawPoints(windowMs);
    return computeDominantPlaneFromPoints(pts);
  }

  /**
   * Evaluates the rolling buffer and recognizes trajectory gestures.
   */
  recognize(windowMs: number = this._maxDurationMs): TrajectoryMatchResult {
    const pts = this.getRawPoints(windowMs);
    const N = pts.length / 3;

    if (N < this._minSamples) {
      return this._createEmptyResult();
    }

    // Trajectory duration & path length
    const oldestSlot = (this._head - this._count + this._capacity) % this._capacity;
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const durationMs = Math.max(0, this._times[latestSlot] - this._times[oldestSlot]);

    let pathLength = 0;
    for (let i = 0; i < N - 1; i++) {
      const dx = pts[(i + 1) * 3] - pts[i * 3];
      const dy = pts[(i + 1) * 3 + 1] - pts[i * 3 + 1];
      const dz = pts[(i + 1) * 3 + 2] - pts[i * 3 + 2];
      pathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    if (pathLength < this._minPathLength) {
      return this._createEmptyResult(durationMs, pathLength, N);
    }

    return recognizeTrajectoryFrom3DPoints(pts, {
      durationMs,
      pathLength,
      minConfidence: this._minConfidence,
    });
  }

  private _getJointNumericIndex(joint: JointName): number {
    switch (joint) {
      case 'wrist': return JOINT_INDEX.WRIST;
      case 'thumb-metacarpal': return JOINT_INDEX.THUMB_METACARPAL;
      case 'thumb-phalanx-proximal': return JOINT_INDEX.THUMB_PROXIMAL;
      case 'thumb-phalanx-distal': return JOINT_INDEX.THUMB_DISTAL;
      case 'thumb-tip': return JOINT_INDEX.THUMB_TIP;
      case 'index-finger-metacarpal': return JOINT_INDEX.INDEX_METACARPAL;
      case 'index-finger-phalanx-proximal': return JOINT_INDEX.INDEX_PROXIMAL;
      case 'index-finger-phalanx-intermediate': return JOINT_INDEX.INDEX_INTERMEDIATE;
      case 'index-finger-phalanx-distal': return JOINT_INDEX.INDEX_DISTAL;
      case 'index-finger-tip': return JOINT_INDEX.INDEX_TIP;
      case 'middle-finger-metacarpal': return JOINT_INDEX.MIDDLE_METACARPAL;
      case 'middle-finger-phalanx-proximal': return JOINT_INDEX.MIDDLE_PROXIMAL;
      case 'middle-finger-phalanx-intermediate': return JOINT_INDEX.MIDDLE_INTERMEDIATE;
      case 'middle-finger-phalanx-distal': return JOINT_INDEX.MIDDLE_DISTAL;
      case 'middle-finger-tip': return JOINT_INDEX.MIDDLE_TIP;
      case 'ring-finger-metacarpal': return JOINT_INDEX.RING_METACARPAL;
      case 'ring-finger-phalanx-proximal': return JOINT_INDEX.RING_PROXIMAL;
      case 'ring-finger-phalanx-intermediate': return JOINT_INDEX.RING_INTERMEDIATE;
      case 'ring-finger-phalanx-distal': return JOINT_INDEX.RING_DISTAL;
      case 'ring-finger-tip': return JOINT_INDEX.RING_TIP;
      case 'pinky-finger-metacarpal': return JOINT_INDEX.PINKY_METACARPAL;
      case 'pinky-finger-phalanx-proximal': return JOINT_INDEX.PINKY_PROXIMAL;
      case 'pinky-finger-phalanx-intermediate': return JOINT_INDEX.PINKY_INTERMEDIATE;
      case 'pinky-finger-phalanx-distal': return JOINT_INDEX.PINKY_DISTAL;
      case 'pinky-finger-tip': return JOINT_INDEX.PINKY_TIP;
      default: return -1;
    }
  }

  private _createEmptyResult(
    durationMs = 0,
    pathLength = 0,
    sampleCount = 0,
  ): TrajectoryMatchResult {
    return {
      gesture: null,
      confidence: 0,
      durationMs,
      pathLength,
      sampleCount,
      dominantPlane: null,
      centroid: new Float32Array(3),
      scores: {},
    };
  }
}

// -----------------------------------------------------------------------------
// Pure Math & Recognition Algorithms
// -----------------------------------------------------------------------------

export interface TrajectoryRecognitionOptions {
  durationMs?: number;
  pathLength?: number;
  minConfidence?: number;
}

/**
 * Computes dominant plane from flat 3D point stream [x0, y0, z0, ...].
 */
export function computeDominantPlaneFromPoints(pts: Float32Array): DominantPlane | null {
  const N = pts.length / 3;
  if (N < 3) return null;

  // 1. Centroid
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < N; i++) {
    cx += pts[i * 3];
    cy += pts[i * 3 + 1];
    cz += pts[i * 3 + 2];
  }
  const invN = 1 / N;
  cx *= invN;
  cy *= invN;
  cz *= invN;

  // 2. Swept Area Normal around centroid + Newell's Method
  let nx = 0;
  let ny = 0;
  let nz = 0;

  for (let i = 0; i < N - 1; i++) {
    const ax = pts[i * 3] - cx;
    const ay = pts[i * 3 + 1] - cy;
    const az = pts[i * 3 + 2] - cz;

    const bx = pts[(i + 1) * 3] - cx;
    const by = pts[(i + 1) * 3 + 1] - cy;
    const bz = pts[(i + 1) * 3 + 2] - cz;

    nx += ay * bz - az * by;
    ny += az * bx - ax * bz;
    nz += ax * by - ay * bx;
  }

  let nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);

  // If swept normal cancelled out or is colinear, fallback to Covariance Matrix PCA
  if (nLen < 1e-4) {
    let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
    for (let i = 0; i < N; i++) {
      const rx = pts[i * 3] - cx;
      const ry = pts[i * 3 + 1] - cy;
      const rz = pts[i * 3 + 2] - cz;
      cxx += rx * rx; cyy += ry * ry; czz += rz * rz;
      cxy += rx * ry; cxz += rx * rz; cyz += ry * rz;
    }

    const powerStep = (
      mxx: number, myy: number, mzz: number,
      mxy: number, mxz: number, myz: number,
      ix: number, iy: number, iz: number
    ): [number, number, number] => {
      let x = ix, y = iy, z = iz;
      let len = Math.hypot(x, y, z) || 1;
      x /= len; y /= len; z /= len;
      for (let s = 0; s < 12; s++) {
        const px = mxx * x + mxy * y + mxz * z;
        const py = mxy * x + myy * y + myz * z;
        const pz = mxz * x + myz * y + mzz * z;
        len = Math.hypot(px, py, pz);
        if (len < 1e-12) break;
        x = px / len; y = py / len; z = pz / len;
      }
      return [x, y, z];
    };

    const [v1x, v1y, v1z] = powerStep(cxx, cyy, czz, cxy, cxz, cyz, 0.577, 0.577, 0.577);
    const lam1 = v1x * (cxx * v1x + cxy * v1y + cxz * v1z) +
                 v1y * (cxy * v1x + cyy * v1y + cyz * v1z) +
                 v1z * (cxz * v1x + cyz * v1y + czz * v1z);

    const dxx = cxx - lam1 * v1x * v1x;
    const dyy = cyy - lam1 * v1y * v1y;
    const dzz = czz - lam1 * v1z * v1z;
    const dxy = cxy - lam1 * v1x * v1y;
    const dxz = cxz - lam1 * v1x * v1z;
    const dyz = cyz - lam1 * v1y * v1z;

    let i2x = Math.abs(v1x) < 0.8 ? 1 : 0;
    let i2y = Math.abs(v1x) < 0.8 ? 0 : 1;
    let i2z = 0;
    const d = i2x * v1x + i2y * v1y + i2z * v1z;
    i2x -= d * v1x; i2y -= d * v1y; i2z -= d * v1z;

    const [v2x, v2y, v2z] = powerStep(dxx, dyy, dzz, dxy, dxz, dyz, i2x, i2y, i2z);

    nx = v1y * v2z - v1z * v2y;
    ny = v1z * v2x - v1x * v2z;
    nz = v1x * v2y - v1y * v2x;
    nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-6) {
      nx = 0; ny = 0; nz = 1; nLen = 1;
    }
  }

  const invNLen = 1 / nLen;
  nx *= invNLen;
  ny *= invNLen;
  nz *= invNLen;

  // Ensure plane normal consistently faces toward observer (+Z in standard WebXR space)
  if (nz < 0 || (Math.abs(nz) < 1e-4 && ny < 0)) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }

  // 3. Orthonormal basis (u, v) aligned with user viewport:
  // u is horizontal right (+X), v is vertical up (+Y)
  let ux: number;
  let uy: number;
  let uz: number;
  if (Math.abs(ny) < 0.95) {
    // cross([0, 1, 0], [nx, ny, nz]) = [nz, 0, -nx]
    ux = nz;
    uy = 0;
    uz = -nx;
  } else {
    ux = 1;
    uy = 0;
    uz = 0;
  }
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const invULen = uLen > 1e-6 ? 1 / uLen : 1;
  ux *= invULen;
  uy *= invULen;
  uz *= invULen;

  const vx = ny * uz - nz * uy;
  const vy = nz * ux - nx * uz;
  const vz = nx * uy - ny * ux;

  // 4. Mean residual distance to plane
  let residualSum = 0;
  for (let i = 0; i < N; i++) {
    const rx = pts[i * 3] - cx;
    const ry = pts[i * 3 + 1] - cy;
    const rz = pts[i * 3 + 2] - cz;
    residualSum += Math.abs(rx * nx + ry * ny + rz * nz);
  }
  const residual = residualSum * invN;

  return {
    centroid: new Float32Array([cx, cy, cz]),
    normal: new Float32Array([nx, ny, nz]),
    uAxis: new Float32Array([ux, uy, uz]),
    vAxis: new Float32Array([vx, vy, vz]),
    residual,
  };
}

/**
 * Projects 3D points [x, y, z] to 2D [u, v] coordinates in dominant plane basis.
 */
export function projectPointsToPlane(pts: Float32Array, plane: DominantPlane): Float32Array {
  const N = pts.length / 3;
  const out = new Float32Array(N * 2);

  const cx = plane.centroid[0];
  const cy = plane.centroid[1];
  const cz = plane.centroid[2];

  const ux = plane.uAxis[0];
  const uy = plane.uAxis[1];
  const uz = plane.uAxis[2];

  const vx = plane.vAxis[0];
  const vy = plane.vAxis[1];
  const vz = plane.vAxis[2];

  for (let i = 0; i < N; i++) {
    const rx = pts[i * 3] - cx;
    const ry = pts[i * 3 + 1] - cy;
    const rz = pts[i * 3 + 2] - cz;

    out[i * 2] = rx * ux + ry * uy + rz * uz;
    out[i * 2 + 1] = rx * vx + ry * vy + rz * vz;
  }

  return out;
}

/**
 * Resamples a polyline of 2D or 3D points to an equidistant count of points.
 */
export function resampleTrajectory(
  pts: Float32Array,
  dims: number,
  targetCount: number,
): Float32Array {
  const N = pts.length / dims;
  if (N <= 1) {
    const out = new Float32Array(targetCount * dims);
    for (let i = 0; i < targetCount; i++) {
      for (let d = 0; d < dims; d++) {
        out[i * dims + d] = pts[d] ?? 0;
      }
    }
    return out;
  }

  let totalLen = 0;
  const segLens = new Float32Array(N - 1);
  for (let i = 0; i < N - 1; i++) {
    let sumSq = 0;
    for (let d = 0; d < dims; d++) {
      const delta = pts[(i + 1) * dims + d] - pts[i * dims + d];
      sumSq += delta * delta;
    }
    const len = Math.sqrt(sumSq);
    segLens[i] = len;
    totalLen += len;
  }

  const out = new Float32Array(targetCount * dims);
  if (totalLen < 1e-6) {
    for (let i = 0; i < targetCount; i++) {
      for (let d = 0; d < dims; d++) {
        out[i * dims + d] = pts[d];
      }
    }
    return out;
  }

  const step = totalLen / (targetCount - 1);
  let segIdx = 0;
  let segCovered = 0;

  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;
    while (segIdx < N - 2 && targetDist > segCovered + segLens[segIdx]) {
      segCovered += segLens[segIdx];
      segIdx++;
    }
    const rem = targetDist - segCovered;
    const segL = segLens[segIdx];
    const t = segL > 1e-6 ? Math.min(1.0, rem / segL) : 0;

    for (let d = 0; d < dims; d++) {
      const a = pts[segIdx * dims + d];
      const b = pts[(segIdx + 1) * dims + d];
      out[i * dims + d] = a + (b - a) * t;
    }
  }

  return out;
}

/**
 * Recognizes trajectory gestures from raw flat 3D point stream.
 */
export function recognizeTrajectoryFrom3DPoints(
  pts: Float32Array,
  opts: TrajectoryRecognitionOptions = {},
): TrajectoryMatchResult {
  const N = pts.length / 3;
  const minConf = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  // Calculate duration and path length if not provided
  let pathLength = opts.pathLength ?? 0;
  if (pathLength === 0) {
    for (let i = 0; i < N - 1; i++) {
      const dx = pts[(i + 1) * 3] - pts[i * 3];
      const dy = pts[(i + 1) * 3 + 1] - pts[i * 3 + 1];
      const dz = pts[(i + 1) * 3 + 2] - pts[i * 3 + 2];
      pathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  const durationMs = opts.durationMs ?? 0;

  // 1. Direct 3D Linear Swipe Gate
  const startX = pts[0];
  const startY = pts[1];
  const startZ = pts[2];
  const endX = pts[(N - 1) * 3];
  const endY = pts[(N - 1) * 3 + 1];
  const endZ = pts[(N - 1) * 3 + 2];

  const netDx = endX - startX;
  const netDy = endY - startY;
  const netDz = endZ - startZ;
  const netDist = Math.sqrt(netDx * netDx + netDy * netDy + netDz * netDz);

  const straightness = pathLength > 1e-6 ? netDist / pathLength : 0;

  // Linear swipe check: highly direct motion
  if (straightness >= 0.82 && netDist >= 0.08) {
    const invDist = 1 / netDist;
    const dirX = netDx * invDist;
    const dirY = netDy * invDist;
    const dirZ = netDz * invDist;

    let dir: SwipeDirection;
    if (dirZ < -0.65) {
      dir = 'forward';
    } else if (Math.abs(dirY) > Math.abs(dirX)) {
      dir = dirY > 0 ? 'up' : 'down';
    } else {
      dir = dirX > 0 ? 'right' : 'left';
    }

    const specificGesture = `line_swipe_${dir}` as TrajectoryGestureType;
    const confidence = Math.min(1.0, 0.7 + (straightness - 0.82) * 1.5);

    const centroid = new Float32Array([
      (startX + endX) * 0.5,
      (startY + endY) * 0.5,
      (startZ + endZ) * 0.5,
    ]);

    const plane = computeDominantPlaneFromPoints(pts);

    return {
      gesture: specificGesture,
      direction: dir,
      confidence,
      durationMs,
      pathLength,
      sampleCount: N,
      dominantPlane: plane,
      centroid,
      scores: {
        line_swipe: confidence,
        [specificGesture]: confidence,
      },
    };
  }

  // 2. Dominant-plane projection for 2D curve/polygon gestures
  const plane = computeDominantPlaneFromPoints(pts);
  if (!plane) {
    return {
      gesture: null,
      confidence: 0,
      durationMs,
      pathLength,
      sampleCount: N,
      dominantPlane: null,
      centroid: new Float32Array(3),
      scores: {},
    };
  }

  const pts2D = projectPointsToPlane(pts, plane);

  // 3. Resample and normalize to canonical 32 points
  const resampled = resampleTrajectory(pts2D, 2, RESAMPLE_POINTS);
  const normalized = normalizeTemplate(resampled);

  // 4. Feature extraction: swept angle, circularity, closure
  let totalAngle = 0;
  let prevTheta = Math.atan2(normalized[1], normalized[0]);
  let sumR = 0;
  const radii = new Float32Array(RESAMPLE_POINTS);

  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const x = normalized[i * 2];
    const y = normalized[i * 2 + 1];
    const r = Math.sqrt(x * x + y * y);
    radii[i] = r;
    sumR += r;

    const theta = Math.atan2(y, x);
    if (i > 0) {
      let dTheta = theta - prevTheta;
      if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      else if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
      totalAngle += dTheta; // signed cumulative swept angle
    }
    prevTheta = theta;
  }

  const meanR = sumR / RESAMPLE_POINTS;
  let sumSqDiff = 0;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const diff = radii[i] - meanR;
    sumSqDiff += diff * diff;
  }
  const stdDevR = Math.sqrt(sumSqDiff / RESAMPLE_POINTS);
  const circularity = meanR > 1e-6 ? stdDevR / meanR : 1.0;

  const dxClosure = normalized[(RESAMPLE_POINTS - 1) * 2] - normalized[0];
  const dyClosure = normalized[(RESAMPLE_POINTS - 1) * 2 + 1] - normalized[1];
  const closureDist = Math.sqrt(dxClosure * dxClosure + dyClosure * dyClosure);

  // Radius progression for spiral detection
  let rStart = 0;
  let rEnd = 0;
  const quarter = Math.floor(RESAMPLE_POINTS / 4);
  for (let i = 0; i < quarter; i++) {
    rStart += radii[i];
    rEnd += radii[RESAMPLE_POINTS - 1 - i];
  }
  rStart /= quarter;
  rEnd /= quarter;

  // 5. Compare against template gallery
  const scores: Partial<Record<TrajectoryGestureType, number>> = {};

  for (const [key, tpl] of Object.entries(TEMPLATES)) {
    // Only match line_swipe templates if straightness is high
    if (key.startsWith('line_swipe_') && straightness < 0.78) {
      continue;
    }

    let distSum = 0;
    for (let i = 0; i < RESAMPLE_POINTS; i++) {
      const dx = normalized[i * 2] - tpl[i * 2];
      const dy = normalized[i * 2 + 1] - tpl[i * 2 + 1];
      distSum += Math.sqrt(dx * dx + dy * dy);
    }
    const avgDist = distSum / RESAMPLE_POINTS;
    // Map avgDist [0..1] to confidence [1..0]
    scores[key as TrajectoryGestureType] = Math.max(0, 1.0 - avgDist * 1.3);
  }

  // 6. Geometric feature gating & score adjustment
  const absAngle = Math.abs(totalAngle);

  // Circle CW / CCW: requires closure, low radius variance, ~1 turn
  if (circularity < 0.35 && closureDist < 0.65 && absAngle >= 1.6 * Math.PI) {
    const circleConf = Math.min(1.0, 1.0 - circularity * 1.5 - closureDist * 0.3);
    if (totalAngle < 0) {
      scores.circle_cw = Math.max(scores.circle_cw ?? 0, circleConf);
    } else {
      scores.circle_ccw = Math.max(scores.circle_ccw ?? 0, circleConf);
    }
  } else {
    // Penalize circle if open or high variance
    if (scores.circle_cw) scores.circle_cw *= 0.5;
    if (scores.circle_ccw) scores.circle_ccw *= 0.5;
  }

  // Spiral In / Spiral Out: large swept angle + systematic radius change
  if (absAngle >= 2.0 * Math.PI) {
    if (rStart > 1.3 * rEnd) {
      scores.spiral_in = Math.max(scores.spiral_in ?? 0, 0.75 + (rStart / (rEnd + 0.1)) * 0.05);
    } else if (rEnd > 1.3 * rStart) {
      scores.spiral_out = Math.max(scores.spiral_out ?? 0, 0.75 + (rEnd / (rStart + 0.1)) * 0.05);
    }
  }

  // Infinity (lemniscate): two lobes, self-crossing near center
  // Sweeps both left and right, net angle near 0 while cumulative path is curved
  if (absAngle < 1.4 * Math.PI && closureDist < 0.7 && !scores.circle_cw && !scores.circle_ccw) {
    // Check if middle point crosses near centroid (0,0)
    const midIdx = Math.floor(RESAMPLE_POINTS / 2);
    const midDist = radii[midIdx];
    if (midDist < 0.35) {
      scores.infinity = Math.max(scores.infinity ?? 0, 0.72 + (0.35 - midDist));
    }
  }

  // Triangle: closed, 3 distinct corners
  if (closureDist < 0.55 && circularity > 0.15 && absAngle >= 1.4 * Math.PI) {
    const triScore = scores.triangle ?? 0;
    scores.triangle = Math.max(triScore, 0.70);
  }

  // Lightning Z: open stroke, top-right and bottom-left sharp turns
  if (closureDist > 0.75 && absAngle < 1.2 * Math.PI) {
    const zScore = scores.lightning_z ?? 0;
    if (zScore > 0.6) {
      scores.lightning_z = Math.min(1.0, zScore + 0.1);
    }
  }

  // Find best scoring gesture
  let bestGesture: TrajectoryGestureType | null = null;
  let bestConfidence = 0;

  for (const [gest, conf] of Object.entries(scores) as [TrajectoryGestureType, number][]) {
    if (conf > bestConfidence) {
      bestConfidence = conf;
      bestGesture = gest;
    }
  }

  if (bestConfidence < minConf) {
    bestGesture = null;
  }

  let direction: SwipeDirection | undefined;
  if (bestGesture?.startsWith('line_swipe_')) {
    direction = bestGesture.replace('line_swipe_', '') as SwipeDirection;
  }

  return {
    gesture: bestGesture,
    confidence: bestConfidence,
    direction,
    durationMs,
    pathLength,
    sampleCount: N,
    dominantPlane: plane,
    centroid: plane.centroid,
    scores,
  };
}
