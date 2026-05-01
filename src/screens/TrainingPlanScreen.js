// TrainingPlanScreen — Bloomberg terminal.
// Weekly plan as a terminal schedule. Each day is a panel with drill list.

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    StatusBar, ActivityIndicator, Alert, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { Fade, useAsyncTap } from '../ui';
import { C, T } from '../styles/colors';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, bandColor, nowISO,
} from '../components/terminal';

const TYPE_COLORS = {
    strength:  C.warn,
    power:     C.bad,
    speed:     C.amber,
    technique: C.info,
    recovery:  C.good,
    rest:      C.muted,
};

function weekdayAbbr(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
    } catch { return '---'; }
}

function mmddStr(dateStr) {
    try {
        const d = new Date(dateStr);
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    } catch { return '--/--'; }
}

export default function TrainingPlanScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';
    const userTag = athleteId.toUpperCase();
    const sportTag = (userData?.sport || 'general').toUpperCase().replace('_', '-');
    const clock = useLiveClock();

    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [completing, setCompleting] = useState(null);

    const fetchPlan = useCallback(async () => {
        const data = await api.getWeeklyPlan(athleteId);
        if (data) setPlan(data);
        setLoading(false);
    }, [athleteId]);

    useEffect(() => { fetchPlan(); }, [fetchPlan]);
    // Refresh on focus so completion marks made elsewhere (e.g., after a
    // session) are picked up without needing pull-to-refresh.
    useFocusEffect(useCallback(() => { fetchPlan(); }, [fetchPlan]));

    const [onRefresh] = useAsyncTap(async () => {
        setRefreshing(true);
        try { await fetchPlan(); } finally { setRefreshing(false); }
    }, { minInterval: 800 });

    const [handleRegenerate, regeneratePending] = useAsyncTap(async () => {
        return new Promise((resolve) => {
            Alert.alert(
                'REGENERATE PLAN',
                'Create a fresh plan based on latest telemetry. Completed days stay marked.',
                [
                    { text: 'CANCEL', style: 'cancel', onPress: () => resolve() },
                    {
                        text: 'REGENERATE',
                        onPress: async () => {
                            setLoading(true);
                            try {
                                const data = await api.regeneratePlan(athleteId);
                                if (data) setPlan(data);
                            } finally {
                                setLoading(false);
                                resolve();
                            }
                        },
                    },
                ],
            );
        });
    }, { minInterval: 1500 });

    const handleComplete = useCallback(async (dateStr) => {
        setCompleting(dateStr);
        const result = await api.completePlanDay(athleteId, dateStr);
        if (result) await fetchPlan();
        setCompleting(null);
    }, [athleteId, fetchPlan]);

    if (loading && !plan) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity={`${userTag}.${sportTag}.PLAN`} clock={clock} />
                <View style={s.center}>
                    <ActivityIndicator size="small" color={C.text} />
                    <Text style={s.loadingText}>FETCHING PLAN.....</Text>
                </View>
            </TerminalScreen>
        );
    }

    if (!plan) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity={`${userTag}.${sportTag}.PLAN`} clock={clock} />
                <View style={s.center}>
                    <Text style={[s.loadingText, { color: C.bad }]}>PLAN UNAVAILABLE</Text>
                    <Pressable onPress={fetchPlan} style={({ pressed }) => [s.retryBtn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.retryText}>[R] RETRY</Text>
                    </Pressable>
                </View>
            </TerminalScreen>
        );
    }

    const days = plan.days || [];
    const adherence = plan.adherence_pct || 0;
    const adherenceCol = adherence >= 80 ? C.good : adherence >= 50 ? C.warn : C.bad;

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar online={true} identity={`${userTag}.${sportTag}.PLAN`} clock={clock} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} colors={[C.text]} progressBackgroundColor={C.bg} />}
            >

                {/* Identity / header */}
                <Fade style={s.identity}>
                    <Text style={s.prompt}>{'> plan --week=current --sport='}{sportTag.toLowerCase()}</Text>
                    <View style={s.headerRow}>
                        <Text style={s.title}>WEEKLY PLAN</Text>
                        <Pressable
                            onPress={handleRegenerate}
                            disabled={regeneratePending}
                            style={({ pressed }) => [
                                s.actionBtn,
                                regeneratePending && { borderColor: C.muted, opacity: 0.6 },
                                pressed && !regeneratePending && { backgroundColor: '#111' },
                            ]}
                        >
                            <Text style={[s.actionText, regeneratePending && { color: C.muted }]}>
                                [{regeneratePending ? 'WORKING' : 'REGEN'}]
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={s.range}>
                        {plan.week_start} → {plan.week_end}
                    </Text>
                </Fade>

                {/* Summary + adherence */}
                <Fade delay={60}>
                    <Panel>
                        <Header title="PLAN SUMMARY" right={<HdrMeta color={adherenceCol}>ADH {adherence}%</HdrMeta>} />
                        {plan.summary && (
                            <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                                <Text style={s.summaryText}>{plan.summary}</Text>
                            </View>
                        )}
                        <Rule />
                        <Triad items={[
                            { label: 'DAYS',     value: fmtInt(days.length), color: C.text },
                            { label: 'DONE',     value: fmtInt(days.filter(d => d.completed).length), color: C.good },
                            { label: 'REMAINING',value: fmtInt(days.filter(d => !d.completed && d.type !== 'rest').length), color: C.warn },
                        ]} />
                    </Panel>
                </Fade>

                {/* Days */}
                {days.map((day, idx) => {
                    const col = TYPE_COLORS[day.type] || C.muted;
                    const dateStr = day.date;
                    const isToday = dateStr === new Date().toISOString().slice(0, 10);
                    const drills = day.drills || [];
                    const status = day.completed
                        ? { label: 'DONE', color: C.good }
                        : day.type === 'rest'
                            ? { label: 'REST', color: C.muted }
                            : isToday
                                ? { label: 'TODAY', color: C.text }
                                : { label: 'PENDING', color: C.textMid };

                    return (
                        <Fade key={idx} delay={100 + idx * 40}>
                            <Panel>
                                <Header
                                    title={`DAY ${idx + 1} · ${weekdayAbbr(dateStr)} ${mmddStr(dateStr)}`}
                                    right={<HdrMeta color={col}>[{(day.type || 'SESSION').toUpperCase()}]</HdrMeta>}
                                    accent={col}
                                />

                                <FieldRow
                                    label="STATUS........ DAY STATUS"
                                    value={`[${status.label}]`}
                                    color={status.color}
                                />
                                {day.volume_min != null && (
                                    <FieldRow label="VOL........... MINUTES" value={`${fmtInt(day.volume_min)} MIN`} color={C.text} />
                                )}
                                {day.intensity != null && (
                                    <FieldRow label="INT........... INTENSITY" value={`${fmtInt(day.intensity)}/10`} color={C.info} />
                                )}

                                {drills.length > 0 && (
                                    <>
                                        <Rule />
                                        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
                                            <HdrMeta>DRILLS</HdrMeta>
                                        </View>
                                        {drills.map((drill, di) => (
                                            <View key={di} style={s.drillRow}>
                                                <Text style={[s.drillIdx, { color: col }]}>▸</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={s.drillName}>{String(drill.name || '--').toUpperCase()}</Text>
                                                    <Text style={s.drillMeta}>
                                                        {drill.sets || '--'}
                                                        {drill.joint ? `  ·  ${String(drill.joint).toUpperCase()}` : ''}
                                                    </Text>
                                                    {drill.cue && <Text style={s.drillCue}>"{drill.cue}"</Text>}
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}

                                {!day.completed && day.type !== 'rest' && (
                                    <Pressable
                                        onPress={() => handleComplete(dateStr)}
                                        disabled={completing === dateStr}
                                        style={({ pressed }) => [
                                            s.doneBtn,
                                            pressed && { backgroundColor: '#111' },
                                            completing === dateStr && { opacity: 0.5 },
                                        ]}
                                    >
                                        <Text style={[s.doneBtnText, { color: col }]}>
                                            [{completing === dateStr ? 'MARKING...' : 'MARK COMPLETE'}]
                                        </Text>
                                    </Pressable>
                                )}
                            </Panel>
                        </Fade>
                    );
                })}

                <Footer lines={[
                    { text: `END OF PLAN · ${nowISO()}` },
                    { text: `WEEK ${plan.week_start} · ${days.length} DAYS · ADH ${adherence}%`, color: adherenceCol },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, letterSpacing: 2, marginTop: 14 },
    retryBtn:    { marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    retryText:   { color: C.text, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

    identity:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    prompt:    { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    title:     { fontSize: 22, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1 },
    range:     { fontSize: 11, color: C.textMid, fontFamily: T.MONO, marginTop: 4, letterSpacing: 1 },

    actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
    actionText:{ fontSize: 11, color: C.text, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1 },

    summaryText: { fontSize: 11, color: C.textSub, fontFamily: T.MONO, lineHeight: 16, letterSpacing: 0.3 },

    drillRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0A0A0A' },
    drillIdx:   { fontSize: 12, fontFamily: T.MONO, fontWeight: '700', marginRight: 10, marginTop: 2 },
    drillName:  { fontSize: 12, fontFamily: T.MONO, fontWeight: '700', color: '#E8E8E8', letterSpacing: 0.5 },
    drillMeta:  { fontSize: 10, fontFamily: T.MONO, fontWeight: '600', color: C.textMid, marginTop: 2, letterSpacing: 0.5 },
    drillCue:   { fontSize: 10, fontFamily: T.MONO, color: C.muted, marginTop: 2, fontStyle: 'italic' },

    doneBtn:    { margin: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    doneBtnText:{ fontSize: 12, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1.5 },
});
