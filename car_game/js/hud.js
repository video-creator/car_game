'use strict';
// ════════════════════════════════════════════
//  hud.js — HUD、损坏血条、方向盘 Canvas
//  依赖：player, camMode, CAM_FIRST
// ════════════════════════════════════════════

function updateDamageHUD() {
  const p = player;
  const setBar = (id, val) => {
    const el = document.getElementById(id);
    el.style.width = val + '%';
    el.style.background = val > 60 ? '#00ff88' : val > 30 ? '#ffcc00' : '#ff4444';
  };
  setBar('dmg-body',   p.hp);
  setBar('dmg-tire',   p.tireHP);
  setBar('dmg-engine', p.engineHP);
}

// ── 方向盘 Canvas HUD ──────────────────────
const wheelCanvas = document.getElementById('wheel-canvas');
const wCtx = wheelCanvas.getContext('2d');

function drawWheelHUD(steerAngle) {
  wCtx.clearRect(0, 0, 120, 120);
  wCtx.save();
  wCtx.translate(60, 60);
  wCtx.rotate(steerAngle * 0.8);

  // 外环阴影
  wCtx.shadowColor = 'rgba(0,0,0,0.6)';
  wCtx.shadowBlur = 8;

  // 外环
  wCtx.beginPath(); wCtx.arc(0, 0, 50, 0, Math.PI * 2);
  wCtx.strokeStyle = '#2a2a2a'; wCtx.lineWidth = 13; wCtx.stroke();
  wCtx.beginPath(); wCtx.arc(0, 0, 50, 0, Math.PI * 2);
  wCtx.strokeStyle = '#666';    wCtx.lineWidth = 9;  wCtx.stroke();

  wCtx.shadowBlur = 0;

  // 3 辐条（光滑渐变）
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const grd = wCtx.createLinearGradient(0, 0, Math.cos(a) * 46, Math.sin(a) * 46);
    grd.addColorStop(0, '#888');
    grd.addColorStop(1, '#333');
    wCtx.strokeStyle = grd;
    wCtx.lineWidth = 5;
    wCtx.beginPath(); wCtx.moveTo(0, 0);
    wCtx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46);
    wCtx.stroke();
  }

  // 中心圆盘
  const cgrd = wCtx.createRadialGradient(0, 0, 0, 0, 0, 11);
  cgrd.addColorStop(0, '#aaa'); cgrd.addColorStop(1, '#444');
  wCtx.beginPath(); wCtx.arc(0, 0, 11, 0, Math.PI * 2);
  wCtx.fillStyle = cgrd; wCtx.fill();

  // 12 点方向指示点
  wCtx.beginPath(); wCtx.arc(0, -42, 5, 0, Math.PI * 2);
  wCtx.fillStyle = '#00ff88'; wCtx.fill();
  wCtx.shadowColor = '#00ff88'; wCtx.shadowBlur = 5;
  wCtx.fill();
  wCtx.shadowBlur = 0;

  wCtx.restore();
}

// ── 速度 HUD 刷新 ─────────────────────────
function updateSpeedHUD() {
  document.getElementById('speed-num').textContent = Math.abs(Math.round(player.speed * 3.6));
  document.getElementById('sCars').textContent = npcs.length;
  if (camMode === CAM_FIRST) drawWheelHUD(player.steerAngle * 30);
}
