// MetricsScreen — Strava-clean rewrite
// Tabs (Physical/Technical/Cognitive) · spider chart · simple metric rows.
// Preserves useUser, METRICS_DB, navigation to InjuryRisk.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useUser } from '../../context/UserContext';
import { METRICS_DB } from '../../data/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';

// ─── Strava palette ─────────────────────────
const ORANGE  = '#FC4C02';
const DARK    = '#242428';
const GRAY    = '#6D6D78';
const DIM     = '#9CA3AF';
const LIGHT   = '#F7F7FA';
const BORDER  = '#E6E6EA';
const BG      = '#FFFFFF';
const SUCCESS = '#16A34A';
const ALERT   = '#DC2626';

const TABS = ['physical', 'technical', 'cognitive'];
const TAB_LABELS = { physical: 'Physical', technical: 'Technical', cognitive: 'Cognitive' };

// ─── Spider chart ───────────────────────────

function SpiderChart({ data, size = 220 }) {
    const center = size / 2;
    const radius = center - 35;
    const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];

    const renderWeb = (pct) => {
        const r = radius * pct;
        const pts = angles.map((a) => `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`).join(' ');
        return <Polygon points={pts} stroke={BORDER} strokeWidth="1" fill="none" key={pct} />;
    };

    const dataPts = angles.map((a, i) => {
        const val = Math.max(0, Math.min(100, data[i] || 0));
        const r = radius * (val / 100);
        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
    }).join(' ');

    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Svg width={size} height={size}>
                {[0.33, 0.66, 1].map(renderWeb)}
                {angles.map((a, i) => (
                    <Line
                        key={`ax-${i}`}
                        x1={center} y1={center}
                        x2={center + radius * Math.cos(a)} y2={center + radius * Math.sin(a)}
                        stroke={BORDER} strokeWidth="1"
                    />
                ))}
                <Polygon points={dataPts} fill="rgba(252, 76, 2, 0.20)" stroke={ORANGE} strokeWidth="2" />
                {angles.map((a, i) => {
                    const val = Math.max(0, Math.min(100, data[i] || 0));
                    const r = radius * (val / 100);
                    return (
                        <Circle
                            key={`pt-${i}`}
                            cx={center + r * Math.cos(a)} cy={center + r * Math.sin(a)}
                            r="4" fill={ORANGE}
                        />
                    );
                })}
                <SvgText x={center + (radius + 15) * Math.cos(angles[0])} y={center + (radius + 20) * Math.sin(angles[0])} fill={GRAY} fontSize="10" fontWeight="800" textAnchor="middle">PHYSICAL</SvgText>
                <SvgText x={center + (radius + 28) * Math.cos(angles[1])} y={center + (radius + 15) * Math.sin(angles[1])} fill={GRAY} fontSize="10" fontWeight="800" textAnchor="middle">TECHNICAL</SvgText>
                <SvgText x={center + (radius + 28) * Math.cos(angles[2])} y={center + (radius + 15) * Math.sin(angles[2])} fill={GRAY} fontSize="10" fontWeight="800" textAnchor="middle">COGNITIVE</SvgText>
            </Svg>
        </View>
    );
}

// ─── Metric row (replaces card-with-sparkline) ─

function MetricRow({ metric, isLive }) {
    const { label, unit, you, avg, betterIs, history } = metric;
    const isGood = betterIs === 'higher' ? you >= avg : you <= avg;
    const trendColor = isGood ? SUCCESS : ALERT;
    const allVals = [...(history || []), you];
    const maxVal = Math.max(...allVals);
    const minVal = Math.min(...allVals);
    const range = maxVal - minVal || 1;

    return (
        <View style={s.metricRow}>
            <View style={s.metricHead}>
                <Text style={s.metricLabel}>{label}</Text>
                <View style={[s.trendPill, { backgroundColor: isGood ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)' }]}>
                    <Text style={[s.trendText, { color: trendColor }]}>{isGood ? '↑' : '↓'} {isGood ? 'Above avg' : 'Below avg'}</Text>
                </View>
            </View>
            <View style={s.metricValuesRow}>
                <View>
                    <Text style={[s.metricYou, { color: trendColor }]}>{you}<Text style={s.metricUnit}> {unit}</Text></Text>
                    <Text style={s.metricSubLabel}>YOU</Text>
                </View>
                <View style={s.metricSep} />
                <View>
                    <Text style={s.metricAvg}>{avg}<Text style={s.metricUnit}> {unit}</Text></Text>
                    <Text style={s.metricSubLabel}>AVG</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={[s.liveBadge, { backgroundColor: isLive ? 'rgba(22,163,74,0.10)' : LIGHT }]}>
                    <View style={[s.liveDot, { backgroundColor: isLive ? SUCCESS : DIM }]} />
                    <Text style={[s.liveBadgeText, { color: isLive ? SUCCESS : GRAY }]}>{isLive ? 'LIVE' : 'DEMO'}</Text>
                </View>
            </View>
            {/* Mini sparkline */}
            <View style={s.sparkline}>
                {(history || []).concat([you]).map((v, i, arr) => {
                    const pct = ((v - minVal) / range) * 100;
                    const h = Math.max(8, (pct / 100) * 50);
                    const isLatest = i === arr.length - 1;
                    return (
                        <View key={i} style={s.sparkBarWrap}>
                            <View style={[s.sparkBar, { height: h, backgroundColor: isLatest ? trendColor : BORDER }]} />
                            <Text style={[s.sparkVal, isLatest && { color: trendColor, fontWeight: '700' }]}>{v}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

// ─── Screen ─────────────────────────────────

export default function MetricsScreen({ navigation }) {
    const { userData = {}, dataMode } = useUser();
    const [activeTab, setActiveTab] = useState('physical');
    const [liveMetrics, setLiveMetrics] = useState(null);
    const [latestHR, setLatestHR] = useState(null);
    const [recovery, setRecovery] = useState(null);
    const [personalBests, setPersonalBests] = useState(null);
    const bpi = userData.bpi ?? 12450;
    const isLive = dataMode !== 'mock';

    useEffect(() => {
        AsyncStorage.getItem('@latest_hr_reading').then(raw => {
            if (raw) { try { setLatestHR(JSON.parse(raw)); } catch (_) {} }
        }).catch(() => {});
        getOrCreateAnonymousAthleteId().then(async (id) => {
            const results = await Promise.allSettled([
                api.getProgress(id, 30),
                api.getWeakJoints(id, 30),
                api.getRecoveryScore(id),
                api.getPersonalBests(id),
            ]);
            const [prog, wj, rec, pbs] = results.map(r =>
                r.status === 'fulfilled' ? r.value : null
            );
            if (prog?.session_count > 0) {
                setLiveMetrics({ progress: prog, weakJoints: wj?.weak_joints || [] });
            }
            if (rec) setRecovery(rec);
            if (pbs?.has_data) setPersonalBests(pbs);
        }).catch(() => {});
    }, []);

    const stats = userData.stats || [];
    const spiderData = (() => {
        if (liveMetrics?.progress) {
            const p = liveMetrics.progress;
            // physical axis: avg form score (0-100)
            const formScore = Math.min(100, p.avg_form_score ?? 50);
            // technical axis: consistency (sessions this month, 10/mo = 100%)
            const consistency = Math.min(100, Math.round((p.session_count / 10) * 100));
            // cognitive axis: trend direction (50 = flat, 100 = +50% trend)
            const trendScore = Math.min(100, Math.max(0, 50 + (p.form_trend_pct ?? 0)));
            return [formScore, consistency, trendScore];
        }
        return stats.map((x) => x.A ?? 0).slice(0, 3).concat([50, 50, 50]).slice(0, 3);
    })();

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={s.topbar}>
                <View>
                    <Text style={s.eyebrow}>BIO-PASSPORT LAB</Text>
                    <Text style={s.title}>Your Metrics</Text>
                </View>
                <View style={s.bpiPill}>
                    <Text style={s.bpiLabel}>BPI</Text>
                    <Text style={s.bpiValue}>{bpi.toLocaleString()}</Text>
                </View>
            </View>

            {/* Tab pills */}
            <View style={s.tabRow}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tab, activeTab === tab && s.tabActive]}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                            {TAB_LABELS[tab]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                {/* Latest HR reading */}
                {latestHR && (
                    <View style={s.hrBadge}>
                        <Text style={s.hrBpm}>{latestHR.bpm} <Text style={s.hrUnit}>BPM</Text></Text>
                        <Text style={s.hrSub}>HRV {latestHR.hrv_ms}ms · {latestHR.quality} · {new Date(latestHR.recorded_at).toLocaleDateString()}</Text>
                    </View>
                )}

                {/* Spider Chart */}
                <Text style={s.sectionLabel}>CAPABILITY OVERVIEW</Text>
                <View style={s.chartCard}>
                    <SpiderChart data={spiderData} />
                </View>

                {/* Metric rows */}
                <Text style={[s.sectionLabel, { marginTop: 24 }]}>DETAILED METRICS</Text>
                {(METRICS_DB[activeTab] || []).map((m) => {
                    let metric = m;
                    const p = liveMetrics?.progress;
                    if (p) {
                        const trend = (p.form_score_trend || []).map(d => Math.round(d.score));
                        if (m.id === 't3' && p.avg_form_score > 0) {
                            metric = {
                                ...m,
                                you: Math.round(p.avg_form_score),
                                history: trend.slice(-3),
                            };
                        } else if (m.id === 'p2' && p.best_jump_cm > 0) {
                            metric = { ...m, you: Math.round(p.best_jump_cm) };
                        } else if (m.id === 'p1' && p.session_count > 0) {
                            metric = { ...m, you: p.session_count, unit: 'sessions', label: 'Sessions (30d)', betterIs: 'higher', avg: 8 };
                        }
                    }
                    return <MetricRow key={m.id} metric={metric} isLive={isLive || !!liveMetrics} />;
                })}

                {/* Weak joints from live analysis */}
                {liveMetrics?.weakJoints?.length > 0 && (
                    <>
                        <Text style={[s.sectionLabel, { marginTop: 24 }]}>WEAK JOINTS DETECTED</Text>
                        {liveMetrics.weakJoints.map((j, i) => (
                            <View key={i} style={[s.metricRow, { marginBottom: 8 }]}>
                                <View style={s.metricHead}>
                                    <Text style={s.metricLabel}>{j.joint?.replace(/_/g, ' ')}</Text>
                                    <View style={[s.trendPill, { backgroundColor: 'rgba(220,38,38,0.10)' }]}>
                                        <Text style={[s.trendText, { color: ALERT }]}>
                                            {j.deviation_deg != null ? `${Math.round(j.deviation_deg)}° off ideal` : 'needs work'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 12, color: GRAY, lineHeight: 18 }}>
                                    {j.recommendation || `Focus on ${j.joint?.replace(/_/g, ' ')} mobility and strength.`}
                                </Text>
                            </View>
                        ))}
                    </>
                )}

                {/* Recovery readiness */}
                {recovery && (
                    <>
                        <Text style={[s.sectionLabel, { marginTop: 24 }]}>RECOVERY READINESS</Text>
                        <View style={s.recoveryCard}>
                            <View style={s.recoveryHeader}>
                                <View>
                                    <Text style={s.recoveryScore}>{Math.round(recovery.score || 0)}</Text>
                                    <Text style={s.recoveryUnit}>/ 100</Text>
                                </View>
                                <View style={s.recoveryRight}>
                                    <View style={[s.recoveryBadge, {
                                        backgroundColor: recovery.score >= 70 ? 'rgba(22,163,74,0.10)' :
                                            recovery.score >= 40 ? 'rgba(234,179,8,0.10)' : 'rgba(220,38,38,0.10)',
                                    }]}>
                                        <Text style={[s.recoveryBadgeText, {
                                            color: recovery.score >= 70 ? SUCCESS :
                                                recovery.score >= 40 ? '#CA8A04' : ALERT,
                                        }]}>
                                            {(recovery.recommendation || recovery.zone || 'moderate').replace(/_/g, ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={s.recoveryLabel}>ACWR {recovery.acwr != null ? Number(recovery.acwr).toFixed(2) : '--'}</Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Personal bests */}
                {personalBests && (
                    <>
                        <Text style={[s.sectionLabel, { marginTop: 24 }]}>CAREER PERSONAL BESTS</Text>
                        <View style={s.pbCard}>
                            {[
                                { label: 'Best Form Score', value: personalBests.best_form_score?.value != null ? `${Number(personalBests.best_form_score.value).toFixed(1)}` : '--', unit: 'pts', date: personalBests.best_form_score?.date },
                                { label: 'Best Jump Height', value: personalBests.best_jump_height_cm?.value != null ? `${Number(personalBests.best_jump_height_cm.value).toFixed(1)}` : '--', unit: 'cm', date: personalBests.best_jump_height_cm?.date },
                                { label: 'Best Rep Count', value: personalBests.best_reps_single_session?.value != null ? String(personalBests.best_reps_single_session.value) : '--', unit: 'reps', date: personalBests.best_reps_single_session?.date },
                            ].map((pb, i) => (
                                <View key={i} style={[s.pbRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDER }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.pbLabel}>{pb.label}</Text>
                                        {pb.date ? <Text style={s.pbDate}>{pb.date}</Text> : null}
                                    </View>
                                    <Text style={s.pbValue}>{pb.value} <Text style={s.pbUnit}>{pb.unit}</Text></Text>
                                </View>
                            ))}
                            <View style={[s.pbRow, { borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: LIGHT, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }]}>
                                <Text style={[s.pbLabel, { color: GRAY }]}>Career sessions</Text>
                                <Text style={[s.pbValue, { color: GRAY }]}>{personalBests.total_sessions}</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* Injury risk entry — Strava-clean callout */}
                <Text style={[s.sectionLabel, { marginTop: 24 }]}>RISK ANALYSIS</Text>
                <TouchableOpacity
                    style={s.calloutCard}
                    onPress={() => navigation?.navigate('InjuryRisk')}
                    activeOpacity={0.7}
                >
                    <View style={s.calloutIcon}>
                        <Ionicons name="shield-half-outline" size={20} color={ORANGE} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.calloutTitle}>Injury Risk Analysis</Text>
                        <Text style={s.calloutSub}>Private · only visible to you</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={GRAY} />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    topbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
    title: { fontSize: 22, fontWeight: '800', color: DARK, marginTop: 2, letterSpacing: -0.5 },
    bpiPill: {
        backgroundColor: LIGHT,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 50,
        alignItems: 'center',
    },
    bpiLabel: { fontSize: 9, fontWeight: '800', color: GRAY, letterSpacing: 0.5 },
    bpiValue: { fontSize: 13, fontWeight: '800', color: DARK },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    tab: { paddingVertical: 12, paddingHorizontal: 12, marginRight: 8 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: ORANGE, marginBottom: -1 },
    tabText: { fontSize: 13, fontWeight: '600', color: GRAY, letterSpacing: 0.3 },
    tabTextActive: { color: DARK, fontWeight: '800' },

    sectionLabel: { fontSize: 11, fontWeight: '800', color: GRAY, letterSpacing: 0.8, marginBottom: 12 },

    // Chart card
    chartCard: {
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 12,
    },

    // Metric row
    metricRow: {
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
    },
    metricHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    metricLabel: { fontSize: 13, fontWeight: '700', color: DARK, flex: 1 },
    trendPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
    trendText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

    metricValuesRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
    metricYou: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    metricAvg: { fontSize: 18, fontWeight: '600', color: GRAY },
    metricUnit: { fontSize: 11, color: GRAY, fontWeight: '500' },
    metricSubLabel: { fontSize: 9, fontWeight: '800', color: DIM, letterSpacing: 0.5, marginTop: 2 },
    metricSep: { width: 1, height: 30, backgroundColor: BORDER, marginHorizontal: 14, alignSelf: 'center' },

    liveBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 50 },
    liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    liveBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

    // Sparkline
    sparkline: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: LIGHT,
        gap: 8,
    },
    sparkBarWrap: { flex: 1, alignItems: 'center' },
    sparkBar: { width: 16, borderRadius: 2 },
    sparkVal: { fontSize: 9, color: GRAY, marginTop: 4, fontWeight: '600' },

    // HR badge
    hrBadge: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hrBpm: { fontSize: 22, fontWeight: '800', color: DARK },
    hrUnit: { fontSize: 12, fontWeight: '600', color: GRAY },
    hrSub: { fontSize: 11, color: GRAY },

    // Callout
    calloutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 16,
    },
    calloutIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calloutTitle: { fontSize: 14, fontWeight: '700', color: DARK },
    calloutSub: { fontSize: 11, color: GRAY, marginTop: 2 },

    // Recovery card
    recoveryCard: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 16, marginBottom: 8 },
    recoveryHeader: { flexDirection: 'row', alignItems: 'center' },
    recoveryScore: { fontSize: 44, fontWeight: '800', color: DARK, letterSpacing: -1 },
    recoveryUnit: { fontSize: 12, color: GRAY, fontWeight: '600', marginTop: 2 },
    recoveryRight: { flex: 1, alignItems: 'flex-end' },
    recoveryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, marginBottom: 6 },
    recoveryBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    recoveryLabel: { fontSize: 11, color: GRAY, fontWeight: '600' },

    // Personal bests card
    pbCard: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
    pbRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    pbLabel: { fontSize: 13, fontWeight: '700', color: DARK },
    pbDate: { fontSize: 10, color: GRAY, marginTop: 2 },
    pbValue: { fontSize: 22, fontWeight: '800', color: ORANGE, letterSpacing: -0.5 },
    pbUnit: { fontSize: 11, color: GRAY, fontWeight: '500' },
});
