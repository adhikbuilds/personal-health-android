import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const INVITE_STATE_KEY = '@ph_v1_coach_invite_state';

export async function generateCoachInviteLink(athleteId) {
    try {
        const response = await api.post(`/athlete/${athleteId}/request-coach`, {
            ttl_hours: 72,
            max_uses: 10,
        });
        return response;
    } catch (error) {
        console.warn('[coachInvite] failed to generate link', error);
        throw error;
    }
}

export async function hasInvitedCoach() {
    try {
        const state = await AsyncStorage.getItem(INVITE_STATE_KEY);
        if (!state) return false;
        const data = JSON.parse(state);
        return data.invited === true;
    } catch {
        return false;
    }
}

export async function markCoachInvited() {
    try {
        await AsyncStorage.setItem(INVITE_STATE_KEY, JSON.stringify({
            invited: true,
            timestamp: new Date().toISOString(),
        }));
    } catch (error) {
        console.warn('[coachInvite] failed to mark invited', error);
    }
}

export async function shouldShowCoachInvitePrompt() {
    const hasInvited = await hasInvitedCoach();
    return !hasInvited;
}
