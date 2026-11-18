// Zero-dependency 4x4 matrix + quaternion helpers (column-major, WebXR / gl-matrix layout).
// Used by the PC hand emulator to blend joint transforms without three.js.
// All functions write into caller-supplied outputs; nothing here allocates.

export type Mat4 = number[] | Float32Array;
/** Quaternion as [x, y, z, w]. */
export type Quat4 = number[] | Float32Array;
export type V3 = number[] | Float32Array;

export function mat4Copy(out: Mat4, a: ArrayLike<number>): Mat4 {
  for (let i = 0; i < 16; i++) out[i] = a[i];
  return out;
}

// out = a * b
export function mat4Multiply(out: Mat4, a: ArrayLike<number>, b: ArrayLike<number>): Mat4 {
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

// out = inverse(a). Returns null when a is singular (out is left untouched).
export function mat4Invert(out: Mat4, a: ArrayLike<number>): Mat4 | null {
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
  det = 1.0 / det;
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

// out = rotation about Z by rad
export function mat4FromRotationZ(out: Mat4, rad: number): Mat4 {
  const s = Math.sin(rad), c = Math.cos(rad);
  for (let i = 0; i < 16; i++) out[i] = 0;
  out[0] = c; out[1] = s; out[4] = -s; out[5] = c; out[10] = 1; out[15] = 1;
  return out;
}

// Splits a TRS matrix into position, rotation quaternion, and scale.
export function mat4Decompose(m: ArrayLike<number>, pos: V3, quat: Quat4, scale: V3): void {
  let sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  // Negative determinant means one axis is mirrored (IWER mirrors right-hand joints).
  const det =
    m[0] * (m[5] * m[10] - m[9] * m[6]) -
    m[4] * (m[1] * m[10] - m[9] * m[2]) +
    m[8] * (m[1] * m[6] - m[5] * m[2]);
  if (det < 0) sx = -sx;
  pos[0] = m[12]; pos[1] = m[13]; pos[2] = m[14];
  scale[0] = sx; scale[1] = sy; scale[2] = sz;

  const isx = sx ? 1 / sx : 0, isy = sy ? 1 / sy : 0, isz = sz ? 1 / sz : 0;
  const m11 = m[0] * isx, m12 = m[4] * isy, m13 = m[8] * isz;
  const m21 = m[1] * isx, m22 = m[5] * isy, m23 = m[9] * isz;
  const m31 = m[2] * isx, m32 = m[6] * isy, m33 = m[10] * isz;
  const trace = m11 + m22 + m33;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    quat[3] = 0.25 / s;
    quat[0] = (m32 - m23) * s;
    quat[1] = (m13 - m31) * s;
    quat[2] = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
    quat[3] = (m32 - m23) / s;
    quat[0] = 0.25 * s;
    quat[1] = (m12 + m21) / s;
    quat[2] = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
    quat[3] = (m13 - m31) / s;
    quat[0] = (m12 + m21) / s;
    quat[1] = 0.25 * s;
    quat[2] = (m23 + m32) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
    quat[3] = (m21 - m12) / s;
    quat[0] = (m13 + m31) / s;
    quat[1] = (m23 + m32) / s;
    quat[2] = 0.25 * s;
  }
}

// out = T * R * S
export function mat4Compose(out: Mat4, pos: ArrayLike<number>, quat: ArrayLike<number>, scale: ArrayLike<number>): Mat4 {
  const x = quat[0], y = quat[1], z = quat[2], w = quat[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const sx = scale[0], sy = scale[1], sz = scale[2];
  out[0] = (1 - (yy + zz)) * sx; out[1] = (xy + wz) * sx; out[2] = (xz - wy) * sx; out[3] = 0;
  out[4] = (xy - wz) * sy; out[5] = (1 - (xx + zz)) * sy; out[6] = (yz + wx) * sy; out[7] = 0;
  out[8] = (xz + wy) * sz; out[9] = (yz - wx) * sz; out[10] = (1 - (xx + yy)) * sz; out[11] = 0;
  out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
  return out;
}

// Shortest-arc spherical interpolation. out may alias a.
export function quatSlerp(out: Quat4, a: ArrayLike<number>, b: ArrayLike<number>, t: number): Quat4 {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let s0: number, s1: number;
  if (1.0 - cos > 1e-6) {
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

// v' = q * v * q^-1 (in place on out; out may alias v)
export function quatRotateVec3(out: V3, q: ArrayLike<number>, v: ArrayLike<number>): V3 {
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

// Yaw (rotation about +Y) of a quaternion, YXZ convention.
export function quatYaw(q: ArrayLike<number>): number {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (x * x + y * y));
}

const _pA = [0, 0, 0], _qA = [0, 0, 0, 1], _sA = [1, 1, 1];
const _pB = [0, 0, 0], _qB = [0, 0, 0, 1], _sB = [1, 1, 1];

// TRS-aware blend: lerp position and scale, slerp rotation.
export function mat4Interpolate(out: Mat4, a: ArrayLike<number>, b: ArrayLike<number>, t: number): Mat4 {
  mat4Decompose(a, _pA, _qA, _sA);
  mat4Decompose(b, _pB, _qB, _sB);
  for (let i = 0; i < 3; i++) {
    _pA[i] += (_pB[i] - _pA[i]) * t;
    _sA[i] += (_sB[i] - _sA[i]) * t;
  }
  quatSlerp(_qA, _qA, _qB, t);
  return mat4Compose(out, _pA, _qA, _sA);
}

// out = a * b (Hamilton product). out may alias a or b.
export function quatMultiply(out: Quat4, a: ArrayLike<number>, b: ArrayLike<number>): Quat4 {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}

// Inverse of a unit quaternion (conjugate). out may alias a.
export function quatConjugate(out: Quat4, a: ArrayLike<number>): Quat4 {
  out[0] = -a[0]; out[1] = -a[1]; out[2] = -a[2]; out[3] = a[3];
  return out;
}
