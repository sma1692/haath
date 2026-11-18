import { e as Handedness, V as Vec3, ag as Quat, S as SingleHandState, H as HaathFrameState, a7 as JointName, j as HandPoseInput, F as FingerExtensionState } from './types-TNkY3J3h.js';

type MotionState = 'STATIONARY' | 'MICRO_MOVING' | 'TRANSLATING' | 'BALLISTIC';
declare const MotionState: {
    readonly STATIONARY: "STATIONARY";
    readonly MICRO_MOVING: "MICRO_MOVING";
    readonly TRANSLATING: "TRANSLATING";
    readonly BALLISTIC: "BALLISTIC";
};
type FlipDirection = 'palm-up' | 'palm-down' | 'inward' | 'outward' | 'neutral';
interface WristFlipConfig {
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
interface MotionStateConfig {
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
declare const DEFAULT_MOTION_STATE_CONFIG: MotionStateConfig;
interface WristFlipState {
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
interface PerHandMotionData {
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
declare function classifyMotionState(speed: number, accelMag: number, angularSpeed: number, config?: MotionStateConfig): MotionState;
/**
 * Wrist-Flip Utility Trigger.
 * Detects rapid pronation/supination or wrist snap gestures, providing
 * one-shot event triggering, direction estimation, and cooldown debouncing.
 */
declare class WristFlipTrigger {
    readonly state: WristFlipState;
    private _config;
    private _windowTimeMs;
    constructor(config?: WristFlipConfig);
    get config(): Required<WristFlipConfig>;
    setConfig(config: Partial<WristFlipConfig>): void;
    /**
     * Updates the trigger state per frame.
     * Zero allocation in update loop.
     */
    update(angularSpeed: number, deltaAngle: number, linearSpeed: number, orientationQuat: Float32Array | null, deltaMs: number): WristFlipState;
    private _computeDirection;
    reset(): void;
}
/**
 * HandMotionTracker tracks a single hand's kinematics and state.
 * Fully pre-allocated, zero-GC per frame.
 */
declare class HandMotionTracker {
    readonly handedness: Handedness;
    readonly data: PerHandMotionData;
    readonly wristFlip: WristFlipTrigger;
    config: MotionStateConfig;
    private _hasPrev;
    private _prevTimeMs;
    private readonly _prevPos;
    private readonly _prevVel;
    private readonly _rawVel;
    private readonly _prevAccel;
    private readonly _rawAccel;
    private readonly _prevQuat;
    private readonly _currQuat;
    private readonly _rawAngVel;
    private readonly _prevAngVel;
    private readonly _posScratch;
    private readonly _quatScratch;
    constructor(handedness: Handedness, config?: Partial<MotionStateConfig>);
    /**
     * Main kinematics update method.
     * Supports Vec3/Quat objects, Float32Arrays, or ArrayLike tuples.
     * Zero allocations per call.
     */
    update(position: Vec3 | ArrayLike<number> | null | undefined, orientation?: Quat | ArrayLike<number> | null, timestampMs?: number): PerHandMotionData;
    /**
     * Updates state from a Haath SingleHandState (e.g. from SingleHandRecognizer).
     */
    updateFromHandState(handState: SingleHandState, timestampMs?: number): PerHandMotionData;
    markUntracked(timestampMs?: number): PerHandMotionData;
    reset(): void;
    private _computeAngularVelocity;
    private _zeroOutputs;
    private _extractVec3;
    private _extractQuat;
    private _normalizeQuat;
}
/**
 * MotionStateTracker manages dual-hand (left & right) spatial motion tracking,
 * classifying kinematics and exposing wrist-flip triggers.
 */
declare class MotionStateTracker {
    readonly left: HandMotionTracker;
    readonly right: HandMotionTracker;
    readonly config: MotionStateConfig;
    constructor(config?: Partial<MotionStateConfig>);
    /**
     * Updates kinematics for an individual hand.
     */
    updateHand(handedness: Handedness, position: Vec3 | ArrayLike<number> | null | undefined, orientation?: Quat | ArrayLike<number> | null, timestampMs?: number): PerHandMotionData;
    /**
     * Shorthand update alias matching single/multi-hand signatures.
     */
    update(handedness: Handedness, position: Vec3 | ArrayLike<number> | null | undefined, orientation?: Quat | ArrayLike<number> | null, timestampMs?: number): PerHandMotionData;
    /**
     * Batch update from complete HaathFrameState.
     */
    updateFromFrame(frame: HaathFrameState, timestampMs?: number): {
        left: PerHandMotionData;
        right: PerHandMotionData;
    };
    /**
     * Resets both hands to initial stationary untracked states.
     */
    reset(): void;
}

type MicroGestureType = 'none' | 'money_rub' | 'thumb_index_tap' | 'thumb_index_double_tap' | 'thumb_slide' | 'finger_flick' | 'finger_snap';
interface MoneyRubState {
    active: boolean;
    rubCount: number;
    reversals: number;
    intensity: number;
}
interface ThumbIndexTapState {
    tapped: boolean;
    doubleTapped: boolean;
    tapCount: number;
    lastTapTimeMs: number;
    contactDistance: number;
}
interface ThumbSlideState {
    active: boolean;
    direction: 'proximal_to_distal' | 'distal_to_proximal' | 'none';
    displacement: number;
    velocity: number;
    progress: number;
}
interface FingerFlickState {
    triggered: boolean;
    finger: 'index' | 'middle' | 'none';
    speed: number;
}
interface FingerSnapState {
    triggered: boolean;
    finger: 'middle' | 'index' | 'none';
    intensity: number;
    speed: number;
}
interface MicroGestureState {
    active: MicroGestureType;
    moneyRub: MoneyRubState;
    thumbIndexTap: ThumbIndexTapState;
    thumbSlide: ThumbSlideState;
    fingerFlick: FingerFlickState;
    fingerSnap: FingerSnapState;
}
interface MicroGestureConfig {
    tapContactDist?: number;
    tapSeparationDist?: number;
    doubleTapMinMs?: number;
    doubleTapMaxMs?: number;
    slideContactDist?: number;
    slideMinDisplacement?: number;
    slideMinVelocity?: number;
    rubContactDist?: number;
    rubWindowMs?: number;
    rubMinReversals?: number;
    rubMinStrokeDist?: number;
    flickHoldDist?: number;
    flickMinHoldFrames?: number;
    flickReleaseSpeed?: number;
    flickExtensionSpeed?: number;
    snapPreLoadDist?: number;
    snapMinHoldFrames?: number;
    snapReleaseSpeed?: number;
    snapPalmImpactDist?: number;
    snapPalmApproachSpeed?: number;
}
declare const DEFAULT_MICRO_GESTURE_CONFIG: Required<MicroGestureConfig>;
declare function createMicroGestureState(): MicroGestureState;
/**
 * Stateful micro-gesture detector evaluating fine-grained joint kinematics:
 * money rub, thumb-index tap/double-tap, thumb slide, finger flick, and finger snap.
 * Zero heap allocations during update loop.
 */
declare class MicroGestureDetector {
    private readonly _config;
    readonly state: MicroGestureState;
    private readonly _vTemp1;
    private readonly _vTemp2;
    private readonly _vDir;
    private readonly _vRel;
    private readonly _vPrevRel;
    private readonly _rubStrokeAcc;
    private readonly _palmPos;
    private _tapInContact;
    private _lastTapTimeMs;
    private _slideTracking;
    private _lastSlideProj;
    private _slideDirSign;
    private _accumulatedSlideDisplacement;
    private _hasPrevRel;
    private _rubReversals;
    private _lastRubContactMs;
    private _flickHoldFramesIndex;
    private _flickHoldFramesMiddle;
    private _prevFlickThumbDistIndex;
    private _prevFlickWristDistIndex;
    private _prevFlickThumbDistMiddle;
    private _prevFlickWristDistMiddle;
    private _snapHoldFramesMiddle;
    private _snapHoldFramesIndex;
    private _prevSnapThumbDistMiddle;
    private _prevSnapPalmDistMiddle;
    private _prevSnapThumbDistIndex;
    private _prevSnapPalmDistIndex;
    constructor(config?: MicroGestureConfig);
    reset(): void;
    /**
     * Updates micro-gesture evaluation from a 25-joint XR poses buffer.
     * @param poses Float32Array containing 25-joint pose data.
     * @param frameOffset Starting float offset in poses buffer (default 0).
     * @param deltaSeconds Time elapsed since last frame in seconds (default 1/60).
     * @param nowMs Current monotonic timestamp in milliseconds.
     * @param stride Floats per joint in buffer (default FLOATS_PER_JOINT = 7).
     */
    update(poses: Float32Array, frameOffset?: number, deltaSeconds?: number, nowMs?: number, stride?: number): MicroGestureState;
}

type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'forward';
type TrajectoryGestureType = 'circle_cw' | 'circle_ccw' | 'triangle' | 'line_swipe' | 'line_swipe_up' | 'line_swipe_down' | 'line_swipe_left' | 'line_swipe_right' | 'line_swipe_forward' | 'lightning_z' | 'infinity' | 'spiral_in' | 'spiral_out' | 'star' | 'cross';
interface TrajectorySample {
    timeMs: number;
    x: number;
    y: number;
    z: number;
    joint?: JointName | string;
}
interface DominantPlane {
    centroid: Float32Array;
    normal: Float32Array;
    uAxis: Float32Array;
    vAxis: Float32Array;
    residual: number;
}
interface TrajectoryMatchResult {
    gesture: TrajectoryGestureType | null;
    confidence: number;
    direction?: SwipeDirection;
    durationMs: number;
    pathLength: number;
    sampleCount: number;
    dominantPlane: DominantPlane | null;
    centroid: Float32Array;
    scores?: Partial<Record<TrajectoryGestureType, number>>;
}
interface RollingTrajectoryBufferConfig {
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
declare class RollingTrajectoryBuffer {
    private readonly _maxDurationMs;
    private readonly _capacity;
    private readonly _minSamples;
    private readonly _minPathLength;
    private readonly _anchorJoint;
    private readonly _minConfidence;
    private readonly _times;
    private readonly _positions;
    private _head;
    private _count;
    private readonly _scratchCentroid;
    private readonly _scratchNormal;
    private readonly _scratchU;
    private readonly _scratchV;
    constructor(config?: RollingTrajectoryBufferConfig);
    get capacity(): number;
    get count(): number;
    get maxDurationMs(): number;
    clear(): void;
    /**
     * Appends a raw 3D position sample with timestamp.
     */
    addSample(timeMs: number, x: number, y: number, z: number, _joint?: JointName | string): void;
    /**
     * Ingests full HandPoseInput and automatically tracks the configured anchor joint.
     */
    addPose(timeMs: number, pose: HandPoseInput, jointName?: JointName): boolean;
    /**
     * Prunes samples strictly older than (nowMs - maxDurationMs).
     */
    prune(nowMs: number): void;
    /**
     * Retrieves active samples in chronological order within the specified window.
     */
    getSamples(windowMs?: number): TrajectorySample[];
    /**
     * Returns flat Float32Array [x0, y0, z0, x1, y1, z1, ...] of points in window.
     */
    getRawPoints(windowMs?: number): Float32Array;
    /**
     * Computes the dominant 3D plane for the given window using swept normal & Newell's method.
     */
    computeDominantPlane(windowMs?: number): DominantPlane | null;
    /**
     * Evaluates the rolling buffer and recognizes trajectory gestures.
     */
    recognize(windowMs?: number): TrajectoryMatchResult;
    private _getJointNumericIndex;
    private _createEmptyResult;
}
interface TrajectoryRecognitionOptions {
    durationMs?: number;
    pathLength?: number;
    minConfidence?: number;
}
/**
 * Computes dominant plane from flat 3D point stream [x0, y0, z0, ...].
 */
declare function computeDominantPlaneFromPoints(pts: Float32Array): DominantPlane | null;
/**
 * Projects 3D points [x, y, z] to 2D [u, v] coordinates in dominant plane basis.
 */
declare function projectPointsToPlane(pts: Float32Array, plane: DominantPlane): Float32Array;
/**
 * Resamples a polyline of 2D or 3D points to an equidistant count of points.
 */
declare function resampleTrajectory(pts: Float32Array, dims: number, targetCount: number): Float32Array;
/**
 * Recognizes trajectory gestures from raw flat 3D point stream.
 */
declare function recognizeTrajectoryFrom3DPoints(pts: Float32Array, opts?: TrajectoryRecognitionOptions): TrajectoryMatchResult;

type FingerFlexion = 'extended' | 'curled' | 'half_curled';
type FingerRequirement = 'extended' | 'curled' | 'half_curled' | 'any';
interface SingleFingerAnalysis {
    extended: boolean;
    curled: boolean;
    halfCurled: boolean;
    curlScore: number;
}
interface HandFingerAnalysis {
    thumb: SingleFingerAnalysis;
    index: SingleFingerAnalysis;
    middle: SingleFingerAnalysis;
    ring: SingleFingerAnalysis;
    pinky: SingleFingerAnalysis;
    extensions: FingerExtensionState;
}
interface PoseEvaluationContext {
    poses: Float32Array;
    frameOffset: number;
    handedness: Handedness;
    fingers: HandFingerAnalysis;
    pinchDist: number;
    directionThreshold: number;
    getJointPos: (jointIndex: number, out: Float32Array) => Float32Array;
    getDistance: (jointA: number, jointB: number) => number;
    getDirection: (fromJoint: number, toJoint: number, out: Float32Array) => Float32Array;
}
interface StaticPoseDefinition {
    name: string;
    category?: 'core' | 'asl' | 'custom' | string;
    description?: string;
    fingers?: {
        thumb?: FingerRequirement;
        index?: FingerRequirement;
        middle?: FingerRequirement;
        ring?: FingerRequirement;
        pinky?: FingerRequirement;
    };
    match?: (ctx: PoseEvaluationContext) => number | boolean;
    priority?: number;
}
interface StaticPoseMatch {
    name: string;
    confidence: number;
    category?: string;
}
interface StaticPoseClassifierOptions {
    poses?: StaticPoseDefinition[];
    minConfidence?: number;
    pinchDist?: number;
    directionThreshold?: number;
    curlDot?: number;
}
/**
 * Analyzes curl and extension state across all 5 fingers for a single frame.
 */
declare function analyzeFingers(poses: Float32Array, frameOffset?: number, curlDot?: number): HandFingerAnalysis;
/**
 * StaticPoseClassifier classifies rigid hand shapes against configured pose packs.
 * Zero external dependencies, pure TS math, and zero allocations during classification.
 */
declare class StaticPoseClassifier {
    private readonly _poses;
    private readonly _minConfidence;
    private readonly _pinchDist;
    private readonly _directionThreshold;
    private readonly _curlDot;
    constructor(options?: StaticPoseClassifierOptions);
    registerPose(pose: StaticPoseDefinition): void;
    registerPack(pack: StaticPoseDefinition[]): void;
    unregisterPose(name: string): boolean;
    clear(): void;
    getRegisteredPoses(): StaticPoseDefinition[];
    /**
     * Evaluates all registered poses against the frame poses buffer and returns the single highest confidence match.
     */
    classify(poses: Float32Array, frameOffset?: number, handedness?: Handedness): StaticPoseMatch | null;
    /**
     * Evaluates all registered poses and returns matches above minConfidence, sorted by confidence * priority descending.
     */
    classifyAll(poses: Float32Array, frameOffset?: number, handedness?: Handedness): StaticPoseMatch[];
    isPose(name: string, poses: Float32Array, frameOffset?: number, handedness?: Handedness): boolean;
    getConfidence(name: string, poses: Float32Array, frameOffset?: number, handedness?: Handedness): number;
}

type CorePoseName = 'fist' | 'open_palm' | 'point' | 'pinch' | 'peace' | 'thumbs_up' | 'thumbs_down' | 'horns' | 'shaka' | 'finger_gun' | 'ok_sign';
type ASLPoseName = 'asl_a' | 'asl_b' | 'asl_c' | 'asl_d' | 'asl_e' | 'asl_f' | 'asl_g' | 'asl_h' | 'asl_i' | 'asl_k' | 'asl_l' | 'asl_o' | 'asl_s' | 'asl_u' | 'asl_v' | 'asl_w' | 'asl_x' | 'asl_y';
type PoseName = CorePoseName | ASLPoseName;
declare const FIST_POSE: StaticPoseDefinition;
declare const OPEN_PALM_POSE: StaticPoseDefinition;
declare const POINT_POSE: StaticPoseDefinition;
declare const PINCH_POSE: StaticPoseDefinition;
declare const PEACE_POSE: StaticPoseDefinition;
declare const THUMBS_UP_POSE: StaticPoseDefinition;
declare const THUMBS_DOWN_POSE: StaticPoseDefinition;
declare const HORNS_POSE: StaticPoseDefinition;
declare const SHAKA_POSE: StaticPoseDefinition;
declare const FINGER_GUN_POSE: StaticPoseDefinition;
declare const OK_SIGN_POSE: StaticPoseDefinition;
declare const CoreStaticPosePack: StaticPoseDefinition[];
declare const ASL_A_POSE: StaticPoseDefinition;
declare const ASL_B_POSE: StaticPoseDefinition;
declare const ASL_C_POSE: StaticPoseDefinition;
declare const ASL_D_POSE: StaticPoseDefinition;
declare const ASL_E_POSE: StaticPoseDefinition;
declare const ASL_F_POSE: StaticPoseDefinition;
declare const ASL_G_POSE: StaticPoseDefinition;
declare const ASL_H_POSE: StaticPoseDefinition;
declare const ASL_I_POSE: StaticPoseDefinition;
declare const ASL_K_POSE: StaticPoseDefinition;
declare const ASL_L_POSE: StaticPoseDefinition;
declare const ASL_O_POSE: StaticPoseDefinition;
declare const ASL_S_POSE: StaticPoseDefinition;
declare const ASL_U_POSE: StaticPoseDefinition;
declare const ASL_V_POSE: StaticPoseDefinition;
declare const ASL_W_POSE: StaticPoseDefinition;
declare const ASL_X_POSE: StaticPoseDefinition;
declare const ASL_Y_POSE: StaticPoseDefinition;
declare const ASLStaticPosePack: StaticPoseDefinition[];

interface KamehamehaState {
    active: boolean;
    state: 'idle' | 'charging' | 'charged' | 'pushed';
    charge: number;
    origin: Float32Array;
    direction: Float32Array;
    triggered: boolean;
}
interface BowDrawReleaseState {
    active: boolean;
    state: 'idle' | 'aiming' | 'drawing' | 'released';
    bowHand: 'left' | 'right' | 'none';
    drawDistance: number;
    aimDirection: Float32Array;
    arrowOrigin: Float32Array;
    power: number;
    triggered: boolean;
}
interface PortalRipStretchState {
    active: boolean;
    state: 'idle' | 'gripping' | 'stretching' | 'ripped';
    stretchDistance: number;
    center: Float32Array;
    normal: Float32Array;
    triggered: boolean;
}
interface TimeoutTState {
    active: boolean;
    triggered: boolean;
    orientation: 'horizontal_left' | 'horizontal_right' | 'none';
    holdDuration: number;
    center: Float32Array;
}
interface TwoHandDialState {
    active: boolean;
    angle: number;
    deltaAngle: number;
    center: Float32Array;
    axis: Float32Array;
}
interface BimanualFrameResult {
    wristDistance: number;
    handsCrossed: boolean;
    kamehameha: KamehamehaState;
    bow: BowDrawReleaseState;
    portal: PortalRipStretchState;
    timeout: TimeoutTState;
    dial: TwoHandDialState;
}
interface CompositionalHandResult {
    tracked: boolean;
    pose: StaticPoseMatch | null;
    motion: PerHandMotionData;
    trajectory: TrajectoryMatchResult;
    micro: MicroGestureState;
}
interface CompositionalFrameResult {
    left: CompositionalHandResult;
    right: CompositionalHandResult;
    bimanual: BimanualFrameResult;
}
interface BimanualComposerConfig {
    kamehamehaChargeDist?: number;
    kamehamehaMinChargeMs?: number;
    kamehamehaThrustSpeed?: number;
    bowMinDrawDist?: number;
    bowMaxDrawDist?: number;
    portalInitialGripDist?: number;
    portalStretchThreshold?: number;
    timeoutProximityDist?: number;
    timeoutMinDurationMs?: number;
}
declare class BimanualComposer {
    private readonly _config;
    private readonly _kamehameha;
    private readonly _bow;
    private readonly _portal;
    private readonly _timeout;
    private readonly _dial;
    private readonly _result;
    private _kamChargeTime;
    private _kamCooldownUntil;
    private _portalGripTime;
    private _portalCooldownUntil;
    private _timeoutHoldMs;
    private _prevDialAngle;
    private _hasPrevDialAngle;
    constructor(config?: BimanualComposerConfig);
    reset(): void;
    update(leftPoses: Float32Array | null | undefined, leftOffset: number, leftPose: StaticPoseMatch | null, leftMotion: PerHandMotionData, rightPoses: Float32Array | null | undefined, rightOffset: number, rightPose: StaticPoseMatch | null, rightMotion: PerHandMotionData, deltaMs?: number, nowMs?: number): BimanualFrameResult;
}
interface CompositionalGestureEngineOptions {
    pose?: StaticPoseClassifierOptions;
    motion?: Partial<MotionStateConfig>;
    trajectory?: RollingTrajectoryBufferConfig;
    micro?: MicroGestureConfig;
    bimanual?: BimanualComposerConfig;
}
declare class CompositionalGestureEngine {
    readonly pose: {
        left: StaticPoseClassifier;
        right: StaticPoseClassifier;
    };
    readonly motion: MotionStateTracker;
    readonly trajectory: {
        left: RollingTrajectoryBuffer;
        right: RollingTrajectoryBuffer;
    };
    readonly micro: {
        left: MicroGestureDetector;
        right: MicroGestureDetector;
    };
    readonly bimanual: BimanualComposer;
    private readonly _leftHandResult;
    private readonly _rightHandResult;
    private readonly _frameResult;
    constructor(options?: CompositionalGestureEngineOptions);
    reset(): void;
    update(leftPoses: Float32Array | null | undefined, leftOffset: number | undefined, rightPoses: Float32Array | null | undefined, rightOffset?: number, deltaSeconds?: number, nowMs?: number): CompositionalFrameResult;
}

export { type ASLPoseName, ASLStaticPosePack, ASL_A_POSE, ASL_B_POSE, ASL_C_POSE, ASL_D_POSE, ASL_E_POSE, ASL_F_POSE, ASL_G_POSE, ASL_H_POSE, ASL_I_POSE, ASL_K_POSE, ASL_L_POSE, ASL_O_POSE, ASL_S_POSE, ASL_U_POSE, ASL_V_POSE, ASL_W_POSE, ASL_X_POSE, ASL_Y_POSE, BimanualComposer, type BimanualComposerConfig, type BimanualFrameResult, type BowDrawReleaseState, type CompositionalFrameResult, CompositionalGestureEngine, type CompositionalGestureEngineOptions, type CompositionalHandResult, type CorePoseName, CoreStaticPosePack, DEFAULT_MICRO_GESTURE_CONFIG, DEFAULT_MOTION_STATE_CONFIG, type DominantPlane, FINGER_GUN_POSE, FIST_POSE, type FingerFlexion, type FingerFlickState, type FingerRequirement, type FingerSnapState, type FlipDirection, HORNS_POSE, type HandFingerAnalysis, HandMotionTracker, type KamehamehaState, type MicroGestureConfig, MicroGestureDetector, type MicroGestureState, type MicroGestureType, type MoneyRubState, MotionState, type MotionStateConfig, MotionStateTracker, OK_SIGN_POSE, OPEN_PALM_POSE, PEACE_POSE, PINCH_POSE, POINT_POSE, type PerHandMotionData, type PortalRipStretchState, type PoseEvaluationContext, type PoseName, RollingTrajectoryBuffer, type RollingTrajectoryBufferConfig, SHAKA_POSE, type SingleFingerAnalysis, StaticPoseClassifier, type StaticPoseClassifierOptions, type StaticPoseDefinition, type StaticPoseMatch, type SwipeDirection, THUMBS_DOWN_POSE, THUMBS_UP_POSE, type ThumbIndexTapState, type ThumbSlideState, type TimeoutTState, type TrajectoryGestureType, type TrajectoryMatchResult, type TrajectoryRecognitionOptions, type TrajectorySample, type TwoHandDialState, type WristFlipConfig, type WristFlipState, WristFlipTrigger, analyzeFingers, classifyMotionState, computeDominantPlaneFromPoints, createMicroGestureState, projectPointsToPlane, recognizeTrajectoryFrom3DPoints, resampleTrajectory };
