// Pre-allocated zero-GC 3D vector math primitives
// Supports both { x, y, z } Vec3 objects and Float32Array / numeric tuples.

import type { Vec3 } from '../types.js';

export type Vec3Like = Vec3 | Float32Array | readonly number[];

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// out = a x b
export function cross(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;
  out.x = ay * bz - az * by;
  out.y = az * bx - ax * bz;
  out.z = ax * by - ay * bx;
  return out;
}

// out = a - b
export function sub(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}

// out = a + b
export function add(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

// normalizes v into out, returns out
export function normalize(v: Vec3, out: Vec3): Vec3 {
  const len = hypot(v);
  if (len === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const inv = 1 / len;
  out.x = v.x * inv;
  out.y = v.y * inv;
  out.z = v.z * inv;
  return out;
}

export function hypot(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function scale(v: Vec3, s: number, out: Vec3): Vec3 {
  out.x = v.x * s;
  out.y = v.y * s;
  out.z = v.z * s;
  return out;
}

export function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt(distSq(a, b));
}

// --- Zero-GC Float32Array [x, y, z] inline operations ---

export function v3Set(out: Float32Array, x: number, y: number, z: number): Float32Array {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function v3Copy(out: Float32Array, a: ArrayLike<number>, offset = 0): Float32Array {
  out[0] = a[offset];
  out[1] = a[offset + 1];
  out[2] = a[offset + 2];
  return out;
}

export function v3Sub(
  out: Float32Array,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  aOffset = 0,
  bOffset = 0,
): Float32Array {
  out[0] = a[aOffset] - b[bOffset];
  out[1] = a[aOffset + 1] - b[bOffset + 1];
  out[2] = a[aOffset + 2] - b[bOffset + 2];
  return out;
}

export function v3Add(
  out: Float32Array,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  aOffset = 0,
  bOffset = 0,
): Float32Array {
  out[0] = a[aOffset] + b[bOffset];
  out[1] = a[aOffset + 1] + b[bOffset + 1];
  out[2] = a[aOffset + 2] + b[bOffset + 2];
  return out;
}

export function v3Scale(out: Float32Array, a: ArrayLike<number>, s: number, aOffset = 0): Float32Array {
  out[0] = a[aOffset] * s;
  out[1] = a[aOffset + 1] * s;
  out[2] = a[aOffset + 2] * s;
  return out;
}

export function v3Dot(a: ArrayLike<number>, b: ArrayLike<number>, aOffset = 0, bOffset = 0): number {
  return (
    a[aOffset] * b[bOffset] +
    a[aOffset + 1] * b[bOffset + 1] +
    a[aOffset + 2] * b[bOffset + 2]
  );
}

export function v3Cross(
  out: Float32Array,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  aOffset = 0,
  bOffset = 0,
): Float32Array {
  const ax = a[aOffset], ay = a[aOffset + 1], az = a[aOffset + 2];
  const bx = b[bOffset], by = b[bOffset + 1], bz = b[bOffset + 2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function v3LenSq(a: ArrayLike<number>, offset = 0): number {
  const x = a[offset], y = a[offset + 1], z = a[offset + 2];
  return x * x + y * y + z * z;
}

export function v3Len(a: ArrayLike<number>, offset = 0): number {
  return Math.sqrt(v3LenSq(a, offset));
}

export function v3DistSq(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  aOffset = 0,
  bOffset = 0,
): number {
  const dx = a[aOffset] - b[bOffset];
  const dy = a[aOffset + 1] - b[bOffset + 1];
  const dz = a[aOffset + 2] - b[bOffset + 2];
  return dx * dx + dy * dy + dz * dz;
}

export function v3Dist(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  aOffset = 0,
  bOffset = 0,
): number {
  return Math.sqrt(v3DistSq(a, b, aOffset, bOffset));
}

export function v3Normalize(out: Float32Array, a: ArrayLike<number>, aOffset = 0): Float32Array {
  const x = a[aOffset], y = a[aOffset + 1], z = a[aOffset + 2];
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len === 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  const inv = 1 / len;
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  return out;
}
