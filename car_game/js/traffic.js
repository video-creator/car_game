'use strict';
// ════════════════════════════════════════════
//  traffic.js — 红绿灯系统
//  依赖：scene, mkMat, H_ROADS, V_ROADS, ROAD_W
// ════════════════════════════════════════════

const trafficLights = [];
const TL_CYCLE = 12000;

function buildTrafficLights() {
  for (const hz of H_ROADS) for (const vx of V_ROADS) {
    if (Math.abs(vx + hz) % (ROAD_SPACING * 2) > ROAD_SPACING) continue;
    const offset = (Math.abs(vx * 3 + hz * 7)) % TL_CYCLE;
    const tl = {
      x: vx, z: hz,
      timer: offset,
      stateH: 'green', stateV: 'red',
      lightsH: null, lightsV: null,
    };
    tl.lightsH = _makeTLPost(vx - ROAD_W * 0.7, hz + ROAD_W * 0.7);
    tl.lightsV = _makeTLPost(vx + ROAD_W * 0.7, hz - ROAD_W * 0.7);
    trafficLights.push(tl);
  }
}

function _makeTLPost(x, z) {
  const g = new THREE.Group();
  // 灯柱
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.5, 6), mkMat(0x444444, 0, 0.8));
  pole.position.y = 2.75;
  g.add(pole);
  // 灯箱
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.9, 1.05), mkMat(0x1a1a1a, 0, 0.9));
  box.position.y = 7.0;
  g.add(box);
  // 三个灯球
  const lights3 = [];
  const yOff = [0.88, 0, -0.88];
  const cols = [0xff2200, 0xffcc00, 0x00dd00];
  for (let i = 0; i < 3; i++) {
    const lm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0 });
    const lMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lm);
    lMesh.position.set(0, 7 + yOff[i], 0.58);
    g.add(lMesh);
    lights3.push({ mesh: lMesh, onColor: cols[i] });
  }
  g._lights = lights3;
  g.position.set(x, 0, z);
  scene.add(g);
  return lights3;
}

function _setTLLights(lights, state) {
  const bright = { red: 0xff2200, yellow: 0xffcc00, green: 0x00ee00 };
  const dim    = { red: 0x220000, yellow: 0x221100, green: 0x002200 };
  lights[0].mesh.material.color.setHex(state === 'red'    ? bright.red    : dim.red);
  lights[0].mesh.material.emissive && lights[0].mesh.material.emissive.setHex(state === 'red'    ? bright.red    : 0);
  lights[1].mesh.material.color.setHex(state === 'yellow' ? bright.yellow : dim.yellow);
  lights[2].mesh.material.color.setHex(state === 'green'  ? bright.green  : dim.green);
}

function updateTL(dtMs) {
  for (const tl of trafficLights) {
    tl.timer = (tl.timer + dtMs) % (TL_CYCLE * 2);
    const t = tl.timer;
    const G = 5500, Y = 1200, R = 5300;
    if      (t < G)              { tl.stateH = 'green';  tl.stateV = 'red';    }
    else if (t < G + Y)          { tl.stateH = 'yellow'; tl.stateV = 'red';    }
    else if (t < G + Y + R)      { tl.stateH = 'red';    tl.stateV = 'red';    }
    else if (t < G + Y + R + G)  { tl.stateH = 'red';    tl.stateV = 'green';  }
    else if (t < G + Y + R + G + Y) { tl.stateH = 'red'; tl.stateV = 'yellow'; }
    else                         { tl.stateH = 'red';    tl.stateV = 'red';    }
    _setTLLights(tl.lightsH, tl.stateH);
    _setTLLights(tl.lightsV, tl.stateV);
  }
}

function getSignal(px, pz, dir) {
  let best = { state: 'green', dist: 9999 };
  for (const tl of trafficLights) {
    let dist = 9999;
    if      (dir === 'px' && Math.abs(pz - tl.z) < ROAD_W * 0.6) dist = tl.x - px;
    else if (dir === 'nx' && Math.abs(pz - tl.z) < ROAD_W * 0.6) dist = px - tl.x;
    else if (dir === 'pz' && Math.abs(px - tl.x) < ROAD_W * 0.6) dist = tl.z - pz;
    else if (dir === 'nz' && Math.abs(px - tl.x) < ROAD_W * 0.6) dist = pz - tl.z;
    if (dist > 0 && dist < best.dist)
      best = { dist, state: (dir === 'px' || dir === 'nx') ? tl.stateH : tl.stateV };
  }
  return best;
}
