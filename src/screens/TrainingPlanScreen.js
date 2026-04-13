// TrainingPlanScreen — Dynamic 7-Day Plan
// Displays the athlete's personalized weekly plan from /plan/{id}/weekly.
// Each day card shows type, drills, rationale, and a completion button.
// The athlete can mark days done to track adherence.

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../styles/colors';
import { useUser } from '../context/UserContext';
import api from '../services/api';

const TYPE_COLORS = {
    strength:  C.orange,
    power:     C.red,
    speed:     C.yellow,
    technique: C.cyan,
    recovery:  C.green,
    rest:      C.muted,
};

const TYPE_EMOJI = {
    strength:  '💪',
    power:     '⚡',
    speed:     '🏃',
    technique: '🎯',
    recovery:  '🧘',
    rest:      '😴',
};

// ─── Day Card ────────────────────────────────────────────────────────────────
function DayCard({ day, isToday, onComplete }) {
    const color = TYPE_COLORS[day.type] || C.muted;
    const emoji = TYPE_EMOJI[day.type] || '•';

    return (
        <View style={[s.dayCard, isToday && { borderColor: C.cyan, borderWidth: 1.5 }, day.completed && s.dayDone]}>
            {/* Header */}
            <View style={s.dayHead}>
                <View style={s.dayHeadLeft}>
                    <Text style={s.dayEmoji}>{emoji}</Text>
                    <View>
                        <Text style={s.dayDayName}>{day.day_name}</Text>
                        <Text style={s.dayDate}>{day.date}</Text>
                    </View>
                </View>
                {isToday && <View style={s.todayBadge}><Text style={s.todayText}>TODAY</Text></View>}
                {day.completed && <View style={s.doneBadge}><Text style={s.doneText}>Done</Text></View>}
            </View>

            {/* Type + meta */}
            <Text style={[s.dayLabel, { color }]}>{day.label}</Text>
            {day.type !== 'rest' && (
                <Text style={s.dayMeta}>RPE {day.rpe} · {day.duration_min} min</Text>
            )}

            {/* Rationale */}
            <View style={s.rationale}>
                <Text style={s.rationaleText}>{day.rationale}</Text>
            </View>

            {/* Drills */}
            {day.drills && day.drills.length > 0 && (
                <View style={s.drillSection}>
                    {day.drills.map((drill, i) => (
                        <View key={i} style={s.drillRow}>
                            <Text style={[s.drillSets, { color }]}>{drill.sets}</Text>
                            <View style={s.drillInfo}>
                                <Text style={s.drillName}>{drill.name}</Text>
                                <Text style={s.drillCue}>{drill.cue}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Complete button */}
            {!day.completed && day.type !== 'rest' && (
                <TouchableOpacity
                    style={[s.completeBtn, { borderColor: color }]}
                    activeOpacity={0.7}
                    onPress={onComplete}
                >
                    <Text style={[s.completeBtnText, { color }]}>Mark Complete</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TrainingPlanScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';

    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [completing, setCompleting] = useState(null); // date being marked

    const today = new Date().toISOString().slice(0, 10);

    const fetchPlan = useCallback(async () => {
        const data = await api.getWeeklyPlan(athleteId);
        if (data) setPlan(data);
        setLoading(false);
    }, [athleteId]);

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPlan();
        setRefreshing(false);
    }, [fetchPlan]);

    const handleRegenerate = useCallback(async () => {
        Alert.alert(
            'Regenerate Plan',
            'This will create a fresh plan based on your latest data. Days already completed stay marked.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate',
                    onPress: async () => {
                        setLoading(true);
                        const data = await api.regeneratePlan(athleteId);
                        if (data) setPlan(data);
                        setLoading(false);
                    },
                },
            ],
        );
    }, [athleteId]);

    const handleComplete = useCallback(async (dateStr) => {
        setCompleting(dateStr);
        const result = await api.completePlanDay(athleteId, dateStr);
        if (result) {
            await fetchPlan(); // reload to get updated adherence
        }
        setCompleting(null);
    }, [athleteId, fetchPlan]);

    // ─── Render ──────────────────────────────────────────────────────────
    if (loading && !plan) {
        return (
            <View style={[s.container, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={C.cyan} style={{ marginTop: 100 }} />
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={[s.container, { paddingTop: insets.top }]}>
                <View style={s.emptyState}>
                    <Text style={s.emptyText}>Could not load training plan.</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={fetchPlan}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const ctx = plan.context || {};
    const days = plan.days || [];

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
            >
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={s.backText}>{'<'}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.title}>Training Plan</Text>
                        <Text style={s.subtitle}>
                            {plan.week_start} — {plan.week_end}
                        </Text>
                    </View>
                    <TouchableOpacity style={s.regenBtn} onPress={handleRegenerate}>
                        <Text style={s.regenText}>Regen</Text>
                    </TouchableOpacity>
                </View>

                {/* Summary card */}
                <View style={s.summaryCard}>
                    <Text style={s.summaryText}>{plan.summary}</Text>
                    <View style={s.summaryStats}>
                        <View style={s.statBlock}>
                            <Text style={s.statLabel}>Adherence</Text>
                            <Text style={s.statValue}>{plan.adherence_pct}%</Text>
                        </View>
                        <View style={s.statBlock}>
                            <Text style={s.statLabel}>Volume</Text>
                            <Text style={[s.statValue, ctx.volume_state === 'over' && { color: C.red }]}>
                                {ctx.volume_state || '—'}
                            </Text>
                        </View>
                        <View style={s.statBlock}>
                            <Text style={s.statLabel}>Risk</Text>
                            <Text style={[s.statValue,
                                ctx.injury_risk === 'high' && { color: C.red },
                                ctx.injury_risk === 'watch' && { color: C.yellow },
                            ]}>
                                {ctx.injury_risk || '—'}
                            </Text>
                        </View>
                        <View style={s.statBlock}>
                            <Text style={s.statLabel}>Source</Text>
                            <Text style={s.statValue}>{plan.source}</Text>
                        </View>
                    </View>
                </View>

                {/* Context chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                    {[
                        ['Form', ctx.form_bucket],
                        ['Weak', (ctx.weak_joint || '').replace('_', ' ') || 'none'],
                        ['Sessions (14d)', ctx.session_count],
                        ['Avg Score', ctx.avg_form_score && ctx.avg_form_score.toFixed(1)],
                    ].map(([k, v], i) => (
                        <View key={i} style={s.chip}>
                            <Text style={s.chipKey}>{k}</Text>
                            <Text style={s.chipVal}>{v ?? '—'}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Day cards */}
                {days.map((day) => (
                    <DayCard
                        key={day.date}
                        day={day}
                        isToday={day.date === today}
                        onComplete={() => handleComplete(day.date)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: 16, paddingBottom: 40 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surf, alignItems: 'center', justifyContent: 'center' },
    backText: { color: C.text, fontSize: 18, fontWeight: '600' },
    title: { color: C.text, fontSize: 20, fontWeight: '800' },
    subtitle: { color: C.muted, fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
    regenBtn: { backgroundColor: C.surf, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    regenText: { color: C.cyan, fontSize: 12, fontWeight: '700' },

    summaryCard: { backgroundColor: C.surf, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    summaryText: { color: C.text, fontSize: 14, lineHeight: 20, marginBottom: 14 },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-between' },
    statBlock: { alignItems: 'center' },
    statLabel: { color: C.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    statValue: { color: C.text, fontSize: 14, fontWeight: '700', fontFamily: 'monospace', textTransform: 'capitalize' },

    chipScroll: { marginBottom: 16 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.surf, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
        marginRight: 8, borderWidth: 1, borderColor: C.border,
    },
    chipKey: { color: C.muted, fontSize: 10, fontWeight: '500' },
    chipVal: { color: C.text, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    dayCard: {
        backgroundColor: C.surf, borderRadius: 14, padding: 16,
        marginBottom: 14, borderWidth: 1, borderColor: C.border,
    },
    dayDone: { opacity: 0.5 },
    dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    dayHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dayEmoji: { fontSize: 24 },
    dayDayName: { color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    dayDate: { color: C.muted, fontSize: 11, fontFamily: 'monospace' },
    todayBadge: { backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    todayText: { color: C.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    doneBadge: { backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
    doneText: { color: C.green, fontSize: 9, fontWeight: '800' },

    dayLabel: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    dayMeta: { color: C.muted, fontSize: 11, marginBottom: 10, fontFamily: 'monospace' },

    rationale: {
        backgroundColor: 'rgba(255,255,255,0.02)', borderLeftWidth: 2,
        borderLeftColor: C.cyan, borderRadius: 4, padding: 10, marginBottom: 12,
    },
    rationaleText: { color: C.text, fontSize: 12, lineHeight: 18 },

    drillSection: { marginBottom: 12 },
    drillRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border },
    drillSets: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', minWidth: 65 },
    drillInfo: { flex: 1 },
    drillName: { color: C.text, fontSize: 12, fontWeight: '600', marginBottom: 2 },
    drillCue: { color: C.muted, fontSize: 10 },

    completeBtn: {
        borderWidth: 1.5, borderRadius: 10, paddingVertical: 10,
        alignItems: 'center', marginTop: 4,
    },
    completeBtnText: { fontWeight: '700', fontSize: 13 },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: C.muted, fontSize: 14, marginBottom: 16 },
    retryBtn: { backgroundColor: C.cyan, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
