// HomeScreen — Bloomberg Terminal.
// Dead black canvas, amber/white on black, monospace everything. Data density
// over decoration. Bracket headers, aligned numeric rows, timestamped footer.

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    Dimensions, StatusBar, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from '../context/UserContext';
import api from '../services/api';
import { DAILY_TRACKER_DEFAULTS } from '../data/constants';

import { Fade } from '../ui';
import { Sparkline, Heatmap } from '../components/charts';
import { C, T } from '../styles/colors';
import { sportLabel } from '../config/sports';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, Ticker, DistBar, Table,
    CmdRow, Footer, TerminalScreen, BlinkCursor, useLiveClock,
    fmt, fmtInt, signPct, signVal, trendColor, bandColor, nowISO,
} from '../components/terminal';

const { width: W } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData, fitnessScore } = useUser();
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [tracker, setTracker] = useState(DAILY_TRACKER_DEFAULTS);
    const [metrics, setMetrics] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const clock = useLiveClock();

    const TK = `@dt_${new Date().toISOString().slice(0, 10)}`;

    const _backendToTracker = (raw) => {
        const t = raw?.tracker || raw || {};
        const d = DAILY_TRACKER_DEFAULTS;
        return {
            steps:          { ...d.steps,          current: t.steps ?? 0 },
            activeMin:      { ...d.activeMin,      current: t.active_minutes ?? 0 },
            distanceKm:     { ...d.distanceKm,     current: t.distance_km ?? 0 },
            caloriesBurned: { ...d.caloriesBurned, current: t.calories_burned ?? 0 },
            calorieIntake:  { ...d.calorieIntake,   current: t.calorie_intake ?? 0 },
            water:          { ...d.water,           current: t.water_glasses ?? 0 },
            sleep:          { ...d.sleep,           current: t.sleep_hours ?? 0 },
        };
    };

    const _trackerToBackend = (tr) => ({
        steps: tr.steps?.current ?? 0,
        active_minutes: tr.activeMin?.current ?? 0,
        distance_km: tr.distanceKm?.current ?? 0,
        calories_burned: tr.caloriesBurned?.current ?? 0,
        calorie_intake: tr.calorieIntake?.current ?? 0,
        water_glasses: tr.water?.current ?? 0,
        sleep_hours: tr.sleep?.current ?? 0,
        date: new Date().toISOString().slice(0, 10),
    });

    const load = async () => {
        AsyncStorage.getItem(TK).then(r => { if (r) try { setTracker(JSON.parse(r)); } catch (_) {} });
        api.ping().then(ok => setOnline(!!ok));
        const aid = userData.avatarId;
        if (!aid) { setLoading(false); return; }
        try {
            const [dt, m, ws, ib] = await Promise.all([
                api.getDailyTracker(aid).catch(() => null),
                api.getAdvancedMetrics(aid, 60).catch(() => null),
                api.getWeeklySummary(aid, 7).catch(() => null),
                api.getAthleteInbox(aid, 5).catch(() => null),
            ]);
            if (dt?.tracker && Object.keys(dt.tracker).length > 0) setTracker(_backendToTracker(dt));
            if (m) setMetrics(m);
            if (ws?.athlete_id) setWeeklySummary(ws);
            if (ib?.broadcasts) setInbox(ib.broadcasts);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        AsyncStorage.setItem(TK, JSON.stringify(tracker)).catch(() => {});
        const aid = userData.avatarId;
        if (aid) api.updateDailyTracker(aid, _trackerToBackend(tracker)).catch(() => {});
    }, [tracker]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
        setTimeout(() => setRefreshing(false), 800);
    };

    const sc = fitnessScore?.score || 0;
    const first = (userData.name || 'Athlete').split(' ')[0].toUpperCase();
    const userTag = (userData.avatarId || 'ath').toUpperCase();
    const sportName = sportLabel(userData.sport || 'vertical_jump');
    const sportTag = (userData.sport || 'general').toUpperCase().replace('_', '-');

    const trendPct = metrics?.trend_pct ?? 0;
    const momentum = metrics?.momentum ?? 0;
    const acwr = metrics?.acwr?.acwr ?? 0;

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: T.MONO }}>LOADING...</Text>
            </View>
        );
    }

    const tickerItems = [
        { label: 'BPI',    value: fmtInt(userData.bpi || 0), delta: trendPct },
        { label: 'FITSCR', value: String(sc).padStart(3, '0'), delta: trendPct },
        { label: 'ACWR',   value: fmt(acwr, 2), color: bandColor(metrics?.acwr?.band) },
        { label: 'MOMTM',  value: signVal(momentum, 2), color: trendColor(momentum) },
        { label: 'READY',  value: String(Math.round(metrics?.readiness?.score || 0)).padStart(3, '0'), color: bandColor(metrics?.readiness?.band) },
        { label: 'INTNS',  value: String(Math.round(metrics?.latest_intensity || 0)).padStart(3, '0'), color: C.info },
        { label: 'STRK',   value: fmtInt(userData.streak || 0) + 'D', color: C.good },
        { label: 'SESS',   value: fmtInt(userData.sessions || 0) },
    ];

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar online={online} identity={`${userTag}.${sportTag}`} clock={clock} />
            <Ticker items={tickerItems} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} colors={[C.text]} progressBackgroundColor={C.bg} />}
            >

                {/* Identity */}
                <Fade style={s.identity}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={s.prompt}>{'> '}</Text>
                        <Text style={s.name}>{first}</Text>
                        <BlinkCursor />
                    </View>
                    <Text style={s.ident}>
                        L{userData.level || 1} · {(userData.tier || 'Block').toUpperCase()} · {sportName.toUpperCase()}
                    </Text>
                    <Text style={s.code}>
                        SID: {userTag}.{sportTag}.{(userData.bpi || 0).toString(16).toUpperCase().padStart(4, '0')}
                    </Text>
                </Fade>

                {/* New-user welcome — visible until they have a fitness test
                    AND at least one session. Once data flows in, this block
                    is replaced by the real metrics below. */}
                {(!fitnessScore?.score && (userData.sessions || 0) === 0) && (
                    <Fade delay={20}>
                        <Panel>
                            <Header title="WELCOME · NEW BIO-PASSPORT" right={<HdrMeta color={C.good}>SETUP</HdrMeta>} />
                            <FieldRow
                                label="STEP 1........ FITNESS BASELINE"
                                value="OPEN [F5]"
                                color={C.info}
                                onPress={() => navigation.navigate('FitnessTest')}
                            />
                            <FieldRow
                                label="STEP 2........ FIRST TRAINING SESSION"
                                value="OPEN [F1]"
                                color={C.text}
                                onPress={() => navigation.navigate('Tabs', { screen: 'Train', params: { sport: userData.sport || 'general' } })}
                            />
                            <FieldRow
                                label="STEP 3........ HEART RATE BASELINE"
                                value="OPEN [F2]"
                                color={C.bad}
                                onPress={() => navigation.navigate('HeartRate', { sessionId: 'rppg_' + Date.now() })}
                            />
                        </Panel>
                    </Fade>
                )}

                {/* Coach broadcast — surfaces as soon as athlete opens Home */}
                {inbox && inbox.length > 0 && (
                    <Fade delay={40}>
                        <Panel>
                            <Header title="FROM YOUR COACH" right={<HdrMeta color={C.warn}>{fmtInt(inbox.length)} MSG</HdrMeta>} />
                            {inbox.slice(0, 2).map((b, i) => {
                                const tA = (() => {
                                    if (!b.created_at) return '';
                                    try {
                                        const m = Math.floor(Math.max(0, Date.now() - new Date(b.created_at).getTime()) / 60000);
                                        if (m < 1) return 'JUST NOW';
                                        if (m < 60) return `${m}M AGO`;
                                        const h = Math.floor(m / 60);
                                        if (h < 24) return `${h}H AGO`;
                                        return `${Math.floor(h / 24)}D AGO`;
                                    } catch { return ''; }
                                })();
                                return (
                                    <FieldRow
                                        key={b.id || i}
                                        label={`MSG${String(i + 1).padStart(2, '0')}........ ${(b.coach_id || 'COACH').toUpperCase()}`}
                                        value={String(b.message || b.voice_note_url || 'VOICE NOTE').toUpperCase().slice(0, 40)}
                                        color={C.warn}
                                    />
                                );
                            })}
                        </Panel>
                    </Fade>
                )}

                {/* Fitscore */}
                <Fade delay={60}>
                    <Panel>
                        <Header title="FITSCORE" right={<HdrMeta color={trendColor(trendPct)}>{signPct(trendPct)} 14D</HdrMeta>} />
                        <View style={s.scoreBody}>
                            <Text style={s.scoreBig}>{String(sc).padStart(3, '0')}</Text>
                            <View style={s.scoreRight}>
                                <Text style={s.scoreMax}>/ 100.00</Text>
                                <Text style={[s.scoreBand, { color: fitnessScore?.color || C.text }]}>
                                    [{(fitnessScore?.label || 'NOT TESTED').toUpperCase()}]
                                </Text>
                                {metrics && (
                                    <Text style={[s.scoreTrend, { color: trendColor(momentum) }]}>
                                        MOMTM {signVal(momentum, 2)}
                                    </Text>
                                )}
                            </View>
                        </View>
                        {metrics?.form_trend_series?.length > 1 && (
                            <View style={s.sparkWrap}>
                                <Sparkline
                                    data={metrics.form_trend_series.map(t => t.score)}
                                    width={W - 32} height={48}
                                    color={trendColor(momentum) === C.textMid ? C.text : trendColor(momentum)}
                                    stroke={1.5}
                                />
                                <View style={s.sparkRange}>
                                    <Text style={s.sparkRangeText}>T-14D</Text>
                                    <Text style={s.sparkRangeText}>NOW</Text>
                                </View>
                            </View>
                        )}
                    </Panel>
                </Fade>

                {/* Core metrics */}
                <Fade delay={100}>
                    <Panel>
                        <Header title="CORE METRICS" right={<HdrMeta>N={metrics?.session_count ?? 0}</HdrMeta>} />
                        <FieldRow label="BPI.......... BIO-PASSPORT INDEX" value={fmtInt(userData.bpi || 0)} color={C.text} />
                        <FieldRow label="SES.......... COMPLETED SESSIONS" value={fmtInt(userData.sessions || 0)} color="#E8E8E8" />
                        <FieldRow label="STK.......... TRAINING STREAK" value={`${fmtInt(userData.streak || 0)} DAY`} color={C.good} />
                        {metrics ? (
                            <>
                                <FieldRow label="RDY.......... COMPETITION READINESS" value={fmt(metrics.readiness?.score, 1)} color={bandColor(metrics.readiness?.band)} />
                                <FieldRow label="     .BAND" value={`[${(metrics.readiness?.band || '--').toUpperCase()}]`} color={bandColor(metrics.readiness?.band)} dim size="sm" />
                                <FieldRow label="ACW.......... ACUTE:CHRONIC RATIO" value={fmt(acwr, 2)} color={bandColor(metrics.acwr?.band)} />
                                <FieldRow label="     .BAND" value={`[${(metrics.acwr?.band || '--').toUpperCase()}]`} color={bandColor(metrics.acwr?.band)} dim size="sm" />
                                <FieldRow label="MON.......... TRAINING MONOTONY" value={fmt(metrics.monotony?.monotony, 2)} color={C.text} />
                                <FieldRow label="STR.......... WEEKLY STRAIN" value={fmtInt(Math.round(metrics.monotony?.strain || 0))} color={C.text} />
                                <FieldRow label="INT.......... LAST SESSION INTENSITY" value={fmt(metrics.latest_intensity, 1)} color={C.info} />
                                <FieldRow label="FAT.......... FATIGUE INDEX" value={fmt(metrics.fatigue?.index, 2)} color={bandColor(metrics.fatigue?.band)} />
                            </>
                        ) : (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <Text style={{ color: '#475569', fontSize: 12, fontFamily: T.MONO }}>Complete a session to see metrics</Text>
                            </View>
                        )}
                    </Panel>
                </Fade>

                {/* Performance aggregate */}
                {metrics?.aggregate && (
                    <Fade delay={140}>
                        <Panel>
                            <Header title="PERF AGG · 60D" />
                            <Triad items={[
                                { label: 'AVG.FORM', value: fmt(metrics.aggregate.avg_form_score, 1), color: C.text },
                                { label: 'PEAK',     value: fmt(metrics.aggregate.peak_form_score, 1), color: C.good },
                                { label: 'TOT.REPS', value: fmtInt(metrics.aggregate.total_reps), color: '#E8E8E8' },
                            ]} />
                            <Rule />
                            <Triad items={[
                                { label: 'PK.JUMP.CM', value: fmt(metrics.aggregate.best_jump_cm, 1), color: C.info },
                                { label: 'TOT.XP',  value: fmtInt(metrics.aggregate.total_xp), color: C.warn },
                                { label: 'SES.CNT', value: fmtInt(metrics.aggregate.total_sessions), color: '#E8E8E8' },
                            ]} />
                            <Rule />
                            <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                                <HdrMeta>FORM QUALITY DISTRIBUTION</HdrMeta>
                            </View>
                            <View style={{ paddingBottom: 8 }}>
                                {Object.entries(metrics.aggregate.quality_distribution || {}).map(([q, n]) => {
                                    const total = Object.values(metrics.aggregate.quality_distribution || {}).reduce((a, b) => a + b, 0) || 1;
                                    const col = q === 'elite' ? C.good : q === 'good' ? C.info : q === 'average' ? C.warn : C.bad;
                                    return <DistBar key={q} label={q} value={n} total={total} color={col} />;
                                })}
                            </View>
                        </Panel>
                    </Fade>
                )}

                {/* Load matrix */}
                {metrics?.load_series?.length > 0 && (
                    <Fade delay={180}>
                        <Panel>
                            <Header title="LOAD MATRIX · 28D" right={<HdrMeta>MAX {fmtInt(Math.max(...metrics.load_series.map(t => t.load), 0))}</HdrMeta>} />
                            <View style={{ alignItems: 'flex-start', paddingHorizontal: 0 }}>
                                <Heatmap
                                    cells={metrics.load_series.slice(-28).map(t => ({ date: t.date, value: t.load }))}
                                    cols={7} width={W - 32}
                                    colorLow="#0A0A0A" colorHigh={C.text}
                                />
                            </View>
                            <View style={s.legendRow}>
                                <Text style={s.legendText}>M W T F S S M</Text>
                                <Text style={s.legendText}>28D → NOW</Text>
                            </View>
                        </Panel>
                    </Fade>
                )}

                {/* Daily tracker */}
                <Fade delay={220}>
                    <Panel>
                        <Header title="DAILY.TRACK" right={<HdrMeta>{new Date().toISOString().slice(0, 10)}</HdrMeta>} />
                        <Table
                            cols={[
                                { label: 'METRIC', flex: 3, align: 'left' },
                                { label: 'ACT',    flex: 2, align: 'right' },
                                { label: 'GOAL',   flex: 2, align: 'right' },
                                { label: 'PCT',    flex: 2, align: 'right' },
                            ]}
                            rows={Object.values(tracker).slice(0, 5).map(t => {
                                const pct = t.goal > 0 ? Math.min(1, t.current / t.goal) : 0;
                                const val = typeof t.current === 'number' && t.current % 1 ? t.current.toFixed(1) : t.current;
                                const col = pct >= 1 ? C.good : pct >= 0.5 ? C.text : C.warn;
                                return {
                                    cells: [
                                        { value: (t.label || '').toUpperCase().padEnd(12, '.') },
                                        { value: String(val), color: col },
                                        { value: String(t.goal), color: C.muted },
                                        { value: (pct * 100).toFixed(0).padStart(3, ' ') + '%', color: col },
                                    ],
                                };
                            })}
                        />
                    </Panel>
                </Fade>

                {/* Weekly summary */}
                {weeklySummary && (
                    <Fade delay={240}>
                        <Panel>
                            <Header title="WEEKLY RECAP" right={<HdrMeta>{weeklySummary.window_days || 7}D</HdrMeta>} />
                            <FieldRow label="SESSIONS......" value={fmtInt(weeklySummary.session_count || 0)} color={C.text} />
                            <FieldRow label="AVG FORM......" value={fmt(weeklySummary.avg_form_score || 0, 1)} color={trendColor(weeklySummary.form_trend_pct)} />
                            <FieldRow label="FORM TREND...." value={signPct(weeklySummary.form_trend_pct)} color={trendColor(weeklySummary.form_trend_pct)} />
                            <FieldRow label="STREAK........" value={`${fmtInt(weeklySummary.streak_days || 0)}D`} color={weeklySummary.streak_days >= 3 ? C.good : C.muted} />
                            <FieldRow label="INJURY RISK..." value={(weeklySummary.injury_risk?.risk || '--').toUpperCase()} color={
                                weeklySummary.injury_risk?.risk === 'low' ? C.good : weeklySummary.injury_risk?.risk === 'high' ? C.bad : C.warn
                            } />
                            {weeklySummary.coaching_note?.bullets?.[0] && (
                                <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                                    <Text style={{ fontFamily: T.MONO, fontSize: 10, color: C.textSub, lineHeight: 15 }}>
                                        {weeklySummary.coaching_note.bullets[0].toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </Panel>
                    </Fade>
                )}

                {/* Command menu */}
                <Fade delay={260}>
                    <Panel>
                        <Header title="CMD MENU" />
                        {[
                            { hotkey: 'F1', label: 'START.TRAIN', desc: 'live AI form scoring', color: C.text, target: 'Tabs', params: { screen: 'Train', params: { sport: userData.sport || 'general' } } },
                            { hotkey: 'F2', label: 'HEART.RATE', desc: 'finger rPPG · 2.5s warmup · HRV', color: C.bad, target: 'HeartRate', params: { sessionId: 'rppg_' + Date.now() } },
                            { hotkey: 'F3', label: 'PLAN.WEEK',  desc: 'personalised drills · adherence', color: C.good, target: 'TrainingPlan' },
                            { hotkey: 'F4', label: 'NUTR.AI',    desc: 'photo → macros via vision model', color: C.warn, target: 'Nutrition' },
                            { hotkey: 'F5', label: 'FIT.TEST',   desc: 'BMI · flex · 600m · L1-L7 band', color: C.info, target: 'FitnessTest' },
                        ].map((cmd, i) => (
                            <CmdRow key={i} {...cmd} onPress={() => navigation.navigate(cmd.target, cmd.params)} />
                        ))}
                    </Panel>
                </Fade>

                <Footer lines={[
                    { text: `END OF REPORT · ${nowISO()}` },
                    { text: `BUILD.2.4.0 · ENGINE.MEDIAPIPE · MODEL.V${(metrics?.aggregate?.total_sessions ?? 0) > 0 ? '1' : '0'}` },
                    { text: `SESSION P/L  ${signPct(trendPct)} · MOMENTUM ${signVal(momentum, 2)}`, color: trendColor(trendPct) },
                ]} />

            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    identity: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    prompt:   { fontSize: 14, color: C.text, fontFamily: T.MONO, fontWeight: '700' },
    name:     { fontSize: 28, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1 },
    ident:    { fontSize: 11, color: C.textMid, fontFamily: T.MONO, letterSpacing: 1, marginTop: 6 },
    code:     { fontSize: 10, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5, marginTop: 3 },

    scoreBody: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    scoreBig:  { fontSize: 80, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: -4, lineHeight: 74 },
    scoreRight:{ marginLeft: 12, marginBottom: 6, flex: 1 },
    scoreMax:  { fontSize: 14, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    scoreBand: { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
    scoreTrend:{ fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

    sparkWrap: { paddingHorizontal: 0, paddingBottom: 12 },
    sparkRange:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 12 },
    sparkRangeText: { fontSize: 9, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5 },

    legendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border },
    legendText: { fontSize: 9, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5 },
});
