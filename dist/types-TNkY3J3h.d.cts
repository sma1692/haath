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
declare const PUNCH_SPEED = 1;
declare const SLAP_SPEED = 1.4;
declare const STRIKE_LATCH_MS = 180;
declare const MIN_ANATOMICAL_BONE_LENGTH = 0.03;
declare const PALM_COLLIDER_RADIUS = 0.05;
declare const WRIST_COLLIDER_RADIUS = 0.04;
declare const FINGERTIP_COLLIDER_RADIUS = 0.025;
declare const HAND_CONTACT_MODES: {
    readonly TOUCH: "touch";
    readonly CONSUMABLE: "consumable";
    readonly COMBAT: "combat";
};
declare const TRIANGLE_TIP_DIST = 0.12;
declare const TRIANGLE_THUMB_DIST = 0.14;
declare const TRIANGLE_FINGER_DOT = 0.35;
declare const CLAP_ORIGIN_MIN_DIST = 0.05;
declare const CLAP_CONTACT_DIST = 0.17;
declare const CLAP_SEPARATION_DIST = 0.195;
declare const CLAP_DOUBLE_MIN_MS = 90;
declare const CLAP_DOUBLE_MAX_MS = 1100;
declare const SIGN_CURL_ENTER_MAX_RATIO = 1.15;
declare const SIGN_EXTEND_ENTER_MIN_RATIO = 1.05;
declare const THUMBS_ENTER_ALIGN_MIN_DOT = 0.2;
declare const THUMBS_ENTER_DIRECTION_THRESHOLD = 0.5;
declare const THUMBS_ENTER_THUMB_OUT_RATIO = 0.78;
declare const GUN_TUCK_ENTER_MAX_RATIO = 1.1;
declare const GUN_INDEX_LEAD_RATIO = 0.18;
declare const PEACE_ENTER_MIN_SPREAD_DEG = 10;
declare const CIRCLE_HISTORY_FRAMES = 90;
declare const CIRCLE_MIN_SAMPLES = 30;
declare const CIRCLE_MIN_RADIUS = 0.06;
declare const CIRCLE_MAX_IRREGULARITY = 0.55;
declare const CIRCLE_MIN_REVOLUTIONS = 1.2;
declare const DISC_FIRE_COOLDOWN_MS = 800;
declare const HOLD_SIGN_STABILITY_FRAMES = 6;
declare const HOLD_COUNT_STABILITY_FRAMES = 6;
declare const HOLD_DEFAULT_DURATION_MS = 1000;
declare const HOLD_NAV_DURATION_MS = 650;
declare const HOLD_COUNT_DURATION_MS = 350;
declare const HOLD_SIGN_STABILITY_MS = 70;
declare const HOLD_PAUSE_DURATION_MS = 281;
declare const HOLD_COOLDOWN_MS = 800;
declare const SWIPE_TIP_GAP = 0.03;
declare const SWIPE_MIN_DIST = 0.07;
declare const SWIPE_WINDOW_MS = 300;
declare const SWIPE_AXIS_DOMINANCE = 0.75;
declare const SWIPE_MAX_FINGER_DOT = 0.5;
declare const SWIPE_COOLDOWN_MS = 400;
declare const SWIPE_POSE_GRACE_FRAMES = 3;
declare const SWIPE_SAMPLE_CAPACITY = 48;
declare const COLLISION_DURATION = 200;
declare const BLAST_PALM_DIST = 0.3;
declare const BLAST_FORWARD_DOT = -0.4;
declare const BLAST_CHARGE_DURATION_MS = 600;
declare const BLAST_THRUST_SPEED = 1;
declare const BLAST_COOLDOWN_MS = 800;
declare const BLAST_CONFIG: {
    readonly PALM_DIST: 0.3;
    readonly FORWARD_DOT: -0.4;
    readonly CHARGE_DURATION_MS: 600;
    readonly THRUST_SPEED: 1;
    readonly COOLDOWN_MS: 800;
};
declare const SPELL_CONFIG: {
    readonly HISTORY_FRAMES: 90;
    readonly MIN_SAMPLES: 30;
    readonly MIN_RADIUS: 0.06;
    readonly MAX_RADIUS: 0.45;
    readonly MAX_IRREGULARITY: 0.55;
    readonly MAX_PLANE_VARIANCE: 0.015;
    readonly CIRCLE_MIN_REVOLUTIONS: 1.2;
    readonly DISC_FIRE_COOLDOWN_MS: 800;
    readonly ARCHETYPES: {
        readonly TRIANGLE: "triangle";
        readonly CIRCLE: "circle";
        readonly BLAST: "blast";
    };
    readonly TRIANGLE_TIP_DIST: 0.12;
    readonly TRIANGLE_THUMB_DIST: 0.14;
    readonly TRIANGLE_FINGER_DOT: 0.35;
    readonly BLAST_PALM_DIST: 0.3;
    readonly BLAST_FORWARD_DOT: -0.4;
    readonly BLAST_CHARGE_DURATION_MS: 600;
    readonly BLAST_THRUST_SPEED: 1;
    readonly BLAST_COOLDOWN_MS: 800;
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
type HandSign = 'idle' | 'unknown' | 'open' | 'fist' | 'thehro' | 'niche' | 'gun' | 'peace' | 'poke' | 'pinch' | 'thumb' | 'thumbsup' | 'thumbsdown' | 'telephone' | 'rock-horns' | 'birdie-1' | 'birdie-2' | 'pinkie-out';
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
type TwoFingerSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';
interface SwipeState {
    posed: boolean;
    fired: boolean;
    direction: TwoFingerSwipeDirection;
    distance: number;
    velocity: number;
    deltaUp: number;
    deltaRight: number;
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
    palmCenter: Float32Array;
    prevPalmCenter: Float32Array;
    hasPrevPalm: boolean;
    indexTipPosition: Float32Array;
    circle: CircleState;
    swipe: SwipeState;
}
type HandContactMode = 'touch' | 'consumable' | 'combat';
type HandContactPart = 'none' | 'palm' | 'wrist' | 'indexTip' | 'sweep';
interface ClapState {
    state: 'separated' | 'contact';
    singleClap: boolean;
    doubleClap: boolean;
}
type SpellArchetype = 'triangle' | 'circle' | 'blast';
interface TriangleState {
    active: boolean;
    centroid: Float32Array;
    normal: Float32Array;
}
interface BlastState {
    active: boolean;
    triggered: boolean;
    charge: number;
    origin: Float32Array;
    direction: Float32Array;
}
interface TwoHandState {
    fingerCount: number;
    handsCrossed: boolean;
    wristDistance: number;
    clap: ClapState;
    triangle: TriangleState;
    blast: BlastState;
}
interface HaathFrameState {
    left: SingleHandState;
    right: SingleHandState;
    twoHand: TwoHandState;
}
interface HaathConfig {
    minBoneLength?: number;
    useCurlDetection?: boolean;
    curlDot?: number;
    thumbOpenDist?: number;
    fingerOpenDist?: number;
    directionThreshold?: number;
    pinchDist?: number;
    punchSpeed?: number;
    slapSpeed?: number;
    /** Grace window (ms) a fist / open hand keeps its punch / slap after the last fast frame. */
    strikeLatchMs?: number;
    triangleTipDist?: number;
    triangleThumbDist?: number;
    triangleFingerDot?: number;
    clapOriginMinDist?: number;
    clapContactDist?: number;
    clapSeparationDist?: number;
    clapDoubleMinMs?: number;
    clapDoubleMaxMs?: number;
    clapPalmOpposeDot?: number;
    clapFacingToleranceFrames?: number;
    circleHistoryFrames?: number;
    circleMinSamples?: number;
    circleMinRadius?: number;
    circleMaxIrregularity?: number;
    circleMinRevolutions?: number;
    discFireCooldownMs?: number;
    blastPalmDist?: number;
    blastForwardDot?: number;
    blastChargeDurationMs?: number;
    blastThrustSpeed?: number;
    blastCooldownMs?: number;
    swipeEnabled?: boolean;
    swipeTipGap?: number;
    swipeMinDist?: number;
    swipeWindowMs?: number;
    swipeAxisDominance?: number;
    swipeMaxFingerDot?: number;
    swipeCooldownMs?: number;
    swipeRequireThumbTucked?: boolean;
}
interface HoldConfig {
    stabilityFrames?: number;
    /** Time based stability (ms). When > 0 it replaces stabilityFrames, so 72 / 90 / 120 Hz behave the same. */
    stabilityMs?: number;
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
type BlastResult = BlastState;
type CurlState = FingerExtensionState;
interface StrikeResult {
    type: StrikeType;
    velocity: Vec3;
    speed: number;
    momentum: Vec3;
}

export { HOLD_PAUSE_DURATION_MS as $, type ActiveGesture as A, type BlastState as B, type CircleState as C, CLAP_SEPARATION_DIST as D, COLLISION_DURATION as E, type FingerExtensionState as F, CURL_DOT as G, type HaathFrameState as H, type CircleResult as I, type ClapState as J, type CurlState as K, DIRECTION_THRESHOLD as L, DISC_FIRE_COOLDOWN_MS as M, FINGEROPEN as N, FINGERTIP_COLLIDER_RADIUS as O, FLOATS_PER_JOINT as P, GUN_INDEX_LEAD_RATIO as Q, GUN_TUCK_ENTER_MAX_RATIO as R, type SingleHandState as S, type TwoHandState as T, HAND_CONTACT_MODES as U, type Vec3 as V, HOLD_COOLDOWN_MS as W, HOLD_COUNT_DURATION_MS as X, HOLD_COUNT_STABILITY_FRAMES as Y, HOLD_DEFAULT_DURATION_MS as Z, HOLD_NAV_DURATION_MS as _, type HandContactMode as a, HOLD_SIGN_STABILITY_FRAMES as a0, HOLD_SIGN_STABILITY_MS as a1, type HaathUpdateResult as a2, type HandSide as a3, type HandState as a4, JOINT_COUNT as a5, JOINT_INDEX as a6, type JointName as a7, type JointPoseData as a8, MIN_ANATOMICAL_BONE_LENGTH as a9, THUMBS_ENTER_THUMB_OUT_RATIO as aA, TRIANGLE_FINGER_DOT as aB, TRIANGLE_THUMB_DIST as aC, TRIANGLE_TIP_DIST as aD, type TriangleResult as aE, type TwoFingerSwipeDirection as aF, WRIST_COLLIDER_RADIUS as aG, XR_HAND_JOINTS as aH, PALM_COLLIDER_RADIUS as aa, PEACE_ENTER_MIN_SPREAD_DEG as ab, PHALANGES as ac, PINCH_DIST as ad, POS_HISTORY_COUNT as ae, PUNCH_SPEED as af, type Quat as ag, SIGN_CURL_ENTER_MAX_RATIO as ah, SIGN_EXTEND_ENTER_MIN_RATIO as ai, SLAP_SPEED as aj, SPELL_CONFIG as ak, STRIKE_LATCH_MS as al, SWIPE_AXIS_DOMINANCE as am, SWIPE_COOLDOWN_MS as an, SWIPE_MAX_FINGER_DOT as ao, SWIPE_MIN_DIST as ap, SWIPE_POSE_GRACE_FRAMES as aq, SWIPE_SAMPLE_CAPACITY as ar, SWIPE_TIP_GAP as as, SWIPE_WINDOW_MS as at, type SpellArchetype as au, type StrikeResult as av, type StrikeType as aw, THUMBOPEN as ax, THUMBS_ENTER_ALIGN_MIN_DOT as ay, THUMBS_ENTER_DIRECTION_THRESHOLD as az, type HandContactPart as b, type HoldState as c, type HoldConfig as d, type Handedness as e, type HaathConfig as f, type HandSign as g, type SwipeState as h, type TriangleState as i, type HandPoseInput as j, BLAST_CHARGE_DURATION_MS as k, BLAST_CONFIG as l, BLAST_COOLDOWN_MS as m, BLAST_FORWARD_DOT as n, BLAST_PALM_DIST as o, BLAST_THRUST_SPEED as p, type BlastResult as q, CIRCLE_HISTORY_FRAMES as r, CIRCLE_MAX_IRREGULARITY as s, CIRCLE_MIN_RADIUS as t, CIRCLE_MIN_REVOLUTIONS as u, CIRCLE_MIN_SAMPLES as v, CLAP_CONTACT_DIST as w, CLAP_DOUBLE_MAX_MS as x, CLAP_DOUBLE_MIN_MS as y, CLAP_ORIGIN_MIN_DIST as z };
