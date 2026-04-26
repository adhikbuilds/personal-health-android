// deviceIdentity — Flow 5.1 from BIOMECHANICS-ARCHITECT.md
//
// Zero-friction entry: on first launch we generate an anonymous athlete_id
// and store it locally. No email, no password, no OTP. After the first score,
// the app can offer account creation (Google Sign-In / email) as an OPTIONAL
// upgrade to sync across devices.
//
// API:
//   getOrCreateAnonymousAthleteId() → Promise<string>   // persistent per device
//   hasCompletedOnboarding()        → Promise<boolean>  // first-score gate
//   markOnboardingComplete()        → Promise<void>     // call post first score
//   clearDeviceIdentity()           → Promise<void>     // dev/test reset
//
// Storage is AsyncStorage. Keys are versioned with a v1 prefix so we can
// migrate later (e.g. when a real account links up, we can carry the anon id
// across for analytics continuity).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants';

const KEY_ATHLETE_ID = '@ph_v1_anon_athlete_id';
const KEY_ONBOARDED  = '@ph_v1_onboarded';
const KEY_ACCESS_TOKEN  = '@ph_v1_access_token';
const KEY_REFRESH_TOKEN = '@ph_v1_refresh_token';

/**
 * UUID v4-ish. We don't need crypto-strength — this is a local identifier
 * that gets linked to a server-side athlete record on first session.
 * react-native-get-random-values is flaky in Expo Go, so we use Math.random.
 */
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get the device's anonymous athlete_id, generating one if this is first run.
 * The id is prefixed `athlete_` so it's visually consistent with seeded
 * server-side ids like `athlete_01`.
 */
export async function getOrCreateAnonymousAthleteId() {
    try {
        const existing = await AsyncStorage.getItem(KEY_ATHLETE_ID);
        if (existing) return existing;

        const id = `athlete_${uuid().replace(/-/g, '').slice(0, 12)}`;
        await AsyncStorage.setItem(KEY_ATHLETE_ID, id);
        return id;
    } catch (e) {
        // AsyncStorage can fail in edge cases (disk full, OS restriction).
        // Return a fresh id so the app keeps working in the current session;
        // it won't persist but it won't crash either.
        console.warn('[deviceIdentity] storage error, returning ephemeral id', e);
        return `athlete_${uuid().replace(/-/g, '').slice(0, 12)}`;
    }
}

/**
 * Flow 5.1: athlete has completed onboarding when they've seen their first
 * form score. Until then, we route them through the drill picker → placement
 * wizard → 3-rep session → first-score reveal.
 */
export async function hasCompletedOnboarding() {
    try {
        const value = await AsyncStorage.getItem(KEY_ONBOARDED);
        return value === '1';
    } catch {
        return false;
    }
}

/**
 * Call from the post-session screen after the athlete has seen their first
 * score. Never during pre-session flows — that skips the onboarding check.
 */
export async function markOnboardingComplete() {
    try {
        await AsyncStorage.setItem(KEY_ONBOARDED, '1');
    } catch (e) {
        console.warn('[deviceIdentity] failed to persist onboarded flag', e);
    }
}

/**
 * Reset everything — only for dev builds / debug menu.
 */
export async function clearDeviceIdentity() {
    try {
        await AsyncStorage.multiRemove([
            KEY_ATHLETE_ID, KEY_ONBOARDED, KEY_ACCESS_TOKEN, KEY_REFRESH_TOKEN,
        ]);
    } catch (e) {
        console.warn('[deviceIdentity] reset failed', e);
    }
}

// ─── Auth token helpers ──────────────────────────────────────────────────────
//
// The backend now enforces auth on all athlete/session/coach endpoints. The
// Android app runs anonymously, so on first launch we POST /auth/register
// with a random email+password bound to the device's athlete_id, then cache
// the access+refresh tokens. Every API request reads getAccessToken().

export async function getAccessToken() {
    try {
        return await AsyncStorage.getItem(KEY_ACCESS_TOKEN);
    } catch {
        return null;
    }
}

export async function getRefreshToken() {
    try {
        return await AsyncStorage.getItem(KEY_REFRESH_TOKEN);
    } catch {
        return null;
    }
}

async function _storeTokens(access, refresh) {
    const ops = [];
    if (access)  ops.push(AsyncStorage.setItem(KEY_ACCESS_TOKEN,  access));
    if (refresh) ops.push(AsyncStorage.setItem(KEY_REFRESH_TOKEN, refresh));
    await Promise.all(ops);
}

/**
 * Ensure this device has a valid backend session. If no token is cached,
 * register a new anonymous account tied to the device's athlete_id.
 * Returns the current access token (or null on unrecoverable error).
 *
 * Call this on app startup, before any authenticated API call.
 */
export async function ensureDeviceAuth() {
    try {
        const existing = await getAccessToken();
        if (existing) return existing;

        const athleteId = await getOrCreateAnonymousAthleteId();
        // email-validator rejects reserved TLDs like .local, so use a real one.
        // This isn't a real inbox — it's just a stable, unique identifier for
        // the device-bound account row.
        const email = `${athleteId}@device.personalhealth.app`;
        // Password is stored on-device too, so the app can re-login if tokens
        // expire without user friction.
        const password = `dev-${athleteId.slice(-8)}-${Math.random().toString(36).slice(2, 10)}-Aa9`;

        let resp = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: athleteId, password, athlete_id: athleteId }),
        });

        if (resp.status === 409) {
            // Device already registered previously — log in instead.
            resp = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
        }

        if (!resp.ok) {
            console.warn('[deviceIdentity] device auth failed', resp.status);
            return null;
        }

        const data = await resp.json();
        await _storeTokens(data.access_token, data.refresh_token);
        return data.access_token;
    } catch (e) {
        console.warn('[deviceIdentity] ensureDeviceAuth error', e?.message);
        return null;
    }
}
