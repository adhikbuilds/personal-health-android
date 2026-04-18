import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import RestTimerOverlay from '../../components/RestTimerOverlay';

const BG = '#0a0e1a';
const SURFACE = '#111827';
const TEXT = '#f9fafb';
const MUTED = '#9ca3af';
const ACCENT = '#06b6d4';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const RED = '#ef4444';

const SPORTS = [
    { key: 'sprint', label: 'Sprint' },
    { key: 'vertical_jump', label: 'Vertical Jump' },
    { key: 'push_up', label: 'Push-up' },
    { key: 'squat', label: 'Squat' },
    { key: 'javelin', label: 'Javelin' },
    { key: 'cricket_bat', label: 'Cricket Bat' },
];

export default function TrainScreen({ navigation, route, showToast }) {
    const autoStart = route?.params?.autoStart || false;
    const onboardingMode = route?.params?.onboardingMode || false;
    const placementSuboptimal = route?.params?.placementSuboptimal || false;

    const [permission, setPermission] = useState(null);
    const [sport, setSport] = useState(route?.params?.sport || 'sprint');
    const [athleteId, setAthleteId] = useState(route?.params?.athleteId || null);
    const [sessionId, setSessionId] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [score, setScore] = useState('--');
    const [phase, setPhase] = useState('ready');
    const [repCount, setRepCount] = useState(0);
    const [subtitle, setSubtitle] = useState(onboardingMode ? 'do 3 reps' : 'audio is primary');
    const [warningCue, setWarningCue] = useState('');
    const [speechFailed, setSpeechFailed] = useState(false);
    const [restTimerVisible, setRestTimerVisible] = useState(false);
    const [restSeconds, setRestSeconds] = useState(60);

    const cameraRef = useRef(null);
    const captureIntervalRef = useRef(null);
    const metricsWsRef = useRef(null);
    const cueCooldownRef = useRef(0);
    const warningTimerRef = useRef(null);
    const repCountRef = useRef(0);
    const lastPhaseRef = useRef(null);
    const autoEndedRef = useRef(false);
    const captureBusyRef = useRef(false);

    useEffect(() => {
        Camera.requestCameraPermissionsAsync().then(({ status }) => {
            setPermission({ granted: status === 'granted' });
        });
        getOrCreateAnonymousAthleteId().then((id) => {
            if (!athleteId) setAthleteId(id);
        }).catch(() => {});

        return () => {
            cleanupSession();
            Speech.stop();
        };
    }, []);

    useEffect(() => {
        if (permission?.granted && autoStart && athleteId && !isActive && !sessionId) {
            startSession();
        }
    }, [permission, autoStart, athleteId, isActive, sessionId]);

    const requestPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setPermission({ granted: status === 'granted' });
    };

    const setupAudio = async (urgent = false) => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
                playsInSilentModeIOS: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
        } catch (_) {}
    };

    const speakCue = async (text, urgency = 'normal') => {
        const now = Date.now();
        if (now - cueCooldownRef.current < 4000) return;
        cueCooldownRef.current = now;
        try {
            await setupAudio(urgency === 'warning');
            await Speech.stop();
            Speech.speak(text, {
                rate: 1.0,
                pitch: 0.9,
                language: 'en',
                volume: urgency === 'warning' ? 1.0 : 0.88,
                onError: () => {
                    setSpeechFailed(true);
                    setSubtitle(text);
                    setTimeout(() => setSubtitle(onboardingMode ? 'do 3 reps' : 'audio is primary'), 2000);
                },
            });
        } catch (_) {
            setSpeechFailed(true);
            setSubtitle(text);
            setTimeout(() => setSubtitle(onboardingMode ? 'do 3 reps' : 'audio is primary'), 2000);
        }
    };

    const cleanupSession = () => {
        if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (metricsWsRef.current) {
            try { metricsWsRef.current.close(); } catch (_) {}
        }
    };

    const startSession = async () => {
        cleanupSession();
        autoEndedRef.current = false;
        repCountRef.current = 0;
        lastPhaseRef.current = null;
        setRepCount(0);
        setScore('--');
        setSubtitle(onboardingMode ? 'do 3 reps' : 'audio is primary');
        setWarningCue('');

        const session = await api.startSession(athleteId || 'athlete_01', sport);
        const sid = session?.session_id;
        if (!sid) {
            showToast?.('Could not start session');
            return;
        }

        setSessionId(sid);
        setIsActive(true);

        if (onboardingMode) {
            speakCue('do 3 reps');
        }

        metricsWsRef.current = api.connectMetricsLive(
            sid,
            (payload) => {
                if (payload?.type === 'cue') {
                    if (payload.urgency === 'warning') {
                        setWarningCue(payload.text);
                        warningTimerRef.current = setTimeout(() => setWarningCue(''), 3000);
                    } else {
                        setSubtitle(payload.text);
                        setTimeout(() => setSubtitle(onboardingMode ? 'do 3 reps' : 'audio is primary'), 2000);
                    }
                    speakCue(payload.text, payload.urgency);
                    return;
                }

                if (payload?.type === 'frame') {
                    if (payload.form_score > 0) setScore(Math.round(payload.form_score));
                    if (payload.phase) {
                        setPhase(payload.phase);
                        if (lastPhaseRef.current === 'drive' && payload.phase === 'flight') {
                            repCountRef.current += 1;
                            setRepCount(repCountRef.current);
                            if (repCountRef.current > 0 && repCountRef.current % 3 === 0) {
                                setRestSeconds(60);
                                setRestTimerVisible(true);
                            }
                        }
                        lastPhaseRef.current = payload.phase;
                    }
                }
            },
            () => {},
            () => {},
        );

        captureIntervalRef.current = setInterval(async () => {
            if (!cameraRef.current || !sid || captureBusyRef.current) return;
            try {
                captureBusyRef.current = true;
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.1,
                    skipProcessing: true,
                });
                if (photo?.base64) {
                    await api.sendFrame(sid, {
                        image_b64: photo.base64,
                        sport,
                    });
                }
            } catch (_) {
            } finally {
                captureBusyRef.current = false;
            }
        }, 1200);
    };

    useEffect(() => {
        if (onboardingMode && isActive && repCount >= 3 && sessionId && !autoEndedRef.current) {
            autoEndedRef.current = true;
            setTimeout(() => endSession(), 700);
        }
    }, [onboardingMode, isActive, repCount, sessionId]);

    const endSession = async () => {
        cleanupSession();
        setIsActive(false);
        Speech.stop();
        if (!sessionId) return;
        await api.endSession(sessionId);
        navigation.replace('ShareCard', {
            sessionId,
            onboardingMode,
        });
    };

    if (!permission) {
        return <View style={s.center}><Text style={s.helper}>loading camera</Text></View>;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Text style={s.title}>camera access required</Text>
                    <Text style={s.helper}>Camera access is needed for biomechanics analysis.</Text>
                    <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
                        <Text style={s.primaryBtnText}>grant camera access</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!isActive) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.setupWrap}>
                    <Text style={s.kicker}>{onboardingMode ? 'first session' : 'pre-session'}</Text>
                    <Text style={s.title}>{onboardingMode ? 'Choose one drill.' : 'Choose your drill.'}</Text>
                    <Text style={s.helper}>{onboardingMode ? 'Phone placement comes next. Then you start.' : 'Phone placement runs before the session starts.'}</Text>

                    <View style={s.sportGrid}>
                        {SPORTS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[s.sportTile, sport === item.key && s.sportTileActive]}
                                onPress={() => setSport(item.key)}
                            >
                                <Text style={[s.sportText, sport === item.key && { color: ACCENT }]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => navigation.navigate('PlacementWizard', {
                            sport,
                            athleteId: athleteId || 'athlete_01',
                            onboardingMode,
                            overrideAfterSeconds: onboardingMode ? 10 : 15,
                        })}
                    >
                        <Text style={s.primaryBtnText}>place your phone</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={s.liveWrap}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

            {warningCue ? (
                <View style={s.warningBar}>
                    <Text style={s.warningText}>{warningCue}</Text>
                </View>
            ) : null}

            {placementSuboptimal ? (
                <View style={s.infoBar}>
                    <Text style={s.infoText}>setup sub-optimal — scores may be less accurate</Text>
                </View>
            ) : null}

            <View style={s.centerScore}>
                <Text style={s.score}>{score}</Text>
                <Text style={s.phase}>{phase}</Text>
            </View>

            <View style={s.subtitleBar}>
                <Text style={[s.subtitleText, speechFailed && { color: TEXT }]} numberOfLines={1}>
                    {subtitle}
                </Text>
            </View>

            {onboardingMode ? (
                <View style={s.repsPrompt}>
                    <Text style={s.repsPromptText}>do 3 reps</Text>
                    <Text style={s.repsCount}>{repCount}/3</Text>
                </View>
            ) : null}

            <TouchableOpacity style={s.stopBtn} onPress={endSession} activeOpacity={0.95}>
                <Text style={s.stopText}>stop session</Text>
            </TouchableOpacity>

            <RestTimerOverlay
                visible={restTimerVisible}
                sport={sport}
                restSeconds={restSeconds}
                onComplete={() => setRestTimerVisible(false)}
                onStopSession={() => { setRestTimerVisible(false); endSession(); }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    center: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 },
    setupWrap: { flex: 1, padding: 24, backgroundColor: BG },
    kicker: { color: ACCENT, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 12 },
    title: { color: TEXT, fontSize: 34, fontWeight: '900', marginTop: 10, letterSpacing: -0.8 },
    helper: { color: MUTED, fontSize: 16, lineHeight: 22, marginTop: 10 },
    sportGrid: { marginTop: 24, gap: 10 },
    sportTile: { backgroundColor: SURFACE, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    sportTileActive: { borderColor: ACCENT, backgroundColor: 'rgba(6,182,212,0.10)' },
    sportText: { color: TEXT, fontSize: 18, fontWeight: '800' },
    primaryBtn: { backgroundColor: ACCENT, borderRadius: 999, marginTop: 24, paddingVertical: 18, alignItems: 'center' },
    primaryBtnText: { color: '#001018', fontSize: 18, fontWeight: '900', textTransform: 'lowercase' },
    liveWrap: { flex: 1, backgroundColor: BG },
    warningBar: { position: 'absolute', top: 52, left: 16, right: 16, zIndex: 6, backgroundColor: RED, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
    warningText: { color: TEXT, fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
    infoBar: { position: 'absolute', top: 52, left: 16, right: 16, zIndex: 5, backgroundColor: 'rgba(17,24,39,0.9)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
    infoText: { color: MUTED, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    centerScore: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    score: { color: ACCENT, fontSize: 136, fontWeight: '900', lineHeight: 144 },
    phase: { color: MUTED, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: '800' },
    subtitleBar: { position: 'absolute', top: '14%', left: 16, right: 16, alignItems: 'center' },
    subtitleText: { color: MUTED, fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
    repsPrompt: { position: 'absolute', left: 16, right: 16, bottom: '34%', alignItems: 'center' },
    repsPromptText: { color: TEXT, fontSize: 44, fontWeight: '900', textTransform: 'lowercase' },
    repsCount: { color: MUTED, fontSize: 22, fontWeight: '800', marginTop: 8 },
    stopBtn: { position: 'absolute', left: 16, right: 16, bottom: 18, height: '28%', backgroundColor: 'rgba(17,24,39,0.92)', borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    stopText: { color: TEXT, fontSize: 28, fontWeight: '900', textTransform: 'lowercase' },
});
