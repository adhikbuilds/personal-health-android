// RPPGScreen — Bloomberg terminal.
// Heart rate via finger-on-lens PPG. Camera hidden, torch on, frames →
// backend WS. UI shows terminal-style live telemetry: BPM, HRV, signal
// quality, frames captured.

import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, StatusBar, Animated, Pressable, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

import { C, T } from '../styles/colors';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, nowISO,
} from '../components/terminal';

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

    const [scanning, setScanning] = useState(false);
    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [quality, setQuality] = useState('');
    const [samples, setSamples] = useState(0);
    const [fingerOn, setFingerOn] = useState(false);
    const [err, setErr] = useState('');
    const [startedAt, setStartedAt] = useState(0);

    // Pulse animation on the BPM cell
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

    function stop() {
        scanRef.current = false;
        const t = timerRef.current;
        const w = wsRef.current;
        timerRef.current = null;
        wsRef.current = null;
        if (t) clearInterval(t);
        if (w) try { w.close(); } catch (_) {}
        setScanning(false);
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
        setStartedAt(Date.now());

        const w = api.connectRPPGLiveStream(sid,
            (r) => {
                if (!aliveRef.current || !scanRef.current) return;
                if (r.bpm > 0 && r.status !== 'warmup') setBpm(r.bpm);
                setHrv(r.hrv_ms ?? 0);
                setQuality(r.signal_quality || '');
                if (r.face_detected !== undefined) setFingerOn(true);
            },
            () => { setErr('WS CONNECT FAILED'); stop(); },
            () => { if (scanRef.current) { setErr('WS DROPPED'); stop(); } },
        );
        wsRef.current = w;

        const t = setInterval(async () => {
            if (!scanRef.current || !camRef.current) return;
            try {
                const p = await camRef.current.takePictureAsync({
                    base64: true, quality: 0.01,
                    shutterSound: false, animateShutter: false, skipProcessing: true,
                });
                if (!scanRef.current || !wsRef.current) return;
                if (wsRef.current.readyState === 1 && p?.base64) {
                    wsRef.current.send(JSON.stringify({
                        face_found: true,
                        image_b64: p.base64,
                        ts: Date.now() / 1000,
                    }));
                    if (aliveRef.current) setSamples(c => c + 1);
                }
            } catch (_) {}
        }, 500);
        timerRef.current = t;
    }

    function handleBack() {
        stop();
        setTimeout(() => navigation?.canGoBack() && navigation.goBack(), 80);
    }

    const col = bpmColor(bpm);
    const zone = zoneCode(bpm);
    const q = qualityCode(quality);
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
                            camera captures red-channel intensity pulsing with blood flow at ~2 Hz.
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

            {/* Hidden camera (torch on when scanning) */}
            <View style={{ position: 'absolute', top: -9999, left: -9999, width: 1, height: 1 }}>
                <CameraView
                    ref={camRef}
                    style={{ width: 1, height: 1 }}
                    facing="back"
                    enableTorch={scanning}
                    animateShutter={false}
                />
            </View>

            <View style={{ padding: 16 }}>
                <Text style={s.prompt}>{'> rppg --live --session='}{String(sid).slice(0, 10)}</Text>
                <Text style={s.title}>HEART RATE MONITOR</Text>
            </View>

            {/* Primary BPM readout */}
            <Panel>
                <Header
                    title="BPM"
                    right={<HdrMeta color={col}>[{zone}]</HdrMeta>}
                />
                <View style={s.bpmBody}>
                    <Animated.Text style={[s.bpmBig, { color: col, transform: [{ scale: pulse }] }]}>
                        {bpm > 0 ? String(Math.round(bpm)).padStart(3, '0') : '---'}
                    </Animated.Text>
                    <View style={s.bpmRight}>
                        <Text style={s.bpmUnit}>BPM</Text>
                        <Text style={[s.bpmQuality, { color: q.color }]}>{q.label}</Text>
                        {err ? <Text style={[s.bpmQuality, { color: C.bad }]}>{err.toUpperCase()}</Text> : null}
                    </View>
                </View>
            </Panel>

            {/* Vitals */}
            <Panel>
                <Header title="VITALS · LIVE" right={<HdrMeta>{scanning ? 'CAPTURING' : 'IDLE'}</HdrMeta>} />
                <FieldRow label="BPM........... BEATS PER MINUTE" value={bpm > 0 ? fmt(bpm, 1) : '--'} color={col} />
                <FieldRow label="HRV........... RMSSD (MS)" value={hrv > 0 ? fmt(hrv, 1) : '--'} color={C.info} />
                <FieldRow label="SIG........... SIGNAL QUALITY" value={`[${q.label}]`} color={q.color} />
                <FieldRow label="FNG........... FINGER DETECTED" value={fingerOn ? 'YES' : 'NO'} color={fingerOn ? C.good : C.muted} />
                <FieldRow label="FRM........... FRAMES SENT" value={fmtInt(samples)} color={C.text} />
                <FieldRow label="ELP........... ELAPSED (SEC)" value={fmtInt(elapsed)} color={C.textSub} size="sm" dim />
            </Panel>

            {/* Instructions */}
            <Panel>
                <Header title="INSTRUCTIONS" />
                <FieldRow label="01............ COVER BACK CAMERA" value="▸ FINGER"  color={C.textMid} size="sm" />
                <FieldRow label="02............ HOLD STILL"           value="▸ 10 SEC"  color={C.textMid} size="sm" />
                <FieldRow label="03............ TORCH WILL ACTIVATE"  value="▸ AUTO"    color={C.textMid} size="sm" />
                <FieldRow label="04............ WARMUP"               value="▸ 2.5 SEC" color={C.textMid} size="sm" />
            </Panel>

            {/* Action */}
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
                { text: `CHROM ALGO · De Haan & Jeanne 2013 · FS 2 HZ` },
            ]} />
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

    btn:          { margin: 16, marginTop: 20, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.text },
    btnText:      { fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
    btnSecondary: { marginHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    btnSecondaryText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
});
