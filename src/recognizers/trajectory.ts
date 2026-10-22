// Newell's Method 3D Circle Trajectory Solver
// Extracted from DunJun src/systems/spell.ts:L385-L461
// Uses a pre-allocated Float32Array(90 * 3) ring buffer per hand - zero GC allocations.

import {
  CIRCLE_HISTORY_FRAMES,
  CIRCLE_MAX_IRREGULARITY,
  CIRCLE_MIN_RADIUS,
  CIRCLE_MIN_REVOLUTIONS,
  CIRCLE_MIN_SAMPLES,
  DISC_FIRE_COOLDOWN_MS,
} from '../constants.js';
import type { CircleState, Handedness } from '../types.js';

export interface CircleDetectorConfig {
  historyFrames?: number;
  minSamples?: number;
  minRadius?: number;
  maxIrregularity?: number;
  minRevolutions?: number;
  cooldownMs?: number;
}

export class CircleTrajectoryRecognizer {
  private readonly _maxFrames: number;
  private readonly _minSamples: number;
  private readonly _minRadius: number;
  private readonly _maxIrregularity: number;
  private readonly _minRevolutions: number;
  private readonly _cooldownMs: number;

  // Pre-allocated ring buffer of (x, y, z) samples and per-sample radial distances
  private readonly _buffer: Float32Array;
  private readonly _radii: Float32Array;
  private _head = 0;
  private _count = 0;
  private _lastFireMs = -Infinity;

  // Pre-allocated scratch vectors for basis projection
  private readonly _u = new Float32Array(3);
  private readonly _v = new Float32Array(3);

  constructor(config: CircleDetectorConfig = {}) {
    this._maxFrames = config.historyFrames ?? CIRCLE_HISTORY_FRAMES;
    this._minSamples = config.minSamples ?? CIRCLE_MIN_SAMPLES;
    this._minRadius = config.minRadius ?? CIRCLE_MIN_RADIUS;
    this._maxIrregularity = config.maxIrregularity ?? CIRCLE_MAX_IRREGULARITY;
    this._minRevolutions = config.minRevolutions ?? CIRCLE_MIN_REVOLUTIONS;
    this._cooldownMs = config.cooldownMs ?? DISC_FIRE_COOLDOWN_MS;

    this._buffer = new Float32Array(this._maxFrames * 3);
    this._radii = new Float32Array(this._maxFrames);
  }

  reset(): void {
    this._head = 0;
    this._count = 0;
  }

  /**
   * Appends wrist position (x, y, z) and evaluates Newell's 3D circle trajectory.
   * Mutates `out` in-place with zero heap allocations.
   */
  update(
    wristX: number,
    wristY: number,
    wristZ: number,
    nowMs: number,
    out: CircleState,
    _hand?: Handedness,
  ): CircleState {
    out.triggered = false;

    // 1. Append sample into ring buffer
    const writeBase = this._head * 3;
    this._buffer[writeBase] = wristX;
    this._buffer[writeBase + 1] = wristY;
    this._buffer[writeBase + 2] = wristZ;

    this._head = (this._head + 1) % this._maxFrames;
    if (this._count < this._maxFrames) {
      this._count++;
    }

    const N = this._count;
    if (N < this._minSamples) {
      out.meanRadius = 0;
      out.revolutions = 0;
      return out;
    }

    // Oldest sample index in ring buffer
    const startIdx = (this._head - N + this._maxFrames) % this._maxFrames;

    // 2. Centroid & Circularity Gate
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < N; i++) {
      const idx = ((startIdx + i) % this._maxFrames) * 3;
      cx += this._buffer[idx];
      cy += this._buffer[idx + 1];
      cz += this._buffer[idx + 2];
    }
    const invN = 1 / N;
    cx *= invN;
    cy *= invN;
    cz *= invN;

    let sumR = 0;
    for (let i = 0; i < N; i++) {
      const idx = ((startIdx + i) % this._maxFrames) * 3;
      const dx = this._buffer[idx] - cx;
      const dy = this._buffer[idx + 1] - cy;
      const dz = this._buffer[idx + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this._radii[i] = d;
      sumR += d;
    }

    const meanRadius = sumR * invN;
    out.centroid[0] = cx;
    out.centroid[1] = cy;
    out.centroid[2] = cz;
    out.meanRadius = meanRadius;

    if (meanRadius < this._minRadius) {
      out.revolutions = 0;
      return out;
    }

    let sumSqDiff = 0;
    for (let i = 0; i < N; i++) {
      const diff = this._radii[i] - meanRadius;
      sumSqDiff += diff * diff;
    }
    const stdDev = Math.sqrt(sumSqDiff * invN);
    const irregularity = stdDev / meanRadius;
    if (irregularity > this._maxIrregularity) {
      out.revolutions = 0;
      return out;
    }

    // 3. Newell's Method Best-Fit Plane Normal
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < N; i++) {
      const idxA = ((startIdx + i) % this._maxFrames) * 3;
      const idxB = ((startIdx + ((i + 1) % N)) % this._maxFrames) * 3;

      const xi = this._buffer[idxA];
      const yi = this._buffer[idxA + 1];
      const zi = this._buffer[idxA + 2];

      const xj = this._buffer[idxB];
      const yj = this._buffer[idxB + 1];
      const zj = this._buffer[idxB + 2];

      nx += (yi - yj) * (zi + zj);
      ny += (zi - zj) * (xi + xj);
      nz += (xi - xj) * (yi + yj);
    }

    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nLen < 1e-8) {
      out.revolutions = 0;
      return out;
    }
    const invNLen = 1 / nLen;
    nx *= invNLen;
    ny *= invNLen;
    nz *= invNLen;

    out.normal[0] = nx;
    out.normal[1] = ny;
    out.normal[2] = nz;

    // 4. 2D Plane Basis (u, v) & Unwrapped Swept Angle
    // Reference axis not collinear with normal
    let ux: number;
    let uy: number;
    let uz: number;
    if (Math.abs(nx) < 0.9) {
      // cross(n, [1, 0, 0]) = [0, nz, -ny]
      ux = 0;
      uy = nz;
      uz = -ny;
    } else {
      // cross(n, [0, 1, 0]) = [-nz, 0, nx]
      ux = -nz;
      uy = 0;
      uz = nx;
    }
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const invULen = uLen > 0 ? 1 / uLen : 0;
    ux *= invULen;
    uy *= invULen;
    uz *= invULen;

    // v = n x u
    const vx = ny * uz - nz * uy;
    const vy = nz * ux - nx * uz;
    const vz = nx * uy - ny * ux;

    this._u[0] = ux;
    this._u[1] = uy;
    this._u[2] = uz;
    this._v[0] = vx;
    this._v[1] = vy;
    this._v[2] = vz;

    let totalAngle = 0;
    let prevTheta = 0;

    for (let i = 0; i < N; i++) {
      const idx = ((startIdx + i) % this._maxFrames) * 3;
      const rx = this._buffer[idx] - cx;
      const ry = this._buffer[idx + 1] - cy;
      const rz = this._buffer[idx + 2] - cz;

      const projU = rx * ux + ry * uy + rz * uz;
      const projV = rx * vx + ry * vy + rz * vz;
      const theta = Math.atan2(projV, projU);

      if (i > 0) {
        let dTheta = theta - prevTheta;
        if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        else if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
        totalAngle += Math.abs(dTheta);
      }
      prevTheta = theta;
    }

    const revolutions = totalAngle / (2 * Math.PI);
    out.revolutions = revolutions;

    if (
      totalAngle >= this._minRevolutions * 2 * Math.PI &&
      nowMs - this._lastFireMs > this._cooldownMs
    ) {
      out.triggered = true;
      this._lastFireMs = nowMs;
      this.reset();
    }

    return out;
  }
}
