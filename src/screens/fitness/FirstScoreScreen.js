// FirstScoreScreen — ST-02: First-session celebration before regular ShareCard
// Shows the initial score, what it means, and what's next.

import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../styles/colors';
import { markOnboardingComplete } from '../../services/deviceIdentity';
import api from '../../services/api';

const BG = C.bg;
const TEXT = C.text;
const MUTED = C.muted;
const ACCENT = C.cyan;

export default function FirstScoreScreen({ navigation, route }) {
    const sessionId = route.params?.sessionId;
    const athleteId = route.params?.athleteId;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!sessionId) {
                setError('No session data');
                setLoading(false);
                return;
            }
            try {
                const card = await api.get(`/session/${sessionId}/share-card`);
                let weakest = null;
                if (athleteId) {
                    try {
                        const wj = await api.getWeakJoints(athleteId, 30);
                        weakest = (wj?.weak_joints || []).find(j => (j.deviation_deg || 0) > 0) || null;
                    } catch {}
                }
                setData({ ...card, weakest });
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
            } catch (e) {
                setError(e?.message || 'Could not load score');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [sessionId, athleteId]);

    const handleContinue = async () => {
        try { await markOnboardingComplete(); } catch {}
        navigation.replace('ShareCard', { sessionId, athleteId });
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <ActivityIndicator color={ACCENT} size="large" style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.errorBox}>
                    <Text style={s.errorTitle}>Couldn't load your score</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.retryText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const heroNumber = data.hero_number || '—';
    const weakest = data.weakest;
    const explainerBody = weakest
        ? `Your ${weakest.joint.replace(/_/g, ' ')} averaged ${weakest.mean_deg}°. The ideal range for your sport is ${weakest.ideal_min}–${weakest.ideal_max}°.`
        : 'Graded from joint angles, range of motion, and symmetry across reps.';

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <View style={s.spacer} />

                <View style={s.heroWrap}>
                    <Text style={s.heroNumber}>{heroNumber}</Text>
                </View>

                <View style={s.explainerWrap}>
                    <Text style={s.explainerTitle}>Your form score</Text>
                    <Text style={s.explainerBody}>{explainerBody}</Text>
                </View>

                <View style={s.nextWrap}>
                    <Text style={s.nextTitle}>What's next</Text>
                    <Text style={s.nextBody}>
                        Your next session will show a ▲ or ▼ vs. this {heroNumber}. Aim to stay consistent, then improve.
                    </Text>
                </View>

                <View style={s.spacer} />

                <TouchableOpacity
                    style={s.continueBtn}
                    onPress={handleContinue}
                    activeOpacity={0.85}
                >
                    <Text style={s.continueBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color={BG} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: BG,
    },
    wrap: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    spacer: {
        flex: 1,
    },
    heroWrap: {
        alignItems: 'center',
        marginBottom: 40,
    },
    heroNumber: {
        fontSize: 120,
        fontWeight: '900',
        color: ACCENT,
        lineHeight: 140,
    },
    explainerWrap: {
        marginBottom: 32,
    },
    explainerTitle: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
    },
    explainerBody: {
        color: MUTED,
        fontSize: 15,
        lineHeight: 22,
    },
    nextWrap: {
        marginBottom: 32,
    },
    nextTitle: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
    },
    nextBody: {
        color: MUTED,
        fontSize: 15,
        lineHeight: 22,
    },
    continueBtn: {
        flexDirection: 'row',
        backgroundColor: ACCENT,
        borderRadius: 14,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueBtnText: {
        color: BG,
        fontSize: 16,
        fontWeight: '800',
    },
});
