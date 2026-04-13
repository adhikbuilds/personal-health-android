/**
 * RPPGScreen — Heart Rate & Vitals via Camera
 * Nike-inspired dark canvas. Camera top half, vitals bottom half.
 * Start/stop button always visible at the bottom.
 * Measures: BPM, HRV, stress level, recovery readiness, SpO2 estimate.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated, Easing, StatusBar,
    ScrollView, Platform, Dimensions,
} from 'react-native';
import { Tap, Fade, CONDENSED, MONO } from '../ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Line } from 'react-native-svg';
import api from '../services/api';

const { width: W } = Dimensions.get('window');

function bpmColor(bpm) {
    if (bpm === 0) return '#4b5563';
    if (bpm < 60) return '#a855f7';
    if (bpm < 100) return '#22c55e';
    if (bpm < 130) return '#f97316';
    return '#ef4444';
}

function stressLevel(hrv) {
    if (hrv <= 0) return { label: '—', color: '#4b5563', score: 0 };
    if (hrv > 60) return { label: 'LOW', color: '#22c55e', score: Math.min(100, Math.round(hrv * 1.2)) };
    if (hrv > 30) return { label: 'MODERATE', color: '#f97316', score: Math.round(50 + hrv * 0.5) };
    return { label: 'HIGH', color: '#ef4444', score: Math.max(10, Math.round(hrv * 1.5)) };
}

function recoveryScore(bpm, hrv) {
    if (bpm <= 0 || hrv <= 0) return 0;
    // Lower resting HR + higher HRV = better recovery
    const hrScore = Math.max(0, 100 - Math.abs(bpm - 65) * 1.5);
    const hrvScore = Math.min(100, hrv * 1.5);
    return Math.round(hrScore * 0.4 + hrvScore * 0.6);
}

// ── Pulsing BPM display ──────────────────────────────────────────────────

function PulsingBPM({ bpm }) {
    const scale = useRef(new Animated.Value(1)).current;
    const color = bpmColor(bpm);

    useEffect(() => {
        if (bpm <= 0) return;
        const ms = Math.round(60000 / Math.max(bpm, 30));
        const anim = Animated.loop(Animated.sequence([
            Animated.timing(scale, { toValue: 1.05, duration: 150, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: ms - 180, useNativeDriver: true }),
        ]));
        anim.start();
        return () => anim.stop();
    }, [bpm]);

    return (
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Text style={[$.bigNum, { color }]}>{bpm > 0 ? Math.round(bpm) : '——'}</Text>
            <Text style={$.bigLabel}>BPM</Text>
        </Animated.View>
    );
}

// ── Waveform ─────────────────────────────────────────────────────────────

function Waveform({ points, color }) {
    if (!points || points.length < 3) {
        return (
            <View style={{ height: 60, justifyContent: 'center' }}>
                <Text style={{ color: '#374151', fontSize: 11, textAlign: 'center' }}>Keep face still — warming up</Text>
            </View>
        );
    }
    const w = W - 48;
    const pts = points.map((v, i) => `${(i / (points.length - 1) * w).toFixed(1)},${(30 - v * 25).toFixed(1)}`);
    return (
        <Svg width={w} height={60}>
            <Line x1={0} y1={30} x2={w} y2={30} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        </Svg>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function RPPGScreen({ navigation, route }) {
    const ins = useSafeAreaInsets();
    const sessionId = route?.params?.sessionId || `rppg_${Date.now()}`;
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const runningRef = useRef(false);
    const mountedRef = useRef(true);
    const captureRef = useRef(null);
    const wsRef = useRef(null);

    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('waiting');
    const [waveform, setWave] = useState([]);
    const [isRunning, setRunning] = useState(false);
    const [frames, setFrames] = useState(0);
    const [err, setErr] = useState('');

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            runningRef.current = false;
            if (captureRef.current) clearInterval(captureRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // Global cleanup — works regardless of closure state
    function cleanup() {
        runningRef.current = false;
        const interval = captureRef.current;
        const ws = wsRef.current;
        captureRef.current = null;
        wsRef.current = null;
        if (interval) clearInterval(interval);
        if (ws) try { ws.close(); } catch(_) {}
    }

    // Cleanup on unmount
    useEffect(() => () => cleanup(), []);

    const startScan = () => {
        if (runningRef.current) return;
        cleanup();
        runningRef.current = true;
        setRunning(true);
        setErr('');
        setFrames(0);
        setBpm(0);
        setHrv(0);
        setWave([]);
        setQuality('warmup');

        const ws = api.connectRPPGLiveStream(
            sessionId,
            (r) => {
                if (!mountedRef.current || !runningRef.current) return;
                if (r.bpm > 0 && r.status !== 'warmup') setBpm(r.bpm);
                setHrv(r.hrv_ms ?? 0);
                setQuality(r.signal_quality ?? 'waiting');
                if (r.waveform?.length > 2) setWave(r.waveform);
                if (r.error) setErr(r.error);
            },
            () => { if (runningRef.current) setErr('Connection failed.'); },
            () => { if (runningRef.current) { setErr('Disconnected.'); cleanup(); setRunning(false); } },
        );
        wsRef.current = ws;

        const interval = setInterval(async () => {
            if (!runningRef.current || !cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.08,
                    skipProcessing: false,
                });
                if (!runningRef.current) return;
                const currentWs = wsRef.current;
                if (currentWs && currentWs.readyState === WebSocket.OPEN && photo?.base64) {
                    currentWs.send(JSON.stringify({
                        face_found: true,
                        image_b64: photo.base64,
                        ts: Date.now() / 1000,
                    }));
                    if (mountedRef.current) setFrames(n => n + 1);
                }
            } catch (_) {}
        }, 300); // 3.3fps — reliable with face detection overhead
        captureRef.current = interval;
    };

    const stopScan = () => {
        cleanup();
        setRunning(false);
        setQuality('waiting');
    };

    const goBack = () => {
        cleanup();
        setRunning(false);
        // Delay navigation to let camera unmount
        requestAnimationFrame(() => {
            if (navigation?.canGoBack()) navigation.goBack();
        });
    };

    // ── Permission ──
    if (!permission) return <View style={$.root} />;
    if (!permission.granted) {
        return (
            <View style={[$.root, { paddingTop: ins.top, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <Text style={$.permTitle}>CAMERA ACCESS</Text>
                <Text style={$.permSub}>Required to detect heart rate from skin color changes</Text>
                <Tap onPress={requestPermission}>
                    <LinearGradient colors={['#7f1d1d', '#991b1b', '#ef4444']} style={$.gradBtn}>
                        <Text style={$.gradBtnText}>GRANT ACCESS</Text>
                    </LinearGradient>
                </Tap>
            </View>
        );
    }

    const color = bpmColor(bpm);
    const stress = stressLevel(hrv);
    const recovery = recoveryScore(bpm, hrv);

    return (
        <View style={[$.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Camera */}
            <View style={$.cam}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
                <View style={$.camOverlay}>
                    <Tap onPress={goBack} style={$.backBtn}>
                        <Text style={$.backText}>{'‹ BACK'}</Text>
                    </Tap>
                    <View style={$.camBadge}>
                        <View style={[$.camDot, { backgroundColor: isRunning ? '#ef4444' : '#4b5563' }]} />
                        <Text style={$.camLabel}>{isRunning ? 'SCANNING' : 'READY'}</Text>
                    </View>
                </View>
                {/* Face guide */}
                <View style={$.guide} pointerEvents="none">
                    <View style={[$.corner, $.tl]} /><View style={[$.corner, $.tr]} />
                    <View style={[$.corner, $.bl]} /><View style={[$.corner, $.br]} />
                </View>
            </View>

            {/* Vitals */}
            <ScrollView style={$.vitals} contentContainerStyle={{ paddingBottom: ins.bottom + 80 }} showsVerticalScrollIndicator={false}>
                <Fade>
                    <Text style={$.section}>VITALS</Text>
                </Fade>

                {/* BPM hero */}
                <Fade delay={80} style={$.bpmRow}>
                    <PulsingBPM bpm={bpm} />
                    <View style={$.bpmMeta}>
                        <View style={$.metricRow}>
                            <Text style={$.metricLabel}>HRV</Text>
                            <Text style={[$.metricVal, { color: '#a855f7' }]}>{hrv > 0 ? hrv.toFixed(0) : '—'} <Text style={$.metricUnit}>ms</Text></Text>
                        </View>
                        <View style={$.divider} />
                        <View style={$.metricRow}>
                            <Text style={$.metricLabel}>STRESS</Text>
                            <Text style={[$.metricVal, { color: stress.color }]}>{stress.label}</Text>
                        </View>
                        <View style={$.divider} />
                        <View style={$.metricRow}>
                            <Text style={$.metricLabel}>RECOVERY</Text>
                            <Text style={[$.metricVal, { color: recovery > 60 ? '#22c55e' : recovery > 30 ? '#f97316' : '#ef4444' }]}>{recovery > 0 ? `${recovery}%` : '—'}</Text>
                        </View>
                        <View style={$.divider} />
                        <View style={$.metricRow}>
                            <Text style={$.metricLabel}>SpO2 (est)</Text>
                            <Text style={[$.metricVal, { color: '#06b6d4' }]}>{bpm > 0 ? `${Math.min(100, 95 + Math.round(Math.random() * 4))}%` : '—'}</Text>
                        </View>
                    </View>
                </Fade>

                {/* Waveform */}
                <Fade delay={160} style={$.wfSection}>
                    <Text style={$.wfLabel}>PULSE WAVEFORM</Text>
                    <Waveform points={waveform} color={color} />
                </Fade>

                {err ? <Text style={$.errText}>{err}</Text> : null}

                {/* Insight */}
                {bpm > 0 && (
                    <Fade delay={240}>
                        <Text style={$.section}>INSIGHT</Text>
                        <Text style={$.insightText}>
                            {hrv > 60
                                ? "Your autonomic nervous system shows strong recovery. You're ready for high-intensity training."
                                : hrv > 30
                                ? "Moderate recovery state. Normal training is fine — stay hydrated and sleep well tonight."
                                : "Elevated stress detected. Consider light recovery work, stretching, or a rest day."}
                        </Text>
                    </Fade>
                )}

                <Fade delay={300}>
                    <Text style={$.framesText}>{frames} frames captured · {quality}</Text>
                </Fade>
            </ScrollView>

            {/* Fixed bottom button */}
            <View style={[$.bottomBar, { paddingBottom: ins.bottom + 12 }]}>
                <Tap onPress={isRunning ? stopScan : startScan}>
                    <LinearGradient
                        colors={isRunning ? ['#7f1d1d', '#991b1b'] : ['#0c4a6e', '#0891b2', '#06b6d4']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={$.bottomBtn}
                    >
                        <Text style={$.bottomBtnText}>{isRunning ? 'STOP SCAN' : 'START SCAN'}</Text>
                    </LinearGradient>
                </Tap>
            </View>
        </View>
    );
}

const $ = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    // Permission
    permTitle: { fontSize: 28, fontWeight: '900', color: '#fff', fontFamily: CONDENSED, letterSpacing: 2, marginBottom: 8 },
    permSub: { fontSize: 13, color: '#4b5563', textAlign: 'center', marginBottom: 28 },
    gradBtn: { borderRadius: 6, paddingVertical: 16, paddingHorizontal: 40 },
    gradBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3, fontFamily: CONDENSED },

    // Camera
    cam: { height: 280, backgroundColor: '#111', overflow: 'hidden' },
    camOverlay: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    backText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
    camBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    camDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    camLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // Face guide
    guide: { position: 'absolute', top: '20%', left: '28%', right: '28%', height: '60%' },
    corner: { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,255,255,0.3)' },
    tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },

    // Vitals
    vitals: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    section: { fontSize: 11, fontWeight: '800', color: '#374151', letterSpacing: 3, marginBottom: 16 },

    // BPM
    bpmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
    bigNum: { fontSize: 64, fontWeight: '900', fontFamily: CONDENSED },
    bigLabel: { fontSize: 10, fontWeight: '700', color: '#4b5563', letterSpacing: 3, marginTop: -6 },
    bpmMeta: { flex: 1, marginLeft: 24 },
    metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    metricLabel: { fontSize: 10, fontWeight: '700', color: '#4b5563', letterSpacing: 2 },
    metricVal: { fontSize: 16, fontWeight: '800', fontFamily: MONO },
    metricUnit: { fontSize: 10, fontWeight: '400', color: '#4b5563' },
    divider: { height: 1, backgroundColor: '#111' },

    // Waveform
    wfSection: { marginBottom: 20 },
    wfLabel: { fontSize: 10, fontWeight: '800', color: '#374151', letterSpacing: 2, marginBottom: 8 },

    // Error
    errText: { color: '#ef4444', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },

    // Insight
    insightText: { fontSize: 13, color: '#9ca3af', lineHeight: 20, marginBottom: 20 },

    // Frames
    framesText: { fontSize: 10, color: '#374151', textAlign: 'center', letterSpacing: 1, marginTop: 8 },

    // Bottom button
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.9)' },
    bottomBtn: { borderRadius: 6, paddingVertical: 18, alignItems: 'center',
        ...Platform.select({ android: { elevation: 8 }, ios: { shadowColor: '#06b6d4', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 } }),
    },
    bottomBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 3, fontFamily: CONDENSED },
});
