/**
 * app.js v3 — Bootstrap, view router, theme, toast, greetings
 * Wires: Config, Store, Background, Badges, Notifications, Progress,
 *        Widgets, Music, Dashboard, StatModal, Share, Auth
 */

const App = (() => {

  // ── Toast ─────────────────────────────────────────────────
  const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    error  : `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info   : `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
  };

  function toast(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${ICONS[type] || ICONS.info}<span>${message}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    const remove = () => {
      el.classList.add('toast--exit');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    const t = setTimeout(remove, duration);
    el.addEventListener('click', () => { clearTimeout(t); remove(); });
  }

  // ── View router ───────────────────────────────────────────
  const VIEWS = ['dashboard', 'projects', 'badges'];

  function navigate(viewId) {
    if (!VIEWS.includes(viewId)) return;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const a = btn.dataset.view === viewId;
      btn.classList.toggle('active', a);
      btn.setAttribute('aria-current', a ? 'page' : 'false');
    });
    document.getElementById('notifDrawer').classList.add('hidden');
    if (viewId === 'dashboard') Dashboard.renderDashboard();
    if (viewId === 'projects')  Dashboard.renderAllProjects();
    if (viewId === 'badges')    Badges.renderGallery();
  }

  function refresh() {
    const active = document.querySelector('.nav-btn.active');
    navigate(active ? active.dataset.view : 'dashboard');
  }

  // ── Theme ─────────────────────────────────────────────────
  function _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('.sun-icon').classList.toggle('hidden',  theme === 'dark');
    document.querySelector('.moon-icon').classList.toggle('hidden', theme === 'light');
    Store.saveSettings({ theme });
  }

  function _initTheme() {
    const saved = Store.getSettings().theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    _applyTheme(saved);
  }

  // ── Greeting ──────────────────────────────────────────────
  // _safeName strips email addresses so we never show
  // "Welcome, user@example.com" — only the display name or first name.
  function _safeName(raw) {
    const name = (raw || '').trim();
    if (!name || name === 'Crafter') return 'Crafter';
    // If the stored value looks like an email, extract the local part
    // and capitalise it (e.g. "iki.suhadi@gmail.com" → "Iki")
    if (name.includes('@')) {
      const local = name.split('@')[0]          // "iki.suhadi"
        .replace(/[._\-+]/g, ' ')               // "iki suhadi"
        .trim()
        .split(' ')[0];                          // "iki"
      return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
    }
    // Otherwise use just the first word of the display name
    return name.split(' ')[0];
  }

  function _updateGreeting() {
    const user  = Store.getUser();
    const hr    = new Date().getHours();
    const greet = hr < 5  ? 'Good night'
                : hr < 12 ? 'Good morning'
                : hr < 17 ? 'Good afternoon'
                : hr < 21 ? 'Good evening'
                :            'Good night';
    const displayName = _safeName(user.name);
    const el = document.getElementById('greetingTitle');
    if (el) el.textContent = `${greet}, ${displayName}! ✨`;
    const av = document.getElementById('userAvatarText');
    if (av) av.textContent = displayName.charAt(0).toUpperCase();
  }

  // ── Demo seed ─────────────────────────────────────────────
  function _seedDemo() {
    if (Store.getProjects().length > 0) return;
    const now    = new Date();
    const soon   = new Date(now.getTime() + 2 * 864e5).toISOString().split('T')[0];
    const past   = new Date(now.getTime() - 5 * 864e5).toISOString().split('T')[0];
    const future = new Date(now.getTime() + 30 * 864e5).toISOString().split('T')[0];
    const demos  = [
      { id:'d1', name:'Autumn Quilt',      category:'sewing',   description:'Warm patchwork quilt with autumn leaf motifs.', goal:'Finish all 12 squares', progress:75,  deadline:future, reminder:'weekly',  createdAt:new Date(now-20*864e5).toISOString(), updatedAt:now.toISOString() },
      { id:'d2', name:'Winter Scarf',      category:'knitting', description:'Chunky knit scarf in teal and cream.',           goal:'Complete 120 cm length', progress:100, deadline:past,   reminder:'none',    createdAt:new Date(now-40*864e5).toISOString(), updatedAt:now.toISOString() },
      { id:'d3', name:'Birdhouse',         category:'woodwork', description:'Cedar birdhouse for the backyard.',              goal:'Sand, assemble, paint',   progress:40,  deadline:soon,   reminder:'daily',   createdAt:new Date(now-10*864e5).toISOString(), updatedAt:now.toISOString() },
      { id:'d4', name:'Watercolour Garden',category:'painting', description:'3 watercolour studies of my garden.',           goal:'Complete all 3 paintings',progress:55,  deadline:future, reminder:'weekly',  createdAt:new Date(now-15*864e5).toISOString(), updatedAt:now.toISOString() },
    ];
    demos.forEach(d => Store.saveProject(d));
    // Silently award XP + badge for the pre-completed project (no confetti/toast on seed)
    Store.addXP(Store.XP_PER_PROJECT, 'Completed: Winter Scarf');
    const seedProject = Store.getProject('d2');
    if (seedProject) {
      // Directly store the badge without triggering animations
      const meta = { emoji: '🧶', name: 'Yarn Whisperer', color: '#a78bfa', ribbon: '#7c3aed', desc: 'Knitted their way to a beautiful finish.' };
      Store.addBadge({
        id: 'b_seed_d2', projectId: 'd2', projectName: 'Winter Scarf',
        category: 'knitting', name: meta.name, emoji: meta.emoji,
        color: meta.color, ribbon: meta.ribbon, desc: meta.desc,
        earnedAt: new Date(now - 40 * 864e5).toISOString(),
      });
    }
  }

  // ── Boot ──────────────────────────────────────────────────
  function _boot() {
    _initTheme();
    Background.init();
    Progress.init();

    Auth.init(() => {
      _seedDemo();
      _updateGreeting();

      // Module inits
      Dashboard.init();
      StatModal.init();
      Notifications.init();
      Badges.init();
      Share.init();
      Music.init();

      // Widget inits
      Widgets.initClock();
      Widgets.initCalendar();
      Widgets.initWeather();
      Widgets.initNews();
      Widgets.initPopoverDismiss();

      // Nav
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
      });

      // Theme toggle
      document.getElementById('themeToggle').addEventListener('click', () => {
        const c = document.documentElement.getAttribute('data-theme');
        _applyTheme(c === 'dark' ? 'light' : 'dark');
      });

      // User menu
      document.getElementById('userMenuBtn').addEventListener('click', () => {
        if (confirm('Sign out?')) Auth.signOut();
      });

      navigate('dashboard');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  return { toast, navigate, refresh };
})();
