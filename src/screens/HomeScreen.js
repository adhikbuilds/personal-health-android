// HomeScreen — Minimal, focused, beautiful
// Shows: greeting, fitness card, daily tracker, 3 core action cards
// No clutter. Every element earns its place.

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
const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;

// ─── Fitness Score Card ─────────────────────────────────────────────────────

function FitnessCard({ fitnessScore, streak }) {
    const score = fitnessScore?.score || 0;
    const label = fitnessScore?.label || 'Not Tested';
    const color = fitnessScore?.color || C.muted;

    return (
        <View style={s.fitnessCard}>
            <View style={s.fitnessLeft}>
                <Text style={s.fitnessLabel}>FITNESS SCORE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
                    <Text style={[s.fitnessScore, { color }]}>{score}</Text>
                    <Text style={s.fitnessUnit}> pts</Text>
                </View>
                <View style={[s.fitnessBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                    <Text style={[s.fitnessBadgeText, { color }]}>{label}</Text>
                </View>
            </View>
            <View style={s.fitnessRight}>
                <View style={[s.ring, { borderColor: color + '50' }]}>
                    <Text style={[s.ringText, { color }]}>{score > 0 ? score : '--'}</Text>
                </View>
                {streak > 0 && (
                    <View style={s.streakPill}>
                        <Text style={s.streakText}>{streak}d streak</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

// ─── Tracker Row ────────────────────────────────────────────────────────────

function TrackerRow({ icon, label, current, goal, unit }) {
    const pct = goal > 0 ? Math.min(1, current / goal) : 0;
    const done = current >= goal;
    const barColor = done ? C.green : C.cyan;

    return (
        <View style={s.trackerRow}>
            <Text style={s.trackerIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <View style={s.trackerMeta}>
                    <Text style={s.trackerLabel}>{label}</Text>
                    <Text style={[s.trackerVal, done && { color: C.green }]}>
                        {typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current}
                        <Text style={s.trackerUnit}> / {goal} {unit}</Text>
                    </Text>
                </View>
                <View style={s.trackerBarBg}>
                    <View style={[s.trackerBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                </View>
            </View>
        </View>
    );
}

// ─── Action Card ────────────────────────────────────────────────────────────

function ActionCard({ title, subtitle, colors, onPress, wide }) {
    return (
        <TouchableOpacity
            style={[s.actionCard, wide && s.actionCardWide]}
            activeOpacity={0.85}
            onPress={onPress}
        >
            <LinearGradient
                colors={colors}
                style={s.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Text style={s.actionTitle}>{title}</Text>
                <Text style={s.actionSub}>{subtitle}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, showToast }) {
    const { userData, fitnessScore } = useUser();
    const { name, streak } = userData;

    const [apiStatus, setApiStatus] = useState('checking');
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);

    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then(raw => {
            if (raw) { try { setTracker(JSON.parse(raw)); } catch (_) {} }
        });
        api.ping().then(ok => setApiStatus(ok ? 'online' : 'offline'));
    }, []);

    useEffect(() => {
        AsyncStorage.setItem(TODAY_KEY, JSON.stringify(tracker)).catch(() => {});
    }, [tracker]);

    const trackerItems = Object.values(tracker);

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Header */}
                <LinearGradient colors={['#1a1040', C.bg]} style={s.header}>
                    {/* Status */}
                    <View style={[s.statusBadge, {
                        backgroundColor: apiStatus === 'online' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                        borderColor: apiStatus === 'online' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                    }]}>
                        <View style={[s.statusDot, {
                            backgroundColor: apiStatus === 'online' ? C.green : apiStatus === 'checking' ? C.yellow : C.red,
                        }]} />
                        <Text style={[s.statusText, {
                            color: apiStatus === 'online' ? C.green : apiStatus === 'checking' ? C.yellow : C.red,
                        }]}>
                            {apiStatus === 'checking' ? 'Connecting' : apiStatus === 'online' ? 'AI Online' : 'Offline'}
                        </Text>
                    </View>

                    {/* Greeting */}
                    <Text style={s.greeting}>Hi, {name?.split(' ')[0] || 'Athlete'}</Text>
                    <Text style={s.greetSub}>Ready to train today?</Text>

                    {/* Fitness Card */}
                    <FitnessCard fitnessScore={fitnessScore} streak={streak} />
                </LinearGradient>

                {/* Daily Tracker */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>DAILY TRACKER</Text>
                    <View style={s.card}>
                        {trackerItems.map((item, i) => (
                            <TrackerRow
                                key={i}
                                icon={item.icon}
                                label={item.label}
                                current={item.current}
                                goal={item.goal}
                                unit={item.unit}
                            />
                        ))}
                    </View>
                </View>

                {/* Core Actions */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>QUICK START</Text>

                    {/* Start Training — full width, prominent */}
                    <ActionCard
                        title="Start Training"
                        subtitle="AI form analysis with real-time coaching"
                        colors={['#312e81', '#0e7490']}
                        onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })}
                        wide
                    />

                    {/* Two half-width cards */}
                    <View style={s.actionRow}>
                        <ActionCard
                            title="Heart Rate"
                            subtitle="Camera-based rPPG"
                            colors={['#7f1d1d', '#991b1b']}
                            onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })}
                        />
                        <ActionCard
                            title="Training Plan"
                            subtitle="Your weekly drills"
                            colors={['#14532d', '#166534']}
                            onPress={() => navigation.navigate('TrainingPlan')}
                        />
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },

    // Header
    header: { padding: 20, paddingTop: 14, paddingBottom: 28 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, marginBottom: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusText: { fontSize: 10, fontWeight: '700' },

    greeting: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
    greetSub: { fontSize: 13, color: C.muted, fontWeight: '500', marginTop: 2, marginBottom: 20 },

    // Fitness Card
    fitnessCard: {
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 18,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    },
    fitnessLeft: { flex: 1 },
    fitnessLabel: { fontSize: 9, color: C.muted, fontWeight: '800', letterSpacing: 2 },
    fitnessScore: { fontSize: 40, fontWeight: '900', fontFamily: 'monospace' },
    fitnessUnit: { fontSize: 14, color: C.muted, fontWeight: '600', marginBottom: 6 },
    fitnessBadge: {
        alignSelf: 'flex-start', marginTop: 8, borderRadius: 99,
        paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    },
    fitnessBadgeText: { fontSize: 11, fontWeight: '800' },
    fitnessRight: { alignItems: 'center', gap: 10 },
    ring: {
        width: 60, height: 60, borderRadius: 30, borderWidth: 3,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    ringText: { fontSize: 18, fontWeight: '900', fontFamily: 'monospace' },
    streakPill: {
        backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: 99,
        paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)',
    },
    streakText: { color: C.orange, fontSize: 10, fontWeight: '800' },

    // Sections
    section: { paddingHorizontal: 20, marginTop: 8 },
    sectionLabel: {
        fontSize: 9, fontWeight: '800', color: C.muted,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12,
    },

    // Card
    card: {
        backgroundColor: C.surf, borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: C.border,
    },

    // Tracker
    trackerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    trackerIcon: { fontSize: 18, width: 30, textAlign: 'center', marginRight: 10 },
    trackerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    trackerLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
    trackerVal: { fontSize: 11, fontWeight: '800', color: C.text },
    trackerUnit: { fontSize: 10, color: C.muted, fontWeight: '600' },
    trackerBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
    trackerBarFill: { height: '100%', borderRadius: 99 },

    // Action Cards
    actionCard: { marginBottom: 10, borderRadius: 18, overflow: 'hidden' },
    actionCardWide: {},
    actionGradient: { padding: 20, minHeight: 80, justifyContent: 'flex-end' },
    actionTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 4 },
    actionSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
    actionRow: { flexDirection: 'row', gap: 10 },
});

// Override actionCard width for the row layout
s.actionRow = { ...s.actionRow };
