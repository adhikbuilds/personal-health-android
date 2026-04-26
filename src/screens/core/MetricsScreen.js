// MetricsScreen — Strava-clean rewrite
// Tabs (Physical/Technical/Cognitive) · spider chart · simple metric rows.
// Preserves useUser, METRICS_DB, navigation to InjuryRisk.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useUser } from '../../context/UserContext';
import { METRICS_DB } from '../../data/constants';

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
    const bpi = userData.bpi ?? 12450;
    const isLive = dataMode !== 'mock';
    const stats = userData.stats || [];
    const spiderData = stats.map((x) => x.A ?? 0).slice(0, 3).concat([50, 50, 50]).slice(0, 3);

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
                {/* Spider Chart */}
                <Text style={s.sectionLabel}>CAPABILITY OVERVIEW</Text>
                <View style={s.chartCard}>
                    <SpiderChart data={spiderData} />
                </View>

                {/* Metric rows */}
                <Text style={[s.sectionLabel, { marginTop: 24 }]}>DETAILED METRICS</Text>
                {(METRICS_DB[activeTab] || []).map((m) => (
                    <MetricRow key={m.id} metric={m} isLive={isLive} />
                ))}

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
});
