// HomeScreen — referenced from Linear (structure), Whoop (hero restraint),
// Strava (stat triad), Apple Fitness (ring hierarchy), Arc Browser (depth
// without shadows). Every block is a flat-surface Card with a hairline
// border and one accent colour per meaning.

import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Animated,
    Dimensions, Platform, StatusBar, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from '../context/UserContext';
import api from '../services/api';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

import { Tap, Fade, PulsingDot, ProgressRing } from '../ui';
import { Card, StatTriad, StatCell, Chip, Divider, ListRow, SectionHead, TextButton } from '../components/primitives';
import { Sparkline, Heatmap } from '../components/charts';
import { C, T } from '../styles/colors';
import { sportLabel } from '../config/sports';

const { width: W } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

function greet() {
    const h = new Date().getHours();
    return h < 5 ? 'LATE NIGHT' : h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
}

function readinessBandColor(band) {
    if (band === 'elite') return C.good;
    if (band === 'ready') return C.good;
    if (band === 'caution') return C.warn;
    if (band === 'recover') return C.bad;
    return C.textMid;
}

function acwrBandColor(band) {
    if (band === 'sweet spot') return C.good;
    if (band === 'high') return C.warn;
    if (band && band.startsWith('spike')) return C.bad;
    if (band === 'under-loaded') return C.info;
    return C.textMid;
}

function trendColor(v) {
    if (v > 0.5) return C.good;
    if (v < -0.5) return C.bad;
    return C.textMid;
}

function deltaLabel(v) {
    const n = Math.abs(v).toFixed(1);
    const sym = v > 0 ? '↑' : v < 0 ? '↓' : '·';
    return `${sym} ${n}%`;
}

// Animated horizontal bar for the daily tracker.
function TrackBar({ pct, color, delay }) {
    const w = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(w, { toValue: pct, duration: 900, delay: delay + 200, useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={s.barTrack}>
            <Animated.View style={[s.barFill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData, fitnessScore } = useUser();
    const [online, setOnline] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);
    const [metrics, setMetrics] = useState(null);

    const TK = `@dt_${new Date().toISOString().slice(0, 10)}`;

    const load = () => {
        AsyncStorage.getItem(TK).then(r => { if (r) try { setTracker(JSON.parse(r)); } catch (_) {} });
        api.ping().then(ok => setOnline(!!ok));
        api.getAdvancedMetrics(userData.avatarId || 'athlete_01', 60).then(m => { if (m) setMetrics(m); });
    };
    useEffect(load, []);
    useEffect(() => { AsyncStorage.setItem(TK, JSON.stringify(tracker)).catch(() => {}); }, [tracker]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
        setTimeout(() => setRefreshing(false), 800);
    };

    const ringGlow = useRef(new Animated.Value(0.92)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(ringGlow, { toValue: 1, duration: 2400, useNativeDriver: true }),
            Animated.timing(ringGlow, { toValue: 0.92, duration: 2400, useNativeDriver: true }),
        ])).start();
    }, []);

    const sc = fitnessScore?.score || 0;
    const scColor = fitnessScore?.color || C.accent;
    const first = (userData.name || 'Athlete').split(' ')[0];
    const sportName = sportLabel(userData.sport || 'vertical_jump');

    const readinessScore = metrics?.readiness?.score;
    const readinessBand = metrics?.readiness?.band;
    const acwr = metrics?.acwr?.acwr ?? 0;
    const trendPct = metrics?.trend_pct ?? 0;
    const momentum = metrics?.momentum ?? 0;

    return (
        <View style={[s.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 56 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.border} colors={[C.accent]} progressBackgroundColor={C.bg2} />}
            >

                {/* ═══ Brand + status ═══ */}
                <Fade style={s.topBar}>
                    <Text style={s.brand}>
                        ACTIVE<Text style={{ color: C.accent }}>BHARAT</Text>
                    </Text>
                    <View style={s.statusWrap}>
                        <PulsingDot color={online ? C.good : online === false ? C.bad : C.warn} size={6} />
                        <Text style={[s.statusText, { color: online ? C.good : online === false ? C.bad : C.warn }]}>
                            {online ? 'LIVE' : online === false ? 'OFFLINE' : 'SYNC'}
                        </Text>
                    </View>
                </Fade>

                {/* ═══ Greeting ═══ */}
                <Fade delay={40} style={s.greetSection}>
                    <Text style={T.micro}>{greet()}</Text>
                    <Text style={s.heroName}>{first}</Text>
                    <View style={s.tierRow}>
                        <Chip label={`L${userData.level || 1}`} color={C.accent} bg="rgba(198,255,61,0.08)" />
                        <Text style={s.tierSep}>·</Text>
                        <Text style={s.tierText}>{(userData.tier || 'District').toUpperCase()}</Text>
                        <Text style={s.tierSep}>·</Text>
                        <Text style={s.tierText}>{sportName.toUpperCase()}</Text>
                    </View>
                </Fade>

                {/* ═══ HERO — Fitness Score ═══ */}
                <Fade delay={100} style={{ paddingHorizontal: 20 }}>
                    <Card padding={0} style={{ overflow: 'hidden' }}>
                        <View style={s.heroInner}>
                            <View style={s.heroLeft}>
                                <Text style={T.micro}>FITNESS SCORE</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                                    <Text style={[T.display, { color: scColor }]}>{sc}</Text>
                                    <Text style={s.heroDiv}>/100</Text>
                                </View>
                                <Text style={[s.heroBand, { color: scColor }]}>
                                    {(fitnessScore?.label || 'Not tested').toUpperCase()}
                                </Text>
                                {metrics && (
                                    <View style={s.heroChips}>
                                        <View style={[s.heroChip, { borderColor: trendColor(trendPct) + '44' }]}>
                                            <Text style={[s.heroChipText, { color: trendColor(trendPct) }]}>
                                                {deltaLabel(trendPct)} · 14D
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                            <Animated.View style={{ opacity: ringGlow, marginLeft: 12 }}>
                                <ProgressRing pct={sc} color={scColor} size={112} stroke={4} />
                            </Animated.View>
                        </View>
                    </Card>
                </Fade>

                {/* ═══ Scoreboard triad — Strava pattern ═══ */}
                <Fade delay={140} style={{ paddingHorizontal: 20, marginTop: 16 }}>
                    <Card>
                        <StatTriad items={[
                            { label: 'BPI', value: (userData.bpi || 0).toLocaleString(), color: C.accent },
                            { label: 'SESSIONS', value: userData.sessions || 0, color: C.text },
                            { label: 'STREAK', value: userData.streak || 0, caption: (userData.streak === 1 ? 'DAY' : 'DAYS'), color: C.good },
                        ]} />
                    </Card>
                </Fade>

                {/* ═══ Performance triad (readiness / acwr / intensity) ═══ */}
                {metrics && (
                    <Fade delay={180} style={{ paddingHorizontal: 20, marginTop: 12 }}>
                        <Card>
                            <StatTriad items={[
                                {
                                    label: 'READINESS',
                                    value: Math.round(readinessScore || 0),
                                    caption: (readinessBand || '').toUpperCase(),
                                    color: readinessBandColor(readinessBand),
                                },
                                {
                                    label: 'ACWR',
                                    value: acwr.toFixed(2),
                                    caption: (metrics.acwr?.band || '').toUpperCase(),
                                    color: acwrBandColor(metrics.acwr?.band),
                                },
                                {
                                    label: 'INTENSITY',
                                    value: Math.round(metrics.latest_intensity || 0),
                                    caption: 'LAST',
                                    color: C.info,
                                },
                            ]} />
                        </Card>
                    </Fade>
                )}

                {/* ═══ Momentum card ═══ */}
                {metrics?.form_trend_series?.length > 1 && (
                    <Fade delay={220} style={{ paddingHorizontal: 20, marginTop: 12 }}>
                        <Card accent={trendColor(momentum)}>
                            <SectionHead title="MOMENTUM · 14D" right={
                                <Text style={[s.momentumValue, { color: trendColor(momentum) }]}>
                                    {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                                </Text>
                            } />
                            <Sparkline
                                data={metrics.form_trend_series.map(t => t.score)}
                                width={W - 80} height={64}
                                color={trendColor(momentum) === C.textMid ? C.info : trendColor(momentum)}
                                stroke={2.5}
                            />
                            <View style={s.momentumFoot}>
                                <StatCell label="AVG FORM" value={Math.round(metrics.aggregate?.avg_form_score || 0)} size="sm" />
                                <StatCell label="PEAK" value={Math.round(metrics.aggregate?.peak_form_score || 0)} size="sm" align="right" />
                            </View>
                        </Card>
                    </Fade>
                )}

                {/* ═══ 28-day load heatmap ═══ */}
                {metrics?.load_series?.length > 0 && (
                    <Fade delay={260} style={{ paddingHorizontal: 20, marginTop: 12 }}>
                        <Card>
                            <SectionHead title="28-DAY LOAD" right={
                                <Text style={s.smallMono}>
                                    M {(metrics.monotony?.monotony || 0).toFixed(1)} · S {Math.round(metrics.monotony?.strain || 0)}
                                </Text>
                            } />
                            <Heatmap
                                cells={metrics.load_series.slice(-28).map(t => ({ date: t.date, value: t.load }))}
                                cols={7} width={W - 80}
                                colorLow={C.bg2} colorHigh={C.accent}
                            />
                        </Card>
                    </Fade>
                )}

                {/* ═══ Primary CTA ═══ */}
                <Fade delay={300} style={{ paddingHorizontal: 20, marginTop: 20 }}>
                    <Pressable
                        onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'general' })}
                        style={({ pressed }) => [s.ctaButton, pressed && { opacity: 0.88 }]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={s.ctaEyebrow}>YOUR NEXT SESSION</Text>
                            <Text style={s.ctaTitle}>Start training</Text>
                            <Text style={s.ctaCaption}>{sportName} · ghost calibration → live form</Text>
                        </View>
                        <View style={s.ctaIcon}><Text style={s.ctaIconText}>→</Text></View>
                    </Pressable>
                </Fade>

                {/* ═══ Quick actions ═══ */}
                <Fade delay={340} style={{ paddingHorizontal: 20, marginTop: 28 }}>
                    <SectionHead title="QUICK ACTIONS" />
                    <Card padding={0}>
                        <ListRow title="HEART RATE" caption="Finger rPPG · 2.5s warmup" accent={C.bad}
                            onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })} />
                        <ListRow title="WEEKLY PLAN" caption="Personalised drills · adherence" accent={C.good}
                            onPress={() => navigation.navigate('TrainingPlan')} />
                        <ListRow title="NUTRITION" caption="Photo → macros via Claude vision" accent={C.warn}
                            onPress={() => navigation.navigate('Nutrition')} />
                        <ListRow title="FITNESS TEST" caption="BMI · flex · 600m · Fit India band" accent={C.info}
                            onPress={() => navigation.navigate('FitnessTest')} />
                    </Card>
                </Fade>

                {/* ═══ Today tracking ═══ */}
                <Fade delay={380} style={{ paddingHorizontal: 20, marginTop: 28 }}>
                    <SectionHead title="TODAY" right={
                        <Text style={T.caption}>{new Date().toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                    } />
                    <Card>
                        {Object.values(tracker).slice(0, 5).map((t, i) => {
                            const pct = t.goal > 0 ? Math.min(1, t.current / t.goal) : 0;
                            const rowColors = [C.accent, C.info, C.good, C.warn, C.accent];
                            const val = typeof t.current === 'number' && t.current % 1 ? t.current.toFixed(1) : t.current;
                            return (
                                <View key={i} style={{ marginBottom: i < 4 ? 18 : 0 }}>
                                    <View style={s.trackerRow}>
                                        <Text style={s.trackerLabel}>{t.label.toUpperCase()}</Text>
                                        <Text style={s.trackerValue}>
                                            <Text style={{ color: rowColors[i] }}>{val}</Text>
                                            <Text style={{ color: C.muted }}>  /  {t.goal}</Text>
                                        </Text>
                                    </View>
                                    <TrackBar pct={pct} color={rowColors[i]} delay={500 + i * 40} />
                                </View>
                            );
                        })}
                    </Card>
                </Fade>
            </ScrollView>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // Top bar
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 18, marginBottom: 32,
    },
    brand: { fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: 3 },
    statusWrap: { flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginLeft: 6 },

    // Greeting
    greetSection: { paddingHorizontal: 20, marginBottom: 24 },
    heroName: {
        fontSize: 44, fontWeight: '700', color: C.text, marginTop: 10,
        letterSpacing: -1, lineHeight: 46,
    },
    tierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    tierSep: { color: C.muted, marginHorizontal: 10, fontSize: 14 },
    tierText: { fontSize: 11, fontWeight: '700', color: C.textMid, letterSpacing: 1.5 },

    // Hero score card
    heroInner: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 28, paddingHorizontal: 24,
    },
    heroLeft: { flex: 1 },
    heroDiv: { fontSize: 18, color: C.muted, fontWeight: '600', marginLeft: 6 },
    heroBand: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 6, textTransform: 'uppercase' },
    heroChips: { flexDirection: 'row', marginTop: 14 },
    heroChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
        borderWidth: 1, backgroundColor: C.bg2,
    },
    heroChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

    // Momentum
    momentumValue: { fontSize: 22, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -0.3 },
    momentumFoot: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    smallMono: { fontSize: 11, fontWeight: '600', fontFamily: T.MONO, color: C.textMid, letterSpacing: 0.5 },

    // CTA — flat, no shadow, no gradient bg
    ctaButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.accent,
        paddingVertical: 22, paddingHorizontal: 22,
        borderRadius: 16,
    },
    ctaEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(0,0,0,0.55)', letterSpacing: 2, marginBottom: 4 },
    ctaTitle: { fontSize: 26, fontWeight: '700', color: '#0A0A0A', letterSpacing: -0.5 },
    ctaCaption: { fontSize: 12, fontWeight: '500', color: 'rgba(0,0,0,0.65)', marginTop: 6 },
    ctaIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#0A0A0A',
        alignItems: 'center', justifyContent: 'center', marginLeft: 16,
    },
    ctaIconText: { fontSize: 20, color: C.accent, fontWeight: '700' },

    // Tracker rows
    trackerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    trackerLabel: { fontSize: 11, color: C.textMid, fontWeight: '700', letterSpacing: 1.5 },
    trackerValue: { fontSize: 14, fontWeight: '700', fontFamily: T.MONO },
    barTrack: { height: 4, backgroundColor: C.bg2, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
});
