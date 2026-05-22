'use strict';
// ════════════════════════════════════════════
//  city.js — 无限城市区块生成 + 道路工具
//  依赖：scene, M, mkMat（来自 scene/materials）
// ════════════════════════════════════════════

const ROAD_SPACING = 60;
const ROAD_W = 16;
const HALF = 180;  // 用于 NPC 生成范围
const CHUNK_SIZE = ROAD_SPACING;
const CHUNK_VIEW = 3;

// ── NPC 生成用的道路列表（兼容旧代码）────────
const H_ROADS = [], V_ROADS = [];
for (let i = 0; i < 7; i++) {
  H_ROADS.push(-HALF + i * ROAD_SPACING);
  V_ROADS.push(-HALF + i * ROAD_SPACING);
}

// ── 无限道路检测 ──────────────────────────────
function isOnRoadInf(px, pz) {
  const hw = ROAD_W * 0.5 + 1.0;
  const mz = ((pz % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  if (mz < hw || mz > ROAD_SPACING - hw) return true;
  const mx = ((px % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  if (mx < hw || mx > ROAD_SPACING - hw) return true;
  return false;
}

function snapToRoadInf(px, pz, prevPx, prevPz) {
  const hw = ROAD_W * 0.5 - 1.8;
  const pmz = ((prevPz % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  const pmx = ((prevPx % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  const onHPrev = pmz < ROAD_W * 0.5 + 1.5 || pmz > ROAD_SPACING - ROAD_W * 0.5 - 1.5;
  const onVPrev = pmx < ROAD_W * 0.5 + 1.5 || pmx > ROAD_SPACING - ROAD_W * 0.5 - 1.5;
  if (onHPrev) {
    const roadZ = Math.round(prevPz / ROAD_SPACING) * ROAD_SPACING;
    return { px, pz: Math.max(roadZ - hw, Math.min(roadZ + hw, pz)) };
  }
  if (onVPrev) {
    const roadX = Math.round(prevPx / ROAD_SPACING) * ROAD_SPACING;
    return { px: Math.max(roadX - hw, Math.min(roadX + hw, px)), pz };
  }
  return { px: prevPx, pz: prevPz };
}

// 旧名别名
function isOnRoad(px, pz) { return isOnRoadInf(px, pz); }
function snapToRoad(px, pz, pp, ppz) { return snapToRoadInf(px, pz, pp, ppz); }

// ── 区块系统 ─────────────────────────────────
const chunks = new Map();
const BLD_COLORS = [
  0x2c3e50, 0x1a252f, 0x2980b9, 0x8e44ad, 0x1e3a5f,
  0x4a235a, 0x154360, 0x922b21, 0x1b4f72, 0x512e5f,
  0x0e6655, 0x1a5276, 0x6e2f00, 0x212f3d,
];
// 窗户材质（发光的办公楼效果）
const windowMat = new THREE.MeshStandardMaterial({
  color: 0x88bbff, emissive: new THREE.Color(0x2244aa),
  emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.1,
});

function chunkRand(cx, cz, salt = 0) {
  let h = Math.abs(cx * 374761393 + cz * 668265263 + salt * 2246822519);
  h ^= (h >>> 13); h = Math.imul(h, 1540483477); h ^= (h >>> 15);
  return ((h >>> 0) % 10000) / 10000;
}

function buildChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunks.has(key)) return;

  const g = new THREE.Group();
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;

  // ── 地面 ────────────────────────────────────
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE), M.ground);
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.set(ox + CHUNK_SIZE / 2, -0.1, oz + CHUNK_SIZE / 2);
  gnd.receiveShadow = true;
  g.add(gnd);

  // ── 水平道路（H 路，沿 Z=oz） ─────────────
  const hr = new THREE.Mesh(new THREE.BoxGeometry(CHUNK_SIZE + ROAD_W, 0.21, ROAD_W), M.asphalt);
  hr.position.set(ox + CHUNK_SIZE / 2, 0.1, oz);
  hr.receiveShadow = true;
  g.add(hr);

  // H 路中央虚线
  for (let dx = 0; dx < CHUNK_SIZE; dx += 14) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.22), M.lineY);
    d.rotation.x = -Math.PI / 2;
    d.position.set(ox + dx + 4, 0.22, oz);
    g.add(d);
  }
  // H 路边线
  for (const s of [-1, 1]) {
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE + ROAD_W, 0.22), M.lineW);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(ox + CHUNK_SIZE / 2, 0.22, oz + s * ROAD_W * 0.5);
    g.add(ew);
  }

  // ── 垂直道路（V 路，沿 X=ox） ─────────────
  const vr = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.21, CHUNK_SIZE + ROAD_W), M.asphalt);
  vr.position.set(ox, 0.1, oz + CHUNK_SIZE / 2);
  vr.receiveShadow = true;
  g.add(vr);

  // V 路中央虚线
  for (let dz = 0; dz < CHUNK_SIZE; dz += 14) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 8), M.lineY);
    d.rotation.x = -Math.PI / 2;
    d.position.set(ox, 0.22, oz + dz + 4);
    g.add(d);
  }

  // ── 交叉口 ────────────────────────────────
  const intr = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.22, ROAD_W), M.intBox);
  intr.position.set(ox, 0.11, oz);
  intr.receiveShadow = true;
  g.add(intr);

  // ── 人行道 ────────────────────────────────
  const swW = (CHUNK_SIZE - ROAD_W) * 0.5;
  for (const [offX, offZ] of [
    [ox + CHUNK_SIZE * 0.75, oz + CHUNK_SIZE / 2],
    [ox + CHUNK_SIZE * 0.75, oz + CHUNK_SIZE / 2],
  ]) {
    // 只做简化人行道（两块）
  }
  const swMat = M.sidewalk;
  // 东侧人行道
  {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(swW * 0.9, 0.18, CHUNK_SIZE - ROAD_W), swMat);
    sw.position.set(ox + ROAD_W * 0.5 + swW * 0.5, 0.09, oz + CHUNK_SIZE / 2);
    sw.receiveShadow = true;
    g.add(sw);
  }
  // 南侧人行道
  {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(CHUNK_SIZE - ROAD_W, 0.18, swW * 0.9), swMat);
    sw.position.set(ox + CHUNK_SIZE / 2, 0.09, oz + ROAD_W * 0.5 + swW * 0.5);
    sw.receiveShadow = true;
    g.add(sw);
  }

  // ── 建筑物 ────────────────────────────────
  if (chunkRand(cx, cz) > 0.22) {
    const margin = ROAD_W + 4;
    const bw = CHUNK_SIZE - margin - chunkRand(cx, cz, 1) * 10;
    const bd = CHUNK_SIZE - margin - chunkRand(cx, cz, 2) * 10;
    if (bw > 8 && bd > 8) {
      const floors = 3 + Math.floor(chunkRand(cx, cz, 3) * 16);
      const bh = floors * 3.6;
      const col = BLD_COLORS[Math.floor(chunkRand(cx, cz, 4) * BLD_COLORS.length)];

      // 建筑主体
      const bldMat = mkMat(col, 0.05, 0.75);
      const bm = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bldMat);
      bm.position.set(ox + CHUNK_SIZE / 2, bh / 2, oz + CHUNK_SIZE / 2);
      bm.castShadow = true; bm.receiveShadow = true;
      g.add(bm);

      // 窗户（矩形面板，贴在建筑外壁）
      const winRows = Math.min(floors, 12);
      const winCols = Math.max(2, Math.floor(bw / 4));
      const winWid = bw / winCols * 0.58;
      const winHt = 1.6;
      for (let row = 0; row < winRows; row++) {
        for (let col = 0; col < winCols; col++) {
          const wx = ox + CHUNK_SIZE / 2 - bw / 2 + (col + 0.5) * (bw / winCols);
          const wy = 2.2 + row * (bh / winRows);
          // 前面（-Z 面）
          const wm = new THREE.Mesh(new THREE.PlaneGeometry(winWid, winHt), windowMat);
          wm.position.set(wx, wy, oz + CHUNK_SIZE / 2 - bd / 2 - 0.02);
          g.add(wm);
          // 背面（+Z 面）
          const wmB = wm.clone();
          wmB.position.set(wx, wy, oz + CHUNK_SIZE / 2 + bd / 2 + 0.02);
          wmB.rotation.y = Math.PI;
          g.add(wmB);
        }
      }

      // 屋顶水箱 / 空调设备（随机）
      if (chunkRand(cx, cz, 5) > 0.5) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8),
          mkMat(0x888888, 0.3, 0.7)
        );
        tank.position.set(
          ox + CHUNK_SIZE / 2 + chunkRand(cx, cz, 6) * (bw * 0.3) - bw * 0.15,
          bh + 1.25,
          oz + CHUNK_SIZE / 2 + chunkRand(cx, cz, 7) * (bd * 0.3) - bd * 0.15
        );
        g.add(tank);
      }
    }
  }

  // ── 路灯（路口附近） ────────────────────────
  for (const [lx, lz] of [
    [ox + ROAD_W * 0.6, oz + ROAD_W * 0.6],
    [ox - ROAD_W * 0.6, oz + ROAD_W * 0.6],
    [ox + ROAD_W * 0.6, oz - ROAD_W * 0.6],
    [ox - ROAD_W * 0.6, oz - ROAD_W * 0.6],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.5, 6), mkMat(0x444444, 0, 0.8));
    pole.position.set(lx, 2.75, lz);
    g.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mkEmissive(0xffeecc, 1.5));
    lamp.position.set(lx, 5.6, lz);
    g.add(lamp);
  }

  scene.add(g);
  chunks.set(key, g);
}

function removeChunk(cx, cz) {
  const key = `${cx},${cz}`;
  const g = chunks.get(key);
  if (!g) return;
  scene.remove(g);
  g.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
  chunks.delete(key);
}

let lastChunkPx = Infinity, lastChunkPz = Infinity;
function updateChunks(px, pz) {
  const cpx = Math.floor(px / CHUNK_SIZE);
  const cpz = Math.floor(pz / CHUNK_SIZE);
  if (cpx === lastChunkPx && cpz === lastChunkPz) return;
  lastChunkPx = cpx; lastChunkPz = cpz;

  const keep = new Set();
  for (let dx = -CHUNK_VIEW; dx <= CHUNK_VIEW; dx++) {
    for (let dz = -CHUNK_VIEW; dz <= CHUNK_VIEW; dz++) {
      const cx = cpx + dx, cz = cpz + dz;
      buildChunk(cx, cz);
      keep.add(`${cx},${cz}`);
    }
  }
  for (const key of chunks.keys()) {
    if (!keep.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      removeChunk(cx, cz);
    }
  }
}

function buildCity() {
  for (let dx = -CHUNK_VIEW; dx <= CHUNK_VIEW; dx++)
    for (let dz = -CHUNK_VIEW; dz <= CHUNK_VIEW; dz++)
      buildChunk(dx, dz);
}
