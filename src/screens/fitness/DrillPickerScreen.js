// DrillPickerScreen — Flow 2: Pick Today's Drill
// Shown to returning athletes before a session. Surfaces:
//   1. Coach-assigned drills for today (from /athlete/{id}/drill-assignments)
//   2. Weekly plan day (from /plan/{id}/weekly)
//   3. Free-choice sport picker
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';

const BG      = '#0a0e1a';
const SURFACE = '#111827';
const ACCENT  = '#06b6d4';
const TEXT    = '#f9fafb';
const MUTED   = '#9ca3af';
const SUCCESS = '#10b981';
const BORDER  = 'rgba(255,255,255,0.08)';

const SPORTS = [
    { key: 'sprint',        label: 'Sprint' },
    { key: 'vertical_jump', label: 'Vertical Jump' },
    { key: 'push_up',       label: 'Push-up' },
    { key: 'squat',         label: 'Squat' },
    { key: 'javelin',       label: 'Javelin' },
    { key: 'cricket_bat',   label: 'Cricket Bat' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Returns 0-indexed Monday-anchored slot (0=Mon … 6=Sun) for an ISO date
function dayIndexOf(isoDate) {
    const dow = new Date(isoDate).getDay(); // 0=Sun
    return dow === 0 ? 6 : dow - 1;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label }) {
    return <Text style={s.sectionHeader}>{label}</Text>;
}

function AssignmentCard({ assignment, onStart }) {
    return (
        <View style={s.assignCard}>
            <Text style={s.assignName}>{assignment.drill_name}</Text>
            {!!assignment.drill_description && (
                <Text style={s.assignDesc} numberOfLines={2}>
                    {assignment.drill_description}
                </Text>
            )}
            <View style={s.assignMeta}>
                {!!assignment.sport && (
                    <View style={s.sportChip}>
                        <Text style={s.sportChipText}>{assignment.sport.replace('_', ' ')}</Text>
                    </View>
                )}
                {!!assignment.scheduled_for && (
                    <Text style={s.assignDate}>{assignment.scheduled_for}</Text>
                )}
            </View>
            <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => onStart(assignment)}
                activeOpacity={0.85}
            >
                <Text style={s.primaryBtnText}>Start this drill</Text>
            </TouchableOpacity>
        </View>
    );
}

function WeekRow({ slots, today }) {
    return (
        <View style={s.weekRow}>
            {DAY_LABELS.map((label, i) => {
                const day       = slots[i];
                const isToday   = day?.date === today;
                const completed = !!day?.completed;
                const isPast    = day && day.date < today && !completed;

                let chipStyle = s.dayChip;
                let textStyle = s.dayChipText;

                if (completed) {
                    chipStyle = [s.dayChip, s.dayChipCompleted];
                    textStyle = [s.dayChipText, s.dayChipTextCompleted];
                } else if (isToday) {
                    chipStyle = [s.dayChip, s.dayChipToday];
                    textStyle = [s.dayChipText, s.dayChipTextToday];
                } else if (isPast) {
                    chipStyle = [s.dayChip, s.dayChipPast];
                }

                return (
                    <View key={label} style={chipStyle}>
                        <Text style={textStyle}>{label}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function PlanDayCard({ day, onStart }) {
    const volume = day.sets && day.reps
        ? `${day.sets} × ${day.reps}`
        : day.duration_min
            ? `${day.duration_min} min`
            : null;

    return (
        <View style={s.planCard}>
            <Text style={s.planDrillName}>{day.drill_name}</Text>
            <View style={s.planMeta}>
                {!!day.sport && (
                    <View style={s.sportChip}>
                        <Text style={s.sportChipText}>{day.sport.replace('_', ' ')}</Text>
                    </View>
                )}
                {!!volume && <Text style={s.planVolume}>{volume}</Text>}
            </View>
            {!!day.notes && <Text style={s.planNotes}>{day.notes}</Text>}
            <TouchableOpacity
                style={s.outlineBtn}
                onPress={() => onStart(day)}
                activeOpacity={0.85}
            >
                <Text style={s.outlineBtnText}>Start plan drill</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DrillPickerScreen({ navigation }) {
    const [athleteId,   setAthleteId]   = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [planWeek,    setPlanWeek]    = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(false);

    const today = todayISO();

    const load = useCallback(async (id) => {
        setLoading(true);
        setError(false);
        try {
            const [assignData, planData] = await Promise.all([
                api.getDrillAssignments(id),
                api.getWeeklyPlan(id),
            ]);
            // Only show assignments that are scheduled for today
            const todayOnly = (assignData?.assignments || []).filter(
                a => a.scheduled_for === today,
            );
            setAssignments(todayOnly);
            setPlanWeek(planData || null);
        } catch (_) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [today]);

    useEffect(() => {
        let alive = true;
        getOrCreateAnonymousAthleteId()
            .then(id => {
                if (!alive) return;
                setAthleteId(id);
                load(id);
            })
            .catch(() => {
                if (!alive) return;
                setError(true);
                setLoading(false);
            });
        return () => { alive = false; };
    }, [load]);

    const handleStartAssignment = useCallback((assignment) => {
        navigation.navigate('PlacementWizard', {
            sport:     assignment.sport || 'sprint',
            drillName: assignment.drill_name,
        });
    }, [navigation]);

    const handleStartPlanDrill = useCallback((day) => {
        navigation.navigate('PlacementWizard', { sport: day.sport || 'sprint' });
    }, [navigation]);

    const handleStartFreeSport = useCallback((sportKey) => {
        navigation.navigate('PlacementWizard', { sport: sportKey });
    }, [navigation]);

    // Today's plan day; fall back to the next incomplete day in the week
    const activePlanDay = (() => {
        const days = planWeek?.days;
        if (!days?.length) return null;
        const todayDay = days.find(d => d.date === today);
        if (todayDay && !todayDay.completed) return todayDay;
        return days.find(d => !d.completed && d.date >= today) || null;
    })();

    // 7-slot Mon–Sun array, padded with nulls for days not in the plan
    const weekSlots = (() => {
        const slots = Array(7).fill(null);
        planWeek?.days?.forEach(d => {
            const i = dayIndexOf(d.date);
            if (i >= 0 && i < 7) slots[i] = d;
        });
        return slots;
    })();

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Text style={s.errorText}>Could not load your drills.</Text>
                    <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => athleteId && load(athleteId)}
                        activeOpacity={0.85}
                    >
                        <Text style={s.primaryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>

            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color={TEXT} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Today's Training</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >

                {/* ── Assigned by coach ── */}
                {assignments.length > 0 && (
                    <View style={s.section}>
                        <SectionHeader label="ASSIGNED BY COACH" />
                        {assignments.map(a => (
                            <AssignmentCard
                                key={a.assignment_id}
                                assignment={a}
                                onStart={handleStartAssignment}
                            />
                        ))}
                    </View>
                )}

                {/* ── This week's plan ── */}
                <View style={s.section}>
                    <SectionHeader label="THIS WEEK'S PLAN" />
                    <WeekRow slots={weekSlots} today={today} />
                    {planWeek?.adherence_pct !== undefined && (
                        <Text style={s.adherenceText}>
                            {Math.round(planWeek.adherence_pct)}% of plan complete this week
                        </Text>
                    )}
                    {activePlanDay ? (
                        <PlanDayCard day={activePlanDay} onStart={handleStartPlanDrill} />
                    ) : (
                        <View style={s.planEmptyCard}>
                            <Text style={s.planEmptyText}>
                                {planWeek
                                    ? 'All plan days complete this week!'
                                    : 'No plan for this week yet.'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Free training ── */}
                <View style={s.section}>
                    <SectionHeader label="OR CHOOSE YOUR OWN" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.sportScrollContent}
                    >
                        {SPORTS.map(sport => (
                            <TouchableOpacity
                                key={sport.key}
                                style={s.sportPill}
                                onPress={() => handleStartFreeSport(sport.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={s.sportPillText}>{sport.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: BG },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT },

    section:       { paddingHorizontal: 16, paddingTop: 24 },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '800',
        color: MUTED,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },

    // Assignment card — 3px cyan left border
    assignCard: {
        backgroundColor: SURFACE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        borderLeftWidth: 3,
        borderLeftColor: ACCENT,
        padding: 16,
        marginBottom: 12,
    },
    assignName: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 4 },
    assignDesc: { fontSize: 13, color: MUTED, lineHeight: 18, marginBottom: 10 },
    assignMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    assignDate: { fontSize: 12, color: MUTED, fontWeight: '600' },

    sportChip: {
        backgroundColor: 'rgba(6,182,212,0.12)',
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.3)',
    },
    sportChipText: { fontSize: 11, fontWeight: '700', color: ACCENT, textTransform: 'capitalize' },

    primaryBtn: {
        backgroundColor: ACCENT,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#001018' },

    // Week chips
    weekRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    dayChip: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        backgroundColor: SURFACE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },
    dayChipCompleted: {
        backgroundColor: 'rgba(16,185,129,0.18)',
        borderColor: 'rgba(16,185,129,0.4)',
    },
    dayChipToday: { borderColor: ACCENT, borderWidth: 2 },
    dayChipPast:  { opacity: 0.45 },
    dayChipText:          { fontSize: 10, fontWeight: '700', color: MUTED },
    dayChipTextCompleted: { color: SUCCESS },
    dayChipTextToday:     { color: ACCENT },

    adherenceText: { fontSize: 12, color: MUTED, fontWeight: '600', marginBottom: 14 },

    // Plan day card
    planCard: {
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
        marginTop: 4,
    },
    planDrillName: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 8 },
    planMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    planVolume:    { fontSize: 13, color: MUTED, fontWeight: '700' },
    planNotes:     { fontSize: 13, color: MUTED, lineHeight: 18, marginBottom: 12 },

    outlineBtn: {
        borderRadius: 14,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: ACCENT,
        marginTop: 4,
    },
    outlineBtnText: { fontSize: 15, fontWeight: '800', color: ACCENT },

    planEmptyCard: {
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: 'center',
        marginTop: 4,
    },
    planEmptyText: { fontSize: 14, color: MUTED, fontWeight: '600', textAlign: 'center' },

    // Free sport pills (horizontal scroll)
    sportScrollContent: { paddingRight: 16, gap: 8 },
    sportPill: {
        backgroundColor: SURFACE,
        borderRadius: 99,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderWidth: 1,
        borderColor: BORDER,
    },
    sportPillText: { fontSize: 14, fontWeight: '700', color: TEXT },

    errorText: { fontSize: 15, color: MUTED, marginBottom: 20, textAlign: 'center' },
});
