// PlacementWizardScreen — Flow 1.3 from BIOMECHANICS-ARCHITECT.md.
//
// Pre-session check: can the propped phone actually see the full body?
// Three overlay states cycle as pose detection reports:
//   RED    — no full body visible
//   YELLOW — step closer / step further back / move phone higher / lower
//   GREEN  — ready; auto-advances after 1.5s stable
//
// This is a minimal shipping version: simulates pose-check ticks on a timer
// (the backend /pose/check endpoint exists but isn't wired here yet — that's
// a follow-up once the native frame processor is stable in Expo Go).
// Tap "start anyway" to proceed without waiting.

import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Camera, CameraView } from 'expo-camera';
import { C } from '../../styles/colors';
import { markOnboardingComplete } from '../../services/deviceIdentity';

const SIM_STATES = [
    { band: 'red',    msg: 'no full body visible — prop your phone 2m away' },
    { band: 'yellow', msg: 'step further back' },
    { band: 'yellow', msg: 'move phone higher' },
    { band: 'green',  msg: 'ready' },
];

const BAND_COLOR = { red: C.red, yellow: C.yellow, green: C.green };

export default function PlacementWizardScreen({ navigation, route }) {
    const athleteId = route.params?.athleteId;
    const nextScreen = route.params?.next || 'CameraSession';
    const drill = route.params?.drill;

    const [camPermission, setCamPermission] = useState(null);
    const [stateIdx, setStateIdx] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(15);
    const [allowOverride, setAllowOverride] = useState(false);
    const tickerRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setCamPermission(status === 'granted');
            } catch {
                setCamPermission(false);
            }
        })();
    }, []);

    useEffect(() => {
        // Cycle through SIM_STATES once every 3s, landing on GREEN at index 3.
        // Real wiring would subscribe to a pose-check stream.
        let i = 0;
        tickerRef.current = setInterval(() => {
            i = Math.min(i + 1, SIM_STATES.length - 1);
            setStateIdx(i);
            if (SIM_STATES[i].band === 'green') {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                clearInterval(tickerRef.current);
                // Hold GREEN for 1.5s then auto-advance
                setTimeout(() => {
                    navigation.replace(nextScreen, { athleteId, drill, setupQuality: 'ok' });
                }, 1500);
            }
        }, 3000);
        return () => clearInterval(tickerRef.current);
    }, [navigation, athleteId, nextScreen, drill]);

    useEffect(() => {
        // 15-second clock to unlock "start anyway"
        const c = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) { clearInterval(c); setAllowOverride(true); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(c);
    }, []);

    const current = SIM_STATES[stateIdx];
    const borderColor = BAND_COLOR[current.band];

    return (
        <SafeAreaView style={s.safe}>
            <View style={[s.cameraWrap, { borderColor }]}>
                {camPermission ? (
                    <CameraView style={s.camera} facing="back" />
                ) : (
                    <View style={[s.camera, s.placeholder]}>
                        <Text style={s.placeholderText}>
                            {camPermission === false ? 'Camera permission denied' : 'Requesting camera…'}
                        </Text>
                    </View>
                )}
                <View style={[s.overlayCorner, s.cornerTL, { borderColor }]} />
                <View style={[s.overlayCorner, s.cornerTR, { borderColor }]} />
                <View style={[s.overlayCorner, s.cornerBL, { borderColor }]} />
                <View style={[s.overlayCorner, s.cornerBR, { borderColor }]} />
            </View>

            <View style={s.footer}>
                <View style={[s.statusPill, { backgroundColor: borderColor + '22', borderColor }]}>
                    <View style={[s.statusDot, { backgroundColor: borderColor }]} />
                    <Text style={[s.statusText, { color: borderColor }]}>
                        {current.band.toUpperCase()}
                    </Text>
                </View>
                <Text style={s.message}>{current.msg}</Text>

                <TouchableOpacity
                    style={[
                        s.btn,
                        current.band === 'green' ? s.btnPrimary : (allowOverride ? s.btnSecondary : s.btnDisabled),
                    ]}
                    disabled={!allowOverride && current.band !== 'green'}
                    onPress={() => {
                        navigation.replace(nextScreen, {
                            athleteId, drill,
                            setupQuality: current.band === 'green' ? 'ok' : 'sub_optimal',
                        });
                    }}
                >
                    <Text style={[
                        s.btnText,
                        current.band === 'green' ? { color: '#FBFBF8' } : { color: C.text },
                    ]}>
                        {current.band === 'green'
                            ? 'tap to start'
                            : allowOverride ? 'start anyway' : `start anyway (${secondsLeft}s)`}
                    </Text>
                </TouchableOpacity>

                <View style={s.tipsRow}>
                    <TouchableOpacity style={s.tipsBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.tipsText}>back</Text>
                    </TouchableOpacity>
                    <Text style={[s.tipsText, { opacity: 0.3 }]}>·</Text>
                    <TouchableOpacity
                        style={s.tipsBtn}
                        onPress={async () => {
                            try { await markOnboardingComplete(); } catch {}
                            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
                        }}
                    >
                        <Text style={s.tipsText}>skip to dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    cameraWrap: {
        flex: 1, margin: 18, borderRadius: 20, overflow: 'hidden',
        borderWidth: 3, backgroundColor: '#000', position: 'relative',
    },
    camera: { flex: 1 },
    placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
    placeholderText: { color: C.muted, fontSize: 14 },
    overlayCorner: {
        position: 'absolute', width: 32, height: 32, borderColor: 'white',
    },
    cornerTL: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3 },

    footer: { padding: 20, alignItems: 'center', gap: 14 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
    message: { color: C.text, fontSize: 20, textAlign: 'center', fontWeight: '600', paddingHorizontal: 24 },

    btn: {
        marginTop: 4, paddingVertical: 16, paddingHorizontal: 42, borderRadius: 14,
        alignItems: 'center', minWidth: 240,
    },
    btnPrimary: { backgroundColor: C.cyan },
    btnSecondary: { backgroundColor: 'rgba(6,182,212,0.12)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    btnDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    btnText: { fontSize: 16, fontWeight: '700' },

    tipsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    tipsBtn: { paddingVertical: 8, paddingHorizontal: 8 },
    tipsText: { color: C.muted, fontSize: 13 },
});
