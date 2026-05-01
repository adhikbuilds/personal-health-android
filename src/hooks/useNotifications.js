// useNotifications — fetches in-app notifications from backend + badge count
// Polls every 60 seconds when the app is in foreground. Exposes mark-read.
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getOrCreateAnonymousAthleteId } from '../services/deviceIdentity';

const POLL_INTERVAL_MS = 60_000;

export function useNotifications({ athleteId: propId = null, autoGenerate = true } = {}) {
    const [athleteId, setAthleteId] = useState(propId);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!propId) {
            getOrCreateAnonymousAthleteId().then(id => {
                if (mountedRef.current) setAthleteId(id);
            }).catch(() => {});
        }
    }, [propId]);

    const fetchNotifications = useCallback(async (id) => {
        if (!id) return;
        try {
            if (autoGenerate) {
                api.post(`/notifications/generate/${id}`).catch(() => {});
            }
            const data = await api.get(`/athlete/${id}/notifications?limit=20`);
            if (!mountedRef.current) return;
            const items = data?.notifications || [];
            setNotifications(items);
            setUnreadCount(items.filter(n => !n.read).length);
        } catch {
            // silent — bell stays at last known count
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [autoGenerate]);

    useEffect(() => {
        if (!athleteId) return;
        fetchNotifications(athleteId);
        timerRef.current = setInterval(() => fetchNotifications(athleteId), POLL_INTERVAL_MS);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [athleteId, fetchNotifications]);

    const markRead = useCallback(async (notificationIds = []) => {
        if (!athleteId) return;
        try {
            await api.post(`/athlete/${athleteId}/notifications/read`, {
                notification_ids: notificationIds,
            });
            setNotifications(prev =>
                prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
        } catch {}
    }, [athleteId]);

    const markAllRead = useCallback(async () => {
        if (!athleteId) return;
        try {
            await api.post(`/athlete/${athleteId}/notifications/read`, { all: true });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {}
    }, [athleteId]);

    return { notifications, unreadCount, loading, fetchNotifications: () => fetchNotifications(athleteId), markRead, markAllRead };
}
