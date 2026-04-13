// HomeScreen — Nike-inspired. Pure black canvas. Bold typography IS the design.
// No cards. No borders. No containers. Content floats on black.
// Futura Condensed → system condensed bold. Helvetica → system default.

import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Pressable, Animated,
    Dimensions, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

const { width: W, height: H } = Dimensions.get('window');

// ── Tap with scale feedback ──────────────────────────────────────────────────

function Tap({ onPress, children, style }) {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <Pressable onPress={onPress}
            onPressIn={() => Animated.spring(s, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()}
            onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start()}>
            <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
        </Pressable>
    );
}

// ── Fade in on mount ─────────────────────────────────────────────────────────

function Fade({ delay = 0, children, style, distance = 24 }) {
    const o = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(distance)).current;
    useEffect(() => {
        const anim = Animated.parallel([
            Animated.timing(o, { toValue: 1, duration: 700, delay, useNativeDriver: true }),
            Animated.timing(y, { toValue: 0, duration: 700, delay, useNativeDriver: true }),
        ]);
        anim.start();
        return () => anim.stop();
    }, []);
    return <Animated.View style={[style, { opacity: o, transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

// ── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, color, size = 140, stroke = 6 }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <Svg width={size} height={size}>
            <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth={stroke} />
            <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, (pct||0)/100))}
                strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        </Svg>
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
        AsyncStorage.getItem(TK).then(r => { if(r) try{setTracker(JSON.parse(r))}catch(_){} });
        api.ping().then(ok => setOnline(!!ok));
    }, []);
    useEffect(() => { AsyncStorage.setItem(TK, JSON.stringify(tracker)).catch(()=>{}); }, [tracker]);

    const score = fitnessScore?.score || 0;
    const color = fitnessScore?.color || '#06b6d4';
    const first = userData.name?.split(' ')[0] || 'Athlete';
    const daily = Object.values(tracker);

    return (
        <View style={[$.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ═══ Top Bar ═══ */}
                <Fade style={$.topBar}>
                    <Text style={$.brand}>ACTIVEBHARAT</Text>
                    <View style={[$.liveIndicator, { backgroundColor: online ? '#22c55e' : '#ef4444' }]} />
                </Fade>

                {/* ═══ Hero: Score + Identity ═══ */}
                <Fade delay={100} style={$.heroSection}>
                    <View style={$.ringContainer}>
                        <ProgressRing pct={score} color={color} />
                        <View style={$.ringInner}>
                            <Text style={[$.scoreNumber, { color }]}>{score || '—'}</Text>
                        </View>
                    </View>
                    <Text style={$.heroName}>{first.toUpperCase()}</Text>
                    <View style={$.statsRow}>
                        <View style={$.statItem}>
                            <Text style={[$.statNumber, { color: '#06b6d4' }]}>{(userData.bpi||0).toLocaleString()}</Text>
                            <Text style={$.statLabel}>BPI</Text>
                        </View>
                        <View style={$.statDivider} />
                        <View style={$.statItem}>
                            <Text style={[$.statNumber, { color: '#22c55e' }]}>{userData.sessions||0}</Text>
                            <Text style={$.statLabel}>SESSIONS</Text>
                        </View>
                        <View style={$.statDivider} />
                        <View style={$.statItem}>
                            <Text style={[$.statNumber, { color: '#f97316' }]}>{userData.streak||0}</Text>
                            <Text style={$.statLabel}>DAY STREAK</Text>
                        </View>
                    </View>
                </Fade>

                {/* ═══ Main CTA — full width, bold ═══ */}
                <Fade delay={200}>
                    <Tap onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })}>
                        <LinearGradient colors={['#0e7490','#06b6d4','#22d3ee']} start={{x:0,y:0}} end={{x:1,y:1}} style={$.ctaBlock}>
                            <Text style={$.ctaLabel}>YOUR NEXT SESSION</Text>
                            <Text style={$.ctaTitle}>START{'\n'}TRAINING</Text>
                            <Text style={$.ctaSubtitle}>AI-powered form analysis</Text>
                        </LinearGradient>
                    </Tap>
                </Fade>

                {/* ═══ Quick Actions — simple text links, Nike style ═══ */}
                <Fade delay={300} style={$.actionsSection}>
                    <Tap onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_'+Date.now() })} style={$.actionRow}>
                        <View style={$.actionLeft}>
                            <View style={[$.actionDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={$.actionTitle}>HEART RATE</Text>
                        </View>
                        <Text style={$.actionArrow}>›</Text>
                    </Tap>
                    <View style={$.actionDivider} />
                    <Tap onPress={() => navigation.navigate('TrainingPlan')} style={$.actionRow}>
                        <View style={$.actionLeft}>
                            <View style={[$.actionDot, { backgroundColor: '#22c55e' }]} />
                            <Text style={$.actionTitle}>WEEKLY PLAN</Text>
                        </View>
                        <Text style={$.actionArrow}>›</Text>
                    </Tap>
                    <View style={$.actionDivider} />
                    <Tap onPress={() => navigation.navigate('FitnessTest')} style={$.actionRow}>
                        <View style={$.actionLeft}>
                            <View style={[$.actionDot, { backgroundColor: '#06b6d4' }]} />
                            <Text style={$.actionTitle}>FITNESS TEST</Text>
                        </View>
                        <Text style={$.actionArrow}>›</Text>
                    </Tap>
                </Fade>

                {/* ═══ Today — minimal progress bars ═══ */}
                <Fade delay={400} style={$.todaySection}>
                    <Text style={$.todayTitle}>TODAY</Text>
                    {daily.slice(0, 4).map((t, i) => {
                        const pct = t.goal > 0 ? Math.min(1, t.current / t.goal) : 0;
                        const colors = ['#06b6d4','#f97316','#22c55e','#a855f7'];
                        const val = typeof t.current === 'number' && t.current % 1 ? t.current.toFixed(1) : t.current;
                        return (
                            <View key={i} style={$.todayRow}>
                                <View style={$.todayMeta}>
                                    <Text style={$.todayLabel}>{t.label}</Text>
                                    <Text style={$.todayValue}>{val} <Text style={$.todayGoal}>/ {t.goal}</Text></Text>
                                </View>
                                <View style={$.todayBar}>
                                    <View style={[$.todayFill, { width: `${pct*100}%`, backgroundColor: colors[i] }]} />
                                </View>
                            </View>
                        );
                    })}
                </Fade>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
// Pure black. No cards. No borders. Bold uppercase type. Nike DNA.

const $ = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    // Top bar
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, marginBottom: 8 },
    brand: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 3 },
    liveIndicator: { width: 8, height: 8, borderRadius: 4 },

    // Hero
    heroSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 40 },
    ringContainer: { marginBottom: 20 },
    ringInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    scoreNumber: { fontSize: 44, fontWeight: '900', fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold' },
    heroName: { fontSize: 16, fontWeight: '700', color: '#6b7280', letterSpacing: 6, marginBottom: 28 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { alignItems: 'center', paddingHorizontal: 20 },
    statNumber: { fontSize: 24, fontWeight: '800', color: '#fff', fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold' },
    statLabel: { fontSize: 9, fontWeight: '600', color: '#4b5563', letterSpacing: 2, marginTop: 4 },
    statDivider: { width: 1, height: 28, backgroundColor: '#1f2937' },

    // CTA
    ctaBlock: { marginHorizontal: 20, borderRadius: 4, paddingVertical: 36, paddingHorizontal: 28, marginBottom: 32 },
    ctaLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginBottom: 8 },
    ctaTitle: { fontSize: 42, fontWeight: '900', color: '#fff', lineHeight: 44, letterSpacing: -1, fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold' },
    ctaSubtitle: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.45)', marginTop: 12 },

    // Actions
    actionsSection: { paddingHorizontal: 24, marginBottom: 40 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
    actionLeft: { flexDirection: 'row', alignItems: 'center' },
    actionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 14 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 2 },
    actionArrow: { fontSize: 22, color: '#4b5563', fontWeight: '300' },
    actionDivider: { height: 1, backgroundColor: '#1a1a1a' },

    // Today
    todaySection: { paddingHorizontal: 24 },
    todayTitle: { fontSize: 11, fontWeight: '800', color: '#4b5563', letterSpacing: 3, marginBottom: 20 },
    todayRow: { marginBottom: 20 },
    todayMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    todayLabel: { fontSize: 13, fontWeight: '500', color: '#9ca3af' },
    todayValue: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: Platform.OS === 'android' ? 'sans-serif-condensed' : 'Courier' },
    todayGoal: { fontWeight: '400', color: '#374151' },
    todayBar: { height: 3, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
    todayFill: { height: '100%', borderRadius: 2 },
});
