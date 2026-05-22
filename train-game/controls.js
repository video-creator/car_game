// ── Controls ─────────────────────────────────
const keys = {};

document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

export function setupControls() {
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

  // No A/D for acceleration — A/D is only for junction selection
  // Use W/S for speed only

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
    // Show junction hint with branch name
    const name = train.nearJunction.name;
    jHint.querySelector('.hint').textContent = `🚉 ${name}`;
    jHint.querySelector('.sub').textContent = '按 A/← 或 D/→ 进入岔路';
    jHint.classList.add('show');

    // Enter branch on ANY press of A or D
    if ((A || D) && !train._branchTaken) {
      const jIdx = train.nearJunction.index;
      train.onBranch = jIdx;
      train.branchProgress = 0;
      train._branchTaken = true;
      train.speed = Math.max(train.speed, 20);
      jHint.classList.remove('show');
      // Flash effect
      const flash = document.getElementById('flash');
      flash.style.background = 'rgba(255,200,0,0.3)';
      setTimeout(() => { flash.style.background = 'rgba(255,200,0,0)'; }, 200);
    }
  } else {
    if (!train.nearJunction || !train.atJunction) {
      jHint.classList.remove('show');
      train._branchTaken = false;
      // Reset hint text
      jHint.querySelector('.hint').textContent = '← 左岔 / → 右岔';
      jHint.querySelector('.sub').textContent = '按 A/D 或 ←/→ 选择轨道方向';
    }
  }
}