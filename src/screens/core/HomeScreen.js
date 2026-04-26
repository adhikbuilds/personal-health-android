// HomeScreen — Strava-clean rewrite
// One hero card · simple activity feed · 4 quick actions · single accent color.
// Preserves all data hooks (useUser, api.ping, getNotifications, AsyncStorage tracker).

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUser } from '../../context/UserContext';
import api from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import { DAILY_TRACKER_DEFAULTS, HOME_CONTENT_GRID } from '../../data/constants';

// Map each tile's emoji to a clean Ionicons name (no rainbow palette)
const TILE_ICONS = {
    learn_sports:  'football-outline',
    playfields:    'location-outline',
    yoga:          'leaf-outline',
    nutrition:     'restaurant-outline',
    pe_lessons:    'school-outline',
    live_sessions: 'radio-outline',
    quiz:          'help-circle-outline',
    assignments:   'create-outline',
    wellness:      'pulse-outline',
};

// ─── Strava palette ─────────────────────────
const ORANGE = '#FC4C02';
const DARK   = '#242428';
const GRAY   = '#6D6D78';
const DIM    = '#9CA3AF';
const LIGHT  = '#F7F7FA';
const BORDER = '#E6E6EA';
const BG     = '#FFFFFF';
const SUCCESS = '#16A34A';
const ALERT   = '#DC2626';

const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;
const tap = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };

export default function HomeScreen({ navigation, showToast }) {
    const { user, displayName, level, xp } = useUser();
    const [tracker, setTracker]     = useState(DAILY_TRACKER_DEFAULTS || {});
    const [apiStatus, setApiStatus] = useState('checking');
    const [unread, setUnread]       = useState(0);
    const [fitnessScore, setFitnessScore] = useState(null);
    const [streak, setStreak]       = useState(0);
    const [recentSessions, setRecentSessions] = useState([]);

    const name = (displayName || user?.name || 'Athlete').toString();

    // Load today's tracker
    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then((raw) => {
            if (raw) { try { setTracker(JSON.parse(raw)); } catch (_) {} }
        });
    }, []);

    // API status + recent sessions
    useEffect(() => {
        api.ping().then((ok) => setApiStatus(ok ? 'online' : 'offline')).catch(() => setApiStatus('offline'));
        getOrCreateAnonymousAthleteId().then(async (id) => {
            try {
                const progress = await api.getAthleteProgress?.(id);
                if (progress?.sessions?.length) {
                    setRecentSessions(progress.sessions.slice(-4).reverse());
                }
                if (progress?.avg_form_score) {
                    setFitnessScore({ score: Math.round(progress.avg_form_score), label: 'Form Score' });
                }
                const s = await api.getStreaks?.(id);
                if (s?.current_streak != null) setStreak(s.current_streak);
            } catch (_) {}
        }).catch(() => {});
    }, []);

    // Unread notifications (refresh on focus)
    useFocusEffect(useCallback(() => {
        getOrCreateAnonymousAthleteId().then((id) => {
            api.getNotifications?.(id, true).then((data) => {
                if (data) setUnread(data.unread_count || 0);
            }).catch(() => {});
        }).catch(() => {});
    }, []));

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* ── Top bar ─────────────────────── */}
                <View style={styles.topBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.brand}>PERSONAL HEALTH</Text>
                        <Text style={styles.greeting}>Hi, {name.split(' ')[0]}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.notifBtn}
                        activeOpacity={0.7}
                        onPress={() => { tap(); navigation.navigate('Notifications'); }}
                    >
                        <Ionicons name="notifications-outline" size={22} color={DARK} />
                        {unread > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── HERO: Form Score card ────────── */}
                <View style={styles.heroCard}>
                    <View style={styles.heroLabelRow}>
                        <Text style={styles.heroEyebrow}>YOUR FORM SCORE</Text>
                        <View style={[styles.statusPill, {
                            backgroundColor: apiStatus === 'online' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                        }]}>
                            <View style={[styles.statusDot, {
                                backgroundColor: apiStatus === 'online' ? SUCCESS : ALERT,
                            }]} />
                            <Text style={[styles.statusText, {
                                color: apiStatus === 'online' ? SUCCESS : ALERT,
                            }]}>
                                {apiStatus === 'online' ? 'LIVE' : 'OFFLINE'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.heroBody}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroScore}>
                                {fitnessScore?.score ?? '—'}
                                <Text style={styles.heroScoreSuffix}> /100</Text>
                            </Text>
                            <Text style={styles.heroSub}>
                                {streak > 0 ? `${streak}-day streak · keep it up` : 'No streak yet — record today'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.heroCTA}
                            activeOpacity={0.85}
                            onPress={() => { tap(); navigation.jumpTo('Camera'); }}
                        >
                            <Text style={styles.heroCTAText}>+ RECORD</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Primary 4 quick actions ──────── */}
                <View style={styles.actionGrid}>
                    <ActionTile icon="analytics-outline"  label="Metrics"      onPress={() => { tap(); navigation.jumpTo('Lab'); }} />
                    <ActionTile icon="library-outline"    label="Academy"      onPress={() => { tap(); navigation.jumpTo('Academy'); }} />
                    <ActionTile icon="trophy-outline"     label="Fitness Test" onPress={() => { tap(); navigation.navigate('FitnessTest'); }} />
                    <ActionTile icon="map-outline"        label="Map"          onPress={() => { tap(); navigation.jumpTo('Map'); }} />
                </View>

                {/* ── Explore grid (Nutrition, Playfields, Yoga, Wellness…) ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EXPLORE</Text>
                    <View style={styles.exploreGrid}>
                        {HOME_CONTENT_GRID.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.exploreTile}
                                activeOpacity={0.7}
                                onPress={() => {
                                    tap();
                                    if (!item.route) { showToast?.('Coming soon'); return; }
                                    if (item.routeParams) navigation.navigate(item.route, item.routeParams);
                                    else navigation.navigate(item.route);
                                }}
                            >
                                <View style={styles.exploreIcon}>
                                    <Ionicons name={TILE_ICONS[item.id] || 'apps-outline'} size={20} color={ORANGE} />
                                </View>
                                <Text style={styles.exploreLabel} numberOfLines={2}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Recent activity feed ─────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHead}>
                        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                        <TouchableOpacity onPress={() => { tap(); navigation.jumpTo('Lab'); }}>
                            <Text style={styles.sectionLink}>View all →</Text>
                        </TouchableOpacity>
                    </View>
                    {recentSessions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="videocam-outline" size={24} color={DIM} />
                            <Text style={styles.emptyTitle}>No sessions yet</Text>
                            <Text style={styles.emptyBody}>Record your first set to see your form score here.</Text>
                            <TouchableOpacity
                                style={styles.emptyCTA}
                                activeOpacity={0.85}
                                onPress={() => { tap(); navigation.jumpTo('Camera'); }}
                            >
                                <Text style={styles.emptyCTAText}>Start First Session →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        recentSessions.map((s, i) => (
                            <SessionRow
                                key={s.session_id || i}
                                session={s}
                                onPress={() => { tap(); /* navigate to session detail when route exists */ }}
                            />
                        ))
                    )}
                </View>

                {/* ── Today's check-in chips ───────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TODAY</Text>
                    <View style={styles.chipsRow}>
                        <CheckChip label="Sleep"  value={tracker?.sleep?.value || '—'} unit="hr" filled={!!tracker?.sleep?.value} />
                        <CheckChip label="Water"  value={tracker?.water?.value || '—'} unit="ml" filled={!!tracker?.water?.value} />
                        <CheckChip label="Energy" value={tracker?.energy?.value || '—'} unit="/5" filled={!!tracker?.energy?.value} />
                    </View>
                    <TouchableOpacity
                        style={styles.checkinBtn}
                        activeOpacity={0.7}
                        onPress={() => { tap(); navigation.navigate('WellnessLogForm'); }}
                    >
                        <Text style={styles.checkinBtnText}>Log Check-in</Text>
                        <Ionicons name="arrow-forward" size={14} color={DARK} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Sub-components ─────────────────────────

function ActionTile({ icon, label, onPress }) {
    return (
        <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={onPress}>
            <View style={styles.actionIcon}>
                <Ionicons name={icon} size={20} color={ORANGE} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function SessionRow({ session, onPress }) {
    const date  = session.started_at ? new Date(session.started_at) : null;
    const sport = String(session.sport || 'Training').replace(/_/g, ' ');
    const score = session.summary?.avg_form_score || 0;
    const dateStr = date
        ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : '—';
    return (
        <TouchableOpacity style={styles.sessionRow} activeOpacity={0.7} onPress={onPress}>
            <View style={styles.sessionAvatar}>
                <Ionicons name="fitness-outline" size={18} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle}>{sport}</Text>
                <Text style={styles.sessionMeta}>{dateStr}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.sessionScore}>{Math.round(score)}</Text>
                <Text style={styles.sessionScoreLabel}>FORM</Text>
            </View>
        </TouchableOpacity>
    );
}

function CheckChip({ label, value, unit, filled }) {
    return (
        <View style={[styles.chip, filled && styles.chipFilled]}>
            <Text style={[styles.chipLabel, filled && styles.chipLabelFilled]}>{label}</Text>
            <Text style={[styles.chipValue, filled && styles.chipValueFilled]}>
                {value}
                {value !== '—' && <Text style={styles.chipUnit}> {unit}</Text>}
            </Text>
        </View>
    );
}

// ─── Styles ─────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    brand: { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
    greeting: { fontSize: 22, fontWeight: '800', color: DARK, marginTop: 2, letterSpacing: -0.5 },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: ORANGE,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    // Hero
    heroCard: {
        marginHorizontal: 20,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 20,
        marginBottom: 14,
    },
    heroLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroEyebrow: { fontSize: 10, fontWeight: '800', color: GRAY, letterSpacing: 1 },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 50,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    heroBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroScore: { fontSize: 56, fontWeight: '800', color: ORANGE, letterSpacing: -2, lineHeight: 56 },
    heroScoreSuffix: { fontSize: 18, color: GRAY, fontWeight: '500' },
    heroSub: { fontSize: 12, color: GRAY, marginTop: 4, fontWeight: '500' },
    heroCTA: {
        backgroundColor: ORANGE,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 6,
    },
    heroCTAText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    // Quick actions
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 8,
    },
    actionTile: {
        flex: 1,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    actionLabel: { fontSize: 11, fontWeight: '700', color: DARK, textAlign: 'center' },

    // Explore grid (3 columns, single accent — no rainbow)
    exploreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    exploreTile: {
        width: '31.5%',
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        minHeight: 92,
        justifyContent: 'center',
    },
    exploreIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    exploreLabel: { fontSize: 11, fontWeight: '700', color: DARK, textAlign: 'center', lineHeight: 14 },

    // Section
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: GRAY, letterSpacing: 0.8, marginBottom: 12 },
    sectionLink: { fontSize: 11, fontWeight: '700', color: ORANGE, marginBottom: 12 },

    // Empty
    emptyCard: {
        backgroundColor: LIGHT,
        borderRadius: 8,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
        borderStyle: 'dashed',
    },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginTop: 8 },
    emptyBody: { fontSize: 12, color: GRAY, textAlign: 'center', marginTop: 4, marginBottom: 14 },
    emptyCTA: { backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 6 },
    emptyCTAText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Session row
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 14,
        marginBottom: 8,
    },
    sessionAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    sessionTitle: { fontSize: 14, fontWeight: '700', color: DARK, textTransform: 'capitalize' },
    sessionMeta:  { fontSize: 11, color: GRAY, marginTop: 2 },
    sessionScore: { fontSize: 22, fontWeight: '800', color: ORANGE, lineHeight: 22 },
    sessionScoreLabel: { fontSize: 9, fontWeight: '800', color: GRAY, letterSpacing: 0.5, marginTop: 2 },

    // Chips
    chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chip: {
        flex: 1,
        backgroundColor: LIGHT,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: BORDER,
    },
    chipFilled: { backgroundColor: 'rgba(252, 76, 2, 0.06)', borderColor: ORANGE },
    chipLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.5 },
    chipLabelFilled: { color: ORANGE },
    chipValue: { fontSize: 18, fontWeight: '800', color: DIM, marginTop: 4 },
    chipValueFilled: { color: DARK },
    chipUnit: { fontSize: 11, fontWeight: '600', color: GRAY },

    checkinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 6,
    },
    checkinBtnText: { fontSize: 12, fontWeight: '700', color: DARK, letterSpacing: 0.3 },
});
