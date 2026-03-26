/**
 * ActiveBharat Android — Backend Constants
 * ==========================================
 * Set your Wi-Fi IP in app.json under expo.extra.backendHost,
 * or set the BACKEND_HOST variable below directly for local dev.
 *
 *   app.json:  "extra": { "backendHost": "192.168.x.x" }
 *
 * PROXY_PORT (8083)  → activebharat-frontend Node.js server (recommended)
 * BACKEND_PORT (8082) → activebharat-backend FastAPI direct (if no proxy)
 *
 * Fallback hierarchy:
 *   1. expo-constants extra.backendHost (from app.json)
 *   2. 10.0.2.2 (Android emulator → host machine localhost)
 */
import Constants from 'expo-constants';

// Your machine's Wi-Fi IP — set via app.json extra.backendHost
export const BACKEND_HOST =
    Constants.expoConfig?.extra?.backendHost ?? '10.0.2.2';

// Use the frontend proxy (recommended — avoids Windows Firewall issues)
export const PROXY_PORT = 8083;

// Direct FastAPI port (Phase 2 WebSocket connects here directly)
export const FASTAPI_PORT = 8082;

// Computed URLs
export const API_BASE = `http://${BACKEND_HOST}:${PROXY_PORT}`;
export const WS_BASE = `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const API_TIMEOUT = 20000; // ms
