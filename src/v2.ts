/**
 * @treefour/haath/v2
 *
 * Compositional gesture engine (v2): motion state, micro-gestures, rolling
 * trajectory recognition, static pose classification, pose packs, and
 * bimanual composition. Shipped as a separate entry so consumers of the
 * core `Haath` engine do not bundle it.
 */
export * from './MotionStateTracker.js';
export * from './MicroGestureDetector.js';
export * from './RollingTrajectoryBuffer.js';
export * from './StaticPoseClassifier.js';
export * from './PosePacks.js';
export * from './BimanualComposer.js';
