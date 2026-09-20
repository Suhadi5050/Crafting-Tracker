/**
 * widgets.js v3
 * Changes from v2:
 *  - Calendar days are clickable: show cal-popover with projects due on that day
 *  - News widget triggers popup notifications every 10 min
 *  - Weather + News unchanged from v2 otherwise
 */

const Widgets = (() => {

  // ── CLOCK ─────────────────────────────────────────────────
  function initClock() {
    const timeEl = document.getElementById('clockTime');
    const dateEl = document.getElementById('clockDate');
    if (!timeEl) return;
    function tick() {
      const now = new Date();
      timeEl.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map(n => String(n).padStart(2, '0')).join(':');
      dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── CALENDAR ──────────────────────────────────────────────
  let _calYear, _calMonth;

  function initCalendar() {
    const now = new Date();
    _calYear  = now.getFullYear();
    _calMonth = now.getMonth();
    _renderCalendar();
  }

  function _renderCalendar() {
    const el = document.getElementById('calendarWidget');
    if (!el) return;

    const now        = new Date();
    const daysInMonth= new Date(_calYear, _calMonth + 1, 0).getDate();
    const startDow   = new Date(_calYear, _calMonth, 1).getDay();
    const monthName  = new Date(_calYear, _calMonth, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Build a map: day → array of projects due on that day
    const dueMap = {};
    Store.getProjects().forEach(p => {
      if (!p.deadline) return;
      const d = new Date(p.deadline);
      if (d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
        const day = d.getDate();
        if (!dueMap[day]) dueMap[day] = [];
        dueMap[day].push(p);
      }
    });

    const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html = `
      <div class="cal-header">
        <button id="calPrev" aria-label="Previous month">‹</button>
        <span class="cal-header__title">${monthName}</span>
        <button id="calNext" aria-label="Next month">›</button>
      </div>
      <div class="cal-grid">
        ${DAYS.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
    `;

    for (let i = 0; i < startDow; i++) html += `<div class="cal-day cal-day--other-month"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday      = d === now.getDate() && _calMonth === now.getMonth() && _calYear === now.getFullYear();
      const hasDeadline  = !!dueMap[d];
      const count        = dueMap[d] ? dueMap[d].length : 0;
      let cls = 'cal-day';
      if (isToday)                    cls += ' cal-day--today';
      if (hasDeadline && !isToday)    cls += ' cal-day--has-deadline';
      const badge = count > 0 && !isToday ? `<sup style="font-size:.55em;vertical-align:super;color:var(--accent-warning)">${count}</sup>` : '';
      // data attrs for popover
      html += `<div class="${cls}" data-cal-day="${d}" title="${hasDeadline ? count + ' deadline(s)' : ''}">${d}${badge}</div>`;
    }

    html += '</div>';
    el.innerHTML = html;

    el.querySelector('#calPrev').addEventListener('click', e => { e.stopPropagation(); _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } _renderCalendar(); });
    el.querySelector('#calNext').addEventListener('click', e => { e.stopPropagation(); _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } _renderCalendar(); });

    // Day click → popover
    el.querySelectorAll('.cal-day[data-cal-day]').forEach(dayEl => {
      dayEl.addEventListener('click', e => {
        e.stopPropagation();
        const day = parseInt(dayEl.dataset.calDay, 10);
        _showCalPopover(dayEl, day, dueMap[day] || []);
      });
    });
  }

  // ── Calendar popover ──────────────────────────────────────
  function _showCalPopover(anchorEl, day, projects) {
    const popover  = document.getElementById('calPopover');
    const titleEl  = document.getElementById('calPopoverTitle');
    const listEl   = document.getElementById('calPopoverList');
    const emptyEl  = document.getElementById('calPopoverEmpty');
    const addBtn   = document.getElementById('calPopoverAddBtn');

    const dateStr = `${_calYear}-${String(_calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const label   = new Date(_calYear, _calMonth, day)
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    titleEl.textContent = label;
    listEl.innerHTML    = '';

    if (projects.length === 0) {
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      projects.forEach(p => {
        const li = document.createElement('li');
        li.className = 'cal-popover__item';
        li.textContent = p.name + (p.progress >= 100 ? ' ✓' : ` (${p.progress}%)`);
        li.addEventListener('click', () => { Dashboard.openModal(p); _closeCalPopover(); });
        listEl.appendChild(li);
      });
    }

    // Add project for this date
    addBtn.onclick = () => { Dashboard.openModalWithDate(dateStr); _closeCalPopover(); };

    // Position the popover near the clicked day cell
    const rect    = anchorEl.getBoundingClientRect();
    const pw      = 240;
    let left      = rect.left + window.scrollX;
    const top     = rect.bottom + window.scrollY + 6;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    popover.style.left = left + 'px';
    popover.style.top  = top  + 'px';
    popover.classList.remove('hidden');
  }

  function _closeCalPopover() {
    document.getElementById('calPopover').classList.add('hidden');
  }

  function refreshCalendar() { _renderCalendar(); }

  // ── WEATHER ───────────────────────────────────────────────
  function initWeather() {
    if (!Config.USE_REAL_WEATHER) { _renderWeatherPlaceholder(); return; }
    if (!navigator.geolocation)   { return; }
    navigator.geolocation.getCurrentPosition(
      pos => _fetchWeather(pos.coords.latitude, pos.coords.longitude),
      ()  => {}
    );
  }

  async function _fetchWeather(lat, lon) {
    try {
      const url  = `${Config.WEATHER_ENDPOINT}?lat=${lat}&lon=${lon}&appid=${Config.WEATHER_API_KEY}&units=metric`;
      const data = await fetch(url).then(r => r.json());
      const ICONS = { Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️', Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Haze:'🌁' };
      document.getElementById('weatherIcon').textContent = ICONS[data.weather[0].main] || '🌡️';
      document.getElementById('weatherTemp').textContent = `${Math.round(data.main.temp)}°C`;
      document.getElementById('weatherDesc').textContent = data.weather[0].description.replace(/\b\w/g,c=>c.toUpperCase());
      document.getElementById('weatherCity').textContent = `${data.name}, ${data.sys.country}`;
    } catch { /* fail silently */ }
  }

  function _renderWeatherPlaceholder() {
    const c = document.getElementById('weatherContent');
    if (!c) return;
    c.innerHTML = `<div class="weather-placeholder">
      <div style="font-size:2.2rem;margin-bottom:6px">🌤️</div>
      <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px">Weather Widget</div>
      <div>Add your OpenWeatherMap API key in <code>js/config.js</code> and set <code>USE_REAL_WEATHER: true</code>.</div>
    </div>`;
  }

  // ── NEWS ──────────────────────────────────────────────────
  let _newsItems = [];
  let _newsTickerIdx = 0;

  function initNews() {
    if (!Config.USE_REAL_NEWS) { _renderNewsMock(); }
    else { _fetchNews(); }

    // Popup notification every 10 minutes
    setInterval(_showNewsTickerPopup, 10 * 60 * 1000);
  }

  const MOCK_NEWS = [
    { title: 'Top 10 Knitting Patterns for Winter 2025',     source: 'CraftDaily',  url: '#' },
    { title: 'How to choose the perfect fabric for quilting', source: 'SewingWorld', url: '#' },
    { title: 'Gen Z is bringing macramé back — here\'s why', source: 'TrendCraft',  url: '#' },
    { title: 'DIY jewelry trends dominating social media',    source: 'GemCrafter',  url: '#' },
    { title: 'Pottery classes are booming in urban areas',    source: 'ClayReport',  url: '#' },
  ];

  function _renderNewsMock() {
    _newsItems = MOCK_NEWS;
    _renderNewsList(MOCK_NEWS);
  }

  async function _fetchNews() {
    try {
      const url  = `${Config.NEWS_ENDPOINT}?q=crafting+DIY&token=${Config.NEWS_API_KEY}&lang=en&max=5`;
      const data = await fetch(url).then(r => r.json());
      const items= (data.articles || []).slice(0, 5).map(a => ({ title: a.title, source: a.source?.name || 'News', url: a.url }));
      _newsItems = items.length ? items : MOCK_NEWS;
      _renderNewsList(_newsItems);
    } catch { _renderNewsMock(); }
  }

  function _renderNewsList(items) {
    const list = document.getElementById('newsList');
    if (!list) return;
    list.innerHTML = items.map(item => `
      <li class="news-item">
        <a href="${item.url}" target="_blank" rel="noopener">
          <div class="news-item__title">${item.title}</div>
          <div class="news-item__meta">${item.source}</div>
        </a>
      </li>
    `).join('');
  }

  function _showNewsTickerPopup() {
    if (!_newsItems.length) return;
    const item = _newsItems[_newsTickerIdx % _newsItems.length];
    _newsTickerIdx++;

    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'news-ticker-toast';
    el.innerHTML = `
      <span class="news-ticker-toast__icon">📰</span>
      <div>
        <div class="news-ticker-toast__title">${item.title}</div>
        <div class="news-ticker-toast__source">${item.source}</div>
      </div>
    `;
    container.appendChild(el);

    const remove = () => {
      el.classList.add('toast--exit');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    el.addEventListener('click', remove);
    setTimeout(remove, 8000);
  }

  // ── Close popover on outside click ────────────────────────
  function initPopoverDismiss() {
    document.addEventListener('click', e => {
      const popover = document.getElementById('calPopover');
      const closeBtn = document.getElementById('closeCalPopover');
      if (!popover.classList.contains('hidden') && !popover.contains(e.target)) {
        _closeCalPopover();
      }
    });
    document.getElementById('closeCalPopover').addEventListener('click', _closeCalPopover);
  }

  return { initClock, initCalendar, initWeather, initNews, initPopoverDismiss, refreshCalendar };
})();
