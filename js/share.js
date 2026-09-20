/**
 * share.js v2 — Share to X, WhatsApp, Instagram, Facebook, copy link, download SVG
 */

const Share = (() => {
  let _badge = null;

  // ── Open from project ─────────────────────────────────────
  function openModal(projectId) {
    const project = Store.getProject(projectId);
    if (!project) return;
    const badge = Store.getBadges().find(b => b.projectId === projectId);
    _open(badge || _syntheticBadge(project));
  }

  // ── Open from badge gallery ───────────────────────────────
  function openModalForBadge(badgeId) {
    const badge = Badges.getBadge(badgeId);
    if (badge) _open(badge);
  }

  // ── Internal open ─────────────────────────────────────────
  function _open(badge) {
    _badge = badge;
    const preview = document.getElementById('shareBadgePreview');
    const caption = document.getElementById('shareCaption');

    const svg   = Badges.generateSVG(badge);
    preview.innerHTML = svg;
    const svgEl = preview.querySelector('svg');
    if (svgEl) { svgEl.style.width = '130px'; svgEl.style.height = '130px'; }

    caption.textContent = `I just earned the "${badge.name}" badge on Crafting Tracker! 🎉`;
    document.getElementById('shareModal').classList.remove('hidden');
  }

  function close() {
    document.getElementById('shareModal').classList.add('hidden');
    _badge = null;
  }

  // ── Share targets ─────────────────────────────────────────
  function _shareText() {
    return `🏆 I just earned the "${_badge.name}" badge ${_badge.emoji || '✨'} on Crafting Tracker!\n${_badge.desc}\n#CraftingTracker #MakerLife #GenZCrafts`;
  }

  function shareTwitter() {
    if (!_badge) return;
    const t = encodeURIComponent(_shareText());
    window.open(`https://twitter.com/intent/tweet?text=${t}`, '_blank', 'noopener');
    App.toast('Opening X…', 'info');
  }

  function shareWhatsApp() {
    if (!_badge) return;
    const t = encodeURIComponent(_shareText());
    window.open(`https://wa.me/?text=${t}`, '_blank', 'noopener');
    App.toast('Opening WhatsApp…', 'info');
  }

  function shareInstagram() {
    if (!_badge) return;
    // Instagram doesn't have a direct web share URL — prompt to download + share
    App.toast('Download your badge SVG then share it on Instagram! 📸', 'info', 5000);
    downloadBadge();
  }

  function shareFacebook() {
    if (!_badge) return;
    // Facebook sharer requires a URL; we share the app URL with a note
    const url = encodeURIComponent(window.location.href);
    const q   = encodeURIComponent(_shareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${q}`, '_blank', 'noopener');
    App.toast('Opening Facebook…', 'info');
  }

  async function copyLink() {
    if (!_badge) return;
    try {
      await navigator.clipboard.writeText(_shareText());
      App.toast('Copied to clipboard! 📋', 'success');
    } catch {
      App.toast('Could not copy automatically. Please copy manually.', 'error');
    }
  }

  function downloadBadge() {
    if (!_badge) return;
    const svg  = Badges.generateSVG(_badge);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `badge-${_badge.name.replace(/\s+/g,'-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('Badge downloaded! 🎨', 'success');
  }

  // ── Synthetic badge fallback ──────────────────────────────
  function _syntheticBadge(project) {
    return { projectId: project.id, name: project.name, emoji: '✨',
             color: '#6c63ff', ribbon: '#3730a3',
             desc: 'Completed on Crafting Tracker.', earnedAt: project.updatedAt };
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    document.getElementById('closeShareModal').addEventListener('click', close);
    document.getElementById('shareModal').addEventListener('click', e => {
      if (e.target === document.getElementById('shareModal')) close();
    });
    document.getElementById('shareTwitter').addEventListener('click',   shareTwitter);
    document.getElementById('shareWhatsApp').addEventListener('click',  shareWhatsApp);
    document.getElementById('shareInstagram').addEventListener('click', shareInstagram);
    document.getElementById('shareFacebook').addEventListener('click',  shareFacebook);
    document.getElementById('shareCopy').addEventListener('click',      copyLink);
    document.getElementById('shareDownload').addEventListener('click',  downloadBadge);
  }

  return { init, openModal, openModalForBadge, close };
})();
