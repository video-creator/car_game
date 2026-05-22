import * as THREE from 'three';

// ── Effects ─────────────────────────────────────
const MAX_PARTICLES = 60;
const fireColors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200];

export function createEffects(scene) {
  const particles = [];
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffee00 });

  function spawnCrash(cx, cz, level) {
    const big = level >= 3;
    const n = big ? 25 : 15;

    // Sparks
    for (let i = 0; i < n; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      const m = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.2 : 0.12, 4, 3), sparkMat.clone());
      m.material.color.setHex([0xffee00, 0xff8800, 0xff4400, 0xffffff][Math.floor(Math.random() * 4)]);
      m.position.set(cx + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, cz + (Math.random() - 0.5) * 3);
      scene.add(m);
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.5 + Math.random() * (big ? 3 : 2);
      particles.push({
        mesh: m, type: 'spark',
        vx: Math.cos(ang) * spd, vy: 0.5 + Math.random() * (big ? 2 : 1.2), vz: Math.sin(ang) * spd,
        life: 1, decay: 0.04 + Math.random() * 0.06,
      });
    }

    // Smoke
    for (let i = 0; i < (big ? 4 : 2); i++) {
      if (particles.length >= MAX_PARTICLES) break;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 5, 4),
        new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5, depthWrite: false })
      );
      m.position.set(cx + (Math.random() - 0.5) * 2, 0.5, cz + (Math.random() - 0.5) * 2);
      scene.add(m);
      particles.push({
        mesh: m, type: 'smoke',
        vx: (Math.random() - 0.5) * 0.5, vy: 0.08 + Math.random() * 0.1, vz: (Math.random() - 0.5) * 0.5,
        life: 1, decay: 0.015 + Math.random() * 0.015,
      });
    }

    // Fire (level 3)
    if (level >= 3) {
      for (let i = 0; i < 15; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.3 + Math.random() * 0.6, 5, 4),
          new THREE.MeshBasicMaterial({ color: fireColors[Math.floor(Math.random() * 4)] })
        );
        m.position.set(cx + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.5, cz + (Math.random() - 0.5) * 2);
        scene.add(m);
        particles.push({
          mesh: m, type: 'fire',
          vx: (Math.random() - 0.5) * 0.08, vy: 0.1 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.08,
          life: 1, decay: 0.03 + Math.random() * 0.03,
        });
      }
    }

    // Debris
    if (big) {
      for (let i = 0; i < 8; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.1 + Math.random() * 0.6, 0.05 + Math.random() * 0.2, 0.1 + Math.random() * 0.4),
          new THREE.MeshLambertMaterial({ color: [0x555555, 0x777777, 0x333333, 0xaa8844][Math.floor(Math.random() * 4)] })
        );
        m.position.set(cx + (Math.random() - 0.5) * 3, 1.5, cz + (Math.random() - 0.5) * 3);
        scene.add(m);
        const ang = Math.random() * Math.PI * 2;
        particles.push({
          mesh: m, type: 'debris',
          vx: Math.cos(ang) * (0.3 + Math.random() * 1.2), vy: 0.5 + Math.random() * 1.2,
          vz: Math.sin(ang) * (0.3 + Math.random() * 1.2),
          rx: (Math.random() - 0.5) * 0.2, rz: (Math.random() - 0.5) * 0.2,
          life: 1, decay: 0.006 + Math.random() * 0.006,
        });
      }
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;

      if (p.type === 'spark') {
        p.vy -= 0.08;
        if (p.mesh.position.y < 0.1) { p.mesh.position.y = 0.1; p.vy *= -0.2; }
      }
      if (p.type === 'debris') {
        p.vy -= 0.05;
        if (p.mesh.position.y < 0.1) { p.vy = 0; p.vx *= 0.85; p.vz *= 0.85; }
        if (p.rx) p.mesh.rotation.x += p.rx;
        if (p.rz) p.mesh.rotation.z += p.rz;
      }
      if (p.type === 'fire') {
        p.vy *= 0.97;
        p.mesh.scale.setScalar(Math.max(0.1, p.life));
        if (p.mesh.material) p.mesh.material.color.setHSL(0.06 * (1 - p.life), 1, 0.4 + p.life * 0.3);
      }
      if (p.type === 'smoke') {
        p.mesh.scale.setScalar(1 + (1 - p.life) * 2);
      }

      p.life -= p.decay;
      if (p.mesh.material && p.mesh.material.transparent)
        p.mesh.material.opacity = Math.max(0, p.life * 0.6);
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
  }

  return { spawnCrash, update };
}

export function updateEffects(effects, dt) {
  effects.update(dt);
}