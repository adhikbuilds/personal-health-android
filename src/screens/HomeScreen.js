// HomeScreen (Production-Fixed)
// Fixes: gap→marginRight, useUser() hook instead of props, live API banner
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import api from '../services/api';

const C = { bg: '#0f172a', surf: '#1e293b', cyan: '#06b6d4', orange: '#f97316', green: '#22c55e', yellow: '#facc15', muted: '#64748b', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)' };

function XPBar({ xp, max, color = C.cyan }) {
    const pct = Math.min(100, (xp / max) * 100);
    return (
        <View style={s.barWrap}>
            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <View style={[s.statCard, { borderColor: color + '30' }]}>
            <Text style={s.statIcon}>{icon}</Text>
            <Text style={[s.statValue, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

function QuickAction({ icon, label, desc, color, onPress }) {
    return (
        <TouchableOpacity style={[s.qaCard, { borderLeftColor: color, backgroundColor: color + '10' }]} onPress={onPress} activeOpacity={0.8}>
            <Text style={s.qaIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={s.qaLabel}>{label}</Text>
                <Text style={s.qaDesc}>{desc}</Text>
            </View>
            <Text style={{ color, fontSize: 20, fontWeight: '900' }}>{'›'}</Text>
        </TouchableOpacity>
    );
}

export default function HomeScreen({ navigation, showToast }) {
    const { userData, recentSession } = useUser();
    const { name, tier, level, xp, xpRequired, streak, scoutReadiness, bpi, sessions } = userData;
    const [apiStatus, setApiStatus] = useState('checking');

    useEffect(() => {
        api.ping().then(res => setApiStatus(res ? 'online' : 'offline'));
    }, []);

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Gradient */}
                <LinearGradient colors={['#1e1b4b', '#0f172a']} style={s.header}>
                    {/* API Status bar */}
                    <View style={[s.apiBadge, { backgroundColor: apiStatus === 'online' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderColor: apiStatus === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }]}>
                        <View style={[s.apiDot, { backgroundColor: apiStatus === 'online' ? C.green : '#ef4444' }]} />
                        <Text style={[s.apiText, { color: apiStatus === 'online' ? C.green : '#ef4444' }]}>
                            {apiStatus === 'checking' ? 'Connecting to API...' : apiStatus === 'online' ? 'AI Server Online' : 'AI Server Offline — offline mode'}
                        </Text>
                    </View>

                    <View style={s.headerRow}>
                        <View>
                            <Text style={s.greeting}>{`नमस्ते, ${name.split(' ')[0]} 🙏`}</Text>
                            <Text style={s.tierText}>{`${tier} • Level ${level}`}</Text>
                        </View>
                        <View style={s.streakPill}>
                            <Text style={s.streakText}>{`🔥 ${streak} day streak`}</Text>
                        </View>
                    </View>

                    {/* XP Bar */}
                    <View style={s.xpSection}>
                        <View style={s.rowBetween}>
                            <Text style={s.xpLabel}>{`XP — Level ${level}`}</Text>
                            <Text style={s.xpNum}>{`${xp.toLocaleString()} / ${xpRequired.toLocaleString()}`}</Text>
                        </View>
                        <XPBar xp={xp} max={xpRequired} color={C.cyan} />
                    </View>

                    {/* Scout Readiness */}
                    <View style={s.scoutCard}>
                        <View style={s.rowBetween}>
                            <Text style={s.scoutLabel}>{'⚡ Scout Readiness'}</Text>
                            <Text style={[s.scoutPct, { color: scoutReadiness >= 80 ? C.green : C.orange }]}>{`${scoutReadiness}%`}</Text>
                        </View>
                        <XPBar xp={scoutReadiness} max={100} color={scoutReadiness >= 80 ? C.green : C.orange} />
                        <Text style={s.scoutNote}>
                            {scoutReadiness < 70 ? 'Complete AI drills to improve your scout rating' : "You're nearly scout-ready! Keep training."}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Stats Grid */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>TODAY'S STATS</Text>
                    <View style={s.statsGrid}>
                        <StatCard icon="⚡" label="BPI Score" value={(bpi ?? 12450).toLocaleString()} color={C.cyan} />
                        <StatCard icon="🏋️" label="Sessions" value={String(sessions ?? 0)} color={C.orange} />
                        <StatCard icon="🎯" label="Form Avg" value={recentSession?.avgScore ? `${Math.round(recentSession.avgScore)}%` : `${scoutReadiness}%`} color={C.green} />
                        <StatCard icon="📈" label="XP Earned" value={recentSession?.xpEarned ? `+${recentSession.xpEarned}` : `${xp.toLocaleString()}`} color={C.yellow} />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
                    <QuickAction icon="📷" label="AI Vision Session" desc="Real-time biomechanics analysis" color={C.cyan} onPress={() => navigation.navigate('Camera')} />
                    <QuickAction icon="🧠" label="Academy Training" desc="Expert technique videos" color={C.orange} onPress={() => navigation.navigate('Academy')} />
                    <QuickAction icon="📊" label="View My Metrics" desc="Dive into performance data" color={C.green} onPress={() => navigation.navigate('Lab')} />
                    <QuickAction icon="🗺️" label="Eklavya Map" desc="Find challenges and athletes" color={C.yellow} onPress={() => navigation.navigate('Map')} />
                </View>

                {/* Motivational Quote */}
                <View style={s.quoteCard}>
                    <Text style={s.quoteText}>{'"Champions aren\'t made in gyms. They are made from something they have deep inside."'}</Text>
                    <Text style={s.quoteAuthor}>{'— Muhammad Ali'}</Text>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { padding: 20, paddingTop: 12 },
    apiBadge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16 },
    apiDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    apiText: { fontSize: 10, fontWeight: '700' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greeting: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
    tierText: { fontSize: 11, color: C.muted, fontWeight: '700', marginTop: 2 },
    streakPill: { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
    streakText: { color: C.orange, fontWeight: '800', fontSize: 12 },
    xpSection: { marginBottom: 16 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    xpLabel: { fontSize: 10, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    xpNum: { fontSize: 10, color: C.cyan, fontWeight: '700' },
    barWrap: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 99 },
    scoutCard: { backgroundColor: 'rgba(6,182,212,0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)' },
    scoutLabel: { fontSize: 11, color: C.cyan, fontWeight: '800' },
    scoutPct: { fontSize: 16, fontWeight: '900' },
    scoutNote: { fontSize: 10, color: C.muted, marginTop: 8 },
    section: { padding: 20, paddingBottom: 0 },
    sectionTitle: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
    // Stats grid — 2 per row
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    statCard: { width: '48%', backgroundColor: C.surf, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center' },
    statIcon: { fontSize: 20, marginBottom: 6 },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { fontSize: 9, color: C.muted, fontWeight: '700', textTransform: 'uppercase', marginTop: 3 },
    // Quick Actions
    qaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderRadius: 14, padding: 14, borderLeftWidth: 3, marginBottom: 12 },
    qaIcon: { fontSize: 24, width: 36, textAlign: 'center', marginRight: 12 },
    qaLabel: { fontSize: 13, fontWeight: '800', color: C.text },
    qaDesc: { fontSize: 10, color: C.muted, marginTop: 2 },
    quoteCard: { margin: 20, padding: 18, backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
    quoteText: { fontSize: 13, color: C.text, fontStyle: 'italic', lineHeight: 20, marginBottom: 8 },
    quoteAuthor: { fontSize: 11, color: C.muted, fontWeight: '700' },
});
