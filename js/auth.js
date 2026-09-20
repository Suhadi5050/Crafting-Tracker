/**
 * auth.js — Google Sign-in (placeholder) + guest login flow
 * Set Config.USE_GOOGLE_AUTH = true and populate GOOGLE_CLIENT_ID to enable real Google auth.
 */

const Auth = (() => {

  // ── Check if already logged in ────────────────────────────
  function isLoggedIn() {
    const user = Store.getUser();
    return !!(user && user.name && user.name !== 'Crafter');
  }

  // ── Show auth screen if not logged in ─────────────────────
  function init(onSuccess) {
    const authScreen = document.getElementById('authScreen');
    const appShell   = document.getElementById('appShell');

    if (isLoggedIn()) {
      _showApp(appShell, authScreen);
      onSuccess();
      return;
    }

    // Google Sign-In button
    document.getElementById('googleSignIn').addEventListener('click', () => {
      if (Config.USE_GOOGLE_AUTH) {
        _initGoogleAuth(onSuccess);
      } else {
        // Demo mode: simulate a Google login
        App.toast('Google Auth not configured — using demo mode.', 'warning', 5000);
        _loginAs('Demo User', 'google');
        _showApp(appShell, authScreen);
        onSuccess();
      }
    });

    // Guest form
    document.getElementById('guestForm').addEventListener('submit', e => {
      e.preventDefault();
      const raw  = document.getElementById('guestName').value.trim();
      if (!raw) {
        App.toast('Please enter your name.', 'error');
        return;
      }
      // Strip email addresses — store only the display-friendly first name
      const name = _sanitiseName(raw);
      _loginAs(name, 'guest');
      _showApp(appShell, authScreen);
      onSuccess();
    });
  }

  // ── Real Google Identity Services init ────────────────────
  function _initGoogleAuth(onSuccess) {
    // Dynamically load the Google GSI script
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => _doGooglePrompt(onSuccess);
      document.head.appendChild(script);
    } else {
      _doGooglePrompt(onSuccess);
    }
  }

  function _doGooglePrompt(onSuccess) {
    /* global google */
    google.accounts.id.initialize({
      client_id : Config.GOOGLE_CLIENT_ID,
      callback  : (response) => {
        // Decode the JWT credential (base64url)
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        _loginAs(payload.name, 'google', payload.picture);
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
        onSuccess();
      },
    });
    google.accounts.id.prompt();
  }

  // ── Sanitise name — never store raw email addresses ───────
  function _sanitiseName(raw) {
    const s = (raw || '').trim();
    if (s.includes('@')) {
      // Extract local part and capitalise first word
      const local = s.split('@')[0].replace(/[._\-+]/g, ' ').trim().split(' ')[0];
      return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
    }
    // Return first word of display name (capitalised)
    const first = s.split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  // ── Store user + update avatar ────────────────────────────
  function _loginAs(name, provider, avatar = null) {
    const existing = Store.getUser();
    Store.saveUser({
      name,
      provider,
      avatar,
      // Preserve existing XP/level if returning user
      xp    : existing.xp    || 0,
      level : existing.level || 1,
    });
  }

  // ── Switch from auth screen to app ────────────────────────
  function _showApp(appShell, authScreen) {
    authScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
  }

  // ── Sign out ──────────────────────────────────────────────
  function signOut() {
    Store.saveUser({ name: '', provider: 'guest' });
    location.reload();
  }

  return { init, isLoggedIn, signOut };
})();
