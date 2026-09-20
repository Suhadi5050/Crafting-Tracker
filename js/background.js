/**
 * background.js — Animated starscape canvas + shooting stars
 */

const Background = (() => {
  let _canvas, _ctx, _stars = [], _raf, _shooting = [];

  const STAR_COUNT = 200;
  const COLORS = ['#ffffff', '#ede9fe', '#c4b5fd', '#a78bfa', '#fbd3e9', '#bfdbfe'];

  // ── Initialise canvas & stars ─────────────────────────────
  function init() {
    _canvas = document.getElementById('starCanvas');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    _resize();
    _buildStars();
    _tick();

    window.addEventListener('resize', _resize, { passive: true });

    // Shoot a star every 4–8 seconds
    setInterval(_launchShootingStar, 4000 + Math.random() * 4000);
  }

  function _resize() {
    if (!_canvas) return;
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _buildStars();
  }

  function _buildStars() {
    _stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      _stars.push({
        x    : Math.random() * _canvas.width,
        y    : Math.random() * _canvas.height * 0.75, // keep above mountains
        r    : 0.4 + Math.random() * 1.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        baseO: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.015,
      });
    }
  }

  // ── Shooting star ─────────────────────────────────────────
  function _launchShootingStar() {
    if (document.documentElement.getAttribute('data-theme') === 'light') return;
    _shooting.push({
      x    : Math.random() * _canvas.width * 0.7,
      y    : Math.random() * _canvas.height * 0.35,
      len  : 80 + Math.random() * 120,
      vx   : 3 + Math.random() * 3,
      vy   : 1 + Math.random() * 2,
      life : 1,
      decay: 0.025 + Math.random() * 0.02,
    });
  }

  // ── Render loop ───────────────────────────────────────────
  function _tick() {
    _raf = requestAnimationFrame(_tick);
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) return; // stars hidden in light mode (CSS handles it)

    const now = performance.now() / 1000;

    // Draw stars
    for (const s of _stars) {
      const alpha = s.baseO * (0.6 + 0.4 * Math.sin(now * s.speed * 10 + s.phase));
      _ctx.beginPath();
      _ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      _ctx.fillStyle = s.color;
      _ctx.globalAlpha = alpha;
      _ctx.fill();
    }

    // Draw shooting stars
    for (let i = _shooting.length - 1; i >= 0; i--) {
      const ss = _shooting[i];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= ss.decay;
      if (ss.life <= 0) { _shooting.splice(i, 1); continue; }

      const grad = _ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.len * (ss.vx / 5), ss.y - ss.len * (ss.vy / 5));
      grad.addColorStop(0, `rgba(255,255,255,${ss.life})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      _ctx.beginPath();
      _ctx.moveTo(ss.x, ss.y);
      _ctx.lineTo(ss.x - ss.len * (ss.vx / 5), ss.y - ss.len * (ss.vy / 5));
      _ctx.strokeStyle = grad;
      _ctx.lineWidth   = 1.5;
      _ctx.globalAlpha = ss.life;
      _ctx.stroke();
    }

    _ctx.globalAlpha = 1;
  }

  return { init };
})();
