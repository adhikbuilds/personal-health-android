// Encrypted-when-possible key/value storage.
// Tries expo-secure-store (AES-GCM on Android keystore / iOS keychain).
// Falls back to AsyncStorage if SecureStore is unavailable (e.g. running
// in expo-web or a stripped-down preview build) so the app still works
// — just without disk-level encryption for tokens.

import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore = null;
try {
    // Lazy require so absence at runtime doesn't crash the bundle.
    SecureStore = require('expo-secure-store');
} catch (_) {
    SecureStore = null;
}

const SECURE_OK = !!(SecureStore && typeof SecureStore.getItemAsync === 'function');

export async function setSecure(key, value) {
    try {
        if (SECURE_OK && value != null) {
            await SecureStore.setItemAsync(key, String(value));
            return;
        }
    } catch (_) { /* fall through to AsyncStorage */ }
    if (value == null) {
        await AsyncStorage.removeItem(key);
    } else {
        await AsyncStorage.setItem(key, String(value));
    }
}

export async function getSecure(key) {
    try {
        if (SECURE_OK) {
            const v = await SecureStore.getItemAsync(key);
            if (v != null) return v;
        }
    } catch (_) { /* fall through */ }
    return AsyncStorage.getItem(key);
}

export async function deleteSecure(key) {
    try {
        if (SECURE_OK) {
            await SecureStore.deleteItemAsync(key);
        }
    } catch (_) { /* ignore */ }
    try {
        await AsyncStorage.removeItem(key);
    } catch (_) { /* ignore */ }
}

export const STORAGE_BACKEND = SECURE_OK ? 'secure-store' : 'async-storage';
