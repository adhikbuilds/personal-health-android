// HomeScreen — Crafted with real animation patterns from NativeMotion.
// Uses Reanimated for 60fps spring animations, SVG for progress ring,
// scale-on-press for tactile feedback, staggered fade-in on mount.

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
    Easing, FadeIn, FadeInDown, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const HALF = (SW - 52) / 2;
const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MONO = Platform.OS === 'android' ? 'monospace' : 'Menlo';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Animated Progress Ring ─────────────────────────────────────────────────
// Adapted from NativeMotion's ProgressCircle

function ProgressRing({ progress, color, size = 90, stroke = 6, children }) {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const progressVal = useSharedValue(0);

    useEffect(() => {
        progressVal.value = withTiming(Math.min(1, Math.max(0, progress / 100)), {
            duration: 1200, easing: Easing.out(Easing.cubic),
        });
    }, [progress]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progressVal.value),
    }));

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={color + '15'} fill="none" strokeWidth={stroke}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                <AnimatedCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                    strokeWidth={stroke} strokeDasharray={circumference} animatedProps={animatedProps}
                    strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </View>
        </View>
    );
}

// ─── Scale Button (from NativeMotion) ───────────────────────────────────────

function ScalePress({ onPress, children, style, scale = 0.97 }) {
    const pressed = useSharedValue(0);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scale]) }],
    }));

    return (
        <Pressable onPress={onPress}
            onPressIn={() => { pressed.value = withTiming(1, { duration: 150 }); }}
            onPressOut={() => { pressed.value = withTiming(0, { duration: 200 }); }}>
            <Animated.View style={[style, animStyle]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

// ─── Stat ───────────────────────────────────────────────────────────────────

function Stat({ value, label, delay = 0 }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()} style={s.statBox}>
            <Text style={s.statVal}>{value}</Text>
            <Text style={s.statKey}>{label}</Text>
        </Animated.View>
    );
}

// ─── Daily Card ─────────────────────────────────────────────────────────────

function DailyCard({ label, current, goal, color, delay = 0 }) {
    const pct = goal > 0 ? Math.min(1, current / goal) : 0;
    const barWidth = useSharedValue(0);

    useEffect(() => {
        barWidth.value = withDelay(delay + 400, withTiming(pct, { duration: 800, easing: Easing.out(Easing.quad) }));
    }, [pct]);

    const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value * 100}%` }));
    const val = typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current;

    return (
        <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()} style={s.dailyCard}>
            <Text style={s.dailyVal}>{val}<Text style={s.dailyGoal}>/{goal}</Text></Text>
            <View style={s.dailyBar}>
                <Animated.View style={[s.dailyFill, { backgroundColor: color }, barStyle]} />
            </View>
            <Text style={s.dailyLabel}>{label}</Text>
        </Animated.View>
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
    const scoreColor = fitnessScore?.color || C.cyan;
    const firstName = name?.split(' ')[0] || 'Athlete';
    const daily = Object.values(tracker);

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* ─── Header ─── */}
                <Animated.View entering={FadeIn.duration(600)} style={s.header}>
                    <View>
                        <Text style={s.greet}>{getGreeting()},</Text>
                        <Text style={s.name}>{firstName}</Text>
                    </View>
                    <View style={[s.onlinePill, {
                        backgroundColor: apiOk ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                        borderColor: apiOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    }]}>
                        <View style={[s.onlineDot, { backgroundColor: apiOk ? C.green : apiOk === false ? C.red : C.yellow }]} />
                        <Text style={[s.onlineText, { color: apiOk ? C.green : apiOk === false ? C.red : C.yellow }]}>
                            {apiOk ? 'Online' : apiOk === false ? 'Offline' : '...'}
                        </Text>
                    </View>
                </Animated.View>

                {/* ─── Hero: Score Ring + Stats ─── */}
                <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={s.heroCard}>
                    <ProgressRing progress={score} color={scoreColor}>
                        <Text style={[s.ringScore, { color: scoreColor }]}>{score || '—'}</Text>
                        <Text style={s.ringLabel}>score</Text>
                    </ProgressRing>
                    <View style={s.heroRight}>
                        <Stat value={(bpi || 0).toLocaleString()} label="Bio-Passport" delay={200} />
                        <View style={s.divider} />
                        <Stat value={sessions || 0} label="Sessions" delay={300} />
                        <View style={s.divider} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Stat value={userData.tier || 'Block'} label="Tier" delay={400} />
                            {streak > 0 && (
                                <Animated.View entering={FadeIn.delay(600)} style={s.streakChip}>
                                    <Text style={s.streakText}>{streak}d</Text>
                                </Animated.View>
                            )}
                        </View>
                    </View>
                </Animated.View>

                {/* ─── Start Training CTA ─── */}
                <Animated.View entering={FadeInDown.delay(250).duration(500).springify()}>
                    <ScalePress onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'vertical_jump' })} scale={0.98}>
                        <LinearGradient colors={['#0c4a6e', '#0891b2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
                            <View>
                                <Text style={s.ctaTitle}>Start Training</Text>
                                <Text style={s.ctaSub}>Real-time AI form coaching</Text>
                            </View>
                            <View style={s.ctaCircle}>
                                <Text style={s.ctaArrow}>{'›'}</Text>
                            </View>
                        </LinearGradient>
                    </ScalePress>
                </Animated.View>

                {/* ─── Quick Access ─── */}
                <Animated.View entering={FadeInDown.delay(350).duration(500).springify()} style={s.quickRow}>
                    <ScalePress onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })}
                        style={[s.quickCard, { borderColor: 'rgba(239,68,68,0.12)' }]}>
                        <View style={[s.quickIcon, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                            <Text style={{ color: C.red, fontSize: 16 }}>{'♥'}</Text>
                        </View>
                        <Text style={s.quickTitle}>Heart Rate</Text>
                        <Text style={s.quickSub}>Camera rPPG</Text>
                    </ScalePress>

                    <ScalePress onPress={() => navigation.navigate('TrainingPlan')}
                        style={[s.quickCard, { borderColor: 'rgba(34,197,94,0.12)' }]}>
                        <View style={[s.quickIcon, { backgroundColor: 'rgba(34,197,94,0.08)' }]}>
                            <Text style={{ color: C.green, fontSize: 14, fontWeight: '700' }}>{'▤'}</Text>
                        </View>
                        <Text style={s.quickTitle}>Weekly Plan</Text>
                        <Text style={s.quickSub}>Your drills</Text>
                    </ScalePress>
                </Animated.View>

                {/* ─── Today ─── */}
                <Animated.View entering={FadeInDown.delay(450).duration(500)}>
                    <Text style={s.sectionTitle}>Today</Text>
                </Animated.View>
                <View style={s.dailyGrid}>
                    {daily.slice(0, 4).map((t, i) => (
                        <DailyCard key={i} label={t.label} current={t.current} goal={t.goal}
                            color={[C.cyan, C.orange, C.green, C.purple][i]} delay={500 + i * 80} />
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

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 14, marginBottom: 26 },
    greet: { fontSize: 13, color: C.muted, fontWeight: '400', lineHeight: 18 },
    name: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
    onlinePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, marginTop: 4 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    onlineText: { fontSize: 10, fontWeight: '600' },

    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    heroRight: { flex: 1, marginLeft: 22 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
    statBox: {},
    statVal: { fontSize: 17, fontWeight: '800', color: C.text, fontFamily: MONO },
    statKey: { fontSize: 10, color: C.muted, fontWeight: '500', marginTop: 1 },

    ringScore: { fontSize: 26, fontWeight: '900', fontFamily: MONO },
    ringLabel: { fontSize: 9, color: C.muted, fontWeight: '500', marginTop: -2 },

    streakChip: { backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
    streakText: { color: C.orange, fontSize: 10, fontWeight: '700' },

    cta: { borderRadius: 20, paddingVertical: 22, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        ...Platform.select({ android: { elevation: 8 }, ios: { shadowColor: '#0891b2', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 } }),
    },
    ctaTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '400', marginTop: 3 },
    ctaCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    ctaArrow: { color: '#fff', fontSize: 24, fontWeight: '300', marginLeft: 1 },

    quickRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 24 },
    quickCard: { flex: 1, backgroundColor: C.surf, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    quickIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    quickTitle: { fontSize: 13, fontWeight: '700', color: C.text },
    quickSub: { fontSize: 10, color: C.muted, fontWeight: '400', marginTop: 2 },

    sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },

    dailyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dailyCard: { width: HALF, backgroundColor: C.surf, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    dailyVal: { fontSize: 20, fontWeight: '800', color: C.text, fontFamily: MONO },
    dailyGoal: { fontSize: 11, color: C.muted, fontWeight: '400' },
    dailyBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
    dailyFill: { height: '100%', borderRadius: 2 },
    dailyLabel: { fontSize: 10, color: C.muted, fontWeight: '400' },
});
