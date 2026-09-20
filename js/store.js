/**
 * store.js v2 — localStorage state with XP/level system
 */

const Store = (() => {
  const KEYS = {
    PROJECTS : 'ct_projects',
    BADGES   : 'ct_badges',
    SETTINGS : 'ct_settings',
    USER     : 'ct_user',
  };

  const _read  = k => JSON.parse(localStorage.getItem(k) || 'null');
  const _write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ── XP / Level config ─────────────────────────────────────
  const XP_PER_PROJECT = 120;
  const XP_MILESTONES  = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000];
  const LEVEL_NAMES    = ['Rookie', 'Apprentice', 'Crafter', 'Artisan', 'Expert',
                          'Master', 'Grandmaster', 'Legend', 'Mythic', 'Celestial', 'God-Tier'];

  // ── User ─────────────────────────────────────────────────
  function getUser() {
    return Object.assign({
      name: 'Crafter', avatar: null, provider: 'guest',
      xp: 0, level: 1, xpHistory: []
    }, _read(KEYS.USER) || {});
  }

  function saveUser(patch) {
    _write(KEYS.USER, Object.assign(getUser(), patch));
  }

  function addXP(amount, reason = '') {
    const user    = getUser();
    const oldLvl  = _levelOf(user.xp);
    user.xp      += amount;
    user.xpHistory.push({ amount, reason, at: new Date().toISOString() });
    if (user.xpHistory.length > 50) user.xpHistory = user.xpHistory.slice(-50);
    const newLvl  = _levelOf(user.xp);
    user.level    = newLvl;
    _write(KEYS.USER, user);
    return { oldLevel: oldLvl, newLevel: newLvl, levelled: newLvl > oldLvl };
  }

  function _levelOf(xp) {
    let lvl = 1;
    for (let i = 1; i < XP_MILESTONES.length; i++) {
      if (xp >= XP_MILESTONES[i]) lvl = i + 1; else break;
    }
    return Math.min(lvl, LEVEL_NAMES.length);
  }

  function getLevelInfo() {
    const user   = getUser();
    const lvl    = _levelOf(user.xp);
    const curMin = XP_MILESTONES[lvl - 1] || 0;
    const nextMin= XP_MILESTONES[lvl]     || XP_MILESTONES[XP_MILESTONES.length - 1];
    const pct    = nextMin > curMin ? Math.round((user.xp - curMin) / (nextMin - curMin) * 100) : 100;
    return { level: lvl, name: LEVEL_NAMES[lvl - 1] || 'Celestial', xp: user.xp, pct, curMin, nextMin };
  }

  // ── Projects ─────────────────────────────────────────────
  function getProjects() { return _read(KEYS.PROJECTS) || []; }

  function saveProject(project) {
    const list = getProjects();
    const idx  = list.findIndex(p => p.id === project.id);
    if (idx >= 0) list[idx] = project; else list.unshift(project);
    _write(KEYS.PROJECTS, list);
    return project;
  }

  function deleteProject(id) {
    _write(KEYS.PROJECTS, getProjects().filter(p => p.id !== id));
  }

  function getProject(id) { return getProjects().find(p => p.id === id) || null; }

  // ── Badges ───────────────────────────────────────────────
  function getBadges()    { return _read(KEYS.BADGES) || []; }

  function addBadge(badge) {
    const list = getBadges();
    if (!list.find(b => b.projectId === badge.projectId)) {
      list.unshift(badge);
      _write(KEYS.BADGES, list);
    }
  }

  // ── Settings ─────────────────────────────────────────────
  function getSettings() { return Object.assign({ theme: 'dark' }, _read(KEYS.SETTINGS) || {}); }
  function saveSettings(patch) { _write(KEYS.SETTINGS, Object.assign(getSettings(), patch)); }

  // ── Stats ─────────────────────────────────────────────────
  function getStats() {
    const now = Date.now();
    let active = 0, done = 0, overdue = 0;
    for (const p of getProjects()) {
      if (p.progress >= 100) { done++; continue; }
      if (p.deadline && new Date(p.deadline).getTime() < now) overdue++;
      else active++;
    }
    return { total: getProjects().length, active, done, overdue };
  }

  return {
    getUser, saveUser, addXP, getLevelInfo,
    getProjects, saveProject, deleteProject, getProject,
    getBadges, addBadge,
    getSettings, saveSettings, getStats,
    XP_PER_PROJECT,
  };
})();
