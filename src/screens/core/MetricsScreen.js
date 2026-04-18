// MetricsScreen (Production-Fixed)
// Fixes: gap→margin in flex layouts, useUser() hook
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { METRICS_DB } from '../../data/constants';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';

const C = { bg: '#0f172a', surf: '#1e293b', cyan: '#06b6d4', orange: '#f97316', green: '#22c55e', yellow: '#facc15', muted: '#64748b', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)' };
const TABS = ['physical', 'technical', 'cognitive'];
const TAB_LABELS = { physical: 'Physical', technical: 'Technical', cognitive: 'Cognitive' };

function MetricCard({ metric, isLive }) {
    const { label, unit, you, avg, betterIs, history } = metric;
    const isGood = betterIs === 'higher' ? you >= avg : you <= avg;
    const color = isGood ? C.green : C.orange;
    const allVals = [...(history || []), you];
    const maxVal = Math.max(...allVals);
    const minVal = Math.min(...allVals);
    const range = maxVal - minVal || 1;

    return (
        <View style={s.metricCard}>
            <View style={s.metricHeader}>
                <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.liveBadge, { backgroundColor: isLive ? 'rgba(6,182,212,0.15)' : 'rgba(100,116,139,0.15)' }]}>
                        <Text style={[s.liveBadgeText, { color: isLive ? C.cyan : C.muted }]}>
                            {isLive ? '🔵 LIVE' : '⚪ DEMO'}
                        </Text>
                    </View>
                    <View style={[s.metricBadge, { backgroundColor: color + '20', borderColor: color + '50', marginLeft: 6 }]}>
                        <Text style={[s.metricBadgeText, { color }]}>{isGood ? '↑ Above Avg' : '↓ Below Avg'}</Text>
                    </View>
                </View>
            </View>
            <View style={s.metricValues}>
                <View>
                    <Text style={[s.metricYou, { color }]}>{you}<Text style={s.metricUnit}> {unit}</Text></Text>
                    <Text style={s.metricYouLabel}>You</Text>
                </View>
                <View style={s.metricSep} />
                <View>
                    <Text style={s.metricAvg}>{avg}<Text style={s.metricUnit}> {unit}</Text></Text>
                    <Text style={s.metricYouLabel}>Avg</Text>
                </View>
            </View>
            <Text style={s.historyLabel}>TREND — LAST 3 SESSIONS</Text>
            <View style={s.sparkline}>
                {(history || []).concat([you]).map((v, i) => {
                    const pct = ((v - minVal) / range) * 100;
                    const h = Math.max(8, (pct / 100) * 70);
                    const isLatest = i === history.length;
                    return (
                        <View key={i} style={[s.sparkBarWrap, { marginRight: 6 }]}>
                            <View style={[s.sparkBar, { height: h, backgroundColor: isLatest ? color : C.muted + '60' }]} />
                            <Text style={[s.sparkVal, isLatest && { color, fontWeight: '800' }]}>{v}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

function SpiderChart({ data, size = 220 }) {
    const center = size / 2;
    const radius = center - 35; // Space for labels
    
    // 3 axes: Top, Bottom Right, Bottom Left
    const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];
    
    const renderWeb = (pct) => {
        const r = radius * pct;
        const pts = angles.map(a => `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`).join(' ');
        return <Polygon points={pts} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" key={pct} />;
    };
    
    const dataPts = angles.map((a, i) => {
        const val = Math.max(0, Math.min(100, data[i] || 0));
        const r = radius * (val / 100);
        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
    }).join(' ');
    
    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Svg width={size} height={size}>
                {/* Background Web */}
                {[0.33, 0.66, 1].map(renderWeb)}
                
                {/* Axes Lines */}
                {angles.map((a, i) => (
                    <Line key={`ax-${i}`} x1={center} y1={center} x2={center + radius * Math.cos(a)} y2={center + radius * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
                
                {/* Data Polygon */}
                <Polygon points={dataPts} fill="rgba(6,182,212,0.25)" stroke={C.cyan} strokeWidth="2" />
                
                {/* Data Points */}
                {angles.map((a, i) => {
                    const val = Math.max(0, Math.min(100, data[i] || 0));
                    const r = radius * (val / 100);
                    return <Circle key={`pt-${i}`} cx={center + r * Math.cos(a)} cy={center + r * Math.sin(a)} r="4" fill={C.cyan} />
                })}

                {/* Labels */}
                <SvgText x={center + (radius + 15) * Math.cos(angles[0])} y={center + (radius + 20) * Math.sin(angles[0])} fill={C.muted} fontSize="10" fontWeight="800" textAnchor="middle">PHYSICAL</SvgText>
                <SvgText x={center + (radius + 28) * Math.cos(angles[1])} y={center + (radius + 15) * Math.sin(angles[1])} fill={C.muted} fontSize="10" fontWeight="800" textAnchor="middle">TECHNICAL</SvgText>
                <SvgText x={center + (radius + 28) * Math.cos(angles[2])} y={center + (radius + 15) * Math.sin(angles[2])} fill={C.muted} fontSize="10" fontWeight="800" textAnchor="middle">COGNITIVE</SvgText>
            </Svg>
        </View>
    );
}

export default function MetricsScreen({ navigation }) {
    const { userData, dataMode } = useUser();
    const [activeTab, setActiveTab] = useState('physical');
    const bpi = userData.bpi ?? 12450;
    const isLive = dataMode !== 'mock';

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topbar}>
                <Text style={s.title}>Bio-Passport Lab</Text>
                <View style={s.bpiPill}>
                    <Text style={s.bpiText}>{`BPI ${bpi.toLocaleString()}`}</Text>
                </View>
            </View>

            <View style={s.tabRow}>
                {TABS.map((tab, i) => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tab, activeTab === tab && s.tabActive, i < TABS.length - 1 && { marginRight: 4 }]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{TAB_LABELS[tab]}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Spider Chart Integration */}
                <Text style={s.sectionLabel}>AI CAPABILITY ANALYSIS</Text>
                <View style={s.chartContainer}>
                    <SpiderChart data={(userData.stats || []).map(s => s.A ?? 0).slice(0, 3).concat(Array(3).fill(50)).slice(0, 3)} />
                </View>
                
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>DETAILED TRENDS</Text>
                {(METRICS_DB[activeTab] || []).map(m => <MetricCard key={m.id} metric={m} isLive={isLive} />)}

                {/* Flow 13 entry point — private injury risk analysis */}
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>RISK ANALYSIS</Text>
                <TouchableOpacity
                    style={s.injuryRiskCard}
                    onPress={() => navigation?.navigate('InjuryRisk')}
                    accessibilityLabel="Open Injury Risk Analysis"
                >
                    <View style={s.injuryRiskLeft}>
                        <Ionicons name="shield-half-outline" size={22} color={C.cyan} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={s.injuryRiskTitle}>Injury Risk Analysis</Text>
                            <Text style={s.injuryRiskSub}>Private — only visible to you</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.muted} />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, paddingBottom: 0 },
    title: { fontSize: 20, fontWeight: '900', color: C.text },
    bpiPill: { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.orange + '40' },
    bpiText: { color: C.orange, fontWeight: '800', fontSize: 12 },
    tabRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: C.surf, borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: C.cyan + '20' },
    tabText: { fontSize: 12, fontWeight: '700', color: C.muted },
    tabTextActive: { color: C.cyan },
    scroll: { flex: 1 },
    metricCard: { backgroundColor: C.surf, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    metricLabel: { fontSize: 14, fontWeight: '800', color: C.text, flex: 1, marginRight: 8 },
    liveBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    liveBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
    metricBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    metricBadgeText: { fontSize: 10, fontWeight: '800' },
    metricValues: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    metricYou: { fontSize: 24, fontWeight: '900' },
    metricAvg: { fontSize: 18, fontWeight: '700', color: C.muted },
    metricUnit: { fontSize: 12, fontWeight: '600', color: C.muted },
    metricYouLabel: { fontSize: 9, color: C.muted, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    metricSep: { width: 1, height: 40, backgroundColor: C.border, marginHorizontal: 16 },
    historyLabel: { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
    sparkline: { flexDirection: 'row', alignItems: 'flex-end', height: 80 },
    sparkBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    sparkBar: { width: '100%', borderRadius: 4, minHeight: 8 },
    sparkVal: { fontSize: 9, color: C.muted, fontWeight: '600', marginTop: 4 },
    chartContainer: { backgroundColor: C.surf, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    injuryRiskCard: {
        backgroundColor: C.surf,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 12,
    },
    injuryRiskLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
    injuryRiskTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    injuryRiskSub:   { fontSize: 11, color: C.muted, marginTop: 2 },
});
