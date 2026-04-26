// RPPGScreen — Bloomberg terminal.
// Heart rate via finger-on-lens PPG. Native CameraX at 30fps (primary) or
// expo-camera fallback. Frames → backend WS → CHROM rPPG → BPM/HRV.

import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, StatusBar, Animated, Pressable, ActivityIndicator,
    NativeModules, NativeEventEmitter, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

import { C, T } from '../styles/colors';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, nowISO,
} from '../components/terminal';

const MEASUREMENT_DURATION_MS = 15000;

let RPPGStream = null;
let RPPGEmitter = null;
try {
    RPPGStream = NativeModules.RPPGStream;
    if (RPPGStream) {
        RPPGEmitter = new NativeEventEmitter(RPPGStream);
    }
} catch (e) {
    console.warn('[RPPGScreen] Native RPPGStream not available:', e?.message);
}

function bpmColor(b) {
    if (b <= 0) return C.muted;
    if (b < 60) return C.info;
    if (b < 100) return C.good;
    if (b < 130) return C.warn;
    return C.bad;
}

function zoneCode(bpm) {
    if (bpm <= 0) return '--';
    if (bpm < 60) return 'LOW';
    if (bpm < 80) return 'REST';
    if (bpm < 100) return 'NORMAL';
    if (bpm < 130) return 'ELEV';
    if (bpm < 160) return 'CARDIO';
    return 'PEAK';
}

function qualityCode(q) {
    const c = String(q || '').toUpperCase();
    if (c === 'EXCELLENT') return { label: 'EXCELLENT', color: C.good };
    if (c === 'GOOD')      return { label: 'GOOD',      color: C.good };
    if (c === 'FAIR')      return { label: 'FAIR',      color: C.warn };
    if (c === 'POOR')      return { label: 'POOR',      color: C.bad };
    if (c === 'WARMUP')    return { label: 'WARMUP',    color: C.info };
    if (c === 'NO_PULSE')  return { label: 'NO PULSE',  color: C.bad };
    if (c === 'INVALID')   return { label: 'INVALID',   color: C.bad };
    if (c === 'NO_FACE')   return { label: 'NO FACE',   color: C.warn };
    return { label: q ? c : 'IDLE', color: C.textMid };
}

function hrvStatus(ms) {
    if (ms <= 0) return { label: '--', color: C.muted, hint: '' };
    if (ms < 20) return { label: 'LOW', color: C.bad, hint: 'HIGH STRESS' };
    if (ms < 50) return { label: 'NORMAL', color: C.good, hint: 'BALANCED' };
    if (ms < 100) return { label: 'HIGH', color: C.info, hint: 'RECOVERED' };
    return { label: 'V.HIGH', color: C.info, hint: 'DEEP RECOVERY' };
}

function ProgressRing({ progress, size = 100, strokeWidth = 4, color }) {
    const leftRotation = progress <= 50
        ? `${-180 + (progress / 50) * 180}deg`
        : '0deg';
    const rightRotation = progress > 50
        ? `${-180 + ((progress - 50) / 50) * 180}deg`
        : '-180deg';

    return (
        <View style={{ width: size, height: size }}>
            <View style={{
                position: 'absolute', width: size, height: size,
                borderRadius: size / 2, borderWidth: strokeWidth,
                borderColor: C.border,
            }} />
            <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
                <View style={{
                    width: size, height: size, borderRadius: size / 2,
                    borderWidth: strokeWidth, borderColor: color,
                    borderRightColor: 'transparent', borderBottomColor: 'transparent',
                    transform: [{ rotate: leftRotation }],
                }} />
            </View>
            <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
                <View style={{
                    width: size, height: size, borderRadius: size / 2,
                    borderWidth: strokeWidth, borderColor: color,
                    borderLeftColor: 'transparent', borderTopColor: 'transparent',
                    transform: [{ rotate: rightRotation }],
                    left: -(size / 2),
                }} />
            </View>
        </View>
    );
}

export default function RPPGScreen({ navigation, route }) {
    const ins = useSafeAreaInsets();
    const clock = useLiveClock();
    const sid = route?.params?.sessionId || `rppg_${Date.now()}`;
    const [perm, askPerm] = useCameraPermissions();
    const camRef = useRef(null);
    const wsRef = useRef(null);
    const timerRef = useRef(null);
    const aliveRef = useRef(true);
    const scanRef = useRef(false);
    const resultSubRef = useRef(null);
    const errorSubRef = useRef(null);
    const usingNativeRef = useRef(false);
    const startedAtRef = useRef(0);
    const measurementCompleteRef = useRef(false);

    const [scanning, setScanning] = useState(false);
    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('');
    const [samples, setSamples] = useState(0);
    const [fingerOn, setFingerOn] = useState(false);
    const [err, setErr] = useState('');
    const [startedAt, setStartedAt] = useState(0);
    const [waveform, setWaveform] = useState([]);
    const [progress, setProgress] = useState(0);
    const [bpmHistory, setBpmHistory] = useState([]);
    const [measurementComplete, setMeasurementComplete] = useState(false);
    const [saved, setSaved] = useState(false);

    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (bpm <= 0) return;
        const ms = Math.max(250, Math.round(60000 / bpm));
        const a = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1.05, duration: 90, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: ms - 120, useNativeDriver: true }),
        ]));
        a.start();
        return () => a.stop();
    }, [bpm]);

    useEffect(() => {
        aliveRef.current = true;
        return () => { aliveRef.current = false; stop(); };
    }, []);

    function handleResult(r) {
        if (!aliveRef.current || !scanRef.current) return;
        const sq = (r.signal_quality || '').toLowerCase();
        const reliable = sq === 'fair' || sq === 'good' || sq === 'excellent';

        if (r.bpm > 0 && reliable) {
            setBpm(r.bpm);
            setBpmHistory(prev => [...prev.slice(-29), r.bpm]);
        }
        setHrv(r.hrv_ms ?? 0);
        setQuality(r.signal_quality || '');
        setFingerOn(sq !== 'no_pulse' && sq !== 'no_face' && r.status !== 'invalid');
        if (r.waveform) setWaveform(r.waveform);

        const elapsed = Date.now() - startedAtRef.current;
        const timeProgress = Math.min(100, (elapsed / MEASUREMENT_DURATION_MS) * 100);
        setProgress(Math.round(timeProgress));

        if (timeProgress >= 100 && !measurementCompleteRef.current && r.bpm > 0 && reliable) {
            measurementCompleteRef.current = true;
            setMeasurementComplete(true);
        }
    }

    function stop() {
        scanRef.current = false;
        if (resultSubRef.current) { resultSubRef.current.remove(); resultSubRef.current = null; }
        if (errorSubRef.current) { errorSubRef.current.remove(); errorSubRef.current = null; }
        if (usingNativeRef.current && RPPGStream) {
            RPPGStream.stop().catch(() => {});
            usingNativeRef.current = false;
        }
        const t = timerRef.current;
        const w = wsRef.current;
        timerRef.current = null;
        wsRef.current = null;
        if (t) clearInterval(t);
        if (w) try { w.close(); } catch (_) {}
        setScanning(false);
        setProgress(0);
        setMeasurementComplete(false);
        measurementCompleteRef.current = false;
        setSaved(false);
        setBpmHistory([]);
    }

    function startFallback() {
        const w = api.connectRPPGLiveStream(sid,
            handleResult,
            () => { setErr('WS CONNECT FAILED'); stop(); },
            () => { if (scanRef.current) { setErr('WS DROPPED'); stop(); } },
        );
        wsRef.current = w;

        const t = setInterval(async () => {
            if (!scanRef.current || !camRef.current) return;
            try {
                const p = await camRef.current.takePictureAsync({
                    base64: true, quality: 0.3,
                    shutterSound: false, animateShutter: false, skipProcessing: true,
                });
                if (!scanRef.current || !wsRef.current) return;
                if (wsRef.current.readyState === 1 && p?.base64) {
                    wsRef.current.send(JSON.stringify({
                        image_b64: p.base64,
                        ts: Date.now() / 1000,
                    }));
                    if (aliveRef.current) setSamples(c => c + 1);
                }
            } catch (_) {}
        }, 100);
        timerRef.current = t;
    }

    function start() {
        if (scanRef.current) return;
        stop();
        scanRef.current = true;
        setScanning(true);
        setErr('');
        setSamples(0);
        setBpm(0);
        setHrv(0);
        setFingerOn(false);
        setQuality('warmup');
        const now = Date.now();
        setStartedAt(now);
        startedAtRef.current = now;
        setWaveform([]);
        setProgress(0);
        setBpmHistory([]);
        setMeasurementComplete(false);
        measurementCompleteRef.current = false;
        setSaved(false);

        if (RPPGStream && RPPGEmitter) {
            const wsUrl = `${api.getWsBase()}/rppg/live-stream/${sid}`;

            resultSubRef.current = RPPGEmitter.addListener('onRPPGResult', (r) => {
                handleResult(r);
                setSamples(c => c + 1);
            });

            errorSubRef.current = RPPGEmitter.addListener('onRPPGError', (e) => {
                setErr(e.error || 'NATIVE ERROR');
                stop();
            });

            usingNativeRef.current = true;
            RPPGStream.start(sid, wsUrl)
                .then(() => console.log('[RPPGScreen] Native stream started'))
                .catch((e) => {
                    console.warn('[RPPGScreen] Native start failed, falling back:', e);
                    usingNativeRef.current = false;
                    startFallback();
                });
            return;
        }

        startFallback();
    }

    async function saveResult() {
        if (saved) return;
        try {
            await api.endSession(sid);
            setSaved(true);
        } catch (e) {
            console.warn('[RPPGScreen] Save failed:', e?.message);
        }
    }

    function handleBack() {
        stop();
        setTimeout(() => navigation?.canGoBack() && navigation.goBack(), 80);
    }

    const col = bpmColor(bpm);
    const zone = zoneCode(bpm);
    const q = qualityCode(quality);
    const h = hrvStatus(hrv);
    const elapsed = scanning && startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

    if (!perm) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={C.text} />
                <Text style={{ color: C.textMid, fontFamily: T.MONO, fontSize: 11, letterSpacing: 2, marginTop: 14, fontWeight: '700' }}>
                    REQUESTING CAMERA ACCESS...
                </Text>
            </View>
        );
    }
    if (!perm.granted) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity="RPPG.DEVICE" clock={clock} />
                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> rppg --init'}</Text>
                    <Text style={s.title}>CAMERA PERMISSION REQUIRED</Text>
                </View>
                <Panel>
                    <Header title="SENSOR ACCESS" />
                    <View style={{ padding: 14 }}>
                        <Text style={s.body}>
                            Place finger over back camera lens. Torch illuminates the fingertip;
                            camera captures red-channel intensity pulsing with blood flow at ~30 Hz.
                            Frames stream to backend for CHROM rPPG analysis.
                        </Text>
                    </View>
                </Panel>
                <Pressable onPress={askPerm} style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#111' }]}>
                    <Text style={[s.btnText, { color: C.bad }]}>[A] ALLOW CAMERA</Text>
                </Pressable>
                <Pressable onPress={handleBack} style={({ pressed }) => [s.btnSecondary, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnSecondaryText}>[ESC] RETURN</Text>
                </Pressable>
            </TerminalScreen>
        );
    }

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar
                online={scanning ? true : null}
                identity={`RPPG.${String(sid).slice(0, 10).toUpperCase()}`}
                clock={clock}
            />

            {/* Hidden camera — only needed for expo-camera fallback */}
            {scanning && !usingNativeRef.current && (
                <View style={{ position: 'absolute', top: -9999, left: -9999, width: 1, height: 1 }}>
                    <CameraView
                        ref={camRef}
                        style={{ width: 1, height: 1 }}
                        facing="back"
                        enableTorch={scanning}
                        animateShutter={false}
                    />
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 20 }}
            >
                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> rppg --live --session='}{String(sid).slice(0, 10)}</Text>
                    <Text style={s.title}>HEART RATE MONITOR</Text>
                </View>

                {/* Finger guidance */}
                {scanning && !fingerOn && (
                    <View style={s.fingerCue}>
                        <Text style={s.fingerCueTitle}>PLACE FINGER ON BACK CAMERA</Text>
                        <Text style={s.fingerCueBody}>
                            Cover both the camera lens and flash completely.{'\n'}
                            Hold still — torch will illuminate your fingertip.
                        </Text>
                        <View style={s.fingerCueDots}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={s.fingerDot} />
                                <Text style={s.fingerDotLabel}>LENS</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <View style={s.fingerDot} />
                                <Text style={s.fingerDotLabel}>FLASH</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* BPM Panel */}
                <Panel>
                    <Header
                        title="BPM"
                        right={<HdrMeta color={col}>[{zone}]</HdrMeta>}
                    />
                    {scanning && progress < 20 ? (
                        <View style={s.bpmBody}>
                            <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                                <ProgressRing progress={progress} size={100} strokeWidth={4} color={C.info} />
                                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ fontSize: 20, fontWeight: '700', fontFamily: T.MONO, color: C.info }}>{progress}%</Text>
                                </View>
                            </View>
                            <View style={s.bpmRight}>
                                <Text style={[s.bpmUnit, { color: C.info }]}>WARMING UP</Text>
                                <Text style={[s.bpmQuality, { color: C.textMid }]}>{samples} FRAMES</Text>
                                {err ? <Text style={[s.bpmQuality, { color: C.bad }]}>{err.toUpperCase()}</Text> : null}
                            </View>
                        </View>
                    ) : (
                        <View style={s.bpmBody}>
                            <Animated.Text style={[s.bpmBig, { color: col, transform: [{ scale: pulse }] }]}>
                                {bpm > 0 ? String(Math.round(bpm)).padStart(3, '0') : '---'}
                            </Animated.Text>
                            <View style={s.bpmRight}>
                                <Text style={s.bpmUnit}>BPM</Text>
                                <Text style={[s.bpmQuality, { color: q.color }]}>{q.label}</Text>
                                {scanning && progress < 100 && (
                                    <Text style={[s.bpmQuality, { color: C.textMid }]}>{progress}% COMPLETE</Text>
                                )}
                                {scanning && progress >= 100 && (
                                    <Text style={[s.bpmQuality, { color: C.good }]}>MEASUREMENT READY</Text>
                                )}
                                {err ? <Text style={[s.bpmQuality, { color: C.bad }]}>{err.toUpperCase()}</Text> : null}
                            </View>
                        </View>
                    )}
                    {/* BPM sparkline */}
                    {bpmHistory.length > 3 && (
                        <View style={{ height: 24, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 6 }}>
                            {(() => {
                                const min = Math.min(...bpmHistory);
                                const max = Math.max(...bpmHistory);
                                const range = max - min || 1;
                                return bpmHistory.map((v, i) => (
                                    <View key={i} style={{
                                        flex: 1, marginHorizontal: 0.3,
                                        height: Math.max(2, ((v - min) / range) * 20),
                                        backgroundColor: bpmColor(v),
                                        opacity: 0.4 + (i / bpmHistory.length) * 0.6,
                                    }} />
                                ));
                            })()}
                        </View>
                    )}
                </Panel>

                {/* Vitals Panel */}
                <Panel>
                    <Header title="VITALS · LIVE" right={<HdrMeta>{scanning ? (RPPGStream ? 'NATIVE 30HZ' : 'FALLBACK') : 'IDLE'}</HdrMeta>} />
                    <FieldRow label="BPM........... BEATS PER MINUTE" value={bpm > 0 ? fmt(bpm, 1) : '--'} color={col} />
                    <FieldRow label="HRV........... RMSSD (MS)" value={hrv > 0 ? `${fmt(hrv, 1)} [${h.label}]` : '--'} color={h.color} />
                    <FieldRow label="SIG........... SIGNAL QUALITY" value={`[${q.label}]`} color={q.color} />
                    <FieldRow label="FNG........... FINGER DETECTED" value={fingerOn ? 'YES' : 'NO'} color={fingerOn ? C.good : C.muted} />
                    <FieldRow label="FRM........... FRAMES SENT" value={fmtInt(samples)} color={C.text} />
                    <FieldRow label="ELP........... ELAPSED (SEC)" value={fmtInt(elapsed)} color={C.textSub} size="sm" dim />
                    {waveform.length > 0 && (
                        <>
                            <Rule />
                            <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
                                {(() => {
                                    const maxAbs = Math.max(...waveform.map(Math.abs), 0.001);
                                    return waveform.map((v, i) => {
                                        const norm = v / maxAbs;
                                        return (
                                            <View key={i} style={{
                                                flex: 1,
                                                height: Math.max(1, Math.abs(norm) * 20),
                                                marginHorizontal: 0.3,
                                                backgroundColor: norm >= 0 ? C.good : C.info,
                                                opacity: 0.5 + Math.abs(norm) * 0.5,
                                                alignSelf: norm >= 0 ? 'flex-end' : 'flex-start',
                                            }} />
                                        );
                                    });
                                })()}
                            </View>
                        </>
                    )}
                </Panel>

                {/* Measurement Complete */}
                {measurementComplete && (
                    <Panel>
                        <Header title="MEASUREMENT COMPLETE" right={<HdrMeta color={C.good}>DONE</HdrMeta>} />
                        <FieldRow label="FINAL BPM....." value={bpm > 0 ? String(Math.round(bpm)) : '--'} color={bpmColor(bpm)} />
                        <FieldRow label="AVG HRV......." value={hrv > 0 ? `${fmt(hrv, 1)} ms` : '--'} color={h.color} />
                        <FieldRow label="QUALITY......." value={q.label} color={q.color} />
                        <FieldRow label="DURATION......" value={`${elapsed}s · ${samples} FRAMES`} color={C.textSub} size="sm" />
                        <Pressable onPress={saveResult} style={({ pressed }) => [s.btn, { marginTop: 8 }, pressed && { backgroundColor: '#111' }]}>
                            <Text style={[s.btnText, { color: saved ? C.good : C.text }]}>
                                {saved ? '[SAVED] BIO-PASSPORT' : '[S] SAVE RESULT'}
                            </Text>
                        </Pressable>
                    </Panel>
                )}

                {/* Instructions */}
                <Panel>
                    <Header title="INSTRUCTIONS" />
                    <FieldRow label="01............ COVER BACK CAMERA" value="▸ FINGER"  color={C.textMid} size="sm" />
                    <FieldRow label="02............ HOLD STILL"           value="▸ 15 SEC" color={C.textMid} size="sm" />
                    <FieldRow label="03............ TORCH WILL ACTIVATE"  value="▸ AUTO"    color={C.textMid} size="sm" />
                    <FieldRow label="04............ WARMUP"               value="▸ 3 SEC"   color={C.textMid} size="sm" />
                </Panel>

                {scanning ? (
                    <Pressable onPress={stop} style={({ pressed }) => [s.btn, { borderColor: C.bad }, pressed && { backgroundColor: '#111' }]}>
                        <Text style={[s.btnText, { color: C.bad }]}>[SPACE] STOP MEASUREMENT</Text>
                    </Pressable>
                ) : (
                    <Pressable onPress={start} style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={[s.btnText, { color: C.text }]}>[SPACE] START MEASUREMENT  ▸</Text>
                    </Pressable>
                )}

                <Pressable onPress={handleBack} style={({ pressed }) => [s.btnSecondary, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnSecondaryText}>[ESC] RETURN</Text>
                </Pressable>

                <Footer lines={[
                    { text: `RPPG SESSION ${String(sid).slice(0, 10).toUpperCase()}` },
                    { text: RPPGStream ? 'NATIVE CAMERAX · 30 HZ · CHROM ALGO' : 'EXPO-CAMERA FALLBACK · 10 HZ · CHROM ALGO' },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    prompt: { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    title:  { fontSize: 22, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1, marginTop: 8 },
    body:   { fontSize: 11, color: C.textSub, fontFamily: T.MONO, lineHeight: 17 },

    bpmBody:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    bpmBig:    { fontSize: 88, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -5, lineHeight: 78 },
    bpmRight:  { marginLeft: 16, marginBottom: 8, flex: 1 },
    bpmUnit:   { fontSize: 14, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    bpmQuality:{ fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    fingerCue: {
        marginHorizontal: 16, marginTop: 12, padding: 16,
        borderWidth: 1, borderColor: C.warn, backgroundColor: 'rgba(234,179,8,0.08)',
    },
    fingerCueTitle: { color: C.warn, fontFamily: T.MONO, fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
    fingerCueBody: {
        color: C.textSub, fontFamily: T.MONO, fontSize: 10, marginTop: 8,
        textAlign: 'center', lineHeight: 16,
    },
    fingerCueDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 16 },
    fingerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.warn },
    fingerDotLabel: { color: C.textMid, fontFamily: T.MONO, fontSize: 8, marginTop: 4 },

    btn:          { margin: 16, marginTop: 20, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.text },
    btnText:      { fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
    btnSecondary: { marginHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    btnSecondaryText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
});
