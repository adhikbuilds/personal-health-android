/**
 * RPPGScreen — Real-time Heart Rate via Camera (rPPG)
 * ─────────────────────────────────────────────────────
 * Fixed capture loop: uses async sequential loop (not setInterval)
 * so frames never overlap. Each frame waits for the previous to complete.
 *
 * Algorithm (server-side CHROM):
 *   Face ROI → R/G/B means → bandpass 40-180 BPM → FFT → BPM + HRV
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Dimensions, Animated, Easing, StatusBar,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import Svg, { Polyline, Line } from 'react-native-svg';
import api from '../services/api';

const { width: W, height: H } = Dimensions.get('window');
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
            {/* Outer glow ring */}
            <Animated.View style={[ring.glow, { borderColor: color, opacity: glowAnim, shadowColor: color }]} />
            {/* Main ring */}
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

    const [permission, setPermission] = useState(null);
    const cameraRef = useRef(null);
    const runningRef = useRef(false);
    const mountedRef = useRef(true);

    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('waiting');
    const [waveform, setWave] = useState([]);
    const [faceFound, setFace] = useState(false);
    const [isRunning, setRunning] = useState(false);
    const [framesIn, setFrames] = useState(0);
    const [fps, setFps] = useState(0);
    const [errMsg, setErr] = useState('');
    const [history, setHistory] = useState([]);
    const [frameFlash, setFrameFlash] = useState(0); // For signal pointer

    useEffect(() => {
        mountedRef.current = true;
        // Request camera permission on mount (replaces the old useCameraPermissions hook)
        Camera.requestCameraPermissionsAsync().then(({ status }) => {
            if (mountedRef.current) setPermission({ granted: status === 'granted' });
        });
        return () => {
            mountedRef.current = false;
            runningRef.current = false;
        };
    }, []);

    // ── Sequential capture loop — paced to ~4fps max ───────────────────────────
    const captureLoop = useCallback(async () => {
        const MIN_FRAME_MS = 120; // never faster than 120ms (~8fps ceiling) to keep Android stable
        while (runningRef.current && mountedRef.current) {
            if (!cameraRef.current) {
                await sleep(300);
                continue;
            }

            const frameStart = Date.now();
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.08,
                    skipProcessing: true,
                    exif: false,
                    shutterSound: false, // Prevents Android native white flash/sound
                });

                if (!mountedRef.current || !runningRef.current) break;

                if (!photo?.base64) {
                    setErr('Camera returned empty frame');
                    await sleep(500);
                    continue;
                }

                // Trigger visual signal pointer
                setFrameFlash(Date.now());

                const resp = await api.sendRPPGFrame(sessionId, photo.base64, Date.now() / 1000);

                if (!mountedRef.current || !runningRef.current) break;

                if (!resp) {
                    setErr('API unreachable — ensure api_server.py + proxy-server.js are running');
                    await sleep(1000);
                    continue;
                }

                setErr('');
                const { frame, result } = resp;

                if (frame) setFace(!!frame.face_found);

                if (result) {
                    if (result.bpm > 0) {
                        setBpm(result.bpm);
                        setHistory(prev => {
                            const line = { t: new Date().toLocaleTimeString(), bpm: result.bpm };
                            return [...prev, line].slice(-20);
                        });
                    }
                    setHrv(result.hrv_ms ?? 0);
                    setQuality(result.signal_quality ?? 'waiting');
                    setFps(result.fps ?? 0);
                    setFrames(result.frames_in_window ?? 0);
                    if (result.waveform?.length > 2) setWave(result.waveform);
                }
            } catch (e) {
                if (!mountedRef.current) break;
                setErr(`Capture error: ${e.message}`);
                await sleep(800);
            }

            // Pace to MIN_FRAME_MS — if round-trip was already slow, skip extra sleep
            const elapsed = Date.now() - frameStart;
            if (elapsed < MIN_FRAME_MS) await sleep(MIN_FRAME_MS - elapsed);
        }
    }, [sessionId]);

    const startMeasuring = useCallback(() => {
        if (runningRef.current) return;
        runningRef.current = true;
        setRunning(true);
        setErr('');
        captureLoop();
    }, [captureLoop]);

    const stopMeasuring = useCallback(() => {
        runningRef.current = false;
        setRunning(false);
    }, []);

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
                    <TouchableOpacity style={s.grantBtn} onPress={() => Camera.requestCameraPermissionsAsync().then(({ status }) => setPermission({ granted: status === 'granted' }))}>
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
            <StatusBar barStyle="light-content" backgroundColor={T.bg} />

            {/* ── Camera Preview (full width, fixed height) ── */}
            <View style={s.camWrap}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={'front'} />

                {/* Dark gradient scrim */}
                <View style={s.scrim} />

                {/* Back button */}
                <SafeAreaView style={s.topBar}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => { stopMeasuring(); navigation?.goBack(); }}
                    >
                        <Text style={s.backTxt}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={s.screenTitle}>Heart Rate</Text>
                    {/* Live status dot */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isRunning && (
                            <Animated.View style={[s.signalPointer, { opacity: frameFlash ? 1 : 0.2 }]} />
                        )}
                        <View style={[s.liveDot, { backgroundColor: isRunning ? T.red : T.muted }]} />
                    </View>
                </SafeAreaView>

                {/* Face lock brackets */}
                <View style={s.faceGuide} pointerEvents="none">
                    <View style={[s.corner, s.tl, { borderColor: faceFound ? T.green : 'rgba(255,255,255,0.25)' }]} />
                    <View style={[s.corner, s.tr, { borderColor: faceFound ? T.green : 'rgba(255,255,255,0.25)' }]} />
                    <View style={[s.corner, s.bl, { borderColor: faceFound ? T.green : 'rgba(255,255,255,0.25)' }]} />
                    <View style={[s.corner, s.br, { borderColor: faceFound ? T.green : 'rgba(255,255,255,0.25)' }]} />
                    <Text style={[s.faceLabel, { color: faceFound ? T.green : 'rgba(255,255,255,0.4)' }]}>
                        {faceFound ? '✓ Face locked' : 'Center your face'}
                    </Text>
                </View>

                {/* Start / Stop FAB */}
                <View style={s.fabWrap}>
                    {!isRunning ? (
                        <TouchableOpacity style={[s.fab, { backgroundColor: T.cyan }]} onPress={startMeasuring} activeOpacity={0.85}>
                            <Text style={s.fabTxt}>▶  Start Measuring</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[s.fab, { backgroundColor: 'rgba(239,68,68,0.9)' }]} onPress={stopMeasuring} activeOpacity={0.85}>
                            <Text style={s.fabTxt}>■  Stop</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── BPM Ring + Stats ── */}
            <View style={s.content}>
                <BPMRing bpm={bpm} quality={quality} />

                {/* Stats row */}
                <View style={s.statsRow}>
                    <Stat icon="💓" label="HRV" value={hrv > 0 ? hrv.toFixed(0) : '–'} unit="ms" color={T.purple} />
                    <View style={{ width: 10 }} />
                    <Stat icon="📊" label="Frames" value={framesIn || '–'} unit={fps > 0 ? `${fps.toFixed(0)} fps` : ''} color={T.cyan} />
                    <View style={{ width: 10 }} />
                    <Stat icon="📡" label="Signal" value={
                        quality === 'excellent' ? '●●●●' :
                            quality === 'good' ? '●●●○' :
                                quality === 'fair' ? '●●○○' : '●○○○'
                    } color={wfColor} />
                </View>

                {/* Error banner */}
                {errMsg ? (
                    <View style={s.errBanner}>
                        <Text style={s.errTxt}>⚠️  {errMsg}</Text>
                    </View>
                ) : null}

                {/* Waveform */}
                <View style={s.wfCard}>
                    <View style={s.wfHeader}>
                        <Text style={s.wfTitle}>Blood Volume Pulse</Text>
                        <Text style={s.wfSub}>CHROM · bandpass 40–180 BPM</Text>
                    </View>
                    <Waveform points={waveform} color={wfColor} />
                </View>

                {/* History */}
                {history.length > 0 && (
                    <View style={s.histCard}>
                        <Text style={s.wfTitle}>Recent Readings</Text>
                        <View style={s.histRow}>
                            {history.slice(-8).map((h, i) => (
                                <View key={i} style={s.histChip}>
                                    <Text style={[s.histBpm, { color: bpmColor(h.bpm) }]}>
                                        {Math.round(h.bpm)}
                                    </Text>
                                    <Text style={s.histTime}>{h.t.slice(0, 5)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

// Helper
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    bg: { flex: 1, backgroundColor: T.bg },
    // Permission
    permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    permIcon: { fontSize: 52, marginBottom: 16 },
    permTitle: { fontSize: 22, fontWeight: '900', color: T.text, marginBottom: 10 },
    permBody: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    grantBtn: { backgroundColor: T.cyan, borderRadius: 14, paddingHorizontal: 30, paddingVertical: 13 },
    grantTxt: { color: '#000', fontWeight: '900', fontSize: 14 },
    // Camera
    camWrap: { width: '100%', height: H * 0.38, backgroundColor: '#000', position: 'relative' },
    scrim: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
        backgroundColor: T.bg,
        // gradient-like fade via overlapping views
    },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    backTxt: { color: T.text, fontWeight: '700', fontSize: 13 },
    screenTitle: { flex: 1, textAlign: 'center', color: T.text, fontWeight: '800', fontSize: 16 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    signalPointer: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.cyan, marginRight: 8, elevation: 4, shadowColor: T.cyan, shadowRadius: 4, shadowOpacity: 0.8 },
    faceGuide: { position: 'absolute', top: '10%', left: '22%', right: '22%', bottom: '25%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
    corner: { position: 'absolute', width: 22, height: 22 },
    tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
    tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
    br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
    faceLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    fabWrap: { position: 'absolute', bottom: 16, left: 20, right: 20 },
    fab: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.4, elevation: 8 },
    fabTxt: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    // Content
    content: { flex: 1, paddingHorizontal: 20 },
    statsRow: { flexDirection: 'row', marginBottom: 12 },
    errBanner: { backgroundColor: 'rgba(239,68,68,0.10)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
    errTxt: { color: T.orange, fontSize: 11, fontWeight: '700' },
    wfCard: { backgroundColor: T.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: T.border },
    wfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    wfTitle: { color: T.text, fontWeight: '800', fontSize: 12 },
    wfSub: { color: T.muted, fontSize: 9, fontWeight: '700' },
    histCard: { backgroundColor: T.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border },
    histRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    histChip: { backgroundColor: T.surf, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
    histBpm: { fontSize: 16, fontWeight: '900' },
    histTime: { fontSize: 8, color: T.muted, fontWeight: '700', marginTop: 2 },
});
