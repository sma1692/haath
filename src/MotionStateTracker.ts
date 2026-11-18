// MotionStateTracker.ts
// Real-time zero-GC per-hand 3D velocity, acceleration, angular velocity kinematics,
// motion state classification (STATIONARY, MICRO_MOVING, TRANSLATING, BALLISTIC),
// and Wrist-Flip Utility Trigger for WebXR spatial computing.

import type { Handedness, HaathFrameState, Quat, SingleHandState, Vec3 } from './types.js';

export type MotionState = 'STATIONARY' | 'MICRO_MOVING' | 'TRANSLATING' | 'BALLISTIC';

export const MotionState = {
  STATIONARY: 'STATIONARY',
  MICRO_MOVING: 'MICRO_MOVING',
  TRANSLATING: 'TRANSLATING',
  BALLISTIC: 'BALLISTIC',
} as const;

export type FlipDirection = 'palm-up' | 'palm-down' | 'inward' | 'outward' | 'neutral';

export interface WristFlipConfig {
  /** Minimum angular speed to initiate/count toward a flip (rad/s, default: 4.5 ~258 deg/s) */
  minAngularSpeed?: number;
  /** Minimum accumulated angle in window to trigger flip (radians, default: PI / 3 ~60 deg) */
  minAngleDelta?: number;
  /** Maximum linear speed allowed during flip to prevent false triggers on swings (m/s, default: 1.2) */
  maxLinearSpeed?: number;
  /** Cooldown in milliseconds after triggering before another flip can trigger (default: 400) */
  cooldownMs?: number;
  /** Rolling time window in ms to accumulate angular displacement (default: 250) */
  windowMs?: number;
}

export interface MotionStateConfig {
  /** Maximum speed to qualify as STATIONARY (m/s, default: 0.05) */
  stationarySpeedThreshold: number;
  /** Maximum speed to qualify as MICRO_MOVING (m/s, default: 0.25) */
  microMovingSpeedThreshold: number;
  /** Speed threshold for deliberate TRANSLATING vs BALLISTIC (m/s, default: 1.8) */
  translatingSpeedThreshold: number;
  /** Speed threshold promoting to BALLISTIC (m/s, default: 1.8) */
  ballisticSpeedThreshold: number;
  /** Acceleration magnitude threshold promoting to BALLISTIC (m/s^2, default: 12.0) */
  ballisticAccelThreshold: number;
  /** Exponential moving average filter factor (0..1, default: 0.6; 1.0 = raw unfilter) */
  smoothingAlpha: number;
  /** Wrist-Flip trigger configuration */
  wristFlip: Required<WristFlipConfig>;
}

export const DEFAULT_MOTION_STATE_CONFIG: MotionStateConfig = {
  stationarySpeedThreshold: 0.05,
  microMovingSpeedThreshold: 0.25,
  translatingSpeedThreshold: 1.8,
  ballisticSpeedThreshold: 1.8,
  ballisticAccelThreshold: 12.0,
  smoothingAlpha: 0.6,
  wristFlip: {
    minAngularSpeed: 4.5,
    minAngleDelta: Math.PI / 3, // ~60 deg
    maxLinearSpeed: 1.2,
    cooldownMs: 400,
    windowMs: 250,
  },
};

export interface WristFlipState {
  /** True for exactly one frame when flip trigger conditions are fulfilled */
  triggered: boolean;
  /** True while flip was triggered and within active cooldown window */
  active: boolean;
  /** Instantaneous angular speed (rad/s) */
  angularSpeed: number;
  /** Accumulated angular displacement in current rolling window (radians) */
  accumulatedAngle: number;
  /** Remaining cooldown time in ms */
  cooldownRemainingMs: number;
  /** Inferred palm direction at the moment of trigger */
  flipDirection: FlipDirection;
}

export interface PerHandMotionData {
  /** Discrete motion classification */
  state: MotionState;
  /** Current 3D position [x, y, z] in meters */
  position: Float32Array;
  /** 3D linear velocity [vx, vy, vz] in m/s */
  velocity: Float32Array;
  /** 3D linear acceleration [ax, ay, az] in m/s^2 */
  acceleration: Float32Array;
  /** 3D angular velocity vector [wx, wy, wz] in rad/s */
  angularVelocity: Float32Array;
  /** Linear speed (magnitude of velocity) in m/s */
  speed: number;
  /** Linear acceleration magnitude in m/s^2 */
  accelMagnitude: number;
  /** Angular speed in rad/s */
  angularSpeed: number;
  /** Angular speed in deg/s */
  angularSpeedDeg: number;
  /** Wrist-flip utility trigger state */
  wristFlip: WristFlipState;
  /** Timestamp of the current update in ms */
  timestampMs: number;
  /** Whether the hand was tracked in the current frame */
  tracked: boolean;
}

/**
 * Classifies motion state from scalar kinematics.
 */
export function classifyMotionState(
  speed: number,
  accelMag: number,
  angularSpeed: number,
  config: MotionStateConfig = DEFAULT_MOTION_STATE_CONFIG,
): MotionState {
  if (speed >= config.ballisticSpeedThreshold || accelMag >= config.ballisticAccelThreshold) {
    return 'BALLISTIC';
  }
  if (speed >= config.microMovingSpeedThreshold) {
    return 'TRANSLATING';
  }
  if (speed >= config.stationarySpeedThreshold || angularSpeed >= 1.2) {
    return 'MICRO_MOVING';
  }
  return 'STATIONARY';
}

/**
 * Wrist-Flip Utility Trigger.
 * Detects rapid pronation/supination or wrist snap gestures, providing
 * one-shot event triggering, direction estimation, and cooldown debouncing.
 */
export class WristFlipTrigger {
  readonly state: WristFlipState;
  private _config: Required<WristFlipConfig>;
  private _windowTimeMs = 0;

  constructor(config?: WristFlipConfig) {
    this._config = {
      minAngularSpeed: config?.minAngularSpeed ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.minAngularSpeed,
      minAngleDelta: config?.minAngleDelta ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.minAngleDelta,
      maxLinearSpeed: config?.maxLinearSpeed ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.maxLinearSpeed,
      cooldownMs: config?.cooldownMs ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.cooldownMs,
      windowMs: config?.windowMs ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.windowMs,
    };

    this.state = {
      triggered: false,
      active: false,
      angularSpeed: 0,
      accumulatedAngle: 0,
      cooldownRemainingMs: 0,
      flipDirection: 'neutral',
    };
  }

  get config(): Required<WristFlipConfig> {
    return this._config;
  }

  setConfig(config: Partial<WristFlipConfig>): void {
    if (config.minAngularSpeed !== undefined) this._config.minAngularSpeed = config.minAngularSpeed;
    if (config.minAngleDelta !== undefined) this._config.minAngleDelta = config.minAngleDelta;
    if (config.maxLinearSpeed !== undefined) this._config.maxLinearSpeed = config.maxLinearSpeed;
    if (config.cooldownMs !== undefined) this._config.cooldownMs = config.cooldownMs;
    if (config.windowMs !== undefined) this._config.windowMs = config.windowMs;
  }

  /**
   * Updates the trigger state per frame.
   * Zero allocation in update loop.
   */
  update(
    angularSpeed: number,
    deltaAngle: number,
    linearSpeed: number,
    orientationQuat: Float32Array | null,
    deltaMs: number,
  ): WristFlipState {
    this.state.triggered = false;
    this.state.angularSpeed = angularSpeed;

    // Cooldown management
    if (this.state.cooldownRemainingMs > 0) {
      this.state.cooldownRemainingMs = Math.max(0, this.state.cooldownRemainingMs - deltaMs);
      if (this.state.cooldownRemainingMs === 0) {
        this.state.active = false;
      }
      this.state.accumulatedAngle = 0;
      this._windowTimeMs = 0;
      return this.state;
    }

    // Accumulate rotation if conditions qualify
    if (angularSpeed >= this._config.minAngularSpeed && linearSpeed <= this._config.maxLinearSpeed) {
      this.state.accumulatedAngle += deltaAngle;
      this._windowTimeMs += deltaMs;

      // Check if threshold achieved within window
      if (this.state.accumulatedAngle >= this._config.minAngleDelta) {
        this.state.triggered = true;
        this.state.active = true;
        this.state.cooldownRemainingMs = this._config.cooldownMs;
        this.state.flipDirection = this._computeDirection(orientationQuat);
        this.state.accumulatedAngle = 0;
        this._windowTimeMs = 0;
        return this.state;
      }
    } else {
      // Natural decay of accumulated angle
      this._windowTimeMs += deltaMs;
      if (this._windowTimeMs >= this._config.windowMs) {
        this.state.accumulatedAngle = Math.max(0, this.state.accumulatedAngle - deltaAngle * 2);
        this._windowTimeMs = 0;
      }
    }

    return this.state;
  }

  private _computeDirection(quat: Float32Array | null): FlipDirection {
    if (!quat || quat.length < 4) return 'neutral';
    const x = quat[0], y = quat[1], z = quat[2], w = quat[3];
    // Local -Y axis transformed by quaternion (typical palm normal facing down in local space)
    const ny = -(1 - 2 * (x * x + z * z));
    const nx = -2 * (x * y - w * z);
    const nz = -2 * (y * z + w * x);

    if (ny > 0.45) return 'palm-up';
    if (ny < -0.45) return 'palm-down';
    if (nx > 0.45) return 'inward';
    if (nx < -0.45) return 'outward';
    if (nz < -0.45) return 'outward';
    return 'neutral';
  }

  reset(): void {
    this.state.triggered = false;
    this.state.active = false;
    this.state.angularSpeed = 0;
    this.state.accumulatedAngle = 0;
    this.state.cooldownRemainingMs = 0;
    this.state.flipDirection = 'neutral';
    this._windowTimeMs = 0;
  }
}

/**
 * HandMotionTracker tracks a single hand's kinematics and state.
 * Fully pre-allocated, zero-GC per frame.
 */
export class HandMotionTracker {
  readonly handedness: Handedness;
  readonly data: PerHandMotionData;
  readonly wristFlip: WristFlipTrigger;
  config: MotionStateConfig;

  // Internal history & scratch buffers (zero-GC)
  private _hasPrev = false;
  private _prevTimeMs = 0;
  private readonly _prevPos = new Float32Array(3);
  private readonly _prevVel = new Float32Array(3);
  private readonly _rawVel = new Float32Array(3);
  private readonly _prevAccel = new Float32Array(3);
  private readonly _rawAccel = new Float32Array(3);
  private readonly _prevQuat = new Float32Array([0, 0, 0, 1]);
  private readonly _currQuat = new Float32Array([0, 0, 0, 1]);
  private readonly _rawAngVel = new Float32Array(3);
  private readonly _prevAngVel = new Float32Array(3);
  private readonly _posScratch = new Float32Array(3);
  private readonly _quatScratch = new Float32Array(4);

  constructor(handedness: Handedness, config?: Partial<MotionStateConfig>) {
    this.handedness = handedness;
    this.config = {
      ...DEFAULT_MOTION_STATE_CONFIG,
      ...config,
      wristFlip: {
        ...DEFAULT_MOTION_STATE_CONFIG.wristFlip,
        ...(config?.wristFlip || {}),
      },
    };

    this.wristFlip = new WristFlipTrigger(this.config.wristFlip);

    this.data = {
      state: 'STATIONARY',
      position: new Float32Array(3),
      velocity: new Float32Array(3),
      acceleration: new Float32Array(3),
      angularVelocity: new Float32Array(3),
      speed: 0,
      accelMagnitude: 0,
      angularSpeed: 0,
      angularSpeedDeg: 0,
      wristFlip: this.wristFlip.state,
      timestampMs: 0,
      tracked: false,
    };
  }

  /**
   * Main kinematics update method.
   * Supports Vec3/Quat objects, Float32Arrays, or ArrayLike tuples.
   * Zero allocations per call.
   */
  update(
    position: Vec3 | ArrayLike<number> | null | undefined,
    orientation?: Quat | ArrayLike<number> | null,
    timestampMs?: number,
  ): PerHandMotionData {
    if (!position) {
      return this.markUntracked(timestampMs);
    }

    const hasPos = this._extractVec3(position, this._posScratch);
    if (!hasPos) {
      return this.markUntracked(timestampMs);
    }

    const hasQuat = orientation ? this._extractQuat(orientation, this._quatScratch) : false;
    const now = timestampMs !== undefined ? timestampMs : (typeof performance !== 'undefined' ? performance.now() : Date.now());

    this.data.tracked = true;
    this.data.timestampMs = now;
    this.data.position[0] = this._posScratch[0];
    this.data.position[1] = this._posScratch[1];
    this.data.position[2] = this._posScratch[2];

    if (hasQuat) {
      this._currQuat[0] = this._quatScratch[0];
      this._currQuat[1] = this._quatScratch[1];
      this._currQuat[2] = this._quatScratch[2];
      this._currQuat[3] = this._quatScratch[3];
      this._normalizeQuat(this._currQuat);
    }

    if (!this._hasPrev) {
      // First frame baseline
      this._prevPos[0] = this._posScratch[0];
      this._prevPos[1] = this._posScratch[1];
      this._prevPos[2] = this._posScratch[2];

      if (hasQuat) {
        this._prevQuat[0] = this._currQuat[0];
        this._prevQuat[1] = this._currQuat[1];
        this._prevQuat[2] = this._currQuat[2];
        this._prevQuat[3] = this._currQuat[3];
      }

      this._prevTimeMs = now;
      this._hasPrev = true;
      this._zeroOutputs();
      this.data.state = 'STATIONARY';
      return this.data;
    }

    const dtMs = now - this._prevTimeMs;
    const dt = dtMs / 1000;

    // Guard against abnormal time steps (e.g. tab backgrounding or pause > 0.5s)
    if (dt <= 0 || dt > 0.5) {
      this._prevTimeMs = now;
      this._prevPos[0] = this._posScratch[0];
      this._prevPos[1] = this._posScratch[1];
      this._prevPos[2] = this._posScratch[2];
      if (hasQuat) {
        this._prevQuat[0] = this._currQuat[0];
        this._prevQuat[1] = this._currQuat[1];
        this._prevQuat[2] = this._currQuat[2];
        this._prevQuat[3] = this._currQuat[3];
      }
      return this.data;
    }

    const alpha = Math.max(0.01, Math.min(1.0, this.config.smoothingAlpha));
    const invDt = 1 / dt;

    // 1. Velocity Calculation (m/s)
    this._rawVel[0] = (this._posScratch[0] - this._prevPos[0]) * invDt;
    this._rawVel[1] = (this._posScratch[1] - this._prevPos[1]) * invDt;
    this._rawVel[2] = (this._posScratch[2] - this._prevPos[2]) * invDt;

    this.data.velocity[0] = alpha * this._rawVel[0] + (1 - alpha) * this._prevVel[0];
    this.data.velocity[1] = alpha * this._rawVel[1] + (1 - alpha) * this._prevVel[1];
    this.data.velocity[2] = alpha * this._rawVel[2] + (1 - alpha) * this._prevVel[2];

    const vx = this.data.velocity[0];
    const vy = this.data.velocity[1];
    const vz = this.data.velocity[2];
    this.data.speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // 2. Acceleration Calculation (m/s^2)
    this._rawAccel[0] = (this.data.velocity[0] - this._prevVel[0]) * invDt;
    this._rawAccel[1] = (this.data.velocity[1] - this._prevVel[1]) * invDt;
    this._rawAccel[2] = (this.data.velocity[2] - this._prevVel[2]) * invDt;

    this.data.acceleration[0] = alpha * this._rawAccel[0] + (1 - alpha) * this._prevAccel[0];
    this.data.acceleration[1] = alpha * this._rawAccel[1] + (1 - alpha) * this._prevAccel[1];
    this.data.acceleration[2] = alpha * this._rawAccel[2] + (1 - alpha) * this._prevAccel[2];

    const ax = this.data.acceleration[0];
    const ay = this.data.acceleration[1];
    const az = this.data.acceleration[2];
    this.data.accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);

    // 3. Angular Velocity Calculation (rad/s)
    let deltaAngle = 0;
    if (hasQuat) {
      deltaAngle = this._computeAngularVelocity(dt, invDt, alpha);
    } else {
      this.data.angularVelocity[0] = 0;
      this.data.angularVelocity[1] = 0;
      this.data.angularVelocity[2] = 0;
      this.data.angularSpeed = 0;
      this.data.angularSpeedDeg = 0;
    }

    // 4. Motion State Classification
    this.data.state = classifyMotionState(
      this.data.speed,
      this.data.accelMagnitude,
      this.data.angularSpeed,
      this.config,
    );

    // 5. Wrist-Flip Utility Trigger Update
    this.wristFlip.update(
      this.data.angularSpeed,
      deltaAngle,
      this.data.speed,
      hasQuat ? this._currQuat : null,
      dtMs,
    );

    // Update history for next frame
    this._prevPos[0] = this._posScratch[0];
    this._prevPos[1] = this._posScratch[1];
    this._prevPos[2] = this._posScratch[2];

    this._prevVel[0] = this.data.velocity[0];
    this._prevVel[1] = this.data.velocity[1];
    this._prevVel[2] = this.data.velocity[2];

    this._prevAccel[0] = this.data.acceleration[0];
    this._prevAccel[1] = this.data.acceleration[1];
    this._prevAccel[2] = this.data.acceleration[2];

    this._prevAngVel[0] = this.data.angularVelocity[0];
    this._prevAngVel[1] = this.data.angularVelocity[1];
    this._prevAngVel[2] = this.data.angularVelocity[2];

    if (hasQuat) {
      this._prevQuat[0] = this._currQuat[0];
      this._prevQuat[1] = this._currQuat[1];
      this._prevQuat[2] = this._currQuat[2];
      this._prevQuat[3] = this._currQuat[3];
    }

    this._prevTimeMs = now;
    return this.data;
  }

  /**
   * Updates state from a Haath SingleHandState (e.g. from SingleHandRecognizer).
   */
  updateFromHandState(handState: SingleHandState, timestampMs?: number): PerHandMotionData {
    if (!handState || !handState.tracked) {
      return this.markUntracked(timestampMs);
    }
    return this.update(handState.wristPosition, handState.palmQuaternion, timestampMs);
  }

  markUntracked(timestampMs?: number): PerHandMotionData {
    this.data.tracked = false;
    this.data.timestampMs = timestampMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._zeroOutputs();
    this.data.state = 'STATIONARY';
    this.wristFlip.reset();
    this._hasPrev = false;
    return this.data;
  }

  reset(): void {
    this._hasPrev = false;
    this._zeroOutputs();
    this.data.tracked = false;
    this.data.state = 'STATIONARY';
    this.wristFlip.reset();
  }

  private _computeAngularVelocity(dt: number, invDt: number, alpha: number): number {
    const q0 = this._prevQuat;
    const q1 = this._currQuat;

    // Double cover antipodal check
    let dot = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];
    if (dot < 0) {
      q1[0] = -q1[0];
      q1[1] = -q1[1];
      q1[2] = -q1[2];
      q1[3] = -q1[3];
      dot = -dot;
    }

    // Relative rotation quaternion deltaQ = q1 * conjugate(q0)
    // q0_conj = [-x0, -y0, -z0, w0]
    const w0 = q0[3], x0 = q0[0], y0 = q0[1], z0 = q0[2];
    const w1 = q1[3], x1 = q1[0], y1 = q1[1], z1 = q1[2];

    const dw = Math.max(-1, Math.min(1, w1 * w0 + x1 * x0 + y1 * y0 + z1 * z0));
    const dx = w0 * x1 - w1 * x0 + y0 * z1 - z0 * y1;
    const dy = w0 * y1 - w1 * y0 + z0 * x1 - x0 * z1;
    const dz = w0 * z1 - w1 * z0 + x0 * y1 - y0 * x1;

    const deltaAngle = 2 * Math.acos(dw);

    if (deltaAngle < 1e-5) {
      this._rawAngVel[0] = 0;
      this._rawAngVel[1] = 0;
      this._rawAngVel[2] = 0;
    } else {
      const sinHalf = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const factor = sinHalf > 1e-6 ? (deltaAngle * invDt) / sinHalf : 2 * invDt;
      this._rawAngVel[0] = dx * factor;
      this._rawAngVel[1] = dy * factor;
      this._rawAngVel[2] = dz * factor;
    }

    this.data.angularVelocity[0] = alpha * this._rawAngVel[0] + (1 - alpha) * this._prevAngVel[0];
    this.data.angularVelocity[1] = alpha * this._rawAngVel[1] + (1 - alpha) * this._prevAngVel[1];
    this.data.angularVelocity[2] = alpha * this._rawAngVel[2] + (1 - alpha) * this._prevAngVel[2];

    const wx = this.data.angularVelocity[0];
    const wy = this.data.angularVelocity[1];
    const wz = this.data.angularVelocity[2];
    this.data.angularSpeed = Math.sqrt(wx * wx + wy * wy + wz * wz);
    this.data.angularSpeedDeg = this.data.angularSpeed * (180 / Math.PI);

    return deltaAngle;
  }

  private _zeroOutputs(): void {
    this.data.velocity[0] = 0;
    this.data.velocity[1] = 0;
    this.data.velocity[2] = 0;
    this.data.acceleration[0] = 0;
    this.data.acceleration[1] = 0;
    this.data.acceleration[2] = 0;
    this.data.angularVelocity[0] = 0;
    this.data.angularVelocity[1] = 0;
    this.data.angularVelocity[2] = 0;
    this.data.speed = 0;
    this.data.accelMagnitude = 0;
    this.data.angularSpeed = 0;
    this.data.angularSpeedDeg = 0;
    this._prevVel[0] = 0;
    this._prevVel[1] = 0;
    this._prevVel[2] = 0;
    this._prevAccel[0] = 0;
    this._prevAccel[1] = 0;
    this._prevAccel[2] = 0;
    this._prevAngVel[0] = 0;
    this._prevAngVel[1] = 0;
    this._prevAngVel[2] = 0;
  }

  private _extractVec3(v: Vec3 | ArrayLike<number>, out: Float32Array): boolean {
    if ('x' in (v as Vec3) && typeof (v as Vec3).x === 'number') {
      out[0] = (v as Vec3).x;
      out[1] = (v as Vec3).y;
      out[2] = (v as Vec3).z;
      return true;
    }
    if ((v as ArrayLike<number>).length >= 3) {
      out[0] = (v as ArrayLike<number>)[0];
      out[1] = (v as ArrayLike<number>)[1];
      out[2] = (v as ArrayLike<number>)[2];
      return true;
    }
    return false;
  }

  private _extractQuat(q: Quat | ArrayLike<number>, out: Float32Array): boolean {
    if ('w' in (q as Quat) && typeof (q as Quat).w === 'number') {
      out[0] = (q as Quat).x;
      out[1] = (q as Quat).y;
      out[2] = (q as Quat).z;
      out[3] = (q as Quat).w;
      return true;
    }
    if ((q as ArrayLike<number>).length >= 4) {
      out[0] = (q as ArrayLike<number>)[0];
      out[1] = (q as ArrayLike<number>)[1];
      out[2] = (q as ArrayLike<number>)[2];
      out[3] = (q as ArrayLike<number>)[3];
      return true;
    }
    return false;
  }

  private _normalizeQuat(q: Float32Array): void {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len > 1e-6) {
      const inv = 1 / len;
      q[0] *= inv;
      q[1] *= inv;
      q[2] *= inv;
      q[3] *= inv;
    } else {
      q[0] = 0;
      q[1] = 0;
      q[2] = 0;
      q[3] = 1;
    }
  }
}

/**
 * MotionStateTracker manages dual-hand (left & right) spatial motion tracking,
 * classifying kinematics and exposing wrist-flip triggers.
 */
export class MotionStateTracker {
  readonly left: HandMotionTracker;
  readonly right: HandMotionTracker;
  readonly config: MotionStateConfig;

  constructor(config?: Partial<MotionStateConfig>) {
    this.config = {
      ...DEFAULT_MOTION_STATE_CONFIG,
      ...config,
      wristFlip: {
        ...DEFAULT_MOTION_STATE_CONFIG.wristFlip,
        ...(config?.wristFlip || {}),
      },
    };

    this.left = new HandMotionTracker('left', this.config);
    this.right = new HandMotionTracker('right', this.config);
  }

  /**
   * Updates kinematics for an individual hand.
   */
  updateHand(
    handedness: Handedness,
    position: Vec3 | ArrayLike<number> | null | undefined,
    orientation?: Quat | ArrayLike<number> | null,
    timestampMs?: number,
  ): PerHandMotionData {
    return handedness === 'left'
      ? this.left.update(position, orientation, timestampMs)
      : this.right.update(position, orientation, timestampMs);
  }

  /**
   * Shorthand update alias matching single/multi-hand signatures.
   */
  update(
    handedness: Handedness,
    position: Vec3 | ArrayLike<number> | null | undefined,
    orientation?: Quat | ArrayLike<number> | null,
    timestampMs?: number,
  ): PerHandMotionData {
    return this.updateHand(handedness, position, orientation, timestampMs);
  }

  /**
   * Batch update from complete HaathFrameState.
   */
  updateFromFrame(
    frame: HaathFrameState,
    timestampMs?: number,
  ): { left: PerHandMotionData; right: PerHandMotionData } {
    return {
      left: this.left.updateFromHandState(frame.left, timestampMs),
      right: this.right.updateFromHandState(frame.right, timestampMs),
    };
  }

  /**
   * Resets both hands to initial stationary untracked states.
   */
  reset(): void {
    this.left.reset();
    this.right.reset();
  }
}
