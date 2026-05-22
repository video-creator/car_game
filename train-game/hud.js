// ── HUD ───────────────────────────────────────

export function createHUD() {
  document.getElementById('sDist').textContent = '0';
  document.getElementById('sStar').textContent = '0';
  document.getElementById('sCrash').textContent = '0';
  document.getElementById('speed-num').textContent = '0';

  // Auto-dim controls hint
  setTimeout(() => {
    const el = document.getElementById('controls-hint');
    if (el) el.style.opacity = '0.3';
  }, 8000);
}

export function updateHUD(state) {
  document.getElementById('speed-num').textContent = state.speed;
  document.getElementById('sDist').textContent = state.distance;
  document.getElementById('sStar').textContent = state.stars;

  const hp = Math.max(0, state.hp);
  const fill = document.getElementById('hp-fill');
  fill.style.width = hp + '%';
  fill.style.background = hp > 60 ? '#00ff88' : hp > 30 ? '#ffcc00' : '#ff4444';
}