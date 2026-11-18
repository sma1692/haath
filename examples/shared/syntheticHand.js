// examples/shared/syntheticHand.js
// Builds a synthetic 25-joint WebXR hand (7 floats per joint: x, y, z, qx, qy, qz, qw)
// in XR_HAND_JOINTS order. Plain JS port of buildSyntheticHand() from playground/app.ts.
// Use it to drive haath.updateFromPoses() without a headset: demos, tests, recorded playback.

import { FLOATS_PER_JOINT, JOINT_COUNT, JOINT_INDEX as J } from '@treefour/haath';

/** Pose names this builder understands. Each one maps to a haath sign (see SIGN_FOR_POSE). */
export const SYNTHETIC_POSES = [
  'open_palm', 'fist', 'point', 'pinch', 'peace', 'thumbs_up', 'thumbs_down',
  'horns', 'shaka', 'finger_gun', 'ok_sign',
];

/** The haath core sign each synthetic pose should classify as. */
export const SIGN_FOR_POSE = {
  open_palm: 'open', fist: 'fist', point: 'poke', pinch: 'pinch', peace: 'gun',
  thumbs_up: 'thumbsup', thumbs_down: 'thumbsdown', horns: 'rock-horns',
  shaka: 'telephone', finger_gun: 'gun', ok_sign: 'open',
};

const STRIDE = JOINT_COUNT * FLOATS_PER_JOINT; // 175 floats

/**
 * @param {{ poseName: string, hand: 'left' | 'right', wristPos?: number[], handDir?: number[], scale?: number }} opts
 * @param {Float32Array} [out] reuse a 175-float buffer to avoid allocating per frame
 * @returns {Float32Array}
 */
export function buildSyntheticHand(opts, out) {
  const buf = out ?? new Float32Array(STRIDE);
  const isLeft = opts.hand === 'left';
  const [wx, wy, wz] = opts.wristPos ?? [isLeft ? -0.18 : 0.18, 1.2, -0.45];
  const s = opts.scale ?? 1.0;

  let [fx, fy, fz] = opts.handDir ?? [0, 0, -1];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen; fy /= fLen; fz /= fLen;

  const side = isLeft ? -1 : 1;
  let rx = side, ry = 0, rz = 0;
  if (Math.abs(fx) > 0.9) { rx = 0; ry = 1; rz = 0; }
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen; uy /= uLen; uz /= uLen;
  const cx = fy * uz - fz * uy;
  const cy = fz * ux - fx * uz;
  const cz = fx * uy - fy * ux;

  const set = (idx, x, y, z) => {
    const b = idx * FLOATS_PER_JOINT;
    buf[b] = x; buf[b + 1] = y; buf[b + 2] = z;
    buf[b + 3] = 0; buf[b + 4] = 0; buf[b + 5] = 0; buf[b + 6] = 1;
  };

  set(J.WRIST, wx, wy, wz);

  // thumb, index, middle, ring, pinky
  let t = 1, i = 1, m = 1, r = 1, p = 1;
  let pinch = false, thumbUp = false, thumbDown = false;
  switch (opts.poseName) {
    case 'fist': t = 0; i = 0; m = 0; r = 0; p = 0; break;
    case 'point': t = 0; i = 1; m = 0; r = 0; p = 0; break;
    case 'pinch': t = 1; i = 0; m = 0; r = 0; p = 0; pinch = true; break; // haath pinch = index curled + thumb tip on index tip
    case 'peace': t = 0; i = 1; m = 1; r = 0; p = 0; break;
    case 'thumbs_up': i = 0; m = 0; r = 0; p = 0; thumbUp = true; break;
    case 'thumbs_down': i = 0; m = 0; r = 0; p = 0; thumbDown = true; break;
    case 'horns': t = 1; i = 1; m = 0; r = 0; p = 1; break;
    case 'shaka': t = 1; i = 0; m = 0; r = 0; p = 1; break;
    case 'finger_gun': i = 1; m = 0; r = 0; p = 0; thumbUp = true; break;
    case 'ok_sign': pinch = true; break;
    default: break; // open_palm
  }

  const fingers = [
    [i, -0.028, J.INDEX_METACARPAL, J.INDEX_PROXIMAL, J.INDEX_INTERMEDIATE, J.INDEX_DISTAL, J.INDEX_TIP],
    [m, -0.009, J.MIDDLE_METACARPAL, J.MIDDLE_PROXIMAL, J.MIDDLE_INTERMEDIATE, J.MIDDLE_DISTAL, J.MIDDLE_TIP],
    [r, 0.009, J.RING_METACARPAL, J.RING_PROXIMAL, J.RING_INTERMEDIATE, J.RING_DISTAL, J.RING_TIP],
    [p, 0.028, J.PINKY_METACARPAL, J.PINKY_PROXIMAL, J.PINKY_INTERMEDIATE, J.PINKY_DISTAL, J.PINKY_TIP],
  ];

  for (const [open, spread0, mIdx, pIdx, iIdx, dIdx, tIdx] of fingers) {
    const spread = spread0 * side * s;
    const mx = wx + ux * spread + fx * 0.03 * s;
    const my = wy + uy * spread + fy * 0.03 * s;
    const mz = wz + uz * spread + fz * 0.03 * s;
    const px = mx + fx * 0.04 * s, py = my + fy * 0.04 * s, pz = mz + fz * 0.04 * s;
    set(mIdx, mx, my, mz);
    set(pIdx, px, py, pz);
    if (open) {
      set(iIdx, px + fx * 0.03 * s, py + fy * 0.03 * s, pz + fz * 0.03 * s);
      set(dIdx, px + fx * 0.052 * s, py + fy * 0.052 * s, pz + fz * 0.052 * s);
      set(tIdx, px + fx * 0.075 * s, py + fy * 0.075 * s, pz + fz * 0.075 * s);
    } else {
      const ix = px + cx * 0.024 * s, iy = py + cy * 0.024 * s, iz = pz + cz * 0.024 * s;
      set(iIdx, ix, iy, iz);
      set(dIdx, ix - fx * 0.016 * s, iy - fy * 0.016 * s, iz - fz * 0.016 * s);
      set(tIdx, ix - fx * 0.028 * s, iy - fy * 0.028 * s, iz - fz * 0.028 * s);
    }
  }

  const lat = -0.036 * side * s;
  const tx = wx + ux * lat + fx * 0.022 * s;
  const ty = wy + uy * lat + fy * 0.022 * s;
  const tz = wz + uz * lat + fz * 0.022 * s;
  set(J.THUMB_METACARPAL, tx, ty, tz);

  if (pinch) {
    const o = J.INDEX_TIP * FLOATS_PER_JOINT;
    const ix = buf[o], iy = buf[o + 1], iz = buf[o + 2];
    set(J.THUMB_PROXIMAL, (tx + ix) * 0.5, (ty + iy) * 0.5, (tz + iz) * 0.5);
    set(J.THUMB_DISTAL, ix - 0.012 * side, iy, iz);
    set(J.THUMB_TIP, ix - 0.004 * side, iy, iz);
  } else if (thumbUp || thumbDown) {
    const d = thumbUp ? 1 : -1;
    set(J.THUMB_PROXIMAL, tx, ty + d * 0.025 * s, tz);
    set(J.THUMB_DISTAL, tx, ty + d * 0.048 * s, tz);
    set(J.THUMB_TIP, tx, ty + d * 0.072 * s, tz);
  } else if (t) {
    const dx = ux * (-0.7 * side) + fx * 0.4;
    const dy = uy * (-0.7 * side) + fy * 0.4;
    const dz = uz * (-0.7 * side) + fz * 0.4;
    set(J.THUMB_PROXIMAL, tx + dx * 0.025 * s, ty + dy * 0.025 * s, tz + dz * 0.025 * s);
    set(J.THUMB_DISTAL, tx + dx * 0.05 * s, ty + dy * 0.05 * s, tz + dz * 0.05 * s);
    set(J.THUMB_TIP, tx + dx * 0.075 * s, ty + dy * 0.075 * s, tz + dz * 0.075 * s);
  } else {
    // Tucked: thumb tip rests on the middle finger's intermediate joint (reads as thumb in).
    const o = J.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
    const mx = buf[o], my = buf[o + 1], mz = buf[o + 2];
    set(J.THUMB_PROXIMAL, tx + (mx - tx) * 0.4, ty + (my - ty) * 0.4, tz + (mz - tz) * 0.4);
    set(J.THUMB_DISTAL, tx + (mx - tx) * 0.75, ty + (my - ty) * 0.75, tz + (mz - tz) * 0.75);
    set(J.THUMB_TIP, mx + cx * 0.01 * s, my + cy * 0.01 * s, mz + cz * 0.01 * s);
  }
  return buf;
}

/** Bone pairs for drawing a skeleton. */
export const HAND_BONES = [
  [J.WRIST, J.THUMB_METACARPAL], [J.THUMB_METACARPAL, J.THUMB_PROXIMAL], [J.THUMB_PROXIMAL, J.THUMB_DISTAL], [J.THUMB_DISTAL, J.THUMB_TIP],
  [J.WRIST, J.INDEX_METACARPAL], [J.INDEX_METACARPAL, J.INDEX_PROXIMAL], [J.INDEX_PROXIMAL, J.INDEX_INTERMEDIATE], [J.INDEX_INTERMEDIATE, J.INDEX_DISTAL], [J.INDEX_DISTAL, J.INDEX_TIP],
  [J.WRIST, J.MIDDLE_METACARPAL], [J.MIDDLE_METACARPAL, J.MIDDLE_PROXIMAL], [J.MIDDLE_PROXIMAL, J.MIDDLE_INTERMEDIATE], [J.MIDDLE_INTERMEDIATE, J.MIDDLE_DISTAL], [J.MIDDLE_DISTAL, J.MIDDLE_TIP],
  [J.WRIST, J.RING_METACARPAL], [J.RING_METACARPAL, J.RING_PROXIMAL], [J.RING_PROXIMAL, J.RING_INTERMEDIATE], [J.RING_INTERMEDIATE, J.RING_DISTAL], [J.RING_DISTAL, J.RING_TIP],
  [J.WRIST, J.PINKY_METACARPAL], [J.PINKY_METACARPAL, J.PINKY_PROXIMAL], [J.PINKY_PROXIMAL, J.PINKY_INTERMEDIATE], [J.PINKY_INTERMEDIATE, J.PINKY_DISTAL], [J.PINKY_DISTAL, J.PINKY_TIP],
  [J.INDEX_METACARPAL, J.MIDDLE_METACARPAL], [J.MIDDLE_METACARPAL, J.RING_METACARPAL], [J.RING_METACARPAL, J.PINKY_METACARPAL],
];
