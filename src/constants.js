/**
 * ActiveBharat Android — Backend Constants
 * ==========================================
 * Edit BACKEND_HOST to your Wi-Fi IP before running.
 * Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it.
 *
 * PROXY_PORT (8083)  → activebharat-frontend Node.js server (recommended)
 * BACKEND_PORT (8082) → activebharat-backend FastAPI direct (if no proxy)
 */

// Your machine's Wi-Fi IP on the local network
export const BACKEND_HOST = '10.194.109.98';

// Use the frontend proxy (recommended — avoids Windows Firewall issues)
export const PROXY_PORT = 8083;

// Direct FastAPI port (Phase 2 WebSocket connects here directly)
export const FASTAPI_PORT = 8082;

// Computed URLs
export const API_BASE = `http://${BACKEND_HOST}:${PROXY_PORT}`;
export const WS_BASE = `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const API_TIMEOUT = 20000; // ms
