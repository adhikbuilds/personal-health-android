// ScoreCardScreen — Bloomberg terminal.
// End-of-session telemetry report. Mono everywhere, distribution bars,
// share as a formatted report.

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    StatusBar, ActivityIndicator, Share, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useUser } from '../context/UserContext';
import { Fade } from '../ui';
import { Sparkline } from '../components/charts';
import { C, T } from '../styles/colors';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, DistBar,
    TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, nowISO,
} from '../components/terminal';

function timeAgo(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso).getTime();
        const diff = Math.max(0, Date.now() - d);
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'JUST NOW';
        if (m < 60) return `${m}M AGO`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}H AGO`;
        const days = Math.floor(h / 24);
        return `${days}D AGO`;
    } catch { return ''; }
}

function scoreColor(v) {
    if (v >= 75) return C.good;
    if (v >= 50) return C.warn;
    return C.bad;
}

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(m)}:${p(s)}`;
}

export default function ScoreCardScreen({ navigation, route }) {
    const ins = useSafeAreaInsets();
    const sessionId = route?.params?.sessionId;
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';
    const [card, setCard] = useState(null);
    const [reps, setReps] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clapped, setClapped] = useState(false);
    const [clapCount, setClapCount] = useState(0);
    const clock = useLiveClock();

    useEffect(() => {
        if (!sessionId) { setLoading(false); return; }
        let mounted = true;
        Promise.all([
            api.getScorecard(sessionId).catch(() => null),
            api.getRepCount(sessionId).catch(() => null),
            api.getAthleteInbox(athleteId, 5).catch(() => null),
        ]).then(([sc, rep, inb]) => {
            if (!mounted) return;
            setCard(sc);
            setReps(rep);
            setInbox(inb?.broadcasts || []);
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [sessionId, athleteId]);

    const handleClap = async () => {
        if (clapped || !sessionId) return;
        setClapped(true);
        try {
            const res = await api.sendClap(athleteId, sessionId);
            if (res && typeof res.count === 'number') setClapCount(res.count);
            else setClapCount((c) => c + 1);
        } catch {
            setClapped(false);
        }
    };

    const handleShare = async () => {
        if (!card) return;
        const sc = card.avg_form_score;
        const msg = [
            `[ACTIVEBHARAT · SESSION REPORT]`,
            ``,
            `SPORT.......... ${(card.sport || '').replace('_', ' ').toUpperCase()}`,
            `FORM.SCORE..... ${fmt(sc, 1)}`,
            `PEAK.JUMP...... ${fmt(card.peak_jump_height_cm || 0, 1)} CM`,
            `SYMMETRY....... ${fmt((card.avg_symmetry || 0) * 100, 1)}%`,
            `REPS........... ${fmtInt(card.rep_count || 0)}`,
            `XP.EARNED...... +${fmtInt(card.xp_earned || 0)}`,
            `DURATION....... ${formatDuration(card.duration_seconds || 0)}`,
            ``,
            `${nowISO()}`,
        ].join('\n');

        try {
            await Share.share({ message: msg, title: 'Session Report' });
        } catch (err) {
            Alert.alert('SHARE FAILED', err.message);
        }
    };

    if (loading) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity="SCORECARD" clock={clock} />
                <View style={s.center}>
                    <ActivityIndicator size="small" color={C.text} />
                    <Text style={s.loadingText}>COMPUTING REPORT.....</Text>
                </View>
            </TerminalScreen>
        );
    }

    if (!card) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity="SCORECARD" clock={clock} />
                <View style={s.center}>
                    <Text style={[s.loadingText, { color: C.bad }]}>REPORT NOT AVAILABLE</Text>
                    <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.backBtn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.backText}>[ESC] RETURN</Text>
                    </Pressable>
                </View>
            </TerminalScreen>
        );
    }

    const sc = card.avg_form_score || 0;
    const col = scoreColor(sc);
    const dist = card.quality_distribution || {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    const frames = card.frames || card.form_score_history || [];
    const sparkData = frames.map(f => f.form_score || f.score || 0).filter(x => x > 0).slice(-40);

    // Rep count: prefer scorecard's own value, fall back to dedicated endpoint.
    const repCount = card.rep_count != null
        ? card.rep_count
        : reps?.rep_count != null
            ? reps.rep_count
            : reps?.count != null ? reps.count : 0;
    const eliteReps = dist.elite || 0;
    const goodReps  = dist.good || 0;
    const qualityReps = eliteReps + goodReps;

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar
                online={true}
                identity={`SES.${String(sessionId || '').slice(0, 8).toUpperCase()}`}
                clock={clock}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                <Fade style={s.header}>
                    <Text style={s.prompt}>{'> report --session='}{String(sessionId || 'latest').slice(0, 8)}</Text>
                    <View style={s.headerRow}>
                        <Text style={s.title}>SESSION REPORT</Text>
                        <Pressable onPress={handleShare} style={({ pressed }) => [s.actionBtn, pressed && { backgroundColor: '#111' }]}>
                            <Text style={s.actionText}>[SHARE]</Text>
                        </Pressable>
                    </View>
                    <Text style={s.sport}>
                        {(card.sport || '').replace('_', ' ').toUpperCase()}
                        {card.ended_at && `  ·  ${String(card.ended_at).slice(0, 16).replace('T', ' ')}`}
                    </Text>
                </Fade>

                {/* Primary score */}
                <Fade delay={60}>
                    <Panel>
                        <Header title="FORM SCORE" right={<HdrMeta color={col}>[{sc >= 75 ? 'ELITE' : sc >= 50 ? 'GOOD' : 'WORK'}]</HdrMeta>} />
                        <View style={s.scoreBody}>
                            <Text style={[s.scoreBig, { color: col }]}>{String(Math.round(sc)).padStart(3, '0')}</Text>
                            <View style={s.scoreRight}>
                                <Text style={s.scoreMax}>/ 100.00</Text>
                                <Text style={[s.scoreCaption, { color: C.muted }]}>AVG · N={fmtInt(frames.length)}</Text>
                                {card.peak_form_score != null && (
                                    <Text style={[s.scoreCaption, { color: C.good }]}>PEAK {fmt(card.peak_form_score, 1)}</Text>
                                )}
                            </View>
                        </View>
                        {sparkData.length > 1 && (
                            <View style={s.sparkWrap}>
                                <Sparkline data={sparkData} width={330} height={48} color={col} stroke={1.5} />
                                <View style={s.sparkRange}>
                                    <Text style={s.sparkRangeText}>START</Text>
                                    <Text style={s.sparkRangeText}>END</Text>
                                </View>
                            </View>
                        )}
                    </Panel>
                </Fade>

                {/* Rep count — its own panel, prominent. */}
                <Fade delay={80}>
                    <Panel>
                        <Header title="REP COUNT" right={<HdrMeta color={C.info}>DETECTED</HdrMeta>} />
                        <View style={s.repBody}>
                            <Text style={[s.repBig, { color: C.info }]}>{String(repCount).padStart(3, '0')}</Text>
                            <View style={s.repRight}>
                                <Text style={[s.repCaption, { color: C.muted }]}>TOTAL · ON-DEVICE COUNT</Text>
                                {qualityReps > 0 && (
                                    <Text style={[s.repCaption, { color: C.good }]}>
                                        {qualityReps} ELITE/GOOD · {repCount > 0 ? Math.round((qualityReps / Math.max(1, total)) * 100) : 0}% QUALITY
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Rule />
                        <Pressable
                            onPress={handleClap}
                            style={({ pressed }) => [
                                s.clapBtn,
                                pressed && { backgroundColor: '#111' },
                                clapped && { borderColor: C.good },
                            ]}
                        >
                            <Text style={[s.clapText, { color: clapped ? C.good : C.text }]}>
                                {clapped ? `[CLAPPED] ${fmtInt(clapCount)}` : '[CLAP] · ONE-TAP REACTION'}
                            </Text>
                        </Pressable>
                    </Panel>
                </Fade>

                {/* Core stats */}
                <Fade delay={100}>
                    <Panel>
                        <Header title="TELEMETRY" />
                        <Triad items={[
                            { label: 'PK.JUMP.CM', value: fmt(card.peak_jump_height_cm || 0, 1), color: C.info },
                            { label: 'REPS',       value: fmtInt(repCount), color: C.white },
                            { label: 'XP',         value: '+' + fmtInt(card.xp_earned || 0), color: C.warn },
                        ]} />
                        <Rule />
                        <FieldRow label="DUR........... DURATION (MM:SS)" value={formatDuration(card.duration_seconds || 0)} color={C.text} />
                        <FieldRow label="SYM........... AVG LIMB SYMMETRY" value={fmt((card.avg_symmetry || 0) * 100, 1) + '%'} color={(card.avg_symmetry || 0) >= 0.95 ? C.good : C.warn} />
                        <FieldRow label="FRM........... TOTAL FRAMES" value={fmtInt(card.total_frames || frames.length)} color={C.text} />
                        {card.avg_knee_angle != null && (
                            <FieldRow label="KNE........... AVG KNEE ANGLE" value={fmt(card.avg_knee_angle, 1) + '°'} color={C.text} />
                        )}
                        {card.avg_hip_angle != null && (
                            <FieldRow label="HIP........... AVG HIP ANGLE" value={fmt(card.avg_hip_angle, 1) + '°'} color={C.text} />
                        )}
                        {card.avg_trunk_lean != null && (
                            <FieldRow label="TRK........... AVG TRUNK LEAN" value={fmt(card.avg_trunk_lean, 1) + '°'} color={C.text} />
                        )}
                    </Panel>
                </Fade>

                {/* Quality distribution */}
                {total > 0 && (
                    <Fade delay={140}>
                        <Panel>
                            <Header title="QUALITY DISTRIBUTION" right={<HdrMeta>N={fmtInt(total)} FRAMES</HdrMeta>} />
                            {Object.entries(dist).map(([q, n]) => {
                                const c = q === 'elite' ? C.good : q === 'good' ? C.info : q === 'average' ? C.warn : C.bad;
                                return <DistBar key={q} label={q} value={n} total={total} color={c} />;
                            })}
                        </Panel>
                    </Fade>
                )}

                {/* Coach broadcasts — anything addressed to this athlete shows here */}
                {inbox && inbox.length > 0 && (
                    <Fade delay={160}>
                        <Panel>
                            <Header
                                title="FROM YOUR COACH"
                                right={<HdrMeta color={C.warn}>{fmtInt(inbox.length)} MSG</HdrMeta>}
                            />
                            {inbox.slice(0, 3).map((b, i) => (
                                <View key={b.id || i} style={s.coachRow}>
                                    <Text style={[s.coachIdx, { color: C.warn }]}>
                                        [{String(i + 1).padStart(2, '0')}]
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.coachCue}>
                                            {String(b.message || b.voice_note_url || 'VOICE NOTE').toUpperCase().slice(0, 140)}
                                        </Text>
                                        <Text style={s.coachMeta}>
                                            FROM {String(b.coach_id || '--').toUpperCase()} · {timeAgo(b.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Panel>
                    </Fade>
                )}

                {/* Coaching */}
                {card.coaching_cues && card.coaching_cues.length > 0 && (
                    <Fade delay={180}>
                        <Panel>
                            <Header title="COACHING NOTES" />
                            {card.coaching_cues.slice(0, 6).map((cue, i) => (
                                <View key={i} style={s.coachRow}>
                                    <Text style={[s.coachIdx, { color: cue.severity === 'high' ? C.bad : cue.severity === 'medium' ? C.warn : C.info }]}>
                                        [{String(i + 1).padStart(2, '0')}]
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.coachCue}>{String(cue.cue || cue).toUpperCase()}</Text>
                                        {cue.joint && <Text style={s.coachMeta}>JOINT: {String(cue.joint).toUpperCase()}</Text>}
                                    </View>
                                </View>
                            ))}
                        </Panel>
                    </Fade>
                )}

                <Footer lines={[
                    { text: `END OF REPORT · ${nowISO()}` },
                    { text: `SESSION ${String(sessionId || '').slice(0, 8).toUpperCase()} · EXPORT READY` },
                ]} />

                {/* Return button */}
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => [s.returnBtn, pressed && { backgroundColor: '#111' }]}
                >
                    <Text style={s.returnText}>[ESC] RETURN TO PROFILE</Text>
                </Pressable>
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, letterSpacing: 2, marginTop: 14 },
    backBtn:     { marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    backText:    { color: C.text, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

    header:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    prompt:    { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    title:     { fontSize: 22, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1 },
    sport:     { fontSize: 11, color: C.textMid, fontFamily: T.MONO, marginTop: 6, letterSpacing: 1 },

    actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
    actionText:{ fontSize: 11, color: C.text, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1 },

    scoreBody:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    scoreBig:   { fontSize: 80, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -4, lineHeight: 74 },
    scoreRight: { marginLeft: 12, marginBottom: 4, flex: 1 },
    scoreMax:   { fontSize: 14, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    scoreCaption:{ fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    sparkWrap:      { paddingHorizontal: 12, paddingBottom: 12 },
    sparkRange:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    sparkRangeText: { fontSize: 9, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5 },

    coachRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0A0A0A' },
    coachIdx:   { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginRight: 10, letterSpacing: 0.5 },
    coachCue:   { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', color: '#E8E8E8', letterSpacing: 0.5, lineHeight: 16 },
    coachMeta:  { fontSize: 10, fontFamily: T.MONO, color: C.textMid, marginTop: 2, letterSpacing: 0.5 },

    returnBtn:  { margin: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    returnText: { color: C.text, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

    repBody:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    repBig:     { fontSize: 64, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -3, lineHeight: 60 },
    repRight:   { marginLeft: 14, marginBottom: 4, flex: 1 },
    repCaption: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    clapBtn:    { paddingVertical: 12, alignItems: 'center', borderTopWidth: 0 },
    clapText:   { fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});
