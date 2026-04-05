/**
 * RPPGScreen — Real-time Heart Rate via Camera (rPPG)
 * ─────────────────────────────────────────────────────
 * Expo Go compatible (SDK 54). Uses expo-camera CameraView with periodic
 * frame capture (takePictureAsync) — no native frame processors needed.
 * Sends base64 JPEG frames over WebSocket; backend extracts average RGB.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Dimensions, Animated, Easing, StatusBar, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Polyline, Line } from 'react-native-svg';
import api from '../services/api';

const { width: W } = Dimensions.get('window');
const WF_H = 80;

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
    bg: '#060a12',
    surf: '#0d1526',
    card: '#111a2e',
    border: 'rgba(255,255,255,0.07)',
    cyan: '#06b6d4',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    yellow: '#facc15',
    purple: '#a78bfa',
    text: '#f1f5f9',
    muted: '#64748b',
    dim: '#1e293b',
};

function bpmColor(bpm) {
    if (bpm === 0) return T.muted;
    if (bpm < 50) return T.purple;
    if (bpm < 100) return T.green;
    if (bpm < 130) return T.yellow;
    return T.orange;
}

function qualityColor(q) {
    if (q === 'excellent') return T.green;
    if (q === 'good') return T.cyan;
    if (q === 'fair') return T.yellow;
    return T.muted;
}

// ─── Animated BPM Ring ───────────────────────────────────────────────────────
function BPMRing({ bpm, quality }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;
    const color = bpmColor(bpm);

    useEffect(() => {
        if (bpm <= 0) return;
        const intervalMs = Math.round(60000 / Math.max(bpm, 30));
        const pulse = Animated.sequence([
            Animated.parallel([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 1.0, duration: 180, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(pulseAnim, { toValue: 1.0, duration: intervalMs - 200, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0.4, duration: intervalMs - 200, useNativeDriver: true }),
            ]),
        ]);
        const loop = Animated.loop(pulse);
        loop.start();
        return () => loop.stop();
    }, [bpm]);

    return (
        <View style={ring.wrap}>
            <Animated.View style={[ring.glow, { borderColor: color, opacity: glowAnim, shadowColor: color }]} />
            <Animated.View style={[ring.circle, { borderColor: color, transform: [{ scale: pulseAnim }], shadowColor: color }]}>
                <Text style={[ring.bpm, { color }]}>
                    {bpm > 0 ? Math.round(bpm) : '––'}
                </Text>
                <Text style={ring.bpmLabel}>BPM</Text>
            </Animated.View>
            <Text style={[ring.quality, { color: qualityColor(quality) }]}>
                {quality === 'excellent' ? '● Excellent' :
                    quality === 'good' ? '● Good' :
                        quality === 'fair' ? '● Fair' :
                            quality === 'poor' ? '● Poor' :
                                quality === 'warmup' ? '⏳ Collecting...' :
                                    '⏳ Place face in view'}
            </Text>
        </View>
    );
}

const ring = StyleSheet.create({
    wrap: { alignItems: 'center', paddingVertical: 24 },
    glow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 4, top: 20, shadowOffset: { width: 0, height: 0 }, shadowRadius: 30, shadowOpacity: 0.5 },
    circle: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.8 },
    bpm: { fontSize: 58, fontWeight: '900', lineHeight: 62 },
    bpmLabel: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 2, textTransform: 'uppercase' },
    quality: { marginTop: 14, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ points, color }) {
    if (!points || points.length < 3) {
        return (
            <View style={{ height: WF_H, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: T.muted, fontSize: 11 }}>
                    Warming up — keep face still ~10s
                </Text>
            </View>
        );
    }

    const pts = points.map((v, i) => {
        const x = (i / (points.length - 1)) * (W - 64);
        const y = WF_H / 2 - v * WF_H * 0.42;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
        <Svg width={W - 64} height={WF_H}>
            <Line x1={0} y1={WF_H / 2} x2={W - 64} y2={WF_H / 2}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <Polyline
                points={pts.join(' ')}
                fill="none" stroke={color}
                strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
            />
        </Svg>
    );
}

// ─── Health Inferences ─────────────────────────────────────────────────────────
function HealthInsights({ bpm, hrv, quality }) {
    if (quality === 'waiting' || quality === 'warmup') return null;

    let insightTitle = "Gathering Insights...";
    let insightDesc = "Keep still for a few more seconds to analyze your cardiovascular state.";
    let icon = "⏳";
    let color = T.muted;

    if (bpm > 0) {
        if (hrv > 60) {
            insightTitle = "Peak Readiness";
            insightDesc = "Your Heart Rate Variability is high. Your nervous system is fully recovered and primed for intense training.";
            icon = "🔋";
            color = T.cyan;
        } else if (hrv > 30) {
            insightTitle = "Moderate Fatigue";
            insightDesc = "Your HRV is balanced. You are ready for a normal workout, but pay attention to hydration and sleep.";
            icon = "⚖️";
            color = T.green;
        } else {
            insightTitle = "High Stress / Fatigue";
            insightDesc = "Low HRV detected. Your body is under stress. Consider active recovery, stretching, or a rest day.";
            icon = "⚠️";
            color = T.orange;
        }
    }

    return (
        <View style={s.insightCard}>
            <View style={s.insightHeader}>
                <Text style={s.insightTitle}>⚕️ CLINICAL INFERENCE</Text>
            </View>
            <View style={s.insightBody}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[s.insightHeading, { color }]}>{insightTitle}</Text>
                    <Text style={s.insightText}>{insightDesc}</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function Stat({ label, value, unit, color = T.text, icon }) {
    return (
        <View style={st.pill}>
            {icon ? <Text style={st.icon}>{icon}</Text> : null}
            <Text style={[st.val, { color }]}>{value}</Text>
            {unit ? <Text style={st.unit}>{unit}</Text> : null}
            <Text style={st.label}>{label}</Text>
        </View>
    );
}
const st = StyleSheet.create({
    pill: { backgroundColor: T.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: T.border, minWidth: 80 },
    icon: { fontSize: 16, marginBottom: 4 },
    val: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
    unit: { fontSize: 9, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 1 },
    label: { fontSize: 9, fontWeight: '700', color: T.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RPPGScreen({ navigation, route }) {
    const sessionId = route?.params?.sessionId || `rppg_${Date.now()}`;

    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const runningRef = useRef(false);
    const mountedRef = useRef(true);
    const captureIntervalRef = useRef(null);

    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('waiting');
    const [waveform, setWave] = useState([]);
    const [isRunning, setRunning] = useState(false);
    const [fps, setFps] = useState(0);
    const [framesIn, setFrames] = useState(0);
    const [errMsg, setErr] = useState('');
    const [history, setHistory] = useState([]);
    const [frameFlash, setFrameFlash] = useState(false);
    const wsRef = useRef(null);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            runningRef.current = false;
            stopCapture();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    // ── Periodic frame capture (Expo Go compatible, ~5fps) ────────────────────
    const startCapture = useCallback(() => {
        captureIntervalRef.current = setInterval(async () => {
            if (!runningRef.current || !cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.15,
                    exif: false,
                    skipProcessing: true,
                });
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && photo?.base64) {
                    wsRef.current.send(JSON.stringify({
                        face_found: true,
                        image_b64: photo.base64,
                        ts: Date.now() / 1000.0,
                    }));
                    setFrameFlash(true);
                    setTimeout(() => setFrameFlash(false), 150);
                    setFrames(prev => prev + 1);
                }
            } catch (_) {
                // Camera busy or not ready — skip frame
            }
        }, 200); // 5 fps
    }, []);

    const stopCapture = useCallback(() => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
    }, []);

    const startMeasuring = useCallback(() => {
        if (runningRef.current) return;
        runningRef.current = true;
        setRunning(true);
        setErr('');
        setFrames(0);

        wsRef.current = api.connectRPPGLiveStream(
            sessionId,
            (result) => {
                if (!mountedRef.current) return;

                const now = Date.now();
                if (now - lastUpdateRef.current < 100) return;
                lastUpdateRef.current = now;

                if (result.bpm > 0 && result.status !== 'warmup') {
                    setBpm(result.bpm);
                    setHistory(prev => {
                        const line = { t: new Date().toLocaleTimeString(), bpm: result.bpm };
                        return [...prev, line].slice(-20);
                    });
                }
                setHrv(result.hrv_ms ?? 0);
                setQuality(result.signal_quality ?? 'waiting');
                setFps(result.fps ?? 0);
                if (result.waveform?.length > 2) setWave(result.waveform);
                if (result.error) setErr(result.error);
            },
            (error) => setErr('WebSocket Error. Ensure Backend is running.'),
            () => { if (runningRef.current) setErr('Stream disconnected.'); }
        );

        startCapture();
    }, [sessionId, startCapture]);

    const stopMeasuring = useCallback(() => {
        runningRef.current = false;
        setRunning(false);
        stopCapture();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, [stopCapture]);

    // ── Permission ────────────────────────────────────────────────────────────
    if (!permission) return <View style={s.bg} />;

    if (!permission.granted) {
        return (
            <SafeAreaView style={s.bg}>
                <StatusBar barStyle="light-content" backgroundColor={T.bg} />
                <View style={s.permWrap}>
                    <Text style={s.permIcon}>❤️</Text>
                    <Text style={s.permTitle}>Heart Rate Monitor</Text>
                    <Text style={s.permBody}>
                        Camera access is needed to detect subtle skin color changes (rPPG) for heart rate measurement.
                    </Text>
                    <TouchableOpacity style={s.grantBtn} onPress={requestPermission}>
                        <Text style={s.grantTxt}>Grant Camera Access</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const color = bpmColor(bpm);
    const wfColor = qualityColor(quality);

    return (
        <View style={s.bg}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* ── Top Half: Camera ── */}
            <View style={s.camWrap}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="front"
                />

                {/* Top Bar */}
                <SafeAreaView style={s.topBar}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => { stopMeasuring(); navigation?.goBack(); }}
                    >
                        <Text style={s.backTxt}>← Back</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <View style={s.liveIndicator}>
                        {isRunning && (
                            <Animated.View style={[s.signalPointer, { opacity: frameFlash ? 1 : 0.2 }]} />
                        )}
                        <Text style={s.liveTxt}>{isRunning ? 'LIVE' : 'READY'}</Text>
                        <View style={[s.liveDot, { backgroundColor: isRunning ? T.red : T.muted }]} />
                    </View>
                </SafeAreaView>

                {/* Face Target Brackets */}
                <View style={s.faceGuide} pointerEvents="none">
                    <View style={[s.corner, s.tl, { borderColor: 'rgba(255,255,255,0.4)' }]} />
                    <View style={[s.corner, s.tr, { borderColor: 'rgba(255,255,255,0.4)' }]} />
                    <View style={[s.corner, s.bl, { borderColor: 'rgba(255,255,255,0.4)' }]} />
                    <View style={[s.corner, s.br, { borderColor: 'rgba(255,255,255,0.4)' }]} />
                </View>
                <Text style={[s.faceLabel, { color: 'rgba(255,255,255,0.7)', bottom: 20, position: 'absolute', alignSelf: 'center' }]}>
                    Center your face here
                </Text>
            </View>

            {/* ── Bottom Half: Dashboard ── */}
            <ScrollView style={s.dashboard} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={s.dashHeader}>
                    <Text style={s.dashTitle}>Vitals Monitor</Text>
                    <Text style={s.dashSub}>Remote Photoplethysmography (rPPG)</Text>
                </View>

                <View style={s.metricsCore}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <BPMRing bpm={bpm} quality={quality} />
                    </View>
                    <View style={s.sideStats}>
                        <Stat icon="💓" label="HRV" value={hrv > 0 ? hrv.toFixed(0) : '–'} unit="ms" color={T.purple} />
                        <Stat icon="📡" label="Signal" value={
                            quality === 'excellent' ? 'Opt' :
                                quality === 'good' ? 'Good' :
                                    quality === 'fair' ? 'Fair' : 'Poor'
                        } color={wfColor} />
                    </View>
                </View>

                {errMsg ? (
                    <View style={s.errBanner}>
                        <Text style={s.errTxt}>⚠️ {errMsg}</Text>
                    </View>
                ) : null}

                <View style={s.wfBox}>
                    <Text style={s.wfLabel}>BVP Waveform</Text>
                    <Waveform points={waveform} color={wfColor} />
                </View>

                {bpm > 0 && <HealthInsights bpm={bpm} hrv={hrv} quality={quality} />}

                <View style={s.fabWrap}>
                    {!isRunning ? (
                        <TouchableOpacity style={[s.fab, { backgroundColor: T.cyan }]} onPress={startMeasuring} activeOpacity={0.85}>
                            <Text style={s.fabTxt}>START SCAN</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[s.fab, { backgroundColor: T.red }]} onPress={stopMeasuring} activeOpacity={0.85}>
                            <Text style={s.fabTxt}>STOP SCAN</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#000' },

    // Permission
    permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    permIcon: { fontSize: 52, marginBottom: 16 },
    permTitle: { fontSize: 22, fontWeight: '900', color: T.text, marginBottom: 10 },
    permBody: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    grantBtn: { backgroundColor: T.cyan, borderRadius: 14, paddingHorizontal: 30, paddingVertical: 13 },
    grantTxt: { color: '#000', fontWeight: '900', fontSize: 14 },

    // Layout
    camWrap: { flex: 0.45, backgroundColor: '#111', overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    dashboard: { flex: 0.55, backgroundColor: T.surf, paddingHorizontal: 20, paddingTop: 20 },

    // Top Bar (over camera)
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    backTxt: { color: T.text, fontWeight: '700', fontSize: 13 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    liveTxt: { color: T.text, fontSize: 10, fontWeight: '800', marginRight: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    signalPointer: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.cyan, marginRight: 8, elevation: 4 },

    // Face Guide
    faceGuide: { position: 'absolute', top: '25%', left: '25%', right: '25%', height: '50%' },
    corner: { position: 'absolute', width: 20, height: 20 },
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
    faceLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Dashboard Header
    dashHeader: { marginBottom: 16 },
    dashTitle: { fontSize: 22, fontWeight: '900', color: T.text },
    dashSub: { fontSize: 12, color: T.muted, fontWeight: '600', marginTop: 2 },

    // Metrics Core
    metricsCore: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border },
    sideStats: { width: 100, gap: 10 },

    // Waveform Box
    wfBox: { backgroundColor: T.card, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.border },
    wfLabel: { color: T.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

    // Errors
    errBanner: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    errTxt: { color: T.red, fontSize: 12, fontWeight: '700', textAlign: 'center' },

    // Insights
    insightCard: { backgroundColor: T.card, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.border },
    insightHeader: { marginBottom: 10 },
    insightTitle: { color: T.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    insightBody: { flexDirection: 'row', alignItems: 'center' },
    insightHeading: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
    insightText: { fontSize: 11, color: T.text, lineHeight: 16 },

    // Action FAB
    fabWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 20 },
    fab: { borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, shadowOpacity: 0.3, elevation: 6 },
    fabTxt: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});
