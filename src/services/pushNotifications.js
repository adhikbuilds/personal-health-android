// Push notification registration service.
// Call registerForPushNotifications() once on app startup after athlete ID is known.
// Registers the Expo push token with the backend so the coach can ping the athlete.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotifications(athleteId) {
    if (!athleteId) return null;

    // expo-notifications requires a physical device for push tokens
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Permission denied — push notifications disabled');
        return null;
    }

    let token;
    try {
        const result = await Notifications.getExpoPushTokenAsync({
            projectId: undefined, // uses app.json extra.eas.projectId if set
        });
        token = result.data;
    } catch (e) {
        console.warn('[Push] Could not get push token:', e.message);
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Personal Health',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#06b6d4',
        });
    }

    try {
        await fetch(`${API_BASE}/push-token/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                athlete_id: athleteId,
                expo_push_token: token,
                platform: Platform.OS,
            }),
        });
        console.log('[Push] Token registered:', token.slice(0, 30) + '…');
    } catch (e) {
        console.warn('[Push] Token registration failed:', e.message);
    }

    return token;
}

// Call this to add a tap-handler that navigates to the right screen.
// Pass a ref to your navigation object.
export function addNotificationTapListener(navigationRef) {
    return Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data || {};
        const screen = data.screen;
        if (screen && navigationRef?.current?.navigate) {
            navigationRef.current.navigate(screen);
        }
    });
}
