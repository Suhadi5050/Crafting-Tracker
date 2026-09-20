/**
 * notifications.js v2 — Reminder evaluation, notification drawer, browser notifications
 */

const Notifications = (() => {
  let _reminders = [];

  // ── Evaluate all active projects ─────────────────────────
  function evaluate() {
    const projects = Store.getProjects();
    const now      = Date.now();
    const next     = [];

    for (const p of projects) {
      if (p.progress >= 100) continue;
      const due = p.deadline ? new Date(p.deadline).getTime() : null;

      if (due && due < now) {
        next.push({ id: 'ov_' + p.id, projectId: p.id, type: 'overdue',
          title: '⚠️ Overdue: ' + p.name,
          text : 'Passed its deadline on ' + _fmt(p.deadline) + '.' });
        continue;
      }
      if (due && (due - now) < 3 * 24 * 60 * 60 * 1000) {
        next.push({ id: 'dl_' + p.id, projectId: p.id, type: 'deadline',
          title: '⏰ Due soon: ' + p.name,
          text : 'Due on ' + _fmt(p.deadline) + '. Almost there!' });
        continue;
      }
      if (p.reminder && p.reminder !== 'none' && _shouldRemind(p)) {
        next.push({ id: 'rm_' + p.id, projectId: p.id, type: 'reminder',
          title: '📌 Reminder: ' + p.name,
          text : 'Remember to update progress for "' + p.name + '".' });
      }
    }

    _reminders = next;
    _render();
    _browserNotify();
  }

  function _shouldRemind(p) {
    if (p.reminder === 'daily')    return true;
    if (p.reminder === 'weekly')   return new Date().getDay() === 1;
    if (p.reminder === 'deadline') {
      if (!p.deadline) return false;
      const diff = new Date(p.deadline).getTime() - Date.now();
      return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
    }
    return false;
  }

  function removeForProject(id) {
    _reminders = _reminders.filter(r => r.projectId !== id);
    _render();
  }

  function _render() {
    const list  = document.getElementById('notifList');
    const empty = document.getElementById('notifEmpty');
    const badge = document.getElementById('notifCount');

    list.innerHTML = '';
    if (_reminders.length === 0) {
      empty.classList.remove('hidden');
      badge.classList.add('hidden');
    } else {
      empty.classList.add('hidden');
      badge.textContent = _reminders.length;
      badge.classList.remove('hidden');
      _reminders.forEach(r => {
        const li = document.createElement('li');
        li.className = `notif-item notif-item--${r.type}`;
        li.innerHTML = `<div class="notif-item__title">${r.title}</div><div class="notif-item__text">${r.text}</div>`;
        list.appendChild(li);
      });
    }
  }

  // ── Browser push notification (permission-gated) ──────────
  function _browserNotify() {
    if (!_reminders.length) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      _reminders.slice(0, 3).forEach(r => {
        new Notification(r.title, { body: r.text, icon: '' });
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function toggleDrawer() {
    document.getElementById('notifDrawer').classList.toggle('hidden');
  }

  function clearAll() {
    _reminders = [];
    _render();
  }

  function _fmt(str) {
    return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function init() {
    document.getElementById('notifBtn').addEventListener('click', toggleDrawer);
    document.getElementById('clearNotifs').addEventListener('click', clearAll);

    document.addEventListener('click', e => {
      const drawer = document.getElementById('notifDrawer');
      const btn    = document.getElementById('notifBtn');
      if (!drawer.classList.contains('hidden') &&
          !drawer.contains(e.target) &&
          !btn.contains(e.target)) {
        drawer.classList.add('hidden');
      }
    });

    evaluate();
    setInterval(evaluate, 5 * 60 * 1000);
  }

  return { init, evaluate, removeForProject, clearAll };
})();
