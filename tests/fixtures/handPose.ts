import { FLOATS_PER_JOINT, JOINT_COUNT, JOINT_INDEX } from '../../src/index.js';

export interface FingerBuildOpts {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  wrist?: [number, number, number];
  handDir?: [number, number, number]; // Direction of extended fingers (default [0, 0, -1])
  thumbDir?: [number, number, number]; // Direction of extended thumb (default [1, 0, 0])
  pinch?: boolean;
  scale?: number;
  splayDeg?: number; // V angle between open index and middle (each tilts half outward)
}

/**
 * Helper that builds a realistic 25-joint pose buffer (175 floats) with controllable
 * finger extension states, wrist position, hand orientation, and scale.
 */
export function buildHandPoseBuffer(opts: FingerBuildOpts = {}): Float32Array {
  const buf = new Float32Array(JOINT_COUNT * FLOATS_PER_JOINT);
  const [wx, wy, wz] = opts.wrist ?? [-0.2, 1.2, -0.4];
  const scale = opts.scale ?? 1.0;

  // Normalize forward direction (default pointing forward -Z)
  let [fx, fy, fz] = opts.handDir ?? [0, 0, -1];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  // Orthogonal lateral axis for knuckle spread
  let rx = 1, ry = 0, rz = 0;
  if (Math.abs(fx) > 0.9) {
    rx = 0; ry = 1; rz = 0;
  }
  // Right = cross(f, r)
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;

  // Curl direction (perpendicular to finger forward and lateral)
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

  const fingers = [
    {
      open: opts.index ?? false,
      spread: -0.03 * scale,
      joints: [
        JOINT_INDEX.INDEX_METACARPAL,
        JOINT_INDEX.INDEX_PROXIMAL,
        JOINT_INDEX.INDEX_INTERMEDIATE,
        JOINT_INDEX.INDEX_DISTAL,
        JOINT_INDEX.INDEX_TIP,
      ],
    },
    {
      open: opts.middle ?? false,
      spread: -0.01 * scale,
      joints: [
        JOINT_INDEX.MIDDLE_METACARPAL,
        JOINT_INDEX.MIDDLE_PROXIMAL,
        JOINT_INDEX.MIDDLE_INTERMEDIATE,
        JOINT_INDEX.MIDDLE_DISTAL,
        JOINT_INDEX.MIDDLE_TIP,
      ],
    },
    {
      open: opts.ring ?? false,
      spread: 0.01 * scale,
      joints: [
        JOINT_INDEX.RING_METACARPAL,
        JOINT_INDEX.RING_PROXIMAL,
        JOINT_INDEX.RING_INTERMEDIATE,
        JOINT_INDEX.RING_DISTAL,
        JOINT_INDEX.RING_TIP,
      ],
    },
    {
      open: opts.pinky ?? false,
      spread: 0.03 * scale,
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
      // Collinear straight segments along f, optionally tilted sideways for a V (splayDeg)
      let dx = fx, dy = fy, dz = fz;
      const isIndexOrMiddle = mIdx === JOINT_INDEX.INDEX_METACARPAL || mIdx === JOINT_INDEX.MIDDLE_METACARPAL;
      if (opts.splayDeg && isIndexOrMiddle) {
        const half = ((opts.splayDeg / 2) * Math.PI) / 180;
        const side = mIdx === JOINT_INDEX.INDEX_METACARPAL ? -1 : 1;
        dx = fx * Math.cos(half) + ux * side * Math.sin(half);
        dy = fy * Math.cos(half) + uy * side * Math.sin(half);
        dz = fz * Math.cos(half) + uz * side * Math.sin(half);
      }
      setJoint(iIdx, px + dx * 0.03 * scale, py + dy * 0.03 * scale, pz + dz * 0.03 * scale);
      setJoint(dIdx, px + dx * 0.05 * scale, py + dy * 0.05 * scale, pz + dz * 0.05 * scale);
      setJoint(tIdx, px + dx * 0.07 * scale, py + dy * 0.07 * scale, pz + dz * 0.07 * scale);
    } else {
      // Curled: intermediate bends 90 deg along c, tip bends back -f (dot product <= 0)
      const ix = px + cx * 0.025 * scale;
      const iy = py + cy * 0.025 * scale;
      const iz = pz + cz * 0.025 * scale;
      setJoint(iIdx, ix, iy, iz);
      setJoint(dIdx, ix - fx * 0.015 * scale, iy - fy * 0.015 * scale, iz - fz * 0.015 * scale);
      setJoint(tIdx, ix - fx * 0.025 * scale, iy - fy * 0.025 * scale, iz - fz * 0.025 * scale);
    }
  }

  // Thumb placement
  const tMetaX = wx + ux * (-0.035 * scale) + fx * 0.02 * scale;
  const tMetaY = wy + uy * (-0.035 * scale) + fy * 0.02 * scale;
  const tMetaZ = wz + uz * (-0.035 * scale) + fz * 0.02 * scale;
  setJoint(JOINT_INDEX.THUMB_METACARPAL, tMetaX, tMetaY, tMetaZ);

  if (opts.pinch) {
    // Place thumb tip within 1cm of index tip
    const idxTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const itx = buf[idxTipOff];
    const ity = buf[idxTipOff + 1];
    const itz = buf[idxTipOff + 2];
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + itx) * 0.5, (tMetaY + ity) * 0.5, (tMetaZ + itz) * 0.5);
    setJoint(JOINT_INDEX.THUMB_DISTAL, itx - 0.01, ity, itz);
    setJoint(JOINT_INDEX.THUMB_TIP, itx - 0.005, ity, itz);
  } else if (opts.thumb) {
    // Extended outward far from middle-inter (> palm width ~0.06m * scale)
    let [tx, ty, tz] = opts.thumbDir ?? [-ux, -uy, -uz];
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + tx * 0.03 * scale, tMetaY + ty * 0.03 * scale, tMetaZ + tz * 0.03 * scale);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + tx * 0.06 * scale, tMetaY + ty * 0.06 * scale, tMetaZ + tz * 0.06 * scale);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + tx * 0.095 * scale, tMetaY + ty * 0.095 * scale, tMetaZ + tz * 0.095 * scale);
  } else {
    // Tucked close to middle-finger-phalanx-intermediate (< palm width)
    const midInterOff = JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
    const mix = buf[midInterOff];
    const miy = buf[midInterOff + 1];
    const miz = buf[midInterOff + 2];
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + mix) * 0.5, (tMetaY + miy) * 0.5, (tMetaZ + miz) * 0.5);
    setJoint(
      JOINT_INDEX.THUMB_DISTAL,
      mix - cx * 0.015 * scale - fx * 0.015 * scale,
      miy - cy * 0.015 * scale - fy * 0.015 * scale,
      miz - cz * 0.015 * scale - fz * 0.015 * scale,
    );
    setJoint(
      JOINT_INDEX.THUMB_TIP,
      mix - cx * 0.025 * scale - fx * 0.015 * scale,
      miy - cy * 0.025 * scale - fy * 0.015 * scale,
      miz - cz * 0.025 * scale - fz * 0.015 * scale,
    );
  }

  return buf;
}
