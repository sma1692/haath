// Pre-allocated zero-GC 3D vector math primitives
// All functions write into a caller-supplied output object - never allocate.

import type { Vec3 } from '../core/types.js';

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// out = a x b
export function cross(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  out.x = a.y * b.z - a.z * b.y;
  out.y = a.z * b.x - a.x * b.z;
  out.z = a.x * b.y - a.y * b.x;
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

// normalizes in-place, returns out
export function normalize(v: Vec3, out: Vec3): Vec3 {
  const len = hypot(v);
  if (len === 0) { out.x = 0; out.y = 0; out.z = 0; return out; }
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
