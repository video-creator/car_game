import * as THREE from 'three';

export function createEnvironment(scene, trackSystem) {
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  // ── Ground ──────────────────────────────────
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a8a42, roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  envGroup.add(ground);

  // ── Hills ───────────────────────────────────
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x3a7a32, roughness: 0.9 });
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 80;
    const r = 12 + Math.random() * 20;
    const h = 8 + Math.random() * 15;
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      hillMat
    );
    hill.position.set(Math.cos(angle) * dist, -r / 2 + h * 0.1, Math.sin(angle) * dist * 0.65);
    hill.scale.y = (h / r) * 0.6;
    envGroup.add(hill);
  }

  // ── Trees ───────────────────────────────────
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.95 });

  const treePositions = [];
  for (let i = 0; i < 80; i++) {
    const t = (i / 80 + Math.random() * 0.01) % 1;
    const p = trackSystem.mainCurve.getPointAt(t);
    const tan = trackSystem.mainCurve.getTangentAt(t);
    const side = Math.random() > 0.5 ? 1 : -1;
    treePositions.push({
      x: p.x - tan.z * side * (5 + Math.random() * 12),
      z: p.z + tan.x * side * (5 + Math.random() * 12),
      y: p.y,
      sc: 0.6 + Math.random() * 1.2,
    });
  }
  // Distant trees
  for (let i = 0; i < 120; i++) {
    treePositions.push({
      x: (Math.random() - 0.5) * 350, z: (Math.random() - 0.5) * 350,
      y: 0, sc: 0.5 + Math.random() * 1.0,
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.06, 0.10, 1.2, 4);
  const folGeo = new THREE.ConeGeometry(0.7, 1.6, 6);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
  const folInst = new THREE.InstancedMesh(folGeo, treeMat, treePositions.length);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion();

  treePositions.forEach((tp, i) => {
    v.set(tp.x, tp.y - 0.2, tp.z);
    m4.compose(v, q, new THREE.Vector3(tp.sc, tp.sc, tp.sc));
    trunkInst.setMatrixAt(i, m4);
    v.y = tp.y + 0.8 * tp.sc;
    m4.compose(v, q, new THREE.Vector3(tp.sc, tp.sc, tp.sc));
    folInst.setMatrixAt(i, m4);
  });
  trunkInst.count = treePositions.length;
  folInst.count = treePositions.length;
  trunkInst.instanceMatrix.needsUpdate = true;
  folInst.instanceMatrix.needsUpdate = true;
  trunkInst.castShadow = true;
  folInst.castShadow = true;
  envGroup.add(trunkInst);
  envGroup.add(folInst);

  // ── Stations ────────────────────────────────
  const platforms = [
    { t: 0.05, color: 0xcc8833 },
    { t: 0.35, color: 0x3388cc },
    { t: 0.65, color: 0x88cc33 },
  ];

  for (const st of platforms) {
    const p = trackSystem.mainCurve.getPointAt(st.t);
    const tan = trackSystem.mainCurve.getTangentAt(st.t);
    const offX = -tan.z * 3.5, offZ = tan.x * 3.5;

    // Platform
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.15, 3),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 })
    );
    plat.position.set(p.x + offX, p.y + 0.15, p.z + offZ);
    plat.receiveShadow = true;
    envGroup.add(plat);

    // Building
    const bldg = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3, 2.5),
      new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.5 })
    );
    bldg.position.set(p.x + offX - tan.x * 2, p.y + 1.5, p.z + offZ - tan.z * 2);
    bldg.castShadow = true;
    envGroup.add(bldg);
  }

  // ── Water ───────────────────────────────────
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2288cc, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 50;
    const water = new THREE.Mesh(new THREE.CircleGeometry(10 + Math.random() * 12, 16), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(Math.cos(angle) * dist, -0.25, Math.sin(angle) * dist * 0.65);
    envGroup.add(water);
  }

  // ── Stars (collectibles) ────────────────────
  const stars = [];
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffdd00, emissiveIntensity: 2 });
  const starGeo = new THREE.OctahedronGeometry(0.35);

  for (let i = 0; i < 25; i++) {
    const t = (0.01 + i / 25) % 1;
    const p = trackSystem.mainCurve.getPointAt(t);
    const tan = trackSystem.mainCurve.getTangentAt(t);
    const side = Math.random() > 0.5 ? 1 : -1;
    const star = new THREE.Mesh(starGeo, starMat.clone());
    star.position.set(p.x - tan.z * side * 2.2, p.y + 1.5 + Math.random() * 0.5, p.z + tan.x * side * 2.2);
    star.userData = { collected: false, baseY: star.position.y };
    stars.push(star);
    envGroup.add(star);

    // Glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.25 })
    );
    glow.position.copy(star.position);
    glow.userData.parentStar = star;
    stars.push(glow);
    envGroup.add(glow);
  }

  // ── Update ──────────────────────────────────
  return {
    update(dt) {
      const t = Date.now() / 1000;
      for (let i = 0; i < stars.length; i += 2) {
        const s = stars[i];
        if (s.userData.collected) continue;
        s.rotation.x = t * 1.5 + i;
        s.rotation.y = t * 2 + i * 0.5;
        s.position.y = s.userData.baseY + Math.sin(t * 2 + i) * 0.15;
        // Glow follows
        if (stars[i + 1]) {
          stars[i + 1].position.copy(s.position);
          stars[i + 1].material.opacity = 0.2 + Math.sin(t * 3 + i) * 0.1;
        }
      }
    },

    checkStars(playerPos, state) {
      for (let i = 0; i < stars.length; i += 2) {
        const s = stars[i];
        if (s.userData.collected) continue;
        if (playerPos.distanceTo(s.position) < 2.0) {
          s.userData.collected = true;
          s.visible = false;
          if (stars[i + 1]) stars[i + 1].visible = false;
          state.stars++;
          return true;
        }
      }
      return false;
    },
  };
}