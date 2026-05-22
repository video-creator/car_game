'use strict';
// ════════════════════════════════════════════
//  scene.js — Three.js 场景、渲染器、光照
// ════════════════════════════════════════════

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6ab0de);
scene.fog = new THREE.Fog(0x6ab0de, 150, 380);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 500);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── 光照 ─────────────────────────────────────
// 半球光（天空/地面环境色）
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a6e28, 0.75);
scene.add(hemiLight);

// 主方向光（太阳，带阴影）
const sun = new THREE.DirectionalLight(0xfff0d0, 1.3);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 350;
sun.shadow.camera.left   = -100;
sun.shadow.camera.right  =  100;
sun.shadow.camera.top    =  100;
sun.shadow.camera.bottom = -100;
sun.shadow.bias = -0.0005;
scene.add(sun);

// 补光（模拟天空散射）
const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.35);
fillLight.position.set(-40, 60, -30);
scene.add(fillLight);

// ── 音频系统 ─────────────────────────────────
let AC = null;
function getAC() { return AC || (AC = new (window.AudioContext || window.webkitAudioContext)()); }

function synthSound(freq, dur, type = 'sawtooth', vol = 0.3) {
  try {
    const ac = getAC();
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 0.3, ac.currentTime + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  } catch(e) {}
}

function noiseBurst(dur = 0.4, vol = 0.5) {
  try {
    const ac = getAC();
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / ac.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * vol;
    }
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, ac.currentTime);
    s.connect(g); g.connect(ac.destination); s.start();
  } catch(e) {}
}

function playEngineSound(speed) {
  try {
    const freq = 80 + speed * 2.5;
    synthSound(freq, 0.08, 'sawtooth', 0.06);
  } catch(e) {}
}

let engineSoundTimer = 0;

// ── 工具函数 ─────────────────────────────────
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
