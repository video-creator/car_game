'use strict';
// ════════════════════════════════════════════
//  effects.js — 粒子、烟雾、碰撞特效、声音
//  依赖：scene, M, mkMat, rnd, pick, player, npcs, scatterWheels
// ════════════════════════════════════════════

// ── 粒子池 ─────────────────────────────────
const MAX_PARTICLES = 80;
const activeParticles = [];

const SPARK_GEO = new THREE.SphereGeometry(0.20, 4, 3);
const SMOKE_GEO = new THREE.SphereGeometry(1.0, 5, 4);
const SMOKE_POOL = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(SMOKE_GEO,
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5, depthWrite: false }));
  SMOKE_POOL.push({ mesh: m, inUse: false });
}

function _getSmokeMesh() {
  for (const s of SMOKE_POOL) if (!s.inUse) { s.inUse = true; s.mesh.visible = true; return s.mesh; }
  return null;
}
function _releaseSmokeMesh(m) {
  for (const s of SMOKE_POOL) if (s.mesh === m) { s.inUse = false; m.visible = false; scene.remove(m); return; }
  scene.remove(m);
}

// ── 公共粒子 ─────────────────────────────────
function spawnCrashFX(cx, cy, cz, big = false) {
  const sparksN = big ? 22 : 14;
  const smokeN  = big ?  3 :  2;
  const debrisN = big ?  7 :  4;

  for (let i = 0; i < sparksN; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const m = new THREE.Mesh(SPARK_GEO, M.spark.clone());
    m.material.color.setHex(pick([0xffee00, 0xff8800, 0xff4400, 0xffffff]));
    m.position.set(cx + rnd(-1, 1), cy + rnd(0, 1), cz + rnd(-1, 1));
    scene.add(m);
    const ang = rnd(0, Math.PI * 2), elv = rnd(0.3, 1.1), spd = rnd(0.5, big ? 2.8 : 1.8);
    activeParticles.push({
      mesh: m, type: 'spark',
      vx: Math.cos(ang) * spd * Math.cos(elv), vy: spd * Math.sin(elv), vz: Math.sin(ang) * spd * Math.cos(elv),
      life: 1, decay: rnd(0.045, 0.095),
    });
  }
  for (let i = 0; i < smokeN; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const m = _getSmokeMesh(); if (!m) break;
    m.position.set(cx + rnd(-1.5, 1.5), cy, cz + rnd(-1.5, 1.5));
    scene.add(m);
    activeParticles.push({
      mesh: m, type: 'smoke',
      vx: rnd(-0.02, 0.02), vy: rnd(0.06, 0.14), vz: rnd(-0.02, 0.02),
      life: 1, decay: rnd(0.012, 0.022),
    });
  }
  for (let i = 0; i < debrisN; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(rnd(0.2, big ? 1.0 : 0.6), rnd(0.1, 0.4), rnd(0.2, 0.6)),
      mkMat(pick([0x555555, 0x777777, 0x333333, 0xaa8844]))
    );
    m.position.set(cx + rnd(-2, 2), cy + 1, cz + rnd(-2, 2));
    scene.add(m);
    const ang = rnd(0, Math.PI * 2), spd = rnd(0.3, big ? 1.3 : 0.9);
    activeParticles.push({
      mesh: m, type: 'debris',
      vx: Math.cos(ang) * spd, vy: rnd(0.4, 1.4), vz: Math.sin(ang) * spd,
      rx: rnd(-0.12, 0.12), rz: rnd(-0.1, 0.1),
      life: 1, decay: rnd(0.005, 0.012),
    });
  }
}

function emitSmokePuff(x, y, z) {
  if (activeParticles.length >= MAX_PARTICLES) return;
  const m = _getSmokeMesh(); if (!m) return;
  m.position.set(x + rnd(-0.4, 0.4), y, z + rnd(-0.4, 0.4));
  scene.add(m);
  activeParticles.push({
    mesh: m, type: 'smoke',
    vx: rnd(-0.01, 0.01), vy: rnd(0.05, 0.12), vz: rnd(-0.01, 0.01),
    life: 0.8, decay: rnd(0.018, 0.028),
  });
}

function spawnFireFX(cx, cy, cz) {
  for (let i = 0; i < 20; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(rnd(0.3, 0.9), 5, 4),
      new THREE.MeshBasicMaterial({ color: pick([0xff4400, 0xff8800, 0xffcc00, 0xff2200]) })
    );
    m.position.set(cx + rnd(-1.2, 1.2), cy + rnd(0, 1.5), cz + rnd(-1.2, 1.2));
    scene.add(m);
    activeParticles.push({
      mesh: m, type: 'fire',
      vx: rnd(-0.04, 0.04), vy: rnd(0.08, 0.24), vz: rnd(-0.04, 0.04),
      life: 1, decay: rnd(0.025, 0.048),
    });
  }
}

function spawnDebrisFX(cx, cy, cz, level) {
  const count = level === 1 ? 5 : level === 2 ? 12 : 22;
  const speed = level === 1 ? 0.5 : level === 2 ? 1.1 : 2.2;
  const glassColors = [0x88ccff, 0xaaddff, 0xffffff];
  const metalColors = [0x888888, 0x666666, 0xaaaaaa, 0x555544];
  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const isGlass = Math.random() < 0.4;
    const geo = isGlass
      ? new THREE.BoxGeometry(rnd(0.1, 0.5), rnd(0.05, 0.2), rnd(0.1, 0.5))
      : new THREE.BoxGeometry(rnd(0.2, level === 3 ? 1.4 : 0.9), rnd(0.1, 0.5), rnd(0.2, 0.8));
    const col = isGlass ? pick(glassColors) : pick(metalColors);
    const mat = new THREE.MeshLambertMaterial({ color: col, transparent: isGlass, opacity: isGlass ? 0.7 : 1 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx + rnd(-2, 2), cy + 1, cz + rnd(-2, 2));
    scene.add(m);
    const ang = rnd(0, Math.PI * 2), spd = rnd(0.3, speed);
    activeParticles.push({
      mesh: m, type: 'debris',
      vx: Math.cos(ang) * spd, vy: rnd(0.4, 1.4), vz: Math.sin(ang) * spd,
      rx: rnd(-0.12, 0.12), rz: rnd(-0.1, 0.1),
      life: 1, decay: rnd(0.004, 0.010),
    });
  }
}

function updateParticles() {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.mesh.position.x += p.vx;
    p.mesh.position.y += p.vy;
    p.mesh.position.z += p.vz;
    if (p.type === 'spark') {
      p.vy -= 0.06;
      if (p.mesh.position.y < 0.2) { p.mesh.position.y = 0.2; p.vy *= -0.2; }
    }
    if (p.type === 'debris') {
      p.vy -= 0.04;
      if (p.mesh.position.y < 0.2) { p.mesh.position.y = 0.2; p.vy = 0; p.vx *= 0.85; p.vz *= 0.85; }
    }
    if (p.type === 'fire') {
      p.vy *= 0.97;
      const sc = Math.max(0.05, p.life);
      p.mesh.scale.setScalar(sc);
      if (p.mesh.material) p.mesh.material.color.setHSL(0.05 * p.life, 1.0, 0.4 + p.life * 0.3);
    }
    if (p.rx) p.mesh.rotation.x += p.rx;
    if (p.rz) p.mesh.rotation.z += p.rz;
    p.life -= p.decay;
    if (p.mesh.material.transparent) p.mesh.material.opacity = Math.max(0, p.life * 0.55);
    if (p.life <= 0) {
      if (p.type === 'smoke') _releaseSmokeMesh(p.mesh);
      else scene.remove(p.mesh);
      activeParticles.splice(i, 1);
    }
  }
}

// ── 碰撞等级 ─────────────────────────────────
function getCrashLevel(speed) {
  if (speed < 15) return 1;
  if (speed < 35) return 2;
  return 3;
}

// ── 屏幕震动 ─────────────────────────────────
let screenShakeTimer = 0, screenShakeIntensity = 0;
function triggerScreenShake(intensity, duration) {
  screenShakeIntensity = intensity;
  screenShakeTimer = duration;
}

// ── 碰撞闪屏 ─────────────────────────────────
function flashScreen(level) {
  const flash = document.getElementById('flash');
  const configs = [
    { bg: 'rgba(255,200,0,0.25)',  out: 'rgba(255,200,0,0)',   delay: 120, tr: '0.08s' },
    { bg: 'rgba(255,100,0,0.55)',  out: 'rgba(255,100,0,0)',   delay: 200, tr: '0.06s' },
    { bg: 'rgba(255,40,0,0.88)',   out: 'rgba(255,80,0,0)',    delay: 380, tr: '0.04s' },
  ];
  const cfg = configs[level - 1];
  flash.style.transition = `background ${cfg.tr}`;
  flash.style.background = cfg.bg;
  setTimeout(() => { flash.style.background = cfg.out; }, cfg.delay);
}

// ── 碰撞标签 ─────────────────────────────────
if (!document.getElementById('crashLabelStyle')) {
  const s = document.createElement('style');
  s.id = 'crashLabelStyle';
  s.textContent = `@keyframes crashLabelAnim{
    0%{opacity:1;transform:translateX(-50%) scale(1.4);}
    60%{opacity:1;transform:translateX(-50%) scale(1);}
    100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.9);}
  }`;
  document.head.appendChild(s);
}

function showCrashLabel(cx, cz, level) {
  const labels = ['轻微碰撞', '中等碰撞！', '💥 严重车祸！！'];
  const colors  = ['#ffe066', '#ff8c00', '#ff2200'];
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;z-index:60;pointer-events:none;
    font-size:${14 + level * 6}px;font-weight:900;
    color:${colors[level - 1]};text-shadow:0 0 8px rgba(0,0,0,.8);
    left:50%;top:${35 + level * 4}%;transform:translateX(-50%);
    animation:crashLabelAnim 0.9s ease-out forwards;`;
  el.textContent = labels[level - 1];
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── 音效 ─────────────────────────────────────
function playCrashSound(level) {
  if (level === 1) {
    noiseBurst(0.18, 0.35); synthSound(220, 0.15, 'square', 0.2);
  } else if (level === 2) {
    noiseBurst(0.35, 0.65); synthSound(120, 0.25, 'sawtooth', 0.35);
    setTimeout(() => noiseBurst(0.15, 0.3), 100);
  } else {
    noiseBurst(0.55, 1.0); synthSound(60, 0.4, 'sawtooth', 0.5);
    setTimeout(() => noiseBurst(0.3, 0.5), 80);
    setTimeout(() => noiseBurst(0.2, 0.4), 220);
    setTimeout(() => synthSound(80, 0.3, 'square', 0.25), 150);
  }
}

// ── 玻璃破碎（视觉）────────────────────────
function smashWindows(mesh, count) {
  let smashed = 0;
  mesh.traverse(child => {
    if (smashed >= count) return;
    if (child.isMesh && child.material && child.material.transparent) {
      child.material = child.material.clone();
      child.material.color.setHex(0x333333);
      child.material.opacity = rnd(0.5, 0.85);
      smashed++;
    }
  });
}

// ── 主碰撞触发（玩家 vs NPC）────────────────
function triggerCrash(plyr, npc, speed) {
  crashCount++;
  document.getElementById('sCrash').textContent = crashCount;

  const level = getCrashLevel(speed);
  const cx = (plyr.px + npc.mesh.position.x) / 2;
  const cz = (plyr.pz + npc.mesh.position.z) / 2;

  spawnCrashFX(cx, 2, cz, level >= 3);
  spawnDebrisFX(cx, 2, cz, level);
  if (level === 3) spawnFireFX(cx, 2, cz);
  playCrashSound(level);
  flashScreen(level);
  showCrashLabel(cx, cz, level);
  triggerScreenShake(level * 0.8, level * 0.12);

  // ── 伤害分级 ──────────────────────────────
  let bodyDmg, tireDmg, engineDmg;
  if (level === 1) {
    bodyDmg = rnd(8, 18); tireDmg = rnd(0, 5); engineDmg = rnd(0, 3);
    plyr.speed       *= 0.50;
    plyr.lateralSpeed = rnd(-3, 3);
    plyr.heading     += (Math.random() - 0.5) * 0.3;
  } else if (level === 2) {
    bodyDmg = rnd(25, 45); tireDmg = rnd(15, 35); engineDmg = rnd(8, 20);
    plyr.speed       *= 0.22;
    plyr.lateralSpeed = rnd(-6, 6);
    plyr.heading     += (Math.random() - 0.5) * 0.5;
    smashWindows(plyr.mesh, 1);
    const dx2 = npc.mesh.position.x - plyr.px, dz2 = npc.mesh.position.z - plyr.pz;
    const dist2 = Math.sqrt(dx2 * dx2 + dz2 * dz2) || 1;
    npc.dx = (dx2 / dist2) * 3.5; npc.dz = (dz2 / dist2) * 3.5;
  } else {
    bodyDmg = rnd(55, 100); tireDmg = rnd(50, 90); engineDmg = rnd(40, 80);
    plyr.speed       *= 0.04;
    plyr.lateralSpeed = rnd(-10, 10);
    plyr.heading     += (Math.random() - 0.5) * 0.8;
    smashWindows(plyr.mesh, 4);
    const dx3 = npc.mesh.position.x - plyr.px, dz3 = npc.mesh.position.z - plyr.pz;
    const dist3 = Math.sqrt(dx3 * dx3 + dz3 * dz3) || 1;
    npc.dx = (dx3 / dist3) * 6; npc.dz = (dz3 / dist3) * 6;
  }

  plyr.hp       = Math.max(0, plyr.hp       - bodyDmg);
  plyr.tireHP   = Math.max(0, plyr.tireHP   - tireDmg);
  plyr.engineHP = Math.max(0, plyr.engineHP - engineDmg);
  updateDamageHUD();

  const totalHP = plyr.hp + plyr.tireHP * 0.5 + plyr.engineHP * 0.3;
  if (level === 3 || totalHP < 30) {
    if (!plyr.crashed) {
      plyr.crashed = true;
      plyr.rollAngle = (Math.random() > 0.5 ? 1 : -1) * rnd(0.08, 0.18);
      scatterWheels(plyr, level);
    }
  } else if (level === 2 && plyr.hp < 35) {
    if (!plyr.crashed) {
      plyr.crashed = true;
      plyr.rollAngle = (Math.random() > 0.5 ? 1 : -1) * 0.08;
      scatterWheels(plyr, 1);
    }
  }

  crashNPC(npc, speed, level);
}
