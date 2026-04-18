// InviteAcceptScreen — handles the deep link personalhealth://invite/{token}
// Validates the token, shows coach context, then joins the roster on tap.
// Target: <90 seconds from link tap to first session pick.

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';

const C = {
    bg:     '#0a0e1a',
    surf:   '#111827',
    cyan:   '#06b6d4',
    text:   '#f9fafb',
    muted:  '#9ca3af',
    border: 'rgba(255,255,255,0.08)',
    red:    '#ef4444',
};

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

export default function InviteAcceptScreen({ route, navigation }) {
    const token = route?.params?.token;

    const [state, setState]       = useState('loading'); // loading | valid | error | joining | done
    const [coachInfo, setCoachInfo] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!token) {
            setState('error');
            setErrorMsg('No invite token found in the link.');
            return;
        }
        apiFetch(`/invite/${encodeURIComponent(token)}`).then(data => {
            if (!data || !data.valid) {
                setState('error');
                setErrorMsg('This invite link has expired or is no longer valid.');
            } else {
                setCoachInfo(data);
                setState('valid');
            }
        });
    }, [token]);

    const handleAccept = async () => {
        setState('joining');
        const athleteId = await getOrCreateAnonymousAthleteId();
        const result = await apiFetch(`/invite/${encodeURIComponent(token)}/accept`, {
            method: 'POST',
            body: JSON.stringify({ athlete_id: athleteId }),
        });
        if (result?.status === 'joined') {
            setState('done');
            // Navigate straight into drill picker so athlete can start <90s
            setTimeout(() => navigation.replace('DrillPicker'), 1200);
        } else {
            setState('error');
            setErrorMsg('Could not join — the link may have reached its limit.');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.card}>
                <View style={s.logoRow}>
                    <View style={s.logoMark}><Text style={s.logoText}>PH</Text></View>
                    <Text style={s.logoName}>Personal Health</Text>
                </View>

                {state === 'loading' && (
                    <View style={s.center}>
                        <ActivityIndicator size="large" color={C.cyan} />
                        <Text style={s.subText}>Checking invite link…</Text>
                    </View>
                )}

                {state === 'valid' && coachInfo && (
                    <>
                        <Text style={s.headline}>You've been invited</Text>
                        <Text style={s.sub}>
                            <Text style={s.coachName}>{coachInfo.coach_name}</Text> has invited you to join their coaching roster.
                            {coachInfo.label ? `\n\nGroup: ${coachInfo.label}` : ''}
                        </Text>

                        <View style={s.infoRow}>
                            <Ionicons name="time-outline" size={14} color={C.muted} />
                            <Text style={s.infoText}>Expires {coachInfo.expires_at?.slice(0, 10)}</Text>
                        </View>
                        <View style={s.infoRow}>
                            <Ionicons name="people-outline" size={14} color={C.muted} />
                            <Text style={s.infoText}>{coachInfo.uses_remaining} spots remaining</Text>
                        </View>

                        <TouchableOpacity style={s.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
                            <Text style={s.acceptBtnText}>Join roster &amp; start training</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelLink}>
                            <Text style={s.cancelText}>Not now</Text>
                        </TouchableOpacity>
                    </>
                )}

                {state === 'joining' && (
                    <View style={s.center}>
                        <ActivityIndicator size="large" color={C.cyan} />
                        <Text style={s.subText}>Joining roster…</Text>
                    </View>
                )}

                {state === 'done' && (
                    <View style={s.center}>
                        <Ionicons name="checkmark-circle" size={56} color={C.cyan} />
                        <Text style={s.headline}>You're in!</Text>
                        <Text style={s.subText}>Taking you to today's training…</Text>
                    </View>
                )}

                {state === 'error' && (
                    <View style={s.center}>
                        <Ionicons name="alert-circle-outline" size={48} color={C.red} />
                        <Text style={[s.headline, { color: C.red }]}>Link unavailable</Text>
                        <Text style={s.subText}>{errorMsg}</Text>
                        <TouchableOpacity style={s.acceptBtn} onPress={() => navigation.goBack()}>
                            <Text style={s.acceptBtnText}>Go back</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 },
    card:  { backgroundColor: C.surf, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: C.border },

    logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
    logoMark: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 11, fontWeight: '900', color: '#000' },
    logoName: { fontSize: 14, fontWeight: '700', color: C.text },

    headline:  { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 10 },
    sub:       { fontSize: 15, color: C.muted, lineHeight: 22, marginBottom: 18 },
    coachName: { color: C.text, fontWeight: '700' },

    infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    infoText: { fontSize: 13, color: C.muted },

    acceptBtn:     { backgroundColor: C.cyan, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    acceptBtnText: { fontSize: 16, fontWeight: '800', color: '#001018' },

    cancelLink: { alignItems: 'center', marginTop: 14 },
    cancelText: { fontSize: 13, color: C.muted },

    center:  { alignItems: 'center', paddingVertical: 24 },
    subText: { fontSize: 14, color: C.muted, marginTop: 12, textAlign: 'center' },
});
