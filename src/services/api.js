// ActiveBharat — API Service Layer
// All networking config is read from constants.js — edit that file to change
// your backend IP. No hardcoded addresses here.
//
// V1 HTTP flow (Expo Go compatible):
//   Phone → PROXY_PORT (Node.js frontend, port 8083) → FastAPI (port 8082)
//
// Phase 2 WebSocket flow (native build):
//   Phone → FastAPI WebSocket ws://BACKEND_HOST:FASTAPI_PORT/session/{id}/live-stream

import { Platform } from 'react-native';
import {
    BACKEND_HOST,
    PROXY_PORT,
    FASTAPI_PORT,
    API_BASE as BASE_FROM_CONSTANTS,
    WS_BASE as WS_FROM_CONSTANTS,
    API_TIMEOUT,
} from '../constants';

// On Android phone: use proxy (avoids Windows Firewall).
// On iOS simulator / browser: hit FastAPI directly.
export const API_BASE = Platform.OS === 'android'
    ? BASE_FROM_CONSTANTS                        // http://BACKEND_HOST:8083
    : `http://localhost:${FASTAPI_PORT}`;        // Direct (emulator/browser)

const WS_BASE_RESOLVED = Platform.OS === 'android'
    ? WS_FROM_CONSTANTS                          // ws://BACKEND_HOST:8082
    : `ws://localhost:${FASTAPI_PORT}`;

// ─── Core fetch helper ───────────────────────────────────────────────────────
async function fetchJSON(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            signal: controller.signal,
            ...options,
        });
        clearTimeout(timer);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return await res.json();
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            console.warn(`[API] Timeout: ${path}`);
        } else {
            console.warn(`[API] ${path} ->`, err.message);
        }
        return null;
    }
}

// ─── Session API ─────────────────────────────────────────────────────────────
export const api = {
    /** Check if API is reachable */
    ping: () => fetchJSON('/health'),

    /** Start a new session, returns { session_id, sport, athlete_id } */
    startSession: (athlete_id, sport) => fetchJSON('/session/start', {
        method: 'POST',
        body: JSON.stringify({ athlete_id, sport }),
    }),

    /**
     * Send one biomechanical frame to the server (V1 HTTP mode).
     * frameData can contain image_b64 for server-side MediaPipe processing.
     */
    sendFrame: (sessionId, frameData) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        return fetch(`${API_BASE}/session/${sessionId}/frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(frameData),
            signal: controller.signal,
        })
            .then(res => { clearTimeout(timer); return res.ok ? res.json() : null; })
            .catch(err => { clearTimeout(timer); return null; });
    },

    /**
     * Poll latest AI analysis result for a session.
     * Call every 3-4s after sending frames.
     */
    getLatestResult: (sessionId) =>
        fetchJSON(`/session/${sessionId}/latest-result`),

    /** Ghost Skeleton calibration — returns keypoints + deviations without session */
    calibrate: (imageB64) => fetchJSON('/session/calibrate', {
        method: 'POST',
        body: JSON.stringify({ image_b64: imageB64 }),
    }),

    /** Dashboard: get all currently active sessions to auto-connect WebSocket */
    getActiveSessions: () => fetchJSON('/sessions/active'),

    /**
     * rPPG heart rate: send a camera frame for server-side CHROM processing.
     * Returns { frame: { face_found, signal_quality }, result: { bpm, hrv_ms } }
     */
    sendRPPGFrame: (sessionId, imageB64, timestamp) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        return fetch(`${API_BASE}/rppg/frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, image_b64: imageB64, timestamp }),
            signal: controller.signal,
        })
            .then(res => { clearTimeout(timer); return res.ok ? res.json() : null; })
            .catch(() => { clearTimeout(timer); return null; });
    },

    /** End session, returns summary with avg_form_score, xp_earned, etc. */
    endSession: (sessionId) =>
        fetchJSON(`/session/${sessionId}/end`, { method: 'POST' }),

    /** Fetch session history for an athlete */
    getSessions: (athleteId, limit = 10) =>
        fetchJSON(`/sessions?athlete_id=${athleteId}&status=completed&limit=${limit}`),

    /** Fetch a single athlete's profile */
    getAthlete: (id) => fetchJSON(`/athlete/${id}`),

    /** Fetch all athletes */
    getAthletes: () => fetchJSON('/athletes'),

    /** Leaderboard — sport is optional */
    getLeaderboard: (sport = '') =>
        fetchJSON(`/leaderboard${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`),

    /** Banner check for HomeScreen connectivity widget */
    getBanner: () => fetchJSON('/banner'),

    /**
     * PHASE 2 EDGE AI — High-speed WebSocket Metadata Stream.
     * Connects directly to FastAPI to stream pure 33-point float arrays at 60 FPS
     * from the native C++ Frame Processor. No image transfer — coordinates only.
     *
     * To change the backend IP, edit src/constants.js (BACKEND_HOST).
     */
    connectLiveStream: (sessionId, onMessage, onError, onClose) => {
        const wsUrl = `${WS_BASE_RESOLVED}/session/${sessionId}/live-stream`;
        console.log(`[WS-STREAM] Connecting: ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        ws.onopen  = () => console.log(`[WS-STREAM] Connected: session ${sessionId}`);
        ws.onmessage = (e) => {
            try { onMessage(JSON.parse(e.data)); } catch (_) {}
        };
        ws.onerror = (e) => {
            console.warn('[WS-STREAM] Error:', e.message);
            if (onError) onError(e);
        };
        ws.onclose = () => {
            console.log('[WS-STREAM] Closed');
            if (onClose) onClose();
        };
        return ws;
    },
};

export default api;
