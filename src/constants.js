/**
 * Personal Health — Backend Constants
 * ======================================
 * Set your machine's Wi-Fi IP via the BACKEND_HOST env var (e.g. in .env);
 * app.config.js reads it and exposes it as expo.extra.backendHost.
 *
 *   .env:  BACKEND_HOST=<your-machine-lan-ip>
 *
 * Do NOT set this in app.json — Expo resolves app.config.js and ignores
 * app.json entirely, so anything set there has no effect.
 *
 * PROXY_PORT (8083)  → personal-health-frontend Node.js proxy (recommended)
 * FASTAPI_PORT (8082) → personal-health-backend FastAPI direct
 */
import Constants from 'expo-constants';

// Resolved by app.config.js from BACKEND_HOST, defaulting to 'localhost' in
// dev. The 10.0.2.2 fallback (Android emulator's alias for the host machine)
// is effectively unreachable because app.config.js always supplies a value —
// kept only as a guard if expoConfig is unavailable.
export const BACKEND_HOST = Constants.expoConfig?.extra?.backendHost || '10.0.2.2';

// Use the frontend proxy (recommended — avoids Windows Firewall issues)
export const PROXY_PORT = 8083;

// Direct FastAPI port (Phase 2 WebSocket connects here directly)
export const FASTAPI_PORT = 8082;

// Computed URLs — Android talks to FastAPI directly. The Node proxy at 8083
// only forwards /api/* paths, so GETs like /athlete/{id} fall through to the
// web SPA and return HTML, breaking JSON.parse. Hitting FastAPI straight
// avoids that and halves the round-trip. PROXY_PORT stays exported for
// anyone who still wants it via an env switch later.
export const API_BASE = `http://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const WS_BASE = `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const API_TIMEOUT = 20000; // ms
