// HomeScreen — Inspired by Nike Training Club & Strava
// Design principles: content IS the design, numbers are heroes,
// minimal chrome, generous space, subtle animation.

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Pressable,
    Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
    useSharedValue, useAnimatedStyle, useAnimatedProps,
    withTiming, withSpring, withDelay, interpolate,
    Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MONO = Platform.OS === 'android' ? 'monospace' : 'Courier';

function greet() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Animated Ring ────────────────────────────────────────────────────────────

function Ring({ pct, color, size = 120, sw = 5 }) {
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const val = useSharedValue(0);
    useEffect(() => { val.value = withTiming(Math.min(1, pct / 100), { duration: 1400, easing: Easing.out(Easing.cubic) }); }, [pct]);
    const ap = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - val.value) }));
    return (
        <Svg width={size} height={size}>
            <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth={sw} />
            <AnimatedCircle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
                strokeDasharray={circ} animatedProps={ap} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`} />
        </Svg>
    );
}

// ── Scale button ─────────────────────────────────────────────────────────────

function Tap({ onPress, children, style }) {
    const sc = useSharedValue(1);
    const as = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
    return (
        <Pressable onPress={onPress}
            onPressIn={() => { sc.value = withTiming(0.97, { duration: 120 }); }}
            onPressOut={() => { sc.value = withSpring(1, { damping: 15 }); }}>
            <Animated.View style={[style, as]}>{children}</Animated.View>
        </Pressable>
    );
}

// ── Metric bar ───────────────────────────────────────────────────────────────

function MetricBar({ label, value, goal, color, delay }) {
    const pct = goal > 0 ? Math.min(1, value / goal) : 0;
    const w = useSharedValue(0);
    useEffect(() => { w.value = withDelay(delay, withTiming(pct, { duration: 900, easing: Easing.out(Easing.quad) })); }, [pct]);
    const bs = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
    const display = typeof value === 'number' && value % 1 ? value.toFixed(1) : value;
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={st.metricRow}>
            <View style={st.metricHead}>
                <Text style={st.metricLabel}>{label}</Text>
                <Text style={st.metricVal}>{display}<Text style={st.metricGoal}> / {goal}</Text></Text>
            </View>
            <View style={st.barTrack}>
                <Animated.View style={[st.barFill, { backgroundColor: color }, bs]} />
            </View>
        </Animated.View>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData, fitnessScore } = useUser();
    const [online, setOnline] = useState(null);
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);
    const TK = `@dt_${new Date().toISOString().slice(0,10)}`;

    useEffect(() => {
        AsyncStorage.getItem(TK).then(r => { if (r) try { setTracker(JSON.parse(r)); } catch(_){} });
        api.ping().then(ok => setOnline(!!ok));
    }, []);
    useEffect(() => { AsyncStorage.setItem(TK, JSON.stringify(tracker)).catch(()=>{}); }, [tracker]);

    const sc = fitnessScore?.score || 0;
    const scColor = fitnessScore?.color || '#06b6d4';
    const first = userData.name?.split(' ')[0] || 'Athlete';
    const daily = Object.values(tracker);

    return (
        <View style={[st.root, { paddingTop: ins.top + 8 }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ── Greeting ── */}
                <Animated.View entering={FadeIn.duration(500)} style={st.top}>
                    <View>
                        <Text style={st.hi}>{greet()}</Text>
                        <Text style={st.name}>{first}</Text>
                    </View>
                    <View style={[st.dot, { backgroundColor: online ? '#22c55e' : online === false ? '#ef4444' : '#facc15' }]} />
                </Animated.View>

                {/* ── Hero Metric ── */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={st.hero}>
                    <View style={st.ringWrap}>
                        <Ring pct={sc} color={scColor} />
                        <View style={st.ringCenter}>
                            <Text style={[st.heroNum, { color: scColor }]}>{sc || '—'}</Text>
                            <Text style={st.heroUnit}>score</Text>
                        </View>
                    </View>
                    <View style={st.heroMeta}>
                        <View style={st.heroRow}>
                            <Text style={st.metaNum}>{(userData.bpi||0).toLocaleString()}</Text>
                            <Text style={st.metaKey}>BPI</Text>
                        </View>
                        <View style={st.heroRow}>
                            <Text style={st.metaNum}>{userData.sessions||0}</Text>
                            <Text style={st.metaKey}>sessions</Text>
                        </View>
                        <View style={st.heroRow}>
                            <Text style={st.metaNum}>{userData.streak||0}<Text style={st.metaKey}>d</Text></Text>
                            <Text style={st.metaKey}>streak</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Start Training ── */}
                <Animated.View entering={FadeInDown.delay(180).springify()}>
                    <Tap onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })}>
                        <LinearGradient colors={['#0c4a6e','#0891b2']} start={{x:0,y:0}} end={{x:1,y:1}} style={st.cta}>
                            <Text style={st.ctaText}>Start Training</Text>
                            <Text style={st.ctaSub}>AI form coaching</Text>
                        </LinearGradient>
                    </Tap>
                </Animated.View>

                {/* ── Quick Actions ── */}
                <Animated.View entering={FadeInDown.delay(260).springify()} style={st.qRow}>
                    <Tap onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_'+Date.now() })} style={st.qCard}>
                        <Text style={[st.qEmoji, { color: '#ef4444' }]}>{'♥'}</Text>
                        <Text style={st.qTitle}>Heart Rate</Text>
                    </Tap>
                    <Tap onPress={() => navigation.navigate('TrainingPlan')} style={st.qCard}>
                        <Text style={[st.qEmoji, { color: '#22c55e' }]}>{'☰'}</Text>
                        <Text style={st.qTitle}>Plan</Text>
                    </Tap>
                    <Tap onPress={() => navigation.navigate('FitnessTest')} style={st.qCard}>
                        <Text style={[st.qEmoji, { color: '#06b6d4' }]}>{'◎'}</Text>
                        <Text style={st.qTitle}>Fitness Test</Text>
                    </Tap>
                </Animated.View>

                {/* ── Today ── */}
                <Animated.View entering={FadeInDown.delay(340).duration(400)}>
                    <Text style={st.section}>Today</Text>
                </Animated.View>
                {daily.slice(0, 5).map((t, i) => (
                    <MetricBar key={i} label={t.label} value={t.current} goal={t.goal}
                        color={[C.cyan, C.orange, C.green, C.purple, C.yellow][i % 5]}
                        delay={400 + i * 60} />
                ))}

            </ScrollView>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
// NTC-inspired: black canvas, big numbers, minimal chrome, no card borders.

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#050a12' },

    // Top
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, marginBottom: 32 },
    hi: { fontSize: 13, color: '#6b7280', fontWeight: '400' },
    name: { fontSize: 30, fontWeight: '800', color: '#f9fafb', letterSpacing: -1 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },

    // Hero
    hero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 32 },
    ringWrap: { position: 'relative' },
    ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    heroNum: { fontSize: 36, fontWeight: '900', fontFamily: MONO },
    heroUnit: { fontSize: 10, color: '#6b7280', fontWeight: '500', marginTop: -4 },
    heroMeta: { flex: 1, marginLeft: 28 },
    heroRow: { marginBottom: 14 },
    metaNum: { fontSize: 22, fontWeight: '800', color: '#f9fafb', fontFamily: MONO },
    metaKey: { fontSize: 11, color: '#4b5563', fontWeight: '400' },

    // CTA
    cta: { marginHorizontal: 24, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 24, marginBottom: 20,
        ...Platform.select({ android: { elevation: 10 }, ios: { shadowColor: '#0891b2', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 10 }, shadowRadius: 24 } }),
    },
    ctaText: { fontSize: 22, fontWeight: '800', color: '#fff' },
    ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '400', marginTop: 4 },

    // Quick
    qRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 36 },
    qCard: { flex: 1, backgroundColor: '#111827', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    qEmoji: { fontSize: 22, marginBottom: 6 },
    qTitle: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

    // Section
    section: { fontSize: 18, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 24, marginBottom: 16 },

    // Metric
    metricRow: { paddingHorizontal: 24, marginBottom: 18 },
    metricHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    metricLabel: { fontSize: 13, color: '#6b7280', fontWeight: '400' },
    metricVal: { fontSize: 13, color: '#f9fafb', fontWeight: '700', fontFamily: MONO },
    metricGoal: { color: '#374151', fontWeight: '400' },
    barTrack: { height: 4, backgroundColor: '#1f2937', borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
});
