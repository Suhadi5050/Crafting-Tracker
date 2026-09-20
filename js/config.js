/**
 * config.js — API key placeholders (v3)
 *
 * ── Netlify Environment Variables ────────────────────────────────────────────
 * When deploying to Netlify, set these keys as environment variables in:
 *   Netlify Dashboard → Site → Settings → Environment Variables
 *
 * Then inject them at build time using a build script or Netlify edge functions.
 * For a no-build static site, you can use a Netlify redirect / serverless
 * function to proxy API calls so the keys never appear in client-side code.
 *
 * Variable mapping (Netlify env var → config key):
 *   GOOGLE_CLIENT_ID        → Config.GOOGLE_CLIENT_ID
 *   OPENWEATHERMAP_API_KEY  → Config.WEATHER_API_KEY
 *   GNEWS_API_KEY           → Config.NEWS_API_KEY
 *   YOUTUBE_DATA_API_KEY    → Config.YOUTUBE_API_KEY
 *
 * Feature flags:
 *   USE_REAL_WEATHER=true   → enables live weather widget
 *   USE_REAL_NEWS=true      → enables live DIY/craft news feed
 *   USE_GOOGLE_AUTH=true    → enables real Google Sign-In flow
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠ Never commit real API keys to version control.
 *   All values below are safe placeholder strings.
 */

const Config = Object.freeze({

  // ── Google Identity Services ──────────────────────────────
  // https://developers.google.com/identity/gsi/web
  // Netlify env var: GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  // ── OpenWeatherMap ────────────────────────────────────────
  // https://openweathermap.org/api (free tier available)
  // Netlify env var: OPENWEATHERMAP_API_KEY
  WEATHER_API_KEY:  'YOUR_OPENWEATHERMAP_API_KEY',
  WEATHER_ENDPOINT: 'https://api.openweathermap.org/data/2.5/weather',

  // ── GNews (browser-safe news API) ────────────────────────
  // https://gnews.io (free tier: 100 req/day)
  // Netlify env var: GNEWS_API_KEY
  NEWS_API_KEY:     'YOUR_GNEWS_API_KEY',
  NEWS_ENDPOINT:    'https://gnews.io/api/v4/search',

  // ── YouTube Data API v3 ───────────────────────────────────
  // https://developers.google.com/youtube/v3
  // Used by the embedded music player to fetch a live playlist.
  // Falls back to the hardcoded mock playlist when absent.
  // Netlify env var: YOUTUBE_DATA_API_KEY
  YOUTUBE_API_KEY:  'YOUR_YOUTUBE_DATA_API_KEY',

  // ── Feature flags ─────────────────────────────────────────
  // Set these to true once the corresponding API key is configured.
  USE_REAL_WEATHER: false,   // true → live weather via OPENWEATHERMAP_API_KEY
  USE_REAL_NEWS:    false,   // true → live news feed via GNEWS_API_KEY
  USE_GOOGLE_AUTH:  false,   // true → real Google Sign-In via GOOGLE_CLIENT_ID
});
