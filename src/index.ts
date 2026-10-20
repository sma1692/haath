// Public API barrel
// Exports: Haath, types, default thresholds, standalone math helpers

export { Haath } from './core/Haath.js';
export type {
  HaathConfig,
  HandState,
  TwoHandState,
  CircleResult,
  TriangleResult,
  HaathUpdateResult,
} from './core/types.js';
export {
  CURL_DOT,
  PINCH_DIST,
  PUNCH_SPEED,
  SLAP_SPEED,
  SPELL_CONFIG,
  PHALANGES,
} from './core/constants.js';
export { dot, cross, sub, normalize, hypot } from './math/vec3.js';
export {
  sphereSphere,
  cylinderSphere,
  discSphere,
} from './math/colliders.js';
