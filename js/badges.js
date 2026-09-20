/**
 * badges.js v2 — Badge/ribbon generation, gallery, SVG export, milestone tiers
 */

const Badges = (() => {

  const BADGE_META = {
    sewing   : { emoji: '🧵', name: 'Master Stitcher',   color: '#e879b0', ribbon: '#be185d', desc: 'Completed a sewing project with precision and love.' },
    knitting : { emoji: '🧶', name: 'Yarn Whisperer',    color: '#a78bfa', ribbon: '#7c3aed', desc: 'Knitted their way to a beautiful finish.' },
    woodwork : { emoji: '🪵', name: 'Woodcraft Artisan', color: '#f97316', ribbon: '#c2410c', desc: 'Shaped wood into something wonderful.' },
    painting : { emoji: '🎨', name: 'Palette Pioneer',   color: '#3b82f6', ribbon: '#1d4ed8', desc: 'Painted a masterpiece worth displaying.' },
    jewelry  : { emoji: '💎', name: 'Gem Crafter',       color: '#06b6d4', ribbon: '#0e7490', desc: 'Crafted stunning jewelry from scratch.' },
    pottery  : { emoji: '🏺', name: 'Clay Champion',     color: '#f59e0b', ribbon: '#b45309', desc: 'Molded earth into an enduring creation.' },
    other    : { emoji: '✨', name: 'Creative Achiever', color: '#6c63ff', ribbon: '#3730a3', desc: 'Completed a creative crafting journey.' },
  };

  const MILESTONE_META = [
    { count: 1,  emoji: '🌱', name: 'First Creation',    color: '#30d158', ribbon: '#065f46', desc: 'Completed your very first project!' },
    { count: 3,  emoji: '🔥', name: 'On Fire',           color: '#f97316', ribbon: '#9a3412', desc: '3 projects done. You\'re unstoppable!' },
    { count: 5,  emoji: '⚡', name: 'Momentum',          color: '#ffd60a', ribbon: '#92400e', desc: '5 projects completed. Momentum unlocked!' },
    { count: 10, emoji: '🏆', name: 'Crafting Champion', color: '#eab308', ribbon: '#713f12', desc: '10 projects! Absolute champion.' },
    { count: 25, emoji: '🌟', name: 'Grand Master',      color: '#a855f7', ribbon: '#581c87', desc: '25 projects. Legendary status unlocked!' },
  ];

  // ── Award badge for completed project ────────────────────
  function award(project) {
    const meta  = BADGE_META[project.category] || BADGE_META.other;
    const badge = {
      id          : 'b_' + Date.now().toString(36),
      projectId   : project.id,
      projectName : project.name,
      category    : project.category,
      name        : meta.name,
      emoji       : meta.emoji,
      color       : meta.color,
      ribbon      : meta.ribbon,
      desc        : meta.desc,
      earnedAt    : new Date().toISOString(),
    };
    Store.addBadge(badge);

    // Check milestones
    const doneCount = Store.getProjects().filter(p => p.progress >= 100).length;
    for (const m of MILESTONE_META) {
      if (doneCount === m.count) {
        Store.addBadge({
          id          : 'mb_' + m.count + '_' + Date.now().toString(36),
          projectId   : 'milestone_' + m.count,
          projectName : 'Milestone',
          category    : 'milestone',
          name        : m.name,
          emoji       : m.emoji,
          color       : m.color,
          ribbon      : m.ribbon,
          desc        : m.desc,
          earnedAt    : new Date().toISOString(),
          milestone   : true,
        });
        App.toast(`🎖️ Milestone: "${m.name}" unlocked!`, 'success', 5000);
        break;
      }
    }

    Progress.launchConfetti();
    App.toast(`🏆 Badge earned: "${meta.name}"!`, 'success');
    renderGallery();
  }

  // ── Render badge gallery ──────────────────────────────────
  function renderGallery() {
    const gallery = document.getElementById('badgesGallery');
    const empty   = document.getElementById('badgesEmpty');
    const badges  = Store.getBadges();

    gallery.innerHTML = '';
    if (badges.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    badges.forEach((badge, i) => {
      const card = document.createElement('div');
      card.className = 'badge-card glass-card';
      card.style.setProperty('--badge-index', i);

      const earned = new Date(badge.earnedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      card.innerHTML = `
        <div class="badge-ribbon">
          <div class="badge-ribbon__shape" style="background:linear-gradient(145deg,${badge.color},${badge.ribbon})">
            <span style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${badge.emoji}</span>
          </div>
          <div class="badge-ribbon__tail-l" style="background:${badge.ribbon}"></div>
          <div class="badge-ribbon__tail-r" style="background:${badge.ribbon}"></div>
        </div>
        <div class="badge-title">${badge.name}</div>
        <div class="badge-desc">${badge.desc}</div>
        ${badge.projectName !== 'Milestone' ? `<div class="badge-date">From: ${badge.projectName}</div>` : ''}
        <div class="badge-date">Earned ${earned}</div>
        <button class="btn btn--success btn--sm" data-share-badge="${badge.id}" style="width:100%;justify-content:center;margin-top:2px">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg>
          Share Badge
        </button>
      `;
      gallery.appendChild(card);
    });
  }

  // ── Generate SVG badge ────────────────────────────────────
  function generateSVG(badge) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <radialGradient id="bg${badge.id || 'x'}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${badge.color}"/>
      <stop offset="100%" stop-color="${badge.ribbon}"/>
    </radialGradient>
  </defs>
  <circle cx="150" cy="145" r="108" fill="none" stroke="${badge.color}" stroke-width="4" opacity="0.25"/>
  <circle cx="150" cy="145" r="95" fill="url(#bg${badge.id || 'x'})"/>
  <text x="150" y="170" text-anchor="middle" font-size="72" font-family="system-ui,sans-serif">${badge.emoji}</text>
  <polygon points="112,228 133,275 150,255 167,275 188,228" fill="${badge.ribbon}" opacity="0.88"/>
  <text x="150" y="278" text-anchor="middle" font-size="14" font-weight="bold" fill="${badge.color}" font-family="system-ui,sans-serif">${badge.name}</text>
  <text x="150" y="297" text-anchor="middle" font-size="9" fill="${badge.color}" opacity="0.45" font-family="system-ui,sans-serif">Crafting Tracker</text>
</svg>`;
  }

  function getBadge(id) { return Store.getBadges().find(b => b.id === id) || null; }

  // ── Init (gallery share delegation) ──────────────────────
  function init() {
    document.getElementById('badgesGallery').addEventListener('click', e => {
      const btn = e.target.closest('[data-share-badge]');
      if (btn) Share.openModalForBadge(btn.dataset.shareBadge);
    });
  }

  return { award, renderGallery, generateSVG, getBadge, init };
})();
