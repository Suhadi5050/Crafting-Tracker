/**
 * progress.js v2 — Confetti, XP float labels, level-up overlay, progress animations
 */

const Progress = (() => {
  const CONFETTI_COLORS = ['#6c63ff','#a78bfa','#f7797d','#43c6ac','#ffd60a','#ff9f0a','#32ade6'];

  // ── Confetti burst ────────────────────────────────────────
  function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < 140; i++) {
      particles.push({
        x    : Math.random() * canvas.width,
        y    : Math.random() * canvas.height * 0.4 - 20,
        w    : 6 + Math.random() * 7,
        h    : 9 + Math.random() * 9,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        vx   : (Math.random() - 0.5) * 4,
        vy   : -(4 + Math.random() * 5),
        rot  : Math.random() * 360,
        rotV : (Math.random() - 0.5) * 8,
        life : 1,
        decay: 0.011 + Math.random() * 0.009,
      });
    }

    let raf;
    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += 0.16;
        p.rot += p.rotV; p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
  }

  // ── Floating XP label ─────────────────────────────────────
  function showXPGain(amount) {
    const el = document.createElement('div');
    el.className     = 'xp-float';
    el.textContent   = `+${amount} XP`;
    el.style.left    = `${window.innerWidth / 2 - 30}px`;
    el.style.top     = `${window.innerHeight / 2}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    _updateXPChip();
  }

  // ── Update XP chip in topbar ──────────────────────────────
  function _updateXPChip() {
    const info = Store.getLevelInfo();
    const fill = document.getElementById('xpFill');
    const lvl  = document.getElementById('xpLevel');
    const pts  = document.getElementById('xpPts');

    if (fill) fill.style.width = info.pct + '%';
    if (lvl)  lvl.textContent  = `Lv ${info.level}`;
    if (pts)  pts.textContent  = `${info.xp} XP`;

    // Badges view ring
    const arc  = document.getElementById('xpRingArc');
    const num  = document.getElementById('levelRingNum');
    const name = document.getElementById('levelName');
    const xpEl = document.getElementById('levelXP');
    if (arc)  arc.style.strokeDashoffset  = 213.6 * (1 - info.pct / 100);
    if (num)  num.textContent  = info.level;
    if (name) name.textContent = info.name;
    if (xpEl) xpEl.textContent = `${info.xp} / ${info.nextMin} XP`;
  }

  // ── Level-up overlay ──────────────────────────────────────
  function showLevelUp(level) {
    const info    = Store.getLevelInfo();
    const overlay = document.getElementById('levelupOverlay');
    document.getElementById('levelupNum').textContent   = `Level ${level}`;
    document.getElementById('levelupTitle').textContent = info.name;
    overlay.classList.remove('hidden');

    const card = overlay.querySelector('.levelup-card');
    card.classList.add('bounce');
    card.addEventListener('animationend', () => card.classList.remove('bounce'), { once: true });

    launchConfetti();
    setTimeout(() => overlay.classList.add('hidden'), 3000);
  }

  // ── Init (just updates the chip on load) ─────────────────
  function init() {
    _updateXPChip();
    // Dismiss level-up on click
    document.getElementById('levelupOverlay').addEventListener('click', () => {
      document.getElementById('levelupOverlay').classList.add('hidden');
    });
  }

  return { launchConfetti, showXPGain, showLevelUp, updateXPChip: _updateXPChip, init };
})();
