/**
 * RPPGScreen — Heart Rate Monitor
 *
 * Simple. User sees face → taps start → BPM appears → taps stop.
 *
 * How: Camera takes tiny photo every 500ms, sends to backend.
 * Backend detects face, extracts skin color, computes pulse via CHROM algorithm.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, StatusBar, Platform, Animated,
} from 'react-native';
import { Tap, Fade, CONDENSED, MONO } from '../ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

function bpmColor(b) {
    if (b <= 0) return '#333';
    if (b < 60) return '#a855f7';
    if (b < 100) return '#22c55e';
    if (b < 130) return '#f97316';
    return '#ef4444';
}

export default function RPPGScreen({ navigation, route }) {
    const ins = useSafeAreaInsets();
    const sid = route?.params?.sessionId || `rppg_${Date.now()}`;
    const [perm, askPerm] = useCameraPermissions();
    const cam = useRef(null);
    const ws = useRef(null);
    const timer = useRef(null);
    const alive = useRef(true);
    const active = useRef(false);

    const [on, setOn] = useState(false);
    const [bpm, setBpm] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [sig, setSig] = useState('');
    const [err, setErr] = useState('');
    const [n, setN] = useState(0);

    // Pulse animation
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (bpm <= 0) return;
        const ms = Math.max(300, Math.round(60000 / bpm));
        const a = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1.06, duration: 100, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: ms - 130, useNativeDriver: true }),
        ]));
        a.start();
        return () => a.stop();
    }, [bpm]);

    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; stop(); };
    }, []);

    function stop() {
        active.current = false;
        if (timer.current) { clearInterval(timer.current); timer.current = null; }
        if (ws.current) { try { ws.current.close(); } catch(_){} ws.current = null; }
        setOn(false);
    }

    function start() {
        if (active.current) return;
        stop(); // clean slate
        active.current = true;
        setOn(true);
        setErr('');
        setN(0);
        setBpm(0);
        setHrv(0);
        setSig('warmup');

        ws.current = api.connectRPPGLiveStream(sid,
            (r) => {
                if (!alive.current || !active.current) return;
                if (r.bpm > 0 && r.status !== 'warmup') setBpm(r.bpm);
                setHrv(r.hrv_ms ?? 0);
                setSig(r.face_detected === false ? 'no_face' : (r.signal_quality || ''));
            },
            () => { setErr('Cannot connect to server'); stop(); },
            () => { if (active.current) { setErr('Disconnected'); stop(); } },
        );

        timer.current = setInterval(async () => {
            if (!active.current || !cam.current) return;
            try {
                const p = await cam.current.takePictureAsync({ base64: true, quality: 0.05, skipProcessing: false });
                if (!active.current || !ws.current) return;
                if (ws.current.readyState === 1 && p?.base64) {
                    ws.current.send(JSON.stringify({ face_found: true, image_b64: p.base64, ts: Date.now() / 1000 }));
                    if (alive.current) setN(c => c + 1);
                }
            } catch(_) {}
        }, 500);
    }

    function back() {
        stop();
        setTimeout(() => { if (navigation?.canGoBack()) navigation.goBack(); }, 50);
    }

    // --- Permission ---
    if (!perm) return <View style={$.bg} />;
    if (!perm.granted) return (
        <View style={[$.bg, { paddingTop: ins.top, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
            <Text style={$.title}>HEART RATE</Text>
            <Text style={$.sub}>Uses your camera to detect pulse from skin color changes</Text>
            <Tap onPress={askPerm}><LinearGradient colors={['#7f1d1d','#dc2626']} style={$.btn}><Text style={$.btnT}>ALLOW CAMERA</Text></LinearGradient></Tap>
        </View>
    );

    const col = bpmColor(bpm);
    const status = !on ? '' : sig === 'no_face' ? 'Center your face' : sig === 'warmup' ? `Collecting... ${n}` : bpm > 0 ? 'Reading pulse' : `Analyzing... ${n}`;

    return (
        <View style={[$.bg, { paddingTop: ins.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Camera */}
            <View style={$.cam}>
                <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" />
                {/* Back button */}
                <Tap onPress={back} style={$.backWrap}><Text style={$.backIcon}>{'‹'}</Text></Tap>
                {/* Face brackets */}
                <View style={$.face} pointerEvents="none">
                    <View style={[$.co, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }]} />
                    <View style={[$.co, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }]} />
                    <View style={[$.co, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
                    <View style={[$.co, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }]} />
                </View>
                {status ? <Text style={[$.status, sig === 'no_face' && { color: '#ef4444' }]}>{status}</Text> : null}
                {on && <View style={$.rec}><View style={$.recDot} /><Text style={$.recT}>LIVE</Text></View>}
            </View>

            {/* BPM Display */}
            <View style={$.body}>
                <Animated.View style={{ transform: [{ scale: pulse }], alignItems: 'center' }}>
                    <Text style={[$.bpm, { color: col }]}>{bpm > 0 ? Math.round(bpm) : '——'}</Text>
                    <Text style={$.bpmLabel}>BPM</Text>
                </Animated.View>

                <View style={$.row}>
                    <View style={$.cell}>
                        <Text style={[$.cellVal, { color: '#a855f7' }]}>{hrv > 0 ? hrv.toFixed(0) : '—'}</Text>
                        <Text style={$.cellKey}>HRV ms</Text>
                    </View>
                    <View style={$.div} />
                    <View style={$.cell}>
                        <Text style={[$.cellVal, { color: hrv > 60 ? '#22c55e' : hrv > 30 ? '#f97316' : '#ef4444' }]}>
                            {hrv > 60 ? 'LOW' : hrv > 30 ? 'MED' : hrv > 0 ? 'HIGH' : '—'}
                        </Text>
                        <Text style={$.cellKey}>STRESS</Text>
                    </View>
                </View>

                {err ? <Text style={$.err}>{err}</Text> : null}
            </View>

            {/* Button */}
            <View style={[$.bar, { paddingBottom: ins.bottom + 12 }]}>
                <Tap onPress={on ? stop : start}>
                    <LinearGradient colors={on ? ['#7f1d1d','#dc2626'] : ['#0c4a6e','#0891b2']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={$.barBtn}>
                        <Text style={$.barBtnT}>{on ? 'STOP' : 'START'}</Text>
                    </LinearGradient>
                </Tap>
            </View>
        </View>
    );
}

const $ = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#000' },
    title: { fontSize: 28, fontWeight: '900', color: '#fff', fontFamily: CONDENSED, letterSpacing: 2, marginBottom: 8 },
    sub: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
    btn: { borderRadius: 6, paddingVertical: 16, paddingHorizontal: 40 },
    btnT: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3, fontFamily: CONDENSED },

    cam: { height: 280, backgroundColor: '#111' },
    backWrap: { position: 'absolute', top: 10, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    backIcon: { color: '#fff', fontSize: 22, fontWeight: '300', marginTop: -2 },
    face: { position: 'absolute', top: '18%', left: '30%', right: '30%', height: '64%' },
    co: { position: 'absolute', width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
    status: { position: 'absolute', bottom: 14, alignSelf: 'center', fontSize: 11, fontWeight: '600', color: '#888' },
    rec: { position: 'absolute', top: 12, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
    recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginRight: 5 },
    recT: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    bpm: { fontSize: 80, fontWeight: '900', fontFamily: CONDENSED },
    bpmLabel: { fontSize: 11, fontWeight: '700', color: '#444', letterSpacing: 4, marginTop: -8, marginBottom: 32 },

    row: { flexDirection: 'row', alignItems: 'center' },
    cell: { alignItems: 'center', paddingHorizontal: 28 },
    cellVal: { fontSize: 20, fontWeight: '800', fontFamily: MONO },
    cellKey: { fontSize: 9, fontWeight: '600', color: '#444', letterSpacing: 2, marginTop: 4 },
    div: { width: 1, height: 28, backgroundColor: '#1a1a1a' },
    err: { color: '#ef4444', fontSize: 12, marginTop: 16 },

    bar: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#000' },
    barBtn: { borderRadius: 6, paddingVertical: 16, alignItems: 'center',
        ...Platform.select({ android: { elevation: 8 }, ios: { shadowColor: '#06b6d4', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 } }) },
    barBtnT: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 3, fontFamily: CONDENSED },
});
