import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_KEY = '@ph_drills_catalog';
const CACHE_TTL_MS = 3600000; // 1 hour

export async function fetchDrillsCatalog(forceRefresh = false) {
    try {
        if (!forceRefresh) {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CACHE_TTL_MS) {
                    return data.drills;
                }
            }
        }

        const response = await api.get('/drills/catalog');
        const drills = response.drills || [];

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            drills,
            timestamp: Date.now(),
        })).catch(() => {});

        return drills;
    } catch (error) {
        console.warn('[drillsCatalog] fetch failed', error);
        // Fallback to local cache or empty array
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                return JSON.parse(cached).drills || [];
            }
        } catch {}
        return [];
    }
}

export async function clearDrillsCache() {
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.warn('[drillsCatalog] clear cache failed', error);
    }
}
