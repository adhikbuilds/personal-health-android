// HomeScreen — The athlete's daily landing pad.

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const HALF = (SW - 52) / 2;
const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Score Ring (SVG-like with nested borders) ──────────────────────────────

function ScoreRing({ score, color, label, streak }) {
    return (
        <View style={s.ringBlock}>
            <View style={[s.ringTrack, { borderColor: color + '18' }]}>
                <View style={[s.ringProgress, { borderColor: color, borderBottomColor: 'transparent', borderLeftColor: 'transparent' }]}>
                    <Text style={[s.ringVal, { color }]}>{score || '—'}</Text>
                </View>
            </View>
            <Text style={s.ringCaption}>{label}</Text>
            {streak > 0 && (
                <View style={s.streakRow}>
                    <View style={[s.streakDot, { backgroundColor: C.orange }]} />
                    <Text style={s.streakText}>{streak}d streak</Text>
                </View>
            )}
        </View>
    );
}

// ─── Stat Pill ──────────────────────────────────────────────────────────────

function Stat({ value, label }) {
    return (
        <View style={s.statBox}>
            <Text style={s.statVal}>{value}</Text>
            <Text style={s.statKey}>{label}</Text>
        </View>
    );
}

// ─── Daily Tracker Card ─────────────────────────────────────────────────────

function DailyCard({ label, current, goal, color }) {
    const pct = goal > 0 ? Math.min(1, current / goal) : 0;
    const val = typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current;
    return (
        <View style={s.dailyCard}>
            <Text style={s.dailyVal}>{val}<Text style={s.dailyGoal}>/{goal}</Text></Text>
            <View style={s.dailyBar}>
                <View style={[s.dailyFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={s.dailyLabel}>{label}</Text>
        </View>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userData, fitnessScore } = useUser();
    const { name, streak, bpi, sessions } = userData;

    const [apiOk, setApiOk] = useState(null);
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);

    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then(raw => {
            if (raw) try { setTracker(JSON.parse(raw)); } catch (_) {}
        });
        api.ping().then(ok => setApiOk(!!ok));
    }, []);

    useEffect(() => {
        AsyncStorage.setItem(TODAY_KEY, JSON.stringify(tracker)).catch(() => {});
    }, [tracker]);

    const score = fitnessScore?.score || 0;
    const scoreColor = fitnessScore?.color || C.muted;
    const firstName = name?.split(' ')[0] || 'Athlete';
    const daily = Object.values(tracker);

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerLeft}>
                        <Text style={s.greet}>{getGreeting()},</Text>
                        <Text style={s.name}>{firstName}</Text>
                    </View>
                    <View style={[s.onlineBadge, { backgroundColor: apiOk ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }]}>
                        <View style={[s.onlineDot, { backgroundColor: apiOk ? C.green : apiOk === false ? C.red : C.yellow }]} />
                    </View>
                </View>

                {/* Hero Card */}
                <View style={s.heroCard}>
                    <ScoreRing score={score} color={scoreColor} label={fitnessScore?.label || 'Take Test'} streak={streak} />
                    <View style={s.heroRight}>
                        <Stat value={(bpi || 0).toLocaleString()} label="Bio-Passport" />
                        <View style={s.heroDivider} />
                        <Stat value={sessions || 0} label="Sessions" />
                        <View style={s.heroDivider} />
                        <Stat value={userData.tier || 'Block'} label="Tier" />
                    </View>
                </View>

                {/* Start Training CTA */}
                <TouchableOpacity activeOpacity={0.92} style={s.ctaTouch}
                    onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })}>
                    <LinearGradient colors={['#0c4a6e', '#0e7490', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
                        <View style={s.ctaContent}>
                            <Text style={s.ctaTitle}>Start Training</Text>
                            <Text style={s.ctaSub}>Real-time AI form coaching</Text>
                        </View>
                        <View style={s.ctaCircle}>
                            <Text style={s.ctaArrow}>{'›'}</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Quick Access Row */}
                <View style={s.quickRow}>
                    <TouchableOpacity activeOpacity={0.92} style={s.quickCard}
                        onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })}>
                        <View style={[s.quickDot, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                            <Text style={{ color: C.red, fontSize: 16, fontWeight: '600' }}>{'♥'}</Text>
                        </View>
                        <View>
                            <Text style={s.quickTitle}>Heart Rate</Text>
                            <Text style={s.quickSub}>Camera rPPG</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.92} style={s.quickCard}
                        onPress={() => navigation.navigate('TrainingPlan')}>
                        <View style={[s.quickDot, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                            <Text style={{ color: C.green, fontSize: 14, fontWeight: '800' }}>{'☰'}</Text>
                        </View>
                        <View>
                            <Text style={s.quickTitle}>Weekly Plan</Text>
                            <Text style={s.quickSub}>Your drills</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Daily Tracker */}
                <Text style={s.sectionTitle}>Today</Text>
                <View style={s.dailyGrid}>
                    {daily.slice(0, 4).map((t, i) => (
                        <DailyCard key={i} label={t.label} current={t.current} goal={t.goal}
                            color={[C.cyan, C.orange, C.green, C.purple][i]} />
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 20, paddingBottom: 36 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 12, marginBottom: 24 },
    headerLeft: {},
    greet: { fontSize: 13, color: C.muted, fontWeight: '500', lineHeight: 18 },
    name: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
    onlineBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },

    // Hero Card
    heroCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surf, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: C.border, marginBottom: 16,
    },
    heroRight: { flex: 1, marginLeft: 20 },
    heroDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

    // Ring
    ringBlock: { alignItems: 'center' },
    ringTrack: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    ringProgress: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    ringVal: { fontSize: 22, fontWeight: '900', fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo' },
    ringCaption: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 6 },
    streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    streakDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
    streakText: { fontSize: 9, color: C.orange, fontWeight: '700' },

    // Stat
    statBox: {},
    statVal: { fontSize: 18, fontWeight: '800', color: C.text, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo' },
    statKey: { fontSize: 10, color: C.muted, fontWeight: '500', marginTop: 1 },

    // CTA
    ctaTouch: { marginBottom: 12, borderRadius: 20, overflow: 'hidden',
        ...Platform.select({ android: { elevation: 6 }, ios: { shadowColor: '#06b6d4', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 } }),
    },
    cta: { paddingVertical: 22, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ctaContent: {},
    ctaTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: 3 },
    ctaCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    ctaArrow: { color: '#fff', fontSize: 24, fontWeight: '300', marginLeft: 2 },

    // Quick Row
    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    quickCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surf, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: C.border,
    },
    quickDot: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quickTitle: { fontSize: 13, fontWeight: '700', color: C.text },
    quickSub: { fontSize: 10, color: C.muted, fontWeight: '500', marginTop: 1 },

    // Section
    sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 12 },

    // Daily Grid
    dailyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dailyCard: { width: HALF, backgroundColor: C.surf, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    dailyVal: { fontSize: 20, fontWeight: '800', color: C.text, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo' },
    dailyGoal: { fontSize: 11, color: C.muted, fontWeight: '500' },
    dailyBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
    dailyFill: { height: '100%', borderRadius: 2 },
    dailyLabel: { fontSize: 10, color: C.muted, fontWeight: '500' },
});
