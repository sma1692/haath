declare const XR_HAND_JOINTS: readonly ["wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip", "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip", "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip", "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip", "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"];
declare const JOINT_COUNT = 25;
declare const FLOATS_PER_JOINT = 7;
declare const POS_HISTORY_COUNT = 20;
declare const JOINT_INDEX: {
    readonly WRIST: 0;
    readonly THUMB_METACARPAL: 1;
    readonly THUMB_PROXIMAL: 2;
    readonly THUMB_DISTAL: 3;
    readonly THUMB_TIP: 4;
    readonly INDEX_METACARPAL: 5;
    readonly INDEX_PROXIMAL: 6;
    readonly INDEX_INTERMEDIATE: 7;
    readonly INDEX_DISTAL: 8;
    readonly INDEX_TIP: 9;
    readonly MIDDLE_METACARPAL: 10;
    readonly MIDDLE_PROXIMAL: 11;
    readonly MIDDLE_INTERMEDIATE: 12;
    readonly MIDDLE_DISTAL: 13;
    readonly MIDDLE_TIP: 14;
    readonly RING_METACARPAL: 15;
    readonly RING_PROXIMAL: 16;
    readonly RING_INTERMEDIATE: 17;
    readonly RING_DISTAL: 18;
    readonly RING_TIP: 19;
    readonly PINKY_METACARPAL: 20;
    readonly PINKY_PROXIMAL: 21;
    readonly PINKY_INTERMEDIATE: 22;
    readonly PINKY_DISTAL: 23;
    readonly PINKY_TIP: 24;
};
declare const CURL_DOT = 0.6;
declare const THUMBOPEN = 0.07;
declare const FINGEROPEN = 0.1;
declare const DIRECTION_THRESHOLD = 0.72;
declare const PINCH_DIST = 0.03;
declare const PUNCH_SPEED = 1.3;
declare const SLAP_SPEED = 1.8;
declare const PALM_COLLIDER_RADIUS = 0.05;
declare const TRIANGLE_TIP_DIST = 0.12;
declare const TRIANGLE_THUMB_DIST = 0.14;
declare const TRIANGLE_FINGER_DOT = 0.35;
declare const CLAP_ORIGIN_MIN_DIST = 0.05;
declare const CLAP_CONTACT_DIST = 0.17;
declare const CLAP_SEPARATION_DIST = 0.195;
declare const CLAP_DOUBLE_MIN_MS = 90;
declare const CLAP_DOUBLE_MAX_MS = 1100;
declare const CIRCLE_HISTORY_FRAMES = 90;
declare const CIRCLE_MIN_SAMPLES = 30;
declare const CIRCLE_MIN_RADIUS = 0.06;
declare const CIRCLE_MAX_IRREGULARITY = 0.55;
declare const CIRCLE_MIN_REVOLUTIONS = 1.2;
declare const DISC_FIRE_COOLDOWN_MS = 800;
declare const HOLD_SIGN_STABILITY_FRAMES = 10;
declare const HOLD_COUNT_STABILITY_FRAMES = 6;
declare const HOLD_DEFAULT_DURATION_MS = 1000;
declare const HOLD_COOLDOWN_MS = 800;
declare const COLLISION_DURATION = 200;
declare const SPELL_CONFIG: {
    readonly HISTORY_FRAMES: 90;
    readonly MIN_SAMPLES: 30;
    readonly MIN_RADIUS: 0.06;
    readonly MAX_RADIUS: 0.45;
    readonly MAX_IRREGULARITY: 0.55;
    readonly MAX_PLANE_VARIANCE: 0.015;
    readonly CIRCLE_MIN_REVOLUTIONS: 1.2;
    readonly DISC_FIRE_COOLDOWN_MS: 800;
};
declare const PHALANGES: {
    readonly thumb: readonly ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"];
    readonly index: readonly ["index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"];
    readonly middle: readonly ["middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"];
    readonly ring: readonly ["ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"];
    readonly pinky: readonly ["pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"];
};

type Handedness = 'left' | 'right';
type HandSide = Handedness;
type JointName = (typeof XR_HAND_JOINTS)[number];
type HandSign = 'idle' | 'unknown' | 'open' | 'fist' | 'thehro' | 'niche' | 'gun' | 'poke' | 'pinch' | 'thumb' | 'thumbsup' | 'thumbsdown' | 'telephone' | 'rock-horns' | 'birdie-1' | 'birdie-2' | 'pinkie-out';
type ActiveGesture = HandSign | 'punch' | 'slap';
type StrikeType = 'punch' | 'slap' | 'poke' | 'none';
interface Vec3 {
    x: number;
    y: number;
    z: number;
}
interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
interface JointPoseData {
    position: Vec3;
    orientation?: Quat;
}
type HandPoseInput = Float32Array | Partial<Record<JointName, JointPoseData | Vec3>> | null | undefined;
interface FingerExtensionState {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
    count: number;
}
interface CircleState {
    triggered: boolean;
    centroid: Float32Array;
    normal: Float32Array;
    meanRadius: number;
    revolutions: number;
}
interface SingleHandState {
    tracked: boolean;
    sign: HandSign;
    gesture: ActiveGesture;
    fingers: FingerExtensionState;
    motionSpeed: number;
    wristPosition: Float32Array;
    palmPosition: Float32Array;
    palmQuaternion: Float32Array;
    velocity: Float32Array;
    aimOrigin: Float32Array;
    aimDirection: Float32Array;
    palmForward: Float32Array;
    circle: CircleState;
}
interface ClapState {
    state: 'separated' | 'contact';
    singleClap: boolean;
    doubleClap: boolean;
}
interface TriangleState {
    active: boolean;
    centroid: Float32Array;
    normal: Float32Array;
}
interface TwoHandState {
    fingerCount: number;
    handsCrossed: boolean;
    wristDistance: number;
    clap: ClapState;
    triangle: TriangleState;
}
interface HaathFrameState {
    left: SingleHandState;
    right: SingleHandState;
    twoHand: TwoHandState;
}
interface HaathConfig {
    useCurlDetection?: boolean;
    curlDot?: number;
    thumbOpenDist?: number;
    fingerOpenDist?: number;
    directionThreshold?: number;
    pinchDist?: number;
    punchSpeed?: number;
    slapSpeed?: number;
    triangleTipDist?: number;
    triangleThumbDist?: number;
    triangleFingerDot?: number;
    clapOriginMinDist?: number;
    clapContactDist?: number;
    clapSeparationDist?: number;
    clapDoubleMinMs?: number;
    clapDoubleMaxMs?: number;
    circleHistoryFrames?: number;
    circleMinSamples?: number;
    circleMinRadius?: number;
    circleMaxIrregularity?: number;
    circleMinRevolutions?: number;
    discFireCooldownMs?: number;
}
interface HoldConfig {
    stabilityFrames?: number;
    holdDurationMs?: number;
    cooldownMs?: number;
}
interface HoldState<T = string | number> {
    active: boolean;
    candidate: T | null;
    progress: number;
    triggered: boolean;
}
type HandState = SingleHandState;
type HaathUpdateResult = HaathFrameState;
type CircleResult = CircleState;
type TriangleResult = TriangleState;
type CurlState = FingerExtensionState;
interface StrikeResult {
    type: StrikeType;
    velocity: Vec3;
    speed: number;
    momentum: Vec3;
}

type Vec3Like = Vec3 | Float32Array | readonly number[];
declare function dot(a: Vec3, b: Vec3): number;
declare function cross(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function sub(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function add(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function normalize(v: Vec3, out: Vec3): Vec3;
declare function hypot(v: Vec3): number;
declare function scale(v: Vec3, s: number, out: Vec3): Vec3;
declare function distSq(a: Vec3, b: Vec3): number;
declare function dist(a: Vec3, b: Vec3): number;
declare function v3Set(out: Float32Array, x: number, y: number, z: number): Float32Array;
declare function v3Copy(out: Float32Array, a: ArrayLike<number>, offset?: number): Float32Array;
declare function v3Sub(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3Add(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3Scale(out: Float32Array, a: ArrayLike<number>, s: number, aOffset?: number): Float32Array;
declare function v3Dot(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Cross(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3LenSq(a: ArrayLike<number>, offset?: number): number;
declare function v3Len(a: ArrayLike<number>, offset?: number): number;
declare function v3DistSq(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Dist(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Normalize(out: Float32Array, a: ArrayLike<number>, aOffset?: number): Float32Array;

/**
 * Fast squared-distance sphere-sphere overlap check:
 * (ax - bx)^2 + (ay - by)^2 + (az - bz)^2 < (ar + br)^2
 */
declare function intersectSphereSphere(ax: number, ay: number, az: number, ar: number, bx: number, by: number, bz: number, br: number): boolean;
/**
 * Cylinder-sphere (laser beam) intersection check:
 * Projects r = targetPos - origin onto laser unit normal n.
 * Rejects if axial projection a < 0 or a > length.
 * Hits when lateral distance squared ||r||^2 - a^2 < (width / 2 + targetRadius)^2.
 */
declare function intersectLaserSphere(origin: Vec3Like, normal: Vec3Like, length: number, width: number, targetPos: Vec3Like, targetRadius: number): boolean;
/**
 * Thin-disc-sphere intersection check:
 * Axial offset a = (targetPos - discPos) . discNormal, lateral squared ||r||^2 - a^2.
 * Hits when |a| < (discTube + targetRadius) and lateralSq < (discRadius + targetRadius)^2.
 */
declare function intersectDiscSphere(discPos: Vec3Like, discNormal: Vec3Like, discRadius: number, discTube: number, targetPos: Vec3Like, targetRadius: number): boolean;
/**
 * Encapsulates DunJun's isActiveCollision / isTimeOutCollision (COLLISION_DURATION = 200ms)
 * so a single strike against a target cannot double-trigger within 200ms for the same
 * (targetId, hand, gesture).
 */
declare class CollisionCooldownTracker {
    private readonly _cooldownMs;
    private readonly _lastHitTime;
    constructor(cooldownMs?: number);
    private _key;
    /**
     * Returns true if the collision for (targetId, hand, gesture) is currently inside its cooldown window.
     */
    isActiveCollision(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    /**
     * Returns true if the cooldown has elapsed (ready to trigger again).
     */
    isTimeOutCollision(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    /**
     * Checks if (targetId, hand, gesture) can trigger at nowMs; if so, records the timestamp and returns true.
     */
    tryTrigger(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    reset(): void;
}
declare function sphereSphere(centerA: Vec3, radiusA: number, centerB: Vec3, radiusB: number): boolean;
declare function cylinderSphere(origin: Vec3, dir: Vec3, length: number, radius: number, sphereCenter: Vec3, sphereRadius: number): boolean;
declare function discSphere(discCenter: Vec3, discNormal: Vec3, discRadius: number, sphereCenter: Vec3, sphereRadius: number): boolean;

declare class HoldRecognizer<T = string | number> {
    private readonly _stabilityFrames;
    private readonly _holdDurationMs;
    private readonly _cooldownMs;
    private _rawCandidate;
    private _stableFrames;
    private _lockedCandidate;
    private _elapsedMs;
    private _lastTriggerMs;
    readonly state: HoldState<T>;
    constructor(config?: HoldConfig);
    private _isIdleCandidate;
    /**
     * Advances the stability + dwell state machine.
     * Accepts `delta` in either milliseconds (>= 1) or seconds (< 1).
     */
    update(candidate: T | null | undefined, delta: number, nowMs?: number): HoldState<T>;
    reset(): void;
}

declare function createSingleHandState(): SingleHandState;
/**
 * Evaluates orientation-invariant intra-finger curl for a 4-joint chain:
 * v1 = normalize(prox - meta), v2 = normalize(inter - prox), v3 = normalize(tip - inter)
 * isExtended = (v1 . v2 > curlDot) && (v2 . v3 > curlDot)
 */
declare function isFingerExtendedCurl(poses: Float32Array, frameOffset: number, metaIdx: number, proxIdx: number, interIdx: number, tipIdx: number, curlDot?: number): boolean;
/**
 * Scale-invariant anatomical thumb-out check:
 * Compares dist(thumb-tip, middle-inter) against palm knuckle span dist(pinky-inter, index-inter).
 */
declare function isThumbReallyOut(poses: Float32Array, frameOffset?: number): boolean;
/**
 * Evaluates all 5 finger extensions into `out` using either orientation-invariant curl
 * (`useCurlDetection = true`) or legacy Euclidean wrist-to-tip distances (`useCurlDetection = false`).
 */
declare function evaluateFingerExtensions(poses: Float32Array, frameOffset: number, out: FingerExtensionState, useCurlDetection?: boolean, curlDot?: number, thumbOpenDist?: number, fingerOpenDist?: number): FingerExtensionState;
/**
 * Classifies static single-hand sign in exact DunJun priority order (1..11).
 */
declare function classifyHandSign(poses: Float32Array, frameOffset: number, fingers: FingerExtensionState, pinchDist?: number, directionThreshold?: number): HandSign;
/**
 * Promotes static hand sign to 'punch' or 'slap' when ballistic velocity gate is met.
 */
declare function promoteStrikeGesture(sign: HandSign, motionSpeed: number, punchSpeed?: number, slapSpeed?: number): ActiveGesture;
/**
 * Per-hand stateful tracker managing the 20-frame 25-joint pose ring buffer,
 * kinematics vectors, velocity gate, and Newell's 3D circle trajectory detector.
 */
declare class SingleHandRecognizer {
    private readonly _handedness;
    private readonly _historyBuffer;
    private _head;
    private _historyCount;
    private readonly _circleRecognizer;
    readonly state: SingleHandState;
    constructor(handedness: Handedness, config?: HaathConfig);
    /**
     * Returns the flat history buffer and byte/element offset of the Nth most recent frame (0 = current).
     */
    getFrameOffset(age?: number): number;
    getHistoryBuffer(): Float32Array;
    /**
     * Marks the hand as untracked for the current frame and resets transient velocity/circle state.
     */
    markUntracked(): SingleHandState;
    /**
     * Begins writing a new tracked frame into the ring buffer and returns its float offset.
     */
    beginFrameSlot(): number;
    /**
     * Evaluates all single-hand kinematics, curl, sign, ballistic velocity, and circle trajectory
     * from the most recently written slot in `_historyBuffer`.
     */
    evaluateCurrentFrame(deltaSeconds: number, nowMs: number, config: Required<HaathConfig>): SingleHandState;
    reset(): void;
}

interface CircleDetectorConfig {
    historyFrames?: number;
    minSamples?: number;
    minRadius?: number;
    maxIrregularity?: number;
    minRevolutions?: number;
    cooldownMs?: number;
}
declare class CircleTrajectoryRecognizer {
    private readonly _maxFrames;
    private readonly _minSamples;
    private readonly _minRadius;
    private readonly _maxIrregularity;
    private readonly _minRevolutions;
    private readonly _cooldownMs;
    private readonly _buffer;
    private readonly _radii;
    private _head;
    private _count;
    private _lastFireMs;
    private readonly _u;
    private readonly _v;
    constructor(config?: CircleDetectorConfig);
    reset(): void;
    /**
     * Appends wrist position (x, y, z) and evaluates Newell's 3D circle trajectory.
     * Mutates `out` in-place with zero heap allocations.
     */
    update(wristX: number, wristY: number, wristZ: number, nowMs: number, out: CircleState, _hand?: Handedness): CircleState;
}

declare function createTwoHandState(): TwoHandState;
/**
 * Evaluates bimanual triangle / diamond formation from left and right joint pose buffers.
 * Ensures forward normal aims into -Z (nz <= 0).
 */
declare function evaluateTriangleFromPoses(leftBuf: Float32Array, leftOffset: number, rightBuf: Float32Array, rightOffset: number, out: TriangleState, tipDistThreshold?: number, thumbDistThreshold?: number, fingerDotThreshold?: number): TriangleState;
declare class TwoHandRecognizer {
    private _lastClapTimeMs;
    readonly state: TwoHandState;
    update(left: SingleHandState, right: SingleHandState, leftBuf: Float32Array | null, leftOffset: number, rightBuf: Float32Array | null, rightOffset: number, nowMs: number, config?: HaathConfig): TwoHandState;
    reset(): void;
}

declare class Haath {
    private readonly _config;
    private readonly _left;
    private readonly _right;
    private readonly _twoHand;
    private readonly _stagingSlot;
    readonly state: HaathFrameState;
    constructor(config?: HaathConfig);
    /**
     * Main per-frame WebXR update entrypoint - zero heap allocations.
     */
    update(frame: XRFrame | null | undefined, referenceSpace: XRReferenceSpace | null | undefined, inputSources: Iterable<XRInputSource> | null | undefined, deltaSeconds: number, nowMs?: number): HaathFrameState;
    /**
     * Updates the engine directly from flat Float32Array buffers or JointName->pose maps.
     * Useful for custom engines, recorded pose playback, and unit testing.
     */
    updateFromPoses(leftInput: HandPoseInput, rightInput: HandPoseInput, deltaSeconds: number, nowMs?: number): HaathFrameState;
    reset(): void;
    private _ingestXRHand;
    private _populateStagingFromInput;
}

export { type ActiveGesture, CIRCLE_HISTORY_FRAMES, CIRCLE_MAX_IRREGULARITY, CIRCLE_MIN_RADIUS, CIRCLE_MIN_REVOLUTIONS, CIRCLE_MIN_SAMPLES, CLAP_CONTACT_DIST, CLAP_DOUBLE_MAX_MS, CLAP_DOUBLE_MIN_MS, CLAP_ORIGIN_MIN_DIST, CLAP_SEPARATION_DIST, COLLISION_DURATION, CURL_DOT, type CircleResult, type CircleState, CircleTrajectoryRecognizer, type ClapState, CollisionCooldownTracker, type CurlState, DIRECTION_THRESHOLD, DISC_FIRE_COOLDOWN_MS, FINGEROPEN, FLOATS_PER_JOINT, type FingerExtensionState, HOLD_COOLDOWN_MS, HOLD_COUNT_STABILITY_FRAMES, HOLD_DEFAULT_DURATION_MS, HOLD_SIGN_STABILITY_FRAMES, Haath, type HaathConfig, type HaathFrameState, type HaathUpdateResult, type HandPoseInput, type HandSide, type HandSign, type HandState, type Handedness, type HoldConfig, HoldRecognizer, type HoldState, JOINT_COUNT, JOINT_INDEX, type JointName, type JointPoseData, PALM_COLLIDER_RADIUS, PHALANGES, PINCH_DIST, POS_HISTORY_COUNT, PUNCH_SPEED, type Quat, SLAP_SPEED, SPELL_CONFIG, SingleHandRecognizer, type SingleHandState, type StrikeResult, type StrikeType, THUMBOPEN, TRIANGLE_FINGER_DOT, TRIANGLE_THUMB_DIST, TRIANGLE_TIP_DIST, type TriangleResult, type TriangleState, TwoHandRecognizer, type TwoHandState, type Vec3, XR_HAND_JOINTS, add, classifyHandSign, createSingleHandState, createTwoHandState, cross, cylinderSphere, discSphere, dist, distSq, dot, evaluateFingerExtensions, evaluateTriangleFromPoses, hypot, intersectDiscSphere, intersectLaserSphere, intersectSphereSphere, isFingerExtendedCurl, isThumbReallyOut, normalize, promoteStrikeGesture, scale, sphereSphere, sub, v3Add, v3Copy, v3Cross, v3Dist, v3DistSq, v3Dot, v3Len, v3LenSq, v3Normalize, v3Scale, v3Set, v3Sub };
