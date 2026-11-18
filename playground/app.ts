/// <reference types="@types/webxr" />
// playground/app.ts
// haath v2 Compositional Gesture Architecture Playground & WebXR / Desktop Simulator
// Zero-dependency, zero-GC WebXR spatial computing testbed.

import {
  FLOATS_PER_JOINT,
  JOINT_COUNT,
  JOINT_INDEX,
  XR_HAND_JOINTS,
} from '../src/index.js';
import {
  CompositionalGestureEngine,
  type CompositionalFrameResult,
} from '../src/v2.js';

// ============================================================================
// Types & Constants
// ============================================================================

export type ActiveHandMode = 'right' | 'left' | 'both';

export interface SyntheticPoseOptions {
  poseName: string;
  hand: 'left' | 'right';
  wristPos?: [number, number, number];
  handDir?: [number, number, number];
  palmNormal?: [number, number, number];
  scale?: number;
  customPinch?: boolean;
}

const STRIDE = JOINT_COUNT * FLOATS_PER_JOINT; // 175 floats per hand

// Bone joint connectivity for WebXR standard hand skeleton
const SKELETON_CONNECTIONS: [number, number][] = [
  // Thumb
  [JOINT_INDEX.WRIST, JOINT_INDEX.THUMB_METACARPAL],
  [JOINT_INDEX.THUMB_METACARPAL, JOINT_INDEX.THUMB_PROXIMAL],
  [JOINT_INDEX.THUMB_PROXIMAL, JOINT_INDEX.THUMB_DISTAL],
  [JOINT_INDEX.THUMB_DISTAL, JOINT_INDEX.THUMB_TIP],
  // Index
  [JOINT_INDEX.WRIST, JOINT_INDEX.INDEX_METACARPAL],
  [JOINT_INDEX.INDEX_METACARPAL, JOINT_INDEX.INDEX_PROXIMAL],
  [JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_INTERMEDIATE],
  [JOINT_INDEX.INDEX_INTERMEDIATE, JOINT_INDEX.INDEX_DISTAL],
  [JOINT_INDEX.INDEX_DISTAL, JOINT_INDEX.INDEX_TIP],
  // Middle
  [JOINT_INDEX.WRIST, JOINT_INDEX.MIDDLE_METACARPAL],
  [JOINT_INDEX.MIDDLE_METACARPAL, JOINT_INDEX.MIDDLE_PROXIMAL],
  [JOINT_INDEX.MIDDLE_PROXIMAL, JOINT_INDEX.MIDDLE_INTERMEDIATE],
  [JOINT_INDEX.MIDDLE_INTERMEDIATE, JOINT_INDEX.MIDDLE_DISTAL],
  [JOINT_INDEX.MIDDLE_DISTAL, JOINT_INDEX.MIDDLE_TIP],
  // Ring
  [JOINT_INDEX.WRIST, JOINT_INDEX.RING_METACARPAL],
  [JOINT_INDEX.RING_METACARPAL, JOINT_INDEX.RING_PROXIMAL],
  [JOINT_INDEX.RING_PROXIMAL, JOINT_INDEX.RING_INTERMEDIATE],
  [JOINT_INDEX.RING_INTERMEDIATE, JOINT_INDEX.RING_DISTAL],
  [JOINT_INDEX.RING_DISTAL, JOINT_INDEX.RING_TIP],
  // Pinky
  [JOINT_INDEX.WRIST, JOINT_INDEX.PINKY_METACARPAL],
  [JOINT_INDEX.PINKY_METACARPAL, JOINT_INDEX.PINKY_PROXIMAL],
  [JOINT_INDEX.PINKY_PROXIMAL, JOINT_INDEX.PINKY_INTERMEDIATE],
  [JOINT_INDEX.PINKY_INTERMEDIATE, JOINT_INDEX.PINKY_DISTAL],
  [JOINT_INDEX.PINKY_DISTAL, JOINT_INDEX.PINKY_TIP],
  // Palm transverse connections
  [JOINT_INDEX.INDEX_METACARPAL, JOINT_INDEX.MIDDLE_METACARPAL],
  [JOINT_INDEX.MIDDLE_METACARPAL, JOINT_INDEX.RING_METACARPAL],
  [JOINT_INDEX.RING_METACARPAL, JOINT_INDEX.PINKY_METACARPAL],
];

// ============================================================================
// Synthetic 25-Joint Buffer Builder
// ============================================================================

export function buildSyntheticHand(opts: SyntheticPoseOptions): Float32Array {
  const buf = new Float32Array(STRIDE);
  const isLeft = opts.hand === 'left';
  const defaultWristX = isLeft ? -0.18 : 0.18;
  const [wx, wy, wz] = opts.wristPos ?? [defaultWristX, 1.2, -0.45];
  const scale = opts.scale ?? 1.0;

  // Normalized forward finger direction (default pointing forward -Z)
  let [fx, fy, fz] = opts.handDir ?? [0, 0, -1];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  // Lateral axis (X / spread) - flipped for left hand
  const sideSign = isLeft ? -1 : 1;
  let rx = sideSign, ry = 0, rz = 0;
  if (Math.abs(fx) > 0.9) {
    rx = 0; ry = 1; rz = 0;
  }
  // Up/Right = cross(f, r)
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;

  // Curl axis (perpendicular to finger direction and lateral spread)
  const cx = fy * uz - fz * uy;
  const cy = fz * ux - fx * uz;
  const cz = fx * uy - fy * ux;

  function setJoint(idx: number, x: number, y: number, z: number, qx = 0, qy = 0, qz = 0, qw = 1) {
    const base = idx * FLOATS_PER_JOINT;
    buf[base] = x;
    buf[base + 1] = y;
    buf[base + 2] = z;
    buf[base + 3] = qx;
    buf[base + 4] = qy;
    buf[base + 5] = qz;
    buf[base + 6] = qw;
  }

  setJoint(JOINT_INDEX.WRIST, wx, wy, wz);

  // Determine finger extension flags based on poseName
  let thumbOpen = true;
  let indexOpen = true;
  let middleOpen = true;
  let ringOpen = true;
  let pinkyOpen = true;
  let isPinch = Boolean(opts.customPinch);
  let thumbPointingUp = false;
  let thumbPointingDown = false;

  switch (opts.poseName) {
    case 'fist':
    case 'asl_a':
    case 'asl_s':
      thumbOpen = false;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'point':
      thumbOpen = false;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'pinch':
      thumbOpen = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      isPinch = true;
      break;

    case 'peace':
    case 'asl_v':
      thumbOpen = false;
      indexOpen = true;
      middleOpen = true;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'thumbs_up':
      thumbOpen = true;
      thumbPointingUp = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'thumbs_down':
      thumbOpen = true;
      thumbPointingDown = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'horns':
      thumbOpen = false;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = true;
      break;

    case 'shaka':
    case 'asl_y':
      thumbOpen = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = true;
      break;

    case 'finger_gun':
      thumbOpen = true;
      thumbPointingUp = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;

    case 'ok_sign':
      thumbOpen = true;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      isPinch = true;
      break;

    case 'asl_b':
      thumbOpen = false;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      break;

    case 'asl_l':
      thumbOpen = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      thumbPointingUp = true;
      break;

    case 'open_palm':
    default:
      thumbOpen = true;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      break;
  }

  const fingers = [
    {
      open: indexOpen,
      spread: -0.028 * sideSign * scale,
      joints: [
        JOINT_INDEX.INDEX_METACARPAL,
        JOINT_INDEX.INDEX_PROXIMAL,
        JOINT_INDEX.INDEX_INTERMEDIATE,
        JOINT_INDEX.INDEX_DISTAL,
        JOINT_INDEX.INDEX_TIP,
      ],
    },
    {
      open: middleOpen,
      spread: -0.009 * sideSign * scale,
      joints: [
        JOINT_INDEX.MIDDLE_METACARPAL,
        JOINT_INDEX.MIDDLE_PROXIMAL,
        JOINT_INDEX.MIDDLE_INTERMEDIATE,
        JOINT_INDEX.MIDDLE_DISTAL,
        JOINT_INDEX.MIDDLE_TIP,
      ],
    },
    {
      open: ringOpen,
      spread: 0.009 * sideSign * scale,
      joints: [
        JOINT_INDEX.RING_METACARPAL,
        JOINT_INDEX.RING_PROXIMAL,
        JOINT_INDEX.RING_INTERMEDIATE,
        JOINT_INDEX.RING_DISTAL,
        JOINT_INDEX.RING_TIP,
      ],
    },
    {
      open: pinkyOpen,
      spread: 0.028 * sideSign * scale,
      joints: [
        JOINT_INDEX.PINKY_METACARPAL,
        JOINT_INDEX.PINKY_PROXIMAL,
        JOINT_INDEX.PINKY_INTERMEDIATE,
        JOINT_INDEX.PINKY_DISTAL,
        JOINT_INDEX.PINKY_TIP,
      ],
    },
  ];

  for (const f of fingers) {
    const [mIdx, pIdx, iIdx, dIdx, tIdx] = f.joints;
    const mx = wx + ux * f.spread + fx * 0.03 * scale;
    const my = wy + uy * f.spread + fy * 0.03 * scale;
    const mz = wz + uz * f.spread + fz * 0.03 * scale;

    const px = mx + fx * 0.04 * scale;
    const py = my + fy * 0.04 * scale;
    const pz = mz + fz * 0.04 * scale;

    setJoint(mIdx, mx, my, mz);
    setJoint(pIdx, px, py, pz);

    if (f.open) {
      // Extended straight collinear bone segments
      setJoint(iIdx, px + fx * 0.03 * scale, py + fy * 0.03 * scale, pz + fz * 0.03 * scale);
      setJoint(dIdx, px + fx * 0.052 * scale, py + fy * 0.052 * scale, pz + fz * 0.052 * scale);
      setJoint(tIdx, px + fx * 0.075 * scale, py + fy * 0.075 * scale, pz + fz * 0.075 * scale);
    } else {
      // Curled into palm
      const ix = px + cx * 0.024 * scale;
      const iy = py + cy * 0.024 * scale;
      const iz = pz + cz * 0.024 * scale;
      setJoint(iIdx, ix, iy, iz);
      setJoint(dIdx, ix - fx * 0.016 * scale, iy - fy * 0.016 * scale, iz - fz * 0.016 * scale);
      setJoint(tIdx, ix - fx * 0.028 * scale, iy - fy * 0.028 * scale, iz - fz * 0.028 * scale);
    }
  }

  // Thumb kinematics placement
  const thumbLat = -0.036 * sideSign * scale;
  const tMetaX = wx + ux * thumbLat + fx * 0.022 * scale;
  const tMetaY = wy + uy * thumbLat + fy * 0.022 * scale;
  const tMetaZ = wz + uz * thumbLat + fz * 0.022 * scale;
  setJoint(JOINT_INDEX.THUMB_METACARPAL, tMetaX, tMetaY, tMetaZ);

  if (isPinch) {
    // Index tip position
    const itOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const itx = buf[itOff];
    const ity = buf[itOff + 1];
    const itz = buf[itOff + 2];

    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + itx) * 0.5, (tMetaY + ity) * 0.5, (tMetaZ + itz) * 0.5);
    setJoint(JOINT_INDEX.THUMB_DISTAL, itx - 0.012 * sideSign, ity, itz);
    setJoint(JOINT_INDEX.THUMB_TIP, itx - 0.004 * sideSign, ity, itz);
  } else if (thumbPointingUp) {
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX, tMetaY + 0.025 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX, tMetaY + 0.048 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX, tMetaY + 0.072 * scale, tMetaZ);
  } else if (thumbPointingDown) {
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX, tMetaY - 0.025 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX, tMetaY - 0.048 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX, tMetaY - 0.072 * scale, tMetaZ);
  } else if (thumbOpen) {
    const tDirX = ux * (-0.7 * sideSign) + fx * 0.4;
    const tDirY = uy * (-0.7 * sideSign) + fy * 0.4;
    const tDirZ = uz * (-0.7 * sideSign) + fz * 0.4;
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + tDirX * 0.025 * scale, tMetaY + tDirY * 0.025 * scale, tMetaZ + tDirZ * 0.025 * scale);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + tDirX * 0.05 * scale, tMetaY + tDirY * 0.05 * scale, tMetaZ + tDirZ * 0.05 * scale);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + tDirX * 0.075 * scale, tMetaY + tDirY * 0.075 * scale, tMetaZ + tDirZ * 0.075 * scale);
  } else {
    // Thumb tucked onto fist
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + fx * 0.015 * scale, tMetaY + cy * 0.015 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + fx * 0.025 * scale, tMetaY + cy * 0.02 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + fx * 0.035 * scale, tMetaY + cy * 0.022 * scale, tMetaZ);
  }

  return buf;
}

// ============================================================================
// Playground Application Class
// ============================================================================

export class HaathPlayground {
  private readonly _engine: CompositionalGestureEngine;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;

  private _isWebXRActive = false;
  private _xrSession: XRSession | null = null;
  private _xrRefSpace: XRReferenceSpace | null = null;

  // Simulator State
  private _activeHand: ActiveHandMode = 'right';
  private _leftPoseName = 'open_palm';
  private _rightPoseName = 'open_palm';

  private _leftPoses: Float32Array;
  private _rightPoses: Float32Array;

  // Interactive mouse/trajectory dragging state
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _currentDragDepth = -0.45; // meters Z

  // Animation sequence states
  private _activeSequence: string | null = null;
  private _sequenceStartTime = 0;

  // Trajectory trail points for rendering
  private readonly _leftTrail: [number, number, number][] = [];
  private readonly _rightTrail: [number, number, number][] = [];

  private _lastTimeMs = performance.now();
  private _latestResult: CompositionalFrameResult | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context required for visualizer');
    this._ctx = ctx;

    this._engine = new CompositionalGestureEngine();
    this._leftPoses = buildSyntheticHand({ poseName: this._leftPoseName, hand: 'left' });
    this._rightPoses = buildSyntheticHand({ poseName: this._rightPoseName, hand: 'right' });

    this._setupMouseInteractions();
    this._setupResizeHandler();
  }

  // --- Public Getters & Engine Control ---

  public get engine(): CompositionalGestureEngine {
    return this._engine;
  }

  public get isWebXRActive(): boolean {
    return this._isWebXRActive;
  }

  public setPose(hand: 'left' | 'right' | 'both', poseName: string): void {
    if (hand === 'left' || hand === 'both') {
      this._leftPoseName = poseName;
      this._leftPoses = buildSyntheticHand({
        poseName,
        hand: 'left',
        wristPos: [this._leftPoses[0], this._leftPoses[1], this._leftPoses[2]],
      });
    }
    if (hand === 'right' || hand === 'both') {
      this._rightPoseName = poseName;
      this._rightPoses = buildSyntheticHand({
        poseName,
        hand: 'right',
        wristPos: [this._rightPoses[0], this._rightPoses[1], this._rightPoses[2]],
      });
    }
  }

  public setActiveHandMode(mode: ActiveHandMode): void {
    this._activeHand = mode;
  }

  public resetEngine(): void {
    this._engine.reset();
    this._leftTrail.length = 0;
    this._rightTrail.length = 0;
    this._activeSequence = null;
    this._leftPoses = buildSyntheticHand({ poseName: this._leftPoseName, hand: 'left' });
    this._rightPoses = buildSyntheticHand({ poseName: this._rightPoseName, hand: 'right' });
  }

  // --- Sequences & Simulators ---

  public triggerMicroGesture(type: 'flick' | 'snap' | 'money_rub' | 'tap' | 'thumb_slide'): void {
    this._activeSequence = `micro_${type}`;
    this._sequenceStartTime = performance.now();
  }

  public triggerBimanualSequence(type: 'kamehameha' | 'bow' | 'portal' | 'timeout' | 'dial'): void {
    this._activeSequence = `bimanual_${type}`;
    this._sequenceStartTime = performance.now();
  }

  public triggerTrajectoryPreset(type: 'circle' | 'swipe_left' | 'swipe_right' | 'swipe_up'): void {
    this._activeSequence = `traj_${type}`;
    this._sequenceStartTime = performance.now();
  }

  // --- WebXR Implementation ---

  public async enterWebXR(): Promise<boolean> {
    if (!navigator.xr) {
      alert('WebXR is not supported on this browser or device.');
      return false;
    }

    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) {
      alert('WebXR immersive-vr session is not supported.');
      return false;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['hand-tracking', 'local-floor'],
      });

      this._xrSession = session;
      this._isWebXRActive = true;
      this._xrRefSpace = await session.requestReferenceSpace('local-floor').catch(() =>
        session.requestReferenceSpace('viewer')
      );

      session.addEventListener('end', () => {
        this._isWebXRActive = false;
        this._xrSession = null;
        this._xrRefSpace = null;
      });

      const onXRFrame: XRFrameRequestCallback = (time, frame) => {
        if (!this._xrSession) return;
        this._processXRFrame(frame, time);
        this._xrSession.requestAnimationFrame(onXRFrame);
      };

      session.requestAnimationFrame(onXRFrame);
      return true;
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
      alert(`WebXR session error: ${err}`);
      return false;
    }
  }

  private _processXRFrame(frame: XRFrame, nowMs: number): void {
    if (!this._xrRefSpace) return;

    let hasLeftXR = false;
    let hasRightXR = false;

    for (const source of frame.session.inputSources) {
      if (!source.hand) continue;

      const handedness = source.handedness;
      const targetBuf = handedness === 'left' ? this._leftPoses : this._rightPoses;

      let jointsExtracted = 0;
      for (let j = 0; j < XR_HAND_JOINTS.length; j++) {
        const jointName = XR_HAND_JOINTS[j];
        const jointSpace = source.hand.get(jointName as any);
        if (!jointSpace) continue;

        const pose = frame.getJointPose(jointSpace, this._xrRefSpace);
        if (!pose) continue;

        const b = j * FLOATS_PER_JOINT;
        targetBuf[b] = pose.transform.position.x;
        targetBuf[b + 1] = pose.transform.position.y;
        targetBuf[b + 2] = pose.transform.position.z;
        targetBuf[b + 3] = pose.transform.orientation.x;
        targetBuf[b + 4] = pose.transform.orientation.y;
        targetBuf[b + 5] = pose.transform.orientation.z;
        targetBuf[b + 6] = pose.transform.orientation.w;
        jointsExtracted++;
      }

      if (jointsExtracted >= 20) {
        if (handedness === 'left') hasLeftXR = true;
        if (handedness === 'right') hasRightXR = true;
      }
    }

    const deltaSec = Math.min((nowMs - this._lastTimeMs) / 1000, 0.05);
    this._lastTimeMs = nowMs;

    this._latestResult = this._engine.update(
      hasLeftXR ? this._leftPoses : null,
      0,
      hasRightXR ? this._rightPoses : null,
      0,
      deltaSec,
      nowMs
    );

    this._updateTrails();
    this._renderFrame();
  }

  // --- Animation Loop for Desktop Simulator ---

  public startDesktopLoop(): void {
    const loop = (nowMs: number) => {
      if (!this._isWebXRActive) {
        const deltaSec = Math.min((nowMs - this._lastTimeMs) / 1000, 0.05);
        this._lastTimeMs = nowMs;

        this._tickActiveSequence(nowMs);

        this._latestResult = this._engine.update(
          this._leftPoses,
          0,
          this._rightPoses,
          0,
          deltaSec,
          nowMs
        );

        this._updateTrails();
        this._renderFrame();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  public get latestResult(): CompositionalFrameResult | null {
    return this._latestResult;
  }

  // --- Sequence Tick Handler ---

  private _tickActiveSequence(nowMs: number): void {
    if (!this._activeSequence) return;

    const elapsed = nowMs - this._sequenceStartTime;

    // 1. Kamehameha Sequence (0..700ms)
    if (this._activeSequence === 'bimanual_kamehameha') {
      if (elapsed < 380) {
        // Charge phase: hands cupped near right hip
        this._leftPoses = buildSyntheticHand({
          poseName: 'open_palm',
          hand: 'left',
          wristPos: [0.18, 1.05, -0.28],
          handDir: [0.6, 0.2, -0.4],
        });
        this._rightPoses = buildSyntheticHand({
          poseName: 'open_palm',
          hand: 'right',
          wristPos: [0.22, 1.05, -0.32],
          handDir: [-0.6, 0.2, 0.4],
        });
      } else if (elapsed < 650) {
        // Forward ballistic thrust phase (> 1.2 m/s)
        const t = (elapsed - 380) / 270;
        const pushZ = -0.3 + t * -0.55;
        this._leftPoses = buildSyntheticHand({
          poseName: 'open_palm',
          hand: 'left',
          wristPos: [-0.08, 1.25, pushZ],
          handDir: [0, 0, -1],
        });
        this._rightPoses = buildSyntheticHand({
          poseName: 'open_palm',
          hand: 'right',
          wristPos: [0.08, 1.25, pushZ],
          handDir: [0, 0, -1],
        });
      } else {
        this._activeSequence = null;
      }
    }

    // 2. Bow Draw & Release (0..1000ms)
    else if (this._activeSequence === 'bimanual_bow') {
      if (elapsed < 650) {
        const pullT = elapsed / 650;
        const drawZ = -0.45 + pullT * 0.38;
        // Left hand extends bow forward
        this._leftPoses = buildSyntheticHand({
          poseName: 'fist',
          hand: 'left',
          wristPos: [-0.15, 1.22, -0.45],
          handDir: [0, 0, -1],
        });
        // Right hand draws bowstring back
        this._rightPoses = buildSyntheticHand({
          poseName: 'pinch',
          hand: 'right',
          wristPos: [0.1, 1.22, drawZ],
          handDir: [0, 0, 1],
        });
      } else if (elapsed < 850) {
        // Release: right hand opens / steps back
        this._rightPoses = buildSyntheticHand({
          poseName: 'open_palm',
          hand: 'right',
          wristPos: [0.18, 1.22, -0.05],
          handDir: [0, 0, 1],
        });
      } else {
        this._activeSequence = null;
      }
    }

    // 3. Portal Rip (0..800ms)
    else if (this._activeSequence === 'bimanual_portal') {
      if (elapsed < 200) {
        // Initial tight grip
        this._leftPoses = buildSyntheticHand({
          poseName: 'fist',
          hand: 'left',
          wristPos: [-0.06, 1.2, -0.4],
        });
        this._rightPoses = buildSyntheticHand({
          poseName: 'fist',
          hand: 'right',
          wristPos: [0.06, 1.2, -0.4],
        });
      } else if (elapsed < 600) {
        // Fast outward stretch
        const t = (elapsed - 200) / 400;
        const spread = 0.06 + t * 0.28;
        this._leftPoses = buildSyntheticHand({
          poseName: 'fist',
          hand: 'left',
          wristPos: [-spread, 1.2, -0.4],
        });
        this._rightPoses = buildSyntheticHand({
          poseName: 'fist',
          hand: 'right',
          wristPos: [spread, 1.2, -0.4],
        });
      } else {
        this._activeSequence = null;
      }
    }

    // 4. Timeout 'T' Shape
    else if (this._activeSequence === 'bimanual_timeout') {
      this._rightPoses = buildSyntheticHand({
        poseName: 'open_palm',
        hand: 'right',
        wristPos: [0.0, 1.2, -0.4],
        handDir: [1, 0, 0], // Horizontal palm
      });
      this._leftPoses = buildSyntheticHand({
        poseName: 'point',
        hand: 'left',
        wristPos: [0.0, 1.08, -0.4],
        handDir: [0, 1, 0], // Index tip pointing up at right palm
      });
      if (elapsed > 600) this._activeSequence = null;
    }

    // 5. Dial Rotation (0..1200ms)
    else if (this._activeSequence === 'bimanual_dial') {
      const angle = (elapsed / 1200) * Math.PI * 1.5;
      const radius = 0.18;
      const cx = 0;
      const cy = 1.2;
      this._leftPoses = buildSyntheticHand({
        poseName: 'fist',
        hand: 'left',
        wristPos: [cx - Math.cos(angle) * radius, cy - Math.sin(angle) * radius, -0.4],
      });
      this._rightPoses = buildSyntheticHand({
        poseName: 'fist',
        hand: 'right',
        wristPos: [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, -0.4],
      });
      if (elapsed > 1200) this._activeSequence = null;
    }

    // 6. Micro-Gesture: Finger Flick
    else if (this._activeSequence === 'micro_flick') {
      if (elapsed < 120) {
        // Curled tension
        this.setPose('right', 'fist');
      } else if (elapsed < 240) {
        // High speed extension flick
        this.setPose('right', 'point');
      } else {
        this._activeSequence = null;
      }
    }

    // 7. Micro-Gesture: Finger Snap
    else if (this._activeSequence === 'micro_snap') {
      if (elapsed < 120) {
        this.setPose('right', 'pinch');
      } else if (elapsed < 240) {
        this.setPose('right', 'fist');
      } else {
        this._activeSequence = null;
      }
    }

    // 8. Micro-Gesture: Money Rub
    else if (this._activeSequence === 'micro_money_rub') {
      const osc = Math.sin((elapsed / 300) * Math.PI * 4) * 0.02;
      this._rightPoses = buildSyntheticHand({
        poseName: 'pinch',
        hand: 'right',
        wristPos: [0.18 + osc, 1.2, -0.45],
      });
      if (elapsed > 600) this._activeSequence = null;
    }

    // 9. Trajectory: Circle
    else if (this._activeSequence === 'traj_circle') {
      const angle = (elapsed / 1000) * Math.PI * 2.8;
      const r = 0.12;
      this._rightPoses = buildSyntheticHand({
        poseName: 'point',
        hand: 'right',
        wristPos: [0.18 + Math.cos(angle) * r, 1.2 + Math.sin(angle) * r, -0.45],
      });
      if (elapsed > 1000) this._activeSequence = null;
    }

    // 10. Trajectory: Swipes
    else if (this._activeSequence.startsWith('traj_swipe_')) {
      const dir = this._activeSequence.replace('traj_swipe_', '');
      const t = elapsed / 400;
      let dx = 0, dy = 0;
      if (dir === 'left') dx = -t * 0.45;
      if (dir === 'right') dx = t * 0.45;
      if (dir === 'up') dy = t * 0.45;

      this._rightPoses = buildSyntheticHand({
        poseName: 'open_palm',
        hand: 'right',
        wristPos: [0.18 + dx, 1.2 + dy, -0.45],
      });
      if (elapsed > 400) this._activeSequence = null;
    }
  }

  // --- Mouse / Trajectory Dragging ---

  private _setupMouseInteractions(): void {
    this._canvas.addEventListener('mousedown', (e) => {
      this._isDragging = true;
      const rect = this._canvas.getBoundingClientRect();
      this._dragStartX = e.clientX - rect.left;
      this._dragStartY = e.clientY - rect.top;
      this._updateHandFromMouse(this._dragStartX, this._dragStartY, e.shiftKey);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._isDragging) return;
      const rect = this._canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._updateHandFromMouse(x, y, e.shiftKey);
    });

    window.addEventListener('mouseup', () => {
      this._isDragging = false;
    });

    this._canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._currentDragDepth += e.deltaY * 0.0005;
      this._currentDragDepth = Math.max(-0.9, Math.min(-0.15, this._currentDragDepth));
    });
  }

  private _updateHandFromMouse(canvasX: number, canvasY: number, shiftHeld: boolean): void {
    const normX = (canvasX / this._canvas.width - 0.5) * 1.0; // -0.5m .. +0.5m
    const normY = 1.2 - (canvasY / this._canvas.height - 0.5) * 0.8; // 0.8m .. 1.6m

    if (this._activeHand === 'right' || this._activeHand === 'both') {
      this._rightPoses = buildSyntheticHand({
        poseName: this._rightPoseName,
        hand: 'right',
        wristPos: [normX + 0.1, normY, this._currentDragDepth],
      });
    }

    if (this._activeHand === 'left' || this._activeHand === 'both') {
      this._leftPoses = buildSyntheticHand({
        poseName: this._leftPoseName,
        hand: 'left',
        wristPos: [normX - 0.1, normY, this._currentDragDepth],
      });
    }
  }

  private _setupResizeHandler(): void {
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this._canvas.getBoundingClientRect();
      this._canvas.width = rect.width * dpr;
      this._canvas.height = rect.height * dpr;
      this._ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 50);
  }

  private _updateTrails(): void {
    const rTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const lTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;

    this._rightTrail.push([
      this._rightPoses[rTipOff],
      this._rightPoses[rTipOff + 1],
      this._rightPoses[rTipOff + 2],
    ]);
    if (this._rightTrail.length > 45) this._rightTrail.shift();

    this._leftTrail.push([
      this._leftPoses[lTipOff],
      this._leftPoses[lTipOff + 1],
      this._leftPoses[lTipOff + 2],
    ]);
    if (this._leftTrail.length > 45) this._leftTrail.shift();
  }

  // --- 2D / 3D Canvas Rendering ---

  private _project(x: number, y: number, z: number): [number, number] {
    const rect = this._canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Simple perspective projection centered at [0, 1.2, 0]
    const fov = 420;
    const dist = Math.abs(z);
    const px = w * 0.5 + (x * fov) / dist;
    const py = h * 0.5 - ((y - 1.2) * fov) / dist;
    return [px, py];
  }

  private _renderFrame(): void {
    const rect = this._canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear background
    this._ctx.fillStyle = '#0a0d14';
    this._ctx.fillRect(0, 0, w, h);

    // Draw coordinate grid floor
    this._drawGrid(w, h);

    // Render motion trails
    this._drawTrail(this._leftTrail, '#00ffff');
    this._drawTrail(this._rightTrail, '#ffaa00');

    // Render hands
    this._drawHandSkeleton(this._leftPoses, '#00e5ff', '#007799');
    this._drawHandSkeleton(this._rightPoses, '#ff9100', '#994400');

    // Render Bimanual overlays (if active)
    if (this._latestResult) {
      this._drawBimanualOverlays(this._latestResult);
    }
  }

  private _drawGrid(w: number, h: number): void {
    this._ctx.strokeStyle = '#182030';
    this._ctx.lineWidth = 1;

    for (let x = -0.5; x <= 0.5; x += 0.1) {
      const [p1x, p1y] = this._project(x, 0.8, -0.2);
      const [p2x, p2y] = this._project(x, 0.8, -0.8);
      this._ctx.beginPath();
      this._ctx.moveTo(p1x, p1y);
      this._ctx.lineTo(p2x, p2y);
      this._ctx.stroke();
    }

    for (let z = -0.2; z >= -0.8; z -= 0.1) {
      const [p1x, p1y] = this._project(-0.5, 0.8, z);
      const [p2x, p2y] = this._project(0.5, 0.8, z);
      this._ctx.beginPath();
      this._ctx.moveTo(p1x, p1y);
      this._ctx.lineTo(p2x, p2y);
      this._ctx.stroke();
    }
  }

  private _drawTrail(trail: [number, number, number][], color: string): void {
    if (trail.length < 2) return;

    this._ctx.save();
    for (let i = 1; i < trail.length; i++) {
      const [x0, y0] = this._project(trail[i - 1][0], trail[i - 1][1], trail[i - 1][2]);
      const [x1, y1] = this._project(trail[i][0], trail[i][1], trail[i][2]);
      const alpha = (i / trail.length) * 0.7;

      this._ctx.strokeStyle = color;
      this._ctx.globalAlpha = alpha;
      this._ctx.lineWidth = 2.5;
      this._ctx.beginPath();
      this._ctx.moveTo(x0, y0);
      this._ctx.lineTo(x1, y1);
      this._ctx.stroke();
    }
    this._ctx.restore();
  }

  private _drawHandSkeleton(poses: Float32Array, jointColor: string, boneColor: string): void {
    this._ctx.save();

    // 1. Draw Bones
    this._ctx.strokeStyle = boneColor;
    this._ctx.lineWidth = 3;
    this._ctx.lineCap = 'round';

    for (const [a, b] of SKELETON_CONNECTIONS) {
      const aOff = a * FLOATS_PER_JOINT;
      const bOff = b * FLOATS_PER_JOINT;

      const [ax, ay] = this._project(poses[aOff], poses[aOff + 1], poses[aOff + 2]);
      const [bx, by] = this._project(poses[bOff], poses[bOff + 1], poses[bOff + 2]);

      this._ctx.beginPath();
      this._ctx.moveTo(ax, ay);
      this._ctx.lineTo(bx, by);
      this._ctx.stroke();
    }

    // 2. Draw Joint Spheres
    for (let i = 0; i < JOINT_COUNT; i++) {
      const off = i * FLOATS_PER_JOINT;
      const [px, py] = this._project(poses[off], poses[off + 1], poses[off + 2]);

      const isTip =
        i === JOINT_INDEX.THUMB_TIP ||
        i === JOINT_INDEX.INDEX_TIP ||
        i === JOINT_INDEX.MIDDLE_TIP ||
        i === JOINT_INDEX.RING_TIP ||
        i === JOINT_INDEX.PINKY_TIP;

      this._ctx.fillStyle = isTip ? '#ffffff' : jointColor;
      this._ctx.beginPath();
      this._ctx.arc(px, py, isTip ? 5 : 3.5, 0, Math.PI * 2);
      this._ctx.fill();
    }

    this._ctx.restore();
  }

  private _drawBimanualOverlays(res: CompositionalFrameResult): void {
    const { bimanual } = res;

    // Kamehameha Energy Orb
    if (bimanual.kamehameha.active) {
      const [ox, oy] = this._project(
        bimanual.kamehameha.origin[0],
        bimanual.kamehameha.origin[1],
        bimanual.kamehameha.origin[2]
      );

      const r = 15 + bimanual.kamehameha.charge * 30;
      this._ctx.save();
      this._ctx.fillStyle = bimanual.kamehameha.triggered ? '#ff0055' : '#00ffff';
      this._ctx.shadowColor = '#00ffff';
      this._ctx.shadowBlur = 25;
      this._ctx.beginPath();
      this._ctx.arc(ox, oy, r, 0, Math.PI * 2);
      this._ctx.fill();
      this._ctx.restore();
    }

    // Bow Aiming Vector
    if (bimanual.bow.active) {
      const [ax, ay] = this._project(
        bimanual.bow.arrowOrigin[0],
        bimanual.bow.arrowOrigin[1],
        bimanual.bow.arrowOrigin[2]
      );
      this._ctx.save();
      this._ctx.strokeStyle = '#00ff66';
      this._ctx.lineWidth = 4;
      this._ctx.beginPath();
      this._ctx.arc(ax, ay, 10 + bimanual.bow.power * 15, 0, Math.PI * 2);
      this._ctx.stroke();
      this._ctx.restore();
    }

    // Portal Rip Stretch Line
    if (bimanual.portal.active) {
      const [cx, cy] = this._project(
        bimanual.portal.center[0],
        bimanual.portal.center[1],
        bimanual.portal.center[2]
      );
      this._ctx.save();
      this._ctx.strokeStyle = '#bf00ff';
      this._ctx.lineWidth = bimanual.portal.triggered ? 8 : 4;
      this._ctx.beginPath();
      this._ctx.arc(cx, cy, bimanual.portal.stretchDistance * 80, 0, Math.PI * 2);
      this._ctx.stroke();
      this._ctx.restore();
    }
  }
}
