// FH-04: Local daily reminder notifications via expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

const CHANNEL_ID = 'personal-health-daily';
const MORNING_HOUR = 8;
const MORNING_MINUTE = 0;

async function _setupChannel() {
    if (Device.osName === 'Android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Daily wellness reminder',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 150],
            lightColor: '#06b6d4',
        });
    }
}

export async function requestNotificationPermission() {
    if (!Device.isDevice) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

export async function scheduleDailyReminder() {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    await _setupChannel();
    await cancelDailyReminder();

    await Notifications.scheduleNotificationAsync({
        identifier: 'daily-checkin',
        content: {
            title: 'Morning check-in',
            body: 'Log sleep, hydration, and how you feel — takes 30 seconds.',
            data: { screen: 'WellnessLogForm' },
            ...(Device.osName === 'Android' && { channelId: CHANNEL_ID }),
        },
        trigger: {
            hour: MORNING_HOUR,
            minute: MORNING_MINUTE,
            repeats: true,
        },
    });
    return true;
}

export async function cancelDailyReminder() {
    await Notifications.cancelScheduledNotificationAsync('daily-checkin').catch(() => {});
}

export async function isDailyReminderScheduled() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(n => n.identifier === 'daily-checkin');
}
