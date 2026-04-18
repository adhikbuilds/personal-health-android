// Personal Health — API Service Layer
// All networking config is read from constants.js — edit that file to change
// your backend IP. No hardcoded addresses here.

import { Platform } from 'react-native';
import {
    BACKEND_HOST,
    PROXY_PORT,
    FASTAPI_PORT,
    API_BASE as BASE_FROM_CONSTANTS,
    WS_BASE as WS_FROM_CONSTANTS,
    API_TIMEOUT,
} from '../constants';

// On Android phone: use proxy (avoids Windows Firewall & AP isolation).
// On iOS simulator / browser: hit FastAPI directly.
export const API_BASE = Platform.OS === 'android'
    ? BASE_FROM_CONSTANTS                        // http://BACKEND_HOST:8083
    : `http://localhost:${FASTAPI_PORT}`;        // Direct (emulator/browser)

// WebSocket through the Node.js proxy to avoid AP isolation on university networks.
// Proxy rewrites ws://HOST:8083/ws/rppg/... → ws://localhost:8082/rppg/...
const WS_BASE_RESOLVED = Platform.OS === 'android'
    ? `ws://${BACKEND_HOST}:${PROXY_PORT}/ws`    // ws://BACKEND_HOST:8083/ws (proxied)
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

async function fetchRaw(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            signal: controller.signal,
            ...options,
        });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
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

    createAthlete: (payload) => fetchJSON('/athlete', {
        method: 'POST',
        body: JSON.stringify(payload),
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

    /** rPPG heart rate: WebSocket stream. Sends image frames, receives BPM/HRV metrics. */
    connectRPPGLiveStream: (sessionId, onMessage, onError, onClose) => {
        const wsUrl = `${WS_BASE_RESOLVED}/rppg/live-stream/${sessionId}`;
        console.log(`[WS-RPPG] Connecting: ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        ws.onopen  = () => console.log(`[WS-RPPG] Connected: session ${sessionId}`);
        ws.onmessage = (e) => {
            try { onMessage(JSON.parse(e.data)); } catch (_) {}
        };
        ws.onerror = (e) => {
            console.warn('[WS-RPPG] Error:', e.message);
            if (onError) onError(e);
        };
        ws.onclose = () => {
            console.log('[WS-RPPG] Closed');
            if (onClose) onClose();
        };
        return ws;
    },

    /** End session, returns summary with avg_form_score, xp_earned, etc. */
    endSession: (sessionId) =>
        fetchJSON(`/session/${sessionId}/end`, { method: 'POST' }),

    getShareCard: (sessionId) =>
        fetchJSON(`/session/${sessionId}/share-card`),

    getWeeklyPlan: (athleteId) =>
        fetchJSON(`/plan/${athleteId}/weekly`),

    poseCheck: (imageB64) =>
        fetchJSON('/pose/check', {
            method: 'POST',
            body: JSON.stringify({ image_b64: imageB64 }),
        }),

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

    // ─── Daily Tracker ───────────────────────────────────────────────────
    getDailyTracker: (athleteId) =>
        fetchJSON(`/athlete/${athleteId}/daily-tracker`),

    updateDailyTracker: (athleteId, data) =>
        fetchJSON(`/athlete/${athleteId}/daily-tracker`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // ─── Fitness Test ────────────────────────────────────────────────────
    submitFitnessTest: (athleteId, results) =>
        fetchJSON('/fitness-test', {
            method: 'POST',
            body: JSON.stringify({ athlete_id: athleteId, ...results }),
        }),

    getFitnessTestHistory: (athleteId) =>
        fetchJSON(`/fitness-test/history/${athleteId}`),

    // ─── Playfields ──────────────────────────────────────────────────────
    getPlayfields: (lat, lng, radius = 5) =>
        fetchJSON(`/playfields?lat=${lat}&lng=${lng}&radius=${radius}`),

    // ─── PE Classes ──────────────────────────────────────────────────────
    getClasses: (athleteId) =>
        fetchJSON(`/classes?athlete_id=${encodeURIComponent(athleteId)}`),

    // ─── Social Feed ─────────────────────────────────────────────────────
    getFeed: (athleteId, tab = 'for_you', page = 1) =>
        fetchJSON(`/feed?athlete_id=${encodeURIComponent(athleteId)}&tab=${tab}&page=${page}`),

    getTrendingCreators: () =>
        fetchJSON('/creators/trending'),

    followCreator: (athleteId, creatorId) =>
        fetchJSON('/follow', {
            method: 'POST',
            body: JSON.stringify({ follower: athleteId, following: creatorId }),
        }),

    /** Biomechanics live stream: WebSocket for real-time keypoint/pose data. */
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

    connectMetricsLive: (sessionId, onMessage, onError, onClose) => {
        const wsUrl = `${WS_BASE_RESOLVED}/metrics/live/${sessionId}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            try { onMessage(JSON.parse(e.data)); } catch (_) {}
        };
        ws.onerror = (e) => {
            if (onError) onError(e);
        };
        ws.onclose = () => {
            if (onClose) onClose();
        };
        return ws;
    },

    // ─── Notifications ───────────────────────────────────────────────────
    getNotifications: (athleteId, unreadOnly = false) =>
        fetchJSON(`/athlete/${athleteId}/notifications${unreadOnly ? '?unread_only=true' : ''}`),

    markNotificationsRead: (athleteId) =>
        fetchJSON(`/athlete/${athleteId}/notifications/read`, { method: 'POST' }),

    // ─── Drill Assignments ───────────────────────────────────────────────
    getDrillAssignments: (athleteId) =>
        fetchJSON(`/athlete/${athleteId}/drill-assignments`),

    prefetchImage: async (path) => {
        const response = await fetchRaw(path);
        if (!response) return null;
        return response.url || `${API_BASE}${path}`;
    },

    // ─── Injury Risk (Flow 13) ───────────────────────────────────────────
    getInjuryRisk: (athleteId, days = 14) =>
        fetchJSON(`/injury-risk/${encodeURIComponent(athleteId)}?days=${days}`),

    getWeakJoints: (athleteId, days = 30) =>
        fetchJSON(`/weak-joints/${encodeURIComponent(athleteId)}?days=${days}`),

    generateNotification: (athleteId) =>
        fetchJSON(`/notifications/generate/${encodeURIComponent(athleteId)}`, { method: 'POST' }),
};

export default api;
