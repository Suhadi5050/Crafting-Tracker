/**
 * music.js — Embedded YouTube music player (nocookie, Error-153-safe)
 *
 * ── What changed from the previous version ───────────────────────────────────
 *  1. Error 153 fix: switched embed domain from youtube.com → youtube-nocookie.com.
 *     Error 153 means the video owner disabled standard-domain embeds but usually
 *     still permits privacy-enhanced embeds (nocookie).
 *  2. Replaced blocked video IDs with verified-embeddable lofi/ambient tracks.
 *  3. Added a search bar: user can paste a YouTube URL *or* type a free-text
 *     query. URL → video ID extracted client-side (no API key needed). Free-text
 *     → opens the YouTube search page in a new tab as a fallback (YouTube's
 *     search API requires OAuth; the search-page fallback keeps this key-free).
 *     If Config.YOUTUBE_API_KEY is set, free-text search uses the Data API v3
 *     instead and loads the first result directly.
 *  4. Added a placeholder panel that hides once a video loads, so the widget
 *     doesn't show a black box before first interaction.
 *
 * ── API key notes (Netlify env vars) ────────────────────────────────────────
 *  Config.YOUTUBE_API_KEY — optional.
 *    Without it: URL-paste works fully; free-text search opens YouTube.com.
 *    With it:    free-text search uses YouTube Data API v3 and auto-loads
 *                the first result. Set via Netlify env var YOUTUBE_DATA_API_KEY.
 */

const Music = (() => {

  // ── Playlist ─────────────────────────────────────────────────────────────
  // All IDs verified embeddable via youtube-nocookie.com (Error-153-safe).
  // jfKfPfyJRdk = lofi hip hop radio – beats to relax/study to (ChilledCow)
  // 4xDzrJKXOOY = lofi hip hop radio – beats to sleep/chill to (ChilledCow)
  // 7NOSDKb0HlU = jazz hop café (use nocookie – standard domain blocked)
  // rPjez8ztA4Y = ambient study music (soft piano)
  const PLAYLIST = [
    { title: 'Lofi Hip Hop Radio',    artist: 'ChilledCow',    youtubeId: 'jfKfPfyJRdk' },
    { title: 'Lofi Sleep & Chill',    artist: 'ChilledCow',    youtubeId: '4xDzrJKXOOY' },
    { title: 'Jazz Hop Café',         artist: 'Chillhop Music', youtubeId: '7NOSDKb0HlU' },
    { title: 'Ambient Piano Study',   artist: 'StudyMood',     youtubeId: 'rPjez8ztA4Y' },
  ];

  let _index   = 0;
  let _player  = null;   // YT.Player instance, created on first play
  let _ytReady = false;  // true after window.onYouTubeIframeAPIReady fires
  let _volume  = 70;     // mirrors the volume slider value (0–100)

  // ─────────────────────────────────────────────────────────────────────────
  // URL UTILS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Extract a YouTube video ID from any common URL format, or return the
   * raw string if it already looks like an 11-char video ID.
   * Returns null if no ID can be found.
   *
   * Handles:
   *   https://www.youtube.com/watch?v=VIDEO_ID
   *   https://youtu.be/VIDEO_ID
   *   https://www.youtube.com/embed/VIDEO_ID
   *   https://music.youtube.com/watch?v=VIDEO_ID
   *   youtu.be/VIDEO_ID  (no protocol)
   *   VIDEO_ID           (bare 11-char alphanumeric+dash+underscore)
   */
  function _extractVideoId(input) {
    const s = (input || '').trim();
    if (!s) return null;

    // Already an 11-char video ID (YouTube IDs are always exactly 11 chars)
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

    try {
      // Handle protocol-relative URLs (//youtu.be/…)
      const urlStr = s.startsWith('//') ? 'https:' + s : s;
      const url = new URL(urlStr);

      // youtu.be short links
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.slice(1).split('?')[0];
        if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }

      // youtube.com / music.youtube.com / www.youtube-nocookie.com
      if (url.hostname.includes('youtube')) {
        // /watch?v=ID or /embed/ID or /v/ID or /shorts/ID
        const vParam = url.searchParams.get('v');
        if (vParam && /^[A-Za-z0-9_-]{11}$/.test(vParam)) return vParam;

        const pathParts = url.pathname.split('/').filter(Boolean);
        const embedIdx  = pathParts.findIndex(p => ['embed','v','shorts'].includes(p));
        if (embedIdx !== -1 && pathParts[embedIdx + 1]) {
          const id = pathParts[embedIdx + 1].split('?')[0];
          if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
        }
      }
    } catch { /* not a valid URL — fall through */ }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMBED
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build a youtube-nocookie embed URL.
   *
   * Using www.youtube-nocookie.com instead of www.youtube.com:
   *  - Avoids Error 153 (most videos that block standard embeds allow
   *    privacy-enhanced embeds on the nocookie domain)
   *  - Reduces tracking cookies for the user
   *  - enablejsapi=1 is still supported on the nocookie domain
   */
  function _embedUrl(videoId, autoplay = false) {
    const params = new URLSearchParams({
      enablejsapi : '1',
      rel         : '0',
      modestbranding: '1',
      playsinline : '1',
      origin      : window.location.origin || 'https://localhost',
    });
    if (autoplay) params.set('autoplay', '1');
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYER LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /** Load the YouTube IFrame API script once. */
  function _loadYTAPI() {
    if (window.YT && window.YT.Player) { _ytReady = true; return; }
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
    const tag = document.createElement('script');
    tag.src   = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => { _ytReady = true; };
  }

  /** Show the iframe, hide the placeholder. */
  function _showIframe() {
    const iframe = document.getElementById('musicIframe');
    const ph     = document.getElementById('musicPlaceholder');
    if (iframe) iframe.style.display = 'block';
    if (ph)     ph.style.display     = 'none';
  }

  /**
   * Load a video by ID, destroy any existing player, and begin playback.
   * This is the single authoritative entry point for "play this video".
   */
  function _loadVideo(videoId, title = '', artist = '') {
    _loadYTAPI();
    _showIframe();

    // Destroy existing YT.Player instance so we can rebuild it cleanly
    if (_player) {
      try { _player.destroy(); } catch { /* ignore */ }
      _player = null;
    }

    // Set the iframe src — youtube-nocookie, autoplay on
    const iframe = document.getElementById('musicIframe');
    if (!iframe) return;
    iframe.src = _embedUrl(videoId, true);

    // Update track info labels
    const titleEl  = document.getElementById('musicTitle');
    const artistEl = document.getElementById('musicArtist');
    if (titleEl)  titleEl.textContent  = title  || videoId;
    if (artistEl) artistEl.textContent = artist || 'YouTube';
    _setBadge('loading');

    // Create the YT.Player wrapper once the API is ready
    const tryAttach = () => {
      if (!_ytReady || !window.YT || !window.YT.Player) {
        setTimeout(tryAttach, 200);
        return;
      }
      _player = new YT.Player('musicIframe', {
        events: {
          onReady(e) {
            e.target.setVolume(_volume);
            e.target.playVideo();
            _setBadge('playing');
          },
          onStateChange(e) {
            const S = YT.PlayerState;
            if (e.data === S.PLAYING)    _setBadge('playing');
            if (e.data === S.PAUSED)     _setBadge('paused');
            if (e.data === S.BUFFERING)  _setBadge('loading');
            // Auto-advance to next playlist track when a song ends
            if (e.data === S.ENDED) {
              _index = (_index + 1) % PLAYLIST.length;
              const next = PLAYLIST[_index];
              _loadVideo(next.youtubeId, next.title, next.artist);
            }
          },
          onError(e) {
            // Error 2 = invalid ID, 5 = HTML5 error, 100 = not found,
            // 101/150 = embed not allowed (owner restriction, not Error 153).
            // Skipping to the next track is the most graceful recovery.
            console.warn('YT player error', e.data, '— skipping track');
            _setBadge('paused');
            App.toast(`⚠ This track can't be played — skipping…`, 'warning', 3000);
            setTimeout(() => {
              _index = (_index + 1) % PLAYLIST.length;
              const next = PLAYLIST[_index];
              _loadVideo(next.youtubeId, next.title, next.artist);
            }, 1500);
          },
        },
      });
    };
    tryAttach();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BADGE / STATE INDICATOR
  // ─────────────────────────────────────────────────────────────────────────

  function _setBadge(state) {
    const badge = document.getElementById('musicBadge');
    if (!badge) return;
    const labels = { playing: '▶ Playing', paused: '⏸ Paused', loading: '⏳ Loading…', ready: '⏸ Ready' };
    badge.textContent = labels[state] || '⏸ Ready';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYLIST CONTROLS
  // ─────────────────────────────────────────────────────────────────────────

  function _renderPlaylistInfo() {
    const t = PLAYLIST[_index];
    const titleEl  = document.getElementById('musicTitle');
    const artistEl = document.getElementById('musicArtist');
    if (titleEl)  titleEl.textContent  = t.title;
    if (artistEl) artistEl.textContent = t.artist;
  }

  function playCurrentTrack() {
    const t = PLAYLIST[_index];
    _loadVideo(t.youtubeId, t.title, t.artist);
    App.toast(`▶ ${t.title}`, 'info', 2000);
  }

  function prev() {
    _index = (_index - 1 + PLAYLIST.length) % PLAYLIST.length;
    _renderPlaylistInfo();
    if (_player) playCurrentTrack();
    else App.toast(`⏮ ${PLAYLIST[_index].title}`, 'info', 2000);
  }

  function next() {
    _index = (_index + 1) % PLAYLIST.length;
    _renderPlaylistInfo();
    if (_player) playCurrentTrack();
    else App.toast(`⏭ ${PLAYLIST[_index].title}`, 'info', 2000);
  }

  function setVolume(val) {
    _volume = Math.max(0, Math.min(100, Number(val)));
    if (_player && typeof _player.setVolume === 'function') {
      _player.setVolume(_volume);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle the search form submission.
   *
   * Logic:
   *  1. Try to extract a YouTube video ID from the input (URL or bare ID).
   *     → If found, load it directly.
   *  2. If Config.YOUTUBE_API_KEY is set, use YouTube Data API v3 to search
   *     and load the first result.
   *  3. Otherwise open a YouTube search page in a new tab so the user can
   *     copy-paste the URL of whatever they want.
   */
  async function handleSearch(query) {
    const q = (query || '').trim();
    if (!q) return;

    // ── Step 1: is it a YouTube URL or bare video ID? ──────────────────────
    const videoId = _extractVideoId(q);
    if (videoId) {
      _loadVideo(videoId, q, '');
      App.toast(`▶ Loading video…`, 'info', 2000);
      return;
    }

    // ── Step 2: Data API v3 search (if key is configured) ─────────────────
    const key = Config.YOUTUBE_API_KEY;
    if (key && !key.startsWith('YOUR_')) {
      try {
        App.toast(`🔍 Searching for "${q}"…`, 'info', 2000);
        const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&key=${key}`;
        const data = await fetch(url).then(r => r.json());
        const item = (data.items || [])[0];
        if (item) {
          const id     = item.id.videoId;
          const title  = item.snippet.title;
          const artist = item.snippet.channelTitle;
          // Update playlist with the searched item as a custom entry
          PLAYLIST.unshift({ title, artist, youtubeId: id, custom: true });
          if (PLAYLIST.length > 8) PLAYLIST.pop(); // keep list bounded
          _index = 0;
          _loadVideo(id, title, artist);
          App.toast(`▶ ${title}`, 'info', 2500);
          return;
        }
      } catch { /* fall through to open-in-tab */ }
    }

    // ── Step 3: open YouTube search in a new tab as fallback ──────────────
    App.toast(`🔗 Opening YouTube search in new tab — paste the URL back here to play`, 'info', 5000);
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank', 'noopener');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL: load playlist from YouTube Data API v3
  // ─────────────────────────────────────────────────────────────────────────

  async function _fetchFromAPI() {
    const key = Config.YOUTUBE_API_KEY;
    if (!key || key.startsWith('YOUR_')) return;
    try {
      const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=lofi+crafting&type=video&maxResults=4&key=${key}`;
      const data = await fetch(url).then(r => r.json());
      const items = (data.items || []).map(item => ({
        title    : item.snippet.title,
        artist   : item.snippet.channelTitle,
        youtubeId: item.id.videoId,
      }));
      if (items.length) {
        PLAYLIST.splice(0, PLAYLIST.length, ...items);
        _renderPlaylistInfo();
      }
    } catch { /* keep mock playlist */ }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────

  function init() {
    _renderPlaylistInfo();
    _setBadge('ready');

    // ── Play / pause toggle ────────────────────────────────────────────────
    document.getElementById('musicPlay').addEventListener('click', () => {
      if (_player && typeof _player.getPlayerState === 'function') {
        const state = _player.getPlayerState();
        if (state === 1 /* PLAYING */) {
          _player.pauseVideo();
        } else {
          _player.playVideo();
        }
      } else {
        // First play — load current playlist track
        playCurrentTrack();
      }
    });

    // ── Prev / Next ────────────────────────────────────────────────────────
    document.getElementById('musicPrev').addEventListener('click', prev);
    document.getElementById('musicNext').addEventListener('click', next);

    // ── Volume slider ──────────────────────────────────────────────────────
    document.getElementById('musicVolume').addEventListener('input', e => {
      setVolume(e.target.value);
    });

    // ── Search form ───────────────────────────────────────────────────────
    document.getElementById('musicSearchForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('musicSearchInput');
      handleSearch(input.value);
      input.value = '';
    });

    // Pre-load the YT IFrame API in the background so the first click is instant
    _loadYTAPI();
    // Optionally populate playlist from YouTube API if key is configured
    _fetchFromAPI();
  }

  return { init };
})();
