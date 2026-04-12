// ProgressScreen — Athlete progress dashboard with SVG charts
// Form trend, weak joints, injury risk, competition readiness
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import Svg, { Polyline, Circle, Rect, Line, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';

const { width: SW } = Dimensions.get('window');
const PAD = 20;
const CARD_W = SW - PAD * 2;

const PERIODS = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
];

const RISK_COLORS = { low: C.green, watch: C.orange, high: C.red };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(v) {
    if (v >= 75) return C.green;
    if (v >= 50) return C.orange;
    return C.red;
}

function titleCase(s) {
    return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(d) {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

// ─── Micro-label ─────────────────────────────────────────────────────────────

function MicroLabel({ children, style }) {
    return <Text style={[s.micro, style]}>{children}</Text>;
}

// ─── Glassmorphic card ───────────────────────────────────────────────────────

function GlassCard({ children, style, borderLeftColor }) {
    return (
        <View style={[
            s.card,
            borderLeftColor && { borderLeftWidth: 4, borderLeftColor },
            style,
        ]}>
            {children}
        </View>
    );
}

// ─── Period pills ────────────────────────────────────────────────────────────

function PeriodPills({ selected, onSelect }) {
    return (
        <View style={s.pillRow}>
            {PERIODS.map(p => {
                const active = p.days === selected;
                return (
                    <TouchableOpacity
                        key={p.days}
                        style={[s.pill, active && s.pillActive]}
                        onPress={() => onSelect(p.days)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.pillText, active && s.pillTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ─── SVG Form Trend Chart ────────────────────────────────────────────────────

function FormTrendChart({ data, trendPct }) {
    if (!data || data.length < 2) {
        return (
            <GlassCard>
                <MicroLabel>FORM TREND</MicroLabel>
                <Text style={s.emptyText}>Not enough data for chart</Text>
            </GlassCard>
        );
    }

    const chartW = CARD_W - 48;
    const chartH = 140;
    const padT = 10;
    const padB = 24;
    const padL = 32;
    const padR = 8;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const scores = data.map(d => d.score);
    const minY = 0;
    const maxY = 100;

    const pts = data.map((d, i) => {
        const x = padL + (i / (data.length - 1)) * innerW;
        const y = padT + innerH - ((d.score - minY) / (maxY - minY)) * innerH;
        return { x, y, score: d.score, date: d.date };
    });

    const polyStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    // Area fill polygon (close to bottom)
    const areaStr = `${pts[0].x},${padT + innerH} ${polyStr} ${pts[pts.length - 1].x},${padT + innerH}`;

    const trendUp = trendPct >= 0;
    const trendColor = trendUp ? C.green : C.red;
    const arrow = trendUp ? '\u25B2' : '\u25BC';

    // Y-axis gridlines
    const yLines = [0, 25, 50, 75, 100];

    return (
        <GlassCard>
            <MicroLabel>FORM TREND</MicroLabel>
            <View style={{ marginTop: 12 }}>
                <Svg width={chartW} height={chartH}>
                    <Defs>
                        <SvgGrad id="areaFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={C.cyan} stopOpacity="0.18" />
                            <Stop offset="1" stopColor={C.cyan} stopOpacity="0.02" />
                        </SvgGrad>
                    </Defs>

                    {/* Grid lines */}
                    {yLines.map(v => {
                        const y = padT + innerH - ((v - minY) / (maxY - minY)) * innerH;
                        return (
                            <React.Fragment key={v}>
                                <Line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                                <SvgText x={padL - 6} y={y + 4} fontSize={9} fill={C.muted} textAnchor="end" fontWeight="700">{v}</SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Area fill */}
                    <Polyline points={areaStr} fill="url(#areaFill)" stroke="none" />

                    {/* Line */}
                    <Polyline points={polyStr} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                    {/* Dots */}
                    {pts.map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={C.cyan} stroke={C.bg} strokeWidth={2} />
                    ))}

                    {/* X-axis date labels (first, mid, last) */}
                    {[0, Math.floor(data.length / 2), data.length - 1].map(idx => (
                        <SvgText key={idx} x={pts[idx].x} y={chartH - 4} fontSize={8} fill={C.muted} textAnchor="middle" fontWeight="700">
                            {fmtDate(data[idx].date)}
                        </SvgText>
                    ))}
                </Svg>
            </View>

            {/* Trend badge */}
            <View style={[s.trendBadge, { backgroundColor: trendColor + '18' }]}>
                <Text style={[s.trendText, { color: trendColor }]}>
                    {arrow} {Math.abs(trendPct).toFixed(1)}% over period
                </Text>
            </View>
        </GlassCard>
    );
}

// ─── Stat Card (2x2 grid) ────────────────────────────────────────────────────

function StatCard({ label, value, unit, color }) {
    return (
        <View style={s.statCard}>
            <MicroLabel>{label}</MicroLabel>
            <Text style={[s.statNum, { color }]}>{value}</Text>
            <Text style={s.statUnit}>{unit}</Text>
        </View>
    );
}

// ─── Weak Joints ─────────────────────────────────────────────────────────────

function WeakJointBar({ joint }) {
    const { joint: name, mean_deg, ideal_min, ideal_max, deviation_deg } = joint;
    const barW = CARD_W - 120;

    // Full visual range: from 0 to max(ideal_max * 1.6, mean_deg * 1.2)
    const rangeMax = Math.max(ideal_max * 1.6, mean_deg * 1.2, 180);

    const idealStartPct = (ideal_min / rangeMax) * 100;
    const idealWidthPct = ((ideal_max - ideal_min) / rangeMax) * 100;
    const meanPct = (mean_deg / rangeMax) * 100;

    const outOfRange = mean_deg < ideal_min || mean_deg > ideal_max;
    const dotColor = outOfRange ? C.orange : C.green;

    return (
        <View style={s.jointRow}>
            <View style={s.jointLeft}>
                <Text style={s.jointName}>{titleCase(name)}</Text>
                <Text style={[s.jointDev, { color: dotColor }]}>
                    {deviation_deg.toFixed(1)}deg
                </Text>
            </View>
            <View style={[s.jointBarBg, { width: barW }]}>
                {/* Ideal zone */}
                <View style={[s.jointIdeal, { left: `${idealStartPct}%`, width: `${idealWidthPct}%` }]} />
                {/* Mean dot */}
                <View style={[s.jointDot, { left: `${Math.min(meanPct, 98)}%`, backgroundColor: dotColor }]} />
            </View>
        </View>
    );
}

// ─── Injury Risk Card ────────────────────────────────────────────────────────

function InjuryRiskCard({ data }) {
    if (!data) return null;
    const color = RISK_COLORS[data.risk] || C.muted;
    return (
        <GlassCard borderLeftColor={color}>
            <MicroLabel>INJURY RISK</MicroLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <View style={[s.riskDot, { backgroundColor: color }]} />
                <Text style={[s.riskBand, { color }]}>{(data.risk || '').toUpperCase()}</Text>
                <Text style={s.riskDeviation}>{data.deviation_pct}%</Text>
            </View>
            <Text style={s.riskReason} numberOfLines={2}>{data.reason}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <MicroLabel style={{ color: C.muted }}>SYMMETRY</MicroLabel>
                <Text style={s.riskSymmetry}>{(data.mean_symmetry * 100).toFixed(1)}%</Text>
            </View>
        </GlassCard>
    );
}

// ─── Coaching Note ───────────────────────────────────────────────────────────

function CoachingNote({ summary }) {
    if (!summary?.coaching_note?.bullets?.length) return null;
    const bullets = summary.coaching_note.bullets.slice(0, 4);
    const source = summary.coaching_note.source || 'AI';

    return (
        <GlassCard borderLeftColor={C.cyan}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <MicroLabel>AI COACHING</MicroLabel>
                <View style={[s.sourcePill, { backgroundColor: source === 'AI' ? C.cyan + '20' : C.muted + '20' }]}>
                    <Text style={[s.sourceText, { color: source === 'AI' ? C.cyan : C.muted }]}>{source}</Text>
                </View>
            </View>
            {bullets.map((b, i) => (
                <View key={i} style={s.bulletRow}>
                    <View style={s.bulletDot} />
                    <Text style={s.bulletText} numberOfLines={2}>{b}</Text>
                </View>
            ))}
        </GlassCard>
    );
}

// ─── Competition Readiness Arc ───────────────────────────────────────────────

function ReadinessArc({ data }) {
    if (!data) return null;
    const { score, band, components } = data;
    const arcColor = score >= 65 ? C.green : score >= 45 ? C.orange : C.red;

    // SVG arc params
    const size = 140;
    const cx = size / 2;
    const cy = size / 2;
    const r = 54;
    const strokeW = 10;
    const circumference = 2 * Math.PI * r;
    // Arc from 135deg to 405deg (270deg sweep)
    const sweepDeg = 270;
    const sweepFrac = sweepDeg / 360;
    const totalArc = circumference * sweepFrac;
    const filledArc = totalArc * (score / 100);
    const gapArc = totalArc - filledArc;

    // Start angle: 135deg (bottom-left)
    const startAngle = 135;

    const COMP_LABELS = { form: 'Form', symmetry: 'Symmetry', volume: 'Volume', hrv: 'Recovery' };

    return (
        <GlassCard>
            <MicroLabel>COMPETITION READINESS</MicroLabel>
            <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Svg width={size} height={size}>
                    {/* Background arc */}
                    <Circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={strokeW}
                        strokeDasharray={`${totalArc} ${circumference - totalArc}`}
                        strokeDashoffset={-circumference * (startAngle / 360)}
                        strokeLinecap="round"
                        transform={`rotate(0, ${cx}, ${cy})`}
                    />
                    {/* Filled arc */}
                    <Circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={arcColor}
                        strokeWidth={strokeW}
                        strokeDasharray={`${filledArc} ${circumference - filledArc}`}
                        strokeDashoffset={-circumference * (startAngle / 360)}
                        strokeLinecap="round"
                    />
                    {/* Score number */}
                    <SvgText
                        x={cx} y={cy - 4}
                        fontSize={32}
                        fontWeight="900"
                        fill={arcColor}
                        textAnchor="middle"
                        fontFamily="monospace"
                    >
                        {Math.round(score)}
                    </SvgText>
                    {/* Band label */}
                    <SvgText
                        x={cx} y={cy + 18}
                        fontSize={10}
                        fontWeight="800"
                        fill={C.muted}
                        textAnchor="middle"
                        letterSpacing={2}
                    >
                        {(band || '').toUpperCase()}
                    </SvgText>
                </Svg>
            </View>

            {/* Component bars */}
            <View style={{ marginTop: 8 }}>
                {Object.entries(components || {}).map(([key, comp]) => {
                    const pct = comp.value || 0;
                    const barColor = pct >= 70 ? C.green : pct >= 50 ? C.orange : C.red;
                    return (
                        <View key={key} style={s.compRow}>
                            <Text style={s.compLabel}>{COMP_LABELS[key] || titleCase(key)}</Text>
                            <View style={s.compBarBg}>
                                <View style={[s.compBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                            </View>
                            <Text style={[s.compPct, { color: barColor }]}>{Math.round(pct)}</Text>
                        </View>
                    );
                })}
            </View>
        </GlassCard>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';

    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [progress, setProgress] = useState(null);
    const [weakJoints, setWeakJoints] = useState(null);
    const [injuryRisk, setInjuryRisk] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [summary, setSummary] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [prog, wj, ir, rd, ws] = await Promise.all([
                api.getProgress(athleteId, days),
                api.getWeakJoints(athleteId, days),
                api.getInjuryRisk(athleteId, Math.min(days, 14)),
                api.getReadiness(athleteId, Math.min(days, 14)),
                api.getWeeklySummary(athleteId, Math.min(days, 7)),
            ]);
            setProgress(prog);
            setWeakJoints(wj);
            setInjuryRisk(ir);
            setReadiness(rd);
            setSummary(ws);
        } catch (e) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [athleteId, days]);

    useEffect(() => { load(); }, [load]);

    // ─── Loading state ───────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={s.root}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={C.cyan} />
                    <Text style={[s.emptyText, { marginTop: 12 }]}>Loading progress...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Error state ─────────────────────────────────────────────────────
    if (error) {
        return (
            <SafeAreaView style={s.root}>
                <View style={s.center}>
                    <Text style={s.errorText}>Could not load progress data</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.7}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Empty state (no sessions yet) ───────────────────────────────────
    const hasData = progress?.session_count > 0;
    if (!hasData) {
        return (
            <SafeAreaView style={s.root}>
                <View style={s.header}>
                    <Text style={s.title}>Progress</Text>
                </View>
                <View style={s.center}>
                    <View style={s.emptyDot} />
                    <Text style={s.emptyTitle}>No Progress Yet</Text>
                    <Text style={s.emptyText}>Complete your first session to see progress</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Stats data ──────────────────────────────────────────────────────
    const avgScore = progress?.avg_form_score ?? 0;
    const bestJump = progress?.best_jump_cm ?? 0;
    const sessions = progress?.session_count ?? 0;
    const bpiDelta = progress?.bpi_delta ?? 0;

    return (
        <SafeAreaView style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={s.header}>
                    <Text style={s.title}>Progress</Text>
                    <PeriodPills selected={days} onSelect={setDays} />
                </View>

                {/* Form Trend Chart */}
                <FormTrendChart
                    data={progress?.form_score_trend}
                    trendPct={progress?.form_trend_pct ?? 0}
                />

                {/* Stats 2x2 Grid */}
                <View style={s.statsGrid}>
                    <StatCard label="AVG SCORE" value={avgScore.toFixed(1)} unit="pts" color={C.cyan} />
                    <StatCard label="BEST JUMP" value={bestJump.toFixed(1)} unit="cm" color={C.orange} />
                    <StatCard label="SESSIONS" value={sessions} unit="total" color={C.green} />
                    <StatCard label="BPI DELTA" value={`${bpiDelta >= 0 ? '+' : ''}${bpiDelta}`} unit="pts" color={bpiDelta >= 0 ? C.green : C.red} />
                </View>

                {/* Weak Joints */}
                {weakJoints?.weak_joints?.length > 0 && (
                    <GlassCard>
                        <MicroLabel>WEAK POINTS</MicroLabel>
                        {weakJoints.weak_joints.slice(0, 3).map((j, i) => (
                            <WeakJointBar key={i} joint={j} />
                        ))}
                    </GlassCard>
                )}

                {/* Injury Risk */}
                <InjuryRiskCard data={injuryRisk} />

                {/* Coaching Note */}
                <CoachingNote summary={summary} />

                {/* Competition Readiness */}
                <ReadinessArc data={readiness} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 32 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingTop: 8,
    },
    title: { fontSize: 22, fontWeight: '900', color: C.text },

    // Pills
    pillRow: { flexDirection: 'row', gap: 8 },
    pill: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
        backgroundColor: C.surf,
    },
    pillActive: { backgroundColor: C.cyan },
    pillText: { fontSize: 12, fontWeight: '700', color: C.muted },
    pillTextActive: { color: C.bg, fontWeight: '800' },

    // Card (glass)
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 18, padding: 18, marginBottom: 16,
    },

    // Micro label
    micro: {
        fontSize: 9, fontWeight: '800', letterSpacing: 2, color: C.muted,
        textTransform: 'uppercase',
    },

    // Trend badge
    trendBadge: {
        alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12,
        paddingVertical: 5, marginTop: 10,
    },
    trendText: { fontSize: 11, fontWeight: '800', fontFamily: 'monospace' },

    // Stats grid
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
        marginBottom: 0,
    },
    statCard: {
        width: (CARD_W - 12) / 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 18, padding: 16, marginBottom: 12, alignItems: 'center',
    },
    statNum: {
        fontSize: 28, fontWeight: '900', fontFamily: 'monospace', marginTop: 6,
    },
    statUnit: { fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 },

    // Weak joints
    jointRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 14,
    },
    jointLeft: { width: 90 },
    jointName: { fontSize: 12, fontWeight: '700', color: C.text },
    jointDev: { fontSize: 11, fontWeight: '800', fontFamily: 'monospace', marginTop: 2 },
    jointBarBg: {
        height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', flex: 1, marginLeft: 12,
    },
    jointIdeal: {
        position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
        backgroundColor: C.green + '30',
    },
    jointDot: {
        position: 'absolute', top: -2, width: 12, height: 12, borderRadius: 6,
        borderWidth: 2, borderColor: C.bg,
    },

    // Injury risk
    riskDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    riskBand: { fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
    riskDeviation: {
        fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: C.muted,
        marginLeft: 'auto',
    },
    riskReason: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 8, lineHeight: 18 },
    riskSymmetry: {
        fontSize: 13, fontWeight: '800', fontFamily: 'monospace', color: C.text,
        marginLeft: 8,
    },

    // Coaching note
    sourcePill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
    sourceText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
    bulletDot: {
        width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.cyan,
        marginTop: 5, marginRight: 10,
    },
    bulletText: { fontSize: 13, fontWeight: '600', color: C.textSub, flex: 1, lineHeight: 19 },

    // Readiness components
    compRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 10,
    },
    compLabel: { width: 72, fontSize: 11, fontWeight: '700', color: C.muted },
    compBarBg: {
        flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)',
        marginHorizontal: 10, overflow: 'hidden',
    },
    compBarFill: { height: 6, borderRadius: 3 },
    compPct: { width: 28, fontSize: 12, fontWeight: '800', fontFamily: 'monospace', textAlign: 'right' },

    // Empty / error states
    emptyDot: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: C.surf,
        marginBottom: 16, borderWidth: 2, borderColor: C.cyan + '40',
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 13, fontWeight: '600', color: C.muted, textAlign: 'center' },
    errorText: { fontSize: 15, fontWeight: '700', color: C.red, marginBottom: 16, textAlign: 'center' },
    retryBtn: {
        backgroundColor: C.cyan, borderRadius: 99, paddingHorizontal: 28, paddingVertical: 10,
    },
    retryText: { fontSize: 14, fontWeight: '800', color: C.bg },
});
