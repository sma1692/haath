// src/math/mat4.ts
function mat4Copy(out, a) {
  for (let i = 0; i < 16; i++) out[i] = a[i];
  return out;
}
function mat4Multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[c * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[c * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[c * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return out;
}
function mat4Invert(out, a) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
function mat4FromRotationZ(out, rad) {
  const s = Math.sin(rad), c = Math.cos(rad);
  for (let i = 0; i < 16; i++) out[i] = 0;
  out[0] = c;
  out[1] = s;
  out[4] = -s;
  out[5] = c;
  out[10] = 1;
  out[15] = 1;
  return out;
}
function mat4Decompose(m, pos, quat, scale) {
  let sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  const det = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
  if (det < 0) sx = -sx;
  pos[0] = m[12];
  pos[1] = m[13];
  pos[2] = m[14];
  scale[0] = sx;
  scale[1] = sy;
  scale[2] = sz;
  const isx = sx ? 1 / sx : 0, isy = sy ? 1 / sy : 0, isz = sz ? 1 / sz : 0;
  const m11 = m[0] * isx, m12 = m[4] * isy, m13 = m[8] * isz;
  const m21 = m[1] * isx, m22 = m[5] * isy, m23 = m[9] * isz;
  const m31 = m[2] * isx, m32 = m[6] * isy, m33 = m[10] * isz;
  const trace = m11 + m22 + m33;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    quat[3] = 0.25 / s;
    quat[0] = (m32 - m23) * s;
    quat[1] = (m13 - m31) * s;
    quat[2] = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    quat[3] = (m32 - m23) / s;
    quat[0] = 0.25 * s;
    quat[1] = (m12 + m21) / s;
    quat[2] = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    quat[3] = (m13 - m31) / s;
    quat[0] = (m12 + m21) / s;
    quat[1] = 0.25 * s;
    quat[2] = (m23 + m32) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
    quat[3] = (m21 - m12) / s;
    quat[0] = (m13 + m31) / s;
    quat[1] = (m23 + m32) / s;
    quat[2] = 0.25 * s;
  }
}
function mat4Compose(out, pos, quat, scale) {
  const x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const sx = scale[0], sy = scale[1], sz = scale[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = pos[0];
  out[13] = pos[1];
  out[14] = pos[2];
  out[15] = 1;
  return out;
}
function quatSlerp(out, a, b, t) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  let s0, s1;
  if (1 - cos > 1e-6) {
    const omega = Math.acos(cos);
    const sin = Math.sin(omega);
    s0 = Math.sin((1 - t) * omega) / sin;
    s1 = Math.sin(t * omega) / sin;
  } else {
    s0 = 1 - t;
    s1 = t;
  }
  out[0] = s0 * ax + s1 * bx;
  out[1] = s0 * ay + s1 * by;
  out[2] = s0 * az + s1 * bz;
  out[3] = s0 * aw + s1 * bw;
  return out;
}
function quatRotateVec3(out, q, v) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const vx = v[0], vy = v[1], vz = v[2];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  out[0] = vx + qw * tx + (qy * tz - qz * ty);
  out[1] = vy + qw * ty + (qz * tx - qx * tz);
  out[2] = vz + qw * tz + (qx * ty - qy * tx);
  return out;
}
function quatYaw(q) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (x * x + y * y));
}
var _pA = [0, 0, 0];
var _qA = [0, 0, 0, 1];
var _sA = [1, 1, 1];
var _pB = [0, 0, 0];
var _qB = [0, 0, 0, 1];
var _sB = [1, 1, 1];
function mat4Interpolate(out, a, b, t) {
  mat4Decompose(a, _pA, _qA, _sA);
  mat4Decompose(b, _pB, _qB, _sB);
  for (let i = 0; i < 3; i++) {
    _pA[i] += (_pB[i] - _pA[i]) * t;
    _sA[i] += (_sB[i] - _sA[i]) * t;
  }
  quatSlerp(_qA, _qA, _qB, t);
  return mat4Compose(out, _pA, _qA, _sA);
}
function quatMultiply(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
function quatConjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  return out;
}

// src/emulator/HandEmulator.ts
var EMULATOR_POSES = [
  "open_palm",
  "fist",
  "point",
  "thumbs_up",
  "thumbs_down",
  "horns",
  "shaka",
  "finger_gun",
  "pinkie_out",
  "pinch",
  "peace",
  "ok_sign",
  "asl_l",
  "claw",
  "double_gun",
  // Combat stances: static hand shape, but the app sees the strike gesture so contact still hits.
  "punch",
  "slap",
  "idle"
];
var DEFAULT_EMULATOR_GESTURE_MAP = {
  open_palm: "open",
  fist: "fist",
  point: "poke",
  thumbs_up: "thumbsup",
  thumbs_down: "thumbsdown",
  horns: "rock-horns",
  shaka: "telephone",
  finger_gun: "gun",
  pinkie_out: "pinkie-out",
  pinch: "pinch",
  peace: "peace",
  ok_sign: "ok",
  asl_l: "gun",
  claw: "fist",
  // Two-finger gun removed in favor of peace sign (single finger + thumb out for gun).
  double_gun: "peace",
  punch: "punch",
  slap: "slap",
  idle: "idle"
};
var EMULATOR_FINGER_COUNT = {
  open_palm: 5,
  fist: 0,
  point: 1,
  peace: 2,
  claw: 3,
  asl_l: 2,
  horns: 2,
  shaka: 2,
  finger_gun: 2,
  pinkie_out: 1,
  pinch: 0,
  thumbs_up: 1,
  thumbs_down: 1,
  ok_sign: 3,
  double_gun: 2,
  punch: 0,
  slap: 5,
  idle: 0
};
var EMULATOR_POSE_LABELS = {
  open_palm: "\u270B Open",
  fist: "\u270A Fist",
  point: "\u261D\uFE0F Point",
  thumbs_up: "\u{1F44D} Up",
  thumbs_down: "\u{1F44E} Down",
  horns: "\u{1F918} Horns",
  shaka: "\u{1F919} Shaka",
  finger_gun: "\u{1F449} Gun",
  pinkie_out: "\u{1F919} Pinkie",
  pinch: "\u{1F90F} Pinch",
  peace: "\u270C\uFE0F Peace",
  ok_sign: "\u{1F44C} OK",
  asl_l: "\u{1F446} L-Gun",
  claw: "\u{1F985} Claw (3)",
  double_gun: "\u{1F52B} Gun-2",
  punch: "\u{1F94A} Punch",
  slap: "\u{1F590}\uFE0F Slap",
  idle: "\u26AA Idle"
};
var DEFAULT_EMULATOR_KEYMAP = {
  move: {
    KeyW: { hand: "left", dx: 0, dy: 1 },
    KeyS: { hand: "left", dx: 0, dy: -1 },
    KeyA: { hand: "left", dx: -1, dy: 0 },
    KeyD: { hand: "left", dx: 1, dy: 0 },
    ArrowUp: { hand: "right", dx: 0, dy: 1 },
    ArrowDown: { hand: "right", dx: 0, dy: -1 },
    ArrowLeft: { hand: "right", dx: -1, dy: 0 },
    ArrowRight: { hand: "right", dx: 1, dy: 0 }
  },
  // Animated strikes (hand lunges forward with strike velocity).
  strike: {
    Digit1: { hand: "left", kind: "punch" },
    Digit2: { hand: "left", kind: "slap" },
    Digit3: { hand: "left", kind: "poke" },
    KeyU: { hand: "right", kind: "punch" },
    KeyI: { hand: "right", kind: "slap" },
    KeyO: { hand: "right", kind: "poke" }
  },
  spell: {
    Digit5: { hand: "left", kind: "circle" },
    Digit6: { hand: "left", kind: "triangle" },
    KeyC: { hand: "right", kind: "circle" },
    KeyV: { hand: "right", kind: "triangle" }
  },
  hold: {
    Digit4: { hand: "left", pose: "finger_gun" },
    KeyQ: { hand: "left", pose: "thumbs_up" },
    KeyE: { hand: "left", pose: "thumbs_down" },
    KeyR: { hand: "left", pose: "horns" },
    KeyT: { hand: "left", pose: "shaka" },
    KeyP: { hand: "right", pose: "finger_gun" },
    KeyJ: { hand: "right", pose: "thumbs_up" },
    KeyK: { hand: "right", pose: "thumbs_down" },
    KeyL: { hand: "right", pose: "horns" },
    Semicolon: { hand: "right", pose: "shaka" }
  }
};
var FINGER_JOINTS = {
  thumb: ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"],
  index: [
    "index-finger-metacarpal",
    "index-finger-phalanx-proximal",
    "index-finger-phalanx-intermediate",
    "index-finger-phalanx-distal",
    "index-finger-tip"
  ],
  middle: [
    "middle-finger-metacarpal",
    "middle-finger-phalanx-proximal",
    "middle-finger-phalanx-intermediate",
    "middle-finger-phalanx-distal",
    "middle-finger-tip"
  ],
  ring: [
    "ring-finger-metacarpal",
    "ring-finger-phalanx-proximal",
    "ring-finger-phalanx-intermediate",
    "ring-finger-phalanx-distal",
    "ring-finger-tip"
  ],
  pinky: [
    "pinky-finger-metacarpal",
    "pinky-finger-phalanx-proximal",
    "pinky-finger-phalanx-intermediate",
    "pinky-finger-phalanx-distal",
    "pinky-finger-tip"
  ]
};
var FINGER_KEYS = ["thumb", "index", "middle", "ring", "pinky"];
var ALL_JOINT_NAMES = [
  "wrist",
  ...FINGER_JOINTS.thumb,
  ...FINGER_JOINTS.index,
  ...FINGER_JOINTS.middle,
  ...FINGER_JOINTS.ring,
  ...FINGER_JOINTS.pinky
];
var POSE_FINGER_CONFIGS = {
  open_palm: { thumb: "open", index: "open", middle: "open", ring: "open", pinky: "open" },
  fist: { thumb: "curled", index: "curled", middle: "curled", ring: "curled", pinky: "curled" },
  point: { thumb: "curled", index: "point", middle: "curled", ring: "curled", pinky: "curled" },
  thumbs_up: { thumb: "open", index: "curled", middle: "curled", ring: "curled", pinky: "curled" },
  thumbs_down: { thumb: "open", index: "curled", middle: "curled", ring: "curled", pinky: "curled" },
  horns: { thumb: "open", index: "point", middle: "curled", ring: "curled", pinky: "open" },
  // haath rock-horns = (1,1,0,0,1)
  shaka: { thumb: "open", index: "curled", middle: "curled", ring: "curled", pinky: "open" },
  finger_gun: { thumb: "open", index: "point", middle: "curled", ring: "curled", pinky: "curled" },
  pinkie_out: { thumb: "curled", index: "curled", middle: "curled", ring: "curled", pinky: "open" },
  pinch: { thumb: "pinch", index: "pinch", middle: "open", ring: "open", pinky: "open" },
  peace: { thumb: "curled", index: "point", middle: "open", ring: "curled", pinky: "curled" },
  ok_sign: { thumb: "pinch", index: "pinch", middle: "open", ring: "open", pinky: "open" },
  asl_l: { thumb: "open", index: "point", middle: "curled", ring: "curled", pinky: "curled" },
  claw: { thumb: "half", index: "half", middle: "half", ring: "half", pinky: "half" },
  double_gun: { thumb: "open", index: "point", middle: "open", ring: "curled", pinky: "curled" },
  punch: { thumb: "curled", index: "curled", middle: "curled", ring: "curled", pinky: "curled" },
  slap: { thumb: "open", index: "open", middle: "open", ring: "open", pinky: "open" },
  idle: { thumb: "open", index: "open", middle: "open", ring: "open", pinky: "open" }
};
var SAFE_IWER_BASE_POSE = {
  open_palm: "default",
  idle: "default",
  pinch: "default",
  ok_sign: "default",
  claw: "default",
  shaka: "default",
  point: "point",
  finger_gun: "default",
  asl_l: "default",
  peace: "default",
  horns: "default",
  fist: "default",
  thumbs_up: "default",
  thumbs_down: "default",
  pinkie_out: "default",
  double_gun: "default",
  punch: "default",
  slap: "default"
};
var SAFE_IWER_PINCH_VALUE = {
  open_palm: 0,
  idle: 0,
  shaka: 0,
  point: 0,
  finger_gun: 0,
  asl_l: 0,
  peace: 0,
  horns: 0,
  claw: 0,
  pinch: 1,
  ok_sign: 1,
  fist: 0,
  thumbs_up: 0,
  thumbs_down: 0,
  pinkie_out: 0,
  double_gun: 0,
  punch: 0,
  slap: 0
};
function getJointMatrix(jointSpace) {
  if (!jointSpace) return null;
  const isMat = (m) => m && (Array.isArray(m) || ArrayBuffer.isView(m));
  if (isMat(jointSpace.offsetMatrix)) return jointSpace.offsetMatrix;
  if (isMat(jointSpace._offsetMatrix)) return jointSpace._offsetMatrix;
  for (const s of Object.getOwnPropertySymbols(jointSpace)) {
    const val = jointSpace[s];
    if (val && typeof val === "object" && isMat(val.offsetMatrix)) return val.offsetMatrix;
  }
  return null;
}
var getJoint = (hand, name) => typeof hand.get === "function" ? hand.get(name) : hand[name];
function captureWristLocalJoints(handInput) {
  try {
    const hand = handInput?.inputSource?.hand;
    if (!hand) return null;
    const wristArr = getJointMatrix(getJoint(hand, "wrist"));
    if (!wristArr) return null;
    const wristInv = new Array(16);
    if (!mat4Invert(wristInv, wristArr)) return null;
    const snapshot = {};
    for (const jName of ALL_JOINT_NAMES) {
      const m = getJointMatrix(getJoint(hand, jName));
      if (m) snapshot[jName] = mat4Multiply(new Array(16), wristInv, m);
    }
    return Object.keys(snapshot).length > 0 ? snapshot : null;
  } catch {
    return null;
  }
}
function synthesizeCurledIndex(snapDef, snapPoint) {
  const fistSnap = {};
  for (const k of Object.keys(snapPoint)) fistSnap[k] = [...snapPoint[k]];
  const idx = FINGER_JOINTS.index;
  const mid = FINGER_JOINTS.middle;
  try {
    if (!snapDef[idx[0]]) return fistSnap;
    let fPrev = [...snapDef[idx[0]]];
    fistSnap[idx[0]] = [...fPrev];
    const inv = new Array(16), rel = new Array(16);
    const p = [0, 0, 0], s = [1, 1, 1];
    const qDef = [0, 0, 0, 1], qPt = [0, 0, 0, 1], qIdx = [0, 0, 0, 1], qCurl = [0, 0, 0, 1];
    for (let i = 1; i <= 4; i++) {
      mat4Invert(inv, snapDef[mid[i - 1]]);
      mat4Multiply(rel, inv, snapDef[mid[i]]);
      mat4Decompose(rel, p, qDef, s);
      mat4Invert(inv, snapPoint[mid[i - 1]]);
      mat4Multiply(rel, inv, snapPoint[mid[i]]);
      mat4Decompose(rel, p, qPt, s);
      quatMultiply(qCurl, quatConjugate(qCurl, qDef), qPt);
      mat4Invert(inv, snapDef[idx[i - 1]]);
      mat4Multiply(rel, inv, snapDef[idx[i]]);
      mat4Decompose(rel, p, qIdx, s);
      quatMultiply(qIdx, qIdx, qCurl);
      mat4Compose(rel, p, qIdx, s);
      const fI = mat4Multiply(new Array(16), fPrev, rel);
      fistSnap[idx[i]] = fI;
      fPrev = fI;
    }
  } catch (err) {
    console.warn("[HaathEmu] Error synthesizing curled index:", err);
  }
  return fistSnap;
}
function synthesizeTuckedThumb(fistSnap) {
  const [metaName, proxName, distName, tipName] = FINGER_JOINTS.thumb;
  const meta = fistSnap[metaName];
  const idxInter = fistSnap["index-finger-phalanx-intermediate"];
  const midInter = fistSnap["middle-finger-phalanx-intermediate"];
  if (!meta || !idxInter || !midInter || !fistSnap[proxName] || !fistSnap[distName] || !fistSnap[tipName]) return void 0;
  const tip = [0, 1, 2].map((i) => midInter[12 + i] + (idxInter[12 + i] - midInter[12 + i]) * 0.35);
  const at = (t) => [0, 1, 2].map((i) => meta[12 + i] + (tip[i] - meta[12 + i]) * t);
  const tuck = { [metaName]: [...meta] };
  const place = (name, pos) => {
    const m = [...fistSnap[name]];
    m[12] = pos[0];
    m[13] = pos[1];
    m[14] = pos[2];
    tuck[name] = m;
  };
  place(proxName, at(0.4));
  place(distName, at(0.75));
  place(tipName, tip);
  return tuck;
}
var _wristMat = new Array(16);
var _rotZ = new Array(16);
var _halfMat = new Array(16);
function applyPoseBlending(handInput, pose, snaps, handedness) {
  const def = snaps.default;
  if (!def) return;
  const config = POSE_FINGER_CONFIGS[pose];
  const hand = handInput?.inputSource?.hand;
  if (!config || !hand) return;
  const wristSpace = getJoint(hand, "wrist");
  const liveWrist = getJointMatrix(wristSpace);
  if (!liveWrist) return;
  mat4Copy(_wristMat, liveWrist);
  if (pose === "thumbs_down" || pose === "thumbs_up") {
    mat4FromRotationZ(_rotZ, (handedness === "left" ? -1 : 1) * Math.PI * -0.6);
    mat4Multiply(_wristMat, _wristMat, _rotZ);
    if (pose === "thumbs_down") {
      _wristMat[0] = -_wristMat[0];
      _wristMat[1] = -_wristMat[1];
      _wristMat[4] = -_wristMat[4];
      _wristMat[5] = -_wristMat[5];
      _wristMat[8] = -_wristMat[8];
      _wristMat[9] = -_wristMat[9];
    }
    mat4Copy(liveWrist, _wristMat);
  }
  for (const fKey of FINGER_KEYS) {
    const curl = config[fKey];
    for (const jName of FINGER_JOINTS[fKey]) {
      const out = getJointMatrix(getJoint(hand, jName));
      const defLocal = def[jName];
      if (!out || !defLocal) continue;
      const pointLocal = snaps.point?.[jName] || defLocal;
      const fistLocal = snaps.fist?.[jName] || pointLocal;
      const pinchLocal = snaps.pinch?.[jName] || fistLocal;
      let target = defLocal;
      if (curl === "point") target = pointLocal;
      else if (curl === "curled") target = fKey === "thumb" && snaps.tuck?.[jName] || fistLocal;
      else if (curl === "pinch") target = pinchLocal;
      else if (curl === "half") target = mat4Interpolate(_halfMat, defLocal, fistLocal, 0.55);
      mat4Multiply(out, _wristMat, target);
    }
  }
}
function findDevUi(dev) {
  if (!dev || typeof dev !== "object") return null;
  if (dev.devui) return dev.devui;
  for (const sym of Object.getOwnPropertySymbols(dev)) {
    const inner = dev[sym];
    if (inner?.devui) return inner.devui;
  }
  return null;
}
var KEY_LABEL = {
  Semicolon: ";",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  ArrowUp: "\u2191",
  ArrowDown: "\u2193",
  ArrowLeft: "\u2190",
  ArrowRight: "\u2192"
};
var keyLabel = (code) => KEY_LABEL[code] ?? code.replace(/^Key/, "").replace(/^Digit/, "");
var smoothstep = (t) => t * t * (3 - 2 * t);
var STRIKE_POSE = { punch: "punch", slap: "slap", poke: "point" };
var STRIKE_MOTION = {
  punch: { speed: 4.2, reach: 0.42, windup: 0.08, sweep: 0 },
  slap: { speed: 3.8, reach: 0.36, windup: 0.08, sweep: 0.12 },
  poke: { speed: 4, reach: 0.4, windup: 0.07, sweep: 0 }
};
var STRIKE_WINDUP_MS = 90;
var STRIKE_HOLD_MS = 60;
var STRIKE_RECOVER_MS = 220;
var COMBAT_POSES = ["punch", "slap", "point"];
var COMBAT_LABELS = { point: "\u{1F449} Poke" };
var STYLE = `
  .hge-root .hge-panel {
    position: fixed; top: 12px; width: 268px; box-sizing: border-box;
    background: rgba(18, 16, 26, 0.92); border: 1px solid rgba(168, 85, 247, 0.45);
    border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.65), 0 0 16px rgba(168,85,247,0.25);
    padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px; color: #e9e4d6; user-select: none; backdrop-filter: blur(8px);
  }
  .hge-root .hge-panel.hge-collapsed .hge-body { display: none; }
  .hge-root .hge-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .hge-root .hge-title { font-weight: 700; color: #f0c060; font-size: 13px; }
  .hge-root .hge-sub { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; }
  .hge-root .hge-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .hge-root .hge-body { display: flex; flex-direction: column; gap: 6px; }
  .hge-root button {
    font: inherit; font-size: 11px; color: #d1d5db; background: #222030;
    border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 3px 7px; cursor: pointer;
    transition: background 0.12s ease, filter 0.12s ease, transform 0.08s ease;
  }
  .hge-root button:hover { filter: brightness(1.25); }
  .hge-root button:active { transform: scale(0.96); }
  .hge-root button.hge-on { background: #a855f7; border-color: #c084fc; color: #fff; font-weight: 700; }
  .hge-root button.hge-strike { color: #fff; border: none; font-weight: 600; }
  .hge-root kbd {
    font: 600 9px ui-monospace, Menlo, monospace; color: #f0c060; background: rgba(255,255,255,0.08);
    border-radius: 3px; padding: 0 3px; margin-left: 4px;
  }
  .hge-root .hge-pad { display: grid; grid-template-columns: repeat(3, 24px); gap: 2px; }
  .hge-root .hge-pad button { padding: 2px 0; text-align: center; }
  .hge-root .hge-readout { font: 11px ui-monospace, Menlo, monospace; color: #c4b5fd; line-height: 1.5; white-space: pre; }
  .hge-root .hge-center {
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(18, 16, 26, 0.92); border: 1px solid rgba(168, 85, 247, 0.45); border-radius: 10px;
    padding: 6px 10px; display: flex; gap: 6px; align-items: center; z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #e9e4d6;
    user-select: none; backdrop-filter: blur(8px);
  }
`;
var HandEmulator = class {
  opts;
  hooks;
  gestureMap;
  keys;
  speedMin;
  speedMax;
  rampSeconds;
  moveLimit;
  workspaceLimit;
  targetSpeed;
  // Programmatic hand driving (setHandTarget / strike). Positions are wrist positions in reference space.
  simTarget = { left: null, right: null };
  simStrike = { left: null, right: null };
  lastWrist = { left: null, right: null };
  simRaf = null;
  simLast = 0;
  // Scratch three.js objects cloned from the DevUI handle (keeps haath free of a three import).
  scratchVec = null;
  scratchQuat = null;
  _q = [0, 0, 0, 1];
  _v = [0, 0, 0];
  currentPose = { left: "idle", right: "idle" };
  /** Hand-local joint translation used by strike / clap / circle animations. */
  animOffset = { left: null, right: null };
  appliedAnimOffset = { left: [0, 0, 0], right: [0, 0, 0] };
  strikeRestore = { left: null, right: null };
  strikeToken = { left: 0, right: 0 };
  device = null;
  session = null;
  visible = false;
  destroyed = false;
  mirrorBoth = false;
  isSyncingDevUi = false;
  // Movement
  heldMoveKeys = /* @__PURE__ */ new Set();
  moveHoldStart = { left: null, right: null };
  moveRaf = null;
  moveLast = 0;
  fallbackHome = { left: null, right: null };
  // Keyboard hold poses: code -> pose to restore on release
  heldPoseKeys = /* @__PURE__ */ new Map();
  // DOM
  root = null;
  panels = {};
  pollTimer = null;
  layoutTimer = null;
  onKeyDown = (e) => this.handleKeyDown(e);
  onKeyUp = (e) => this.handleKeyUp(e);
  onBlur = () => this.releaseAllInput();
  onInputSourcesChange = () => this.onSessionInputsChanged();
  constructor(options) {
    this.opts = options;
    this.hooks = options.hooks ?? {};
    this.gestureMap = { ...DEFAULT_EMULATOR_GESTURE_MAP, ...options.gestureMap ?? {} };
    this.keys = {
      move: options.keyMap?.move ?? DEFAULT_EMULATOR_KEYMAP.move,
      strike: options.keyMap?.strike ?? DEFAULT_EMULATOR_KEYMAP.strike,
      spell: options.keyMap?.spell ?? DEFAULT_EMULATOR_KEYMAP.spell,
      hold: options.keyMap?.hold ?? DEFAULT_EMULATOR_KEYMAP.hold
    };
    this.speedMin = options.moveSpeed?.min ?? 0.3;
    this.speedMax = options.moveSpeed?.max ?? 1.5;
    this.rampSeconds = options.moveSpeed?.rampSeconds ?? 0.5;
    this.moveLimit = options.moveLimit ?? 0.8;
    this.workspaceLimit = options.workspaceLimit ?? 1.2;
    this.targetSpeed = options.targetSpeed ?? 2.5;
    if (typeof window === "undefined") return;
    this.installFrameHooks();
    this.forceIwerHandMode();
    this.resolveIwerDevice();
    this.createUI();
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", this.onBlur);
    this.pollTimer = setInterval(() => this.poll(), 250);
    this.poll();
  }
  // ---- public API ---------------------------------------------------------
  get leftPose() {
    return this.currentPose.left;
  }
  get rightPose() {
    return this.currentPose.right;
  }
  get isVisible() {
    return this.visible;
  }
  /**
   * Apply a static pose (sticky) to one or both hands and report it through hooks.onPose.
   * Accepts an EmulatorPose name or a gesture name from the gesture map ('open' -> open_palm, 'gun' -> finger_gun).
   */
  setPose(poseName, target = "both") {
    const pose = this.resolvePose(poseName);
    if (!pose) {
      console.warn(`[HaathEmu] setPose: unknown pose '${poseName}'`);
      return;
    }
    for (const h of this.handsOf(target)) {
      this.currentPose[h] = pose;
      this.strikeRestore[h] = null;
    }
    this.applyVisualPose(target, pose);
    const gesture = this.gestureMap[pose] ?? "idle";
    const fingers = EMULATOR_FINGER_COUNT[pose] ?? 0;
    this.log(`pose=${pose} gesture=${gesture} fingers=${fingers} target=${target}`);
    this.hooks.onPose?.(target, pose, gesture, fingers);
    this.refreshPanels();
  }
  /** Visual reset of both hands to open palm. Fires hooks.onResetToOpen, not onPose. */
  resetToOpenPalm() {
    this.currentPose.left = "open_palm";
    this.currentPose.right = "open_palm";
    this.strikeRestore = { left: null, right: null };
    this.heldPoseKeys.clear();
    this.applyVisualPose("both", "open_palm");
    this.hooks.onResetToOpen?.();
    this.refreshPanels();
  }
  applyAnimDelta(hand, dx, dy, dz) {
    const handle = this.getDevUiHandle(hand);
    if (handle?.position) {
      handle.position.x += dx;
      handle.position.y += dy;
      handle.position.z += dz;
      return true;
    }
    const pos = this.getIwerHand(hand)?.position;
    if (pos) {
      pos.x += dx;
      pos.y += dy;
      pos.z += dz;
      return true;
    }
    return false;
  }
  setAnimOffset(hand, x, y, z) {
    const prev = this.appliedAnimOffset[hand];
    const dx = x - prev[0];
    const dy = y - prev[1];
    const dz = z - prev[2];
    const movedHandle = this.applyAnimDelta(hand, dx, dy, dz);
    prev[0] = x;
    prev[1] = y;
    prev[2] = z;
    this.animOffset[hand] = movedHandle ? null : [x, y, z];
    this.refreshReadouts();
  }
  clearAnimOffset(hand) {
    const prev = this.appliedAnimOffset[hand];
    if (prev[0] !== 0 || prev[1] !== 0 || prev[2] !== 0) {
      this.applyAnimDelta(hand, -prev[0], -prev[1], -prev[2]);
      prev[0] = 0;
      prev[1] = 0;
      prev[2] = 0;
    }
    this.animOffset[hand] = null;
    this.refreshReadouts();
  }
  triggerStrike(kind, hand = "right") {
    const inward = hand === "left" ? 1 : -1;
    const cfg = kind === "punch" ? { pose: STRIKE_POSE.punch, vel: [0, 0, -3.8], ms: 400, x: 0, z: -0.38 } : kind === "slap" ? { pose: STRIKE_POSE.slap, vel: [inward * 3, 0, -1.8], ms: 380, x: inward * 0.25, z: -0.32 } : { pose: STRIKE_POSE.poke, vel: [0, 0, -3.2], ms: 320, x: 0, z: -0.35 };
    const { restore, token } = this.beginStrikePose(hand, cfg.pose);
    this.log(`strike=${kind} hand=${hand}`);
    this.hooks.onStrike?.(hand, kind, cfg.vel);
    this.animate(cfg.ms, token, hand, (t) => {
      const s = Math.sin(t * Math.PI);
      this.setAnimOffset(hand, cfg.x * s, 0, cfg.z * s);
    }, () => {
      this.clearAnimOffset(hand);
      this.endStrikePose(hand, restore);
    });
  }
  // Shared strike pose bookkeeping (triggerStrike and strike): switch to the strike pose, remember the
  // pose to return to, and take a new strike token so any running animation on this hand is superseded.
  beginStrikePose(hand, pose) {
    const restore = this.restorePoseFor(hand);
    this.clearAnimOffset(hand);
    this.strikeRestore[hand] = restore;
    const token = ++this.strikeToken[hand];
    this.currentPose[hand] = pose;
    this.applyVisualPose(hand, pose);
    this.refreshPanels();
    return { restore, token };
  }
  endStrikePose(hand, restore) {
    const resetPose = this.strikeRestore[hand] ?? restore;
    this.strikeRestore[hand] = null;
    this.currentPose[hand] = resetPose;
    this.applyVisualPose(hand, resetPose);
    this.hooks.onStrikeEnd?.(hand, this.gestureMap[resetPose] ?? "idle");
    this.refreshPanels();
  }
  triggerClap() {
    this.log("clap");
    this.hooks.onClap?.();
    this.clearAnimOffset("left");
    this.clearAnimOffset("right");
    this.animate(450, null, null, (t) => {
      const dx = Math.abs(Math.sin(t * Math.PI * 2)) * 0.14;
      this.setAnimOffset("left", dx, 0, 0);
      this.setAnimOffset("right", -dx, 0, 0);
    }, () => {
      this.clearAnimOffset("left");
      this.clearAnimOffset("right");
    });
  }
  triggerCircle(hand = "right") {
    const restore = this.restorePoseFor(hand);
    this.clearAnimOffset(hand);
    this.strikeRestore[hand] = restore;
    const token = ++this.strikeToken[hand];
    this.currentPose[hand] = "ok_sign";
    this.applyVisualPose(hand, "ok_sign");
    this.refreshPanels();
    this.log(`circle hand=${hand}`);
    this.hooks.onCircleStart?.(hand);
    const radius = 0.16;
    this.animate(520, token, hand, (t) => {
      const a = t * Math.PI * 2;
      const thrustZ = -0.28 * Math.sin(t * Math.PI);
      this.setAnimOffset(hand, Math.cos(a) * radius - radius, Math.sin(a) * radius, thrustZ);
    }, () => {
      this.clearAnimOffset(hand);
      const resetPose = this.strikeRestore[hand] ?? restore;
      this.strikeRestore[hand] = null;
      this.currentPose[hand] = resetPose;
      this.applyVisualPose(hand, resetPose);
      this.hooks.onCircle?.(hand, this.gestureMap[resetPose] ?? "idle");
      this.refreshPanels();
    });
  }
  triggerTriangle(hand = "right") {
    const restoreL = this.restorePoseFor("left");
    const restoreR = this.restorePoseFor("right");
    this.clearAnimOffset("left");
    this.clearAnimOffset("right");
    this.strikeRestore.left = restoreL;
    this.strikeRestore.right = restoreR;
    const token = ++this.strikeToken[hand];
    this.strikeToken.left = token;
    this.strikeToken.right = token;
    this.currentPose.left = "asl_l";
    this.currentPose.right = "asl_l";
    this.applyVisualPose("both", "asl_l");
    this.refreshPanels();
    this.log(`triangle hand=${hand}`);
    this.hooks.onTriangleStart?.(hand);
    const side = 0.14;
    this.animate(650, token, hand, (t) => {
      const thrustZ = -0.32 * Math.sin(t * Math.PI);
      const convergeX = 0.11 * Math.sin(t * Math.PI);
      let tx = 0, ty = 0;
      if (t < 0.33) {
        const u = t / 0.33;
        tx = -0.5 * side * u;
        ty = side * (1 - u) - 0.5 * side * u;
      } else if (t < 0.66) {
        const u = (t - 0.33) / 0.33;
        tx = -0.5 * side + side * u;
        ty = -0.5 * side;
      } else {
        const u = (t - 0.66) / 0.34;
        tx = 0.5 * side * (1 - u);
        ty = -0.5 * side * (1 - u) + side * u;
      }
      this.setAnimOffset("left", convergeX + tx * 0.5, ty * 0.5, thrustZ);
      this.setAnimOffset("right", -convergeX + tx * 0.5, ty * 0.5, thrustZ);
    }, () => {
      this.clearAnimOffset("left");
      this.clearAnimOffset("right");
      const resetL = this.strikeRestore.left ?? restoreL;
      const resetR = this.strikeRestore.right ?? restoreR;
      this.strikeRestore.left = null;
      this.strikeRestore.right = null;
      this.currentPose.left = resetL;
      this.currentPose.right = resetR;
      this.applyVisualPose("left", resetL);
      this.applyVisualPose("right", resetR);
      this.hooks.onTriangle?.(hand, this.gestureMap[resetR] ?? "idle");
      this.refreshPanels();
    });
  }
  /** Move a hand in the headset view plane by (dx, dy) metres. */
  moveHand(hand, dx, dy) {
    const handle = this.getDevUiHandle(hand);
    const lim = this.moveLimit;
    if (handle) {
      const home2 = handle.userData?.defaultPosition;
      const hx = home2?.[0] ?? 0, hy = home2?.[1] ?? 0;
      handle.position.x = Math.max(hx - lim, Math.min(hx + lim, handle.position.x + dx));
      handle.position.y = Math.max(hy - lim, Math.min(hy + lim, handle.position.y + dy));
      return;
    }
    const input = this.getIwerHand(hand);
    const pos = input?.position;
    if (!pos) return;
    if (!this.fallbackHome[hand]) this.fallbackHome[hand] = [pos.x, pos.y, pos.z];
    const home = this.fallbackHome[hand];
    const dq = this.device?.quaternion;
    const yaw = dq ? quatYaw([dq.x, dq.y, dq.z, dq.w]) : 0;
    const clampTo = (v, c) => Math.max(c - lim, Math.min(c + lim, v));
    pos.x = clampTo(pos.x + dx * Math.cos(yaw), home[0]);
    pos.z = clampTo(pos.z - dx * Math.sin(yaw), home[2]);
    pos.y = clampTo(pos.y + dy, home[1]);
  }
  /** Return a hand to its default position. */
  resetHandPosition(hand) {
    const handle = this.getDevUiHandle(hand);
    const home = handle?.userData?.defaultPosition;
    if (handle && home) {
      handle.position.x = home[0];
      handle.position.y = home[1];
      handle.position.z = home[2];
    } else {
      const pos = this.getIwerHand(hand)?.position;
      const fb = this.fallbackHome[hand];
      if (pos && fb) {
        pos.x = fb[0];
        pos.y = fb[1];
        pos.z = fb[2];
      }
    }
    this.refreshReadouts();
  }
  // ---- programmatic API (simulated players) ------------------------------
  //
  // Coordinates are the XR reference space (IWER global space, which is also 'local-floor'), metres,
  // -Z forward. Positions are WRIST joint positions. Everything here moves the real IWER input pose
  // (through the DevUI transform handle when DevUI owns the hands, else the IWER input directly), so
  // every XR hand joint follows and rendering / collisions see the motion. Works with the panel hidden.
  /** Smoothly move a hand's wrist toward an absolute reference-space position at speed m/s (default 2.5). */
  setHandTarget(hand, position, opts) {
    const p = [Number(position?.[0]) || 0, Number(position?.[1]) || 0, Number(position?.[2]) || 0];
    const home = this.homeWrist(hand);
    if (home) {
      const dx = p[0] - home[0], dy = p[1] - home[1], dz = p[2] - home[2];
      const len = Math.hypot(dx, dy, dz);
      if (len > this.workspaceLimit) {
        const k = this.workspaceLimit / len;
        p[0] = home[0] + dx * k;
        p[1] = home[1] + dy * k;
        p[2] = home[2] + dz * k;
      }
    }
    const speed = opts?.speed != null && opts.speed > 0 ? opts.speed : this.targetSpeed;
    this.simTarget[hand] = { pos: p, speed };
    this.startSimLoop();
  }
  /** Current wrist position in reference space (last known value if the hand is not available yet). */
  getHandPosition(hand) {
    const w = this.readWrist(hand) ?? this.lastWrist[hand];
    return w ? [w[0], w[1], w[2]] : [0, 0, 0];
  }
  /** True while a hand is travelling to its target or playing a programmatic strike. */
  isHandMoving(hand) {
    return this.simTarget[hand] != null || this.simStrike[hand] != null;
  }
  /** Smoothly return a hand to its default guard position (cancels a running programmatic strike). */
  resetHand(hand) {
    this.finishSimStrike(hand, false);
    const home = this.homeWrist(hand);
    if (home) {
      this.simTarget[hand] = { pos: home, speed: this.targetSpeed };
      this.startSimLoop();
    } else {
      this.simTarget[hand] = null;
      this.resetHandPosition(hand);
    }
  }
  /**
   * Strike with a real hand motion: wind-up, constant-speed thrust along direction (default -Z), short hold,
   * recover to the start position. Fires hooks.onStrike / hooks.onStrikeEnd exactly like triggerStrike.
   */
  strike(hand, kind, direction) {
    const motion = STRIKE_MOTION[kind] ?? STRIKE_MOTION.punch;
    const base = this.readWrist(hand) ?? this.lastWrist[hand];
    let dx = Number(direction?.[0]) || 0, dy = Number(direction?.[1]) || 0, dz = Number(direction?.[2]) || 0;
    let len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) {
      dx = 0;
      dy = 0;
      dz = -1;
      len = 1;
    }
    const dir = [dx / len, dy / len, dz / len];
    const inward = hand === "left" ? 1 : -1;
    let lx = -dir[2], lz = dir[0];
    const ll = Math.hypot(lx, lz);
    if (ll < 1e-6) {
      lx = 1;
      lz = 0;
    } else {
      lx /= ll;
      lz /= ll;
    }
    const lateral = [lx * inward, 0, lz * inward];
    this.finishSimStrike(hand, true);
    this.simTarget[hand] = null;
    const { restore, token } = this.beginStrikePose(hand, STRIKE_POSE[kind]);
    const vel = [
      dir[0] * motion.speed + lateral[0] * motion.sweep * 10,
      dir[1] * motion.speed,
      dir[2] * motion.speed + lateral[2] * motion.sweep * 10
    ];
    this.log(`sim strike=${kind} hand=${hand} dir=${dir.map((v) => v.toFixed(2)).join(",")}`);
    this.hooks.onStrike?.(hand, kind, vel);
    if (!base) {
      setTimeout(() => {
        if (this.destroyed || token !== this.strikeToken[hand]) return;
        this.endStrikePose(hand, restore);
      }, STRIKE_WINDUP_MS + STRIKE_HOLD_MS + 120);
      return;
    }
    this.simStrike[hand] = {
      kind,
      token,
      restore,
      base,
      dir,
      lateral,
      t0: performance.now(),
      windup: motion.windup,
      reach: motion.reach,
      thrustMs: (motion.windup + motion.reach) / motion.speed * 1e3
    };
    this.startSimLoop();
  }
  /** Trace the circle spell gesture with one hand. */
  circle(hand = "right") {
    this.finishSimStrike(hand, true);
    this.simTarget[hand] = null;
    this.triggerCircle(hand);
  }
  /** Form the two-hand triangle spell gesture. */
  triangle(hand = "right") {
    for (const h of ["left", "right"]) {
      this.finishSimStrike(h, true);
      this.simTarget[h] = null;
    }
    this.triggerTriangle(hand);
  }
  // ---- programmatic API internals ----------------------------------------
  resolvePose(name) {
    if (EMULATOR_POSES.includes(name)) return name;
    return EMULATOR_POSES.find((p) => this.gestureMap[p] === name) ?? null;
  }
  // End a running programmatic strike: snap back to its base, restore the pose and fire onStrikeEnd.
  finishSimStrike(hand, snapBack) {
    const st = this.simStrike[hand];
    if (!st) return;
    this.simStrike[hand] = null;
    if (st.token !== this.strikeToken[hand]) return;
    if (snapBack) this.writeWrist(hand, st.base);
    this.endStrikePose(hand, st.restore);
  }
  startSimLoop() {
    if (this.simRaf != null || this.destroyed || typeof requestAnimationFrame === "undefined") return;
    this.simLast = performance.now();
    const tick = (now) => {
      this.simRaf = null;
      if (this.destroyed) return;
      const dt = Math.min(Math.max((now - this.simLast) / 1e3, 0), 0.05);
      this.simLast = now;
      if (!this.device?.hands) this.resolveIwerDevice();
      let busy = false;
      for (const hand of ["left", "right"]) busy = this.stepSimHand(hand, now, dt) || busy;
      this.refreshReadouts();
      if (busy) this.simRaf = requestAnimationFrame(tick);
    };
    this.simRaf = requestAnimationFrame(tick);
  }
  // One frame of programmatic motion for a hand. Returns true while there is still work to do.
  stepSimHand(hand, now, dt) {
    const st = this.simStrike[hand];
    if (st) {
      if (st.token !== this.strikeToken[hand]) {
        this.simStrike[hand] = null;
      } else {
        const e = now - st.t0;
        const tThrust = STRIKE_WINDUP_MS + st.thrustMs;
        const tHold = tThrust + STRIKE_HOLD_MS;
        const tEnd = tHold + STRIKE_RECOVER_MS;
        if (e >= tEnd) {
          this.writeWrist(hand, st.base);
          this.simStrike[hand] = null;
          this.endStrikePose(hand, st.restore);
          return this.simTarget[hand] != null;
        }
        let d;
        let lat = 0;
        if (e < STRIKE_WINDUP_MS) {
          d = -st.windup * smoothstep(e / STRIKE_WINDUP_MS);
        } else if (e < tThrust) {
          const u = (e - STRIKE_WINDUP_MS) / st.thrustMs;
          d = -st.windup + (st.windup + st.reach) * u;
          lat = Math.sin(u * Math.PI) * (STRIKE_MOTION[st.kind]?.sweep ?? 0);
        } else if (e < tHold) {
          d = st.reach;
        } else {
          d = st.reach * (1 - smoothstep((e - tHold) / STRIKE_RECOVER_MS));
        }
        const b = st.base, dir = st.dir, l = st.lateral;
        this.writeWrist(hand, [
          b[0] + dir[0] * d + l[0] * lat,
          b[1] + dir[1] * d + l[1] * lat,
          b[2] + dir[2] * d + l[2] * lat
        ]);
        return true;
      }
    }
    const tg = this.simTarget[hand];
    if (!tg) return false;
    const cur = this.readWrist(hand);
    if (!cur) return true;
    const dx = tg.pos[0] - cur[0], dy = tg.pos[1] - cur[1], dz = tg.pos[2] - cur[2];
    const dist = Math.hypot(dx, dy, dz);
    const step = tg.speed * dt;
    if (dist <= step || dist < 1e-4) {
      this.writeWrist(hand, tg.pos);
      this.simTarget[hand] = null;
      return false;
    }
    const k = step / dist;
    this.writeWrist(hand, [cur[0] + dx * k, cur[1] + dy * k, cur[2] + dz * k]);
    return true;
  }
  // Input (target ray) pose in reference space: DevUI handle world transform if DevUI drives the hands
  // (DevUI copies handle -> IWER input every frame), else the IWER input itself.
  readInputPose(hand) {
    const handle = this.getDevUiHandle(hand);
    if (handle && typeof handle.getWorldPosition === "function" && typeof handle.getWorldQuaternion === "function") {
      if (!this.scratchVec) this.scratchVec = handle.position.clone();
      if (!this.scratchQuat) this.scratchQuat = handle.quaternion.clone();
      const v = handle.getWorldPosition(this.scratchVec);
      const q2 = handle.getWorldQuaternion(this.scratchQuat);
      return { pos: [v.x, v.y, v.z], quat: [q2.x, q2.y, q2.z, q2.w] };
    }
    const input = this.getIwerHand(hand);
    const p = input?.position, q = input?.quaternion;
    if (!p) return null;
    return { pos: [p.x, p.y, p.z], quat: q ? [q.x, q.y, q.z, q.w] : [0, 0, 0, 1] };
  }
  writeInputPosition(hand, x, y, z) {
    const handle = this.getDevUiHandle(hand);
    const parent = handle?.parent;
    if (handle && parent && typeof parent.worldToLocal === "function") {
      if (!this.scratchVec) this.scratchVec = handle.position.clone();
      parent.updateWorldMatrix?.(true, false);
      const v = parent.worldToLocal(this.scratchVec.set(x, y, z));
      handle.position.copy(v);
      return true;
    }
    const pos = this.getIwerHand(hand)?.position;
    if (!pos) return false;
    if (!this.fallbackHome[hand]) this.fallbackHome[hand] = [pos.x, pos.y, pos.z];
    pos.x = x;
    pos.y = y;
    pos.z = z;
    return true;
  }
  // Wrist joint offset from the input pose, rotated into reference space. Excludes the joint-level
  // animation offset used when DevUI is absent, so it describes the hand's resting wrist.
  wristOffset(hand, quat) {
    const out = this._v;
    out[0] = out[1] = out[2] = 0;
    const m = getJointMatrix(getJoint(this.getIwerHand(hand)?.inputSource?.hand ?? {}, "wrist"));
    if (!m) return out;
    const off = this.animOffset[hand];
    out[0] = m[12] - (off?.[0] ?? 0);
    out[1] = m[13] - (off?.[1] ?? 0);
    out[2] = m[14] - (off?.[2] ?? 0);
    this._q[0] = quat[0];
    this._q[1] = quat[1];
    this._q[2] = quat[2];
    this._q[3] = quat[3];
    return quatRotateVec3(out, this._q, out);
  }
  readWrist(hand) {
    const pose = this.readInputPose(hand);
    if (!pose) return null;
    const o = this.wristOffset(hand, pose.quat);
    const w = [pose.pos[0] + o[0], pose.pos[1] + o[1], pose.pos[2] + o[2]];
    this.lastWrist[hand] = w;
    return w;
  }
  writeWrist(hand, w) {
    const pose = this.readInputPose(hand);
    if (!pose) return;
    const o = this.wristOffset(hand, pose.quat);
    if (this.writeInputPosition(hand, w[0] - o[0], w[1] - o[1], w[2] - o[2])) {
      this.lastWrist[hand] = [w[0], w[1], w[2]];
    }
  }
  // Default (guard) wrist position in reference space. DevUI: the handle's default, headset-relative,
  // so it follows the headset. Fallback: the input position first seen by the emulator.
  homeWrist(hand) {
    const pose = this.readInputPose(hand);
    if (!pose) return null;
    let hx, hy, hz;
    const handle = this.getDevUiHandle(hand);
    const def = handle?.userData?.defaultPosition;
    if (handle && def && handle.parent && typeof handle.parent.localToWorld === "function") {
      if (!this.scratchVec) this.scratchVec = handle.position.clone();
      handle.parent.updateWorldMatrix?.(true, false);
      const v = handle.parent.localToWorld(this.scratchVec.set(def[0], def[1], def[2]));
      hx = v.x;
      hy = v.y;
      hz = v.z;
    } else {
      const pos = this.getIwerHand(hand)?.position;
      if (pos && !this.fallbackHome[hand]) this.fallbackHome[hand] = [pos.x, pos.y, pos.z];
      const fb = this.fallbackHome[hand];
      if (!fb) return null;
      [hx, hy, hz] = fb;
    }
    const o = this.wristOffset(hand, pose.quat);
    return [hx + o[0], hy + o[1], hz + o[2]];
  }
  destroy() {
    this.destroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.onKeyDown, true);
      window.removeEventListener("keyup", this.onKeyUp, true);
      window.removeEventListener("blur", this.onBlur);
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.layoutTimer) clearInterval(this.layoutTimer);
    if (this.moveRaf != null) cancelAnimationFrame(this.moveRaf);
    if (this.simRaf != null) cancelAnimationFrame(this.simRaf);
    this.pollTimer = this.layoutTimer = null;
    this.moveRaf = null;
    this.simRaf = null;
    this.session?.removeEventListener?.("inputsourceschange", this.onInputSourcesChange);
    this.root?.remove();
    this.root = null;
  }
  // ---- session / visibility ------------------------------------------------
  poll() {
    if (this.destroyed) return;
    const session = this.opts.getSession() ?? null;
    if (session !== this.session) {
      this.session?.removeEventListener?.("inputsourceschange", this.onInputSourcesChange);
      this.session = session;
      if (session) {
        session.addEventListener("inputsourceschange", this.onInputSourcesChange);
        this.onSessionInputsChanged();
        [50, 200, 500, 1200].forEach((d) => setTimeout(() => !this.destroyed && this.forceIwerHandMode(), d));
      }
    }
    if (!this.device?.hands) this.resolveIwerDevice();
    this.updateVisibility();
  }
  onSessionInputsChanged() {
    this.forceIwerHandMode();
    this.resolveIwerDevice();
    this.applyVisualPose("left", this.currentPose.left);
    this.applyVisualPose("right", this.currentPose.right);
    this.updateVisibility();
  }
  updateVisibility() {
    const s = this.session;
    const hasHand = !!s && Array.from(s.inputSources ?? []).some((src) => src.hand != null);
    if (hasHand === this.visible) return;
    this.visible = hasHand;
    if (this.root) this.root.style.display = hasHand ? "block" : "none";
    if (hasHand) {
      this.layoutPanels();
      this.refreshReadouts();
    } else {
      if (this.layoutTimer) clearInterval(this.layoutTimer);
      this.layoutTimer = null;
      this.releaseAllInput();
    }
  }
  // ---- IWER plumbing ------------------------------------------------------
  installFrameHooks() {
    const w = window;
    if (w.__haath_frame_hooks_installed || typeof w.XRFrame === "undefined") return;
    w.__haath_frame_hooks_installed = true;
    const proto = w.XRFrame.prototype;
    const self = this;
    let early = 0;
    for (const name of ["getJointPose", "fillPoses"]) {
      const orig = proto[name];
      if (!orig) continue;
      proto[name] = function() {
        if (early < 15) {
          early++;
          self.forceIwerHandMode();
        }
        if (!self.device?.hands) self.resolveIwerDevice();
        return orig.apply(this, arguments);
      };
    }
  }
  forceIwerHandMode(device) {
    const w = window;
    const dev = device || this.device || w.xrDevice || w.device || w.__iwer_device__;
    if (dev) {
      try {
        if ("primaryInputMode" in dev && dev.primaryInputMode !== "hand") dev.primaryInputMode = "hand";
        if (typeof dev.setInputMode === "function") dev.setInputMode("hand");
      } catch {
      }
    }
    this.syncDevUiInputMode(dev);
  }
  // Keeps the DevUI input-mode menu showing "hand" so its panels match the emulated input.
  syncDevUiInputMode(dev) {
    if (this.isSyncingDevUi || typeof document === "undefined") return;
    try {
      let shadow = findDevUi(dev)?.devUIContainer?.shadowRoot ?? null;
      if (!shadow) {
        document.querySelectorAll("*").forEach((el) => {
          if (el.shadowRoot?.querySelector('button[title="Select input mode"]')) shadow = el.shadowRoot;
        });
      }
      const trigger = shadow?.querySelector('button[title="Select input mode"]');
      if (!shadow || !trigger) return;
      if (trigger.querySelector('.lucide-hand, [data-lucide="hand"]')) return;
      const root = shadow;
      this.isSyncingDevUi = true;
      trigger.click();
      const clickHand = () => {
        root.querySelector("#iwer-input-mode-menu")?.querySelectorAll('button, [role="button"]').forEach((r) => {
          const text = (r.textContent || "").toLowerCase();
          if ((text.includes("hand") || text.includes("poke")) && r.getAttribute("aria-pressed") !== "true") {
            r.click();
          }
        });
      };
      clickHand();
      setTimeout(() => {
        try {
          clickHand();
        } finally {
          setTimeout(() => {
            try {
              if (trigger.getAttribute("aria-expanded") === "true" || root.querySelector("#iwer-input-mode-menu")) trigger.click();
            } finally {
              this.isSyncingDevUi = false;
            }
          }, 20);
        }
      }, 30);
    } catch {
      this.isSyncingDevUi = false;
    }
  }
  resolveIwerDevice() {
    const w = window;
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const pick = (val) => val?.device?.hands ? val.device : val?.hands ? val : null;
    let dev = [w.xrDevice, w.device, w.__iwer_device__].find((d) => d?.hands) ?? null;
    if (!dev && nav?.xr) {
      dev = pick(nav.xr[/* @__PURE__ */ Symbol.for("@iwer/native-override")]);
      if (!dev) for (const s of Object.getOwnPropertySymbols(nav.xr)) {
        dev = pick(nav.xr[s]);
        if (dev) break;
      }
    }
    const session = this.session;
    if (!dev && session) {
      for (const s of Object.getOwnPropertySymbols(session)) {
        dev = pick(session[s]);
        if (dev) break;
      }
      if (!dev && session.inputSources) {
        for (const src of session.inputSources) {
          if (!src?.hand) continue;
          for (const s of Object.getOwnPropertySymbols(src.hand)) {
            dev = pick(src.hand[s]);
            if (dev) break;
          }
          if (dev) break;
        }
      }
    }
    if (!dev) return null;
    if (dev !== this.device) {
      this.device = dev;
      w.xrDevice = w.xrDevice ?? dev;
      this.forceIwerHandMode(dev);
    }
    const l = this.getIwerHand("left"), r = this.getIwerHand("right");
    if (l) this.hookHandInput(l, "left");
    if (r) this.hookHandInput(r, "right");
    return dev;
  }
  getIwerHand(hand) {
    const hands = this.device?.hands || this.device?._hands;
    if (!hands) return null;
    return hands[hand] || (typeof hands.get === "function" ? hands.get(hand) : null);
  }
  getDevUiHandle(hand) {
    const layer = findDevUi(this.device)?.inputLayer;
    if (!layer || layer.isInProgrammaticMode) return null;
    const handle = layer.transformHandles?.get?.(hand);
    return handle?.position ? handle : null;
  }
  setPinch(handInput, val) {
    try {
      if (typeof handInput.setPinchValueImmediate === "function") handInput.setPinchValueImmediate(val);
      if ("pinchValue" in handInput) handInput.pinchValue = val;
    } catch {
    }
  }
  // Wraps IWER's per-frame updateHandPose: base pose stays IWER-safe, fingers are re-posed after.
  hookHandInput(handInput, handedness) {
    if (!handInput || handInput.__haath_hooked) return;
    const orig = handInput.updateHandPose;
    if (typeof orig !== "function") return;
    handInput.__haath_hooked = true;
    const snaps = {};
    const snap = (poseId, pinch) => {
      try {
        handInput.poseId = poseId;
        this.setPinch(handInput, pinch);
        orig.call(handInput);
        return captureWristLocalJoints(handInput) ?? void 0;
      } catch (e) {
        console.warn(`[HaathEmu] Error snapshotting ${poseId} pose:`, e);
        return void 0;
      }
    };
    snaps.default = snap("default", 0);
    snaps.point = snap("point", 0);
    snaps.pinch = snap("default", 1);
    if (snaps.default && snaps.point) snaps.fist = synthesizeCurledIndex(snaps.default, snaps.point);
    else if (snaps.point) snaps.fist = snaps.point;
    if (!snaps.pinch && snaps.fist) snaps.pinch = snaps.fist;
    if (snaps.fist) snaps.tuck = synthesizeTuckedThumb(snaps.fist);
    handInput.poseId = "default";
    this.setPinch(handInput, 0);
    try {
      orig.call(handInput);
    } catch {
    }
    const self = this;
    handInput.updateHandPose = function() {
      try {
        if (this.poseId !== "default" && this.poseId !== "point") this.poseId = "default";
        orig.call(this);
      } catch {
        try {
          this.poseId = "default";
          orig.call(this);
        } catch {
        }
      }
      try {
        applyPoseBlending(this, self.currentPose[handedness], snaps, handedness);
        const off = self.animOffset[handedness];
        const hand = this?.inputSource?.hand;
        if (off && hand) {
          for (const jName of ALL_JOINT_NAMES) {
            const m = getJointMatrix(getJoint(hand, jName));
            if (m) {
              m[12] += off[0];
              m[13] += off[1];
              m[14] += off[2];
            }
          }
        }
      } catch {
      }
    };
    this.log(`hooked IWER ${handedness} hand`);
  }
  applyVisualPose(target, pose) {
    if (!this.device?.hands) this.resolveIwerDevice();
    for (const h of this.handsOf(target)) {
      const input = this.getIwerHand(h);
      if (!input) continue;
      if (!input.__haath_hooked) this.hookHandInput(input, h);
      try {
        input.poseId = SAFE_IWER_BASE_POSE[pose] || "default";
        this.setPinch(input, SAFE_IWER_PINCH_VALUE[pose] ?? 0);
        input.updateHandPose?.();
      } catch (err) {
        console.warn("[HaathEmu] applyVisualPose failed, resetting to default:", err);
        try {
          input.poseId = "default";
          input.updateHandPose?.();
        } catch {
        }
      }
    }
  }
  // ---- input ------------------------------------------------------------
  handleKeyDown(e) {
    if (!this.visible || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    const code = e.code;
    if (this.keys.move[code]) {
      if (e.shiftKey) return;
      e.preventDefault();
      this.pressMove(code);
      return;
    }
    if (e.shiftKey) return;
    const strike = this.keys.strike[code];
    if (strike) {
      e.preventDefault();
      if (!e.repeat) this.triggerStrike(strike.kind, strike.hand);
      return;
    }
    const spell = this.keys.spell?.[code];
    if (spell) {
      e.preventDefault();
      if (!e.repeat) {
        if (spell.kind === "circle") this.triggerCircle(spell.hand);
        else this.triggerTriangle(spell.hand);
      }
      return;
    }
    const hold = this.keys.hold[code];
    if (hold) {
      e.preventDefault();
      if (e.repeat || this.heldPoseKeys.has(code)) return;
      this.heldPoseKeys.set(code, this.restorePoseFor(hold.hand));
      this.setPose(hold.pose, hold.hand);
    }
  }
  handleKeyUp(e) {
    if (this.keys.move[e.code]) {
      this.releaseMove(e.code);
      return;
    }
    if (this.heldPoseKeys.has(e.code)) this.releaseHoldKey(e.code);
  }
  releaseAllInput() {
    this.heldMoveKeys.clear();
    this.moveHoldStart.left = this.moveHoldStart.right = null;
    for (const code of Array.from(this.heldPoseKeys.keys())) this.releaseHoldKey(code);
  }
  releaseHoldKey(code) {
    const def = this.keys.hold[code];
    const prev = this.heldPoseKeys.get(code);
    this.heldPoseKeys.delete(code);
    if (!def || prev == null) return;
    const other = Array.from(this.heldPoseKeys.keys()).find((c) => this.keys.hold[c]?.hand === def.hand);
    if (other) {
      this.heldPoseKeys.set(other, prev);
      this.setPose(this.keys.hold[other].pose, def.hand);
      return;
    }
    this.setPose(prev, def.hand);
  }
  restorePoseFor(hand) {
    return this.strikeRestore[hand] ?? this.currentPose[hand];
  }
  pressMove(code) {
    const m = this.keys.move[code];
    if (!m || this.heldMoveKeys.has(code)) return;
    this.simTarget[m.hand] = null;
    this.heldMoveKeys.add(code);
    if (this.moveHoldStart[m.hand] == null) this.moveHoldStart[m.hand] = performance.now();
    this.startMoveLoop();
  }
  releaseMove(code) {
    const m = this.keys.move[code];
    this.heldMoveKeys.delete(code);
    if (m && !Array.from(this.heldMoveKeys).some((c) => this.keys.move[c]?.hand === m.hand)) {
      this.moveHoldStart[m.hand] = null;
    }
  }
  startMoveLoop() {
    if (this.moveRaf != null) return;
    this.moveLast = performance.now();
    const acc = { left: [0, 0], right: [0, 0] };
    const tick = (now) => {
      const dt = Math.min((now - this.moveLast) / 1e3, 0.05);
      this.moveLast = now;
      if (this.heldMoveKeys.size === 0 || this.destroyed) {
        this.moveRaf = null;
        return;
      }
      acc.left[0] = acc.left[1] = acc.right[0] = acc.right[1] = 0;
      this.heldMoveKeys.forEach((code) => {
        const m = this.keys.move[code];
        if (!m) return;
        acc[m.hand][0] += m.dx;
        acc[m.hand][1] += m.dy;
      });
      for (const hand of ["left", "right"]) {
        const [dx, dy] = acc[hand];
        const start = this.moveHoldStart[hand];
        if (!dx && !dy || start == null) continue;
        const ramp = smoothstep(Math.min((now - start) / 1e3 / this.rampSeconds, 1));
        const step = (this.speedMin + (this.speedMax - this.speedMin) * ramp) * dt;
        const len = Math.hypot(dx, dy) || 1;
        this.moveHand(hand, dx / len * step, dy / len * step);
      }
      this.refreshReadouts();
      this.moveRaf = requestAnimationFrame(tick);
    };
    this.moveRaf = requestAnimationFrame(tick);
  }
  animate(ms, token, hand, frame, done) {
    const start = performance.now();
    const step = (now) => {
      if (this.destroyed) return;
      if (hand && token != null && token !== this.strikeToken[hand]) return;
      const t = (now - start) / ms;
      if (t >= 1) {
        done();
        return;
      }
      frame(t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  handsOf(target) {
    return target === "both" ? ["left", "right"] : [target];
  }
  log(msg) {
    if (this.opts.debug) console.log(`[HaathEmu] ${msg}`);
  }
  // ---- UI -----------------------------------------------------------------
  keyFor(map, hand, match) {
    const code = Object.keys(map).find((k) => map[k].hand === hand && match(map[k]));
    return code ? keyLabel(code) : "";
  }
  makeButton(text, onClick, color, key) {
    const btn = document.createElement("button");
    btn.textContent = text;
    if (key) {
      const k = document.createElement("kbd");
      k.textContent = key;
      btn.appendChild(k);
    }
    if (color) {
      btn.classList.add("hge-strike");
      btn.style.background = color;
    }
    btn.onclick = (e) => {
      e.preventDefault();
      onClick();
      btn.blur();
    };
    return btn;
  }
  createUI() {
    if (typeof document === "undefined") return;
    document.getElementById("haath-hand-emulator")?.remove();
    const root = document.createElement("div");
    root.id = "haath-hand-emulator";
    root.className = "hge-root";
    root.style.display = "none";
    const style = document.createElement("style");
    style.textContent = STYLE;
    root.appendChild(style);
    const center = document.createElement("div");
    center.className = "hge-center";
    const title = document.createElement("span");
    title.textContent = "\u{1F590}\uFE0F Haath";
    title.style.cssText = "font-weight: 700; color: #f0c060;";
    center.appendChild(title);
    const mirror = this.makeButton("\u21C4 Mirror both", () => {
      this.mirrorBoth = !this.mirrorBoth;
      mirror.classList.toggle("hge-on", this.mirrorBoth);
    });
    mirror.title = "When on, pose chips in either panel apply to both hands";
    center.appendChild(mirror);
    center.appendChild(this.makeButton("\u{1F44F} Double Clap", () => this.triggerClap(), "#2563eb"));
    center.appendChild(this.makeButton("\u{1F504} Reset", () => {
      this.resetHandPosition("left");
      this.resetHandPosition("right");
      this.setPose("idle", "both");
    }, "#4b5563"));
    root.appendChild(center);
    root.appendChild(this.buildHandPanel("left"));
    root.appendChild(this.buildHandPanel("right"));
    document.body.appendChild(root);
    this.root = root;
    this.refreshPanels();
  }
  buildHandPanel(hand) {
    const panel = document.createElement("div");
    panel.className = "hge-panel";
    panel.style[hand === "left" ? "left" : "right"] = "12px";
    const moveCodes = Object.keys(this.keys.move).filter((c) => this.keys.move[c].hand === hand);
    const codeFor = (dx, dy) => moveCodes.find((c) => this.keys.move[c].dx === dx && this.keys.move[c].dy === dy);
    const head = document.createElement("div");
    head.className = "hge-head";
    const t = document.createElement("span");
    t.className = "hge-title";
    t.textContent = hand === "left" ? "\u270B Haath [L]" : "\u{1F91A} Haath [R]";
    head.appendChild(t);
    const hint = document.createElement("span");
    hint.className = "hge-sub";
    hint.textContent = "move: " + [codeFor(0, 1), codeFor(-1, 0), codeFor(0, -1), codeFor(1, 0)].filter(Boolean).map((c) => keyLabel(c)).join(" ");
    head.appendChild(hint);
    const collapse = this.makeButton("\u2013", () => {
      panel.classList.toggle("hge-collapsed");
      collapse.textContent = panel.classList.contains("hge-collapsed") ? "+" : "\u2013";
    });
    head.appendChild(collapse);
    panel.appendChild(head);
    const body = document.createElement("div");
    body.className = "hge-body";
    const section = (label) => {
      const l = document.createElement("div");
      l.className = "hge-sub";
      l.textContent = label;
      body.appendChild(l);
      const row = document.createElement("div");
      row.className = "hge-row";
      body.appendChild(row);
      return row;
    };
    const combat = section("Combat (tap key or click to strike forward)");
    const signs = section("Signs (hold key, or click to stick)");
    const poses = section("Poses");
    const holdPoses = Object.values(this.keys.hold).filter((v) => v.hand === hand).map((v) => v.pose);
    const sk = (kind) => this.keyFor(this.keys.strike, hand, (v) => v.kind === kind);
    const spellKey = (kind) => this.keys.spell ? this.keyFor(this.keys.spell, hand, (v) => v.kind === kind) : "";
    const poseToStrike = {
      punch: "punch",
      slap: "slap",
      point: "poke"
    };
    const order = [...COMBAT_POSES, ...EMULATOR_POSES.filter((p) => !COMBAT_POSES.includes(p))];
    for (const pose of order) {
      const isCombat = COMBAT_POSES.includes(pose);
      const isHold = holdPoses.includes(pose);
      const strikeKind = poseToStrike[pose];
      const btn = this.makeButton(
        isCombat ? COMBAT_LABELS[pose] ?? EMULATOR_POSE_LABELS[pose] : EMULATOR_POSE_LABELS[pose],
        () => {
          if (strikeKind) {
            this.triggerStrike(strikeKind, hand);
          } else {
            this.togglePose(pose, hand);
          }
        },
        isCombat ? "#dc2626" : void 0,
        strikeKind ? sk(strikeKind) : isHold ? this.keyFor(this.keys.hold, hand, (v) => v.pose === pose) : void 0
      );
      btn.dataset.pose = pose;
      (isCombat ? combat : isHold ? signs : poses).appendChild(btn);
    }
    combat.appendChild(this.makeButton("\u{1F300} Circle", () => this.triggerCircle(hand), "#059669", spellKey("circle")));
    combat.appendChild(this.makeButton("\u{1F53A} Triangle", () => this.triggerTriangle(hand), "#d97706", spellKey("triangle")));
    const moveRow = document.createElement("div");
    moveRow.className = "hge-row";
    moveRow.style.gap = "10px";
    const pad = document.createElement("div");
    pad.className = "hge-pad";
    const cells = [
      ["", void 0],
      ["\u25B2", codeFor(0, 1)],
      ["", void 0],
      ["\u25C0", codeFor(-1, 0)],
      ["\u27F2", "reset"],
      ["\u25B6", codeFor(1, 0)],
      ["", void 0],
      ["\u25BC", codeFor(0, -1)],
      ["", void 0]
    ];
    for (const [glyph, code] of cells) {
      if (!code) {
        pad.appendChild(document.createElement("span"));
        continue;
      }
      const b = document.createElement("button");
      b.textContent = glyph;
      if (code === "reset") {
        b.title = "Reset hand position";
        b.onclick = () => this.resetHandPosition(hand);
      } else {
        b.title = `Hold to move (${keyLabel(code)})`;
        const stop = () => this.releaseMove(code);
        b.onpointerdown = (e) => {
          e.preventDefault();
          this.pressMove(code);
        };
        b.onpointerup = stop;
        b.onpointerleave = stop;
        b.onpointercancel = stop;
      }
      pad.appendChild(b);
    }
    moveRow.appendChild(pad);
    const readout = document.createElement("div");
    readout.className = "hge-readout";
    readout.dataset.readout = hand;
    moveRow.appendChild(readout);
    body.appendChild(moveRow);
    panel.appendChild(body);
    this.panels[hand] = panel;
    return panel;
  }
  togglePose(pose, hand) {
    const target = this.mirrorBoth ? "both" : hand;
    const cur = this.currentPose[hand];
    this.setPose(cur === pose && pose !== "open_palm" ? "open_palm" : pose, target);
  }
  refreshPanels() {
    for (const hand of ["left", "right"]) {
      this.panels[hand]?.querySelectorAll("button[data-pose]").forEach((b) => {
        b.classList.toggle("hge-on", b.dataset.pose === this.currentPose[hand]);
      });
    }
    this.refreshReadouts();
  }
  refreshReadouts() {
    for (const hand of ["left", "right"]) {
      const el = this.panels[hand]?.querySelector("[data-readout]");
      if (!el) continue;
      const handle = this.getDevUiHandle(hand);
      const p = handle?.position ?? this.getIwerHand(hand)?.position;
      const f = (v) => v == null ? "  -  " : `${v >= 0 ? " " : ""}${v.toFixed(2)}`;
      el.textContent = `x ${f(p?.x)}
y ${f(p?.y)}
z ${f(p?.z)}
${this.currentPose[hand]}`;
    }
  }
  // Pin the panels to the top corners. The emulated hands render in the middle and lower part of the
  // view, and IWER DevUI keeps its own hand panels in the bottom corners, so the top is the only space
  // that covers neither. Height is capped so a tall panel scrolls instead of reaching the hands.
  layoutPanels() {
    for (const hand of ["left", "right"]) {
      const panel = this.panels[hand];
      if (!panel) continue;
      panel.style.top = "12px";
      panel.style.bottom = "auto";
      panel.style.maxHeight = "min(46vh, calc(100vh - 160px))";
      panel.style.overflowY = "auto";
    }
  }
};
function createHandEmulator(options) {
  return new HandEmulator(options);
}

export { DEFAULT_EMULATOR_GESTURE_MAP, DEFAULT_EMULATOR_KEYMAP, EMULATOR_FINGER_COUNT, EMULATOR_POSES, EMULATOR_POSE_LABELS, HandEmulator, createHandEmulator };
//# sourceMappingURL=emulator.js.map
//# sourceMappingURL=emulator.js.map