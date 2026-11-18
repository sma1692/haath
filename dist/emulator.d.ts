/**
 * PC hand emulator (experimental).
 *
 * Drives IWER (Immersive Web Emulation Runtime) emulated hands from a desktop so hand-tracked
 * WebXR apps can be played and debugged without a headset:
 * - per-hand floating panels (strikes, signs, all static poses, move pad)
 * - keyboard: WASD / arrows move the hands, number and letter rows trigger strikes and signs
 * - finger poses are synthesized on top of IWER's built-in 'default' / 'point' / pinch poses
 *
 * Experimental: this relies on IWER internals that are not public API (private symbol fields,
 * `@iwer/devui` InputLayer transform handles). It never imports IWER; everything is duck-typed
 * and every access is guarded, so a mismatch degrades to "no-op" instead of throwing.
 *
 * Game logic stays in the app: the emulator reports intent through `hooks`.
 */
declare const EMULATOR_POSES: readonly ["open_palm", "fist", "point", "thumbs_up", "thumbs_down", "horns", "shaka", "finger_gun", "pinkie_out", "pinch", "peace", "ok_sign", "asl_l", "claw", "double_gun", "punch", "slap", "idle"];
type EmulatorPose = (typeof EMULATOR_POSES)[number];
type EmulatorHand = 'left' | 'right';
type EmulatorTarget = EmulatorHand | 'both';
type EmulatorStrike = 'punch' | 'slap' | 'poke';
/** Pose -> gesture string reported to the app. Defaults follow haath sign names. */
declare const DEFAULT_EMULATOR_GESTURE_MAP: Record<EmulatorPose, string>;
/** Extended finger counts (fingerSelect style menus). */
declare const EMULATOR_FINGER_COUNT: Record<EmulatorPose, number>;
declare const EMULATOR_POSE_LABELS: Record<EmulatorPose, string>;
interface EmulatorKeyMap {
    /** Hold to move a hand in the headset view plane. dx: -1 left / +1 right, dy: -1 down / +1 up. */
    move: Record<string, {
        hand: EmulatorHand;
        dx: number;
        dy: number;
    }>;
    /** Tap to fire a strike with forward motion. */
    strike: Record<string, {
        hand: EmulatorHand;
        kind: EmulatorStrike;
    }>;
    /** Tap to fire a spell gesture (circle or triangle) with forward motion. */
    spell?: Record<string, {
        hand: EmulatorHand;
        kind: 'circle' | 'triangle';
    }>;
    /** Hold to keep a pose; release restores the previous pose. */
    hold: Record<string, {
        hand: EmulatorHand;
        pose: EmulatorPose;
    }>;
}
/** Keys are KeyboardEvent.code values. */
declare const DEFAULT_EMULATOR_KEYMAP: EmulatorKeyMap;
interface HandEmulatorHooks {
    /** A static pose was applied to one or both hands. */
    onPose?(target: EmulatorTarget, pose: EmulatorPose, gesture: string, fingerCount: number): void;
    /** A strike started. velocity is the suggested hand velocity in m/s (reference space). */
    onStrike?(hand: EmulatorHand, kind: EmulatorStrike, velocity: [number, number, number]): void;
    /** A strike finished; gesture is the pose gesture the hand returned to. */
    onStrikeEnd?(hand: EmulatorHand, gesture: string): void;
    /** Double clap button. The emulator animates the hands; the app decides what a clap does. */
    onClap?(): void;
    /** Circle started (hand switched to ok_sign). */
    onCircleStart?(hand: EmulatorHand): void;
    /** Circle trace finished; gesture is the pose gesture the hand returned to. */
    onCircle?(hand: EmulatorHand, gesture: string): void;
    /** Triangle started (hand switched to point / triangle stance). */
    onTriangleStart?(hand: EmulatorHand): void;
    /** Triangle trace finished; gesture is the pose gesture the hand returned to. */
    onTriangle?(hand: EmulatorHand, gesture: string): void;
    /** Both hands were reset to open palm via resetToOpenPalm(). */
    onResetToOpen?(): void;
}
interface HandEmulatorOptions {
    /** Returns the active XRSession (or null). Used for visibility and input source events. */
    getSession: () => XRSession | null | undefined;
    hooks?: HandEmulatorHooks;
    gestureMap?: Partial<Record<EmulatorPose, string>>;
    keyMap?: Partial<EmulatorKeyMap>;
    /** Hand move speed ramp (m/s): starts at min on key down, eases to max over rampSeconds. */
    moveSpeed?: {
        min?: number;
        max?: number;
        rampSeconds?: number;
    };
    /** Max hand travel from its default position per axis (m). Default 0.8. */
    moveLimit?: number;
    /**
     * Programmatic API (setHandTarget): max wrist distance from the hand's default position (m).
     * Larger than moveLimit so a simulated player can reach targets in front of it. Default 1.2.
     */
    workspaceLimit?: number;
    /** Programmatic API (setHandTarget): default approach speed in m/s. Default 2.5. */
    targetSpeed?: number;
    /** Verbose [HaathEmu] console logs. */
    debug?: boolean;
}
/** Absolute position in the XR reference space (IWER global space == local-floor), metres. */
type EmulatorVec3 = [number, number, number];
declare class HandEmulator {
    private readonly opts;
    private readonly hooks;
    private readonly gestureMap;
    private readonly keys;
    private readonly speedMin;
    private readonly speedMax;
    private readonly rampSeconds;
    private readonly moveLimit;
    private readonly workspaceLimit;
    private readonly targetSpeed;
    private simTarget;
    private simStrike;
    private lastWrist;
    private simRaf;
    private simLast;
    private scratchVec;
    private scratchQuat;
    private readonly _q;
    private readonly _v;
    private currentPose;
    /** Hand-local joint translation used by strike / clap / circle animations. */
    private animOffset;
    private appliedAnimOffset;
    private strikeRestore;
    private strikeToken;
    private device;
    private session;
    private visible;
    private destroyed;
    private mirrorBoth;
    private isSyncingDevUi;
    private heldMoveKeys;
    private moveHoldStart;
    private moveRaf;
    private moveLast;
    private fallbackHome;
    private heldPoseKeys;
    private root;
    private panels;
    private pollTimer;
    private layoutTimer;
    private readonly onKeyDown;
    private readonly onKeyUp;
    private readonly onBlur;
    private readonly onInputSourcesChange;
    constructor(options: HandEmulatorOptions);
    get leftPose(): EmulatorPose;
    get rightPose(): EmulatorPose;
    get isVisible(): boolean;
    /**
     * Apply a static pose (sticky) to one or both hands and report it through hooks.onPose.
     * Accepts an EmulatorPose name or a gesture name from the gesture map ('open' -> open_palm, 'gun' -> finger_gun).
     */
    setPose(poseName: EmulatorPose | (string & {}), target?: EmulatorTarget): void;
    /** Visual reset of both hands to open palm. Fires hooks.onResetToOpen, not onPose. */
    resetToOpenPalm(): void;
    private applyAnimDelta;
    private setAnimOffset;
    private clearAnimOffset;
    triggerStrike(kind: EmulatorStrike, hand?: EmulatorHand): void;
    private beginStrikePose;
    private endStrikePose;
    triggerClap(): void;
    triggerCircle(hand?: EmulatorHand): void;
    triggerTriangle(hand?: EmulatorHand): void;
    /** Move a hand in the headset view plane by (dx, dy) metres. */
    moveHand(hand: EmulatorHand, dx: number, dy: number): void;
    /** Return a hand to its default position. */
    resetHandPosition(hand: EmulatorHand): void;
    /** Smoothly move a hand's wrist toward an absolute reference-space position at speed m/s (default 2.5). */
    setHandTarget(hand: EmulatorHand, position: EmulatorVec3, opts?: {
        speed?: number;
    }): void;
    /** Current wrist position in reference space (last known value if the hand is not available yet). */
    getHandPosition(hand: EmulatorHand): EmulatorVec3;
    /** True while a hand is travelling to its target or playing a programmatic strike. */
    isHandMoving(hand: EmulatorHand): boolean;
    /** Smoothly return a hand to its default guard position (cancels a running programmatic strike). */
    resetHand(hand: EmulatorHand): void;
    /**
     * Strike with a real hand motion: wind-up, constant-speed thrust along direction (default -Z), short hold,
     * recover to the start position. Fires hooks.onStrike / hooks.onStrikeEnd exactly like triggerStrike.
     */
    strike(hand: EmulatorHand, kind: EmulatorStrike, direction?: EmulatorVec3): void;
    /** Trace the circle spell gesture with one hand. */
    circle(hand?: EmulatorHand): void;
    /** Form the two-hand triangle spell gesture. */
    triangle(hand?: EmulatorHand): void;
    private resolvePose;
    private finishSimStrike;
    private startSimLoop;
    private stepSimHand;
    private readInputPose;
    private writeInputPosition;
    private wristOffset;
    private readWrist;
    private writeWrist;
    private homeWrist;
    destroy(): void;
    private poll;
    private onSessionInputsChanged;
    private updateVisibility;
    private installFrameHooks;
    private forceIwerHandMode;
    private syncDevUiInputMode;
    private resolveIwerDevice;
    private getIwerHand;
    private getDevUiHandle;
    private setPinch;
    private hookHandInput;
    private applyVisualPose;
    private handleKeyDown;
    private handleKeyUp;
    private releaseAllInput;
    private releaseHoldKey;
    private restorePoseFor;
    private pressMove;
    private releaseMove;
    private startMoveLoop;
    private animate;
    private handsOf;
    private log;
    private keyFor;
    private makeButton;
    private createUI;
    private buildHandPanel;
    private togglePose;
    private refreshPanels;
    private refreshReadouts;
    private layoutPanels;
}
/** Creates the emulator. Call once; keep the instance and call destroy() on teardown. */
declare function createHandEmulator(options: HandEmulatorOptions): HandEmulator;

export { DEFAULT_EMULATOR_GESTURE_MAP, DEFAULT_EMULATOR_KEYMAP, EMULATOR_FINGER_COUNT, EMULATOR_POSES, EMULATOR_POSE_LABELS, type EmulatorHand, type EmulatorKeyMap, type EmulatorPose, type EmulatorStrike, type EmulatorTarget, type EmulatorVec3, HandEmulator, type HandEmulatorHooks, type HandEmulatorOptions, createHandEmulator };
