import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import api from '../../services/api';

const BG      = '#FBFBF8';
const SURFACE = '#FFFFFF';
const TEXT    = '#242428';
const MUTED   = '#9CA3AF';
const ACCENT  = '#FC4C02';
const WARNING = '#f59e0b';
const SUCCESS = '#22c55e';
const RED     = '#ef4444';
const BORDER  = 'rgba(255,255,255,0.08)';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString) {
    const now  = Date.now();
    const then = new Date(isoString).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60)       return 'just now';
    if (diffSec < 3600)     return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400)    return `${Math.floor(diffSec / 3600)}h ago`;
    const days = Math.floor(diffSec / 86400);
    if (days === 1)         return '1 day ago';
    return `${days} days ago`;
}

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    reengage:       { border: ACCENT,   icon: 'barbell-outline',  iconColor: ACCENT,   cta: 'Start drill',  ctaRoute: 'PlacementWizard' },
    streak_risk:    { border: WARNING,  icon: 'flame-outline',    iconColor: WARNING,  cta: 'Train now',    ctaRoute: 'PlacementWizard' },
    personal_best:  { border: SUCCESS,  icon: 'trophy-outline',   iconColor: SUCCESS,  cta: null,           ctaRoute: null },
    milestone:      { border: ACCENT,   icon: 'star-outline',     iconColor: ACCENT,   cta: null,           ctaRoute: null },
    injury_warning: { border: RED,      icon: 'warning-outline',  iconColor: RED,      cta: 'See details',  ctaRoute: 'InjuryRisk' },
};

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({ item, athleteSport, onNavigate }) {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.milestone;
    const isReengage = item.type === 'reengage';

    const handleCta = () => {
        if (!cfg.ctaRoute) return;
        if (cfg.ctaRoute === 'PlacementWizard') {
            onNavigate('PlacementWizard', { sport: item.data?.sport || athleteSport });
        } else {
            onNavigate(cfg.ctaRoute);
        }
    };

    return (
        <View style={[sc.card, isReengage && sc.cardProminent, { borderLeftColor: cfg.border }]}>
            {!item.read && <View style={sc.unreadDot} />}

            <View style={sc.cardContent}>
                <View style={sc.cardTop}>
                    <View style={[sc.iconWrap, { backgroundColor: cfg.border + '22' }]}>
                        <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
                    </View>
                    <View style={sc.cardText}>
                        <Text style={[sc.cardTitle, isReengage && sc.cardTitleProminent]} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text style={sc.cardTime}>{relativeTime(item.created_at)}</Text>
                    </View>
                </View>

                <Text style={sc.cardBody}>{item.body}</Text>

                {cfg.cta && (
                    <TouchableOpacity
                        style={[sc.ctaBtn, { borderColor: cfg.border + '60', backgroundColor: cfg.border + '18' }]}
                        onPress={handleCta}
                        activeOpacity={0.8}
                    >
                        <Text style={[sc.ctaBtnText, { color: cfg.border }]}>{cfg.cta}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen({ navigation, showToast }) {
    const [athleteId,    setAthleteId]    = useState(null);
    const [athleteSport, setAthleteSport] = useState('sprint');
    const [notifs,       setNotifs]       = useState([]);
    const [unreadCount,  setUnreadCount]  = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(false);

    const fetchNotifications = useCallback(async (id) => {
        setLoading(true);
        setError(false);
        const data = await api.getNotifications(id);
        if (!data) {
            setError(true);
            setLoading(false);
            return;
        }
        setNotifs(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        setLoading(false);
    }, []);

    useEffect(() => {
        let markTimer;
        getOrCreateAnonymousAthleteId().then(async (id) => {
            setAthleteId(id);

            const profile = await api.getAthlete(id);
            if (profile?.sport) setAthleteSport(profile.sport);

            await fetchNotifications(id);

            markTimer = setTimeout(async () => {
                await api.markNotificationsRead(id);
                setUnreadCount(0);
                setNotifs(prev => prev.map(n => ({ ...n, read: true })));
            }, 1500);
        });
        return () => clearTimeout(markTimer);
    }, [fetchNotifications]);

    const handleRetry = () => {
        if (athleteId) fetchNotifications(athleteId);
    };

    const handleMarkAllRead = async () => {
        if (!athleteId) return;
        await api.markNotificationsRead(athleteId);
        setUnreadCount(0);
        setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleNavigate = (route, params) => {
        navigation.navigate(route, params);
    };

    return (
        <SafeAreaView style={sc.safe}>
            {/* Header */}
            <View style={sc.header}>
                <TouchableOpacity style={sc.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={TEXT} />
                </TouchableOpacity>
                <Text style={sc.headerTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                        <Text style={sc.markAllBtn}>Mark all read</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={sc.headerSpacer} />
                )}
            </View>

            {/* Body */}
            {loading ? (
                <View style={sc.center}>
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            ) : error ? (
                <View style={sc.center}>
                    <Ionicons name="cloud-offline-outline" size={40} color={MUTED} />
                    <Text style={sc.emptyText}>Could not load notifications.</Text>
                    <TouchableOpacity style={sc.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
                        <Text style={sc.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : notifs.length === 0 ? (
                <View style={sc.center}>
                    <Ionicons name="notifications-outline" size={48} color={MUTED} />
                    <Text style={sc.emptyText}>No notifications yet.</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={sc.list}
                >
                    {notifs.map((item, idx) => (
                        <NotificationCard
                            key={item.id || idx}
                            item={item}
                            athleteSport={athleteSport}
                            onNavigate={handleNavigate}
                        />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: BG },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    backBtn:       { padding: 4, marginRight: 8 },
    headerTitle:   { flex: 1, fontSize: 17, fontWeight: '800', color: TEXT },
    markAllBtn:    { fontSize: 13, color: ACCENT, fontWeight: '700' },
    headerSpacer:  { width: 80 },

    // States
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText:     { fontSize: 14, color: MUTED, fontWeight: '600', marginTop: 4 },
    retryBtn:      { marginTop: 4, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(6,182,212,0.12)', borderWidth: 1, borderColor: ACCENT + '50' },
    retryBtnText:  { color: ACCENT, fontWeight: '700', fontSize: 13 },

    // List
    list: { padding: 16, gap: 10, paddingBottom: 30 },

    // Card
    card: {
        backgroundColor: SURFACE,
        borderRadius: 14,
        borderLeftWidth: 4,
        borderLeftColor: ACCENT,
        padding: 14,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: BORDER,
    },
    cardProminent: {
        borderColor: ACCENT + '30',
    },

    // Unread dot
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: ACCENT,
        marginRight: 8,
        marginTop: 8,
        flexShrink: 0,
    },

    // Card internals
    cardContent: { flex: 1 },
    cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    iconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardText:    { flex: 1 },
    cardTitle:   { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 19 },
    cardTitleProminent: { fontSize: 16 },
    cardTime:    { fontSize: 11, color: MUTED, marginTop: 2, fontWeight: '600' },
    cardBody:    { fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 10 },

    // CTA button
    ctaBtn: {
        alignSelf: 'flex-start',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    ctaBtnText: { fontSize: 13, fontWeight: '800' },
});
