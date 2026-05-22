'use strict';
// ════════════════════════════════════════════
//  vehicles.js — 轮子/玩家车/NPC 建模
//  依赖：materials.js (M, mkMat, mkPaint, mkStd, mkEmissive, mkGlass)
// ════════════════════════════════════════════

// ── 圆角车顶几何（顶部顶点轻微弧形）─────────
function makeRoundedCabin(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > h * 0.3) {
      const t = (y - h * 0.3) / (h * 0.7);
      pos.setX(i, pos.getX(i) * (1 - t * 0.14));
      pos.setZ(i, pos.getZ(i) * (1 - t * 0.10));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// ── 精细轮子 ─────────────────────────────────
// 坐标系说明：
//   CylinderGeometry 默认轮轴 = Y（竖立）
//   车身坐标系：X=前后, Y=上, Z=左右
//   车轮装在 ±Z 两侧 → 轮轴应该 = Z 方向
//   绕 X 轴转 PI/2 → Y 轴变成 Z 轴 ✔，轮面朝 X（前后）
//   滚动：车向 X 前进 → 绕 Z 轴转 → spin.rotation.z ✔
function makeWheelSpin(r, w) {
  const g = new THREE.Group();

  // 轮胎（绕 X 轴转 PI/2：Y 轴 → Z 轴，轮面朝 X）
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 20), M.tire);
  tire.rotation.x = Math.PI / 2;
  g.add(tire);

  // 轮胎侧壁纹路环（Torus 默认在 XY 平面，圆环面朝 Z）
  // 轮面朝 X → Torus 也要绕 X 轴转 PI/2 让圆环面朝 X
  for (const sz of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.88, w * 0.042, 6, 20), mkStd(0x1a1a1a, 0, 0.98));
    rim.rotation.x = Math.PI / 2;
    rim.position.z = sz * (w * 0.5 - 0.01);
    g.add(rim);
  }

  // 轮毂盘（同轮胎）
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.44, r * 0.44, w + 0.04, 16), M.hub);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  // 5 辐条（在 XY 平面内展开，轮面朝 X）
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 0.85, r * 0.10, w * 0.52), mkStd(0x888888, 0.8, 0.25));
    spoke.rotation.z = a;
    g.add(spoke);
  }

  // 中心螺母盖
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.14, w + 0.06, 8), mkStd(0xaaaaaa, 1.0, 0.1));
  cap.rotation.x = Math.PI / 2;
  g.add(cap);

  return g;
}

function makeWheel(r, w) {
  const pivot = new THREE.Group();
  const spin = makeWheelSpin(r, w);
  pivot.add(spin);
  pivot._spin = spin;
  return pivot;
}

// ── 方向盘 ────────────────────────────────────
function makeSteeringWheel() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.038, 8, 24), M.steeringWheel));
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.52, 0.055), M.steeringWheel);
    spoke.rotation.z = i * Math.PI * 2 / 3;
    g.add(spoke);
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), M.steeringWheel));
  return g;
}

// ════════════════════════════════════════════
//  玩家车（深蓝运动轿车）
// ════════════════════════════════════════════
function buildPlayerCar() {
  const g = new THREE.Group();
  const paint = mkPaint(0x1e6fdb);
  const darkPaint = mkPaint(0x0a1a3a);
  const darkTrim = mkStd(0x111111, 0.1, 0.88);

  // 车身下部（宽底盘）
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 2.95), paint);
  body.position.set(0, 0.85, 0);
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // 车顶舱室（圆角）
  const cabin = new THREE.Mesh(makeRoundedCabin(3.05, 1.18, 2.6), paint);
  cabin.position.set(-0.1, 2.08, 0);
  cabin.castShadow = true;
  g.add(cabin);

  // 引擎盖（稍微有坡度）
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.11, 2.88), paint);
  hood.position.set(1.5, 1.48, 0); hood.rotation.z = -0.03;
  hood.castShadow = true;
  g.add(hood);

  // 引擎盖中央凸起脊线
  { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.28), mkPaint(0x1560cc)); m.position.set(1.5, 1.56, 0); g.add(m); }

  // 前挡风玻璃
  const wsF = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 2.52), M.glass);
  wsF.position.set(1.36, 2.02, 0); wsF.rotation.z = 0.24;
  g.add(wsF);

  // 后挡风玻璃
  const wsR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.0, 2.52), M.glass);
  wsR.position.set(-1.52, 2.02, 0); wsR.rotation.z = -0.22;
  g.add(wsR);

  // 侧窗 2 × 前后
  for (const sz of [-1, 1]) {
    for (const [wx, ww] of [[0.62, 1.08], [-0.75, 1.05]]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.78, 0.05), M.glass);
      sw.position.set(wx, 2.1, sz * 1.35);
      g.add(sw);
    }
  }

  // 前保险杠
  const bF = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 2.95), darkTrim);
  bF.position.set(2.82, 0.55, 0); g.add(bF);

  // 进气格栅中央
  { const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.27, 1.55), mkStd(0x080808, 0, 1)); m.position.set(2.86, 0.62, 0); g.add(m); }
  for (let gi = 0; gi < 4; gi++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.038, 1.5), mkStd(0x333333, 0.5, 0.5));
    bar.position.set(2.87, 0.50 + gi * 0.068, 0);
    g.add(bar);
  }

  // 后保险杠
  const bR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 2.95), darkTrim);
  bR.position.set(-2.82, 0.55, 0); g.add(bR);

  // 前大灯（LED 条风格）
  for (const sz of [-1, 1]) {
    const hlBox = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.88), darkTrim);
    hlBox.position.set(2.82, 1.08, sz * 0.98); g.add(hlBox);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.75), M.hlFront);
    hl.position.set(2.85, 1.1, sz * 0.98); g.add(hl);
    // DRL 日行灯
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.038, 0.84), mkEmissive(0xffffff, 1.0));
    drl.position.set(2.86, 1.22, sz * 0.98); g.add(drl);
  }

  // 后尾灯
  for (const sz of [-1, 1]) {
    const tlBox = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.88), darkTrim);
    tlBox.position.set(-2.82, 1.08, sz * 0.98); g.add(tlBox);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.75), M.hlRear);
    tl.position.set(-2.85, 1.1, sz * 0.98); g.add(tl);
    // 倒车灯
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.28), mkEmissive(0xffffff, 0.7));
    bl.position.set(-2.86, 1.05, sz * 0.38); g.add(bl);
  }

  // 侧裙（门槛条）
  for (const sz of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.14, 0.09), darkPaint);
    skirt.position.set(0, 0.37, sz * 1.52); g.add(skirt);
  }

  // 腰线
  for (const sz of [-1, 1]) {
    const waist = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.055, 0.055), mkStd(0x1a5ac0, 0.3, 0.4));
    waist.position.set(0, 1.5, sz * 1.51); g.add(waist);
  }

  // 后视镜
  for (const sz of [-1, 1]) {
    const mirBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.04), darkPaint);
    mirBase.position.set(0.78, 1.78, sz * 1.56); g.add(mirBase);
    const mirFace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.03), mkStd(0x223366, 0.9, 0.05));
    mirFace.position.set(0.78, 1.78, sz * 1.58); g.add(mirFace);
  }

  // 天线
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.008, 0.55, 5), mkStd(0x333333, 0.5, 0.4));
  ant.position.set(-0.6, 2.72, -1.0); g.add(ant);

  // 排气管（双）
  for (const sz of [-0.55, 0.55]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.28, 8), M.chrome);
    ex.rotation.x = Math.PI / 2; ex.position.set(-2.74, 0.38, sz); g.add(ex);
    const exIn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.30, 8), mkStd(0x111111, 0, 0.98));
    exIn.rotation.x = Math.PI / 2; exIn.position.set(-2.76, 0.38, sz); g.add(exIn);
  }

  // 赛车条纹
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.055, 0.45), mkStd(0xffffff, 0, 0.5));
  stripe.position.set(0, 2.64, 0); g.add(stripe);

  // 四轮
  const wPos = [
    { x: 1.9, z: 1.55, front: true },
    { x: 1.9, z: -1.55, front: true },
    { x: -1.9, z: 1.55, front: false },
    { x: -1.9, z: -1.55, front: false },
  ];
  g._wheelPivots = [];
  for (const wp of wPos) {
    const wh = makeWheel(0.78, 0.55);
    wh.position.set(wp.x, 0.82, wp.z);
    wh.castShadow = true;
    g.add(wh);
    g._wheelPivots.push({ pivot: wh, spin: wh._spin, front: wp.front });
  }
  g._wheels = g._wheelPivots.map(w => w.pivot);

  // 方向盘
  const sw = makeSteeringWheel();
  sw.position.set(0.9, 2.08, 0.38); sw.rotation.x = Math.PI / 5;
  g.add(sw);
  g._steeringWheel = sw;

  // 仪表台
  { const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.38, 1.82), mkStd(0x111111, 0.1, 0.8)); m.position.set(1.1, 1.62, 0); g.add(m); }

  g._len = 5.4; g._wid = 2.95;
  return g;
}

// ════════════════════════════════════════════
//  NPC 车辆颜色表
// ════════════════════════════════════════════
const NPC_COLORS = [
  0xe74c3c, 0xc0392b, 0x27ae60, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xe91e63, 0xff5722, 0xffd700, 0x00bcd4, 0x795548, 0x607d8b,
  0x16a085, 0x8e44ad, 0xd35400, 0x2980b9, 0x5dade2, 0x58d68d,
];

// ════════════════════════════════════════════
//  NPC 车辆（轿车/公交/卡车）
// ════════════════════════════════════════════
function buildNpcCar(color, type) {
  const g = new THREE.Group();
  const paint = mkPaint(color);
  const darkTrim = mkStd(0x111111, 0.1, 0.88);
  let len, wid;

  if (type === 'bus') {
    // ── 公交车 ──────────────────────────────
    len = 10; wid = 4.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 3.4, wid), paint);
    body.position.set(0, 2.0, 0); body.castShadow = true; g.add(body);
    // 车顶白色
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.28, wid - 0.25), mkStd(0xf0f0f0, 0, 0.8));
    roof.position.set(0, 3.94, 0); g.add(roof);
    // 前挡风
    const wsF = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.0, 3.72), M.glass);
    wsF.position.set(4.98, 2.1, 0); wsF.rotation.z = 0.08; g.add(wsF);
    // 侧窗（6格）
    for (const sz of [-1, 1]) for (let i = 0; i < 6; i++) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.94, 0.06), M.glass);
      sw.position.set(-3.5 + i * 1.5, 2.75, sz * 2.27); g.add(sw);
    }
    // 前门
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.06), M.glass);
    door.position.set(3.5, 1.8, 2.28); g.add(door);
    // 灯
    for (const sz of [-1.3, 1.3]) {
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.4, 0.9), M.hlFront); m.position.set(5.0, 1.6, sz); g.add(m); }
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.4, 0.9), M.hlRear); m.position.set(-5.0, 1.6, sz); g.add(m); }
    }
    // 保险杠
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, wid + 0.1), darkTrim); m.position.set(5.1, 0.55, 0); g.add(m); }
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, wid + 0.1), darkTrim); m.position.set(-5.1, 0.55, 0); g.add(m); }
    // 轮子
    g._wheels = []; g._wheelPivots = [];
    for (const wp of [{ x: 3.5, z: 2.5 }, { x: 3.5, z: -2.5 }, { x: -3.5, z: 2.5 }, { x: -3.5, z: -2.5 }]) {
      const wh = makeWheel(1.05, 0.66);
      wh.position.set(wp.x, 1.05, wp.z); g.add(wh);
      g._wheels.push(wh); g._wheelPivots.push({ pivot: wh, spin: wh._spin, front: false });
    }

  } else if (type === 'truck') {
    // ── 卡车 ──────────────────────────────────
    len = 11.3; wid = 4.2;
    // 货箱（铝合金板）
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, wid), mkStd(0xd0d0d0, 0.6, 0.5));
    cargo.position.set(-2.8, 2.3, 0); cargo.castShadow = true; g.add(cargo);
    // 货箱竖向加强筋
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.88, wid + 0.04), mkStd(0xb8b8b8, 0.7, 0.4));
      rib.position.set(-5.8 + i * 1.2, 2.3, 0); g.add(rib);
    }
    // 驾驶室
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.5, wid), paint);
    cab.position.set(3.4, 2.05, 0); cab.castShadow = true; g.add(cab);
    // 驾驶室顶灯条
    { const m = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, wid - 0.1), mkEmissive(0xffffcc, 0.6)); m.position.set(3.4, 3.86, 0); g.add(m); }
    // 前挡风
    const wsF = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.0, 3.62), M.glass);
    wsF.position.set(5.18, 2.54, 0); wsF.rotation.z = 0.09; g.add(wsF);
    // 侧窗
    for (const sz of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.0, 0.06), M.glass);
      sw.position.set(3.2, 2.85, sz * 2.13); g.add(sw);
    }
    // 竖式排气管（双）
    for (const sz of [-1.5, 1.5]) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 2.2, 8), mkStd(0x888888, 0.7, 0.3));
      ex.position.set(2.0, 4.5, sz); g.add(ex);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 8), mkStd(0x777777, 0.5, 0.5));
      cap.position.set(2.0, 5.7, sz); g.add(cap);
    }
    // 灯
    for (const sz of [-1.3, 1.3]) {
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 1.1), M.hlFront); m.position.set(5.24, 1.7, sz); g.add(m); }
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 1.1), M.hlRear); m.position.set(-6.74, 1.7, sz); g.add(m); }
    }
    // 保险杠
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, wid + 0.1), darkTrim); m.position.set(5.38, 0.65, 0); g.add(m); }
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, wid + 0.1), darkTrim); m.position.set(-6.92, 0.65, 0); g.add(m); }
    // 轮子（6个）
    g._wheels = []; g._wheelPivots = [];
    for (const wp of [{ x: 3.8, z: 2.4 }, { x: 3.8, z: -2.4 }, { x: 0.2, z: 2.5 }, { x: 0.2, z: -2.5 }, { x: -3.0, z: 2.5 }, { x: -3.0, z: -2.5 }]) {
      const wh = makeWheel(1.18, 0.76);
      wh.position.set(wp.x, 1.18, wp.z); g.add(wh);
      g._wheels.push(wh); g._wheelPivots.push({ pivot: wh, spin: wh._spin, front: false });
    }

  } else {
    // ── 普通轿车 ──────────────────────────────
    len = 5.2; wid = 2.82;
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, wid), paint);
    body.position.set(0, 0.82, 0); body.castShadow = true; g.add(body);
    const cabin = new THREE.Mesh(makeRoundedCabin(2.72, 1.08, wid - 0.28), paint);
    cabin.position.set(-0.2, 2.0, 0); cabin.castShadow = true; g.add(cabin);
    // 前后挡风
    const wsF = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.96, wid - 0.38), M.glass);
    wsF.position.set(1.32, 1.98, 0); wsF.rotation.z = 0.20; g.add(wsF);
    const wsR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, wid - 0.38), M.glass);
    wsR.position.set(-1.52, 1.98, 0); wsR.rotation.z = -0.18; g.add(wsR);
    // 侧窗
    for (const sz of [-1, 1]) for (const [wx, ww] of [[0.58, 0.96], [-0.75, 0.96]]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.72, 0.05), M.glass);
      sw.position.set(wx, 2.04, sz * (wid / 2 - 0.12)); g.add(sw);
    }
    // 保险杠
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, wid + 0.08), darkTrim); m.position.set(len / 2 + 0.02, 0.52, 0); g.add(m); }
    { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, wid + 0.08), darkTrim); m.position.set(-(len / 2 + 0.02), 0.52, 0); g.add(m); }
    // 灯
    for (const sz of [-0.88, 0.88]) {
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.23, 0.72), M.hlFront); m.position.set(len / 2, 0.97, sz); g.add(m); }
      { const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.23, 0.72), M.hlRear); m.position.set(-len / 2, 0.97, sz); g.add(m); }
    }
    // 腰线
    for (const sz of [-1, 1]) {
      { const m = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.05, 0.05), mkStd(color, 0.4, 0.3)); m.position.set(0, 1.44, sz * (wid / 2)); g.add(m); }
    }
    // 轮子
    g._wheels = []; g._wheelPivots = [];
    for (const wp of [{ x: 1.74, z: 1.52 }, { x: 1.74, z: -1.52 }, { x: -1.74, z: 1.52 }, { x: -1.74, z: -1.52 }]) {
      const wh = makeWheel(0.76, 0.52);
      wh.position.set(wp.x, 0.76, wp.z); g.add(wh);
      g._wheels.push(wh); g._wheelPivots.push({ pivot: wh, spin: wh._spin, front: false });
    }
  }

  g._len = len; g._wid = wid; g._type = type || 'car';
  return g;
}
