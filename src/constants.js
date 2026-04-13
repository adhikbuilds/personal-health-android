/**
 * Personal Health — Backend Constants
 * ======================================
 * Set your Wi-Fi IP in app.json under expo.extra.backendHost.
 *
 *   app.json:  "extra": { "backendHost": "192.168.x.x" }
 *
 * PROXY_PORT (8083)  → personal-health-frontend Node.js proxy (recommended)
 * FASTAPI_PORT (8082) → personal-health-backend FastAPI direct
 */
import Constants from 'expo-constants';

// Your machine's Wi-Fi IP — set via app.json extra.backendHost
// Falls back to 10.0.2.2 (Android emulator localhost) if not set
export const BACKEND_HOST =
    Constants.expoConfig?.extra?.backendHost || '10.0.2.2';

// Use the frontend proxy (recommended — avoids Windows Firewall issues)
export const PROXY_PORT = 8083;

// Direct FastAPI port (Phase 2 WebSocket connects here directly)
export const FASTAPI_PORT = 8082;

// Computed URLs
// Direct to FastAPI — the Node proxy intercepts /athlete/:id and /session/:id as HTML pages
export const API_BASE = `http://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const WS_BASE = `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const API_TIMEOUT = 20000; // ms
