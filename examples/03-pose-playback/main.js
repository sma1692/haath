// Example 03: drive haath with synthetic poses. No WebXR, no headset, no dependencies.
// The same approach works for recorded sessions, non-WebXR trackers, and tests.

import { Haath, FLOATS_PER_JOINT } from '@treefour/haath';
import { buildSyntheticHand, SYNTHETIC_POSES, HAND_BONES } from '../shared/syntheticHand.js';

const haath = new Haath();

// Scene state the "recording" plays back. Wrist positions are in metres, forward is -Z.
const hands = {
  left: { pose: 'open_palm', wrist: [-0.18, 1.2, -0.45], dir: [0, 0, -1], buf: new Float32Array(175) },
  right: { pose: 'fist', wrist: [0.18, 1.2, -0.45], dir: [0, 0, -1], buf: new Float32Array(175) },
};

// Short scripted motions: each returns false when finished.
let motion = null;
let clapping = false;
function punch() {
  const h = hands.right; const start = performance.now();
  h.pose = 'fist';
  motion = (now) => {
    const t = (now - start) / 1000;
    h.wrist[2] = t < 0.12 ? -0.45 - t * 3.5 : t < 0.4 ? -0.87 + (t - 0.12) * 1.5 : -0.45;
    return t < 0.4;
  };
}
function slap() {
  const h = hands.left; const start = performance.now();
  h.pose = 'open_palm';
  motion = (now) => {
    const t = (now - start) / 1000;
    h.wrist[0] = t < 0.15 ? -0.18 + t * 3.0 : t < 0.45 ? 0.27 - (t - 0.15) * 1.5 : -0.18;
    return t < 0.45;
  };
}
function clap() {
  const start = performance.now();
  hands.left.pose = hands.right.pose = 'open_palm';
  hands.left.dir = [0, 1, 0]; hands.right.dir = [0, 1, 0];
  const seg = (ms, a, b, x0, x1) => (ms >= a && ms < b ? x0 + ((x1 - x0) * (ms - a)) / (b - a) : null);
  motion = (now) => {
    const ms = now - start;
    const x = seg(ms, 0, 250, 0.25, 0.05) ?? seg(ms, 250, 450, 0.05, 0.25) ?? seg(ms, 450, 700, 0.25, 0.05) ?? seg(ms, 700, 900, 0.05, 0.25) ?? 0.25;
    hands.left.wrist[0] = -x; hands.right.wrist[0] = x;
    if (ms >= 900) { hands.left.dir = [0, 0, -1]; hands.right.dir = [0, 0, -1]; hands.left.wrist[0] = -0.18; hands.right.wrist[0] = 0.18; }
    return ms < 900;
  };
}

// UI
for (const side of ['left', 'right']) {
  const box = document.getElementById(`${side}-poses`);
  for (const pose of SYNTHETIC_POSES) {
    const b = document.createElement('button');
    b.textContent = pose.replace('_', ' ');
    b.onclick = () => { hands[side].pose = pose; syncChips(); };
    b.dataset.pose = pose; b.dataset.side = side;
    box.appendChild(b);
  }
}
function syncChips() {
  document.querySelectorAll('button[data-pose]').forEach((b) => b.classList.toggle('on', hands[b.dataset.side].pose === b.dataset.pose));
}
syncChips();
document.getElementById('punch').onclick = punch;
document.getElementById('slap').onclick = slap;
document.getElementById('clap').onclick = () => { clap(); clapping = true; };

// Rendering: orthographic 3/4 view, yawed 40 degrees and pitched 25 degrees so finger spread and reach both show.
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const css = getComputedStyle(document.documentElement);
const YAW = (40 * Math.PI) / 180, PITCH = (25 * Math.PI) / 180, VIEW_SCALE = 1150;
const CY = Math.cos(YAW), SY = Math.sin(YAW), CP = Math.cos(PITCH), SP = Math.sin(PITCH);
function project(x, y, z) {
  const dz = z + 0.45, dy = y - 1.2;
  const x1 = x * CY + dz * SY;
  const z1 = -x * SY + dz * CY;
  const up = dy * CP - z1 * SP;
  return [canvas.width / 2 + x1 * VIEW_SCALE, canvas.height * 0.6 - up * VIEW_SCALE];
}
function drawHand(buf, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const [a, b] of HAND_BONES) {
    const pa = project(buf[a * FLOATS_PER_JOINT], buf[a * FLOATS_PER_JOINT + 1], buf[a * FLOATS_PER_JOINT + 2]);
    const pb = project(buf[b * FLOATS_PER_JOINT], buf[b * FLOATS_PER_JOINT + 1], buf[b * FLOATS_PER_JOINT + 2]);
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
  }
}

const readout = document.getElementById('readout');
let flash = '';
let flashUntil = 0;
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (motion && !motion(now)) { motion = null; clapping = false; }

  for (const h of Object.values(hands)) buildSyntheticHand({ poseName: h.pose, hand: h === hands.left ? 'left' : 'right', wristPos: h.wrist, handDir: h.dir }, h.buf);
  const state = haath.updateFromPoses(hands.left.buf, hands.right.buf, dt, now);

  // During the clap both open hands move fast enough to read as slaps; only announce the clap.
  if (!clapping) {
    for (const side of ['left', 'right']) {
      const g = state[side].gesture;
      if (g === 'punch' || g === 'slap') { flash = `${side} ${g}`; flashUntil = now + 900; }
    }
  }
  if (state.twoHand.clap.doubleClap) { flash = 'double clap'; flashUntil = now + 1200; }

  ctx.fillStyle = css.getPropertyValue('--canvas').trim() || '#0b0e14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawHand(hands.left.buf, css.getPropertyValue('--left').trim() || '#38bdf8');
  drawHand(hands.right.buf, css.getPropertyValue('--right').trim() || '#f472b6');
  ctx.fillStyle = css.getPropertyValue('--fg').trim() || '#e5e7eb';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`L: ${state.left.gesture}`, 16, 28);
  ctx.textAlign = 'right'; ctx.fillText(`R: ${state.right.gesture}`, canvas.width - 16, 28); ctx.textAlign = 'left';
  if (now < flashUntil) { ctx.font = '700 28px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(flash.toUpperCase(), canvas.width / 2, canvas.height - 28); ctx.textAlign = 'left'; }

  const f = (h) => `${h.fingers.thumb ? 1 : 0}${h.fingers.index ? 1 : 0}${h.fingers.middle ? 1 : 0}${h.fingers.ring ? 1 : 0}${h.fingers.pinky ? 1 : 0}`;
  readout.textContent =
    `left.sign       ${state.left.sign}\nleft.gesture    ${state.left.gesture}\nleft.fingers    ${f(state.left)}  (T I M R P)\nleft.speed      ${state.left.motionSpeed.toFixed(2)} m/s\n\n` +
    `right.sign      ${state.right.sign}\nright.gesture   ${state.right.gesture}\nright.fingers   ${f(state.right)}\nright.speed     ${state.right.motionSpeed.toFixed(2)} m/s\n\n` +
    `twoHand.fingerCount  ${state.twoHand.fingerCount}\ntwoHand.clap.state   ${state.twoHand.clap.state}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
