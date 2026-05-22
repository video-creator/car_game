import * as THREE from 'three';

// ── Color Schemes ───────────────────────────────
const SCHEMES = [
  { body: 0x2d66c9, stripe: 0xffffff, wagon: 0xcc3322 },
  { body: 0xcc4411, stripe: 0xffcc00, wagon: 0x2277cc },
  { body: 0x22aa44, stripe: 0xffffff, wagon: 0xcc8833 },
  { body: 0x8833cc, stripe: 0xffcc00, wagon: 0x44aa44 },
  { body: 0xff2266, stripe: 0xffffff, wagon: 0x3388cc },
];

// ── Create Locomotive ─────────────────────────
function makeLoco(scheme) {
  const g = new THREE.Group();
  const L = 2.8, W = 0.6, H = 0.85;

  const bodyMat = new THREE.MeshStandardMaterial({ color: scheme.body, roughness: 0.3, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.8, metalness: 0.2 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: scheme.stripe, roughness: 0.3, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.05, transparent: true, opacity: 0.45 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 });

  // BODY: BoxGeometry(width=X, height=Y, depth=Z)
  // Train length along Z axis (front at -Z)
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), bodyMat);
  body.position.y = 0.55;
  g.add(body);

  // Nose (cone at front -Z)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 10), bodyMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.55, -L / 2 - 0.15);
  g.add(nose);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.08, L - 0.32),
    new THREE.MeshStandardMaterial({ color: 0xd7dde6, roughness: 0.6 }));
  roof.position.set(0, H + 0.22, 0);
  g.add(roof);

  // Side stripes
  for (const sz of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, L - 0.15), stripeMat);
    stripe.position.set(sz * (W / 2 + 0.01), 0.6, 0);
    g.add(stripe);
  }

  // Headlight (at front -Z)
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), lightMat);
  hl.position.set(0, 0.42, -L / 2 - 0.32);
  g.add(hl);

  // Cab window (at front -Z)
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.02), glassMat);
  win.position.set(0, 0.72, -L / 2 + 0.1);
  g.add(win);

  // Rear light (at back +Z)
  const rl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 0.5 }));
  rl.position.set(0, 0.42, L / 2 + 0.1);
  g.add(rl);

  // Bogies - wheel sets along Z (length) axis
  const wheelPairs = [];
  for (const wz of [-L * 0.27, L * 0.27]) {
    for (const wx of [-0.18, 0.18]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx * 1.2, 0.08, wz);
      g.add(w);
      wheelPairs.push(w);
    }
  }

  g._len = L;
  g._wheelPairs = wheelPairs;
  return g;
}

// ── Create Wagon ─────────────────────────────
function makeWagon(color) {
  const g = new THREE.Group();
  const L = 2.0, W = 0.54, H = 0.65;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.8 });

  // Body (length along Z)
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), bodyMat);
  body.position.y = 0.38;
  g.add(body);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.06, L - 0.18),
    new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.6 }));
  roof.position.y = 0.75;
  g.add(roof);

  // Wheels
  for (const wz of [-0.7, 0.7]) {
    for (const wx of [-0.15, 0.15]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx * 1.2, 0.08, wz);
      g.add(w);
    }
  }

  g._len = L;
  return g;
}

// ── Create Train ──────────────────────────────
export function createPlayerTrain(scene) {
  const scheme = SCHEMES[Math.floor(Math.random() * SCHEMES.length)];
  const train = {
    cars: [], couplers: [], hp: 100,
    speed: 0, baseSpeed: 0,
    trackPos: 0,
    onBranch: -1, branchProgress: 0,
    isPlayer: true,
  };

  const loco = makeLoco(scheme);
  scene.add(loco);
  train.cars.push({ mesh: loco, len: loco._len });

  for (let i = 0; i < 4; i++) {
    const w = makeWagon(i % 2 === 0 ? scheme.wagon : 0xcc3322);
    scene.add(w);
    train.cars.push({ mesh: w, len: w._len });
  }

  // Couplers
  const coupMat = new THREE.MeshStandardMaterial({ color: 0x505260, roughness: 0.7 });
  for (let i = 0; i < train.cars.length - 1; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), coupMat);
    scene.add(rod);
    train.couplers.push(rod);
  }

  return train;
}

export function createNPCTrain(scene) {
  const scheme = SCHEMES[Math.floor(Math.random() * SCHEMES.length)];
  const train = {
    cars: [], couplers: [], hp: 100,
    speed: 0, baseSpeed: 12 + Math.random() * 8,
    trackPos: 0,
    onBranch: -1, branchProgress: 0,
    isPlayer: false,
  };

  const loco = makeLoco(scheme);
  scene.add(loco);
  train.cars.push({ mesh: loco, len: loco._len });

  for (let i = 0; i < 3; i++) {
    const w = makeWagon(i % 2 === 0 ? scheme.wagon : 0xcc3322);
    scene.add(w);
    train.cars.push({ mesh: w, len: w._len });
  }

  const coupMat = new THREE.MeshStandardMaterial({ color: 0x505260, roughness: 0.7 });
  for (let i = 0; i < train.cars.length - 1; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), coupMat);
    scene.add(rod);
    train.couplers.push(rod);
  }

  return train;
}

// ── Update visuals ─────────────────────────────
export function updateTrainOnTrack(train, ts) {
  if (!train || train.cars.length === 0) return;

  const COUPLE_GAP = 0.10;
  let accDist = 0;

  const carWorld = [];
  const _up = new THREE.Vector3(0, 1, 0);
  const _fwd = new THREE.Vector3(0, 0, -1);
  const _quat = new THREE.Quaternion();

  for (let i = 0; i < train.cars.length; i++) {
    const c = train.cars[i];
    const centerDist = accDist + c.len * 0.5;

    // Get position from track
    let pos, tangent;
    if (train.onBranch >= 0 && train.onBranch < ts.junctions.length) {
      const j = ts.junctions[train.onBranch];
      const t = Math.max(0, Math.min(1, train.branchProgress - centerDist / 300));
      if (t >= 0 && t <= 1) {
        pos = j.branchCurve.getPointAt(t);
        tangent = j.branchCurve.getTangentAt(t);
      } else {
        const result = ts.getPointOnMain(train.trackPos - centerDist);
        pos = result.pos;
        tangent = result.tangent;
      }
    } else {
      const result = ts.getPointOnMain(train.trackPos - centerDist);
      pos = result.pos;
      tangent = result.tangent;
    }

    c.mesh.position.copy(pos);
    c.mesh.position.y += 0.35;

    // Align train's forward direction (-Z) to track tangent
    _quat.setFromUnitVectors(_fwd, tangent.clone().normalize());
    c.mesh.quaternion.copy(_quat);

    // Wheel rotation
    if (c.mesh._wheelPairs) {
      const wr = train.trackPos * 0.5;
      for (const wp of c.mesh._wheelPairs) wp.rotation.z = wr;
    }

    // Coupler connection points (front at -Z, back at +Z)
    const fwd = new THREE.Vector3(0, 0, -c.len * 0.5 + 0.02).applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
    const bwd = new THREE.Vector3(0, 0, c.len * 0.5 - 0.02).applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
    carWorld.push({ front: fwd, back: bwd });

    accDist += c.len + COUPLE_GAP;
  }

  // Update couplers
  for (let i = 0; i < Math.min(train.couplers.length, carWorld.length - 1); i++) {
    const rod = train.couplers[i];
    const a = carWorld[i].back;
    const b = carWorld[i + 1].front;
    const dir = new THREE.Vector3().copy(b).sub(a);
    const len = dir.length();
    rod.position.copy(a.clone().add(b).multiplyScalar(0.5));
    rod.position.y += 0.25;
    if (len > 0.01) {
      _quat.setFromUnitVectors(_up, dir.clone().normalize());
      rod.quaternion.copy(_quat);
      rod.scale.set(1, len, 1);
    }
  }
}

// ── Collision ─────────────────────────────────
export function checkTrainCollisions(player, npcTrains, state, effects) {
  if (player.hp <= 0 || !player.cars[0]) return;
  const pPos = player.cars[0].mesh.position;

  for (const npc of npcTrains) {
    if (npc.hp <= 0 || !npc.cars[0]) continue;
    const nPos = npc.cars[0].mesh.position;
    const dist = pPos.distanceTo(nPos);
    if (dist > 6) continue;

    const relSpeed = Math.abs(player.speed - npc.speed);
    const level = relSpeed < 10 ? 1 : relSpeed < 25 ? 2 : 3;
    const dmg = level === 1 ? 15 : level === 2 ? 35 : 60;
    player.hp = Math.max(0, player.hp - dmg);
    player.speed *= 0.3;
    npc.speed *= 0.3;

    const cx = (pPos.x + nPos.x) / 2;
    const cz = (pPos.z + nPos.z) / 2;
    effects.spawnCrash(cx, cz, level);
    state.crashes++;

    if (player.hp <= 0) {
      state.gameOver = true;
      document.getElementById('goDist').textContent = state.distance;
      document.getElementById('goStar').textContent = state.stars;
      document.getElementById('goCrash').textContent = state.crashes;
      setTimeout(() => document.getElementById('gameover').classList.add('show'), 300);
    }
    break;
  }
}