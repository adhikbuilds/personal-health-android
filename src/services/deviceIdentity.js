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

const KEY_ATHLETE_ID = '@ph_v1_anon_athlete_id';
const KEY_ONBOARDED  = '@ph_v1_onboarded';

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
        await AsyncStorage.multiRemove([KEY_ATHLETE_ID, KEY_ONBOARDED]);
    } catch (e) {
        console.warn('[deviceIdentity] reset failed', e);
    }
}
