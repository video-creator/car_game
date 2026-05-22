import * as THREE from 'three';

// ── Track System ─────────────────────────────────
export function buildTrackSystem(scene) {
  const R = 120;

  // Create an irregular oval loop
  const mainPoints = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = R + Math.sin(t * 3) * 20 + Math.cos(t * 5) * 10 + Math.sin(t * 7) * 8;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r * 0.65;
    const y = Math.sin(t * 2) * 8 + Math.cos(t * 3) * 4;
    mainPoints.push(new THREE.Vector3(x, y, z));
  }
  mainPoints.push(mainPoints[0].clone());

  const mainCurve = new THREE.CatmullRomCurve3(mainPoints, true, 'catmullrom', 0.5);
  const mainLen = mainCurve.getLength();

  // ── Junction Branches ─────────────────────────
  const junctions = [];

  // Junction 1: scenic mountain route
  {
    const bp1 = mainCurve.getPointAt(0.22);
    const bp4 = mainCurve.getPointAt(0.38);
    const midP1 = mainCurve.getPointAt(0.25);
    const midP2 = mainCurve.getPointAt(0.42);
    const bp2 = new THREE.Vector3(midP1.x + 50, midP1.y + 30, midP1.z - 20);
    const bp3 = new THREE.Vector3(midP2.x + 40, midP2.y + 25, midP2.z - 30);
    const bp1b = bp1.clone().lerp(bp2, 0.3);
    const bp3b = bp4.clone().lerp(bp3, 0.3);

    const branchCurve = new THREE.CatmullRomCurve3([bp1, bp1b, bp2, bp3, bp3b, bp4], false, 'catmullrom', 0.5);
    junctions.push({
      name: '🌲 山林路线',
      entryT: 0.22, entryDistance: 0.22 * mainLen,
      exitT: 0.38, exitDistance: 0.38 * mainLen,
      branchCurve,
    });
  }

  // Junction 2: low route (tunnel-like)
  {
    const bp1 = mainCurve.getPointAt(0.52);
    const bp4 = mainCurve.getPointAt(0.70);
    const mid1 = mainCurve.getPointAt(0.62);
    const bp2 = new THREE.Vector3(mid1.x - 30, -6, mid1.z + 20);
    const bp1b = bp1.clone().lerp(bp2, 0.4);
    const bp3b = bp4.clone().lerp(bp2, 0.4);

    const branchCurve = new THREE.CatmullRomCurve3([bp1, bp1b, bp2, bp3b, bp4], false, 'catmullrom', 0.5);
    junctions.push({
      name: '🚇 隧道低线',
      entryT: 0.52, entryDistance: 0.52 * mainLen,
      exitT: 0.70, exitDistance: 0.70 * mainLen,
      branchCurve,
    });
  }

  // Junction 3: high-speed straight
  {
    const bp1 = mainCurve.getPointAt(0.78);
    const bp4 = mainCurve.getPointAt(0.92);
    const mid = bp1.clone().lerp(bp4, 0.5);
    mid.y += 5;
    const branchCurve = new THREE.CatmullRomCurve3([
      bp1, bp1.clone().add(new THREE.Vector3(20, 10, 10)),
      mid, bp4.clone().add(new THREE.Vector3(-15, 8, -10)),
      bp4
    ], false, 'catmullrom', 0.5);
    junctions.push({
      name: '⚡ 高速直道',
      entryT: 0.78, entryDistance: 0.78 * mainLen,
      exitT: 0.92, exitDistance: 0.92 * mainLen,
      branchCurve,
    });
  }

  const ts = {
    mainCurve,
    mainLen,
    junctions,
    // Get world position on main track by distance
    getPointOnMain(dist) {
      const t = ((dist % mainLen) + mainLen) % mainLen / mainLen;
      return {
        pos: mainCurve.getPointAt(t),
        tangent: mainCurve.getTangentAt(t),
      };
    },
  };

  // ── Visuals ──────────────────────────────────
  buildTrackVisuals(scene, mainCurve);
  for (const j of junctions) {
    if (j.branchCurve) buildTrackVisuals(scene, j.branchCurve);
  }

  return ts;
}

// ── Visual rails ───────────────────────────────
function buildTrackVisuals(scene, curve) {
  const railMat = new THREE.MeshStandardMaterial({ color: 0x889098, metalness: 0.5, roughness: 0.4 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });

  const len = curve.getLength();
  const samples = Math.floor(len / 2.5);
  const pts = [];
  const tangents = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push(curve.getPointAt(t));
    tangents.push(curve.getTangentAt(t));
  }

  // Rail geometry
  const railGeo = new THREE.BufferGeometry();
  const verts = [];
  const idx = [];
  const GAUGE = 0.7;
  const hw = 0.04, rh = 0.12;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const tan = tangents[i];
    const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

    for (const side of [-1, 1]) {
      const off = right.clone().multiplyScalar(side * GAUGE);
      verts.push(
        p.x + off.x - right.x * hw, p.y, p.z + off.z - right.z * hw,
        p.x + off.x + right.x * hw, p.y, p.z + off.z + right.z * hw,
        p.x + off.x + right.x * hw, p.y + rh, p.z + off.z + right.z * hw,
        p.x + off.x - right.x * hw, p.y + rh, p.z + off.z - right.z * hw,
      );
    }
  }

  const segs = pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const b = i * 8;
    const n = (i + 1) * 8;
    for (const ro of [0, 4]) {
      const bi = b + ro, ni = n + ro;
      const f = [0, 1, 2, 0, 2, 3, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 0, 5, 1, 0, 4, 5, 4, 7, 6, 4, 6, 5];
      for (const fi of f) idx.push([bi, ni][fi < 6 ? 0 : 1] + (fi < 6 ? fi : fi - 6));
    }
  }

  // Simpler rail geometry using TubeGeometry or line segments
  // Let's use a simple approach: box rails
  scene.add(buildSimpleRails(curve, railMat));

  // Sleepers
  buildSleepers(scene, curve, sleeperMat);
}

function buildSimpleRails(curve, mat) {
  const group = new THREE.Group();
  const len = curve.getLength();
  const samples = Math.floor(len / 1.5);
  const GAUGE = 0.7;

  // Use extruded rectangles along the curve for each rail
  for (const side of [-1, 1]) {
    const pts3 = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const off = right.clone().multiplyScalar(side * GAUGE);
      pts3.push(new THREE.Vector3(p.x + off.x, p.y + 0.06, p.z + off.z));
    }

    const path = new THREE.CatmullRomCurve3(pts3);
    const tubeGeo = new THREE.TubeGeometry(path, Math.floor(samples / 2), 0.05, 4, false);
    const mesh = new THREE.Mesh(tubeGeo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

function buildSleepers(scene, curve, mat) {
  const len = curve.getLength();
  const count = Math.floor(len / 3.5);
  const sleeperGeo = new THREE.BoxGeometry(2.0, 0.10, 0.18);
  const inst = new THREE.InstancedMesh(sleeperGeo, mat, count);
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.count = count;
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  for (let i = 0; i < count; i++) {
    const t = (i * 3.5) / len;
    const p = curve.getPointAt(Math.min(1, t));
    const tan = curve.getTangentAt(Math.min(1, t));
    pos.copy(p);
    pos.y += 0.05;
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-tan.z, 0, tan.x).normalize());
    m4.compose(pos, quat, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
}