'use strict';
// ════════════════════════════════════════════
//  materials.js — PBR 材质库
//  依赖：scene, renderer（来自 scene.js）
// ════════════════════════════════════════════

function mkStd(color, metalness = 0.1, roughness = 0.6) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
function mkPaint(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.28, envMapIntensity: 0.8 });
}
function mkGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x88ccff, metalness: 0.0, roughness: 0.05,
    transparent: true, opacity: 0.48, envMapIntensity: 1.2,
  });
}
function mkEmissive(color, intensity = 1.5) {
  return new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity: intensity,
    roughness: 1, metalness: 0,
  });
}
function mkMat(c, metalness = 0.08, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({ color: c, metalness, roughness });
}

const M = {
  asphalt:  mkStd(0x2a2a2a, 0.0, 0.92),
  ground:   mkStd(0x3a6e28, 0.0, 1.0),
  sidewalk: mkStd(0x888070, 0.0, 0.88),
  lineY:    new THREE.MeshBasicMaterial({ color: 0xffee00 }),
  lineW:    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  intBox:   mkStd(0x2e2e2e, 0.0, 0.95),
  tire:     mkStd(0x111111, 0.0, 0.98),
  hub:      mkStd(0x777777, 0.75, 0.28),
  glass:    mkGlass(),
  bump:     mkStd(0x1a1a1a, 0.1, 0.82),
  hlFront:  mkEmissive(0xffffcc, 2.5),
  hlRear:   mkEmissive(0xff2200, 2.5),
  steeringWheel: mkStd(0x1a1a1a, 0.2, 0.75),
  spark:    new THREE.MeshBasicMaterial({ color: 0xffee00 }),
  smoke:    new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.5, depthWrite: false }),
  chrome:   mkStd(0xcccccc, 1.0, 0.08),
};
