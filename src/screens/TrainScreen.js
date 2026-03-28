// TrainScreen — AI Vision Engine (Production-Fixed for Expo SDK 50)
// Camera fix: use `Camera` from 'expo-camera' (legacy API, has takePictureAsync)
// CameraView from expo-camera/next does NOT have takePictureAsync — that's why
// real AI analysis was always falling back to simulation mode.
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useUser } from '../context/UserContext';
import api from '../services/api';

const C = { bg: '#050a14', cyan: '#06b6d4', orange: '#f97316', green: '#22c55e', red: '#ef4444', text: '#f1f5f9', muted: '#64748b', surf: 'rgba(255,255,255,0.05)' };
const { width: W } = Dimensions.get('window');

const SPORTS = [
    { key: 'vertical_jump', label: 'VJ',      icon: '⬆️' },
    { key: 'snatch',        label: 'Snatch',   icon: '🏋️' },
    { key: 'sprint',        label: 'Sprint',   icon: '💨' },
    { key: 'javelin',       label: 'Javelin',  icon: '🏹' },
    { key: 'cricket_bat',   label: 'Cricket',  icon: '🏏' },
    { key: 'squat',         label: 'Squat',    icon: '🦵' },
    { key: 'push_up',       label: 'Push Up',  icon: '💪' },
    { key: 'pull_up',       label: 'Pull Up',  icon: '🔝' },
];

const SPORT_RANGES = {
    vertical_jump: { knee: [85, 110],  hip: [80, 110],  trunk: [8, 18],  sym: 0.94, jh: [32, 65] },
    snatch:        { knee: [95, 125],  hip: [85, 100],  trunk: [18, 30], sym: 0.95, jh: [0, 0]  },
    sprint:        { knee: [85, 115],  hip: [42, 62],   trunk: [12, 22], sym: 0.88, jh: [0, 0]  },
    javelin:       { knee: [140, 165], hip: [105, 125], trunk: [28, 45], sym: 0.76, jh: [0, 0]  },
    cricket_bat:   { knee: [132, 158], hip: [118, 145], trunk: [18, 30], sym: 0.82, jh: [0, 0]  },
    squat:         { knee: [75, 110],  hip: [75, 105],  trunk: [0, 25],  sym: 0.92, jh: [0, 0]  },
    push_up:       { knee: [165, 180], hip: [165, 180], trunk: [0, 8],   sym: 0.92, jh: [0, 0]  },
    pull_up:       { knee: [140, 180], hip: [140, 180], trunk: [0, 15],  sym: 0.90, jh: [0, 0]  },
};

const REP_TRANSITIONS = {
    vertical_jump: ['descent', 'takeoff'],
    squat:         ['descent', 'setup'],
    push_up:       ['descent', 'setup'],
    pull_up:       ['descent', 'setup'],
    snatch:        ['descent', 'catch'],
    sprint:        ['drive', 'flight'],
    javelin:       ['wind_up', 'release'],
    cricket_bat:   ['backswing', 'contact'],
};

function rng(lo, hi) { return lo + Math.random() * (hi - lo); }

function simulateFrame(sport) {
    const p = SPORT_RANGES[sport] || SPORT_RANGES.vertical_jump;
    const kneeL = rng(...p.knee), kneeR = rng(...p.knee);
    const hipL = rng(...p.hip), hipR = rng(...p.hip);
    const trunk = rng(...p.trunk);
    const sym = p.sym + (Math.random() - 0.5) * 0.06;
    const jh = p.jh[1] > 0 ? rng(...p.jh) : 0;
    const score = Math.round(60 + Math.random() * 35);
    const quality = score >= 90 ? 'elite' : score >= 75 ? 'good' : score >= 55 ? 'average' : 'poor';
    const feedback = {
        elite: 'Elite biomechanics! Maintain this pattern.',
        good: 'Good form. Focus on symmetry.',
        average: 'Lower your hips. Control trunk lean.',
        poor: 'LOWER HIPS — critical form deviation!',
    }[quality];
    return {
        knee_angle_l: kneeL, knee_angle_r: kneeR, hip_angle_l: hipL, hip_angle_r: hipR,
        trunk_lean: trunk, limb_symmetry_idx: sym, estimated_jump_height: jh,
        form_score: score, form_quality: quality, primary_feedback: feedback, phase: 'descent'
    };
}

const Q_COLORS = { elite: '#22c55e', good: '#06b6d4', average: '#f97316', poor: '#ef4444' };

export default function TrainScreen({ showToast, navigation }) {
    const { addXp } = useUser();
    const [permission, setPermission] = useState(null);
    const [sport, setSport] = useState('vertical_jump');
    const [isActive, setIsActive] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [frameNum, setFrameNum] = useState(0);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [avgScore, setAvgScore] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState(null);
    const [analysisMode, setAnalysisMode] = useState('sim'); // 'real' | 'sim' | 'no_pose'
    const intervalRef = useRef(null);
    const sessionRef = useRef(null);
    const cameraRef = useRef(null);       // CameraView ref for takePictureAsync
    const isCapturingRef = useRef(false); // prevents overlapping captures
    const lastPhaseRef = useRef(null);
    const [repCount, setRepCount] = useState(0);

    // Request camera permission on mount
    useEffect(() => {
        Camera.requestCameraPermissionsAsync().then(({ status }) => {
            setPermission({ granted: status === 'granted' });
        });
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Separate ref for the result polling interval
    const resultIntervalRef = useRef(null);

    const checkRep = (phase) => {
        if (!phase) return;
        const [fromPhase, toPhase] = REP_TRANSITIONS[sport] || [];
        if (fromPhase && toPhase && lastPhaseRef.current === fromPhase && phase === toPhase) {
            setRepCount(c => c + 1);
        }
        lastPhaseRef.current = phase;
    };

    const startSession = async () => {
        const sData = await api.startSession('athlete_01', sport);
        const sid = sData?.session_id || null;
        setSessionId(sid);
        sessionRef.current = sid;
        setIsActive(true);
        setFrameNum(0);
        setScoreHistory([]);
        setShowSummary(false);
        setSummary(null);
        setAnalysisMode('sim');
        setRepCount(0);
        lastPhaseRef.current = null;

        // ── FRAME CAPTURE LOOP (every 4s) ──────────────────────────────────
        // Fire-and-forget: captures JPEG → sends to server → returns instantly (202).
        // Server queues MediaPipe analysis. Results come via the POLLING loop below.
        intervalRef.current = setInterval(async () => {
            try {
                if (cameraRef.current && !isCapturingRef.current && sessionRef.current) {
                    isCapturingRef.current = true;
                    const photo = await cameraRef.current.takePictureAsync({
                        base64: true,
                        quality: 0.1,        // ~8-15KB JPEG — enough for MediaPipe
                        skipProcessing: true,
                    });
                    isCapturingRef.current = false;

                    if (photo?.base64) {
                        // Fire and forget — DO NOT await the result here
                        api.sendFrame(sessionRef.current, {
                            image_b64: photo.base64,
                            sport,
                            form_score: 0, form_quality: 'unknown', primary_feedback: ''
                        }).catch(() => { });
                    }
                }
            } catch {
                isCapturingRef.current = false;
            }
        }, 4000); // capture every 4s

        // ── SIMULATED FRAME LOOP (every 2s) ─────────────────────────────────
        // Keeps UI ticking with simulated data while real analysis is in flight.
        // When real results arrive (poll below), they override the simulated values.
        const simIntervalRef = setInterval(() => {
            setMetrics(prev => {
                // Only use simulation if we haven't received real data yet
                if (analysisMode === 'real') return prev;
                const frame = simulateFrame(sport);
                setFrameNum(n => n + 1);
                setScoreHistory(h => {
                    const next = [...h, frame.form_score];
                    if (next.length > 30) next.shift();
                    setAvgScore(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
                    return next;
                });
                return frame;
            });
        }, 2000);

        // ── RESULT POLLING LOOP (every 3s) ─────────────────────────────────
        // Polls /latest-result → when AI finishes, real metrics appear in UI.
        resultIntervalRef.current = setInterval(async () => {
            if (!sessionRef.current) return;
            try {
                const result = await api.getLatestResult(sessionRef.current);
                if (result?.pose_detected && result.form_score > 0) {
                    checkRep(result.phase);
                    const frame = {
                        form_score: result.form_score,
                        form_quality: result.form_quality,
                        primary_feedback: result.primary_feedback,
                        phase: result.phase,
                        knee_angle_l: result.knee_angle_l ?? 0,
                        knee_angle_r: result.knee_angle_r ?? 0,
                        hip_angle_l: result.hip_angle_l ?? 0,
                        hip_angle_r: result.hip_angle_r ?? 0,
                        trunk_lean: result.trunk_lean ?? 0,
                        limb_symmetry_idx: result.limb_symmetry_idx ?? 1,
                        estimated_jump_height: result.estimated_jump_height ?? 0,
                    };
                    setMetrics(frame);
                    setAnalysisMode('real');
                    setFrameNum(n => n + 1);
                    setScoreHistory(h => {
                        const next = [...h, result.form_score];
                        if (next.length > 30) next.shift();
                        setAvgScore(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
                        return next;
                    });
                } else if (result?.data_source === 'none') {
                    setAnalysisMode('sim'); // no AI result yet
                }
            } catch { }
        }, 3000);

        // Store simInterval in a ref for cleanup
        if (!intervalRef._simRef) intervalRef._simRef = {};
        intervalRef._simRef.current = simIntervalRef;
    };

    const endSession = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (resultIntervalRef.current) clearInterval(resultIntervalRef.current);
        if (intervalRef._simRef?.current) clearInterval(intervalRef._simRef.current);
        setIsActive(false);
        setMetrics(null);

        let sum = null;
        if (sessionRef.current) {
            sum = await api.endSession(sessionRef.current);
        }
        const xpEarned = sum?.xp_earned ?? (Math.floor(avgScore * 1.5) + 50);
        const peakScore = sum?.peak_form_score ?? Math.max(...scoreHistory, 0);
        const peakVj = sum?.peak_jump_height_cm ?? 0;

        const finalSummary = { avgScore, peakScore, peakVj, xpEarned, frames: frameNum, reps: repCount };
        setSummary(finalSummary);
        setShowSummary(true);
    };

    const completeSummary = () => {
        if (summary) {
            addXp(summary.xpEarned, summary); // updates UserContext
            showToast(`+${summary.xpEarned} XP added to Bio-Passport!`);
        }
        setShowSummary(false);
        setSummary(null);
    };

    // ── Permissions ─────────────────────────────────────────────────────────────

    if (!permission) {
        return <View style={s.center}><Text style={s.mutedText}>Loading camera...</Text></View>;
    }
    if (!permission.granted) {
        return (
            <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 40, marginBottom: 16 }}>📷</Text>
                <Text style={s.title}>Camera Access Required</Text>
                <Text style={[s.subtitle, { textAlign: 'center', marginBottom: 24 }]}>
                    Camera access is needed to perform real-time biomechanics analysis.
                </Text>
                <TouchableOpacity style={s.startBtn} onPress={requestPermission}>
                    <Text style={s.startBtnText}>GRANT CAMERA ACCESS</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Session Summary Screen ───────────────────────────────────────────────────

    if (showSummary && summary) {
        const qColor = Q_COLORS[summary.avgScore >= 90 ? 'elite' : summary.avgScore >= 75 ? 'good' : summary.avgScore >= 55 ? 'average' : 'poor'];
        return (
            <SafeAreaView style={[s.safe, { justifyContent: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🎯</Text>
                <Text style={[s.title, { textAlign: 'center', marginBottom: 24 }]}>Session Complete</Text>
                <View style={s.summaryCard}>
                    <SummaryRow label="Avg Form Score" value={`${summary.avgScore}%`} color={qColor} />
                    <SummaryRow label="Peak Score" value={`${summary.peakScore}%`} color={C.green} />
                    <SummaryRow label="Peak Jump Height" value={summary.peakVj > 0 ? `${summary.peakVj.toFixed(1)} cm` : '--'} color={C.orange} />
                    <SummaryRow label="Reps Counted" value={String(summary.reps ?? 0)} color={C.orange} />
                    <SummaryRow label="Frames Analyzed" value={String(summary.frames)} color="#a78bfa" isLast />
                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                        <View style={s.xpPill}>
                            <Text style={s.xpText}>+{summary.xpEarned} XP Earned!</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={s.startBtn} onPress={completeSummary}>
                    <Text style={s.startBtnText}>SAVE TO BIO-PASSPORT</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Setup Screen ─────────────────────────────────────────────────────────────

    if (!isActive) {
        return (
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    <Text style={s.title}>AI Vision Engine</Text>
                    <Text style={s.subtitle}>Select sport and start your session</Text>

                    <Text style={[s.sectionLabel, { marginTop: 24 }]}>SPORT MODE</Text>
                    <View style={s.sportGrid}>
                        {SPORTS.map((sp) => (
                            <TouchableOpacity
                                key={sp.key}
                                style={[s.sportBtn, sport === sp.key && s.sportBtnActive]}
                                onPress={() => setSport(sp.key)}
                            >
                                <Text style={s.sportIcon}>{sp.icon}</Text>
                                <Text style={[s.sportLabel, sport === sp.key && { color: C.cyan }]}>{sp.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={s.checklistCard}>
                        <Text style={s.sectionLabel}>PRE-FLIGHT CHECK</Text>
                        {[
                            'Sufficient lighting in the room',
                            'Full body visible to camera',
                            'Position camera at waist/hip height',
                            'Wear form-fitting clothes for best tracking',
                        ].map(item => (
                            <View key={item} style={s.checkItem}>
                                <Text style={{ color: C.cyan, fontSize: 14 }}>{'✓'}</Text>
                                <Text style={s.checkText}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={s.startBtn} onPress={startSession} activeOpacity={0.85}>
                        <Text style={s.startBtnText}>INITIALIZE VISION ENGINE</Text>
                    </TouchableOpacity>

                    {/* Quick-access tool buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <TouchableOpacity
                            style={[s.toolBtn, { flex: 1 }]}
                            onPress={() => navigation?.navigate('HeartRate', { sessionId: sessionId || 'rppg_' + Date.now() })}
                            activeOpacity={0.85}
                        >
                            <Text style={s.toolBtnIcon}>❤️</Text>
                            <Text style={s.toolBtnLabel}>Heart Rate</Text>
                            <Text style={s.toolBtnSub}>rPPG · Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.toolBtn, { flex: 1 }]}
                            onPress={() => navigation?.navigate('GhostSkeleton', { sport })}
                            activeOpacity={0.85}
                        >
                            <Text style={s.toolBtnIcon}>👻</Text>
                            <Text style={s.toolBtnLabel}>Ghost Form</Text>
                            <Text style={s.toolBtnSub}>AI · Skeleton</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Live Camera View ──────────────────────────────────────────────────────────

    const qColor = metrics ? (Q_COLORS[metrics.form_quality] || C.cyan) : C.cyan;
    const modeLabel = analysisMode === 'real' ? '🟢 REAL AI' : analysisMode === 'no_pose' ? '🟡 NO POSE' : '🔵 SIM';

    return (
        <View style={s.cameraWrap}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={'front'} />

            {/* Top bar */}
            <View style={s.camTopBar}>
                <View style={s.recBadge}>
                    <View style={s.recDot} />
                    <Text style={s.recText}>SYS.RECORDING</Text>
                </View>
                <TouchableOpacity style={s.finishBtn} onPress={endSession}>
                    <Text style={s.finishBtnText}>FINISH</Text>
                </TouchableOpacity>
            </View>

            {/* Telemetry overlay */}
            <View style={s.overlayMetrics}>
                <Text style={s.overlayLabel}>{`FRAME: ${frameNum}  AVG: ${avgScore}%  ${modeLabel}`}</Text>
                {metrics && (
                    <>
                        <Text style={s.overlayMetric}>{`KNEE_L : ${metrics.knee_angle_l?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayMetric}>{`HIP_L  : ${metrics.hip_angle_l?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayMetric}>{`TRUNK  : ${metrics.trunk_lean?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayMetric}>{`SYM    : ${metrics.limb_symmetry_idx?.toFixed(2)}`}</Text>
                        {metrics.estimated_jump_height > 0 && (
                            <Text style={s.overlayMetric}>{`EST_VJ : ${metrics.estimated_jump_height?.toFixed(1)} cm`}</Text>
                        )}
                    </>
                )}
            </View>

            {/* Bottom HUD */}
            <View style={[s.camBottomHUD, { borderLeftColor: qColor }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.hudLabel, { color: qColor }]}>LIVE CORRECTION</Text>
                    <Text style={s.hudFeedback} numberOfLines={2}>
                        {metrics?.primary_feedback || 'Analyzing posture...'}
                    </Text>
                </View>
                <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                    <Text style={s.hudSyncLabel}>REPS</Text>
                    <Text style={[s.hudScore, { color: C.orange, fontSize: 22 }]}>{repCount}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.hudSyncLabel}>FORM</Text>
                    <Text style={[s.hudScore, { color: qColor }]}>{metrics?.form_score ?? '--'}%</Text>
                </View>
            </View>
        </View>
    );
}

function SummaryRow({ label, value, color, isLast }) {
    return (
        <View style={[s.summaryRow, isLast && { borderBottomWidth: 0 }]}>
            <Text style={s.sumLabel}>{label}</Text>
            <Text style={[s.sumVal, { color }]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
    title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 12, color: C.muted },
    sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
    mutedText: { color: C.muted, fontSize: 14 },
    // Sport grid
    sportGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
    sportBtn: { width: '22%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    sportBtnActive: { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.5)' },
    sportIcon: { fontSize: 20, marginBottom: 4 },
    sportLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textAlign: 'center' },
    // Checklist
    checklistCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkText: { fontSize: 12, fontWeight: '600', color: '#cbd5e1', marginLeft: 10, flex: 1 },
    // Start button
    startBtn: { backgroundColor: C.cyan, borderRadius: 18, padding: 18, alignItems: 'center', shadowColor: C.cyan, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 8 },
    startBtnText: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
    // Camera view
    cameraWrap: { flex: 1, backgroundColor: '#000' },
    camTopBar: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
    recBadge: { flexDirection: 'row', alignItems: 'center' },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, marginRight: 6 },
    recText: { color: C.text, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    finishBtn: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' },
    finishBtnText: { color: C.red, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
    overlayMetrics: { position: 'absolute', top: 100, left: 16, zIndex: 10 },
    overlayLabel: { color: 'rgba(6,182,212,0.6)', fontSize: 8, marginBottom: 8 },
    overlayMetric: { color: C.cyan, fontSize: 10, fontWeight: '700', marginBottom: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    camBottomHUD: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 20, padding: 16, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    hudLabel: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
    hudFeedback: { color: C.text, fontWeight: '800', fontSize: 13 },
    hudSyncLabel: { fontSize: 8, color: C.muted, fontWeight: '700', letterSpacing: 2 },
    hudScore: { fontSize: 28, fontWeight: '900' },
    // Summary
    summaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    sumLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
    sumVal: { fontSize: 20, fontWeight: '900' },
    xpPill: { backgroundColor: 'rgba(6,182,212,0.18)', borderRadius: 99, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(6,182,212,0.4)' },
    xpText: { color: C.cyan, fontWeight: '900', fontSize: 16 },
    // Tool buttons (Heart Rate, Ghost Form)
    toolBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    toolBtnIcon: { fontSize: 22, marginBottom: 5 },
    toolBtnLabel: { fontSize: 12, fontWeight: '800', color: C.text, marginBottom: 2 },
    toolBtnSub: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
