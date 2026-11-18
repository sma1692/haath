// Example 04: play example 01 on a desktop with IWER emulated hands + the haath PC emulator.
// In a Vite / IWSDK app you would gate all of this behind import.meta.env.DEV.

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { createHandEmulator } from '@treefour/haath/emulator';

// 1. Install IWER before any WebXR code runs, and switch it to hand input.
//    Desktop Chrome exposes a native navigator.xr, so force the emulated runtime over it.
//    On a real Quest, skip emulation and use real hands.
const onHeadset = /OculusBrowser|Quest/i.test(navigator.userAgent);
if (!onHeadset) {
  const device = new XRDevice(metaQuest3);
  device.installRuntime({ forceInstall: true });
  device.primaryInputMode = 'hand';
  new DevUI(device);
}

// 2. Load the real app (example 01). It sees IWER as navigator.xr.
const { renderer } = await import('../01-threejs-basic/main.js');

// 3. Attach the haath emulator. Recognition still runs through haath.update(),
//    so hooks are optional: here they only log what the emulator is doing.
const emulator = createHandEmulator({
  getSession: () => renderer.xr.getSession(),
  debug: true,
  hooks: {
    onPose: (target, pose, gesture) => console.log(`[example] ${target} hand -> ${pose} (${gesture})`),
    onClap: () => console.log('[example] double clap'),
  },
});

// Handy from the devtools console: haathEmulator.setPose('fist', 'right'), haathEmulator.triggerClap()
window.haathEmulator = emulator;
