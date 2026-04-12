// ProfileScreen — Athlete identity, session history, system status
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C, LEVEL_COLORS, LEVEL_LABELS } from '../styles/colors';
import { SPORT_LABELS } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const PAD = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name) {
    return (name || 'AB')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function scoreColor(v) {
    if (v >= 75) return C.green;
    if (v >= 50) return C.orange;
    return C.red;
}

function fmtDate(d) {
    if (!d) return '--';
    const dt = new Date(d);
    const day = dt.getDate();
    const mon = dt.toLocaleString('en', { month: 'short' });
    return `${day} ${mon}`;
}

// ─── Micro-label ─────────────────────────────────────────────────────────────

function MicroLabel({ children, style }) {
    return <Text style={[s.micro, style]}>{children}</Text>;
}

// ─── Glassmorphic card ───────────────────────────────────────────────────────

function GlassCard({ children, style }) {
    return <View style={[s.card, style]}>{children}</View>;
}

// ─── Athlete Card ────────────────────────────────────────────────────────────

function AthleteCard({ userData }) {
    const sportLabel = SPORT_LABELS[userData?.sport] || SPORT_LABELS['vertical_jump'] || 'Athlete';

    return (
        <GlassCard style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Initials avatar */}
            <View style={s.avatar}>
                <Text style={s.avatarText}>{initials(userData?.name)}</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={s.athleteName}>{userData?.name || 'Athlete'}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {/* Sport pill */}
                    <View style={s.sportPill}>
                        <Text style={s.sportPillText}>{sportLabel}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                    {/* Tier */}
                    <Text style={s.tierText}>{userData?.tier || 'District'}</Text>
                    {/* Dot separator */}
                    <View style={s.dotSep} />
                    {/* BPI */}
                    <Text style={s.bpiText}>
                        BPI <Text style={s.bpiNum}>{(userData?.bpi ?? 0).toLocaleString()}</Text>
                    </Text>
                </View>
            </View>
        </GlassCard>
    );
}

// ─── Stats Strip ─────────────────────────────────────────────────────────────

function StatsStrip({ userData }) {
    const stats = [
        { label: 'SESSIONS', value: userData?.sessions ?? 0 },
        { label: 'STREAK', value: `${userData?.streak ?? 0}d` },
        { label: 'BPI', value: (userData?.bpi ?? 0).toLocaleString() },
    ];

    return (
        <View style={s.stripRow}>
            {stats.map((st, i) => (
                <View key={i} style={[s.stripItem, i < stats.length - 1 && s.stripBorder]}>
                    <MicroLabel>{st.label}</MicroLabel>
                    <Text style={s.stripNum}>{st.value}</Text>
                </View>
            ))}
        </View>
    );
}

// ─── Fitness Level ───────────────────────────────────────────────────────────

function FitnessLevel({ fitnessScore, onRetake }) {
    const hasTested = fitnessScore?.level > 0;

    if (!hasTested) {
        return (
            <GlassCard>
                <MicroLabel>FITNESS LEVEL</MicroLabel>
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <View style={s.emptyDot} />
                    <Text style={s.emptyTitle}>No Fitness Test</Text>
                    <Text style={s.emptySubtext}>Take your first fitness test</Text>
                    <TouchableOpacity style={s.actionBtn} onPress={onRetake} activeOpacity={0.7}>
                        <Text style={s.actionBtnText}>Take Test</Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>
        );
    }

    const lvl = fitnessScore.level;
    const color = fitnessScore.color || LEVEL_COLORS[lvl] || C.cyan;
    const label = fitnessScore.label || LEVEL_LABELS[lvl] || '';
    const score = fitnessScore.score;

    return (
        <GlassCard>
            <MicroLabel>FITNESS LEVEL</MicroLabel>

            {/* Level band */}
            <View style={s.levelBandRow}>
                {[1, 2, 3, 4, 5, 6, 7].map(l => (
                    <View
                        key={l}
                        style={[
                            s.levelSegment,
                            {
                                backgroundColor: l <= lvl ? (LEVEL_COLORS[l] || C.muted) : 'rgba(255,255,255,0.06)',
                            },
                            l === 1 && { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
                            l === 7 && { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
                        ]}
                    />
                ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={[s.levelNum, { color }]}>{score}</Text>
                <View style={{ marginLeft: 12 }}>
                    <Text style={[s.levelLabel, { color }]}>L{lvl} - {label}</Text>
                    {fitnessScore.lastTested && (
                        <Text style={s.levelDate}>Tested {fmtDate(fitnessScore.lastTested)}</Text>
                    )}
                </View>
                <TouchableOpacity style={s.retakeBtn} onPress={onRetake} activeOpacity={0.7}>
                    <Text style={s.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
            </View>
        </GlassCard>
    );
}

// ─── Session Row ─────────────────────────────────────────────────────────────

function SessionRow({ session, onPress }) {
    const formScore = session.avg_form_score ?? session.form_score ?? 0;
    const sport = SPORT_LABELS[session.sport] || session.sport || 'Session';
    const xp = session.xp_earned ?? session.xp ?? 0;
    const color = scoreColor(formScore);
    const date = fmtDate(session.ended_at || session.started_at || session.date);

    return (
        <TouchableOpacity style={s.sessionRow} onPress={onPress} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
                <Text style={s.sessionSport}>{sport}</Text>
                <Text style={s.sessionDate}>{date}</Text>
            </View>
            <Text style={[s.sessionScore, { color }]}>{formScore.toFixed(0)}</Text>
            <Text style={s.sessionXp}>+{xp} XP</Text>
        </TouchableOpacity>
    );
}

// ─── Settings Section ────────────────────────────────────────────────────────

function SettingsSection({ isOnline, dataMode }) {
    const modeColors = { mock: C.orange, hybrid: C.yellow, real: C.green };
    const modeColor = modeColors[dataMode] || C.muted;

    return (
        <GlassCard>
            <MicroLabel>SYSTEM</MicroLabel>

            {/* Backend status */}
            <View style={s.settingRow}>
                <Text style={s.settingLabel}>Backend</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.statusDot, { backgroundColor: isOnline ? C.green : C.red }]} />
                    <Text style={[s.settingValue, { color: isOnline ? C.green : C.red }]}>
                        {isOnline ? 'Connected' : 'Offline'}
                    </Text>
                </View>
            </View>

            {/* Data mode */}
            <View style={s.settingRow}>
                <Text style={s.settingLabel}>Data Mode</Text>
                <View style={[s.modePill, { backgroundColor: modeColor + '18', borderColor: modeColor + '40' }]}>
                    <Text style={[s.modePillText, { color: modeColor }]}>{(dataMode || 'mock').toUpperCase()}</Text>
                </View>
            </View>

            {/* App version */}
            <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
                <Text style={s.settingLabel}>Version</Text>
                <Text style={s.settingValue}>2.0.0</Text>
            </View>
        </GlassCard>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
    const { userData, fitnessScore, dataMode } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';

    const [sessions, setSessions] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sess, ping] = await Promise.all([
                api.getSessions(athleteId, 10),
                api.ping(),
            ]);
            setSessions(sess?.sessions || sess || []);
            setIsOnline(!!ping);
        } catch (_) {
            setIsOnline(false);
        } finally {
            setLoading(false);
        }
    }, [athleteId]);

    useEffect(() => { load(); }, [load]);

    const handleRetake = useCallback(() => {
        navigation.navigate('FitnessTest');
    }, [navigation]);

    const handleSessionTap = useCallback((session) => {
        const sid = session.session_id || session.id;
        if (sid) navigation.navigate('ScoreCard', { sessionId: sid });
    }, [navigation]);

    const sessionList = Array.isArray(sessions) ? sessions.slice(0, 10) : [];

    return (
        <SafeAreaView style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Athlete Card */}
                <AthleteCard userData={userData} />

                {/* Stats Strip */}
                <StatsStrip userData={userData} />

                {/* Fitness Level */}
                <FitnessLevel fitnessScore={fitnessScore} onRetake={handleRetake} />

                {/* Session History */}
                <GlassCard>
                    <MicroLabel>RECENT SESSIONS</MicroLabel>
                    {loading ? (
                        <ActivityIndicator size="small" color={C.cyan} style={{ marginTop: 16 }} />
                    ) : sessionList.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <View style={s.emptyDot} />
                            <Text style={s.emptySubtext}>No sessions recorded yet</Text>
                        </View>
                    ) : (
                        sessionList.map((sess, i) => (
                            <SessionRow
                                key={sess.session_id || sess.id || i}
                                session={sess}
                                onPress={() => handleSessionTap(sess)}
                            />
                        ))
                    )}
                </GlassCard>

                {/* Settings */}
                <SettingsSection isOnline={isOnline} dataMode={dataMode} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 32 },

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

    // ─── Athlete Card ────────────────────────────────────────────────────
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: C.surf, borderWidth: 2, borderColor: C.cyan,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '900', color: C.cyan },
    athleteName: { fontSize: 18, fontWeight: '800', color: C.text },
    sportPill: {
        backgroundColor: C.cyan + '18', borderRadius: 99,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    sportPillText: { fontSize: 10, fontWeight: '800', color: C.cyan, letterSpacing: 1 },
    tierText: { fontSize: 12, fontWeight: '700', color: C.muted },
    dotSep: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.muted },
    bpiText: { fontSize: 12, fontWeight: '600', color: C.muted },
    bpiNum: { fontWeight: '900', fontFamily: 'monospace', color: C.text },

    // ─── Stats Strip ─────────────────────────────────────────────────────
    stripRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 18, marginBottom: 16, overflow: 'hidden',
    },
    stripItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    stripBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' },
    stripNum: {
        fontSize: 22, fontWeight: '900', fontFamily: 'monospace', color: C.text, marginTop: 6,
    },

    // ─── Fitness Level ───────────────────────────────────────────────────
    levelBandRow: {
        flexDirection: 'row', marginTop: 14, gap: 3, height: 8,
    },
    levelSegment: { flex: 1, height: 8 },
    levelNum: { fontSize: 32, fontWeight: '900', fontFamily: 'monospace' },
    levelLabel: { fontSize: 14, fontWeight: '800' },
    levelDate: { fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 },
    retakeBtn: {
        marginLeft: 'auto', backgroundColor: C.surf, borderRadius: 99,
        paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.border,
    },
    retakeBtnText: { fontSize: 12, fontWeight: '800', color: C.cyan },

    // ─── Session History ─────────────────────────────────────────────────
    sessionRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    sessionSport: { fontSize: 14, fontWeight: '700', color: C.text },
    sessionDate: { fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2 },
    sessionScore: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace', marginRight: 14 },
    sessionXp: { fontSize: 11, fontWeight: '800', color: C.green, fontFamily: 'monospace' },

    // ─── Settings ────────────────────────────────────────────────────────
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    settingLabel: { fontSize: 13, fontWeight: '700', color: C.textSub },
    settingValue: { fontSize: 13, fontWeight: '700', color: C.muted, fontFamily: 'monospace' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    modePill: {
        borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
        borderWidth: 1,
    },
    modePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // ─── Empty states ────────────────────────────────────────────────────
    emptyDot: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: C.surf,
        marginBottom: 10, borderWidth: 2, borderColor: C.cyan + '30',
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
    emptySubtext: { fontSize: 12, fontWeight: '600', color: C.muted, textAlign: 'center' },
    actionBtn: {
        backgroundColor: C.cyan, borderRadius: 99, paddingHorizontal: 24, paddingVertical: 10,
        marginTop: 14,
    },
    actionBtnText: { fontSize: 13, fontWeight: '800', color: C.bg },
});
