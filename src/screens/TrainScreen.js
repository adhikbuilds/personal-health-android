// TrainScreen — AI Vision Engine (Nike Design Language)
// Camera fix: use `Camera` from 'expo-camera' (legacy API, has takePictureAsync)
// CameraView from expo-camera/next does NOT have takePictureAsync — that's why
// real AI analysis was always falling back to simulation mode.
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Pressable, Animated , Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { classifyForm, isReady as classifierReady } from '../services/poseClassifier';
import { Tap, Fade } from '../ui';
import { SPORTS as SPORTS_MAP, SPORT_RANGES, repTransition } from '../config/sports';
import { C, T } from '../styles/colors';
import { SysBar, Panel, Header, HdrMeta, FieldRow, Triad, TerminalScreen, Footer, useLiveClock, fmt, fmtInt } from '../components/terminal';

const CONDENSED = T.MONO;
const MONO = T.MONO;

const { width: W } = Dimensions.get('window');

// Keep the TrainScreen picker order intact — general first, then the rest
// in the original display order.
const SPORTS = [
    SPORTS_MAP.general, SPORTS_MAP.vertical_jump, SPORTS_MAP.squat,
    SPORTS_MAP.push_up, SPORTS_MAP.pull_up, SPORTS_MAP.sprint,
    SPORTS_MAP.snatch, SPORTS_MAP.javelin, SPORTS_MAP.cricket_bat,
].map(s => ({ key: s.key, label: s.label }));

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

export default function TrainScreen({ showToast, navigation, route }) {
    const ins = useSafeAreaInsets();
    const { addXp, userData } = useUser();
    const [permission, setPermission] = useState(null);
    const initialSport = route?.params?.sport || 'general';
    const [sport, setSport] = useState(initialSport);
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
    const simIntervalRef = useRef(null);
    const sessionRef = useRef(null);
    const cameraRef = useRef(null);       // CameraView ref for takePictureAsync
    const isCapturingRef = useRef(false); // prevents overlapping captures
    const lastPhaseRef = useRef(null);
    const analysisModeRef = useRef('sim');
    const lastGoodMetricsRef = useRef(null); // kept across connection drops
    const wsStreamRef = useRef(null);     // Phase 2: WebSocket frame stream (opens on session start)
    const [repCount, setRepCount] = useState(0);

    // #3 Bouncy CTA on mount
    const ctaBounce = useRef(new Animated.Value(0.85)).current;
    useEffect(() => {
        Animated.spring(ctaBounce, { toValue: 1, useNativeDriver: true, speed: 4, bounciness: 14 }).start();
    }, []);

    // Request camera permission on mount
    useEffect(() => {
        Camera.requestCameraPermissionsAsync().then(({ status }) => {
            setPermission({ granted: status === 'granted' });
        });
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
            if (wsStreamRef.current) {
                try { wsStreamRef.current.close(); } catch (_) {}
                wsStreamRef.current = null;
            }
        };
    }, []);

    const requestPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setPermission({ granted: status === 'granted' });
    };

    // Update sport when navigated to with params (e.g., from GhostSkeleton)
    useEffect(() => {
        if (route?.params?.sport) setSport(route.params.sport);
    }, [route?.params?.sport]);

    // Separate ref for the result polling interval
    const resultIntervalRef = useRef(null);

    const checkRep = (phase) => {
        if (!phase) return;
        const [fromPhase, toPhase] = repTransition(sport);
        if (fromPhase && toPhase && lastPhaseRef.current === fromPhase && phase === toPhase) {
            setRepCount(c => c + 1);
        }
        lastPhaseRef.current = phase;
    };

    const startSession = async () => {
        // Clear any existing intervals from a previous session
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        if (resultIntervalRef.current) clearInterval(resultIntervalRef.current);

        const sData = await api.startSession(userData?.avatarId || 'athlete_01', sport);
        const sid = sData?.session_id || null;
        setSessionId(sid);
        sessionRef.current = sid;
        setIsActive(true);
        setFrameNum(0);
        setScoreHistory([]);
        setShowSummary(false);
        setSummary(null);
        setAnalysisMode('waiting');
        analysisModeRef.current = 'waiting';
        setRepCount(0);
        lastPhaseRef.current = null;

        // Phase 2: open a WebSocket frame stream. Falls back to HTTP /frame
        // (handled inside captureAndSend) if the socket is closed or absent.
        // The same backend analyzer queue serves both transports, so any
        // results land in /latest-result regardless of transport.
        try {
            wsStreamRef.current = api.connectFrameStream(sid, {
                onResult: (msg) => {
                    if (msg.form_score == null || msg.form_score <= 0) return;
                    checkRep(msg.phase);
                    const frame = {
                        form_score: msg.form_score,
                        form_quality: msg.form_quality,
                        primary_feedback: msg.primary_feedback,
                        phase: msg.phase,
                        knee_angle_l: msg.knee_angle_l ?? 0,
                        knee_angle_r: 0,
                        hip_angle_l: msg.hip_angle_l ?? 0,
                        hip_angle_r: 0,
                        trunk_lean: msg.trunk_lean ?? 0,
                        limb_symmetry_idx: msg.limb_symmetry_idx ?? 1,
                        estimated_jump_height: msg.estimated_jump_height ?? 0,
                    };
                    setMetrics(frame);
                    lastGoodMetricsRef.current = frame;
                    setAnalysisMode('real');
                    analysisModeRef.current = 'real';
                    setScoreHistory(prev => {
                        const next = [...prev, msg.form_score];
                        const sum = next.reduce((a, b) => a + b, 0);
                        setAvgScore(Math.round(sum / next.length));
                        return next;
                    });
                },
                onClose: () => { wsStreamRef.current = null; },
                onError: () => { /* HTTP fallback path remains active */ },
            });
        } catch (_) {
            wsStreamRef.current = null;
        }

        // ── FRAME CAPTURE ────────────────────────────────────────────────────
        const captureAndSend = async () => {
            try {
                if (cameraRef.current && !isCapturingRef.current && sessionRef.current) {
                    isCapturingRef.current = true;
                    const photo = await cameraRef.current.takePictureAsync({
                        base64: true,
                        quality: 0.4,
                        skipProcessing: true,
                        shutterSound: false,
                        exif: false,
                    });
                    isCapturingRef.current = false;
                    if (photo?.base64) {
                        setFrameNum(n => n + 1);
                        // Prefer WebSocket if it's open — saves HTTP overhead per frame
                        // and lets the server push results back without a poll cycle.
                        const ws = wsStreamRef.current;
                        if (ws && ws.isOpen()) {
                            ws.send(photo.base64);
                        } else {
                            api.sendFrame(sessionRef.current, {
                                image_b64: photo.base64,
                                sport,
                                form_score: 0, form_quality: 'unknown', primary_feedback: ''
                            }).catch((e) => console.warn('[TrainScreen] sendFrame failed:', e?.message));
                        }
                    }
                }
            } catch {
                isCapturingRef.current = false;
            }
        };

        // Capture first frame after 1.5s (camera needs time to initialize)
        setTimeout(captureAndSend, 1500);
        // Then every 3s
        intervalRef.current = setInterval(captureAndSend, 3000);

        // Simulation disabled — only real AI data shown.
        // If no pose detected, UI shows "NO POSE" instead of fake numbers.

        // ── RESULT POLLING LOOP (every 3s) ─────────────────────────────────
        // Polls /latest-result → when AI finishes, real metrics appear in UI.
        resultIntervalRef.current = setInterval(async () => {
            if (!sessionRef.current) return;
            try {
                const result = await api.getLatestResult(sessionRef.current);
                if (result?.pose_detected && result.form_score > 0) {
                    // Real AI result — update UI
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
                    lastGoodMetricsRef.current = frame;
                    setAnalysisMode('real');
                    analysisModeRef.current = 'real';
                    setFrameNum(n => n + 1);
                    setScoreHistory(h => {
                        const next = [...h, result.form_score];
                        if (next.length > 30) next.shift();
                        setAvgScore(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
                        return next;
                    });
                } else if (result?.pose_detected === false) {
                    // Backend processed frame but no person detected
                    setAnalysisMode('no_pose');
                    analysisModeRef.current = 'no_pose';
                } else if (result?.data_source === 'none') {
                    // No frames analyzed yet — waiting
                    if (analysisModeRef.current !== 'real') {
                        setAnalysisMode('waiting');
                        analysisModeRef.current = 'waiting';
                    }
                }
            } catch (e) {
                // Backend unreachable — try on-device classifier on the
                // last known joint angles so the HUD keeps moving even when
                // we're offline. The model expects 18 features; if angles
                // are missing we just show stale data instead of zeros.
                const angles = lastGoodMetricsRef.current;
                if (angles && classifierReady()) {
                    const offline = await classifyForm(angles, sport);
                    if (offline) {
                        setMetrics({ ...angles, ...offline });
                        setAnalysisMode('real');
                        analysisModeRef.current = 'real';
                        setScoreHistory(h => {
                            const next = [...h, offline.form_score];
                            if (next.length > 30) next.shift();
                            setAvgScore(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
                            return next;
                        });
                        return;
                    }
                }
                if (analysisModeRef.current !== 'real') {
                    setAnalysisMode('error');
                    analysisModeRef.current = 'error';
                }
            }
        }, 2000);

    };

    const endSession = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (resultIntervalRef.current) clearInterval(resultIntervalRef.current);
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        if (wsStreamRef.current) {
            try { wsStreamRef.current.close(); } catch (_) {}
            wsStreamRef.current = null;
        }
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
        const sid = sessionRef.current;
        setShowSummary(false);
        setSummary(null);
        // Jump straight to the just-completed session's full ScoreCard so the
        // user sees rep count, claps, and any coach broadcasts without having
        // to dig through Profile → Session Log.
        if (sid && navigation) {
            navigation.navigate('ScoreCard', { sessionId: sid });
        }
    };

    // ── Permissions ─────────────────────────────────────────────────────────────

    if (!permission) {
        return (
            <View style={s.center}>
                <Text style={s.mutedText}>Loading camera...</Text>
            </View>
        );
    }
    if (!permission.granted) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <SysBar online={null} identity="TRAIN.CAM" />
                <View style={{ padding: 16 }}>
                    <Text style={s.setupPrompt}>{'> train --init'}</Text>
                    <Text style={s.setupTitle}>CAMERA PERMISSION REQUIRED</Text>
                    <Text style={s.setupSub}>POSE ANALYSIS REQUIRES REAR CAMERA ACCESS</Text>
                </View>
                <Pressable onPress={requestPermission} style={({ pressed }) => [s.setupCta, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.setupCtaText}>[A] ALLOW CAMERA  ▸</Text>
                </Pressable>
            </TerminalScreen>
        );
    }

    // ── Session Summary Screen ───────────────────────────────────────────────────

    if (showSummary && summary) {
        const qBand = summary.avgScore >= 90 ? 'elite' : summary.avgScore >= 75 ? 'good' : summary.avgScore >= 55 ? 'average' : 'poor';
        const qCol = { elite: C.good, good: C.info, average: C.warn, poor: C.bad }[qBand];
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <SysBar online={true} identity="TRAIN.COMPLETE" />
                <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 20 }} showsVerticalScrollIndicator={false}>
                    <View style={s.setupHero}>
                        <Text style={s.setupPrompt}>{'> session --end'}</Text>
                        <Text style={s.setupTitle}>SESSION COMPLETE</Text>
                    </View>

                    <Panel>
                        <Header title="FORM SCORE" right={<HdrMeta color={qCol}>[{qBand.toUpperCase()}]</HdrMeta>} />
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 }}>
                            <Text style={{ fontSize: 80, fontWeight: '700', fontFamily: MONO, color: qCol, letterSpacing: -4, lineHeight: 74 }}>
                                {String(summary.avgScore).padStart(3, '0')}
                            </Text>
                            <View style={{ marginLeft: 12, marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, color: C.muted, fontFamily: MONO }}>/ 100</Text>
                                <Text style={{ fontSize: 10, color: qCol, fontFamily: MONO, letterSpacing: 1, marginTop: 4, fontWeight: '700' }}>
                                    PEAK {summary.peakScore}
                                </Text>
                            </View>
                        </View>
                    </Panel>

                    <Panel>
                        <Header title="TELEMETRY" />
                        <FieldRow label="PEAK.......... MAX FORM SCORE"       value={fmt(summary.peakScore, 0)} color={C.good} />
                        <FieldRow label="JMP........... PEAK JUMP HEIGHT (CM)" value={summary.peakVj > 0 ? fmt(summary.peakVj, 1) : '--'} color={C.info} />
                        <FieldRow label="REP........... REPS COUNTED"         value={fmtInt(summary.reps || 0)} color={C.warn} />
                        <FieldRow label="FRM........... FRAMES ANALYSED"      value={fmtInt(summary.frames || 0)} color={C.text} />
                        <FieldRow label="XP............ BPI REWARD"           value={'+' + fmtInt(summary.xpEarned || 0)} color={C.good} />
                    </Panel>

                    <Pressable onPress={completeSummary} style={({ pressed }) => [s.setupCta, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.setupCtaText}>[SAVE] COMMIT TO BIO-PASSPORT  ▸</Text>
                    </Pressable>
                </ScrollView>
            </TerminalScreen>
        );
    }

    // ── Setup Screen ─────────────────────────────────────────────────────────────

    if (!isActive) {
        const sportLabel = SPORTS.find(sp => sp.key === sport)?.label || 'VERTICAL JUMP';
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <SysBar online={null} identity={`TRAIN.${String(sport).toUpperCase().replace('_', '-')}`} />
                <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    <View style={s.setupHero}>
                        <Text style={s.setupPrompt}>{'> train --sport='}{sport}</Text>
                        <Text style={s.setupTitle}>{sportLabel}</Text>
                        <Text style={s.setupSub}>AI BIOMECHANICS SESSION · POSE→FORM SCORE</Text>
                    </View>

                    <Panel>
                        <Header title="SPORT SELECT" />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
                            {SPORTS.map((sp) => (
                                <Pressable
                                    key={sp.key}
                                    onPress={() => setSport(sp.key)}
                                    style={({ pressed }) => [
                                        s.sportChip,
                                        sport === sp.key && { borderColor: C.text, backgroundColor: '#0a0a0a' },
                                        pressed && { backgroundColor: '#111' },
                                    ]}
                                >
                                    <Text style={[s.sportChipText, sport === sp.key && { color: C.text }]}>
                                        [{sp.label}]
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Panel>

                    <Panel>
                        <Header title="PRE-FLIGHT CHECK" />
                        <FieldRow label="L1............ LIGHTING"      value="▸ WINDOW FACING"    color={C.textSub} size="sm" />
                        <FieldRow label="L2............ FRAMING"       value="▸ FULL BODY"        color={C.textSub} size="sm" />
                        <FieldRow label="L3............ CAMERA HEIGHT" value="▸ WAIST · 2M AWAY"  color={C.textSub} size="sm" />
                        <FieldRow label="L4............ CLOTHING"      value="▸ FITTED"           color={C.textSub} size="sm" />
                    </Panel>

                    <Pressable onPress={startSession} style={({ pressed }) => [s.setupCta, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.setupCtaText}>[SPACE] START SESSION  ▸</Text>
                    </Pressable>
                </ScrollView>
            </TerminalScreen>
        );
    }

    // ── Live Camera View ──────────────────────────────────────────────────────────

    // During error, fall back to the last good frame so the overlay doesn't
    // go blank — users stay oriented while the backend reconnects.
    const displayMetrics = analysisMode === 'error'
        ? (metrics || lastGoodMetricsRef.current)
        : metrics;
    const staleMetrics = analysisMode === 'error' && !metrics && lastGoodMetricsRef.current;

    const Q_TERM = { elite: C.good, good: C.info, average: C.warn, poor: C.bad };
    const qColor = displayMetrics ? (Q_TERM[displayMetrics.form_quality] || C.text) : C.text;
    const modeLabel = analysisMode === 'real' ? 'LIVE.AI'
        : analysisMode === 'no_pose' ? 'NO.POSE'
        : analysisMode === 'waiting' ? 'ANALYSING'
        : analysisMode === 'error' ? (staleMetrics ? 'OFFLINE·STALE' : 'CONN.LOST')
        : 'WAIT';
    const modeColor = analysisMode === 'real' ? C.good
        : analysisMode === 'no_pose' ? C.warn
        : analysisMode === 'waiting' ? C.text
        : analysisMode === 'error' ? C.bad
        : C.textMid;

    return (
        <View style={s.cameraWrap}>
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={'back'}
                mute
                animateShutter={false}
                enableTorch={false}
            />

            {/* Top bar */}
            <View style={[s.camTopBar, { top: ins.top + 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={s.recDot} />
                    <Text style={s.recText}>REC</Text>
                </View>
                <Tap onPress={endSession}>
                    <Text style={s.finishText}>FINISH</Text>
                </Tap>
            </View>

            {/* Telemetry overlay */}
            <View style={[s.overlayMetrics, { top: ins.top + 60 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: modeColor, marginRight: 8 }} />
                    <Text style={[s.overlayMode, { color: modeColor }]}>{modeLabel}</Text>
                </View>
                {displayMetrics && (
                    <View style={{ opacity: staleMetrics ? 0.5 : 1 }}>
                        <Text style={s.overlayAngle}>{`KNEE  ${displayMetrics.knee_angle_l?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayAngle}>{`HIP   ${displayMetrics.hip_angle_l?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayAngle}>{`TRUNK ${displayMetrics.trunk_lean?.toFixed(0)}°`}</Text>
                        <Text style={s.overlayAngle}>{`SYM   ${displayMetrics.limb_symmetry_idx?.toFixed(2)}`}</Text>
                    </View>
                )}
            </View>

            {/* Bottom HUD */}
            <View style={[s.camBottomHUD, { bottom: ins.bottom + 20 }]}>
                <View style={[s.hudTopLine, { backgroundColor: analysisMode === 'real' ? qColor : modeColor }]} />
                <View style={s.hudContent}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.hudLabel, { color: analysisMode === 'real' ? qColor : modeColor }]}>
                            {analysisMode === 'real' ? 'LIVE CORRECTION'
                                : analysisMode === 'no_pose' ? 'NO PERSON DETECTED'
                                : analysisMode === 'error' ? 'CONNECTION ERROR'
                                : `ANALYZING · FRAME ${frameNum}`}
                        </Text>
                        <Text style={s.hudFeedback} numberOfLines={2}>
                            {analysisMode === 'no_pose'
                                ? 'Stand back — full body must be visible, head to feet'
                                : analysisMode === 'error'
                                ? (staleMetrics
                                    ? `Offline — showing last good frame. ${displayMetrics?.primary_feedback || ''}`.trim()
                                    : 'Check your connection. Frames will be analyzed when reconnected.')
                                : analysisMode === 'real'
                                ? (metrics?.primary_feedback || 'Great form!')
                                : 'Point camera at your full body. Stay still...'}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                        <Text style={s.hudStatLabel}>REPS</Text>
                        <Text style={[s.hudStatNum, { color: '#f97316' }]}>{repCount}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.hudStatLabel}>FORM</Text>
                        <Text style={[s.hudFormScore, { color: qColor }]}>{metrics?.form_score ?? '--'}%</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

function SummaryRow({ label, value, color }) {
    return (
        <View style={s.summaryRow}>
            <Text style={s.sumLabel}>{label}</Text>
            <Text style={[s.sumVal, { color }]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
    mutedText: { color: '#64748b', fontSize: 14 },

    // Setup — terminal layout
    setupHero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    setupPrompt: { fontSize: 11, color: C.textMid, fontFamily: MONO, fontWeight: '600' },
    setupTitle: { fontSize: 26, fontWeight: '700', color: '#E8E8E8', fontFamily: MONO, letterSpacing: 1, marginTop: 8 },
    setupSub: { fontSize: 10, color: C.textMid, fontFamily: MONO, marginTop: 6, letterSpacing: 1 },

    sportChip: {
        paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
        borderWidth: 1, borderColor: C.border,
    },
    sportChipText: { fontSize: 11, color: C.textMid, fontFamily: MONO, fontWeight: '700', letterSpacing: 1 },

    setupCta: {
        margin: 16, paddingVertical: 14, alignItems: 'center',
        borderWidth: 1, borderColor: C.text,
    },
    setupCtaText: { color: C.text, fontFamily: MONO, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },

    // Gradient CTA (used in permission + summary)
    gradientBtn: { borderRadius: 6, paddingVertical: 18, alignItems: 'center', marginHorizontal: 20 },
    gradientBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3, fontFamily: CONDENSED },

    // Camera view — terminal HUD overlays on live feed
    cameraWrap: { flex: 1, backgroundColor: '#000' },
    camTopBar: {
        position: 'absolute', left: 0, right: 0, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 8, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.bad, marginRight: 8 },
    recText: { color: C.bad, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },
    finishText: { color: C.bad, fontWeight: '700', fontSize: 11, letterSpacing: 1.5, fontFamily: MONO },

    overlayMetrics: { position: 'absolute', left: 12, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, borderColor: C.border },
    overlayMode: { fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
    overlayAngle: { color: C.text, fontSize: 10, fontWeight: '700', marginTop: 3, fontFamily: MONO, letterSpacing: 0.5 },

    // Bottom HUD — terminal panel over camera
    camBottomHUD: {
        position: 'absolute', left: 12, right: 12, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.88)', borderWidth: 1, borderColor: C.border,
    },
    hudTopLine: { height: 2, width: '100%' },
    hudContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
    hudLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4, fontFamily: MONO },
    hudFeedback: { color: '#E8E8E8', fontWeight: '600', fontSize: 11, fontFamily: MONO, letterSpacing: 0.3 },
    hudStatLabel: { fontSize: 8, color: C.textMid, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
    hudStatNum: { fontSize: 18, fontWeight: '700', fontFamily: MONO },
    hudFormScore: { fontSize: 32, fontWeight: '700', fontFamily: MONO, letterSpacing: -1 },

    // Summary (remaining legacy)
    summaryHeadline: { fontSize: 28, fontWeight: '700', color: '#E8E8E8', letterSpacing: 1, fontFamily: MONO, textAlign: 'center' },
    ringInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    ringScore: { fontSize: 44, fontWeight: '700', fontFamily: MONO },
    ringLabel: { fontSize: 9, fontWeight: '700', color: C.textMid, letterSpacing: 2, marginTop: -2 },
});
