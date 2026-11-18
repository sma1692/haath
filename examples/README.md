# haath examples

Small apps that each show one way to use `@treefour/haath`. The browser examples need no install: they load haath from this repo's `dist/` and Three.js / IWER from a CDN through an import map.

```bash
npm install
npm run examples
```

Then open `http://localhost:5173/examples/`.

- **01-threejs-basic**: plain Three.js WebXR app. Per-frame `update()`, signs, punch and slap hits with `testHandSphere()`, and a thumbs-up hold with `HoldRecognizer`. Needs a headset with hand tracking (or example 04).
- **02-iwsdk-system**: code-only IWSDK systems (`HandSystem`, `MenuSystem`, `CombatSystem`) to copy into an `@iwsdk/core` project.
- **03-pose-playback**: no headset, no WebXR. Synthetic 25-joint hands go through `updateFromPoses()`. Pick poses, trigger a punch, slap, or double clap, and watch `haath.state`.
- **04-pc-emulator**: example 01 on a desktop. IWER emulates a Quest 3 with hands and `@treefour/haath/emulator` adds the hand panels and keyboard control.

`shared/syntheticHand.js` builds a valid 25-joint hand for any of the core signs. Use it in your own tests.

WebXR needs a secure context: `localhost` works, a LAN IP needs HTTPS. To test on a Quest over USB, run `adb reverse tcp:5173 tcp:5173` and open `http://localhost:5173/examples/` in the Quest browser.
