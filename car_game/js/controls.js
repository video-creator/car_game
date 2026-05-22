'use strict';
// ════════════════════════════════════════════
//  controls.js — Arcade 车辆控制（参考 codeincomplete.com racer）
//
//  设计原则：彻底避免坐标系歧义
//  ─────────────────────────────────────────
//  player.heading = Three.js mesh.rotation.y 的实际值
//  车头方向 = 局部 +X（buildPlayerCar 里车头朝 +X）
//  mesh.rotation.y = heading 时，世界前向向量：
//    fwdX =  cos(heading)     ← 注意用 cos
//    fwdZ = -sin(heading)     ← 注意用 -sin
//  （Three.js rotation.y 旋转矩阵，局部+X在世界中为 (cos,0,-sin)）
//
//  验证（初始 heading=0, 车头朝世界+X）：
//    fwdX = cos(0) = 1, fwdZ = -sin(0) = 0 → 朝 +X ✓
//
//  右转(D) = heading 减小（顺时针）= heading -= steer
//  左转(A) = heading 增大（逆时针）= heading += steer
//
//  player.angle 保留作别名（= heading），兼容外部引用
// ════════════════════════════════════════════

const CTRL = {
  MAX_SPEED:        40.0,   // m/s (~144 km/h)
  REVERSE_MAX:       8.0,
  ACCEL:            14.0,   // m/s²（踩油门每秒加速 14 m/s，约 3 秒到顶速）
  BRAKE:            28.0,   // m/s²（刹车强度是加速的 2 倍）
  STEER_MAX:         0.032,
  STEER_RETURN:      0.08,
  STEER_SPEED_LIMIT: 0.45,
  LATERAL_GRIP:      0.88,
  EBRAKE_GRIP:       0.97,
};

// ── 玩家状态 ─────────────────────────────────
const player = {
  mesh:     null,
  px:       0,
  pz:       0,
  heading:  0,      // mesh.rotation.y 的实际值（直接赋给 mesh）
  get angle() { return this.heading; },  // 兼容外部 player.angle
  set angle(v) { this.heading = v; },

  speed:    0,      // 前向速度（标量，带符号）
  // 侧向速度（用于漂移/抓地）
  lateralSpeed: 0,

  steer:    0,      // 当前转向角（归一化，[-1,1]），lerp 平滑

  hp: 100, tireHP: 100, engineHP: 100,
  crashed: false,
  rollAngle: 0,
  crashTimer: 0,
  wheelRot: 0,

  // vx/vz 派生（兼容碰撞/特效代码）
  get vx() {
    return Math.cos(this.heading) * this.speed - Math.sin(this.heading) * this.lateralSpeed;
  },
  get vz() {
    return -Math.sin(this.heading) * this.speed - Math.cos(this.heading) * this.lateralSpeed;
  },
  // 允许直接写 vx/vz（翻车特效时用）
  _vxSet: null, _vzSet: null,
};

// ── 键盘 ──────────────────────────────────────
const keys = {};
const CAM_THIRD = 'third';
const CAM_FIRST = 'first';
let camMode = CAM_THIRD;

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyV') toggleCamMode();
  if (e.code === 'KeyF') triggerPlayerCrazy();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function toggleCamMode() {
  camMode = camMode === CAM_THIRD ? CAM_FIRST : CAM_THIRD;
  document.getElementById('sView').textContent = camMode === CAM_THIRD ? '第三人称' : '第一人称';
  const wHud = document.getElementById('wheel-hud');
  camMode === CAM_FIRST ? wHud.classList.add('show') : wHud.classList.remove('show');
}

function triggerPlayerCrazy() {
  if (!player.crashed) {
    player.speed += 18;
    player.lateralSpeed += rnd(-6, 6);
  }
}

// ── 主更新 ───────────────────────────────────
let _smokeInterval = 0;

function updatePlayer(dt) {
  if (player.crashed) { _updateCrashedPlayer(dt); return; }

  const W     = keys['KeyW'] || keys['ArrowUp'];
  const S     = keys['KeyS'] || keys['ArrowDown'];
  const A     = keys['KeyA'] || keys['ArrowLeft'];
  const D     = keys['KeyD'] || keys['ArrowRight'];
  const SPACE = keys['Space'];

  // ── 1. 加速 / 刹车 ──────────────────────────
  // ACCEL/BRAKE 单位是 m/s²，直接 * dt 就是每帧加的速度
  if (W) {
    player.speed += CTRL.ACCEL * dt;
  } else if (S) {
    if (player.speed > 0.5) {
      player.speed -= CTRL.BRAKE * dt;
    } else {
      player.speed -= CTRL.ACCEL * 0.6 * dt; // 倒车
    }
  }

  if (SPACE && player.speed > 0) {
    player.speed -= CTRL.BRAKE * 2.5 * dt;
  }

  // 滚动阻力（模拟松油门自然慢滑）
  // 每帧 * 0.995 @60fps ≈ 每秒保留 74%
  player.speed *= Math.pow(0.995, dt * 60);

  // 速度限制
  player.speed = Math.max(-CTRL.REVERSE_MAX, Math.min(CTRL.MAX_SPEED, player.speed));
  if (Math.abs(player.speed) < 0.05) player.speed = 0;

  // ── 2. 转向 ──────────────────────────────────
  // 速度因子：速度越高转向越小（但不为0），让高速稳定
  const absSpd = Math.abs(player.speed);
  const steerFactor = Math.min(1, absSpd / 5) *   // 低速接近0不转
                      (1 - Math.min(CTRL.STEER_SPEED_LIMIT, absSpd / CTRL.MAX_SPEED) * 0.6);

  const maxSteer = CTRL.STEER_MAX * steerFactor;

  if (A) {
    // A = 左转 = heading 增大（逆时针）
    player.steer = Math.min(player.steer + 0.08 * dt * 60, 1);
  } else if (D) {
    // D = 右转 = heading 减小（顺时针）
    player.steer = Math.max(player.steer - 0.08 * dt * 60, -1);
  } else {
    // 回正（指数衰减）
    player.steer *= Math.pow(1 - CTRL.STEER_RETURN, dt * 60);
    if (Math.abs(player.steer) < 0.01) player.steer = 0;
  }

  // 倒车时左右反转（方向盘感觉）
  const steerDir = player.speed >= 0 ? 1 : -1;
  player.heading += player.steer * maxSteer * steerDir;

  // ── 3. 侧向速度（漂移/抓地）────────────────────
  const grip = (SPACE && absSpd > 3) ? CTRL.EBRAKE_GRIP : CTRL.LATERAL_GRIP;
  player.lateralSpeed *= Math.pow(grip, dt * 60);
  if (Math.abs(player.lateralSpeed) < 0.05) player.lateralSpeed = 0;

  // ── 4. 移动位置 ───────────────────────────────
  // 世界前向：车头朝局部 +X → 世界 (cos(heading), 0, -sin(heading))
  const fwdWorldX =  Math.cos(player.heading);
  const fwdWorldZ = -Math.sin(player.heading);
  // 世界右向：右手边 = (sin(heading), 0, cos(heading))
  const rgtWorldX =  Math.sin(player.heading);
  const rgtWorldZ =  Math.cos(player.heading);

  const prevPx = player.px, prevPz = player.pz;
  player.px += (fwdWorldX * player.speed + rgtWorldX * player.lateralSpeed) * dt;
  player.pz += (fwdWorldZ * player.speed + rgtWorldZ * player.lateralSpeed) * dt;

  // ── 5. 道路约束 ───────────────────────────────
  if (!isOnRoadInf(player.px, player.pz)) {
    const c = snapToRoadInf(player.px, player.pz, prevPx, prevPz);
    player.px = c.px; player.pz = c.pz;
    if (!isOnRoadInf(player.px, player.pz)) { player.px = prevPx; player.pz = prevPz; }
    player.speed        *= 0.4;
    player.lateralSpeed *= 0.4;
  }

  // ── 6. 视觉侧倾（左转向左倾）────────────────────
  // steer>0=左转，车身应向右倾（rollAngle为负）
  const targetRoll = -player.steer * Math.min(1, absSpd / 15) * 0.08;
  player.rollAngle += (targetRoll - player.rollAngle) * Math.min(1, dt * 6);

  // ── 引擎声 ────────────────────────────────────
  engineSoundTimer += dt;
  if (engineSoundTimer > 0.13 && absSpd > 1.0) {
    engineSoundTimer = 0;
    playEngineSound(absSpd);
  }

  _updatePlayerMesh(dt);
}

// ── 翻车 ──────────────────────────────────────
let _crashVx = 0, _crashVz = 0;

function _updateCrashedPlayer(dt) {
  player.crashTimer += dt;
  const dir = Math.sign(player.rollAngle || 0.3);
  player.rollAngle = dir * Math.min(Math.abs(player.rollAngle) + dt * 1.4, Math.PI * 0.52);

  // 翻车时用独立速度
  _crashVx *= Math.max(0, 1 - dt * 2.8);
  _crashVz *= Math.max(0, 1 - dt * 2.8);
  player.speed *= Math.max(0, 1 - dt * 2.8);

  _smokeInterval += dt;
  if (_smokeInterval > 0.5 && player.crashTimer < 6) {
    _smokeInterval = 0;
    emitSmokePuff(player.px, 2, player.pz);
  }

  player.px += _crashVx * dt;
  player.pz += _crashVz * dt;
  _updatePlayerMesh(dt);
}

// 触发翻车时保存速度
const _origTriggerCrash = typeof triggerCrash !== 'undefined' ? triggerCrash : null;

// ── 网格同步 ──────────────────────────────────
function _updatePlayerMesh(dt) {
  player.mesh.position.set(player.px, 0, player.pz);
  // heading 直接就是 mesh.rotation.y（无偏移！）
  player.mesh.rotation.y = player.heading;
  player.mesh.rotation.z = player.rollAngle;

  if (!player.mesh._wheelPivots) return;

  // 前轮视觉偏转：steer>0=左转 → pivot.rotation.y 正值=逆时针=左偏 ✓
  const steerVis = player.steer * 0.38;
  for (const wp of player.mesh._wheelPivots) {
    if (wp.front) wp.pivot.rotation.y = steerVis;
  }

  // 轮子滚动：绕 Z 轴（车身局部坐标）
  if (Math.abs(player.speed) > 0.1) {
    player.wheelRot += player.speed * dt * 0.68;
    for (const wp of player.mesh._wheelPivots) wp.spin.rotation.z = player.wheelRot;
  }

  // 方向盘
  if (player.mesh._steeringWheel)
    player.mesh._steeringWheel.rotation.z = player.steer * 14;
}

// ════════════════════════════════════════════
//  摄像机
// ════════════════════════════════════════════
let orbitOffset = 0;   // 鼠标拖动偏移（弧度）
let orbitDist   = 22;
let isDrag = false, lmx = 0;
let _camHeading = 0;
let _camInit    = false;

renderer.domElement.addEventListener('mousedown', e => { isDrag = true; lmx = e.clientX; });
window.addEventListener('mouseup',    ()  => { isDrag = false; });
window.addEventListener('mousemove',  e  => {
  if (!isDrag || camMode !== CAM_THIRD) return;
  orbitOffset -= (e.clientX - lmx) * 0.007;
  lmx = e.clientX;
});
renderer.domElement.addEventListener('wheel', e => {
  orbitDist = Math.max(8, Math.min(80, orbitDist + e.deltaY * 0.06));
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

const _camLookAt = new THREE.Vector3();

function updateCamera(dt) {
  if (!_camInit) { _camHeading = player.heading + orbitOffset; _camInit = true; }

  if (camMode === CAM_THIRD) {
    // 摄像机追踪 heading，最短路径 lerp
    const target = player.heading + orbitOffset;
    let delta = target - _camHeading;
    while (delta >  Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    _camHeading += delta * Math.min(1, dt * 6.0);

    const absSpd   = Math.abs(player.speed);
    const dist     = orbitDist * (1 + Math.min(0.3, absSpd / 120));
    const back     = dist * 0.88;
    const up       = dist * 0.30 + 2.5;

    // 摄像机位置：在 heading 后方
    const camX = player.px - Math.cos(_camHeading) * back;
    const camZ = player.pz + Math.sin(_camHeading) * back;

    const posLerp = Math.min(1, dt * 7.5);
    camera.position.x += (camX - camera.position.x) * posLerp;
    camera.position.y += (up   - camera.position.y) * Math.min(1, dt * 4.5);
    camera.position.z += (camZ - camera.position.z) * posLerp;

    // 焦点：稍微往前看
    const lookAhead = Math.min(10, absSpd * 0.25);
    const lx = player.px + Math.cos(player.heading) * lookAhead;
    const lz = player.pz - Math.sin(player.heading) * lookAhead;
    _camLookAt.set(lx, 1.5, lz);
    camera.lookAt(_camLookAt);

  } else {
    // 第一人称
    const headPos = new THREE.Vector3(1.18, 2.25, 0.28);
    player.mesh.localToWorld(headPos);
    camera.position.copy(headPos);
    const fx =  Math.cos(player.heading);
    const fz = -Math.sin(player.heading);
    camera.lookAt(new THREE.Vector3(headPos.x + fx * 20, headPos.y - 0.05, headPos.z + fz * 20));
  }
}
