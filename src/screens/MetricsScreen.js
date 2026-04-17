// MetricsScreen — comprehensive metrics dashboard.
// Grid of charts driven by GET /athlete/{id}/advanced-metrics.

import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Dimensions, StatusBar,
    ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { Tap, Fade } from '../ui';
import {
    Ring, Sparkline, MultiLine, Bar, StackedArea, Radar, Heatmap, Gauge,
} from '../components/charts';
import { sportColor } from '../config/sports';

const { width: W } = Dimensions.get('window');
const FONT_CONDENSED = Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold';

const ZONE_COLORS = {
    recovery: '#38bdf8', endurance: '#22c55e', tempo: '#facc15',
    threshold: '#f97316', anaerobic: '#ef4444',
};

function bandColor(band) {
    const map = {
        'spike — injury risk': '#ef4444',
        'high': '#f97316',
        'sweet spot': '#22c55e',
        'under-loaded': '#38bdf8',
        'unknown': '#64748b',
        'elite': '#22c55e',
        'ready': '#06b6d4',
        'caution': '#f97316',
        'recover': '#ef4444',
        'symmetrical': '#22c55e',
        'minor': '#38bdf8',
        'watch': '#f97316',
        'flag — assess dominant side': '#ef4444',
        'fresh': '#22c55e',
        'neutral': '#06b6d4',
        'accumulating': '#f97316',
        'fatigued': '#ef4444',
    };
    return map[band] || '#06b6d4';
}

function MetricCard({ title, children, accent }) {
    return (
        <Fade style={[styles.card, accent && { borderTopColor: accent, borderTopWidth: 2 }]}>
            <Text style={styles.cardTitle}>{title}</Text>
            {children}
        </Fade>
    );
}

function StatPill({ label, value, color, delta }) {
    const deltaColor = !delta ? '#64748b' : delta > 0 ? '#22c55e' : '#ef4444';
    return (
        <View style={styles.pill}>
            <Text style={styles.pillLabel}>{label}</Text>
            <Text style={[styles.pillValue, { color }]}>{value}</Text>
            {delta != null && (
                <Text style={[styles.pillDelta, { color: deltaColor }]}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(1)}
                </Text>
            )}
        </View>
    );
}

export default function MetricsScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';
    const accent = sportColor(userData?.sport || 'vertical_jump');

    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const data = await api.getAdvancedMetrics(athleteId, 60);
        if (data) setMetrics(data);
        setLoading(false);
    }, [athleteId]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    if (loading && !metrics) {
        return (
            <View style={[styles.root, { paddingTop: ins.top }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={accent} />
                    <Text style={styles.loadingText}>CRUNCHING NUMBERS</Text>
                </View>
            </View>
        );
    }

    if (!metrics) {
        return (
            <View style={[styles.root, { paddingTop: ins.top }]}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>COULDN'T LOAD METRICS</Text>
                    <Tap onPress={load} style={styles.retryRow}>
                        <Text style={styles.retryText}>RETRY ›</Text>
                    </Tap>
                </View>
            </View>
        );
    }

    const acwr = metrics.acwr || {};
    const mono = metrics.monotony || {};
    const asym = metrics.asymmetry || {};
    const readiness = metrics.readiness || {};
    const fatigue = metrics.fatigue || {};
    const agg = metrics.aggregate || {};
    const hr = metrics.heart_rate;

    // Sparkline from trend series
    const trendData = (metrics.form_trend_series || []).map(t => t.score);
    const loadData = (metrics.load_series || []).map(t => t.load);
    const loadLabels = (metrics.load_series || []).slice(-14).map(t => t.date.slice(5));

    // Quality distribution bars
    const qd = agg.quality_distribution || {};
    const qualityBars = [
        { label: 'ELITE', value: qd.elite || 0, color: '#22c55e' },
        { label: 'GOOD',  value: qd.good  || 0, color: '#06b6d4' },
        { label: 'AVG',   value: qd.average || 0, color: '#f97316' },
        { label: 'POOR',  value: qd.poor  || 0, color: '#ef4444' },
    ];

    // Asymmetry radar (joint deviations — lower is better, show 100-x)
    const radarAxes = [
        { label: 'KNEE',  value: Math.max(0, 100 - (asym.knee || 0) * 5) },
        { label: 'HIP',   value: Math.max(0, 100 - (asym.hip || 0) * 5) },
        { label: 'SHLDR', value: Math.max(0, 100 - (asym.shoulder || 0) * 5) },
        { label: 'FORM',  value: Math.min(100, agg.avg_form_score || 0) },
        { label: 'MOMTM', value: clamp100(50 + (metrics.momentum || 0) * 2) },
        { label: 'INTS',  value: Math.min(100, metrics.latest_intensity || 0) },
    ];

    // Readiness components → stacked area (trend by component) — show as bar
    const readinessBars = Object.entries(readiness.components || {}).map(([k, v]) => ({
        label: k.replace('_', ' ').slice(0, 6).toUpperCase(),
        value: v,
        color: bandColor(readiness.band),
    }));

    // HR zone distribution
    let zoneBars = [];
    if (hr?.zone_distribution) {
        zoneBars = Object.entries(hr.zone_distribution).map(([k, v]) => ({
            label: k.slice(0, 3).toUpperCase(),
            value: v,
            color: ZONE_COLORS[k] || '#64748b',
        }));
    }

    // Heatmap — last 28 days load
    const heatCells = (metrics.load_series || []).slice(-28).map(t => ({ date: t.date, value: t.load }));

    return (
        <View style={[styles.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <ScrollView
                contentContainerStyle={{ paddingBottom: ins.bottom + 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} progressBackgroundColor="#000" />}>
                {/* ═══ Hero ═══ */}
                <View style={styles.hero}>
                    <Text style={[styles.heroBrand, { color: accent }]}>METRICS</Text>
                    <Text style={styles.heroTitle}>{agg.total_sessions || 0} sessions</Text>
                    <Text style={styles.heroSub}>Last {metrics.window_days} days · updated {timeAgo(metrics.computed_at)}</Text>
                </View>

                <LinearGradient colors={['transparent', accent, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.divider} />

                {/* ═══ Top row: rings ═══ */}
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Ring pct={readiness.score || 0} color={bandColor(readiness.band)} size={110} stroke={8}
                            label="READINESS" value={Math.round(readiness.score || 0)} />
                        <Text style={[styles.bandText, { color: bandColor(readiness.band) }]}>{(readiness.band || '').toUpperCase()}</Text>
                    </View>
                    <View style={styles.col}>
                        <Ring pct={Math.min(100, agg.avg_form_score || 0)} color={accent} size={110} stroke={8}
                            label="AVG FORM" value={Math.round(agg.avg_form_score || 0)} />
                        <Text style={styles.subText}>Peak {Math.round(agg.peak_form_score || 0)}</Text>
                    </View>
                    <View style={styles.col}>
                        <Ring pct={Math.min(100, metrics.latest_intensity || 0)} color="#f97316" size={110} stroke={8}
                            label="INTENSITY" value={Math.round(metrics.latest_intensity || 0)} />
                        <Text style={styles.subText}>Last session</Text>
                    </View>
                </View>

                {/* ═══ Stat grid ═══ */}
                <View style={styles.statGrid}>
                    <StatPill label="MOMENTUM" value={(metrics.momentum || 0).toFixed(1)} color="#22c55e" delta={metrics.momentum} />
                    <StatPill label="TREND %"  value={(metrics.trend_pct || 0).toFixed(1) + '%'} color="#06b6d4" delta={metrics.trend_pct} />
                    <StatPill label="SESSIONS" value={agg.total_sessions || 0} color="#f97316" />
                    <StatPill label="BEST VJ"  value={(agg.best_jump_cm || 0).toFixed(0) + ' cm'} color="#8b5cf6" />
                    <StatPill label="TOTAL XP" value={agg.total_xp || 0} color="#facc15" />
                    <StatPill label="REPS"     value={agg.total_reps || 0} color="#ec4899" />
                </View>

                {/* ═══ Form trend ═══ */}
                <MetricCard title="FORM SCORE · 14 DAYS" accent={accent}>
                    <MultiLine
                        series={[{ color: accent, data: trendData }]}
                        width={W - 56} height={160} area
                        xLabels={metrics.form_trend_series?.slice(-14).map(t => t.date.slice(-5))} />
                </MetricCard>

                {/* ═══ Daily load ═══ */}
                <MetricCard title="DAILY LOAD · 14 DAYS" accent="#f97316">
                    <Bar data={loadData.slice(-14).map((v, i) => ({
                        label: (loadLabels[i] || '').slice(-2),
                        value: v,
                        color: '#f97316',
                    }))} width={W - 56} height={140} />
                </MetricCard>

                {/* ═══ ACWR gauge + monotony/strain ═══ */}
                <MetricCard title="TRAINING LOAD" accent={bandColor(acwr.band)}>
                    <View style={{ alignItems: 'center' }}>
                        <Gauge
                            value={acwr.acwr || 0} max={2.5}
                            color={bandColor(acwr.band)}
                            size={180}
                            label="ACWR"
                            zones={[
                                { from: 0, to: 0.8, color: '#38bdf8' },
                                { from: 0.8, to: 1.3, color: '#22c55e' },
                                { from: 1.3, to: 1.5, color: '#f97316' },
                                { from: 1.5, to: 2.5, color: '#ef4444' },
                            ]}
                        />
                        <Text style={[styles.bandText, { color: bandColor(acwr.band) }]}>{(acwr.band || '').toUpperCase()}</Text>
                        <View style={styles.monoRow}>
                            <View style={styles.monoCol}>
                                <Text style={styles.monoLabel}>MONOTONY</Text>
                                <Text style={styles.monoValue}>{(mono.monotony || 0).toFixed(2)}</Text>
                            </View>
                            <View style={styles.monoCol}>
                                <Text style={styles.monoLabel}>STRAIN</Text>
                                <Text style={styles.monoValue}>{Math.round(mono.strain || 0)}</Text>
                            </View>
                            <View style={styles.monoCol}>
                                <Text style={styles.monoLabel}>ACUTE</Text>
                                <Text style={styles.monoValue}>{Math.round(acwr.acute_load || 0)}</Text>
                            </View>
                        </View>
                    </View>
                </MetricCard>

                {/* ═══ Asymmetry radar ═══ */}
                <MetricCard title="SYMMETRY RADAR" accent={bandColor(asym.band)}>
                    <View style={{ alignItems: 'center' }}>
                        <Radar axes={radarAxes} color={bandColor(asym.band)} size={240} />
                        <Text style={[styles.bandText, { color: bandColor(asym.band) }]}>{(asym.band || '').toUpperCase()}</Text>
                    </View>
                </MetricCard>

                {/* ═══ Quality distribution ═══ */}
                <MetricCard title="FORM QUALITY · MIX" accent="#06b6d4">
                    <Bar data={qualityBars} width={W - 56} height={140} />
                </MetricCard>

                {/* ═══ HR zones ═══ */}
                {zoneBars.length > 0 && (
                    <MetricCard title="HEART RATE ZONES" accent={ZONE_COLORS.tempo}>
                        <Bar data={zoneBars} width={W - 56} height={140} />
                        <Text style={styles.hrMeta}>
                            AVG {Math.round(hr.avg_bpm || 0)} BPM · PEAK {Math.round(hr.peak_bpm || 0)} BPM · HRV {Math.round(hr.last_hrv_ms || 0)} ms
                        </Text>
                    </MetricCard>
                )}

                {/* ═══ Readiness components ═══ */}
                {readinessBars.length > 0 && (
                    <MetricCard title="READINESS BREAKDOWN" accent={bandColor(readiness.band)}>
                        <Bar data={readinessBars} width={W - 56} height={140} />
                    </MetricCard>
                )}

                {/* ═══ Load heatmap ═══ */}
                <MetricCard title="LOAD HEATMAP · 28 DAYS" accent="#06b6d4">
                    <Heatmap cells={heatCells} cols={7} width={W - 56} colorLow="#0b1220" colorHigh={accent} />
                </MetricCard>

                {/* ═══ Fatigue index ═══ */}
                <MetricCard title="FATIGUE INDEX" accent={bandColor(fatigue.band)}>
                    <View style={{ alignItems: 'center' }}>
                        <Gauge
                            value={Math.max(0, Math.min(20, (fatigue.index || 0) + 10))}
                            max={20}
                            color={bandColor(fatigue.band)}
                            size={180}
                            label="FATIGUE" />
                        <Text style={[styles.bandText, { color: bandColor(fatigue.band) }]}>{(fatigue.band || '').toUpperCase()}</Text>
                    </View>
                </MetricCard>

                {/* ═══ Momentum sparkline ═══ */}
                <MetricCard title="MOMENTUM TRAIL" accent="#22c55e">
                    <Sparkline data={trendData} width={W - 56} height={60} color="#22c55e" stroke={3} />
                </MetricCard>
            </ScrollView>
        </View>
    );
}

function clamp100(v) {
    return Math.max(0, Math.min(100, v));
}

function timeAgo(iso) {
    if (!iso) return 'now';
    try {
        const ts = new Date(iso).getTime();
        const diff = Date.now() - ts;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return `${Math.floor(diff / 3600000)}h ago`;
    } catch (_) { return 'now'; }
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#64748b', letterSpacing: 3, fontSize: 11, marginTop: 16 },
    errorText: { color: '#ef4444', letterSpacing: 2, fontSize: 12 },
    retryRow: { marginTop: 16, flexDirection: 'row' },
    retryText: { color: '#06b6d4', fontWeight: '800', letterSpacing: 2 },
    hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
    heroBrand: { fontSize: 11, fontWeight: '800', letterSpacing: 3 },
    heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', fontFamily: FONT_CONDENSED, letterSpacing: 1, marginTop: 6 },
    heroSub: { fontSize: 12, color: '#64748b', marginTop: 6, letterSpacing: 1 },
    divider: { height: 1, opacity: 0.5, marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, marginBottom: 16 },
    col: { alignItems: 'center', flex: 1 },
    bandText: { fontSize: 10, letterSpacing: 3, fontWeight: '800', marginTop: 8 },
    subText: { fontSize: 10, color: '#64748b', letterSpacing: 2, marginTop: 6 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 8 },
    pill: { width: '32%', margin: '0.66%', backgroundColor: '#0b1220', padding: 12, borderRadius: 10, alignItems: 'center' },
    pillLabel: { fontSize: 9, color: '#64748b', letterSpacing: 2, fontWeight: '700' },
    pillValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    pillDelta: { fontSize: 9, fontWeight: '700', marginTop: 2 },
    card: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#0b1220', borderRadius: 14, padding: 16 },
    cardTitle: { fontSize: 11, color: '#94a3b8', letterSpacing: 3, fontWeight: '800', marginBottom: 12 },
    monoRow: { flexDirection: 'row', marginTop: 10 },
    monoCol: { flex: 1, alignItems: 'center' },
    monoLabel: { fontSize: 9, color: '#64748b', letterSpacing: 2, fontWeight: '700' },
    monoValue: { fontSize: 18, color: '#fff', fontWeight: '800', marginTop: 4 },
    hrMeta: { fontSize: 10, color: '#94a3b8', letterSpacing: 1.5, marginTop: 10, textAlign: 'center' },
});
