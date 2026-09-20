/**
 * dashboard.js v3
 * Changes from v2:
 *  - Project cards are fully clickable (whole card opens edit modal)
 *  - Stat boxes open a filtered project-list modal via StatModal
 *  - Action buttons still work independently via stopPropagation
 */

const Dashboard = (() => {

  const CATEGORY_META = {
    sewing   : { emoji: '🧵', label: 'Sewing' },
    knitting : { emoji: '🧶', label: 'Knitting' },
    woodwork : { emoji: '🪵', label: 'Woodwork' },
    painting : { emoji: '🎨', label: 'Painting' },
    jewelry  : { emoji: '💎', label: 'Jewelry' },
    pottery  : { emoji: '🏺', label: 'Pottery' },
    other    : { emoji: '✨', label: 'Other' },
  };

  function _deadlineStatus(dl) {
    if (!dl) return null;
    const diff = new Date(dl).getTime() - Date.now();
    if (diff < 0)                         return 'overdue';
    if (diff < 3 * 24 * 60 * 60 * 1000)  return 'deadline';
    return 'ok';
  }

  function _fmtDate(str) {
    return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Build project card DOM ────────────────────────────────
  // clickable = true means whole card fires openModal; false used inside stat modal
  function _buildCard(project, { clickable = true } = {}) {
    const meta   = CATEGORY_META[project.category] || CATEGORY_META.other;
    const isDone = project.progress >= 100;
    const status = isDone ? 'done' : _deadlineStatus(project.deadline);

    let tagHTML = '';
    if (isDone)                   tagHTML = `<span class="project-card__tag project-card__tag--done">✓ Done</span>`;
    else if (status === 'overdue')  tagHTML = `<span class="project-card__tag project-card__tag--overdue">⚠ Overdue</span>`;
    else if (status === 'deadline') tagHTML = `<span class="project-card__tag project-card__tag--deadline">⏰ Due soon</span>`;
    else                            tagHTML = `<span class="project-card__tag">${meta.label}</span>`;

    const dueRow = project.deadline ? `
      <div class="deadline-row">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        Due ${_fmtDate(project.deadline)}
      </div>` : '';

    const fillClass = isDone ? 'progress-bar__fill--done' : status === 'overdue' ? 'progress-bar__fill--overdue' : '';

    const card = document.createElement('article');
    card.className = 'project-card glass-card';
    card.dataset.id = project.id;
    // Whole-card click opens edit (unless it's inside stat modal which also works the same way)
    if (clickable) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Edit project: ${project.name}`);
    }

    card.innerHTML = `
      <div class="project-card__header">
        <div style="flex:1;min-width:0">
          <div class="project-card__title">${_esc(project.name)}</div>
          ${project.goal ? `<div class="project-card__desc" style="margin-top:2px">${_esc(project.goal)}</div>` : ''}
        </div>
        <span class="project-card__emoji">${meta.emoji}</span>
      </div>
      ${project.description ? `<p class="project-card__desc">${_esc(project.description)}</p>` : ''}
      <div class="project-card__meta">${tagHTML}${dueRow}</div>
      <div class="progress-wrap">
        <div class="progress-label-row">
          <span class="progress-text">${isDone ? 'Finished! 🎉' : 'Progress'}</span>
          <span class="progress-pct">${project.progress}%</span>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuenow="${project.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar__fill ${fillClass}" style="width:0%"></div>
        </div>
      </div>
      <div class="project-card__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${project.id}" title="Edit project">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>Edit
        </button>
        ${isDone ? `
        <button class="btn btn--success btn--sm" data-action="share" data-id="${project.id}" title="Share badge">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg>Share
        </button>` : `
        <button class="btn btn--ghost btn--sm" data-action="update" data-id="${project.id}" title="Update progress">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>Update
        </button>`}
        <button class="btn btn--danger btn--sm" data-action="delete" data-id="${project.id}" style="margin-left:auto" title="Delete">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    `;

    // Keyboard support: Enter/Space on card triggers the same as click
    if (clickable) {
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const project = Store.getProject(card.dataset.id);
          if (project) openModal(project);
        }
      });
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fill = card.querySelector('.progress-bar__fill');
      if (fill) fill.style.width = project.progress + '%';
    }));

    return card;
  }

  // Exposed so StatModal can use the same card renderer
  function buildCard(project, opts) { return _buildCard(project, opts); }

  // ── Render dashboard ──────────────────────────────────────
  function renderDashboard() {
    const grid        = document.getElementById('recentProjects');
    const empty       = document.getElementById('dashEmpty');
    const searchEmpty = document.getElementById('dashSearchEmpty');
    const s           = Store.getStats();

    document.getElementById('stat-total').textContent   = s.total;
    document.getElementById('stat-active').textContent  = s.active;
    document.getElementById('stat-done').textContent    = s.done;
    document.getElementById('stat-overdue').textContent = s.overdue;

    // Apply dashboard search filter (searches name, description, goal)
    const q = (document.getElementById('dashSearch').value || '').trim().toLowerCase();
    let projects = Store.getProjects().slice(0, 6);
    if (q) {
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.goal || '').toLowerCase().includes(q)
      );
    }

    grid.innerHTML = '';
    empty.classList.add('hidden');
    searchEmpty.classList.add('hidden');

    if (Store.getProjects().length === 0) {
      // No projects at all
      empty.classList.remove('hidden');
      return;
    }
    if (projects.length === 0) {
      // Projects exist but none match the search
      searchEmpty.classList.remove('hidden');
      return;
    }
    projects.forEach(p => grid.appendChild(_buildCard(p)));
  }

  // ── Render all projects ───────────────────────────────────
  function renderAllProjects() {
    const search = document.getElementById('projectSearch').value.trim().toLowerCase();
    const filter = document.getElementById('projectFilter').value;
    const grid   = document.getElementById('allProjects');
    const empty  = document.getElementById('projectsEmpty');
    const now    = Date.now();

    let list = Store.getProjects();
    if (search) list = list.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.description || '').toLowerCase().includes(search) ||
      (p.goal || '').toLowerCase().includes(search)
    );
    if (filter !== 'all') list = list.filter(p => {
      if (filter === 'completed') return p.progress >= 100;
      if (filter === 'overdue')   return p.progress < 100 && p.deadline && new Date(p.deadline).getTime() < now;
      if (filter === 'active')    return p.progress < 100 && (!p.deadline || new Date(p.deadline).getTime() >= now);
      return true;
    });

    grid.innerHTML = '';
    if (list.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.forEach(p => grid.appendChild(_buildCard(p)));
  }

  // ── Modal open/close ──────────────────────────────────────
  function openModal(project = null) {
    const lbl = document.getElementById('progressLabel');
    document.getElementById('projectForm').reset();

    if (project) {
      document.getElementById('modalTitle').textContent    = 'Edit Project';
      document.getElementById('projectId').value           = project.id;
      document.getElementById('projName').value            = project.name;
      document.getElementById('projDesc').value            = project.description || '';
      document.getElementById('projCategory').value        = project.category || 'other';
      document.getElementById('projDeadline').value        = project.deadline || '';
      document.getElementById('projGoal').value            = project.goal || '';
      document.getElementById('projProgress').value        = project.progress || 0;
      document.getElementById('projReminder').value        = project.reminder || 'none';
      lbl.textContent = (project.progress || 0) + '%';
    } else {
      document.getElementById('modalTitle').textContent = 'New Project';
      document.getElementById('projectId').value        = '';
      lbl.textContent = '0%';
    }
    document.getElementById('projectModal').classList.remove('hidden');
    document.getElementById('projName').focus();
  }

  // openModalWithDate: pre-fill deadline (used by calendar popover)
  function openModalWithDate(dateStr) {
    openModal(null);
    document.getElementById('projDeadline').value = dateStr;
  }

  function closeModal() {
    document.getElementById('projectModal').classList.add('hidden');
  }

  // ── Form submit ───────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('projName').value.trim();
    if (!name) { App.toast('Project name is required.', 'error'); return; }

    const id       = document.getElementById('projectId').value || _uid();
    const progress = parseInt(document.getElementById('projProgress').value, 10);
    const existing = Store.getProject(id);
    const wasComplete = existing && existing.progress >= 100;

    const project = {
      id, name,
      description : document.getElementById('projDesc').value.trim(),
      category    : document.getElementById('projCategory').value,
      deadline    : document.getElementById('projDeadline').value || null,
      goal        : document.getElementById('projGoal').value.trim(),
      progress,
      reminder    : document.getElementById('projReminder').value,
      createdAt   : existing ? existing.createdAt : new Date().toISOString(),
      updatedAt   : new Date().toISOString(),
    };

    Store.saveProject(project);

    if (progress >= 100 && !wasComplete) {
      const xpResult = Store.addXP(Store.XP_PER_PROJECT, `Completed: ${name}`);
      Badges.award(project);
      Notifications.removeForProject(id);
      Progress.showXPGain(Store.XP_PER_PROJECT);
      if (xpResult.levelled) Progress.showLevelUp(xpResult.newLevel);
    }

    closeModal();
    App.refresh();
    Notifications.evaluate();
    Widgets.refreshCalendar();
    App.toast(existing ? 'Project updated! ✅' : 'Project created! 🚀', 'success');
  }

  // ── Card action dispatcher ────────────────────────────────
  // Handles clicks from ANY grid (recentProjects, allProjects, statModal)
  function handleCardAction(e) {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      // A specific action button was clicked — don't also open the modal
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'edit' || action === 'update') { openModal(Store.getProject(id)); }
      else if (action === 'delete') {
        if (confirm('Delete this project? This cannot be undone.')) {
          Store.deleteProject(id);
          Notifications.removeForProject(id);
          Widgets.refreshCalendar();
          App.refresh();
          App.toast('Project deleted.', 'info');
        }
      } else if (action === 'share') { Share.openModal(id); }
      return;
    }

    // Whole-card click → open edit modal immediately
    const card = e.target.closest('.project-card[data-id]');
    if (card) {
      const project = Store.getProject(card.dataset.id);
      if (project) openModal(project);
    }
  }

  function _uid() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    document.getElementById('addProjectBtn').addEventListener('click', () => openModal());
    document.getElementById('dashAddBtn').addEventListener('click',   () => openModal());
    document.getElementById('closeModal').addEventListener('click',   closeModal);
    document.getElementById('cancelModal').addEventListener('click',  closeModal);
    document.getElementById('projectModal').addEventListener('click', e => {
      if (e.target === document.getElementById('projectModal')) closeModal();
    });
    document.getElementById('projectForm').addEventListener('submit', handleSubmit);
    document.getElementById('projProgress').addEventListener('input', e => {
      document.getElementById('progressLabel').textContent = e.target.value + '%';
    });

    // Card clicks — delegated to all three grids
    ['recentProjects', 'allProjects', 'statModalProjects'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', handleCardAction);
    });

    document.getElementById('projectSearch').addEventListener('input',  renderAllProjects);
    document.getElementById('projectFilter').addEventListener('change', renderAllProjects);

    // Dashboard recent-projects search
    document.getElementById('dashSearch').addEventListener('input', renderDashboard);
  }

  return { init, renderDashboard, renderAllProjects, openModal, openModalWithDate, buildCard, CATEGORY_META };
})();
