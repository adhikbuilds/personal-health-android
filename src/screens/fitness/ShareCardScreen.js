// ShareCardScreen — Flow 2.1 from SPRINT-WEEK-2-3-PROMPT.md.
//
// Post-session dopamine window. Backend picks the variant (pb / streak /
// show_up / first_session) — client does NOT override. Visual is identical
// across variants; only copy + chip colour change.
//
// Contract (GET /session/{id}/share-card):
//   { variant, hero_number, hero_label, delta, delta_direction, sub, chip,
//     chip_colour, rep_count, share_text, share_url, image_url,
//     design_system, multiplayer }

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    ActivityIndicator, Share, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { C } from '../../styles/colors';
import api from '../../services/api';
import {
    generateCoachInviteLink,
    hasInvitedCoach,
    markCoachInvited,
} from '../../services/coachInvite';

export default function ShareCardScreen({ navigation, route }) {
    const sessionId = route.params?.sessionId;
    const athleteId = route.params?.athleteId;
    const [card, setCard] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCoachInvite, setShowCoachInvite] = useState(false);
    const [coachInviteLoading, setCoachInviteLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState(null);
    const [inviteConfirmed, setInviteConfirmed] = useState(false);

    const load = useCallback(async () => {
        if (!sessionId) {
            setError('No session id provided');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await api.get(`/session/${sessionId}/share-card`);
            setCard(data);
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        } catch (e) {
            setError(e?.message || 'Could not load share card');
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        load();
        checkCoachInviteEligibility();
    }, [load]);

    const checkCoachInviteEligibility = async () => {
        try {
            const hasInvited = await hasInvitedCoach();
            setShowCoachInvite(!hasInvited);
        } catch {}
    };

    const handleCoachInvite = async () => {
        if (!athleteId) return;
        setCoachInviteLoading(true);
        try {
            const result = await generateCoachInviteLink(athleteId);
            setInviteLink(result);
            await markCoachInvited();
            setShowCoachInvite(false);

            const message = result.whatsapp_share_text || `Train with me on Personal Health:\n${result.invite_url}`;
            const shareResult = await Share.share({
                message,
                title: 'Invite your coach',
            });
            if (shareResult.action !== Share.dismissedAction) {
                setInviteConfirmed(true);
            }
        } catch (e) {
            console.warn('[ShareCard] coach invite failed', e);
        } finally {
            setCoachInviteLoading(false);
        }
    };

    const onShare = async () => {
        if (!card) return;
        try {
            await Share.share({
                message: `${card.share_text}\n\n${card.share_url}`,
                url: card.share_url,
                title: 'Personal Health',
            });
        } catch (e) {
            console.warn('[ShareCard] share failed', e);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <ActivityIndicator color={C.cyan} style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (error || !card) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.errorBox}>
                    <Text style={s.errorTitle}>Couldn't load your card</Text>
                    <Text style={s.errorBody}>{error || 'Unknown error'}</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={load}>
                        <Text style={s.retryText}>retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.backText}>back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const ds = card.design_system || {};
    const accent = ds.accent || '#FC4C02';
    const bg = ds.background || '#FBFBF8';
    const textPrimary = ds.text_primary || '#242428';
    const textSecondary = ds.text_secondary || '#9CA3AF';
    const chipColour = card.chip_colour || textSecondary;

    const deltaArrow =
        card.delta_direction === 'up' ? '▲' :
        card.delta_direction === 'down' ? '▼' : '—';
    const deltaColour =
        card.delta_direction === 'up' ? accent : textSecondary;

    // show_up variant intentionally hides the delta line per spec
    const showDelta = card.variant !== 'show_up' && card.delta !== null && card.delta !== undefined;

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
            <View style={s.card}>
                <Text style={[s.hero, { color: accent }]}>
                    {card.hero_number != null ? Number(card.hero_number).toFixed(0) : '—'}
                </Text>
                <Text style={[s.heroLabel, { color: textSecondary }]}>
                    {(card.hero_label || 'form score').toUpperCase()}
                </Text>

                {showDelta ? (
                    <View style={s.deltaRow}>
                        <Text style={[s.deltaArrow, { color: deltaColour }]}>{deltaArrow}</Text>
                        <Text style={[s.deltaText, { color: deltaColour }]}>
                            {card.delta > 0 ? '+' : ''}{Number(card.delta).toFixed(1)} vs last session
                        </Text>
                    </View>
                ) : null}

                <Text style={[s.sub, { color: textSecondary }]}>{card.sub}</Text>

                <View style={[s.chip, { borderColor: chipColour + '66', backgroundColor: chipColour + '18' }]}>
                    <Text style={[s.chipText, { color: chipColour }]}>{card.chip}</Text>
                </View>

                <Text style={[s.wordmark, { color: '#6D6D78' }]}>Personal Health</Text>
            </View>

            {/* Multiplayer transparency — tell the athlete who else will see this */}
            {card.multiplayer?.huddle_auto_post ? (
                <Text style={[s.multiText, { color: textSecondary }]}>posted to your huddle</Text>
            ) : null}
            {card.multiplayer?.coach_will_see ? (
                <Text style={[s.multiText, { color: textSecondary }]}>your coach will see this</Text>
            ) : null}

            <View style={s.actions}>
                <TouchableOpacity
                    style={[s.shareBtn, { backgroundColor: accent }]}
                    onPress={onShare}
                >
                    <Text style={s.shareText}>share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.popToTop()}>
                    <Text style={[s.secondaryText, { color: textSecondary }]}>done</Text>
                </TouchableOpacity>
            </View>

            {showCoachInvite && !inviteConfirmed && (
                <View style={[s.coachSection, { backgroundColor: '#FFFFFF', borderColor: accent + '33' }]}>
                    <Text style={[s.coachTitle, { color: textPrimary }]}>Training with a coach?</Text>
                    <Text style={[s.coachSub, { color: textSecondary }]}>
                        Send them this — they'll see your form scores and can send you notes.
                    </Text>
                    <TouchableOpacity
                        style={[s.coachBtn, { backgroundColor: accent }]}
                        onPress={handleCoachInvite}
                        disabled={coachInviteLoading}
                    >
                        <Text style={s.coachBtnText}>
                            {coachInviteLoading ? 'Generating…' : 'Share with your coach'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {inviteConfirmed && (
                <View style={[s.coachSection, { backgroundColor: '#FFFFFF', borderColor: accent + '33' }]}>
                    <Text style={[s.coachTitle, { color: textPrimary }]}>Sent</Text>
                    <Text style={[s.coachSub, { color: textSecondary }]}>
                        Your coach will appear on your roster once they install.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FBFBF8', alignItems: 'center', justifyContent: 'center' },

    card: {
        width: '86%', paddingVertical: 48, alignItems: 'center',
        borderRadius: 24, backgroundColor: '#FFFFFF',
    },
    hero: { fontSize: 120, fontWeight: '900', lineHeight: 128 },
    heroLabel: { fontSize: 13, letterSpacing: 1.5, marginTop: 6, textAlign: 'center' },

    deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
    deltaArrow: { fontSize: 16, fontWeight: '800' },
    deltaText: { fontSize: 14, fontWeight: '600' },

    sub: { fontSize: 14, marginTop: 18, textAlign: 'center', paddingHorizontal: 20 },

    chip: {
        marginTop: 16, paddingHorizontal: 14, paddingVertical: 5,
        borderRadius: 999, borderWidth: 1,
    },
    chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

    wordmark: { fontSize: 11, marginTop: 28, letterSpacing: 0.6 },

    multiText: { fontSize: 12, marginTop: 12 },

    actions: { flexDirection: 'row', gap: 14, marginTop: 28, width: '86%' },
    shareBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    shareText: { color: '#FBFBF8', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
    secondaryBtn: { paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { fontWeight: '700', fontSize: 14 },

    errorBox: { padding: 24, alignItems: 'center', gap: 12 },
    errorTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
    errorBody: { color: C.muted, fontSize: 14, textAlign: 'center' },
    retryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 22, backgroundColor: C.cyan, borderRadius: 10 },
    retryText: { color: '#FBFBF8', fontWeight: '800' },
    backBtn: { paddingVertical: 10 },
    backText: { color: C.muted, fontSize: 13 },

    coachSection: { marginTop: 20, width: '86%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    coachTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
    coachSub: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    coachBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    coachBtnText: { color: '#FBFBF8', fontSize: 14, fontWeight: '800' },
});
