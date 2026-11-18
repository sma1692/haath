import { describe, expect, it } from 'vitest';
import {
  mat4Compose,
  mat4Decompose,
  mat4Invert,
  mat4Multiply,
  mat4Interpolate,
  quatMultiply,
  quatConjugate,
  quatRotateVec3,
  quatSlerp,
  quatYaw,
} from '../src/math/mat4.js';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function axisAngle(ax: number, ay: number, az: number, rad: number): number[] {
  const s = Math.sin(rad / 2);
  return [ax * s, ay * s, az * s, Math.cos(rad / 2)];
}

function expectClose(a: ArrayLike<number>, b: ArrayLike<number>, eps = 1e-6) {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
}

// Quaternions q and -q are the same rotation.
function expectSameRotation(a: ArrayLike<number>, b: ArrayLike<number>) {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  expect(Math.abs(Math.abs(d) - 1)).toBeLessThan(1e-6);
}

describe('mat4 helpers', () => {
  const pos = [0.3, -1.2, 2.5];
  const quat = axisAngle(0.267, 0.534, 0.802, 1.1); // roughly unit axis
  const qn = Math.hypot(...quat);
  for (let i = 0; i < 4; i++) quat[i] /= qn;
  const scale = [1, 1, 1];

  it('compose then decompose round-trips TRS', () => {
    const m = mat4Compose(new Array(16), pos, quat, scale);
    const p = [0, 0, 0], q = [0, 0, 0, 1], s = [0, 0, 0];
    mat4Decompose(m, p, q, s);
    expectClose(p, pos);
    expectClose(s, scale);
    expectSameRotation(q, quat);
  });

  it('decompose keeps a mirrored axis (IWER right-hand joints)', () => {
    const m = mat4Compose(new Array(16), pos, quat, [-1, 1, 1]);
    const p = [0, 0, 0], q = [0, 0, 0, 1], s = [0, 0, 0];
    mat4Decompose(m, p, q, s);
    expectClose(mat4Compose(new Array(16), p, q, s), m);
  });

  it('invert times original is identity', () => {
    const m = mat4Compose(new Array(16), pos, quat, [2, 0.5, 1.5]);
    const inv = mat4Invert(new Array(16), m)!;
    expectClose(mat4Multiply(new Array(16), m, inv), IDENTITY);
    expectClose(mat4Multiply(new Array(16), inv, m), IDENTITY);
  });

  it('invert returns null for a singular matrix', () => {
    expect(mat4Invert(new Array(16), new Array(16).fill(0))).toBeNull();
  });

  it('multiply supports out aliasing a', () => {
    const a = mat4Compose(new Array(16), pos, quat, scale);
    const b = mat4Compose(new Array(16), [1, 2, 3], axisAngle(0, 1, 0, 0.4), scale);
    const expected = mat4Multiply(new Array(16), a, b);
    mat4Multiply(a, a, b);
    expectClose(a, expected);
  });

  it('quatMultiply with conjugate is identity', () => {
    const r = quatMultiply([0, 0, 0, 1], quat, quatConjugate([0, 0, 0, 1], quat));
    expectSameRotation(r, [0, 0, 0, 1]);
  });

  it('quatRotateVec3 rotates +X by 90 deg about Y to -Z', () => {
    const v = quatRotateVec3([0, 0, 0], axisAngle(0, 1, 0, Math.PI / 2), [1, 0, 0]);
    expectClose(v, [0, 0, -1]);
  });

  it('quatSlerp hits endpoints and midpoint', () => {
    const a = [0, 0, 0, 1];
    const b = axisAngle(0, 1, 0, 1.0);
    expectSameRotation(quatSlerp([0, 0, 0, 1], a, b, 0), a);
    expectSameRotation(quatSlerp([0, 0, 0, 1], a, b, 1), b);
    expectSameRotation(quatSlerp([0, 0, 0, 1], a, b, 0.5), axisAngle(0, 1, 0, 0.5));
  });

  it('quatYaw reads rotation about +Y', () => {
    expect(quatYaw(axisAngle(0, 1, 0, 0.7))).toBeCloseTo(0.7, 6);
  });

  it('mat4Interpolate at 0.5 lerps position and slerps rotation', () => {
    const a = mat4Compose(new Array(16), [0, 0, 0], [0, 0, 0, 1], scale);
    const b = mat4Compose(new Array(16), [2, 4, -6], axisAngle(1, 0, 0, 1.2), scale);
    const out = mat4Interpolate(new Array(16), a, b, 0.5);
    const p = [0, 0, 0], q = [0, 0, 0, 1], s = [0, 0, 0];
    mat4Decompose(out, p, q, s);
    expectClose(p, [1, 2, -3]);
    expectSameRotation(q, axisAngle(1, 0, 0, 0.6));
  });
});
