import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const BACKEND_HOST = extra.backendHost || 'localhost';
export const FASTAPI_PORT = extra.backendPort ? parseInt(extra.backendPort.replace(':', ''), 10) : 8082;
export const PROXY_PORT = 8083;
export const API_BASE = extra.apiBase || `http://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const WS_BASE = extra.wsBase || `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;
export const API_TIMEOUT = 15000;
