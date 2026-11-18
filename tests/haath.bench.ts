import { bench, describe } from 'vitest';
import { Haath } from '../src/index.js';
import { buildHandPoseBuffer } from './fixtures/handPose.js';

// Budget: Haath.update must stay well under 0.3 ms per frame (72-90 Hz XR loop).
const open = buildHandPoseBuffer({ thumb: true, index: true, middle: true, ring: true, pinky: true });
const fist = buildHandPoseBuffer({ wrist: [0.2, 1.2, -0.4] });
const moving = Array.from({ length: 60 }, (_, i) =>
  buildHandPoseBuffer({ index: true, middle: true, wrist: [-0.2 + Math.sin(i / 6) * 0.1, 1.2, -0.4 - i * 0.002] }),
);

describe('Haath.updateFromPoses (per XR frame)', () => {
  const haath = new Haath({ historyFrames: 20, useCurlDetection: true });
  let t = 0;
  let i = 0;

  bench('two static hands', () => {
    t += 13.9;
    haath.updateFromPoses(open, fist, 0.0139, t);
  });

  bench('two moving hands (trajectory + strike paths)', () => {
    t += 13.9;
    i = (i + 1) % moving.length;
    haath.updateFromPoses(moving[i], moving[(i + 30) % moving.length], 0.0139, t);
  });

  bench('one hand tracked', () => {
    t += 13.9;
    haath.updateFromPoses(open, null, 0.0139, t);
  });
});
