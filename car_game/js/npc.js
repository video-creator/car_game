'use strict';
// ════════════════════════════════════════════
//  npc.js — NPC 生成、AI、碰撞、轮胎飞出
//  依赖：scene, player, npcs, NPC_COLORS, NPC_TYPES, NPC_SPEEDS,
//          buildNpcCar, getSignal, emitSmokePuff, spawnCrashFX,
//          spawnDebrisFX, spawnFireFX, playCrashSound, triggerScreenShake,
//          flashScreen, showCrashLabel, smashWindows, rnd, pick
// ════════════════════════════════════════════

const npcs = [];
let crashCount = 0;

const NPC_TYPES  = ['car', 'car', 'car', 'car', 'bus', 'truck'];
const NPC_SPEEDS = { car: [16, 28], bus: [9, 15], truck: [7, 12] };

// ── NPC 生成 ─────────────────────────────────
function spawnNPC() {
  const type  = pick(NPC_TYPES);
  const color = pick(NPC_COLORS);
  const mesh  = buildNpcCar(color, type);

  const isH = Math.random() > 0.5;
  let px, pz, dir;
  const laneOff = ROAD_W / 2 - 3.5;

  if (isH) {
    const rz = pick(H_ROADS);
    const goR = Math.random() > 0.5;
    dir = goR ? 'px' : 'nx';
    pz  = rz + (goR ? -laneOff : laneOff);
    px  = goR ? (-HALF - 25) : (HALF + 25);
  } else {
    const rx = pick(V_ROADS);
    const goD = Math.random() > 0.5;
    dir = goD ? 'pz' : 'nz';
    px  = rx + (goD ? laneOff : -laneOff);
    pz  = goD ? (-HALF - 25) : (HALF + 25);
  }

  switch (dir) {
    case 'px': mesh.rotation.y = 0; break;
    case 'nx': mesh.rotation.y = Math.PI; break;
    case 'pz': mesh.rotation.y = -Math.PI / 2; break;
    case 'nz': mesh.rotation.y =  Math.PI / 2; break;
  }
  mesh.position.set(px, 0, pz);
  scene.add(mesh);

  const [sMin, sMax] = NPC_SPEEDS[type];
  npcs.push({
    mesh, dir, type,
    len: mesh._len, wid: mesh._wid,
    speed: rnd(sMin, sMax),
    baseSpeed: rnd(sMin, sMax),
    state: 'normal',
    outTimer: 0,
    crazyChance: rnd(0.00003, 0.00012),
    wheelRot: 0,
    smokeT: 0,
    crashed: false, crashTimer: 0,
    rollAngle: 0,
    dx: 0, dz: 0,  // 冲量偏移
  });
}

function spawnInitialNPCs() {
  for (let i = 0; i < 22; i++) spawnNPC();
}

// ── NPC 更新 ─────────────────────────────────
function updateNPCs(dt) {
  const bound = HALF + 35;
  for (let i = npcs.length - 1; i >= 0; i--) {
    const v = npcs[i];
    if (v.crashed) {
      v.crashTimer += dt;
      v.smokeT += dt;
      if (v.smokeT > 0.12 && v.crashTimer < 20) {
        v.smokeT = 0;
        const p = v.mesh.position;
        emitSmokePuff(p.x, p.y + 2, p.z);
      }
      if (Math.abs(v.rollAngle) < Math.PI * 0.45) {
        v.rollAngle += dt * 1.2 * Math.sign(v.rollAngle || 0.1);
        v.mesh.rotation.z = v.rollAngle;
      }
      continue;
    }

    const p = v.mesh.position;
    if (p.x > bound || p.x < -bound || p.z > bound || p.z < -bound) {
      scene.remove(v.mesh); npcs.splice(i, 1); continue;
    }

    // 冲量衰减
    if (Math.abs(v.dx) > 0.01 || Math.abs(v.dz) > 0.01) {
      p.x += v.dx * dt * 60;
      p.z += v.dz * dt * 60;
      v.dx *= Math.max(0, 1 - dt * 5);
      v.dz *= Math.max(0, 1 - dt * 5);
    }

    // 失控状态
    if (v.state !== 'outofcontrol' && Math.random() < v.crazyChance * dt * 60) {
      v.state = 'outofcontrol';
      v.outTimer = rnd(2.5, 6);
      v.speed = v.baseSpeed * rnd(2.2, 3.2);
    }
    if (v.state === 'outofcontrol') {
      v.outTimer -= dt;
      if (v.outTimer <= 0) { v.state = 'normal'; v.speed = v.baseSpeed; }
      if (v.dir === 'px' || v.dir === 'nx') p.z += rnd(-0.12, 0.12);
      else p.x += rnd(-0.12, 0.12);
    } else {
      const sig = getSignal(p.x, p.z, v.dir);
      if ((sig.state === 'red' || sig.state === 'yellow') && sig.dist > 0 && sig.dist < v.len / 2 + 4) {
        v.speed = Math.max(0, v.speed - dt * 40);
        v.state = 'waiting';
      } else {
        const gap = _npcFrontGap(v);
        if (gap < v.len + 3) { v.speed = Math.max(0, v.speed - dt * 35); v.state = 'waiting'; }
        else { v.speed = Math.min(v.baseSpeed, v.speed + dt * 18); v.state = 'normal'; }
      }
    }

    const d = v.speed * dt;
    switch (v.dir) {
      case 'px': p.x += d; break; case 'nx': p.x -= d; break;
      case 'pz': p.z += d; break; case 'nz': p.z -= d; break;
    }

    // 轮子滚动
    if (v.speed > 0.5) {
      v.wheelRot += v.speed * dt * 0.62;
      if (v.mesh._wheelPivots)
        for (const wp of v.mesh._wheelPivots) wp.spin.rotation.z = v.wheelRot;
    }
    // 卡车排烟
    if (v.type === 'truck' && v.speed > 2) {
      v.smokeT = (v.smokeT || 0) + dt;
      if (v.smokeT > 0.4) {
        v.smokeT = 0;
        const ep = v.mesh.localToWorld(new THREE.Vector3(1.5, 5.5, -2.3));
        emitSmokePuff(ep.x, ep.y, ep.z);
      }
    }
  }
}

function _npcFrontGap(v) {
  const p = v.mesh.position;
  for (const o of npcs) {
    if (o === v || o.crashed || o.dir !== v.dir) continue;
    let dist = 9999, lat = 9999;
    if      (v.dir === 'px') { dist = o.mesh.position.x - p.x; lat = Math.abs(o.mesh.position.z - p.z); }
    else if (v.dir === 'nx') { dist = p.x - o.mesh.position.x; lat = Math.abs(o.mesh.position.z - p.z); }
    else if (v.dir === 'pz') { dist = o.mesh.position.z - p.z; lat = Math.abs(o.mesh.position.x - p.x); }
    else                     { dist = p.z - o.mesh.position.z; lat = Math.abs(o.mesh.position.x - p.x); }
    if (dist > 0 && dist < v.len + 3.5 && lat < v.wid * 0.9) return dist;
  }
  return 9999;
}

// ── 碰撞检测 ─────────────────────────────────
function checkPlayerCollisions() {
  if (player.crashed) return;
  for (const v of npcs) {
    if (v.crashed) continue;
    const vp = v.mesh.position;
    if (!_aabbOverlap(player.px, player.pz, player.mesh._len / 2 + 1, player.mesh._wid / 2 + 0.5,
      vp.x, vp.z, v.len / 2 + 0.5, v.wid / 2 + 0.4)) continue;
    // 碰撞能量 = 玩家速度 + NPC 速度
    const spd = Math.abs(player.speed) + v.speed;
    triggerCrash(player, v, spd);
  }
}

function checkNPCCollisions() {
  for (let i = 0; i < npcs.length; i++) {
    const a = npcs[i]; if (a.crashed) continue;
    for (let j = i + 1; j < npcs.length; j++) {
      const b = npcs[j]; if (b.crashed) continue;
      const pa = a.mesh.position, pb = b.mesh.position;
      if (!_aabbOverlap(pa.x, pa.z, a.len / 2, a.wid / 2, pb.x, pb.z, b.len / 2, b.wid / 2)) continue;
      if (a.state === 'outofcontrol' || b.state === 'outofcontrol') {
        const npcSpd  = rnd(20, 45);
        const npcLevel = getCrashLevel(npcSpd);
        crashNPC(a, npcSpd, npcLevel); crashNPC(b, npcSpd, npcLevel);
        const cx = (pa.x + pb.x) / 2, cz = (pa.z + pb.z) / 2;
        spawnCrashFX(cx, 2, cz, npcLevel >= 3);
        spawnDebrisFX(cx, 2, cz, npcLevel);
        if (npcLevel === 3) spawnFireFX(cx, 2, cz);
        playCrashSound(npcLevel);
        triggerScreenShake(npcLevel * 0.5, npcLevel * 0.08);
        crashCount++;
        document.getElementById('sCrash').textContent = crashCount;
      } else {
        const aAhead = (a.dir==='px'&&pa.x>pb.x)||(a.dir==='nx'&&pa.x<pb.x)||
                       (a.dir==='pz'&&pa.z>pb.z)||(a.dir==='nz'&&pa.z<pb.z);
        if (aAhead) b.speed = 0; else a.speed = 0;
      }
    }
  }
}

function _aabbOverlap(ax, az, ahx, ahz, bx, bz, bhx, bhz) {
  return Math.abs(ax - bx) < ahx + bhx && Math.abs(az - bz) < ahz + bhz;
}

// ── NPC 受损 ─────────────────────────────────
function crashNPC(v, speed, level) {
  if (v.crashed) return;
  v.crashed = true; v.speed = 0;
  v.rollAngle = (Math.random() > 0.5 ? 1 : -1) * rnd(0.04, level === 3 ? 0.25 : 0.1);
  scatterWheels(v, level || 2);
}

// ── 飞出轮胎 ─────────────────────────────────
const scatteredWheels = [];

function scatterWheels(vehicle, level) {
  const wheels = vehicle.mesh ? vehicle.mesh._wheels : vehicle._wheels;
  if (!wheels) return;
  const scatterProb = level === 3 ? 0.3 : level === 2 ? 0.6 : 0.85;
  wheels.forEach(w => {
    if (Math.random() > scatterProb) {
      const wp = new THREE.Vector3(); w.getWorldPosition(wp);
      if (vehicle.mesh) vehicle.mesh.remove(w); else vehicle.remove(w);
      scene.add(w); w.position.copy(wp);
      const ang = rnd(0, Math.PI * 2), spd = rnd(0.4, level === 3 ? 1.5 : 0.9);
      scatteredWheels.push({
        mesh: w,
        vx: Math.cos(ang) * spd, vy: rnd(0.4, 1.2), vz: Math.sin(ang) * spd,
        rx: rnd(0.05, 0.15), life: 180,
      });
    }
  });
}

function updateScatteredWheels() {
  for (let i = scatteredWheels.length - 1; i >= 0; i--) {
    const w = scatteredWheels[i];
    w.mesh.position.x += w.vx;
    w.mesh.position.y += w.vy;
    w.mesh.position.z += w.vz;
    w.vy -= 0.04;
    if (w.mesh.position.y < 0.3) { w.mesh.position.y = 0.3; w.vy *= -0.15; w.vx *= 0.88; w.vz *= 0.88; }
    w.mesh.rotation.x += w.rx;
    w.life--;
    if (w.life <= 0) { scene.remove(w.mesh); scatteredWheels.splice(i, 1); }
  }
}
