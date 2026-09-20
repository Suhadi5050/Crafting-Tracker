/**
 * statmodal.js — Filtered project list pop-up
 * Opened when user clicks any stat card (Total / Active / Completed / Overdue)
 */

const StatModal = (() => {

  const TITLES = {
    all       : 'All Projects',
    active    : 'In Progress',
    completed : 'Completed',
    overdue   : 'Overdue',
  };

  function open(filter) {
    const modal = document.getElementById('statModal');
    const title = document.getElementById('statModalTitle');
    const grid  = document.getElementById('statModalProjects');
    const empty = document.getElementById('statModalEmpty');

    title.textContent = TITLES[filter] || 'Projects';

    const now     = Date.now();
    let projects  = Store.getProjects();

    if (filter !== 'all') {
      projects = projects.filter(p => {
        if (filter === 'completed') return p.progress >= 100;
        if (filter === 'overdue')   return p.progress < 100 && p.deadline && new Date(p.deadline).getTime() < now;
        if (filter === 'active')    return p.progress < 100 && (!p.deadline || new Date(p.deadline).getTime() >= now);
        return true;
      });
    }

    grid.innerHTML = '';
    if (projects.length === 0) {
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      projects.forEach(p => grid.appendChild(Dashboard.buildCard(p)));
    }

    modal.classList.remove('hidden');
  }

  function close() {
    document.getElementById('statModal').classList.add('hidden');
  }

  function init() {
    document.getElementById('closeStatModal').addEventListener('click', close);
    document.getElementById('statModal').addEventListener('click', e => {
      if (e.target === document.getElementById('statModal')) close();
    });

    // Stat card buttons
    document.getElementById('statsGrid').addEventListener('click', e => {
      const btn = e.target.closest('.stat-btn');
      if (btn) open(btn.dataset.filter);
    });
  }

  return { init, open, close };
})();
