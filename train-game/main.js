import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildTrackSystem } from './track.js';
import { createPlayerTrain, createNPCTrain, updateTrainOnTrack, checkTrainCollisions } from './train.js';
import { createEnvironment } from './env.js';
import { createHUD, updateHUD } from './hud.js';
import { createEffects, updateEffects } from './effects.js';
import { setupControls, updateControls } from './controls.js';

// ── Game State ──────────────────────────────────
const state = {
  gameOver: false,
  score: 0, stars: 0, crashes: 0,
  distance: 0, speed: 0, hp: 100,
};

// ── Module-level vars ──────────────────────────
let scene, camera, renderer;
let trackSystem;
let playerTrain, npcTrains = [];
let env, effects;
let clock;

// ── Init ────────────────────────────────────────
export function initGame() {
  const s = createScene();
  scene = s.scene;
  camera = s.camera;
  renderer = s.renderer;
  clock = new THREE.Clock();

  trackSystem = buildTrackSystem(scene);
  env = createEnvironment(scene, trackSystem);
  effects = createEffects(scene);

  createPlayer();
  setupControls();

  // Wire up restart
  window.restartGame = restartGame;

  animate();
}

function createPlayer() {
  playerTrain = createPlayerTrain(scene);
  playerTrain.trackPos = 0;
  playerTrain.speed = 0;
  playerTrain.spawnProtected = true;

  npcTrains = [];
  const mainLen = trackSystem.mainLen;
  const spawnGaps = [mainLen * 0.15, mainLen * 0.35, mainLen * 0.55, mainLen * 0.75];
  for (let i = 0; i < spawnGaps.length; i++) {
    const t = createNPCTrain(scene);
    t.trackPos = spawnGaps[i];
    t.speed = 12 + Math.random() * 6;
    t.baseSpeed = t.speed;
    npcTrains.push(t);
  }

  // Remove spawn protection after 2 seconds
  setTimeout(() => { playerTrain.spawnProtected = false; }, 2000);
}

// ── Restart ─────────────────────────────────────
function restartGame() {
  // Clean up old trains
  cleanupTrain(playerTrain);
  for (const t of npcTrains) cleanupTrain(t);
  npcTrains = [];

  state.gameOver = false;
  state.stars = 0;
  state.crashes = 0;
  state.distance = 0;
  state.hp = 100;

  document.getElementById('gameover').classList.remove('show');
  createPlayer();
}

function cleanupTrain(train) {
  if (!train) return;
  for (const c of train.cars) if (c.mesh) scene.remove(c.mesh);
  for (const r of train.couplers) if (r) scene.remove(r);
}

// ── Animate ─────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (dt <= 0) return;

  if (!state.gameOver) {
    // Update controls
    updateControls(playerTrain, state, dt);

    // Track junction detection
    updateJunctionDetection(playerTrain, trackSystem);

    // Advance trains
    advanceTrain(playerTrain, dt, true);
    for (const t of npcTrains) advanceTrain(t, dt, false);

    // Visuals
    updateTrainOnTrack(playerTrain, trackSystem);
    for (const t of npcTrains) updateTrainOnTrack(t, trackSystem);

    // Collisions (skip if spawn protected)
  if (!playerTrain.spawnProtected) {
    checkTrainCollisions(playerTrain, npcTrains, state, effects);
  }

    // Stars
    const pPos = playerTrain.cars[0]?.mesh?.position;
    if (pPos) env.checkStars(pPos, state);

    // Camera
    updateCamera(playerTrain, camera, dt);

    // Env & effects
    env.update(dt);
    updateEffects(effects, dt);

    // HUD
    state.distance = Math.floor(playerTrain.trackPos);
    state.speed = Math.round(Math.abs(playerTrain.speed * 3.6));
    state.hp = playerTrain.hp;
    updateHUD(state);
  } else {
    updateEffects(effects, dt);
  }

  renderer.render(scene, camera);
}

// ── Junction Detection ─────────────────────────
function updateJunctionDetection(train, ts) {
  if (train.onBranch >= 0) {
    train.nearJunction = null;
    train.atJunction = false;
    return;
  }

  const norm = ((train.trackPos % ts.mainLen) + ts.mainLen) % ts.mainLen;
  let nearIdx = -1;
  let nearDist = Infinity;

  for (let i = 0; i < ts.junctions.length; i++) {
    const j = ts.junctions[i];
    let dist = j.entryDistance - norm;
    if (dist < 0) dist += ts.mainLen;
    if (dist < nearDist) {
      nearDist = dist;
      nearIdx = i;
    }
  }

  if (nearIdx >= 0 && nearDist < 80) {
    train.nearJunction = { index: nearIdx, ...ts.junctions[nearIdx] };
    train.atJunction = nearDist < 18;
  } else {
    train.nearJunction = null;
    train.atJunction = false;
  }
}

// ── Train Movement ──────────────────────────────
function advanceTrain(train, dt, isPlayer) {
  if (train.hp <= 0) return;

  // Drag
  train.speed *= Math.pow(0.996, dt * 60);

  if (!isPlayer) {
    train.speed += (train.baseSpeed - train.speed) * dt * 0.5;
  }

  train.speed = Math.max(0, Math.min(train.speed, isPlayer ? 55 : 30));

  const offsetDelta = train.speed * dt;

  if (train.onBranch >= 0) {
    // On branch
    const j = trackSystem.junctions[train.onBranch];
    if (j) {
      const branchLen = j.branchCurve.getLength();
      train.branchProgress += offsetDelta / branchLen;
      if (train.branchProgress >= 1) {
        train.onBranch = -1;
        train.branchProgress = 0;
        train.trackPos = j.exitDistance;
      }
    }
  } else {
    // Main track
    train.trackPos = ((train.trackPos + offsetDelta) % trackSystem.mainLen + trackSystem.mainLen) % trackSystem.mainLen;
  }
}

// ── Camera ──────────────────────────────────────
let camPos = new THREE.Vector3();
let camLookAt = new THREE.Vector3();
let camMode = 'third';

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV') camMode = camMode === 'third' ? 'top' : 'third';
});

function updateCamera(train, camera, dt) {
  if (!train?.cars[0]?.mesh) return;
  const pos = train.cars[0].mesh.position;

  if (camMode === 'third') {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(train.cars[0].mesh.quaternion);
    const behind = pos.clone().sub(dir.clone().multiplyScalar(20));
    behind.y += 8;
    const ahead = pos.clone().add(dir.clone().multiplyScalar(10));
    ahead.y += 1;

    camPos.lerp(behind, Math.min(1, dt * 3));
    camLookAt.lerp(ahead, Math.min(1, dt * 3));
    camera.position.copy(camPos);
    camera.lookAt(camLookAt);
  } else {
    const tp = pos.clone();
    tp.y += 40;
    camPos.lerp(tp, Math.min(1, dt * 2));
    camera.position.copy(camPos);
    camera.lookAt(pos.x, 0, pos.z);
  }
}