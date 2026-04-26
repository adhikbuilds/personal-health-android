import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, FlatList,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { API_BASE } from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';

// ─── Voice helpers ────────────────────────────────────────────────────────────

async function uploadVoiceNote(uri) {
    try {
        const formData = new FormData();
        formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });
        const res = await fetch(`${API_BASE}/voice-note/upload`, { method: 'POST', body: formData });
        return res.ok ? (await res.json()).url : null;
    } catch {
        return null;
    }
}

function VoicePlayer({ url }) {
    const soundRef = useRef(null);
    const [playing, setPlaying] = useState(false);

    const toggle = async () => {
        if (!soundRef.current) {
            const { sound } = await Audio.Sound.createAsync({ uri: `${API_BASE}${url}` });
            soundRef.current = sound;
            sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) setPlaying(false); });
        }
        if (playing) {
            await soundRef.current.pauseAsync();
            setPlaying(false);
        } else {
            await soundRef.current.playAsync();
            setPlaying(true);
        }
    };

    useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

    return (
        <TouchableOpacity style={s.voiceRow} onPress={toggle} activeOpacity={0.8}>
            <View style={s.voiceBtn}>
                <Ionicons name={playing ? 'pause' : 'play'} size={14} color="#000" />
            </View>
            <Text style={s.voiceLabel}>Voice note from coach</Text>
        </TouchableOpacity>
    );
}

function VoiceRecorder({ onRecorded }) {
    const recordingRef = useRef(null);
    const [state, setState] = useState('idle'); // idle | recording | uploading

    const start = async () => {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        setState('recording');
    };

    const stop = async () => {
        if (!recordingRef.current) return;
        setState('uploading');
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        const url = await uploadVoiceNote(uri);
        setState('idle');
        if (url) onRecorded(url);
    };

    const label = state === 'recording' ? 'Tap to send' : state === 'uploading' ? 'Sending…' : 'Voice';
    const color = state === 'recording' ? C.red : C.cyan;

    return (
        <TouchableOpacity
            style={[s.voiceRecordBtn, { borderColor: color }]}
            onPress={state === 'recording' ? stop : start}
            disabled={state === 'uploading'}
            activeOpacity={0.8}
        >
            <Ionicons name={state === 'recording' ? 'stop-circle' : 'mic-outline'} size={16} color={color} />
            <Text style={[s.voiceRecordText, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        return res.ok ? res.json() : null;
    } catch {
        return null;
    }
}

const C = {
    bg:      '#FBFBF8',
    surf:    '#FFFFFF',
    deep:    '#FBFBF8',
    cyan:    '#FC4C02',
    text:    '#242428',
    muted:   '#9CA3AF',
    border:  'rgba(255,255,255,0.08)',
    input:   '#F7F7FA',
    red:     '#ef4444',
};

const TABS = ['Coach Notes', 'Messages'];

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function SkeletonBlock({ width = '100%', height = 14, style }) {
    const anim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, [anim]);

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
                { opacity: anim },
                style,
            ]}
        />
    );
}

function CoachNoteSkeleton() {
    return (
        <View style={s.noteCard}>
            <SkeletonBlock height={10} width="40%" style={{ marginBottom: 12 }} />
            <SkeletonBlock height={22} width="85%" style={{ marginBottom: 10 }} />
            <SkeletonBlock height={14} style={{ marginBottom: 6 }} />
            <SkeletonBlock height={14} width="75%" style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonBlock height={26} width={80} style={{ borderRadius: 99 }} />
                <SkeletonBlock height={26} width={70} style={{ borderRadius: 99 }} />
                <SkeletonBlock height={26} width={90} style={{ borderRadius: 99 }} />
            </View>
        </View>
    );
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(isoString) {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days  = Math.floor(diffMs / 86400000);
    if (mins < 2)  return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ─── Coach Notes Tab ──────────────────────────────────────────────────────────

function CoachNotesTab({ navigation }) {
    const [note, setNote]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(false);
    const [noData, setNoData]     = useState(false);

    const fetchNote = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(false);
        setNoData(false);
        try {
            const id = await getOrCreateAnonymousAthleteId();
            const qs = refresh ? '?refresh=true' : '';
            const data = await apiFetch(`/coach/${id}/weekly-note${qs}`);
            if (!data) {
                setError(true);
            } else if (!data.headline) {
                setNoData(true);
            } else {
                setNote(data);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNote(); }, [fetchNote]);

    if (loading) return <CoachNoteSkeleton />;

    if (error) {
        return (
            <View style={s.inlineCenter}>
                <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
                <Text style={s.emptyTitle}>Could not load coach note</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => fetchNote()}>
                    <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (noData) {
        return (
            <View style={s.inlineCenter}>
                <Ionicons name="barbell-outline" size={44} color={C.muted} />
                <Text style={s.emptyTitle}>No coach note yet</Text>
                <Text style={s.emptyBody}>Complete 3+ sessions to unlock your first coach note.</Text>
                <TouchableOpacity
                    style={s.ctaBtn}
                    onPress={() => navigation.navigate('PlacementWizard')}
                >
                    <Text style={s.ctaBtnText}>Start training</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={s.noteCard}>
            <View style={s.noteCardInner}>
                {/* Header row */}
                <View style={s.noteHeaderRow}>
                    <Text style={s.noteWeekLabel}>THIS WEEK</Text>
                    <TouchableOpacity onPress={() => fetchNote(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="refresh-outline" size={18} color={C.muted} />
                    </TouchableOpacity>
                </View>

                {/* Headline */}
                <Text style={s.noteHeadline}>{note.headline}</Text>

                {/* Body */}
                <Text style={s.noteBody}>{note.body}</Text>

                {/* Focus area chips */}
                {Array.isArray(note.focus_areas) && note.focus_areas.length > 0 && (
                    <View style={s.chipsRow}>
                        {note.focus_areas.map((area, i) => (
                            <View key={i} style={s.chip}>
                                <Text style={s.chipText}>{area}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer */}
                <Text style={s.noteFooter}>Generated from last {note.window_days || 7} sessions</Text>
            </View>
        </View>
    );
}

// ─── Message Card ─────────────────────────────────────────────────────────────

function MessageCard({ broadcast, athleteId, onReplied }) {
    const [replyText, setReplyText] = useState('');
    const [sending, setSending]     = useState(false);

    const sendReply = async ({ message, voice_note_url } = {}) => {
        if (!message && !voice_note_url) return;
        setSending(true);
        try {
            const result = await apiFetch(`/athlete/${athleteId}/reply`, {
                method: 'POST',
                body: JSON.stringify({ broadcast_id: broadcast.broadcast_id, message, voice_note_url }),
            });
            if (result) {
                setReplyText('');
                onReplied(broadcast.broadcast_id, message || '[voice note]');
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={s.msgCard}>
            <View style={s.msgHeader}>
                <View style={s.coachAvatar}>
                    <Ionicons name="person-outline" size={16} color={C.cyan} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.coachName}>{broadcast.coach_id}</Text>
                    <Text style={s.msgTime}>{relativeTime(broadcast.sent_at)}</Text>
                </View>
            </View>

            {broadcast.message ? (
                <Text style={s.msgText}>{broadcast.message}</Text>
            ) : null}

            {broadcast.voice_note_url ? (
                <VoicePlayer url={broadcast.voice_note_url} />
            ) : null}

            {broadcast.replied ? (
                <View style={s.myReplyBox}>
                    <Text style={s.myReplyLabel}>You replied:</Text>
                    <Text style={s.myReplyText}>{broadcast.my_reply?.message || '[voice note]'}</Text>
                    <Text style={s.myReplyTime}>{relativeTime(broadcast.my_reply?.replied_at)}</Text>
                </View>
            ) : (
                <>
                    <View style={s.replyRow}>
                        <TextInput
                            style={s.replyInput}
                            placeholder="Reply to coach…"
                            placeholderTextColor={C.muted}
                            value={replyText}
                            onChangeText={setReplyText}
                            returnKeyType="send"
                            onSubmitEditing={() => sendReply({ message: replyText.trim() })}
                            editable={!sending}
                        />
                        <TouchableOpacity
                            style={[s.sendBtn, (!replyText.trim() || sending) && s.sendBtnDisabled]}
                            onPress={() => sendReply({ message: replyText.trim() })}
                            disabled={!replyText.trim() || sending}
                            activeOpacity={0.8}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color="#000" />
                                : <Text style={s.sendBtnText}>Send</Text>
                            }
                        </TouchableOpacity>
                    </View>
                    <VoiceRecorder onRecorded={url => sendReply({ voice_note_url: url })} />
                </>
            )}
        </View>
    );
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────

function MessagesTab({ athleteId }) {
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(false);

    const fetchInbox = useCallback(async () => {
        if (!athleteId) return;
        setLoading(true);
        setError(false);
        try {
            const data = await apiFetch(`/athlete/${athleteId}/inbox`);
            if (!data) {
                setError(true);
            } else {
                setBroadcasts(data.broadcasts || []);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [athleteId]);

    useEffect(() => { fetchInbox(); }, [fetchInbox]);

    const handleReplied = useCallback((broadcastId, message) => {
        setBroadcasts(prev => prev.map(b =>
            b.broadcast_id === broadcastId
                ? { ...b, replied: true, my_reply: { message, replied_at: new Date().toISOString() } }
                : b
        ));
    }, []);

    if (loading) {
        return (
            <View style={s.centerBox}>
                <ActivityIndicator size="large" color={C.cyan} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={s.centerBox}>
                <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
                <Text style={s.emptyTitle}>Could not load messages</Text>
                <TouchableOpacity style={s.retryBtn} onPress={fetchInbox}>
                    <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (broadcasts.length === 0) {
        return (
            <View style={s.centerBox}>
                <Ionicons name="mail-outline" size={48} color={C.muted} />
                <Text style={s.emptyTitle}>No messages yet</Text>
                <Text style={s.emptyBody}>
                    Messages will appear here when your coach sends you feedback.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={broadcasts}
            keyExtractor={item => item.broadcast_id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <MessageCard
                    broadcast={item}
                    athleteId={athleteId}
                    onReplied={handleReplied}
                />
            )}
        />
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachInboxScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState(0);
    const [athleteId, setAthleteId] = useState(null);

    useEffect(() => {
        getOrCreateAnonymousAthleteId()
            .then(setAthleteId)
            .catch(() => {});
    }, []);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginRight: 12 }}
                >
                    <Ionicons name="arrow-back-outline" size={22} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Coach Inbox</Text>
            </View>

            {/* Tab pills */}
            <View style={s.tabRow}>
                {TABS.map((tab, i) => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tabPill, activeTab === i && s.tabPillActive]}
                        onPress={() => setActiveTab(i)}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabPillText, activeTab === i && s.tabPillTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab content */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={80}
            >
                {activeTab === 0 ? (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <CoachNotesTab navigation={navigation} />
                    </ScrollView>
                ) : (
                    <MessagesTab athleteId={athleteId} />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe:    { flex: 1, backgroundColor: C.bg },

    // Header
    header:      { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },

    // Tabs
    tabRow:           { flexDirection: 'row', padding: 12, gap: 10 },
    tabPill:          { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surf, borderWidth: 1, borderColor: C.border },
    tabPillActive:    { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.4)' },
    tabPillText:      { fontSize: 13, fontWeight: '700', color: C.muted },
    tabPillTextActive:{ color: C.cyan },

    // Coach note card
    noteCard:       { backgroundColor: C.surf, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
    noteCardInner:  { borderLeftWidth: 3, borderLeftColor: C.cyan, padding: 16 },
    noteHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    noteWeekLabel:  { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1.5 },
    noteHeadline:   { fontSize: 18, fontWeight: '800', color: C.text, lineHeight: 24, marginBottom: 10 },
    noteBody:       { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 14 },
    chipsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip:           { backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    chipText:       { fontSize: 11, fontWeight: '700', color: C.cyan },
    noteFooter:     { fontSize: 11, color: C.muted },

    // Message card
    msgCard:     { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    msgHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    coachAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(6,182,212,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    coachName:   { fontSize: 13, fontWeight: '800', color: C.text },
    msgTime:     { fontSize: 11, color: C.muted, marginTop: 1 },
    msgText:     { fontSize: 14, color: C.text, lineHeight: 21, marginBottom: 12 },

    // My reply
    myReplyBox:  { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
    myReplyLabel:{ fontSize: 10, fontWeight: '800', color: C.muted, marginBottom: 4, letterSpacing: 0.5 },
    myReplyText: { fontSize: 13, color: C.muted, fontStyle: 'italic', lineHeight: 19 },
    myReplyTime: { fontSize: 10, color: C.muted, marginTop: 4 },

    // Reply input
    replyRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    replyInput:      { flex: 1, backgroundColor: C.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 13, borderWidth: 1, borderColor: C.border },
    sendBtn:         { backgroundColor: C.cyan, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    sendBtnDisabled: { opacity: 0.45 },
    sendBtnText:     { color: '#000', fontWeight: '800', fontSize: 13 },

    // Voice player
    voiceRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(6,182,212,0.07)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)', marginBottom: 10 },
    voiceBtn:   { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    voiceLabel: { fontSize: 13, color: C.muted },

    // Voice recorder
    voiceRecordBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignSelf: 'flex-start' },
    voiceRecordText: { fontSize: 12, fontWeight: '700' },

    // Red for recording stop
    red: '#ef4444',

    // Empty / error states
    // centerBox is used inside FlatList containers (flex: 1 valid there)
    centerBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    // inlineCenter is used inside ScrollView where flex: 1 has no effect
    inlineCenter: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 14, textAlign: 'center' },
    emptyBody:  { fontSize: 13, color: C.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    retryBtn:   { marginTop: 18, backgroundColor: C.surf, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
    retryText:  { color: C.cyan, fontWeight: '800', fontSize: 13 },
    ctaBtn:     { marginTop: 20, backgroundColor: C.cyan, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
    ctaBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
});
