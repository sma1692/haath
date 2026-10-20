// Analytic O(1) collision helpers - zero allocation
// Extracted from DunJun src/systems/spell.ts & src/systems/collide.ts in Phase 2

import type { Vec3 } from '../core/types.js';
import { dot, sub, distSq } from './vec3.js';

// Pre-allocated scratch
const _d: Vec3 = { x: 0, y: 0, z: 0 };

// Returns true if two spheres overlap
export function sphereSphere(
  centerA: Vec3, radiusA: number,
  centerB: Vec3, radiusB: number,
): boolean {
  const r = radiusA + radiusB;
  return distSq(centerA, centerB) <= r * r;
}

// Cylinder-sphere: axis-aligned laser beam (origin + direction + half-length) vs sphere
// Returns true if sphere intersects the infinite cylinder capped to [0, length]
export function cylinderSphere(
  origin: Vec3,
  dir: Vec3,      // unit vector
  length: number,
  radius: number, // cylinder radius
  sphereCenter: Vec3,
  sphereRadius: number,
): boolean {
  sub(sphereCenter, origin, _d);
  const axial = dot(_d, dir);
  if (axial < 0 || axial > length) return false;
  // lateral distance squared
  const lateralSq = distSq(_d, { x: dir.x * axial, y: dir.y * axial, z: dir.z * axial });
  const r = radius + sphereRadius;
  return lateralSq <= r * r;
}

// Thin disc-sphere: disc at center facing normal with given radius vs sphere
export function discSphere(
  discCenter: Vec3,
  discNormal: Vec3, // unit vector
  discRadius: number,
  sphereCenter: Vec3,
  sphereRadius: number,
): boolean {
  sub(sphereCenter, discCenter, _d);
  const axialDist = Math.abs(dot(_d, discNormal));
  if (axialDist > sphereRadius) return false;
  const lateralSq = distSq(_d, { x: discNormal.x * dot(_d, discNormal), y: discNormal.y * dot(_d, discNormal), z: discNormal.z * dot(_d, discNormal) });
  const r = discRadius + sphereRadius;
  return lateralSq <= r * r;
}
