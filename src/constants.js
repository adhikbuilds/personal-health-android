/**
 * Backend Constants
 * Change BACKEND_HOST to your server IP.
 */

// ──────────────────────────────────────────────────
// CHANGE THIS to your server's IP address
const BACKEND_HOST = '172.17.62.56';
const BACKEND_PORT = 8082;
// ──────────────────────────────────────────────────

export { BACKEND_HOST };
export const FASTAPI_PORT = BACKEND_PORT;
export const PROXY_PORT = 8083;
export const API_BASE = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
export const WS_BASE = `ws://${BACKEND_HOST}:${BACKEND_PORT}`;
export const API_TIMEOUT = 15000;
