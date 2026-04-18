// WellnessScreen — WN-20 (dashboard) + WN-22 (sleep detail) + WN-23 (sparkline)
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    SafeAreaView, ActivityIndicator,
} from 'react-native';
import { C } from '../../styles/colors';
import api from '../../services/api';

const COMPONENT_MAX = { sleep: 30, hydration: 15, mood: 15, energy: 15, stress: 10, soreness: 15 };
const COMPONENT_LABELS = { sleep: 'Sleep', hydration: 'Hydration', mood: 'Mood', energy: 'Energy', stress: 'Stress', soreness: 'Soreness' };

function ScoreCircle({ score }) {
    const color = score == null ? C.muted : (score >= 70 ? C.green : (score >= 50 ? C.yellow : C.red));
    return (
        <View style={[sc.circle, { borderColor: color }]}>
            <Text style={[sc.scoreNum, { color }]}>{score ?? '—'}</Text>
            <Text style={sc.scoreMax}>{score != null ? '/100' : 'No data'}</Text>
        </View>
    );
}

function MiniBar({ values = [], color = C.cyan, barHeight = 40 }) {
    if (!values.length) return null;
    const max = Math.max(...values, 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: barHeight }}>
            {values.map((v, i) => (
                <View
                    key={i}
                    style={{
                        flex: 1,
                        height: Math.max(3, (v / max) * barHeight),
                        backgroundColor: color,
                        borderRadius: 2,
                        opacity: i === values.length - 1 ? 1 : 0.45,
                    }}
                />
            ))}
        </View>
    );
}

export default function WellnessScreen({ navigation, route }) {
    const athleteId = route.params?.athleteId || 'athlete_01';
    const [scoreData, setScoreData] = useState(null);
    const [trends, setTrends] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sleepExpanded, setSleepExpanded] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [scoreRes, trendsRes, histRes] = await Promise.all([
                api.get(`/athlete/${athleteId}/wellness/score`),
                api.get(`/athlete/${athleteId}/wellness/trends?period=weekly`),
                api.get(`/athlete/${athleteId}/wellness`),
            ]);
            setScoreData(scoreRes);
            setTrends(trendsRes);
            setHistory(histRes?.entries || []);
        } catch (e) {
            console.warn('[WellnessScreen] load error', e);
        }
        setLoading(false);
    }, [athleteId]);

    useEffect(() => { load(); }, [load]);

    const score = scoreData?.wellness_score;
    const hasData = score != null;
    const breakdown = scoreData?.breakdown || {};

    const recoveryLabel = !hasData ? 'No Data' : (score >= 70 ? 'Ready to Train' : (score >= 50 ? 'Train with Caution' : 'Rest Day Recommended'));
    const recoveryColor = !hasData ? C.muted : (score >= 70 ? C.green : (score >= 50 ? C.yellow : C.red));

    // Sleep 7-day trend
    const sleepLast7 = history.slice(-7).map(e => e.sleep?.sleep_score || 0);
    const sleepAvg = sleepLast7.length ? Math.round(sleepLast7.reduce((a, b) => a + b, 0) / sleepLast7.length) : 0;
    const sleepBest = history.slice(-7).reduce((best, e) => {
        const sc = e.sleep?.sleep_score || 0;
        return sc > (best?.score || 0) ? { date: e.date, score: sc } : best;
    }, null);
    const sleepWorst = history.slice(-7).reduce((worst, e) => {
        const sc = e.sleep?.sleep_score || 100;
        return sc < (worst?.score ?? 100) ? { date: e.date, score: sc } : worst;
    }, null);

    // Weekly wellness sparkline
    const trendData = trends?.trends || [];
    const trendValues = trendData.map(t => t.avg_wellness || 0);
    const trendDir = trends?.direction || 'stable';
    const trendColor = trendDir === 'improving' ? C.green : (trendDir === 'declining' ? C.red : C.cyan);
    const trendLabel = trendDir === 'improving' ? '↑ Improving' : (trendDir === 'declining' ? '↓ Declining' : '→ Stable');

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Wellness</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} /> : (
                <ScrollView contentContainerStyle={{ padding: 14 }}>
                    {/* Score */}
                    <View style={s.scoreSection}>
                        <ScoreCircle score={score} />
                        <View style={[s.recoveryBadge, { borderColor: recoveryColor + '60', backgroundColor: recoveryColor + '18' }]}>
                            <Text style={[s.recoveryText, { color: recoveryColor }]}>{recoveryLabel}</Text>
                        </View>
                        {scoreData?.recommendation ? (
                            <Text style={s.recommendation}>{scoreData.recommendation}</Text>
                        ) : null}
                    </View>

                    {/* Component grid */}
                    {hasData && (
                        <View style={s.componentGrid}>
                            {Object.entries(breakdown).map(([key, val]) => {
                                const pct = Math.round((val / (COMPONENT_MAX[key] || 15)) * 100);
                                const barColor = pct >= 70 ? C.green : (pct >= 40 ? C.yellow : C.red);
                                return (
                                    <View key={key} style={s.componentCard}>
                                        <Text style={s.componentLabel}>{COMPONENT_LABELS[key]}</Text>
                                        <Text style={[s.componentScore, { color: barColor }]}>{pct}%</Text>
                                        <View style={s.barBg}>
                                            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* CTA */}
                    <TouchableOpacity
                        style={[s.ctaBtn, hasData ? s.ctaBtnSecondary : s.ctaBtnPrimary]}
                        onPress={() => navigation.navigate('WellnessLogForm', { athleteId, prefill: scoreData })}
                    >
                        <Text style={[s.ctaText, hasData ? { color: C.cyan } : { color: '#0a0e1a' }]}>
                            {hasData ? 'Update Today' : 'Log Today'}
                        </Text>
                    </TouchableOpacity>

                    {/* Sleep detail card — WN-22 */}
                    {sleepLast7.length > 1 && (
                        <TouchableOpacity style={s.chartCard} onPress={() => setSleepExpanded(e => !e)} activeOpacity={0.8}>
                            <View style={s.chartHeaderRow}>
                                <Text style={s.chartTitle}>Sleep Score — Last 7 Days</Text>
                                <Text style={{ color: C.muted, fontSize: 12 }}>{sleepExpanded ? '▲' : '▼'}</Text>
                            </View>
                            <MiniBar values={sleepLast7} color={C.cyan} barHeight={44} />
                            {sleepExpanded && (
                                <View style={s.sleepMeta}>
                                    <Text style={s.chartSub}>Avg: {sleepAvg} / 100</Text>
                                    {sleepBest && <Text style={s.chartSub}>Best: {sleepBest.date} ({sleepBest.score})</Text>}
                                    {sleepWorst && <Text style={s.chartSub}>Worst: {sleepWorst.date} ({sleepWorst.score})</Text>}
                                    <Text style={s.chartSub}>Target line: 8h sleep → ~80</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Weekly sparkline — WN-23 */}
                    {trendValues.filter(v => v > 0).length >= 2 ? (
                        <View style={s.chartCard}>
                            <View style={s.chartHeaderRow}>
                                <Text style={s.chartTitle}>4-Week Trend</Text>
                                <Text style={[s.trendLabel, { color: trendColor }]}>{trendLabel}</Text>
                            </View>
                            <MiniBar values={trendValues} color={trendColor} barHeight={36} />
                            <View style={s.chartHeaderRow}>
                                {trendData.map((t, i) => (
                                    <Text key={i} style={[s.chartSub, { flex: 1, textAlign: 'center' }]}>
                                        {(t.week || t.month || '').slice(-3)}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={s.chartCard}>
                            <Text style={s.chartTitle}>4-Week Trend</Text>
                            <Text style={s.chartSub}>Not enough data yet. Log wellness for 2+ weeks.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const sc = StyleSheet.create({
    circle: { width: 130, height: 130, borderRadius: 65, borderWidth: 7, alignItems: 'center', justifyContent: 'center' },
    scoreNum: { fontSize: 44, fontWeight: '900', lineHeight: 52 },
    scoreMax: { fontSize: 13, color: C.muted, marginTop: -4 },
});

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    backBtn: { width: 60 },
    backText: { color: C.cyan, fontSize: 14 },
    title: { color: C.text, fontSize: 18, fontWeight: '700' },
    scoreSection: { alignItems: 'center', paddingVertical: 20 },
    recoveryBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    recoveryText: { fontSize: 14, fontWeight: '600' },
    recommendation: { color: C.textSub, fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 18 },
    componentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    componentCard: { width: '31%', backgroundColor: C.surf, borderRadius: 10, padding: 10 },
    componentLabel: { color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    componentScore: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    barBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    ctaBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginVertical: 8 },
    ctaBtnPrimary: { backgroundColor: C.cyan },
    ctaBtnSecondary: { backgroundColor: 'rgba(6,182,212,0.12)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    ctaText: { fontSize: 15, fontWeight: '700' },
    chartCard: { backgroundColor: C.surf, borderRadius: 12, padding: 14, marginBottom: 10 },
    chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    chartTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
    trendLabel: { fontSize: 12, fontWeight: '700' },
    chartSub: { color: C.muted, fontSize: 11, marginTop: 4 },
    sleepMeta: { marginTop: 8, gap: 2 },
});
