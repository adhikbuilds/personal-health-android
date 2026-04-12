// HuddleScreen — Group Training / Huddle Mode
// VISION.md GTM Step 1: Run huddles at academies with 10-20 athletes training together.
// Create/join a huddle, see live leaderboard, share results.

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, ActivityIndicator, TextInput, Alert,
    RefreshControl,
} from 'react-native';
import { C } from '../styles/colors';
import { useUser } from '../context/UserContext';
import api from '../services/api';

function LeaderboardRow({ entry, rank }) {
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    return (
        <View style={s.lbRow}>
            <Text style={s.lbRank}>{medal}</Text>
            <View style={{ flex: 1 }}>
                <Text style={s.lbName}>{entry.name || entry.athlete_id}</Text>
                <Text style={s.lbMeta}>{entry.total_frames || 0} frames</Text>
            </View>
            <Text style={s.lbScore}>{(entry.avg_form_score || entry.avg_score || 0).toFixed(1)}</Text>
        </View>
    );
}

export default function HuddleScreen({ navigation }) {
    const { userData } = useUser();
    const athleteId = userData?.avatarId || 'athlete_01';

    const [huddles, setHuddles] = useState([]);
    const [activeHuddle, setActiveHuddle] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const loadHuddles = useCallback(async () => {
        const data = await api.getHuddles();
        if (data) {
            const list = Array.isArray(data) ? data : data.huddles || [];
            setHuddles(list);
            // Check if athlete is in any active huddle
            const mine = list.find(h =>
                (h.status === 'active' || h.status === 'waiting') &&
                (h.athletes || []).includes(athleteId)
            );
            if (mine) {
                setActiveHuddle(mine);
                const live = await api.getHuddleLive(mine.huddle_id);
                if (live) setLiveData(live);
            }
        }
        setLoading(false);
    }, [athleteId]);

    useEffect(() => { loadHuddles(); }, [loadHuddles]);

    // Auto-refresh live data every 5s when in active huddle
    useEffect(() => {
        if (!activeHuddle || activeHuddle.status !== 'active') return;
        const timer = setInterval(async () => {
            const live = await api.getHuddleLive(activeHuddle.huddle_id);
            if (live) setLiveData(live);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeHuddle]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHuddles();
        setRefreshing(false);
    }, [loadHuddles]);

    const handleCreate = async () => {
        if (!newName.trim()) { Alert.alert('Enter a name'); return; }
        setCreating(true);
        const res = await api.createHuddle(newName.trim(), userData?.sport || 'vertical_jump');
        if (res) {
            setNewName('');
            await loadHuddles();
        }
        setCreating(false);
    };

    const handleJoin = async (huddleId) => {
        const res = await api.joinHuddle(huddleId, athleteId);
        if (res) await loadHuddles();
        else Alert.alert('Could not join huddle');
    };

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <ActivityIndicator size="large" color={C.cyan} style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    const athletes = liveData?.athletes || liveData?.leaderboard || [];

    return (
        <SafeAreaView style={s.container}>
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />}
            >
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={s.backText}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Huddle Mode</Text>
                </View>

                {/* Active Huddle — Live View */}
                {activeHuddle && activeHuddle.status === 'active' && (
                    <View style={s.liveCard}>
                        <Text style={s.liveTitle}>{activeHuddle.name}</Text>
                        <Text style={s.liveSub}>
                            {activeHuddle.sport?.replace('_', ' ')} · {(activeHuddle.athletes || []).length} athletes
                        </Text>
                        <Text style={s.sectionTitle}>Live Leaderboard</Text>
                        {athletes.map((entry, i) => (
                            <LeaderboardRow key={entry.athlete_id || i} entry={entry} rank={i + 1} />
                        ))}
                    </View>
                )}

                {/* Create Huddle */}
                <View style={s.createCard}>
                    <Text style={s.sectionTitle}>Start a Huddle</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Huddle name (e.g. Morning Sprint Group)"
                        placeholderTextColor={C.muted}
                        value={newName}
                        onChangeText={setNewName}
                    />
                    <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={creating}>
                        <Text style={s.createBtnText}>{creating ? 'Creating…' : 'Create Huddle'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Available Huddles */}
                <Text style={s.sectionTitle}>Available Huddles</Text>
                {huddles.filter(h => h.status === 'waiting').map(h => (
                    <View key={h.huddle_id} style={s.huddleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.huddleName}>{h.name}</Text>
                            <Text style={s.huddleMeta}>
                                {h.sport?.replace('_', ' ')} · {(h.athletes || []).length}/{h.max_athletes} athletes
                            </Text>
                        </View>
                        {!(h.athletes || []).includes(athleteId) ? (
                            <TouchableOpacity style={s.joinBtn} onPress={() => handleJoin(h.huddle_id)}>
                                <Text style={s.joinBtnText}>Join</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={s.joinedText}>Joined</Text>
                        )}
                    </View>
                ))}
                {huddles.filter(h => h.status === 'waiting').length === 0 && (
                    <Text style={s.emptyText}>No huddles waiting. Create one above.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: 16, paddingBottom: 40 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surf, alignItems: 'center', justifyContent: 'center' },
    backText: { color: C.text, fontSize: 18, fontWeight: '600' },
    title: { color: C.text, fontSize: 20, fontWeight: '800' },

    liveCard: { backgroundColor: C.surf, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.cyan },
    liveTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
    liveSub: { color: C.muted, fontSize: 11, marginBottom: 12, textTransform: 'capitalize' },

    lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
    lbRank: { width: 36, fontSize: 16, textAlign: 'center' },
    lbName: { color: C.text, fontSize: 13, fontWeight: '600' },
    lbMeta: { color: C.muted, fontSize: 10 },
    lbScore: { color: C.cyan, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },

    createCard: { backgroundColor: C.surf, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    input: {
        backgroundColor: C.bg, borderRadius: 10, padding: 12, color: C.text, fontSize: 13,
        borderWidth: 1, borderColor: C.border, marginBottom: 10,
    },
    createBtn: { backgroundColor: C.cyan, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    createBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

    sectionTitle: { color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

    huddleRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderRadius: 12,
        padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    huddleName: { color: C.text, fontSize: 14, fontWeight: '600' },
    huddleMeta: { color: C.muted, fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
    joinBtn: { backgroundColor: C.cyan, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    joinBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
    joinedText: { color: C.green, fontWeight: '600', fontSize: 12 },

    emptyText: { color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
});
