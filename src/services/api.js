// Personal Health — API Service Layer
// All networking config is read from constants.js — edit that file to change
// your backend IP. No hardcoded addresses here.

import { Platform } from 'react-native';
import {
    BACKEND_HOST,
    FASTAPI_PORT,
    API_BASE as BASE_URL,
    WS_BASE as WS_URL,
    API_TIMEOUT,
} from '../constants';
import { getAccessToken, triggerRefresh, triggerLogout } from './auth-token';

// Direct to FastAPI backend
export const API_BASE = BASE_URL;

// WebSocket direct to FastAPI (no proxy — proxy causes issues with WS paths)
const WS_BASE_RESOLVED = `ws://${BACKEND_HOST}:${FASTAPI_PORT}`;

// ─── Request dedup + tiny response cache ────────────────────────────────────
//
// In-flight GET requests are deduped so a screen that calls the same endpoint
// from two places in parallel only hits the network once. Responses are
// cached briefly so pull-to-refresh after an immediate fetch doesn't re-fire.

const _inFlight = new Map();          // cacheKey -> Promise
const _recentCache = new Map();       // cacheKey -> { ts, data }
const RECENT_CACHE_MS = 2000;

function _cacheKey(path, options) {
    const method = (options && options.method) || 'GET';
    const body = options && options.body ? options.body : '';
    return `${method} ${path} ${body}`;
}

function _shouldCache(options) {
    const method = ((options && options.method) || 'GET').toUpperCase();
    return method === 'GET';
}

// Minimal schema validator — checks a response against a shape
// { field: 'string|number|boolean|object|array', required: true/false }.
// Returns the data if valid, null if required fields are missing or wrong
// type. Keeps us from blowing up on HTML error pages that sneak through.
function _validate(data, schema) {
    if (!schema) return data;
    if (data == null) return null;
    for (const [key, rule] of Object.entries(schema)) {
        const value = data[key];
        const required = rule?.required !== false;
        if (value === undefined) {
            if (required) return null;
            continue;
        }
        const expected = typeof rule === 'string' ? rule : rule?.type;
        if (!expected) continue;
        const actual = Array.isArray(value) ? 'array' : typeof value;
        if (actual !== expected) return null;
    }
    return data;
}

// ─── Core fetch helper ───────────────────────────────────────────────────────
//
// Authentication: every request injects the current access token from the
// shared auth-token module. On 401 we try the refresh handler exactly once
// per request; if it succeeds we retry the original call with the new token,
// otherwise we trigger logout so the AuthGate sends the user to /login.

async function _doFetch(path, options, attemptedRefresh) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
    const token = getAccessToken();
    const baseHeaders = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) baseHeaders.Authorization = `Bearer ${token}`;
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: baseHeaders,
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.status === 401 && !attemptedRefresh) {
            const refreshed = await triggerRefresh();
            if (refreshed) {
                return _doFetch(path, options, true);  // retry once
            }
            await triggerLogout();
            throw new Error('HTTP 401: unauthenticated');
        }
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
        // 204 No Content responses (logout, etc.) have an empty body — JSON
        // parsing them throws "Unexpected end of input". Return null instead.
        if (res.status === 204) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchJSON(path, options = {}, { schema } = {}) {
    const cacheable = _shouldCache(options);
    const key = _cacheKey(path, options);

    if (cacheable) {
        const cached = _recentCache.get(key);
        if (cached && Date.now() - cached.ts < RECENT_CACHE_MS) {
            return cached.data;
        }
        if (_inFlight.has(key)) {
            return _inFlight.get(key);
        }
    }

    const promise = (async () => {
        try {
            const json = await _doFetch(path, options, false);
            const validated = _validate(json, schema);
            if (cacheable) _recentCache.set(key, { ts: Date.now(), data: validated });
            return validated;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`[API] Timeout: ${path}`);
            } else {
                console.warn(`[API] ${path} ->`, err.message);
            }
            return null;
        } finally {
            _inFlight.delete(key);
        }
    })();

    if (cacheable) _inFlight.set(key, promise);
    return promise;
}

// Exposed for tests / manual cache busting (rarely needed).
export function _resetApiCache() {
    _inFlight.clear();
    _recentCache.clear();
}

// ─── Session API ─────────────────────────────────────────────────────────────
export const api = {
    patch: (path, body) => fetchJSON(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
    }),

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
        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        return fetch(`${API_BASE}/session/${sessionId}/frame`, {
            method: 'POST',
            headers,
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

    /** Fetch session history for an athlete */
    getSessions: (athleteId, limit = 10) =>
        fetchJSON(`/sessions?athlete_id=${athleteId}&status=completed&limit=${limit}`),

    /** Fetch a single athlete's profile */
    getAthlete: (id) => fetchJSON(`/athlete/${id}`, {}, {
        schema: { id: 'string', name: 'string', sport: 'string' },
    }),

    /** Fetch all athletes */
    getAthletes: () => fetchJSON('/athletes'),

    /** Leaderboard — sport is optional */
    getLeaderboard: (sport = '') =>
        fetchJSON(`/leaderboard${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`, {}, {
            schema: { leaderboard: 'array' },
        }),

    /** Banner check for HomeScreen connectivity widget */
    getBanner: () => fetchJSON('/banner', {}, {
        schema: { connected: 'boolean' },
    }),

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

    // ─── Dynamic Training Plan ───────────────────────────────────────────
    /** Get this week's personalized training plan (generates if missing) */
    getWeeklyPlan: (athleteId) =>
        fetchJSON(`/plan/${athleteId}/weekly`),

    /** Force a fresh plan for the current week */
    regeneratePlan: (athleteId) =>
        fetchJSON(`/plan/${athleteId}/regenerate`, { method: 'POST' }),

    /** Mark a plan day as completed (adherence tracking) */
    completePlanDay: (athleteId, dateStr) =>
        fetchJSON(`/plan/${athleteId}/day/${dateStr}/complete`, { method: 'POST' }),

    /** Fetch up to N past weeks of plans */
    getPlanHistory: (athleteId, limit = 4) =>
        fetchJSON(`/plan/${athleteId}/history?limit=${limit}`),

    // ─── Progress & Readiness ──────────────────────────────────────────
    /** Multi-day form trend, BPI curve, session stats */
    getProgress: (id, days = 30) =>
        fetchJSON(`/progress/${id}?days=${days}`),

    /** Joints deviating most from ideal ranges */
    getWeakJoints: (id, days = 30) =>
        fetchJSON(`/weak-joints/${id}?days=${days}`),

    /** Injury risk band + symmetry deviation */
    getInjuryRisk: (id, days = 14) =>
        fetchJSON(`/injury-risk/${id}?days=${days}`),

    /** Competition readiness score with component breakdown */
    getReadiness: (id, days = 14) =>
        fetchJSON(`/readiness/${id}?days=${days}`),

    /** Full advanced-metrics bundle — ACWR, monotony, momentum, asymmetry,
     *  readiness, intensity, fatigue, daily load, form trend series. */
    getAdvancedMetrics: (id, days = 60) =>
        fetchJSON(`/athlete/${id}/advanced-metrics?days=${days}`),

    // ─── Weekly Summary ────────────────────────────────────────────────
    /** Structured weekly recap with coaching note */
    getWeeklySummary: (athleteId, days = 7) =>
        fetchJSON(`/athlete/${athleteId}/weekly-summary?days=${days}`),

    // ─── Progressive Load ────────────────────────────────────────────────
    /** ACWR-based load recommendation */
    getLoadRecommendation: (athleteId) =>
        fetchJSON(`/athlete/${athleteId}/load-recommendation`),

    // ─── Score Card ──────────────────────────────────────────────────────
    /** Get JSON scorecard data for a completed session */
    getScorecard: (sessionId) =>
        fetchJSON(`/session/${sessionId}/scorecard`),

    /** Get scorecard PNG URL (for sharing) */
    getScorecardImageUrl: (sessionId) =>
        `${API_BASE}/session/${sessionId}/scorecard.png`,

    /** Standalone rep count for a session (cheap fallback if scorecard misses it). */
    getRepCount: (sessionId) =>
        fetchJSON(`/sessions/${sessionId}/rep-count`),

    // ─── Coach Broadcasts ────────────────────────────────────────────────
    /** Coach broadcasts addressed to this athlete (across all coaches). */
    getAthleteInbox: (athleteId, limit = 20) =>
        fetchJSON(`/coach/inbox/athlete/${athleteId}?limit=${limit}`),

    /** Send a clap reaction. Idempotent — same caller can tap again without
     *  double-counting. Returns { target_id, count, you_clapped }. */
    sendClap: (athleteId, targetId) =>
        fetchJSON(`/athlete/${athleteId}/clap/${targetId}`, { method: 'POST' }),

    // ─── Auth ────────────────────────────────────────────────────────────
    /** Register a new account; returns user + access/refresh tokens. */
    authRegister: (email, password, name, athlete_id = null) =>
        fetchJSON('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name, athlete_id }),
        }),

    /** Log in with email + password; returns user + access/refresh tokens. */
    authLogin: (email, password) =>
        fetchJSON('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    /** Trade a refresh token for a new access/refresh pair. */
    authRefresh: (refresh_token) =>
        fetchJSON('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token }),
        }),

    /** Revoke a refresh token (logout). 204 on success. */
    authLogout: (refresh_token) =>
        fetchJSON('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refresh_token }),
        }),

    /** Returns the current authenticated user; null/401 if no valid token. */
    authMe: () => fetchJSON('/auth/me'),

    // ─── Huddle Mode ─────────────────────────────────────────────────────
    /** Create a group training huddle */
    createHuddle: (name, sport, coachId = null) =>
        fetchJSON('/huddle/create', {
            method: 'POST',
            body: JSON.stringify({ name, sport, coach_id: coachId }),
        }),

    /** Join an existing huddle */
    joinHuddle: (huddleId, athleteId) =>
        fetchJSON(`/huddle/${huddleId}/join`, {
            method: 'POST',
            body: JSON.stringify({ athlete_id: athleteId }),
        }),

    /** Get live huddle leaderboard */
    getHuddleLive: (huddleId) =>
        fetchJSON(`/huddle/${huddleId}/live`),

    /** List all huddles */
    getHuddles: (status = '') =>
        fetchJSON(`/huddles${status ? `?status=${status}` : ''}`),

    // ─── Nutrition AI ────────────────────────────────────────────────────
    /** Analyze food photo via Claude vision */
    analyzeFood: (athleteId, imageBase64) =>
        fetchJSON('/nutrition/analyze', {
            method: 'POST',
            body: JSON.stringify({ athlete_id: athleteId, image_b64: imageBase64 }),
        }),

    searchFoods: (query, limit = 20) =>
        fetchJSON(`/foods/?q=${encodeURIComponent(query)}&limit=${limit}`),

    // ─── Data Export ─────────────────────────────────────────────────────
    /** Get dataset stats (data flywheel monitoring) */
    getExportStats: () =>
        fetchJSON('/admin/export/stats'),

    /** Phase 2: open a WebSocket that streams JPEG frames to the backend.
     *  Returns { send(b64), close() }. The backend pushes back analysis
     *  results via onResult({ form_score, form_quality, primary_feedback,
     *  phase, knee_angle_l, hip_angle_l, trunk_lean, ... }). */
    connectFrameStream: (sessionId, { onResult, onError, onClose, onPing } = {}) => {
        const wsUrl = `${WS_BASE_RESOLVED}/ws/session/${sessionId}/frames-jpeg`;
        const ws = new WebSocket(wsUrl);
        let closed = false;
        ws.onopen  = () => console.log(`[WS-FRAMES] connected: ${sessionId}`);
        ws.onmessage = (e) => {
            let msg = null;
            try { msg = JSON.parse(e.data); } catch (_) { return; }
            if (!msg || typeof msg !== 'object') return;
            if (msg.type === 'result' && onResult) onResult(msg);
            else if (msg.type === 'ping' && onPing) onPing(msg);
            else if (msg.type === 'error' && onError) onError(new Error(msg.code || 'ws_error'));
        };
        ws.onerror = (e) => {
            console.warn('[WS-FRAMES] error:', e?.message);
            if (onError) onError(e);
        };
        ws.onclose = () => {
            closed = true;
            console.log('[WS-FRAMES] closed');
            if (onClose) onClose();
        };
        return {
            send(b64, ts = Date.now()) {
                if (closed || ws.readyState !== WebSocket.OPEN) return false;
                try {
                    ws.send(JSON.stringify({ image_b64: b64, ts }));
                    return true;
                } catch (_) { return false; }
            },
            close() {
                closed = true;
                try { ws.close(); } catch (_) { /* ignore */ }
            },
            isOpen() { return !closed && ws.readyState === WebSocket.OPEN; },
        };
    },

    // DEPRECATED: No screen uses this. Candidate for removal.
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
