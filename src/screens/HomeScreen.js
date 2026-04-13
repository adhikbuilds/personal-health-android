// HomeScreen — The athlete's daily landing pad.
// Warm, functional, zero clutter.

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const HALF = (SW - 50) / 2;
const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, label, color, streak }) {
    return (
        <View style={s.ringWrap}>
            <View style={[s.ringOuter, { borderColor: color + '30' }]}>
                <View style={[s.ringInner, { borderColor: color, borderTopColor: color + '15', borderRightColor: color + '15' }]}>
                    <Text style={[s.ringScore, { color }]}>{score || '—'}</Text>
                </View>
            </View>
            <Text style={s.ringLabel}>{label}</Text>
            {streak > 0 && (
                <View style={s.streakChip}>
                    <View style={[s.streakDot, { backgroundColor: C.orange }]} />
                    <Text style={s.streakNum}>{streak}d</Text>
                </View>
            )}
        </View>
    );
}

// ─── Tracker ────────────────────────────────────────────────────────────────

function TrackerItem({ label, current, goal, unit, color }) {
    const pct = goal > 0 ? Math.min(1, current / goal) : 0;
    const display = typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current;
    return (
        <View style={s.trackerItem}>
            <View style={s.trackerTop}>
                <Text style={s.trackerNum}>{display}</Text>
                <Text style={s.trackerGoal}>/{goal}</Text>
            </View>
            <View style={s.trackerBar}>
                <View style={[s.trackerFill, { width: `${pct * 100}%`, backgroundColor: color || C.cyan }]} />
            </View>
            <Text style={s.trackerLabel}>{label}</Text>
        </View>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, showToast }) {
    const { userData, fitnessScore } = useUser();
    const { name, streak, bpi, sessions } = userData;

    const [apiOk, setApiOk] = useState(null);
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);

    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then(raw => {
            if (raw) { try { setTracker(JSON.parse(raw)); } catch (_) {} }
        });
        api.ping().then(ok => setApiOk(!!ok));
    }, []);

    useEffect(() => {
        AsyncStorage.setItem(TODAY_KEY, JSON.stringify(tracker)).catch(() => {});
    }, [tracker]);

    const score = fitnessScore?.score || 0;
    const scoreColor = fitnessScore?.color || C.muted;
    const trackerArr = Object.values(tracker);
    const firstName = name?.split(' ')[0] || 'Athlete';

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* ─── Header ─── */}
                <View style={s.header}>
                    <View style={s.headerTop}>
                        <View>
                            <Text style={s.greeting}>{getGreeting()},</Text>
                            <Text style={s.name}>{firstName}</Text>
                        </View>
                        <View style={s.statusWrap}>
                            <View style={[s.statusDot, { backgroundColor: apiOk ? C.green : apiOk === false ? C.red : C.yellow }]} />
                            <Text style={[s.statusLabel, { color: apiOk ? C.green : apiOk === false ? C.red : C.yellow }]}>
                                {apiOk ? 'Online' : apiOk === false ? 'Offline' : '...'}
                            </Text>
                        </View>
                    </View>

                    {/* Score + Stats */}
                    <View style={s.heroRow}>
                        <ScoreRing score={score} label={fitnessScore?.label || 'Take Test'} color={scoreColor} streak={streak} />
                        <View style={s.heroStats}>
                            <View style={s.heroStat}>
                                <Text style={s.heroNum}>{(bpi || 0).toLocaleString()}</Text>
                                <Text style={s.heroKey}>BPI</Text>
                            </View>
                            <View style={s.heroDivider} />
                            <View style={s.heroStat}>
                                <Text style={s.heroNum}>{sessions || 0}</Text>
                                <Text style={s.heroKey}>Sessions</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ─── Primary CTA ─── */}
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })} style={s.ctaWrap}>
                    <LinearGradient colors={['#1e3a5f', '#0e7490']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
                        <View>
                            <Text style={s.ctaTitle}>Start Training</Text>
                            <Text style={s.ctaSub}>AI watches your form and coaches you in real time</Text>
                        </View>
                        <View style={s.ctaArrow}>
                            <Text style={s.ctaArrowText}>{'>'}</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* ─── Secondary Actions ─── */}
                <View style={s.secondaryRow}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })} style={[s.secondaryCard, { borderColor: 'rgba(239,68,68,0.2)' }]}>
                        <View style={[s.secondaryIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                            <Text style={{ fontSize: 20 }}>{'♥'}</Text>
                        </View>
                        <Text style={s.secondaryTitle}>Heart Rate</Text>
                        <Text style={s.secondarySub}>Camera rPPG</Text>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('TrainingPlan')} style={[s.secondaryCard, { borderColor: 'rgba(34,197,94,0.2)' }]}>
                        <View style={[s.secondaryIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                            <Text style={{ fontSize: 18, color: C.green, fontWeight: '700' }}>{'▤'}</Text>
                        </View>
                        <Text style={s.secondaryTitle}>Weekly Plan</Text>
                        <Text style={s.secondarySub}>Personalized drills</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Daily Tracker ─── */}
                <View style={s.section}>
                    <Text style={s.sectionHead}>Today</Text>
                    <View style={s.trackerGrid}>
                        {trackerArr.slice(0, 4).map((t, i) => (
                            <TrackerItem key={i} label={t.label} current={t.current} goal={t.goal} unit={t.unit}
                                color={[C.cyan, C.orange, C.green, C.yellow][i % 4]} />
                        ))}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 32 },

    // Header
    header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    greeting: { fontSize: 14, color: C.muted, fontWeight: '500' },
    name: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.8, marginTop: 2 },
    statusWrap: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
    statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
    statusLabel: { fontSize: 11, fontWeight: '700' },

    // Hero
    heroRow: { flexDirection: 'row', alignItems: 'center' },
    ringWrap: { alignItems: 'center', marginRight: 24 },
    ringOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    ringInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    ringScore: { fontSize: 24, fontWeight: '900', fontFamily: 'monospace' },
    ringLabel: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 6 },
    streakChip: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    streakDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
    streakNum: { fontSize: 10, color: C.orange, fontWeight: '800' },

    heroStats: { flex: 1 },
    heroStat: { paddingVertical: 8 },
    heroNum: { fontSize: 22, fontWeight: '900', color: C.text, fontFamily: 'monospace' },
    heroKey: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },
    heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 2 },

    // Primary CTA
    ctaWrap: { marginHorizontal: 20, marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
    cta: { padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 88 },
    ctaTitle: { fontSize: 19, fontWeight: '900', color: '#fff' },
    ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, maxWidth: 220 },
    ctaArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    ctaArrowText: { color: '#fff', fontSize: 18, fontWeight: '300' },

    // Secondary
    secondaryRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 20 },
    secondaryCard: {
        flex: 1, backgroundColor: C.surf, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.border,
    },
    secondaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    secondaryTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 2 },
    secondarySub: { fontSize: 10, color: C.muted, fontWeight: '500' },

    // Section
    section: { paddingHorizontal: 22 },
    sectionHead: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 14 },

    // Tracker Grid
    trackerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    trackerItem: {
        width: HALF, backgroundColor: C.surf, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.border,
    },
    trackerTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
    trackerNum: { fontSize: 22, fontWeight: '900', color: C.text, fontFamily: 'monospace' },
    trackerGoal: { fontSize: 11, color: C.muted, fontWeight: '600' },
    trackerBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
    trackerFill: { height: '100%', borderRadius: 99 },
    trackerLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },
});
