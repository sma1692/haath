// BimanualComposer.ts
// Compositional Gesture Architecture & Two-Handed Compound Gesture Engine for haath
// High-performance, zero-GC WebXR spatial computing pipeline.

import {
  FLOATS_PER_JOINT,
  JOINT_COUNT,
  JOINT_INDEX,
} from './constants.js';
import {
  v3Add,
  v3Copy,
  v3Cross,
  v3Dist,
  v3Dot,
  v3Len,
  v3Normalize,
  v3Scale,
  v3Set,
  v3Sub,
} from './math/vec3.js';
import {
  MicroGestureDetector,
  type MicroGestureConfig,
  type MicroGestureState,
} from './MicroGestureDetector.js';
import {
  MotionStateTracker,
  type MotionStateConfig,
  type PerHandMotionData,
} from './MotionStateTracker.js';
import {
  RollingTrajectoryBuffer,
  type RollingTrajectoryBufferConfig,
  type TrajectoryMatchResult,
} from './RollingTrajectoryBuffer.js';
import {
  StaticPoseClassifier,
  type StaticPoseClassifierOptions,
  type StaticPoseMatch,
} from './StaticPoseClassifier.js';
import type { Handedness, HandPoseInput, JointName, Quat, Vec3 } from './types.js';

// ============================================================================
// Two-Hand Gesture Types & Interfaces
// ============================================================================

export interface KamehamehaState {
  active: boolean;
  state: 'idle' | 'charging' | 'charged' | 'pushed';
  charge: number; // 0..1
  origin: Float32Array; // [x, y, z] midpoint between hands
  direction: Float32Array; // [x, y, z] push thrust normal
  triggered: boolean; // True on exact frame push burst is released
}

export interface BowDrawReleaseState {
  active: boolean;
  state: 'idle' | 'aiming' | 'drawing' | 'released';
  bowHand: 'left' | 'right' | 'none';
  drawDistance: number; // In meters
  aimDirection: Float32Array; // Normalized vector from draw hand to bow hand
  arrowOrigin: Float32Array; // 3D position of bow hand
  power: number; // 0..1 based on draw extension
  triggered: boolean; // True on exact frame arrow is released
}

export interface PortalRipStretchState {
  active: boolean;
  state: 'idle' | 'gripping' | 'stretching' | 'ripped';
  stretchDistance: number; // Distance between hands in meters
  center: Float32Array; // Midpoint between hands
  normal: Float32Array; // Plane normal of the ripped portal
  triggered: boolean; // True on exact frame portal rips open
}

export interface TimeoutTState {
  active: boolean;
  triggered: boolean; // True on exact frame threshold duration is reached
  orientation: 'horizontal_left' | 'horizontal_right' | 'none';
  holdDuration: number; // In milliseconds
  center: Float32Array; // Midpoint of T formation
}

export interface TwoHandDialState {
  active: boolean;
  angle: number; // Current rotation angle in radians
  deltaAngle: number; // Angular change since last frame in radians
  center: Float32Array; // Rotation center
  axis: Float32Array; // Normal rotation axis
}

export interface BimanualFrameResult {
  wristDistance: number;
  handsCrossed: boolean;
  kamehameha: KamehamehaState;
  bow: BowDrawReleaseState;
  portal: PortalRipStretchState;
  timeout: TimeoutTState;
  dial: TwoHandDialState;
}

export interface CompositionalHandResult {
  tracked: boolean;
  pose: StaticPoseMatch | null;
  motion: PerHandMotionData;
  trajectory: TrajectoryMatchResult;
  micro: MicroGestureState;
}

export interface CompositionalFrameResult {
  left: CompositionalHandResult;
  right: CompositionalHandResult;
  bimanual: BimanualFrameResult;
}

export interface BimanualComposerConfig {
  kamehamehaChargeDist?: number; // meters (default: 0.28)
  kamehamehaMinChargeMs?: number; // ms (default: 350)
  kamehamehaThrustSpeed?: number; // m/s (default: 0.85)
  bowMinDrawDist?: number; // meters (default: 0.15)
  bowMaxDrawDist?: number; // meters (default: 0.55)
  portalInitialGripDist?: number; // meters (default: 0.22)
  portalStretchThreshold?: number; // meters (default: 0.45)
  timeoutProximityDist?: number; // meters (default: 0.10)
  timeoutMinDurationMs?: number; // ms (default: 250)
}

// Module-level pre-allocated scratch vectors for zero-GC math
const _scratchA = new Float32Array(3);
const _scratchB = new Float32Array(3);
const _scratchC = new Float32Array(3);
const _scratchLPos = new Float32Array(3);
const _scratchRPos = new Float32Array(3);
const _scratchLQuat = new Float32Array(4);
const _scratchRQuat = new Float32Array(4);

// ============================================================================
// BimanualComposer Class
// ============================================================================

export class BimanualComposer {
  private readonly _config: Required<BimanualComposerConfig>;

  private readonly _kamehameha: KamehamehaState = {
    active: false,
    state: 'idle',
    charge: 0,
    origin: new Float32Array(3),
    direction: new Float32Array([0, 0, -1]),
    triggered: false,
  };

  private readonly _bow: BowDrawReleaseState = {
    active: false,
    state: 'idle',
    bowHand: 'none',
    drawDistance: 0,
    aimDirection: new Float32Array([0, 0, -1]),
    arrowOrigin: new Float32Array(3),
    power: 0,
    triggered: false,
  };

  private readonly _portal: PortalRipStretchState = {
    active: false,
    state: 'idle',
    stretchDistance: 0,
    center: new Float32Array(3),
    normal: new Float32Array([0, 0, -1]),
    triggered: false,
  };

  private readonly _timeout: TimeoutTState = {
    active: false,
    triggered: false,
    orientation: 'none',
    holdDuration: 0,
    center: new Float32Array(3),
  };

  private readonly _dial: TwoHandDialState = {
    active: false,
    angle: 0,
    deltaAngle: 0,
    center: new Float32Array(3),
    axis: new Float32Array([0, 0, 1]),
  };

  private readonly _result: BimanualFrameResult = {
    wristDistance: Infinity,
    handsCrossed: false,
    kamehameha: this._kamehameha,
    bow: this._bow,
    portal: this._portal,
    timeout: this._timeout,
    dial: this._dial,
  };

  // Internal state tracking
  private _kamChargeTime = 0;
  private _kamCooldownUntil = 0;
  private _portalGripTime = 0;
  private _portalCooldownUntil = 0;
  private _timeoutHoldMs = 0;
  private _prevDialAngle = 0;
  private _hasPrevDialAngle = false;

  constructor(config: BimanualComposerConfig = {}) {
    this._config = {
      kamehamehaChargeDist: config.kamehamehaChargeDist ?? 0.28,
      kamehamehaMinChargeMs: config.kamehamehaMinChargeMs ?? 350,
      kamehamehaThrustSpeed: config.kamehamehaThrustSpeed ?? 0.85,
      bowMinDrawDist: config.bowMinDrawDist ?? 0.15,
      bowMaxDrawDist: config.bowMaxDrawDist ?? 0.55,
      portalInitialGripDist: config.portalInitialGripDist ?? 0.22,
      portalStretchThreshold: config.portalStretchThreshold ?? 0.45,
      timeoutProximityDist: config.timeoutProximityDist ?? 0.10,
      timeoutMinDurationMs: config.timeoutMinDurationMs ?? 250,
    };
  }

  public reset(): void {
    this._kamehameha.active = false;
    this._kamehameha.state = 'idle';
    this._kamehameha.charge = 0;
    this._kamehameha.triggered = false;

    this._bow.active = false;
    this._bow.state = 'idle';
    this._bow.bowHand = 'none';
    this._bow.drawDistance = 0;
    this._bow.power = 0;
    this._bow.triggered = false;

    this._portal.active = false;
    this._portal.state = 'idle';
    this._portal.stretchDistance = 0;
    this._portal.triggered = false;

    this._timeout.active = false;
    this._timeout.triggered = false;
    this._timeout.orientation = 'none';
    this._timeout.holdDuration = 0;

    this._dial.active = false;
    this._dial.angle = 0;
    this._dial.deltaAngle = 0;
    this._hasPrevDialAngle = false;

    this._kamChargeTime = 0;
    this._kamCooldownUntil = 0;
    this._portalGripTime = 0;
    this._portalCooldownUntil = 0;
    this._timeoutHoldMs = 0;
    this._result.wristDistance = Infinity;
    this._result.handsCrossed = false;
  }

  public update(
    leftPoses: Float32Array | null | undefined,
    leftOffset: number,
    leftPose: StaticPoseMatch | null,
    leftMotion: PerHandMotionData,
    rightPoses: Float32Array | null | undefined,
    rightOffset: number,
    rightPose: StaticPoseMatch | null,
    rightMotion: PerHandMotionData,
    deltaMs: number = 11.11,
    nowMs: number = typeof performance !== 'undefined' ? performance.now() : Date.now()
  ): BimanualFrameResult {
    // 1. Reset frame pulse triggers
    this._kamehameha.triggered = false;
    this._bow.triggered = false;
    this._portal.triggered = false;
    this._timeout.triggered = false;

    const hasLeft = Boolean(leftPoses && leftPoses.length >= leftOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    const hasRight = Boolean(rightPoses && rightPoses.length >= rightOffset + JOINT_COUNT * FLOATS_PER_JOINT);

    if (!hasLeft || !hasRight) {
      this.reset();
      return this._result;
    }

    const lJoints = leftPoses!;
    const rJoints = rightPoses!;

    const lWristOff = leftOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const rWristOff = rightOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;

    // Wrist distance & hands crossed
    const wristDist = v3Dist(lJoints, rJoints, lWristOff, rWristOff);
    this._result.wristDistance = wristDist;
    this._result.handsCrossed = lJoints[lWristOff] > rJoints[rWristOff];

    // Midpoint between wrists
    v3Add(_scratchC, lJoints, rJoints, lWristOff, rWristOff);
    v3Scale(_scratchC, _scratchC, 0.5);

    const lPoseName = leftPose ? leftPose.name : 'unknown';
    const rPoseName = rightPose ? rightPose.name : 'unknown';

    // ========================================================================
    // 1. Kamehameha Charge & Push
    // ========================================================================
    if (nowMs >= this._kamCooldownUntil) {
      const isClose = wristDist < this._config.kamehamehaChargeDist;
      const isCuppedOrFacing =
        lPoseName === 'open_palm' ||
        lPoseName === 'fist' ||
        lPoseName === 'asl_c' ||
        rPoseName === 'open_palm' ||
        rPoseName === 'fist' ||
        rPoseName === 'asl_c';

      if (isClose && isCuppedOrFacing) {
        this._kamChargeTime += deltaMs;
        const chargeProgress = Math.min(1.0, this._kamChargeTime / this._config.kamehamehaMinChargeMs);
        this._kamehameha.charge = chargeProgress;
        this._kamehameha.active = true;
        this._kamehameha.state = chargeProgress >= 1.0 ? 'charged' : 'charging';
        v3Copy(this._kamehameha.origin, _scratchC);

        // Forward thrust check: both hands moving forward along -Z in XR coordinate space
        const lFwdSpeed = -leftMotion.velocity[2];
        const rFwdSpeed = -rightMotion.velocity[2];

        if (this._kamehameha.charge >= 0.55 && lFwdSpeed > this._config.kamehamehaThrustSpeed && rFwdSpeed > this._config.kamehamehaThrustSpeed) {
          this._kamehameha.state = 'pushed';
          this._kamehameha.triggered = true;
          v3Set(this._kamehameha.direction, 0, 0, -1);
          this._kamCooldownUntil = nowMs + 800;
          this._kamChargeTime = 0;
        }
      } else {
        if (this._kamehameha.state === 'charging' || this._kamehameha.state === 'charged') {
          this._kamehameha.state = 'idle';
          this._kamehameha.charge = 0;
          this._kamehameha.active = false;
        }
        this._kamChargeTime = 0;
      }
    }

    // ========================================================================
    // 2. Bow Draw & Release
    // ========================================================================
    const lZ = lJoints[lWristOff + 2];
    const rZ = rJoints[rWristOff + 2];
    const bowIsLeft = lZ < rZ - 0.10;
    const bowIsRight = rZ < lZ - 0.10;

    if (bowIsLeft || bowIsRight) {
      const bowOff = bowIsLeft ? lWristOff : rWristOff;
      const drawOff = bowIsLeft ? rWristOff : lWristOff;
      const bowBuf = bowIsLeft ? lJoints : rJoints;
      const drawBuf = bowIsLeft ? rJoints : lJoints;
      const drawPoseName = bowIsLeft ? rPoseName : lPoseName;
      const drawMotion = bowIsLeft ? rightMotion : leftMotion;

      v3Sub(_scratchA, bowBuf, drawBuf, bowOff, drawOff);
      const drawDistance = v3Len(_scratchA);
      v3Normalize(_scratchB, _scratchA);

      const isGrip = drawPoseName === 'fist' || drawPoseName === 'pinch' || drawPoseName === 'asl_a';

      if (isGrip && drawDistance >= this._config.bowMinDrawDist) {
        this._bow.active = true;
        this._bow.state = 'drawing';
        this._bow.bowHand = bowIsLeft ? 'left' : 'right';
        this._bow.drawDistance = drawDistance;
        const span = Math.max(0.01, this._config.bowMaxDrawDist - this._config.bowMinDrawDist);
        this._bow.power = Math.min(1.0, Math.max(0, (drawDistance - this._config.bowMinDrawDist) / span));
        v3Copy(this._bow.aimDirection, _scratchB);
        v3Copy(this._bow.arrowOrigin, bowBuf, bowOff);
      } else if (this._bow.state === 'drawing') {
        // Arrow released: draw hand opened or high recoil release
        if (!isGrip || drawMotion.speed > 1.1) {
          this._bow.state = 'released';
          this._bow.triggered = true;
        } else {
          this._bow.state = 'idle';
          this._bow.active = false;
        }
      }
    } else if (this._bow.state !== 'released') {
      this._bow.active = false;
      this._bow.state = 'idle';
    }

    // ========================================================================
    // 3. Portal Rip & Stretch
    // ========================================================================
    if (nowMs >= this._portalCooldownUntil) {
      const isGripping =
        (lPoseName === 'fist' || lPoseName === 'pinch' || lPoseName === 'asl_a') &&
        (rPoseName === 'fist' || rPoseName === 'pinch' || rPoseName === 'asl_a');

      if (wristDist < this._config.portalInitialGripDist && isGripping) {
        this._portal.state = 'gripping';
        this._portal.active = true;
        this._portalGripTime = nowMs;
      } else if (this._portal.state === 'gripping' || this._portal.state === 'stretching') {
        if (wristDist > this._config.portalStretchThreshold && nowMs - this._portalGripTime < 1000) {
          this._portal.state = 'ripped';
          this._portal.triggered = true;
          this._portal.stretchDistance = wristDist;
          v3Copy(this._portal.center, _scratchC);
          v3Set(this._portal.normal, 0, 0, -1);
          this._portalCooldownUntil = nowMs + 1000;
        } else if (wristDist > this._config.portalInitialGripDist + 0.05) {
          this._portal.state = 'stretching';
          this._portal.stretchDistance = wristDist;
        } else if (nowMs - this._portalGripTime > 1200) {
          this._portal.state = 'idle';
          this._portal.active = false;
        }
      }
    }

    // ========================================================================
    // 4. Timeout 'T' Shape
    // ========================================================================
    const lTipDistToRPalm = v3Dist(lJoints, rJoints, lIndexTipOff, rWristOff);
    const rTipDistToLPalm = v3Dist(rJoints, lJoints, rIndexTipOff, lWristOff);

    let isTimeout = false;
    let orientation: 'horizontal_left' | 'horizontal_right' | 'none' = 'none';

    if (rTipDistToLPalm < this._config.timeoutProximityDist && lPoseName === 'open_palm') {
      isTimeout = true;
      orientation = 'horizontal_left';
      v3Copy(this._timeout.center, lJoints, lWristOff);
    } else if (lTipDistToRPalm < this._config.timeoutProximityDist && rPoseName === 'open_palm') {
      isTimeout = true;
      orientation = 'horizontal_right';
      v3Copy(this._timeout.center, rJoints, rWristOff);
    }

    if (isTimeout) {
      this._timeoutHoldMs += deltaMs;
      this._timeout.active = true;
      this._timeout.orientation = orientation;
      this._timeout.holdDuration = this._timeoutHoldMs;
      if (this._timeoutHoldMs >= this._config.timeoutMinDurationMs && !this._timeout.triggered) {
        this._timeout.triggered = true;
      }
    } else {
      this._timeoutHoldMs = 0;
      this._timeout.active = false;
      this._timeout.orientation = 'none';
      this._timeout.holdDuration = 0;
    }

    // ========================================================================
    // 5. Two-Hand Dial / Virtual Steering Wheel
    // ========================================================================
    if (wristDist > 0.08 && wristDist < 0.75) {
      this._dial.active = true;
      v3Copy(this._dial.center, _scratchC);

      const dx = rJoints[rWristOff] - lJoints[lWristOff];
      const dy = rJoints[rWristOff + 1] - lJoints[lWristOff + 1];
      const angle = Math.atan2(dy, dx);
      this._dial.angle = angle;

      if (this._hasPrevDialAngle) {
        let delta = angle - this._prevDialAngle;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        this._dial.deltaAngle = delta;
      } else {
        this._dial.deltaAngle = 0;
        this._hasPrevDialAngle = true;
      }
      this._prevDialAngle = angle;
    } else {
      this._dial.active = false;
      this._hasPrevDialAngle = false;
      this._dial.deltaAngle = 0;
    }

    return this._result;
  }
}

// ============================================================================
// CompositionalGestureEngine (Unified Pipeline)
// ============================================================================

export interface CompositionalGestureEngineOptions {
  pose?: StaticPoseClassifierOptions;
  motion?: Partial<MotionStateConfig>;
  trajectory?: RollingTrajectoryBufferConfig;
  micro?: MicroGestureConfig;
  bimanual?: BimanualComposerConfig;
}

export class CompositionalGestureEngine {
  public readonly pose: {
    left: StaticPoseClassifier;
    right: StaticPoseClassifier;
  };

  public readonly motion: MotionStateTracker;

  public readonly trajectory: {
    left: RollingTrajectoryBuffer;
    right: RollingTrajectoryBuffer;
  };

  public readonly micro: {
    left: MicroGestureDetector;
    right: MicroGestureDetector;
  };

  public readonly bimanual: BimanualComposer;

  private readonly _leftHandResult: CompositionalHandResult;
  private readonly _rightHandResult: CompositionalHandResult;
  private readonly _frameResult: CompositionalFrameResult;

  constructor(options: CompositionalGestureEngineOptions = {}) {
    this.pose = {
      left: new StaticPoseClassifier(options.pose),
      right: new StaticPoseClassifier(options.pose),
    };

    this.motion = new MotionStateTracker(options.motion);

    this.trajectory = {
      left: new RollingTrajectoryBuffer(options.trajectory),
      right: new RollingTrajectoryBuffer(options.trajectory),
    };

    this.micro = {
      left: new MicroGestureDetector(options.micro),
      right: new MicroGestureDetector(options.micro),
    };

    this.bimanual = new BimanualComposer(options.bimanual);

    this._leftHandResult = {
      tracked: false,
      pose: null,
      motion: this.motion.left.data,
      trajectory: this.trajectory.left.recognize(),
      micro: this.micro.left.state,
    };

    this._rightHandResult = {
      tracked: false,
      pose: null,
      motion: this.motion.right.data,
      trajectory: this.trajectory.right.recognize(),
      micro: this.micro.right.state,
    };

    this._frameResult = {
      left: this._leftHandResult,
      right: this._rightHandResult,
      bimanual: this.bimanual.update(
        null, 0, null, this.motion.left.data,
        null, 0, null, this.motion.right.data
      ),
    };
  }

  public reset(): void {
    this.motion.reset();
    this.trajectory.left.clear();
    this.trajectory.right.clear();
    this.micro.left.reset();
    this.micro.right.reset();
    this.bimanual.reset();
  }

  public update(
    leftPoses: Float32Array | null | undefined,
    leftOffset: number = 0,
    rightPoses: Float32Array | null | undefined,
    rightOffset: number = 0,
    deltaSeconds: number = 1 / 90,
    nowMs: number = typeof performance !== 'undefined' ? performance.now() : Date.now()
  ): CompositionalFrameResult {
    const hasLeft = Boolean(leftPoses && leftPoses.length >= leftOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    const hasRight = Boolean(rightPoses && rightPoses.length >= rightOffset + JOINT_COUNT * FLOATS_PER_JOINT);

    this._leftHandResult.tracked = hasLeft;
    this._rightHandResult.tracked = hasRight;

    // 1. Static Hand Pose Classification
    const leftPoseMatch = hasLeft ? this.pose.left.classify(leftPoses!, leftOffset, 'left') : null;
    const rightPoseMatch = hasRight ? this.pose.right.classify(rightPoses!, rightOffset, 'right') : null;
    this._leftHandResult.pose = leftPoseMatch;
    this._rightHandResult.pose = rightPoseMatch;

    // 2. Motion Kinematics & Spatial Tracking
    let leftMotion: PerHandMotionData;
    let rightMotion: PerHandMotionData;

    if (hasLeft) {
      const lWristOff = leftOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
      v3Copy(_scratchLPos, leftPoses!, lWristOff);
      const lProxOff = leftOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
      _scratchLQuat[0] = leftPoses![lProxOff + 3];
      _scratchLQuat[1] = leftPoses![lProxOff + 4];
      _scratchLQuat[2] = leftPoses![lProxOff + 5];
      _scratchLQuat[3] = leftPoses![lProxOff + 6];
      leftMotion = this.motion.left.update(_scratchLPos, _scratchLQuat, nowMs);
    } else {
      leftMotion = this.motion.left.update(null, null, nowMs);
    }

    if (hasRight) {
      const rWristOff = rightOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
      v3Copy(_scratchRPos, rightPoses!, rWristOff);
      const rProxOff = rightOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
      _scratchRQuat[0] = rightPoses![rProxOff + 3];
      _scratchRQuat[1] = rightPoses![rProxOff + 4];
      _scratchRQuat[2] = rightPoses![rProxOff + 5];
      _scratchRQuat[3] = rightPoses![rProxOff + 6];
      rightMotion = this.motion.right.update(_scratchRPos, _scratchRQuat, nowMs);
    } else {
      rightMotion = this.motion.right.update(null, null, nowMs);
    }

    this._leftHandResult.motion = leftMotion;
    this._rightHandResult.motion = rightMotion;

    // 3. Trajectory Buffering & Multi-Gesture Recognition
    if (hasLeft) {
      const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
      this.trajectory.left.addSample(nowMs, leftPoses![lIndexTipOff], leftPoses![lIndexTipOff + 1], leftPoses![lIndexTipOff + 2], 'index-finger-tip');
      this.trajectory.left.prune(nowMs);
    }
    if (hasRight) {
      const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
      this.trajectory.right.addSample(nowMs, rightPoses![rIndexTipOff], rightPoses![rIndexTipOff + 1], rightPoses![rIndexTipOff + 2], 'index-finger-tip');
      this.trajectory.right.prune(nowMs);
    }

    this._leftHandResult.trajectory = this.trajectory.left.recognize();
    this._rightHandResult.trajectory = this.trajectory.right.recognize();

    // 4. Micro-Gesture Detection
    if (hasLeft) {
      this._leftHandResult.micro = this.micro.left.update(leftPoses!, leftOffset, deltaSeconds, nowMs);
    } else {
      this.micro.left.reset();
      this._leftHandResult.micro = this.micro.left.state;
    }

    if (hasRight) {
      this._rightHandResult.micro = this.micro.right.update(rightPoses!, rightOffset, deltaSeconds, nowMs);
    } else {
      this.micro.right.reset();
      this._rightHandResult.micro = this.micro.right.state;
    }

    // 5. Bimanual Composer
    const deltaMs = deltaSeconds * 1000;
    this._frameResult.bimanual = this.bimanual.update(
      leftPoses, leftOffset, leftPoseMatch, leftMotion,
      rightPoses, rightOffset, rightPoseMatch, rightMotion,
      deltaMs, nowMs
    );

    return this._frameResult;
  }
}
