// Example 01: haath in a plain Three.js WebXR app.
// Shows: per-frame update, reading signs and strikes, testHandSphere hits, HoldRecognizer menus.

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { Haath, HoldRecognizer, CollisionCooldownTracker } from '@treefour/haath';

// --- Three.js scene -------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer, { optionalFeatures: ['hand-tracking'] }));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101318);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
camera.position.set(0, 1.6, 0.6);
scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
const grid = new THREE.GridHelper(6, 12, 0x335566, 0x223344);
scene.add(grid);

// Skinned hand meshes (the WebXR generic-hand glTF, loaded from the webxr-input-profiles CDN).
const handFactory = new XRHandModelFactory();
for (let i = 0; i < 2; i++) {
  const hand = renderer.xr.getHand(i);
  hand.add(handFactory.createHandModel(hand, 'mesh'));
  scene.add(hand);
}

// Targets: small orbs in a row at chest height, just below where the hands rest.
const ORB_RADIUS = 0.03;
const orbGeometry = new THREE.SphereGeometry(ORB_RADIUS, 24, 16);
const orbs = [];
for (let i = 0; i < 5; i++) {
  const mesh = new THREE.Mesh(orbGeometry, new THREE.MeshStandardMaterial({ color: 0x5eead4 }));
  scene.add(mesh);
  orbs.push({ id: i, mesh, home: new THREE.Vector3(-0.3 + i * 0.15, 1.4, -0.45), vel: new THREE.Vector3(), prev: new THREE.Vector3() });
}
function resetOrbs() {
  for (const o of orbs) { o.mesh.position.copy(o.home); o.prev.copy(o.home); o.vel.set(0, 0, 0); o.mesh.material.color.set(0x5eead4); }
}
resetOrbs();

// --- haath ------------------------------------------------------------------
// One instance per app. It owns velocity history, clap timing, and circle buffers.
const haath = new Haath();

// Hit testing: pre-allocate the options object and the cooldown tracker once.
const cooldown = new CollisionCooldownTracker(250);
const hitOpts = { mode: 'combat', requiredGesture: ['punch', 'slap', 'poke'], cooldown };

// Hold thumbs up for 1 s to reset the orbs.
const resetHold = new HoldRecognizer({ holdDurationMs: 1000, stabilityFrames: 8, cooldownMs: 800 });

const status = document.getElementById('status');
let lastStatus = '';
let last = performance.now();
const _toHome = new THREE.Vector3();

renderer.setAnimationLoop((_time, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (frame) {
    const session = renderer.xr.getSession();
    const state = haath.update(frame, renderer.xr.getReferenceSpace(), session?.inputSources, dt, now);

    // Strikes: test each orb against both hands.
    for (const o of orbs) {
      hitOpts.targetId = o.id;
      hitOpts.prevTargetX = o.prev.x; hitOpts.prevTargetY = o.prev.y; hitOpts.prevTargetZ = o.prev.z;
      for (const side of ['left', 'right']) {
        const hand = state[side];
        if (!hand.tracked) continue;
        const p = o.mesh.position;
        const part = haath.testHandSphere(side, p.x, p.y, p.z, ORB_RADIUS, hitOpts);
        if (part !== 'none') {
          // Momentum transfer: hand velocity (m/s) times a tuning factor.
          o.vel.set(hand.velocity[0], hand.velocity[1], hand.velocity[2]).multiplyScalar(hand.gesture === 'slap' ? 0.9 : 1.2);
          o.mesh.material.color.set(hand.gesture === 'punch' ? 0xf97316 : hand.gesture === 'slap' ? 0xa78bfa : 0xfacc15);
        }
      }
    }

    const hold = resetHold.update(state.right.sign === 'thumbsup' || state.left.sign === 'thumbsup' ? 'thumbsup' : null, dt);
    if (hold.triggered) resetOrbs();

    const text = `L ${state.left.tracked ? state.left.gesture : '-'} · R ${state.right.tracked ? state.right.gesture : '-'} · fingers ${state.twoHand.fingerCount}`;
    if (text !== lastStatus) { status.textContent = text; lastStatus = text; }
  }

  // Simple orb physics: drag and a spring back home (scratch vector, no per-frame allocation).
  for (const o of orbs) {
    o.prev.copy(o.mesh.position);
    o.vel.multiplyScalar(0.96);
    o.vel.addScaledVector(_toHome.subVectors(o.mesh.position, o.home), -2 * dt);
    o.mesh.position.addScaledVector(o.vel, dt);
  }

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Exported so example 04 can reuse this scene with the PC hand emulator.
export { renderer, haath };
