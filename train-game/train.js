import * as THREE from 'three';

// ── Color Schemes ───────────────────────────────
const SCHEMES = [
  { body: 0x2d66c9, accent: '#ff6b6b', stripe: 0xffffff, wagon: [0xcc3322, 0xffaa00, 0x44cc44, 0x4488ff] },
  { body: 0xff3366, accent: '#ffdd00', stripe: 0xffffff, wagon: [0xff6633, 0x33cc99, 0x9944ff, 0xffcc00] },
  { body: 0x22cc88, accent: '#ff8800', stripe: 0xffffff, wagon: [0x3388ff, 0xff44aa, 0x44dd44, 0xff6600] },
  { body: 0x8833ff, accent: '#00ffcc', stripe: 0xffffff, wagon: [0xff3366, 0x33ff66, 0x66aaff, 0xffcc44] },
  { body: 0xff6600, accent: '#ff0066', stripe: 0xffffff, wagon: [0x2288dd, 0xff4488, 0x44ff88, 0xcc44ff] },
];

// ── Create Locomotive (新幹線/子弹头) ──────────
function makeLoco(scheme) {
  const g = new THREE.Group();
  const L = 3.0, W = 0.58, H = 0.75;

  const bodyMat = new THREE.MeshStandardMaterial({ color: scheme.body, roughness: 0.2, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, metalness: 0.3 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: scheme.stripe, roughness: 0.2, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.5 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.9 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 });
  const accentMat = new THREE.MeshStandardMaterial({ color: scheme.stripe, roughness: 0.3, metalness: 0.2 });

  // ── Main body (rounded shape via box + curve) ──
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), bodyMat);
  body.position.y = 0.5;
  g.add(body);

  // ── Aerodynamic nose (bullet train) ──
  const noseGroup = new THREE.Group();
  // Outer shell
  const noseOuter = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 12), bodyMat);
  noseOuter.rotation.x = -Math.PI / 2;
  noseOuter.position.set(0, 0.5, -L / 2 - 0.1);
  noseGroup.add(noseOuter);
  // Nose cap (smaller inner cone)
  const noseInner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 10), accentMat);
  noseInner.rotation.x = -Math.PI / 2;
  noseInner.position.set(0, 0.5, -L / 2 - 0.3);
  noseGroup.add(noseInner);
  g.add(noseGroup);

  // ── Roof fin ──
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, L * 0.5), accentMat);
  fin.position.set(0, H + 0.2, -L * 0.15);
  g.add(fin);

  // ── Side stripes (dynamic look) ──
  for (const sz of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, L - 0.2), stripeMat);
    stripe.position.set(sz * (W / 2 + 0.01), 0.55, 0.05);
    g.add(stripe);

    // Lower accent stripe
    const lowStripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, L - 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.3 }));
    lowStripe.position.set(sz * (W / 2 + 0.01), 0.2, 0.05);
    g.add(lowStripe);
  }

  // ── Headlight ring ──
  const hlRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.10, 12), lightMat);
  hlRing.position.set(0, 0.45, -L / 2 - 0.35);
  hlRing.rotation.x = Math.PI / 2;
  g.add(hlRing);
  // Inner headlight
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), lightMat);
  hl.position.set(0, 0.45, -L / 2 - 0.37);
  g.add(hl);

  // ── Cab windshield ──
  const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.2, 0.02), glassMat);
  win.position.set(0, 0.68, -L / 2 + 0.2);
  g.add(win);

  // ── Side windows ──
  for (let wi = 0; wi < 3; wi++) {
    const wz = -L / 4 + wi * (L / 4.5);
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.18), glassMat);
      w.position.set(sx * (W / 2 + 0.01), 0.6, wz);
      g.add(w);
    }
  }

  // ── Rear lights ──
  for (const sx of [-1, 1]) {
    const rl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 0.8 }));
    rl.position.set(sx * 0.15, 0.35, L / 2 + 0.08);
    g.add(rl);
  }

  // ── Wheels / Bogies ──
  const wheelPairs = [];
  for (const wz of [-L * 0.28, L * 0.28]) {
    for (const wx of [-0.2, 0.2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx * 1.2, 0.06, wz);
      g.add(w);
      wheelPairs.push(w);
    }
    // Axle
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.8 }));
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.04, wz);
    g.add(axle);
  }

  g._len = L;
  g._wheelPairs = wheelPairs;
  return g;
}

// ── Create Wagon (彩虹车厢) ────────────────────
function makeWagon(color) {
  const g = new THREE.Group();
  const L = 2.0, W = 0.52, H = 0.6;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), bodyMat);
  body.position.y = 0.35;
  g.add(body);

  // Rounded roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.06, L - 0.15),
    new THREE.MeshStandardMaterial({ color: 0xe0e4e8, roughness: 0.5, metalness: 0.3 }));
  roof.position.y = 0.68;
  g.add(roof);

  // Windows
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, roughness: 0.05, transparent: true, opacity: 0.4 });
  for (let wi = 0; wi < 3; wi++) {
    const wz = -L * 0.35 + wi * (L * 0.35);
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.10, 0.16), glassMat);
      w.position.set(sx * (W / 2 + 0.01), 0.4, wz);
      g.add(w);
    }
  }

  // Side stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
  for (const sz of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, L - 0.15), stripeMat);
    stripe.position.set(sz * (W / 2 + 0.01), 0.55, 0);
    g.add(stripe);
  }

  // Wheels
  for (const wz of [-0.65, 0.65]) {
    for (const wx of [-0.15, 0.15]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8), darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx * 1.2, 0.06, wz);
      g.add(w);
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.8 }));
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.04, wz);
    g.add(axle);
  }

  g._len = L;
  return g;
}

// ── Create Train ──────────────────────────────
export function createPlayerTrain(scene) {
  const scheme = SCHEMES[Math.floor(Math.random() * SCHEMES.length)];
  const train = {
    cars: [], couplers: [], hp: 100,
    speed: 0, baseSpeed: 0, trackPos: 0,
    onBranch: -1, branchProgress: 0, isPlayer: true,
  };

  const loco = makeLoco(scheme);
  scene.add(loco);
  train.cars.push({ mesh: loco, len: loco._len });

  // Colorful rainbow wagons
  for (let i = 0; i < 4; i++) {
    const color = scheme.wagon[i % scheme.wagon.length];
    const w = makeWagon(color);
    scene.add(w);
    train.cars.push({ mesh: w, len: w._len });
  }

  // Couplers
  const coupMat = new THREE.MeshStandardMaterial({ color: 0x6060aa, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < train.cars.length - 1; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), coupMat);
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
    trackPos: 0, onBranch: -1, branchProgress: 0, isPlayer: false,
  };

  const loco = makeLoco(scheme);
  scene.add(loco);
  train.cars.push({ mesh: loco, len: loco._len });

  for (let i = 0; i < 2; i++) {
    const color = scheme.wagon[i % scheme.wagon.length];
    const w = makeWagon(color);
    scene.add(w);
    train.cars.push({ mesh: w, len: w._len });
  }

  const coupMat = new THREE.MeshStandardMaterial({ color: 0x6060aa, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < train.cars.length - 1; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), coupMat);
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
    c.mesh.position.y += 0.25;

    // Align train to track tangent
    _quat.setFromUnitVectors(_fwd, tangent.clone().normalize());
    c.mesh.quaternion.copy(_quat);

    // Wheel spin
    if (c.mesh._wheelPairs) {
      const wr = train.trackPos * 0.8;
      for (const wp of c.mesh._wheelPairs) wp.rotation.z = wr;
    }

    // Coupler points
    const fwd = new THREE.Vector3(0, 0, -c.len * 0.5 + 0.02).applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
    const bwd = new THREE.Vector3(0, 0, c.len * 0.5 - 0.02).applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
    carWorld.push({ front: fwd, back: bwd });

    accDist += c.len + COUPLE_GAP;
  }

  // Couplers
  for (let i = 0; i < Math.min(train.couplers.length, carWorld.length - 1); i++) {
    const rod = train.couplers[i];
    const a = carWorld[i].back;
    const b = carWorld[i + 1].front;
    const dir = new THREE.Vector3().copy(b).sub(a);
    const len = dir.length();
    rod.position.copy(a.clone().add(b).multiplyScalar(0.5));
    rod.position.y += 0.2;
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