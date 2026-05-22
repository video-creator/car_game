// ── Controls ─────────────────────────────────
const keys = {};

document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

export function setupControls() {
  // Setup gameover button
  document.getElementById('go-btn').addEventListener('click', () => {
    if (window.restartGame) window.restartGame();
  });
}

export function updateControls(train, state, dt) {
  if (train.hp <= 0 || state.gameOver) return;

  const W = keys['KeyW'] || keys['ArrowUp'];
  const S = keys['KeyS'] || keys['ArrowDown'];
  const A = keys['KeyA'] || keys['ArrowLeft'];
  const D = keys['KeyD'] || keys['ArrowRight'];
  const SPACE = keys['Space'];

  // Acceleration / braking
  if (W) {
    train.speed += 18 * dt;
  } else if (S) {
    if (train.speed > 0.5) {
      train.speed -= 25 * dt;
    } else {
      train.speed -= 8 * dt; // reverse
    }
  }

  // Emergency brake
  if (SPACE && train.speed > 0) {
    train.speed -= 75 * dt;
  }

  // Clamp speed
  train.speed = Math.max(-6, Math.min(55, train.speed));
  if (Math.abs(train.speed) < 0.05) train.speed = 0;

  // ── Junction handling ──────────────────────
  const jHint = document.getElementById('junction-box');

  if (train.onBranch === -1 && train.nearJunction && train.atJunction) {
    jHint.classList.add('show');

    if (A && !train._branchTaken) {
      // Take left/up branch
      const jIdx = train.nearJunction.index;
      train.onBranch = jIdx;
      train.branchProgress = 0;
      train._branchTaken = true;
      train.speed = Math.max(train.speed, 20);
      jHint.classList.remove('show');
    } else if (D && !train._branchTaken) {
      // Take a different branch (for now any other accessible branch)
      const jIdx = (train.nearJunction.index + 1) % 3;
      train.onBranch = jIdx;
      train.branchProgress = 0;
      train._branchTaken = true;
      train.speed = Math.max(train.speed, 20);
      jHint.classList.remove('show');
    }
  } else {
    if (!train.nearJunction || !train.atJunction) {
      jHint.classList.remove('show');
      train._branchTaken = false;
    }
  }
}