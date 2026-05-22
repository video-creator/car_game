import * as THREE from 'three';

export function createEnvironment(scene, trackSystem) {
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  // ── Ground: rainbow gradients ──────────────
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4466aa, roughness: 0.8, flatShading: true,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  envGroup.add(ground);

  // ── Colored circles under the track ──────────
  const ringColors = [0xff4488, 0xffaa00, 0x44ff88, 0x44aaff, 0xcc44ff];
  const mainLen = trackSystem.mainLen;
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) % 1;
    const p = trackSystem.mainCurve.getPointAt(t);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.8, 16),
      new THREE.MeshBasicMaterial({ color: ringColors[i % ringColors.length], transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, -0.45, p.z);
    envGroup.add(ring);

    // Glow ring
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.8, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(p.x, -0.44, p.z);
    envGroup.add(glow);
  }

  // ── Scattered candy huts ────────────────────
  const hutColors = [0xff6688, 0xffaa44, 0x66ff88, 0x6688ff, 0xdd66ff, 0xffff66];
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 70;
    const color = hutColors[Math.floor(Math.random() * hutColors.length)];

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, 1.5, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    );
    base.position.set(Math.cos(angle) * dist, 0.75, Math.sin(angle) * dist * 0.6);
    base.castShadow = true;
    envGroup.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 1.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0xff4488, roughness: 0.5, emissive: 0xff2266, emissiveIntensity: 0.1,
      })
    );
    roof.position.set(Math.cos(angle) * dist, 2.1, Math.sin(angle) * dist * 0.6);
    roof.castShadow = true;
    envGroup.add(roof);
  }

  // ── Glowing trees ───────────────────────────
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x44dd88, roughness: 0.6, emissive: 0x22bb66, emissiveIntensity: 0.2 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });

  const treePositions = [];
  for (let i = 0; i < 60; i++) {
    const t = (i / 60 + Math.random() * 0.01) % 1;
    const p = trackSystem.mainCurve.getPointAt(t);
    const tan = trackSystem.mainCurve.getTangentAt(t);
    const side = Math.random() > 0.5 ? 1 : -1;
    treePositions.push({
      x: p.x - tan.z * side * (6 + Math.random() * 15),
      z: p.z + tan.x * side * (6 + Math.random() * 15),
      y: p.y,
      sc: 0.8 + Math.random() * 1.5,
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.0, 4);
  const folGeo = new THREE.SphereGeometry(0.6, 5, 4);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
  const folInst = new THREE.InstancedMesh(folGeo, treeMat, treePositions.length);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();

  treePositions.forEach((tp, i) => {
    const scale = tp.sc;
    v.set(tp.x, tp.y - 0.2, tp.z);
    m4.compose(v, new THREE.Quaternion(), new THREE.Vector3(1, scale * 1.2, 1));
    trunkInst.setMatrixAt(i, m4);
    v.y = tp.y + 0.5 * scale;
    const colorShift = Math.sin(i * 1.5) * 0.15;
    m4.compose(v, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
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

  // ── Floating platforms with lights ──────────
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8855cc, emissive: 0x6622aa, emissiveIntensity: 0.2 });
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 50;
    const h = 5 + Math.random() * 15;
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 0.5, 6), platMat);
    plat.position.set(Math.cos(angle) * dist * 0.8, h, Math.sin(angle) * dist * 0.6);
    plat.receiveShadow = true;
    envGroup.add(plat);

    // Light beam
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.15, 2, 4),
      new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.2 })
    );
    beam.position.set(Math.cos(angle) * dist * 0.8, h - 1.5, Math.sin(angle) * dist * 0.6);
    envGroup.add(beam);
  }

  // ── Stars (collectibles) ────────────────────
  const stars = [];
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffee00, emissive: 0xffee00, emissiveIntensity: 3 });
  const starGeo = new THREE.OctahedronGeometry(0.4);

  for (let i = 0; i < 35; i++) {
    const t = (0.01 + i / 35) % 1;
    const p = trackSystem.mainCurve.getPointAt(t);
    const tan = trackSystem.mainCurve.getTangentAt(t);
    const side = Math.random() > 0.5 ? 1 : -1;

    const star = new THREE.Mesh(starGeo, starMat.clone());
    star.position.set(
      p.x - tan.z * side * (2.0 + Math.random() * 0.8),
      p.y + 2.0 + Math.random() * 2,
      p.z + tan.x * side * (2.0 + Math.random() * 0.8)
    );
    star.userData = { collected: false, baseY: star.position.y, phase: Math.random() * Math.PI * 2 };
    stars.push(star);
    envGroup.add(star);

    // Glow ring around star
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee00, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    glow.position.copy(star.position);
    glow.rotation.x = -Math.PI / 2;
    glow.userData.parentStar = star;
    stars.push(glow);
    envGroup.add(glow);
  }

  // ── Sky gradient via large sphere ───────────
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform float time;
      void main() {
        float h = normalize(vPos).y;
        vec3 col1 = vec3(0.05, 0.05, 0.25);
        vec3 col2 = vec3(0.3, 0.1, 0.5);
        vec3 col3 = vec3(0.6, 0.3, 0.8);
        vec3 col = mix(col1, col2, max(0.0, h) * 2.0);
        col = mix(col, col3, max(0.0, h * 1.5 - 0.2));
        // Stars
        float star = pow(max(0.0, sin(vPos.x * 50.0 + vPos.y * 30.0 + vPos.z * 40.0 + time * 0.5)), 40.0);
        col += vec3(star * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skySphere = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 24), skyMat);
  envGroup.add(skySphere);

  // ── Update ──────────────────────────────────
  return {
    update(dt) {
      const t = Date.now() / 1000;

      // Animate sky
      skyMat.uniforms.time.value = t * 0.3;

      // Animate stars
      for (let i = 0; i < stars.length; i += 2) {
        const s = stars[i];
        if (s.userData.collected) continue;
        s.rotation.x = t * 2 + i * 0.7;
        s.rotation.y = t * 2.5 + i;
        s.position.y = s.userData.baseY + Math.sin(t * 3 + s.userData.phase) * 0.3;
        if (stars[i + 1]) {
          stars[i + 1].position.copy(s.position);
          stars[i + 1].material.opacity = 0.15 + Math.sin(t * 4 + i) * 0.08;
        }
      }
    },

    checkStars(playerPos, state) {
      for (let i = 0; i < stars.length; i += 2) {
        const s = stars[i];
        if (s.userData.collected) continue;
        if (playerPos.distanceTo(s.position) < 2.5) {
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