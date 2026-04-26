// ProgressScreen — Bloomberg terminal.
// Dense tables of athlete telemetry. No cards, no gradients, no emoji. Every
// row is label-left / mono-right. Charts are sparklines and mono bar tables.

import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    Dimensions, StatusBar, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUser } from '../context/UserContext';
import api from '../services/api';
import { Fade } from '../ui';
import { Sparkline, Heatmap, Bar as ChartBar, Radar, Gauge } from '../components/charts';
import { C, T } from '../styles/colors';
import { sportLabel } from '../config/sports';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, Ticker, DistBar,
    TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, signPct, signVal, trendColor, bandColor, nowISO,
} from '../components/terminal';

const { width: W } = Dimensions.get('window');

const PERIODS = [
    { label: '7D',  days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
];

function scoreColor(v) {
    if (v >= 75) return C.good;
    if (v >= 50) return C.warn;
    return C.bad;
}

export default function ProgressScreen() {
    const ins = useSafeAreaInsets();
    const { userData } = useUser();
    const athleteId = userData?.avatarId;
    const userTag = (userData?.avatarId || 'ATH').toUpperCase();
    const sportTag = (userData?.sport || 'general').toUpperCase().replace('_', '-');
    const clock = useLiveClock();

    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [online, setOnline] = useState(null);

    const [progress, setProgress] = useState(null);
    const [weakJoints, setWeakJoints] = useState(null);
    const [injuryRisk, setInjuryRisk] = useState(null);
    const [readiness, setReadiness] = useState(null);
    const [advanced, setAdvanced] = useState(null);
    const [loadRec, setLoadRec] = useState(null);

    const load = useCallback(async () => {
        if (!athleteId) { setLoading(false); return; }
        setLoading(true);
        try {
            const [prog, wj, ir, rd, adv, lr, ping] = await Promise.all([
                api.getProgress(athleteId, days),
                api.getWeakJoints(athleteId, days),
                api.getInjuryRisk(athleteId, Math.min(days, 14)),
                api.getReadiness(athleteId, Math.min(days, 14)),
                api.getAdvancedMetrics(athleteId, days),
                api.getLoadRecommendation(athleteId),
                api.ping(),
            ]);
            setProgress(prog);
            setWeakJoints(wj);
            setInjuryRisk(ir);
            setReadiness(rd);
            setAdvanced(adv);
            setLoadRec(lr);
            setOnline(!!ping);
        } finally {
            setLoading(false);
        }
    }, [athleteId, days]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    // Loading
    if (loading && !progress) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={online} identity={`${userTag}.${sportTag}`} clock={clock} />
                <View style={s.center}>
                    <ActivityIndicator size="small" color={C.text} />
                    <Text style={s.loadingText}>LOADING TELEMETRY.....</Text>
                </View>
            </TerminalScreen>
        );
    }

    const tickerItems = [
        { label: 'FITSCR',  value: String(progress?.avg_form_score || 0).padStart(3, '0'), delta: progress?.form_trend_pct || 0 },
        { label: 'RDY',     value: String(Math.round(readiness?.score || 0)).padStart(3, '0'), color: bandColor(readiness?.band) },
        { label: 'RISK',    value: (injuryRisk?.band || '--').toUpperCase(), color: bandColor(injuryRisk?.band) },
        { label: 'REPS',    value: fmtInt(progress?.total_reps || 0) },
        { label: 'JUMP',    value: fmt(progress?.best_jump_cm || 0, 1) + 'CM', color: C.info },
        { label: 'ACWR',    value: fmt(advanced?.acwr?.acwr || 0, 2), color: bandColor(advanced?.acwr?.band) },
    ];

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar online={online} identity={`${userTag}.${sportTag}.PROG`} clock={clock} />
            <Ticker items={tickerItems} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} colors={[C.text]} progressBackgroundColor={C.bg} />}
            >

                {/* Identity / range selector */}
                <Fade style={s.identity}>
                    <Text style={s.prompt}>{'> progress --athlete='}<Text style={{ color: C.text }}>{userTag}</Text></Text>
                    <View style={s.rangeRow}>
                        <Text style={s.rangeLabel}>RANGE:</Text>
                        {PERIODS.map(p => (
                            <Pressable key={p.label} onPress={() => setDays(p.days)} style={({ pressed }) => [s.rangeBtn, pressed && { backgroundColor: '#111' }]}>
                                <Text style={[s.rangeText, days === p.days && { color: C.text }]}>[{p.label}]</Text>
                            </Pressable>
                        ))}
                    </View>
                </Fade>

                {/* Form trend */}
                {progress && (
                    <Fade delay={60}>
                        <Panel>
                            <Header title={`FORM SCORE · ${days}D`} right={
                                <HdrMeta color={trendColor(progress.form_trend_pct || 0)}>
                                    {signPct(progress.form_trend_pct || 0)}
                                </HdrMeta>
                            } />
                            <View style={s.scoreBody}>
                                <Text style={s.scoreBig}>{String(Math.round(progress.avg_form_score || 0)).padStart(3, '0')}</Text>
                                <View style={s.scoreRight}>
                                    <Text style={s.scoreMax}>/ 100.00</Text>
                                    <Text style={[s.scoreCaption, { color: scoreColor(progress.avg_form_score || 0) }]}>AVG</Text>
                                    <Text style={[s.scoreCaption, { color: C.muted }]}>N={progress.session_count || 0} SESS</Text>
                                </View>
                            </View>
                            {progress.form_score_trend?.length > 1 && (
                                <View style={s.sparkWrap}>
                                    <Sparkline
                                        data={progress.form_score_trend.map(t => t.score)}
                                        width={W - 32} height={48}
                                        color={scoreColor(progress.avg_form_score || 0)}
                                        stroke={1.5}
                                    />
                                    <View style={s.sparkRange}>
                                        <Text style={s.sparkRangeText}>T-{days}D</Text>
                                        <Text style={s.sparkRangeText}>NOW</Text>
                                    </View>
                                </View>
                            )}
                        </Panel>
                    </Fade>
                )}

                {/* Training volume */}
                {progress && (
                    <Fade delay={100}>
                        <Panel>
                            <Header title={`VOLUME AGG · ${days}D`} />
                            <Triad items={[
                                { label: 'SES.CNT',   value: fmtInt(progress.session_count || 0), color: '#E8E8E8' },
                                { label: 'TOT.REPS',  value: fmtInt(progress.total_reps || 0),    color: C.text },
                                { label: 'BPI.DELTA', value: signVal(progress.bpi_delta || 0, 0), color: trendColor(progress.bpi_delta || 0) },
                            ]} />
                            <Rule />
                            <FieldRow label="AVG.FORM.............. MEAN FORM SCORE" value={fmt(progress.avg_form_score, 1)} color={C.text} />
                            <FieldRow label="PK.JUMP.CM............ PEAK JUMP HEIGHT" value={fmt(progress.best_jump_cm, 1)} color={C.info} />
                            <FieldRow label="TREND.................. %/PRIOR-PERIOD" value={signPct(progress.form_trend_pct || 0)} color={trendColor(progress.form_trend_pct || 0)} />
                            <FieldRow label="LAST.SES.............. EPOCH" value={progress.last_session_at ? String(progress.last_session_at).slice(0, 16).replace('T', ' ') : '--'} color={C.textSub} dim size="sm" />
                        </Panel>
                    </Fade>
                )}

                {/* Readiness */}
                {readiness && (
                    <Fade delay={140}>
                        <Panel>
                            <Header title="READINESS" right={<HdrMeta color={bandColor(readiness.band)}>[{(readiness.band || '--').toUpperCase()}]</HdrMeta>} />
                            <View style={s.readyBody}>
                                <Text style={[s.readyBig, { color: bandColor(readiness.band) }]}>
                                    {String(Math.round(readiness.score || 0)).padStart(3, '0')}
                                </Text>
                                <Text style={s.readyMax}>/ 100</Text>
                            </View>
                            <Rule />
                            {readiness.components && Object.entries(readiness.components).map(([key, comp]) => {
                                const labels = { form: 'FORM.TREND', symmetry: 'SYMMETRY', volume: 'VOLUME', hrv: 'RECOVERY' };
                                const value = typeof comp === 'number' ? comp : (comp?.value ?? 0);
                                const col = value >= 70 ? C.good : value >= 50 ? C.warn : C.bad;
                                return (
                                    <DistBar key={key} label={labels[key] || key.toUpperCase()} value={Math.round(value)} total={100} color={col} pct={value} />
                                );
                            })}
                        </Panel>
                    </Fade>
                )}

                {/* Weak joints table */}
                {weakJoints?.length > 0 && (
                    <Fade delay={180}>
                        <Panel>
                            <Header title="WEAK JOINTS · DEVIATION" />
                            {weakJoints.slice(0, 8).map((j, i) => (
                                <FieldRow
                                    key={i}
                                    label={`${String(j.joint || j.name || 'joint').toUpperCase().padEnd(16, '.')}  ${String(j.direction || '').toUpperCase().slice(0, 8)}`}
                                    value={signVal(j.deviation || j.delta || 0, 1) + '°'}
                                    color={Math.abs(j.deviation || j.delta || 0) > 15 ? C.bad : Math.abs(j.deviation || j.delta || 0) > 8 ? C.warn : C.good}
                                />
                            ))}
                        </Panel>
                    </Fade>
                )}

                {/* Injury risk */}
                {injuryRisk && (
                    <Fade delay={220}>
                        <Panel>
                            <Header title="INJURY RISK" right={<HdrMeta color={bandColor(injuryRisk.band)}>[{(injuryRisk.band || '--').toUpperCase()}]</HdrMeta>} />
                            <FieldRow label="RSK.......... RISK INDEX" value={fmt(injuryRisk.risk_score || 0, 2)} color={bandColor(injuryRisk.band)} size="lg" />
                            <FieldRow label="SYM.......... LIMB SYMMETRY" value={fmt(injuryRisk.limb_symmetry || 1, 3)} color={C.text} />
                            <FieldRow label="ASY.......... MAX ASYMMETRY" value={fmt(injuryRisk.max_asymmetry || 0, 1) + '°'} color={C.warn} />
                            {injuryRisk.reasons?.slice(0, 3).map((r, i) => (
                                <FieldRow key={i} label={`R${i + 1}.......... CONTRIBUTING SIGNAL`} value={String(r).toUpperCase().slice(0, 20)} color={C.textSub} dim size="sm" />
                            ))}
                        </Panel>
                    </Fade>
                )}

                {/* Advanced: ACWR gauge */}
                {advanced?.acwr && (
                    <Fade delay={260}>
                        <Panel>
                            <Header title="TRAINING LOAD · ACWR" right={<HdrMeta color={bandColor(advanced.acwr.band)}>[{(advanced.acwr.band || '--').toUpperCase()}]</HdrMeta>} />
                            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                                <Gauge
                                    value={Math.min(2.5, advanced.acwr.acwr || 0)} max={2.5}
                                    color={bandColor(advanced.acwr.band)} size={180}
                                    label="ACWR"
                                    zones={[
                                        { from: 0,   to: 0.8, color: C.info },
                                        { from: 0.8, to: 1.3, color: C.good },
                                        { from: 1.3, to: 1.5, color: C.warn },
                                        { from: 1.5, to: 2.5, color: C.bad },
                                    ]}
                                />
                            </View>
                            <Triad items={[
                                { label: 'MONOTONY', value: fmt(advanced.monotony?.monotony || 0, 2), color: C.text },
                                { label: 'STRAIN',   value: fmtInt(Math.round(advanced.monotony?.strain || 0)), color: C.text },
                                { label: 'MOMTM',    value: signVal(advanced.momentum || 0, 2), color: trendColor(advanced.momentum || 0) },
                            ]} />
                        </Panel>
                    </Fade>
                )}

                {/* Symmetry radar */}
                {advanced?.asymmetry && (
                    <Fade delay={300}>
                        <Panel>
                            <Header title="SYMMETRY RADAR" right={<HdrMeta color={bandColor(advanced.asymmetry.band)}>[{(advanced.asymmetry.band || '--').toUpperCase()}]</HdrMeta>} />
                            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                                <Radar
                                    axes={[
                                        { label: 'KNEE',  value: Math.max(0, 100 - (advanced.asymmetry.knee || 0) * 5) },
                                        { label: 'HIP',   value: Math.max(0, 100 - (advanced.asymmetry.hip || 0) * 5) },
                                        { label: 'SHLDR', value: Math.max(0, 100 - (advanced.asymmetry.shoulder || 0) * 5) },
                                        { label: 'FORM',  value: Math.min(100, advanced.aggregate?.avg_form_score || 0) },
                                        { label: 'MOMTM', value: Math.max(0, Math.min(100, 50 + (advanced.momentum || 0) * 2)) },
                                        { label: 'INTNS', value: Math.min(100, advanced.latest_intensity || 0) },
                                    ]}
                                    color={bandColor(advanced.asymmetry.band)}
                                    size={Math.min(240, W - 80)}
                                />
                            </View>
                            <Rule />
                            <FieldRow label="ASY.KNEE...... L/R KNEE ANGLE" value={fmt(advanced.asymmetry.knee, 1) + '%'} color={advanced.asymmetry.knee > 10 ? C.bad : C.good} />
                            <FieldRow label="ASY.HIP....... L/R HIP ANGLE"  value={fmt(advanced.asymmetry.hip, 1) + '%'}  color={advanced.asymmetry.hip > 10 ? C.bad : C.good} />
                            <FieldRow label="ASY.SHDR...... L/R SHOULDER"   value={fmt(advanced.asymmetry.shoulder, 1) + '%'} color={advanced.asymmetry.shoulder > 10 ? C.bad : C.good} />
                        </Panel>
                    </Fade>
                )}

                {/* Quality distribution */}
                {advanced?.aggregate?.quality_distribution && (
                    <Fade delay={340}>
                        <Panel>
                            <Header title={`FORM QUALITY · ${days}D`} />
                            {Object.entries(advanced.aggregate.quality_distribution).map(([q, n]) => {
                                const total = Object.values(advanced.aggregate.quality_distribution).reduce((a, b) => a + b, 0) || 1;
                                const col = q === 'elite' ? C.good : q === 'good' ? C.info : q === 'average' ? C.warn : C.bad;
                                return <DistBar key={q} label={q} value={n} total={total} color={col} />;
                            })}
                        </Panel>
                    </Fade>
                )}

                {/* Daily load bars */}
                {advanced?.load_series?.length > 0 && (
                    <Fade delay={380}>
                        <Panel>
                            <Header title={`DAILY LOAD · ${Math.min(14, advanced.load_series.length)}D`} />
                            <View style={{ alignItems: 'flex-start' }}>
                                <ChartBar
                                    data={advanced.load_series.slice(-14).map(t => ({
                                        label: t.date.slice(-2),
                                        value: t.load,
                                        color: C.text,
                                    }))}
                                    width={W - 32} height={120}
                                />
                            </View>
                        </Panel>
                    </Fade>
                )}

                {/* Heatmap */}
                {advanced?.load_series?.length > 0 && (
                    <Fade delay={420}>
                        <Panel>
                            <Header title="LOAD MATRIX · 28D" right={<HdrMeta>MAX {fmtInt(Math.max(...advanced.load_series.map(t => t.load), 0))}</HdrMeta>} />
                            <View style={{ alignItems: 'flex-start' }}>
                                <Heatmap
                                    cells={advanced.load_series.slice(-28).map(t => ({ date: t.date, value: t.load }))}
                                    cols={7} width={W - 32}
                                    colorLow="#0A0A0A" colorHigh={C.text}
                                />
                            </View>
                        </Panel>
                    </Fade>
                )}

                {/* Fatigue gauge */}
                {advanced?.fatigue && (
                    <Fade delay={460}>
                        <Panel>
                            <Header title="FATIGUE INDEX" right={<HdrMeta color={bandColor(advanced.fatigue.band)}>[{(advanced.fatigue.band || '--').toUpperCase()}]</HdrMeta>} />
                            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                                <Gauge
                                    value={Math.max(0, Math.min(20, (advanced.fatigue.index || 0) + 10))}
                                    max={20}
                                    color={bandColor(advanced.fatigue.band)} size={180} label="FATIGUE"
                                />
                            </View>
                        </Panel>
                    </Fade>
                )}

                {loadRec && (
                    <Fade delay={400}>
                        <Panel>
                            <Header title="LOAD RECOMMENDATION" right={<HdrMeta color={
                                loadRec.zone === 'optimal' ? C.good : loadRec.zone === 'overreaching' ? C.bad : C.warn
                            }>[{(loadRec.zone || '--').toUpperCase()}]</HdrMeta>} />
                            <FieldRow label="ACWR............" value={fmt(loadRec.acwr, 2)} color={
                                loadRec.acwr >= 0.8 && loadRec.acwr <= 1.3 ? C.good : C.warn
                            } />
                            <FieldRow label="ACUTE (7D)......" value={fmt(loadRec.acute_load_7d, 1)} color={C.text} />
                            <FieldRow label="CHRONIC (28D)...." value={fmt(loadRec.chronic_load_28d_avg, 1)} color={C.text} />
                            <FieldRow label="AVG FORM (7D)...." value={fmt(loadRec.avg_form_7d, 1)} color={scoreColor(loadRec.avg_form_7d || 0)} />
                            <Rule />
                            <View style={{ padding: 12 }}>
                                <Text style={{ fontFamily: T.MONO, fontSize: 11, color: C.textSub, lineHeight: 17, letterSpacing: 0.3 }}>
                                    {(loadRec.recommendation || '').toUpperCase()}
                                </Text>
                            </View>
                            {loadRec.form_guidance ? (
                                <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                                    <Text style={{ fontFamily: T.MONO, fontSize: 10, color: C.muted, lineHeight: 15 }}>
                                        {loadRec.form_guidance.toUpperCase()}
                                    </Text>
                                </View>
                            ) : null}
                        </Panel>
                    </Fade>
                )}

                <Footer lines={[
                    { text: `END OF REPORT · ${nowISO()}` },
                    { text: `RANGE ${days}D · ATHLETE ${userTag}` },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, letterSpacing: 2, marginTop: 14 },

    identity:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    prompt:    { fontSize: 12, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },

    rangeRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    rangeLabel:{ fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', marginRight: 10, letterSpacing: 1 },
    rangeBtn:  { paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, borderWidth: 1, borderColor: C.border },
    rangeText: { fontSize: 11, color: C.muted, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1 },

    scoreBody:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    scoreBig:   { fontSize: 72, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: -3, lineHeight: 66 },
    scoreRight: { marginLeft: 12, marginBottom: 4, flex: 1 },
    scoreMax:   { fontSize: 13, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    scoreCaption:{fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    sparkWrap:     { paddingHorizontal: 0, paddingBottom: 12 },
    sparkRange:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 12 },
    sparkRangeText:{ fontSize: 9, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5 },

    readyBody:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    readyBig:   { fontSize: 72, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -3, lineHeight: 66 },
    readyMax:   { fontSize: 14, color: C.muted, fontFamily: T.MONO, marginLeft: 10, marginBottom: 6, fontWeight: '600' },
});
