import { describe, expect, it } from 'vitest';
import { Haath, SWIPE_COOLDOWN_MS } from '../src/index.js';
import { buildHandPoseBuffer, type FingerBuildOpts } from './fixtures/handPose.js';

const BRUSH: FingerBuildOpts = { index: true, middle: true };

/** Moves a pose linearly from `from` to `to` over `frames` frames of `stepMs`, returns the frame a swipe fired (or -1). */
function stroke(
  haath: Haath,
  opts: FingerBuildOpts,
  from: [number, number, number],
  to: [number, number, number],
  frames: number,
  startMs: number,
  stepMs = 16,
): { firedAt: number; direction: string } {
  let firedAt = -1;
  let direction = 'none';
  for (let i = 0; i <= frames; i++) {
    const k = i / frames;
    const wrist: [number, number, number] = [
      from[0] + (to[0] - from[0]) * k,
      from[1] + (to[1] - from[1]) * k,
      from[2] + (to[2] - from[2]) * k,
    ];
    const s = haath.updateFromPoses(buildHandPoseBuffer({ ...opts, wrist }), null, stepMs / 1000, startMs + i * stepMs);
    if (s.left.swipe.fired && firedAt < 0) {
      firedAt = i;
      direction = s.left.swipe.direction;
    }
  }
  return { firedAt, direction };
}

describe('Two-finger swipe (brush)', () => {
  it('reports the brush pose for two fingers held together (not a peace V)', () => {
    const haath = new Haath();
    const s = haath.updateFromPoses(buildHandPoseBuffer(BRUSH), null, 0.016, 100);
    expect(s.left.sign).not.toBe('peace');
    expect(s.left.swipe.posed).toBe(true);
  });

  it('fires up / down / left / right for fast strokes sideways to the fingers', () => {
    const cases: Array<[[number, number, number], [number, number, number], string]> = [
      [[-0.2, 1.2, -0.4], [-0.2, 1.3, -0.4], 'up'],
      [[-0.2, 1.3, -0.4], [-0.2, 1.2, -0.4], 'down'],
      [[-0.25, 1.2, -0.4], [-0.15, 1.2, -0.4], 'right'],
      [[-0.15, 1.2, -0.4], [-0.25, 1.2, -0.4], 'left'],
    ];
    for (const [from, to, dir] of cases) {
      const haath = new Haath();
      const r = stroke(haath, BRUSH, from, to, 10, 1000);
      expect(r.firedAt).toBeGreaterThan(0);
      expect(r.direction).toBe(dir);
    }
  });

  it('resolves left / right against the head-right vector', () => {
    const haath = new Haath();
    // Head turned so that its right points at world -X: a world +X stroke reads as left
    haath.setHeadRight(-1, 0, 0);
    const r = stroke(haath, BRUSH, [-0.25, 1.2, -0.4], [-0.15, 1.2, -0.4], 10, 1000);
    expect(r.direction).toBe('left');
  });

  it('does not fire for a thumb-up gun moving sideways', () => {
    const haath = new Haath();
    const r = stroke(haath, { index: true, middle: true, thumb: true }, [-0.2, 1.2, -0.4], [-0.2, 1.3, -0.4], 10, 1000);
    expect(r.firedAt).toBe(-1);
  });

  it('does not fire for motion along the finger axis (aim / recoil / poke)', () => {
    const haath = new Haath();
    const r = stroke(haath, BRUSH, [-0.2, 1.2, -0.4], [-0.2, 1.2, -0.52], 10, 1000);
    expect(r.firedAt).toBe(-1);
  });

  it('does not fire for slow drift or a spread V sign', () => {
    const slow = new Haath();
    expect(stroke(slow, BRUSH, [-0.2, 1.2, -0.4], [-0.2, 1.3, -0.4], 60, 1000).firedAt).toBe(-1);

    // Ring + pinky open: open hand, not a brush
    const open = new Haath();
    expect(stroke(open, { index: true, middle: true, ring: true, pinky: true }, [-0.2, 1.2, -0.4], [-0.2, 1.3, -0.4], 10, 1000).firedAt).toBe(-1);
  });

  it('fires once per stroke and respects the cooldown', () => {
    const haath = new Haath();
    let fires = 0;
    for (let i = 0; i <= 20; i++) {
      const wrist: [number, number, number] = [-0.2, 1.2 + i * 0.01, -0.4];
      const s = haath.updateFromPoses(buildHandPoseBuffer({ ...BRUSH, wrist }), null, 0.016, 1000 + i * 16);
      if (s.left.swipe.fired) fires++;
    }
    expect(fires).toBe(1);

    // A second stroke after the cooldown fires again
    const r = stroke(haath, BRUSH, [-0.2, 1.4, -0.4], [-0.2, 1.3, -0.4], 10, 1000 + 20 * 16 + SWIPE_COOLDOWN_MS + 50);
    expect(r.direction).toBe('down');
  });

  it('can be disabled via config', () => {
    const haath = new Haath({ swipeEnabled: false });
    expect(stroke(haath, BRUSH, [-0.2, 1.2, -0.4], [-0.2, 1.3, -0.4], 10, 1000).firedAt).toBe(-1);
  });
});
