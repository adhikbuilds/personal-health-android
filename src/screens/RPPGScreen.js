/**
 * RPPGScreen — Heart Rate via Camera (Production)
 *
 * How it works:
 * 1. Camera captures a photo every 500ms (2fps — enough for rPPG)
 * 2. Photo is sent to backend as tiny JPEG
 * 3. Backend runs face detection, extracts skin RGB, computes BPM
 * 4. Results stream back via WebSocket
 *
 * User experience:
 * - Clear states: READY → SCANNING → MEASURING → RESULT
 * - Face lost detection
 * - Stop and back ALWAYS work
 */

import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated, StatusBar,
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
    if (bpm <= 0) return '#4b5563';
    if (bpm < 60) return '#a855f7';
    if (bpm < 100) return '#22c55e';
    if (bpm < 130) return '#f97316';
    return '#ef4444';
}

// ── Pulsing BPM ─────────────────────────────────────────────────────────────

function PulsingBPM({ bpm }) {
    const scale = useRef(new Animated.Value(1)).current;
    const color = bpmColor(bpm);
    useEffect(() => {
        if (bpm <= 0) return;
        const ms = Math.round(60000 / Math.max(bpm, 40));
        const anim = Animated.loop(Animated.sequence([
            Animated.timing(scale, { toValue: 1.04, duration: 120, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: ms - 150, useNativeDriver: true }),
        ]));
        anim.start();
        return () => anim.stop();
    }, [bpm]);
    return (
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Text style={[$.bigBpm, { color }]}>{bpm > 0 ? Math.round(bpm) : '——'}</Text>
            <Text style={$.bpmLabel}>BPM</Text>
        </Animated.View>
    );
}

// ── Waveform ────────────────────────────────────────────────────────────────

function Waveform({ points, color }) {
    if (!points || points.length < 3) return null;
    const w = W - 48;
    const pts = points.map((v, i) => `${(i / (points.length - 1) * w).toFixed(1)},${(30 - v * 25).toFixed(1)}`);
    return (
        <View style={{ marginVertical: 12 }}>
            <Text style={$.miniLabel}>PULSE WAVE</Text>
            <Svg width={w} height={60}>
                <Line x1={0} y1={30} x2={w} y2={30} stroke="#111" strokeWidth={1} />
                <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
            </Svg>
        </View>
    );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function RPPGScreen({ navigation, route }) {
    const ins = useSafeAreaInsets();
    const sessionId = route?.params?.sessionId || `rppg_${Date.now()}`;
    const [permission, requestPermission] = useCameraPermissions();

    const cameraRef = useRef(null);
    const wsRef = useRef(null);
    const timerRef = useRef(null);
    const aliveRef = useRef(true);
    const scanningRef = useRef(false);

    const [scanning, setScanning] = useState(false);
    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('ready');
    const [waveform, setWave] = useState([]);
    const [frames, setFrames] = useState(0);
    const [error, setError] = useState('');

    // Cleanup everything
    function kill() {
        scanningRef.current = false;
        const t = timerRef.current;
        const w = wsRef.current;
        timerRef.current = null;
        wsRef.current = null;
        if (t) clearInterval(t);
        if (w) try { w.close(); } catch (_) {}
    }

    useEffect(() => {
        aliveRef.current = true;
        return () => { aliveRef.current = false; kill(); };
    }, []);

    function start() {
        if (scanningRef.current) return;
        kill();
        scanningRef.current = true;
        setScanning(true);
        setError('');
        setFrames(0);
        setBpm(0);
        setHrv(0);
        setWave([]);
        setQuality('warmup');

        // Connect WebSocket
        const ws = api.connectRPPGLiveStream(
            sessionId,
            (r) => {
                if (!aliveRef.current || !scanningRef.current) return;
                if (r.bpm > 0 && r.status !== 'warmup') {
                    setBpm(r.bpm);
                    setQuality(r.signal_quality || 'measuring');
                } else if (r.status === 'warmup') {
                    setQuality('warmup');
                }
                if (r.signal_quality === 'no_pulse' || r.signal_quality === 'no_face') {
                    setQuality('no_face');
                }
                setHrv(r.hrv_ms ?? 0);
                if (r.waveform?.length > 2) setWave(r.waveform);
                if (r.error) setError(r.error);
            },
            () => { if (scanningRef.current) { setError('Backend not connected'); stop(); } },
            () => { if (scanningRef.current) { setError('Connection lost'); stop(); } },
        );
        wsRef.current = ws;

        // Capture photos at 2fps (every 500ms) — enough for rPPG
        const timer = setInterval(async () => {
            if (!scanningRef.current || !cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.05,        // tiny — face detection only needs rough colors
                    skipProcessing: false,
                });
                if (!scanningRef.current) return;
                const currentWs = wsRef.current;
                if (currentWs && currentWs.readyState === 1 && photo?.base64) {
                    currentWs.send(JSON.stringify({
                        face_found: true,
                        image_b64: photo.base64,
                        ts: Date.now() / 1000,
                    }));
                    if (aliveRef.current) setFrames(n => n + 1);
                }
            } catch (_) {}
        }, 500);
        timerRef.current = timer;
    }

    function stop() {
        kill();
        setScanning(false);
    }

    function handleBack() {
        kill();
        setScanning(false);
        // Wait one frame for camera to unmount
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (navigation?.canGoBack()) navigation.goBack();
            });
        });
    }

    // ── Permission ──
    if (!permission) return <View style={$.root} />;
    if (!permission.granted) {
        return (
            <View style={[$.root, { paddingTop: ins.top, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <Text style={$.permTitle}>HEART RATE</Text>
                <Text style={$.permSub}>Camera detects subtle skin color changes to measure your pulse</Text>
                <Tap onPress={requestPermission}>
                    <LinearGradient colors={['#7f1d1d', '#dc2626']} style={$.ctaBtn}><Text style={$.ctaText}>ALLOW CAMERA</Text></LinearGradient>
                </Tap>
            </View>
        );
    }

    const color = bpmColor(bpm);
    const stressLabel = hrv > 60 ? 'LOW' : hrv > 30 ? 'MODERATE' : hrv > 0 ? 'HIGH' : '—';
    const stressColor = hrv > 60 ? '#22c55e' : hrv > 30 ? '#f97316' : hrv > 0 ? '#ef4444' : '#4b5563';
    const recovery = bpm > 0 && hrv > 0 ? Math.round(Math.max(0, Math.min(100, (hrv * 1.2) * 0.6 + (100 - Math.abs(bpm - 65) * 1.5) * 0.4))) : 0;

    const statusText = quality === 'ready' ? 'Tap START to begin'
        : quality === 'warmup' ? `Warming up... ${frames} samples`
        : quality === 'no_face' ? 'Face not detected — center your face'
        : quality === 'no_pulse' ? 'Hold still — no pulse signal'
        : quality === 'poor' ? 'Poor signal — improve lighting'
        : bpm > 0 ? 'Measuring' : 'Processing...';

    return (
        <View style={[$.root, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Camera */}
            <View style={$.cam}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
                <View style={$.camTop}>
                    <Tap onPress={handleBack} style={$.backBtn}><Text style={$.backText}>{'‹'}</Text></Tap>
                    {scanning && <View style={$.liveBadge}><View style={$.liveDot} /><Text style={$.liveText}>LIVE</Text></View>}
                </View>
                {/* Face guide */}
                <View style={$.guide} pointerEvents="none">
                    <View style={[$.c, $.c1]} /><View style={[$.c, $.c2]} />
                    <View style={[$.c, $.c3]} /><View style={[$.c, $.c4]} />
                </View>
                {/* Status */}
                <Text style={[$.camStatus, { color: quality === 'no_face' ? '#ef4444' : quality === 'warmup' ? '#f97316' : '#9ca3af' }]}>
                    {statusText}
                </Text>
            </View>

            {/* Vitals */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: ins.bottom + 80 }} showsVerticalScrollIndicator={false}>
                <PulsingBPM bpm={bpm} />

                <View style={$.metricsRow}>
                    <View style={$.metric}>
                        <Text style={[$.metricVal, { color: '#a855f7' }]}>{hrv > 0 ? hrv.toFixed(0) : '—'}</Text>
                        <Text style={$.metricKey}>HRV ms</Text>
                    </View>
                    <View style={$.metricDiv} />
                    <View style={$.metric}>
                        <Text style={[$.metricVal, { color: stressColor }]}>{stressLabel}</Text>
                        <Text style={$.metricKey}>STRESS</Text>
                    </View>
                    <View style={$.metricDiv} />
                    <View style={$.metric}>
                        <Text style={[$.metricVal, { color: recovery > 60 ? '#22c55e' : '#f97316' }]}>{recovery > 0 ? `${recovery}%` : '—'}</Text>
                        <Text style={$.metricKey}>RECOVERY</Text>
                    </View>
                </View>

                <Waveform points={waveform} color={color} />

                {bpm > 0 && (
                    <Fade>
                        <Text style={$.miniLabel}>INSIGHT</Text>
                        <Text style={$.insightText}>
                            {hrv > 60 ? "Strong recovery. Ready for intense training."
                                : hrv > 30 ? "Normal state. Good for regular training."
                                : "Elevated stress. Consider light recovery work."}
                        </Text>
                    </Fade>
                )}

                {error ? <Text style={$.errorText}>{error}</Text> : null}
            </ScrollView>

            {/* Fixed button */}
            <View style={[$.bottomBar, { paddingBottom: ins.bottom + 12 }]}>
                <Tap onPress={scanning ? stop : start}>
                    <LinearGradient
                        colors={scanning ? ['#7f1d1d', '#dc2626'] : ['#0c4a6e', '#0891b2']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={$.bottomBtn}
                    >
                        <Text style={$.bottomBtnText}>{scanning ? 'STOP' : 'START SCAN'}</Text>
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
    permSub: { fontSize: 13, color: '#4b5563', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
    ctaBtn: { borderRadius: 6, paddingVertical: 16, paddingHorizontal: 40 },
    ctaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3, fontFamily: CONDENSED },

    // Camera
    cam: { height: 260, backgroundColor: '#111', overflow: 'hidden' },
    camTop: { position: 'absolute', top: 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    backText: { color: '#fff', fontSize: 22, fontWeight: '300', marginTop: -2 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginRight: 6 },
    liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // Face guide
    guide: { position: 'absolute', top: '18%', left: '30%', right: '30%', height: '64%' },
    c: { position: 'absolute', width: 18, height: 18, borderColor: 'rgba(255,255,255,0.25)' },
    c1: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
    c2: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
    c3: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
    c4: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

    camStatus: { position: 'absolute', bottom: 12, alignSelf: 'center', fontSize: 11, fontWeight: '600' },

    // BPM
    bigBpm: { fontSize: 72, fontWeight: '900', fontFamily: CONDENSED, textAlign: 'center', marginTop: 8 },
    bpmLabel: { fontSize: 10, fontWeight: '700', color: '#4b5563', letterSpacing: 3, textAlign: 'center', marginBottom: 20 },

    // Metrics
    metricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    metric: { alignItems: 'center', paddingHorizontal: 20 },
    metricVal: { fontSize: 18, fontWeight: '800', fontFamily: MONO },
    metricKey: { fontSize: 9, fontWeight: '600', color: '#4b5563', letterSpacing: 2, marginTop: 4 },
    metricDiv: { width: 1, height: 28, backgroundColor: '#1a1a1a' },

    // Misc
    miniLabel: { fontSize: 10, fontWeight: '800', color: '#374151', letterSpacing: 2, marginBottom: 8 },
    insightText: { fontSize: 13, color: '#9ca3af', lineHeight: 20, marginBottom: 16 },
    errorText: { color: '#ef4444', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },

    // Bottom
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.95)' },
    bottomBtn: { borderRadius: 6, paddingVertical: 16, alignItems: 'center',
        ...Platform.select({ android: { elevation: 8 }, ios: { shadowColor: '#06b6d4', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 } }),
    },
    bottomBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 3, fontFamily: CONDENSED },
});
