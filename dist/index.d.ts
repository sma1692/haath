type HandSign = 'fist' | 'open' | 'thehro' | 'niche' | 'poke' | 'gun' | 'gun-double' | 'pinch' | 'thumbsup' | 'thumbsdown' | 'rock-horns' | 'telephone' | 'pinkie-out' | 'birdie-1' | 'birdie-2' | 'none';
type StrikeType = 'punch' | 'slap' | 'poke' | 'none';
interface Vec3 {
    x: number;
    y: number;
    z: number;
}
interface CurlState {
    index: number;
    middle: number;
    ring: number;
    pinky: number;
    thumb: number;
    thumbOut: boolean;
}
interface StrikeResult {
    type: StrikeType;
    velocity: Vec3;
    speed: number;
    momentum: Vec3;
}
interface HandState {
    tracked: boolean;
    curl: CurlState;
    sign: HandSign;
    strike: StrikeResult;
}
interface TriangleResult {
    active: boolean;
    centroid: Vec3;
    normal: Vec3;
    apex: Vec3;
    base: Vec3;
}
interface CircleResult {
    active: boolean;
    centroid: Vec3;
    normal: Vec3;
    radius: number;
    progress: number;
}
interface TwoHandState {
    triangle: TriangleResult;
    clap: {
        active: boolean;
        count: number;
    };
    prayerHold: {
        active: boolean;
        progress: number;
    };
    crossChest: {
        active: boolean;
        progress: number;
    };
}
interface HaathUpdateResult {
    left: HandState;
    right: HandState;
    twoHand: TwoHandState;
    circle: CircleResult;
}
interface HaathConfig {
    curlDot?: number;
    pinchDist?: number;
    punchSpeed?: number;
    slapSpeed?: number;
    circleMinRevolutions?: number;
    prayerHoldMs?: number;
    crossChestHoldMs?: number;
}

declare class Haath {
    private readonly _config;
    constructor(config?: HaathConfig);
    update(_frame: XRFrame, _referenceSpace: XRReferenceSpace, _inputSources: XRInputSourceArray, _delta: number): HaathUpdateResult;
}

declare const CURL_DOT = 0.5;
declare const PINCH_DIST = 0.03;
declare const PUNCH_SPEED = 2.5;
declare const SLAP_SPEED = 1.8;
declare const SPELL_CONFIG: {
    readonly HISTORY_FRAMES: 90;
    readonly MIN_RADIUS: 0.08;
    readonly MAX_RADIUS: 0.45;
    readonly MAX_PLANE_VARIANCE: 0.015;
    readonly CIRCLE_MIN_REVOLUTIONS: 1;
};
declare const PHALANGES: {
    readonly thumb: readonly ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"];
    readonly index: readonly ["index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"];
    readonly middle: readonly ["middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"];
    readonly ring: readonly ["ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"];
    readonly pinky: readonly ["pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"];
};

declare function dot(a: Vec3, b: Vec3): number;
declare function cross(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function sub(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function normalize(v: Vec3, out: Vec3): Vec3;
declare function hypot(v: Vec3): number;

declare function sphereSphere(centerA: Vec3, radiusA: number, centerB: Vec3, radiusB: number): boolean;
declare function cylinderSphere(origin: Vec3, dir: Vec3, // unit vector
length: number, radius: number, // cylinder radius
sphereCenter: Vec3, sphereRadius: number): boolean;
declare function discSphere(discCenter: Vec3, discNormal: Vec3, // unit vector
discRadius: number, sphereCenter: Vec3, sphereRadius: number): boolean;

export { CURL_DOT, type CircleResult, Haath, type HaathConfig, type HaathUpdateResult, type HandState, PHALANGES, PINCH_DIST, PUNCH_SPEED, SLAP_SPEED, SPELL_CONFIG, type TriangleResult, type TwoHandState, cross, cylinderSphere, discSphere, dot, hypot, normalize, sphereSphere, sub };
