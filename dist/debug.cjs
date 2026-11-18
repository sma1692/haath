'use strict';

// src/handGesturePreviewOverlay.ts
function initGesturePreview(options = {}) {
  if (typeof document === "undefined") {
    return {
      element: null,
      update: () => {
      },
      destroy: () => {
      },
      setVisible: () => {
      }
    };
  }
  const {
    container = document.body,
    position = "top-left",
    showKinematics = true,
    showSigns = true,
    showSpells = true,
    opacity = 0.85
  } = options;
  const overlay = document.createElement("div");
  overlay.id = "haath-gesture-preview-overlay";
  overlay.style.position = "fixed";
  overlay.style.zIndex = "999999";
  overlay.style.fontFamily = "monospace";
  overlay.style.fontSize = "12px";
  overlay.style.lineHeight = "1.4";
  overlay.style.color = "#00ffcc";
  overlay.style.background = "rgba(10, 15, 20, 0.9)";
  overlay.style.padding = "10px 14px";
  overlay.style.borderRadius = "8px";
  overlay.style.border = "1px solid rgba(0, 255, 204, 0.3)";
  overlay.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = `${opacity}`;
  overlay.style.minWidth = "220px";
  switch (position) {
    case "top-left":
      overlay.style.top = "12px";
      overlay.style.left = "12px";
      break;
    case "top-right":
      overlay.style.top = "12px";
      overlay.style.right = "12px";
      break;
    case "bottom-left":
      overlay.style.bottom = "12px";
      overlay.style.left = "12px";
      break;
    case "bottom-right":
      overlay.style.bottom = "12px";
      overlay.style.right = "12px";
      break;
  }
  if (container) {
    container.appendChild(overlay);
  }
  const formatHand = (label, h) => {
    if (!h.tracked) {
      return `<div><strong>${label}</strong>: Untracked</div>`;
    }
    let html = `<div><strong>${label}</strong>: ${h.sign} [${h.gesture}]`;
    if (showSigns) {
      html += ` | F: ${h.fingers.count}/5 (T:${h.fingers.thumb ? 1 : 0} I:${h.fingers.index ? 1 : 0} M:${h.fingers.middle ? 1 : 0} R:${h.fingers.ring ? 1 : 0} P:${h.fingers.pinky ? 1 : 0})`;
    }
    if (showKinematics) {
      html += `<br>&nbsp;&nbsp;Speed: ${h.motionSpeed.toFixed(2)}m/s | Wrist: (${h.wristPosition[0].toFixed(2)}, ${h.wristPosition[1].toFixed(2)}, ${h.wristPosition[2].toFixed(2)})`;
    }
    if (showSpells && h.circle.meanRadius > 0) {
      html += `<br>&nbsp;&nbsp;Circle: revs=${h.circle.revolutions.toFixed(2)} ${h.circle.triggered ? "\u{1F4A5} FIRED" : ""}`;
    }
    html += `</div>`;
    return html;
  };
  const update = (state) => {
    if (!overlay || !state) return;
    let content = `<div style="font-weight: bold; border-bottom: 1px solid rgba(0,255,204,0.3); margin-bottom: 6px;">\u{1F590}\uFE0F HAATH GESTURE HUD</div>`;
    content += formatHand("LEFT", state.left);
    content += formatHand("RIGHT", state.right);
    if (showSpells && state.twoHand) {
      const th = state.twoHand;
      const tri = th.triangle.active ? "ACTIVE \u{1F53A}" : "inactive";
      const blast = th.blast?.active ? `ACTIVE \u{1F4A5} (${Math.round((th.blast.charge || 0) * 100)}%)` : "inactive";
      const clap = th.clap.doubleClap ? "DOUBLE \u{1F44F}" : th.clap.singleClap ? "SINGLE \u{1F44F}" : th.clap.state;
      content += `<div style="margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">`;
      content += `<strong>TwoHand</strong>: Clap=${clap} | Cross=${th.handsCrossed ? "YES" : "NO"}<br>`;
      content += `Triangle: ${tri} | Blast: ${blast}`;
      content += `</div>`;
    }
    overlay.innerHTML = content;
  };
  const destroy = () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
  const setVisible = (visible) => {
    overlay.style.display = visible ? "block" : "none";
  };
  return {
    element: overlay,
    update,
    destroy,
    setVisible
  };
}

exports.initGesturePreview = initGesturePreview;
//# sourceMappingURL=debug.cjs.map
//# sourceMappingURL=debug.cjs.map