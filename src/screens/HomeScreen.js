// HomeScreen — Premium Nike/Adidas language.
// Pure black canvas. Confident type. Single focal point per section.
// Colored accents only on data. No cards, no borders — the numbers carry.

import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Animated,
    Dimensions, Platform, StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';
import { Tap, Fade, CountUp, PulsingDot, ProgressRing, CONDENSED } from '../ui';
import { Sparkline, Heatmap } from '../components/charts';
import { sportColor, sportLabel } from '../config/sports';

const { width: W } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

function greet() {
    const h = new Date().getHours();
    return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function motivation(streak) {
    if (streak >= 14) return "You're on fire. Keep the fire burning.";
    if (streak >= 7) return "A full week. That's real consistency.";
    if (streak >= 3) return "Momentum builds. Stay with it.";
    if (streak >= 1) return "Yesterday was good. Make today better.";
    return "Every champion started with one session.";
}

function readinessColor(band) {
    return band === 'elite' ? '#22c55e'
        : band === 'ready' ? '#06b6d4'
        : band === 'caution' ? '#f97316'
        : band === 'recover' ? '#ef4444' : '#64748b';
}

function acwrColor(band) {
    return band === 'sweet spot' ? '#22c55e'
        : band === 'high' ? '#f97316'
        : band && band.startsWith('spike') ? '#ef4444'
        : band === 'under-loaded' ? '#38bdf8' : '#64748b';
}

function trendSymbol(v) { return v > 0 ? '▲' : v < 0 ? '▼' : '—'; }
function trendColor(v) { return v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#64748b'; }

// Animated horizontal bar for the daily tracker.
function Bar({ pct, color, delay }) {
    const w = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(w, { toValue: pct, duration: 900, delay: delay + 200, useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={$.barTrack}>
            <Animated.View style={[$.barFill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
}

// A single tap-to-navigate row with a colored left stroke — replaces the
// generic gradient dividers for a crisper, more intentional feel.
function QuickRow({ label, caption, color, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Tap onPress={onPress}>
                <View style={$.quickRow}>
                    <View style={[$.quickStroke, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                        <Text style={$.quickLabel}>{label}</Text>
                        {!!caption && <Text style={$.quickCaption}>{caption}</Text>}
                    </View>
                    <Text style={[$.quickArrow, { color }]}>→</Text>
                </View>
            </Tap>
        </Animated.View>
    );
}

// A tight 2-column stat row with labels on the left and big condensed
// numbers on the right. Reads like a scoreboard.
function ScoreboardRow({ label, value, color = '#fff', caption }) {
    return (
        <View style={$.scoreRow}>
            <Text style={$.scoreLabel}>{label}</Text>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[$.scoreValue, { color }]}>{value}</Text>
                {!!caption && <Text style={[$.scoreCaption, { color }]}>{caption}</Text>}
            </View>
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

    const accent = sportColor(userData.sport || 'vertical_jump');
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

    // Hero score ring — pulse glow sync
    const ringGlow = useRef(new Animated.Value(0.8)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(ringGlow, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // CTA bounce on mount
    const ctaBounce = useRef(new Animated.Value(0.9)).current;
    useEffect(() => {
        Animated.spring(ctaBounce, { toValue: 1, useNativeDriver: true, speed: 5, bounciness: 12 }).start();
    }, []);

    const sc = fitnessScore?.score || 0;
    const scColor = fitnessScore?.color || accent;
    const first = (userData.name || 'Athlete').split(' ')[0].toUpperCase();
    const full = (userData.name || 'Athlete').toUpperCase();
    const daily = Object.values(tracker);
    const sportName = sportLabel(userData.sport || 'vertical_jump');

    return (
        <View style={[$.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Subtle top-down gradient wash gives the hero visual weight without
                a card background — matches Whoop/Nike Training Club DNA. */}
            <LinearGradient
                colors={[accent + '25', 'transparent']}
                style={$.heroWash}
                pointerEvents="none"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#444" progressBackgroundColor="#000" colors={[accent]} />}
            >

                {/* ═══ Brand row ═══ */}
                <Fade style={$.top}>
                    <Text style={$.brand}>ACTIVE<Text style={{ color: accent }}>BHARAT</Text></Text>
                    <View style={$.onlineWrap}>
                        <PulsingDot color={online ? '#22c55e' : online === false ? '#ef4444' : '#facc15'} size={6} />
                        <Text style={[$.onlineText, { color: online ? '#22c55e' : online === false ? '#ef4444' : '#facc15' }]}>
                            {online ? 'LIVE' : online === false ? 'OFFLINE' : 'SYNC'}
                        </Text>
                    </View>
                </Fade>

                {/* ═══ Greeting + name hero ═══ */}
                <Fade delay={40} style={$.greetSection}>
                    <Text style={$.greetText}>{greet()}</Text>
                    <Text style={$.heroName}>{first}</Text>
                    <View style={$.tierRow}>
                        <Text style={[$.tierBadge, { color: accent }]}>L{userData.level || 1}</Text>
                        <View style={$.tierDot} />
                        <Text style={$.tierText}>{(userData.tier || 'District').toUpperCase()}</Text>
                        <View style={$.tierDot} />
                        <Text style={$.tierText}>{sportName.toUpperCase()}</Text>
                    </View>
                </Fade>

                {/* ═══ Fitness Score — THE focal point ═══ */}
                <Fade delay={120} style={$.scoreHero}>
                    <View style={$.scoreLeft}>
                        <Text style={$.eyebrow}>FITNESS SCORE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <CountUp to={sc} duration={1200} delay={300} style={[$.heroScoreBig, { color: scColor }]} />
                            <Text style={$.heroScoreDiv}>/100</Text>
                        </View>
                        <Text style={[$.heroScoreBand, { color: scColor }]}>
                            {(fitnessScore?.label || 'Not tested').toUpperCase()}
                        </Text>
                        {metrics && (
                            <View style={$.trendPill}>
                                <Text style={[$.trendArrow, { color: trendColor(metrics.trend_pct || 0) }]}>
                                    {trendSymbol(metrics.trend_pct || 0)}
                                </Text>
                                <Text style={[$.trendText, { color: trendColor(metrics.trend_pct || 0) }]}>
                                    {Math.abs(metrics.trend_pct || 0).toFixed(1)}%
                                </Text>
                                <Text style={$.trendUnit}>14D</Text>
                            </View>
                        )}
                    </View>
                    <Animated.View style={[$.ringWrap, { opacity: ringGlow }]}>
                        <ProgressRing pct={sc} color={scColor} size={128} stroke={6} />
                    </Animated.View>
                </Fade>

                {/* ═══ Scoreboard — dense numbers, all aligned right ═══ */}
                <View style={$.scoreboard}>
                    <ScoreboardRow label="BPI" value={(userData.bpi || 0).toLocaleString()} color={accent} />
                    <View style={$.scoreSep} />
                    <ScoreboardRow label="SESSIONS" value={userData.sessions || 0} color="#22c55e" />
                    <View style={$.scoreSep} />
                    <ScoreboardRow label="STREAK" value={`${userData.streak || 0}`} caption={userData.streak === 1 ? 'DAY' : 'DAYS'} color="#f97316" />
                    {metrics?.readiness && (
                        <>
                            <View style={$.scoreSep} />
                            <ScoreboardRow
                                label="READINESS"
                                value={Math.round(metrics.readiness.score || 0)}
                                caption={(metrics.readiness.band || '').toUpperCase()}
                                color={readinessColor(metrics.readiness.band)}
                            />
                        </>
                    )}
                    {metrics && (
                        <>
                            <View style={$.scoreSep} />
                            <ScoreboardRow
                                label="ACWR"
                                value={(metrics.acwr?.acwr || 0).toFixed(2)}
                                caption={(metrics.acwr?.band || '').toUpperCase()}
                                color={acwrColor(metrics.acwr?.band)}
                            />
                            <View style={$.scoreSep} />
                            <ScoreboardRow
                                label="INTENSITY"
                                value={Math.round(metrics.latest_intensity || 0)}
                                caption="LAST"
                                color="#a855f7"
                            />
                        </>
                    )}
                </View>

                {/* ═══ Momentum trail — full-bleed sparkline with area fill ═══ */}
                {metrics?.form_trend_series?.length > 1 && (
                    <Fade delay={220} style={$.momentumSection}>
                        <View style={$.momentumHeader}>
                            <View>
                                <Text style={$.eyebrow}>MOMENTUM · 14D</Text>
                                <Text style={[$.momentumValue, { color: trendColor(metrics.momentum || 0) }]}>
                                    {(metrics.momentum || 0) > 0 ? '+' : ''}{(metrics.momentum || 0).toFixed(1)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={$.eyebrow}>AVG FORM</Text>
                                <Text style={[$.momentumAvg, { color: '#f1f5f9' }]}>
                                    {Math.round(metrics.aggregate?.avg_form_score || 0)}
                                </Text>
                            </View>
                        </View>
                        <View style={$.sparkWrap}>
                            <Sparkline
                                data={metrics.form_trend_series.map(t => t.score)}
                                width={W - 48} height={72}
                                color={trendColor(metrics.momentum || 0) === '#64748b' ? accent : trendColor(metrics.momentum || 0)}
                                stroke={2.5}
                            />
                        </View>
                    </Fade>
                )}

                {/* ═══ 28-day load heatmap ═══ */}
                {metrics?.load_series?.length > 0 && (
                    <Fade delay={260} style={$.heatSection}>
                        <View style={$.heatHeader}>
                            <Text style={$.eyebrow}>28-DAY LOAD</Text>
                            <Text style={[$.heatMono, { color: '#94a3b8' }]}>
                                M{(metrics.monotony?.monotony || 0).toFixed(1)} · S{Math.round(metrics.monotony?.strain || 0)}
                            </Text>
                        </View>
                        <Heatmap
                            cells={metrics.load_series.slice(-28).map(t => ({ date: t.date, value: t.load }))}
                            cols={7} width={W - 48}
                            colorLow="#0b1120" colorHigh={accent}
                        />
                    </Fade>
                )}

                {/* ═══ CTA — large, sport-colored ═══ */}
                <Fade delay={300}>
                    <Animated.View style={{ transform: [{ scale: ctaBounce }] }}>
                        <Tap onPress={() => navigation.navigate('GhostSkeleton', { sport: userData.sport || 'general' })}>
                            <LinearGradient
                                colors={[accent + 'dd', accent + '88']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={$.cta}
                            >
                                <View style={$.ctaInner}>
                                    <Text style={$.ctaEyebrow}>YOUR NEXT SESSION</Text>
                                    <Text style={$.ctaTitle}>START{'\n'}TRAINING</Text>
                                    <Text style={$.ctaCaption}>{sportName.toUpperCase()} · GHOST CALIBRATION → LIVE FORM</Text>
                                </View>
                                <View style={$.ctaBtn}>
                                    <Text style={$.ctaBtnText}>GO</Text>
                                </View>
                            </LinearGradient>
                        </Tap>
                    </Animated.View>
                </Fade>

                {/* ═══ Quick actions — color-stroked rows ═══ */}
                <Fade delay={360} style={$.quickSection}>
                    <Text style={$.sectionHead}>QUICK ACTIONS</Text>
                    <QuickRow label="HEART RATE" caption="Finger rPPG · 2.5s warmup" color="#ef4444"
                        onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })} />
                    <QuickRow label="WEEKLY PLAN" caption="Personalized drills · adherence" color="#22c55e"
                        onPress={() => navigation.navigate('TrainingPlan')} />
                    <QuickRow label="NUTRITION AI" caption="Photo → macros via Claude vision" color="#f97316"
                        onPress={() => navigation.navigate('Nutrition')} />
                    <QuickRow label="FITNESS TEST" caption="BMI · flex · 600m · Fit India band" color="#06b6d4"
                        onPress={() => navigation.navigate('FitnessTest')} />
                </Fade>

                {/* ═══ Today's tracking ═══ */}
                <Fade delay={440} style={$.today}>
                    <Text style={$.sectionHead}>TODAY</Text>
                    <Text style={$.sectionSub}>{motivation(userData.streak || 0)}</Text>
                    {daily.slice(0, 5).map((t, i) => {
                        const pct = t.goal > 0 ? Math.min(1, t.current / t.goal) : 0;
                        const colors = ['#06b6d4', '#f97316', '#22c55e', '#a855f7', '#eab308'];
                        const val = typeof t.current === 'number' && t.current % 1 ? t.current.toFixed(1) : t.current;
                        return (
                            <Fade key={i} delay={500 + i * 40}>
                                <View style={$.metricRow}>
                                    <Text style={$.metricLabel}>{t.label.toUpperCase()}</Text>
                                    <Text style={$.metricVal}>
                                        <Text style={{ color: colors[i], fontWeight: '900' }}>{val}</Text>
                                        <Text style={$.metricGoal}>  /  {t.goal}</Text>
                                    </Text>
                                </View>
                                <Bar pct={pct} color={colors[i]} delay={500 + i * 40} />
                                {i < daily.slice(0, 5).length - 1 && <View style={{ height: 20 }} />}
                            </Fade>
                        );
                    })}
                </Fade>

                <View style={{ height: 56 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const $ = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    heroWash: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 340, zIndex: 0,
    },

    // Brand + status
    top: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 18, marginBottom: 28,
    },
    brand: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 3 },
    onlineWrap: { flexDirection: 'row', alignItems: 'center' },
    onlineText: { fontSize: 9, fontWeight: '800', letterSpacing: 2, marginLeft: 6 },

    // Greeting + name
    greetSection: { paddingHorizontal: 24, marginBottom: 28 },
    greetText: { fontSize: 12, color: '#64748b', fontWeight: '700', letterSpacing: 2 },
    heroName: {
        fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 6, letterSpacing: -1,
        fontFamily: CONDENSED, lineHeight: 46,
    },
    tierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    tierBadge: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    tierDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#334155', marginHorizontal: 8 },
    tierText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 2 },

    // Score hero — two-column scoreboard-style
    scoreHero: {
        flexDirection: 'row', paddingHorizontal: 24, marginBottom: 36,
        alignItems: 'center', justifyContent: 'space-between',
    },
    scoreLeft: { flex: 1 },
    eyebrow: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 2.5 },
    heroScoreBig: { fontSize: 76, fontWeight: '900', fontFamily: CONDENSED, marginTop: 4, lineHeight: 72 },
    heroScoreDiv: { fontSize: 18, color: '#475569', fontWeight: '700', marginLeft: 6 },
    heroScoreBand: { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginTop: 4 },

    trendPill: {
        flexDirection: 'row', alignItems: 'center', marginTop: 12,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start',
    },
    trendArrow: { fontSize: 11, fontWeight: '900', marginRight: 4 },
    trendText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    trendUnit: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 2, marginLeft: 6 },

    ringWrap: { marginLeft: 16 },

    // Scoreboard
    scoreboard: {
        marginHorizontal: 24, paddingVertical: 8, marginBottom: 32,
        borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    scoreRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12,
    },
    scoreSep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
    scoreLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 2.5 },
    scoreValue: { fontSize: 24, fontWeight: '900', fontFamily: CONDENSED },
    scoreCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 2 },

    // Momentum section
    momentumSection: { paddingHorizontal: 24, marginBottom: 36 },
    momentumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    momentumValue: { fontSize: 30, fontWeight: '900', fontFamily: CONDENSED, marginTop: 4 },
    momentumAvg: { fontSize: 30, fontWeight: '900', fontFamily: CONDENSED, marginTop: 4 },
    sparkWrap: { marginTop: 4 },

    // Heatmap
    heatSection: { paddingHorizontal: 24, marginBottom: 36 },
    heatHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
    },
    heatMono: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

    // CTA
    cta: {
        marginHorizontal: 20, borderRadius: 10, marginBottom: 36,
        paddingVertical: 28, paddingHorizontal: 24, position: 'relative',
        flexDirection: 'row', alignItems: 'center',
        ...Platform.select({
            android: { elevation: 16 },
            ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22 },
        }),
    },
    ctaInner: { flex: 1 },
    ctaEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2.5, marginBottom: 8 },
    ctaTitle: {
        fontSize: 40, fontWeight: '900', color: '#fff', lineHeight: 40, letterSpacing: -1,
        fontFamily: CONDENSED,
    },
    ctaCaption: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginTop: 10 },
    ctaBtn: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center', justifyContent: 'center', marginLeft: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    ctaBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },

    // Quick actions
    quickSection: { paddingHorizontal: 24, marginBottom: 36 },
    sectionHead: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 3, marginBottom: 16 },
    sectionSub: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 20, marginTop: -8 },

    quickRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 18, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    quickStroke: { width: 3, height: 28, borderRadius: 2, marginRight: 16 },
    quickLabel: { fontSize: 15, fontWeight: '800', color: '#f1f5f9', letterSpacing: 2 },
    quickCaption: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 3, letterSpacing: 0.8 },
    quickArrow: { fontSize: 22, fontWeight: '900' },

    // Today
    today: { paddingHorizontal: 24 },
    metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    metricLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', letterSpacing: 2 },
    metricVal: { fontSize: 13, color: '#f9fafb', fontWeight: '700', fontFamily: CONDENSED },
    metricGoal: { color: '#334155', fontWeight: '600' },
    barTrack: { height: 4, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
});
