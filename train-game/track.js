import * as THREE from 'three';

// ── Track System ─────────────────────────────────
// 过山车风格: 大回环 / 螺旋 / 俯冲 / 波浪
export function buildTrackSystem(scene) {
  // ── Main loop: exciting roller coaster ─────
  const R = 100;
  const pts = [];

  // 36 control points for a wild ride
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    // Radius varies wildly
    const rr = R
      + Math.sin(a * 2) * 30    // 2-lobe wide
      + Math.cos(a * 3) * 25    // 3-lobe
      + Math.sin(a * 5) * 15;   // 5-lobe detail
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.55;

    // Wild height: big climbs + drops + loops
    const loopPhase = i >= 10 && i <= 16; // loop section
    const climbPhase = i >= 22 && i <= 28; // big climb
    let y;
    if (loopPhase) {
      // Loop-de-loop: arc from low to high to low
      const lp = (i - 10) / 6;  // 0..1
      y = Math.sin(lp * Math.PI) * 35 + 15;
    } else if (climbPhase) {
      // Big climb/drop
      const cp = (i - 22) / 6;
      y = 8 + Math.sin(cp * Math.PI * 2) * 25;
    } else {
      y = Math.sin(a * 2) * 12 + Math.cos(a * 3) * 8 + Math.sin(a * 4) * 6;
    }
    pts.push(new THREE.Vector3(x, y, z));
  }
  // Ensure closed loop
  pts.push(pts[0].clone());

  const mainCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const mainLen = mainCurve.getLength();

  // ── Junction Branches ─────────────────────────
  const junctions = [];

  // Junction 1: Loop-de-loop extreme
  {
    const bp1 = mainCurve.getPointAt(0.18);
    const bp4 = mainCurve.getPointAt(0.34);
    const m1 = mainCurve.getPointAt(0.20);
    const m2 = mainCurve.getPointAt(0.32);

    const cp = [
      bp1,
      m1.clone().add(new THREE.Vector3(30, 20, -25)),
      new THREE.Vector3(m1.x + 15, 50, m1.z - 40),
      new THREE.Vector3(m1.x - 5, 25, m1.z - 45),
      new THREE.Vector3(m2.x - 20, 40, m2.z - 30),
      m2.clone().add(new THREE.Vector3(-25, 15, -15)),
      bp4,
    ];
    const branchCurve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.5);
    junctions.push({
      name: '🎢 大回环',
      entryT: 0.18, entryDistance: 0.18 * mainLen,
      exitT: 0.34, exitDistance: 0.34 * mainLen,
      branchCurve,
    });
  }

  // Junction 2: Spiral corkscrew
  {
    const bp1 = mainCurve.getPointAt(0.48);
    const bp4 = mainCurve.getPointAt(0.64);
    const m1 = mainCurve.getPointAt(0.50);

    const cp = [bp1];
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const angle = t * Math.PI * 3; // 1.5 turns
      const r = 20 + t * 25;
      cp.push(new THREE.Vector3(
        m1.x + Math.cos(angle) * r,
        m1.y + Math.sin(angle * 2) * 10 - t * 15,
        m1.z + Math.sin(angle) * r
      ));
    }
    cp.push(bp4);
    const branchCurve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.5);
    junctions.push({
      name: '🌀 螺旋俯冲',
      entryT: 0.48, entryDistance: 0.48 * mainLen,
      exitT: 0.64, exitDistance: 0.64 * mainLen,
      branchCurve,
    });
  }

  // Junction 3: Rainbow wave dash
  {
    const bp1 = mainCurve.getPointAt(0.72);
    const bp4 = mainCurve.getPointAt(0.88);
    const m1 = mainCurve.getPointAt(0.74);
    const m2 = mainCurve.getPointAt(0.86);

    const cp = [bp1];
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const side = Math.sin(t * Math.PI * 4) * 30;
      cp.push(new THREE.Vector3(
        m1.x + side + t * 40,
        m1.y + Math.sin(t * Math.PI * 3) * 30 + 5,
        m1.z + t * 30
      ));
    }
    cp.push(bp4);
    const branchCurve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.5);
    junctions.push({
      name: '🌈 彩虹波浪',
      entryT: 0.72, entryDistance: 0.72 * mainLen,
      exitT: 0.88, exitDistance: 0.88 * mainLen,
      branchCurve,
    });
  }

  const ts = {
    mainCurve, mainLen, junctions,
    getPointOnMain(dist) {
      const t = ((dist % mainLen) + mainLen) % mainLen / mainLen;
      return {
        pos: mainCurve.getPointAt(t),
        tangent: mainCurve.getTangentAt(t),
      };
    },
  };

  // ── Visuals ──────────────────────────────────
  const colors = [0xff4444, 0xffaa00, 0x44ff44, 0x44aaff, 0xaa44ff];
  buildTrackVisuals(scene, mainCurve, colors[0]);

  for (let i = 0; i < junctions.length; i++) {
    if (junctions[i].branchCurve) {
      buildTrackVisuals(scene, junctions[i].branchCurve, colors[i + 1]);
    }
  }

  // Decorative arches
  buildArches(scene, mainCurve);

  return ts;
}

// ── Track Visuals ────────────────────────────────
function buildTrackVisuals(scene, curve, color = 0xff4444) {
  const len = curve.getLength();
  const samples = Math.floor(len / 1.2);
  const pts = [];
  const tangents = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push(curve.getPointAt(t));
    tangents.push(curve.getTangentAt(t));
  }

  // Build main rail tube along the curve
  const railPath = new THREE.CatmullRomCurve3(pts);
  const tubeGeo = new THREE.TubeGeometry(railPath, Math.floor(samples / 1.5), 0.12, 6, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7, emissive: color, emissiveIntensity: 0.15 });
  const mesh = new THREE.Mesh(tubeGeo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Side rails (two thin tubes)
  const railMat = new THREE.MeshStandardMaterial({ color: 0xc0d0e0, metalness: 0.8, roughness: 0.2 });
  for (const side of [-1, 1]) {
    const sidePts = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const tan = tangents[i];
      const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const off = right.clone().multiplyScalar(side * 0.35);
      sidePts.push(new THREE.Vector3(p.x + off.x, p.y + 0.08, p.z + off.z));
    }
    const sidePath = new THREE.CatmullRomCurve3(sidePts);
    const sideTube = new THREE.TubeGeometry(sidePath, Math.floor(samples / 2), 0.04, 4, false);
    const sideMesh = new THREE.Mesh(sideTube, railMat);
    scene.add(sideMesh);
  }

  // Sleepers (彩色卡哇伊枕木)
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, roughness: 0.7 });
  const sleeperGeo = new THREE.BoxGeometry(0.9, 0.06, 0.08);
  const count = Math.floor(len / 3.0);
  const inst = new THREE.InstancedMesh(sleeperGeo, sleeperMat, count);
  inst.castShadow = true;
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const _up = new THREE.Vector3(0, 1, 0);
  const _right = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const t = (i * 3.0) / len;
    const p = curve.getPointAt(Math.min(1, t));
    const tan = curve.getTangentAt(Math.min(1, t));
    _right.set(-tan.z, 0, tan.x).normalize();
    pos.copy(p);
    pos.y += 0.0;
    quat.setFromUnitVectors(_up, _right);
    m4.compose(pos, quat, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
}

// ── Decorative arches ────────────────────────────
function buildArches(scene, curve) {
  const len = curve.getLength();
  const archCount = Math.floor(len / 40);
  const archMat = new THREE.MeshStandardMaterial({
    color: 0xff88cc, roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.4,
  });

  for (let i = 0; i < archCount; i++) {
    const t = (i * 40 + 15) / len;
    if (t > 1) break;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

    for (const side of [-1, 1]) {
      const base = new THREE.Vector3(p.x + right.x * side * 0.8, p.y, p.z + right.z * side * 0.8);
      const top = base.clone().add(new THREE.Vector3(0, 3 + Math.sin(t * 10) * 2, 0));
      // Simple pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, top.y - p.y, 4), archMat);
      pole.position.copy(base.clone().add(top).multiplyScalar(0.5));
      pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0));
      scene.add(pole);

      // Cross beam between poles
      if (side === 1) {
        const otherBase = new THREE.Vector3(p.x - right.x * 0.8, p.y, p.z - right.z * 0.8);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 1.8), archMat);
        beam.position.set(p.x, top.y + 0.3, p.z);
        scene.add(beam);
      }
    }
  }
}