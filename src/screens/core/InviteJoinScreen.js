// FH-01: Invite join screen — athlete lands here after tapping a coach invite link
import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    SafeAreaView, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import api from '../../services/api';
import { C } from '../../styles/colors';

export default function InviteJoinScreen({ navigation, route }) {
    const { token } = route.params || {};
    const [invite, setInvite]     = useState(null);
    const [loading, setLoading]   = useState(true);
    const [joining, setJoining]   = useState(false);
    const [joined, setJoined]     = useState(false);
    const [error, setError]       = useState(null);

    // Entrance animation
    const fadeAnim  = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(32))[0];

    useEffect(() => {
        if (!token) { setError('Invalid invite link.'); setLoading(false); return; }
        api.get(`/invite/${token}`)
            .then(data => {
                setInvite(data);
                Animated.parallel([
                    Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
                ]).start();
            })
            .catch(e => setError(e?.message || 'This invite link has expired or is invalid.'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleJoin = async () => {
        setJoining(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        try {
            const athleteId = await getOrCreateAnonymousAthleteId();
            await api.post(`/invite/${token}/accept`, { athlete_id: athleteId });
            setJoined(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setTimeout(() => navigation.replace('Tabs'), 1800);
        } catch (e) {
            setError(e?.message || 'Failed to join. Try again.');
        }
        setJoining(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <ActivityIndicator color={C.cyan} style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (error && !joined) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <View style={s.errorIcon}>
                        <Ionicons name="alert-circle-outline" size={40} color={C.red} />
                    </View>
                    <Text style={s.errorTitle}>Link unavailable</Text>
                    <Text style={s.errorSub}>{error}</Text>
                    <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.replace('Tabs')}>
                        <Text style={s.secondaryBtnText}>Go to app</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (joined) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <View style={s.successRing}>
                        <Ionicons name="checkmark" size={44} color={C.green} />
                    </View>
                    <Text style={s.successTitle}>You're in.</Text>
                    <Text style={s.successSub}>Joining {invite?.coach_name}'s roster…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>
            <Animated.View style={[s.wrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                {/* Coach badge */}
                <View style={s.coachBadge}>
                    <View style={s.avatarRing}>
                        <Text style={s.avatarLetter}>
                            {(invite?.coach_name || 'C')[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={s.badgeText}>
                        <Text style={s.badgeLabel}>Coach</Text>
                        <Text style={s.badgeName}>{invite?.coach_name}</Text>
                    </View>
                    <View style={s.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={16} color={C.cyan} />
                    </View>
                </View>

                {/* Headline */}
                <Text style={s.headline}>You've been invited to train.</Text>
                {invite?.label ? (
                    <Text style={s.groupLabel}>"{invite.label}"</Text>
                ) : null}
                <Text style={s.body}>
                    Join {invite?.coach_name}'s roster on Personal Health. Your form gets graded in real-time — no email, no subscription required.
                </Text>

                {/* Trust signals */}
                <View style={s.signals}>
                    {[
                        { icon: 'videocam-outline',    text: 'AI form grading with your phone camera' },
                        { icon: 'lock-closed-outline',  text: 'Anonymous — no email or account needed' },
                        { icon: 'trending-up-outline',  text: 'Track your improvement session by session' },
                    ].map(({ icon, text }) => (
                        <View key={icon} style={s.signalRow}>
                            <View style={s.signalIcon}>
                                <Ionicons name={icon} size={18} color={C.cyan} />
                            </View>
                            <Text style={s.signalText}>{text}</Text>
                        </View>
                    ))}
                </View>

                {/* Expiry */}
                {invite?.uses_remaining != null && (
                    <Text style={s.meta}>
                        {invite.uses_remaining} spot{invite.uses_remaining !== 1 ? 's' : ''} remaining
                    </Text>
                )}

                {/* CTA */}
                <TouchableOpacity
                    style={[s.joinBtn, joining && { opacity: 0.6 }]}
                    onPress={handleJoin}
                    disabled={joining}
                    activeOpacity={0.85}
                >
                    {joining ? (
                        <ActivityIndicator color="#0a0e1a" />
                    ) : (
                        <>
                            <Text style={s.joinBtnText}>Join roster</Text>
                            <Ionicons name="arrow-forward" size={18} color="#0a0e1a" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.replace('Tabs')} style={s.skipBtn}>
                    <Text style={s.skipText}>Maybe later</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:          { flex: 1, backgroundColor: C.bg },
    wrap:          { flex: 1, padding: 24, justifyContent: 'center' },
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

    coachBadge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderRadius: 16, padding: 14, marginBottom: 28, borderWidth: 1, borderColor: C.border },
    avatarRing:    { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(6,182,212,0.15)', borderWidth: 2, borderColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    avatarLetter:  { color: C.cyan, fontSize: 20, fontWeight: '800' },
    badgeText:     { flex: 1, marginLeft: 12 },
    badgeLabel:    { color: C.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    badgeName:     { color: C.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
    verifiedBadge: { padding: 4 },

    headline:      { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, marginBottom: 8 },
    groupLabel:    { color: C.cyan, fontSize: 15, fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
    body:          { color: C.textSub, fontSize: 15, lineHeight: 22, marginBottom: 28 },

    signals:       { gap: 12, marginBottom: 24 },
    signalRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    signalIcon:    { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(6,182,212,0.1)', alignItems: 'center', justifyContent: 'center' },
    signalText:    { color: C.textSub, fontSize: 14, flex: 1, lineHeight: 19 },

    meta:          { color: C.muted, fontSize: 12, marginBottom: 20, textAlign: 'center' },

    joinBtn:       { flexDirection: 'row', backgroundColor: C.cyan, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    joinBtnText:   { color: '#0a0e1a', fontSize: 16, fontWeight: '800' },
    skipBtn:       { alignItems: 'center', padding: 14 },
    skipText:      { color: C.muted, fontSize: 14 },

    errorIcon:     { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    errorTitle:    { color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
    errorSub:      { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    secondaryBtn:  { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    secondaryBtnText: { color: C.textSub, fontSize: 15, fontWeight: '600' },

    successRing:   { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(34,197,94,0.08)' },
    successTitle:  { color: C.text, fontSize: 32, fontWeight: '900', marginBottom: 8 },
    successSub:    { color: C.muted, fontSize: 15 },
});
