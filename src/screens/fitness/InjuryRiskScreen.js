// InjuryRiskScreen — Flow 13: Private Injury Risk Analysis
// This screen surfaces personal injury risk data to the athlete only.
// No share button, no export. Consent-gated coach loop-in only.
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import { api } from '../../services/api';

const C = {
    bg:      '#0a0e1a',
    surface: '#111827',
    cyan:    '#06b6d4',
    text:    '#f9fafb',
    muted:   '#9ca3af',
    warning: '#f59e0b',
    red:     '#ef4444',
    green:   '#10b981',
    border:  'rgba(255,255,255,0.08)',
};

// Maps the backend "watch" band to "medium" for display purposes.
// Backend emits: "low" | "watch" | "high" | "unknown"
function normalisedRisk(raw) {
    if (raw === 'watch') return 'medium';
    return raw || 'unknown';
}

function riskConfig(level) {
    switch (level) {
        case 'low':     return { bg: C.green,   label: 'Low Risk',   icon: 'shield-checkmark' };
        case 'medium':  return { bg: C.warning, label: 'Monitor',    icon: 'warning' };
        case 'high':    return { bg: C.red,     label: 'High Risk',  icon: 'alert-circle' };
        default:        return { bg: C.muted,   label: 'Unknown',    icon: 'help-circle' };
    }
}

// Deviation severity colouring: green <20°, amber 20–50°, red >50°
function deviationColor(deg) {
    if (deg < 20) return C.green;
    if (deg < 50) return C.warning;
    return C.red;
}

// Horizontal bar showing deviation as a percentage of a 90° scale (capped at 100%)
function DeviationBar({ degreeDev }) {
    const pct = Math.min((degreeDev / 90) * 100, 100);
    const color = deviationColor(degreeDev);
    return (
        <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
    );
}

function WeakJointRow({ joint }) {
    const color = deviationColor(joint.deviation_deg);
    const jointLabel = joint.joint.replace(/_/g, ' ');

    return (
        <View style={s.jointRow}>
            <View style={s.jointHeader}>
                <Text style={s.jointName}>{jointLabel}</Text>
                <Text style={[s.jointDev, { color }]}>{joint.deviation_deg.toFixed(1)}° off ideal</Text>
            </View>
            <DeviationBar degreeDev={joint.deviation_deg} />
            <Text style={s.jointSamples}>
                {joint.samples} sample{joint.samples !== 1 ? 's' : ''} recorded
            </Text>
        </View>
    );
}

function FlagRow({ flag }) {
    return (
        <View style={s.flagRow}>
            <Ionicons name="warning" size={15} color={C.warning} style={s.flagIcon} />
            <Text style={s.flagText}>{flag}</Text>
        </View>
    );
}

// Bottom sheet confirmation before looping in coach
function CoachConfirmSheet({ visible, riskLevel, reason, onConfirm, onCancel }) {
    const summary = `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk detected. ${reason}`;
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={s.sheetBackdrop}>
                <View style={s.sheet}>
                    <Text style={s.sheetTitle}>Loop in your coach?</Text>
                    <Text style={s.sheetSubtitle}>Your coach will receive a summary:</Text>
                    <View style={s.sheetSummaryBox}>
                        <Text style={s.sheetSummaryText}>{summary}</Text>
                        <Text style={s.sheetSummaryNote}>You can revoke this anytime.</Text>
                    </View>
                    <TouchableOpacity style={s.sheetConfirmBtn} onPress={onConfirm}>
                        <Text style={s.sheetConfirmText}>Send to coach</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.sheetCancelBtn} onPress={onCancel}>
                        <Text style={s.sheetCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function InjuryRiskScreen({ navigation }) {
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [riskData, setRiskData]           = useState(null);
    const [weakJoints, setWeakJoints]       = useState([]);
    const [sheetVisible, setSheetVisible]   = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const athleteId = await getOrCreateAnonymousAthleteId();
            const [risk, joints] = await Promise.all([
                api.getInjuryRisk(athleteId),
                api.getWeakJoints(athleteId),
            ]);
            if (!risk) throw new Error('Could not fetch injury risk data.');
            setRiskData(risk);
            setWeakJoints(joints?.weak_joints || []);
        } catch (err) {
            setError(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCoachConfirm = useCallback(async () => {
        setSheetVisible(false);
        try {
            const athleteId = await getOrCreateAnonymousAthleteId();
            // Generate an injury_warning notification server-side.
            // Full coach broadcast wiring is deferred — this MVP navigates to the inbox.
            await api.generateNotification(athleteId);
        } catch (_) {
            // Non-blocking: navigation still proceeds
        }
        navigation.navigate('Hub');
    }, [navigation]);

    if (loading) {
        return (
            <SafeAreaView style={[s.safe, s.center]}>
                <ActivityIndicator size="large" color={C.cyan} />
                <Text style={s.loadingText}>Analysing your sessions…</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[s.safe, s.center]}>
                <Ionicons name="cloud-offline-outline" size={48} color={C.muted} />
                <Text style={s.errorText}>{error}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={load}>
                    <Text style={s.retryText}>Try again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const level   = normalisedRisk(riskData?.risk);
    const cfg     = riskConfig(level);
    const reason  = riskData?.reason || '';
    const flags   = riskData?.flags  || [];

    return (
        <SafeAreaView style={s.safe}>
            {/* Header — no share button (data is private) */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Injury Risk</Text>
                {/* Spacer to balance chevron */}
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero: risk badge */}
                <View style={s.heroSection}>
                    <View style={[s.riskBadge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={28} color="#fff" style={s.riskIcon} />
                        <Text style={s.riskLabel}>{cfg.label}</Text>
                    </View>
                    {reason ? <Text style={s.riskReason}>{reason}</Text> : null}
                </View>

                {/* Weak joints */}
                {weakJoints.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionHeading}>WHAT TO WATCH</Text>
                        {weakJoints.map((j, i) => (
                            <WeakJointRow key={`${j.joint}-${i}`} joint={j} />
                        ))}
                    </View>
                )}

                {/* Injury flags */}
                {flags.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionHeading}>FLAGGED ISSUES</Text>
                        {flags.map((f, i) => <FlagRow key={i} flag={f} />)}
                    </View>
                )}

                {/* Coach loop-in — consent-gated, outline style (not filled) */}
                <View style={s.section}>
                    <TouchableOpacity
                        style={s.coachBtn}
                        onPress={() => setSheetVisible(true)}
                        accessibilityLabel="Loop in my coach"
                    >
                        <Ionicons name="person-add-outline" size={16} color={C.muted} style={s.coachBtnIcon} />
                        <Text style={s.coachBtnText}>Loop in my coach</Text>
                    </TouchableOpacity>
                </View>

                {/* Private notice */}
                <View style={s.privateNotice}>
                    <Ionicons name="lock-closed-outline" size={14} color={C.muted} style={s.lockIcon} />
                    <Text style={s.privateText}>
                        This analysis stays private. Only you can see it.
                    </Text>
                </View>
            </ScrollView>

            <CoachConfirmSheet
                visible={sheetVisible}
                riskLevel={level}
                reason={reason}
                onConfirm={handleCoachConfirm}
                onCancel={() => setSheetVisible(false)}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:         { flex: 1, backgroundColor: C.bg },
    center:       { alignItems: 'center', justifyContent: 'center' },
    scroll:       { flex: 1 },
    scrollContent:{ padding: 20, paddingBottom: 48 },

    // Header
    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical:   12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },

    // Hero
    heroSection: { alignItems: 'center', marginBottom: 32 },
    riskBadge: {
        flexDirection:  'row',
        alignItems:     'center',
        paddingHorizontal: 28,
        paddingVertical:   18,
        borderRadius:   20,
        marginBottom:   14,
    },
    riskIcon:  { marginRight: 10 },
    riskLabel: { fontSize: 22, fontWeight: '900', color: '#fff' },
    riskReason:{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, maxWidth: 300 },

    // Sections
    section:        { marginBottom: 24 },
    sectionHeading: {
        fontSize:      11,
        fontWeight:    '800',
        color:         C.muted,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom:  12,
    },

    // Weak joint rows
    jointRow: {
        backgroundColor: C.surface,
        borderRadius:    12,
        padding:         14,
        marginBottom:    10,
        borderWidth:     1,
        borderColor:     C.border,
    },
    jointHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    jointName:    { fontSize: 14, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
    jointDev:     { fontSize: 12, fontWeight: '700' },
    barTrack: {
        height:        6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius:  3,
        overflow:      'hidden',
        marginBottom:  6,
    },
    barFill:      { height: '100%', borderRadius: 3 },
    jointSamples: { fontSize: 11, color: C.muted },

    // Flag rows
    flagRow: {
        flexDirection:   'row',
        alignItems:      'flex-start',
        backgroundColor: C.surface,
        borderRadius:    12,
        padding:         12,
        marginBottom:    8,
        borderWidth:     1,
        borderColor:     C.border,
    },
    flagIcon: { marginRight: 10, marginTop: 1 },
    flagText: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },

    // Coach loop-in (outline, not filled)
    coachBtn: {
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        borderWidth:     1,
        borderColor:     'rgba(156,163,175,0.35)',
        borderRadius:    12,
        paddingVertical: 14,
    },
    coachBtnIcon: { marginRight: 8 },
    coachBtnText: { fontSize: 14, fontWeight: '700', color: C.muted },

    // Private notice
    privateNotice: {
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        marginTop:       8,
        paddingHorizontal: 16,
    },
    lockIcon:    { marginRight: 6 },
    privateText: {
        fontSize:    13,
        color:       C.muted,
        fontStyle:   'italic',
        textAlign:   'center',
        lineHeight:  18,
    },

    // Loading / error
    loadingText: { color: C.muted, marginTop: 14, fontSize: 14 },
    errorText:   { color: C.muted, marginTop: 14, fontSize: 14, textAlign: 'center', maxWidth: 260 },
    retryBtn: {
        marginTop:       20,
        borderWidth:     1,
        borderColor:     C.cyan,
        borderRadius:    10,
        paddingHorizontal: 24,
        paddingVertical:   10,
    },
    retryText: { color: C.cyan, fontWeight: '700', fontSize: 14 },

    // Coach confirmation sheet
    sheetBackdrop: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent:  'flex-end',
    },
    sheet: {
        backgroundColor: C.surface,
        borderTopLeftRadius:  20,
        borderTopRightRadius: 20,
        padding:         24,
        paddingBottom:   36,
    },
    sheetTitle:       { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 6 },
    sheetSubtitle:    { fontSize: 13, color: C.muted, marginBottom: 14 },
    sheetSummaryBox: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius:    10,
        padding:         14,
        marginBottom:    20,
        borderWidth:     1,
        borderColor:     C.border,
    },
    sheetSummaryText: { fontSize: 14, color: C.text, lineHeight: 20, marginBottom: 6 },
    sheetSummaryNote: { fontSize: 12, color: C.muted, fontStyle: 'italic' },
    sheetConfirmBtn: {
        backgroundColor: C.cyan,
        borderRadius:    12,
        paddingVertical: 14,
        alignItems:      'center',
        marginBottom:    10,
    },
    sheetConfirmText: { color: '#000', fontWeight: '800', fontSize: 15 },
    sheetCancelBtn: {
        borderRadius:    12,
        paddingVertical: 12,
        alignItems:      'center',
    },
    sheetCancelText: { color: C.muted, fontWeight: '700', fontSize: 14 },
});
