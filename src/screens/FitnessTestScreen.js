// FitnessTestScreen — Bloomberg terminal.
// Standardised Fit India assessment. Three-panel workflow: INTRO → INPUT → RESULTS.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TextInput, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { C, T, LEVEL_COLORS, LEVEL_LABELS } from '../styles/colors';
import { computeFitnessScore, FITNESS_TEST_BANDS } from '../data/constants';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { Fade } from '../ui';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, SysBar, DistBar,
    TerminalScreen, Footer, useLiveClock, fmt, fmtInt, nowISO,
} from '../components/terminal';

const HISTORY_KEY = '@fitness_test_history';

function bandFor(score) {
    return FITNESS_TEST_BANDS.find(b => score >= b.minScore && score < b.maxScore)
        || FITNESS_TEST_BANDS[FITNESS_TEST_BANDS.length - 1];
}

// ─── Run Timer (keep logic, restyle) ──────────────────────────────────────

function RunTimer({ onTimeSet }) {
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [done, setDone] = useState(false);
    const interval = useRef(null);

    useEffect(() => () => { if (interval.current) clearInterval(interval.current); }, []);

    const start = () => {
        setRunning(true);
        setDone(false);
        const t0 = Date.now() - elapsed * 1000;
        interval.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    };
    const stop = () => { clearInterval(interval.current); setRunning(false); setDone(true); onTimeSet(elapsed); };
    const reset = () => { clearInterval(interval.current); setRunning(false); setDone(false); setElapsed(0); onTimeSet(0); };

    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    return (
        <View style={s.timerBox}>
            <Text style={s.timerClock}>{mins}:{secs}</Text>
            <View style={s.timerBtnRow}>
                {!running && !done && (
                    <Pressable onPress={start} style={({ pressed }) => [s.timerBtn, { borderColor: C.good }, pressed && { backgroundColor: '#111' }]}>
                        <Text style={[s.timerBtnText, { color: C.good }]}>[START]</Text>
                    </Pressable>
                )}
                {running && (
                    <Pressable onPress={stop} style={({ pressed }) => [s.timerBtn, { borderColor: C.bad }, pressed && { backgroundColor: '#111' }]}>
                        <Text style={[s.timerBtnText, { color: C.bad }]}>[STOP]</Text>
                    </Pressable>
                )}
                {done && (
                    <Pressable onPress={reset} style={({ pressed }) => [s.timerBtn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.timerBtnText}>[RESET]</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function FitnessTestScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData, updateFitnessScore } = useUser();
    const clock = useLiveClock();
    const userTag = (userData?.avatarId || 'ath').toUpperCase();

    const [step, setStep] = useState('intro');        // intro | input | results
    const [saving, setSaving] = useState(false);

    const [heightCm,  setHeightCm]  = useState('');
    const [weightKg,  setWeightKg]  = useState('');
    const [reachCm,   setReachCm]   = useState('');
    const [runSeconds, setRunSeconds] = useState(0);
    const [runInput,  setRunInput]  = useState('');
    const [useTimer,  setUseTimer]  = useState(true);

    const [results, setResults] = useState(null);

    const bmi = heightCm && weightKg
        ? (parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)
        : null;

    const calculate = useCallback(() => {
        const h = parseFloat(heightCm);
        const w = parseFloat(weightKg);
        const r = parseFloat(reachCm);
        const t = runSeconds || parseFloat(runInput) || 0;
        if (!h || !w || !r || !t) return;
        if (h < 50 || h > 250) { Alert.alert('INVALID INPUT', 'Height 50-250 cm.'); return; }
        if (w < 10 || w > 300) { Alert.alert('INVALID INPUT', 'Weight 10-300 kg.'); return; }
        if (r < 0  || r > 60)  { Alert.alert('INVALID INPUT', 'Sit & Reach 0-60 cm.'); return; }
        if (t < 30 || t > 900) { Alert.alert('INVALID INPUT', 'Run time 30-900 s.'); return; }
        const result = computeFitnessScore(w / Math.pow(h / 100, 2), r, t);
        setResults(result);
        setStep('results');
    }, [heightCm, weightKg, reachCm, runSeconds, runInput]);

    const saveResults = useCallback(async () => {
        if (!results) return;
        setSaving(true);
        updateFitnessScore(results.overall, results.level, results.label, results.color);
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            const history = raw ? JSON.parse(raw) : [];
            history.unshift({ ...results, date: new Date().toISOString(), name: userData.name });
            if (history.length > 5) history.length = 5;
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (_) {}
        api.submitFitnessTest(userData.avatarId, {
            score: results.overall, level: results.level,
            bmi: parseFloat(bmi), sit_reach_cm: parseFloat(reachCm),
            run_600_seconds: runSeconds || parseFloat(runInput),
        });
        setSaving(false);
        navigation.goBack();
    }, [results, bmi, reachCm, runSeconds, runInput, userData, updateFitnessScore, navigation]);

    const bmiCategory = (b) => {
        if (!b) return '--';
        const v = parseFloat(b);
        if (v < 18.5) return 'UNDERWEIGHT';
        if (v < 25)   return 'NORMAL';
        if (v < 30)   return 'OVERWEIGHT';
        return 'OBESE';
    };
    const bmiColor = (b) => {
        if (!b) return C.muted;
        const v = parseFloat(b);
        if (v < 18.5 || v >= 30) return C.bad;
        if (v < 25) return C.good;
        return C.warn;
    };

    // ═══ INTRO ═══
    if (step === 'intro') {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <SysBar online={null} identity={`${userTag}.FIT-TEST`} clock={clock} />
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <Fade style={s.header}>
                        <Text style={s.prompt}>{'> fitness-test --init'}</Text>
                        <Text style={s.title}>FIT INDIA ASSESSMENT</Text>
                        <Text style={s.subtitle}>BMI · SIT & REACH · 600M RUN/WALK → L1-L7</Text>
                    </Fade>

                    <Fade delay={60}>
                        <Panel>
                            <Header title="TEST COMPONENTS" />
                            <FieldRow label="T1............ BODY MASS INDEX"      value="25 PTS" color={C.text} />
                            <FieldRow label="T2............ SIT & REACH (FLEX)"   value="35 PTS" color={C.text} />
                            <FieldRow label="T3............ 600M RUN/WALK (STAM)" value="40 PTS" color={C.text} />
                            <Rule />
                            <FieldRow label="TOTAL......... COMPOSITE SCORE"      value="100 PTS" color={C.good} />
                        </Panel>
                    </Fade>

                    <Fade delay={100}>
                        <Panel>
                            <Header title="SCORING BANDS" />
                            {FITNESS_TEST_BANDS.map(b => (
                                <FieldRow
                                    key={b.level}
                                    label={`L${b.level}........... ${b.label.toUpperCase()}`}
                                    value={`${b.minScore}-${b.maxScore}`}
                                    color={b.color}
                                    size="sm"
                                />
                            ))}
                        </Panel>
                    </Fade>

                    <Pressable onPress={() => setStep('input')} style={({ pressed }) => [s.startBtn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.startBtnText}>[ENTER] BEGIN ASSESSMENT  ▸</Text>
                    </Pressable>
                </ScrollView>
            </TerminalScreen>
        );
    }

    // ═══ INPUT ═══
    if (step === 'input') {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <SysBar online={null} identity={`${userTag}.FIT-TEST`} clock={clock} />
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <Fade style={s.header}>
                        <Text style={s.prompt}>{'> fitness-test --input'}</Text>
                        <Text style={s.title}>ENTER MEASUREMENTS</Text>
                    </Fade>

                    {/* BMI */}
                    <Fade delay={60}>
                        <Panel>
                            <Header title="T1 · BODY MASS INDEX" right={bmi ? <HdrMeta color={bmiColor(bmi)}>BMI {bmi} · {bmiCategory(bmi)}</HdrMeta> : null} />
                            <View style={s.inputRow}>
                                <Text style={s.inputLabel}>HT (CM).......</Text>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={heightCm}
                                    onChangeText={setHeightCm}
                                    placeholder="175"
                                    placeholderTextColor={C.muted}
                                />
                            </View>
                            <View style={s.inputRow}>
                                <Text style={s.inputLabel}>WT (KG).......</Text>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={weightKg}
                                    onChangeText={setWeightKg}
                                    placeholder="68"
                                    placeholderTextColor={C.muted}
                                />
                            </View>
                        </Panel>
                    </Fade>

                    {/* Flexibility */}
                    <Fade delay={100}>
                        <Panel>
                            <Header title="T2 · SIT & REACH" />
                            <View style={s.inputRow}>
                                <Text style={s.inputLabel}>REACH (CM)....</Text>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={reachCm}
                                    onChangeText={setReachCm}
                                    placeholder="22"
                                    placeholderTextColor={C.muted}
                                />
                            </View>
                            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                                <Text style={s.inputHint}>
                                    Sit, legs straight, reach forward. Measure furthest point.
                                </Text>
                            </View>
                        </Panel>
                    </Fade>

                    {/* Run */}
                    <Fade delay={140}>
                        <Panel>
                            <Header title="T3 · 600M RUN/WALK" right={
                                <Pressable onPress={() => { setUseTimer(t => !t); setRunSeconds(0); setRunInput(''); }}>
                                    <Text style={[s.hdrToggle, { color: C.text }]}>
                                        [{useTimer ? 'TIMER' : 'MANUAL'}]
                                    </Text>
                                </Pressable>
                            } />
                            {useTimer ? (
                                <RunTimer onTimeSet={setRunSeconds} />
                            ) : (
                                <View style={s.inputRow}>
                                    <Text style={s.inputLabel}>TIME (SEC)....</Text>
                                    <TextInput
                                        style={s.input}
                                        keyboardType="numeric"
                                        value={runInput}
                                        onChangeText={setRunInput}
                                        placeholder="210"
                                        placeholderTextColor={C.muted}
                                    />
                                </View>
                            )}
                        </Panel>
                    </Fade>

                    <View style={s.btnRow}>
                        <Pressable onPress={() => setStep('intro')} style={({ pressed }) => [s.secondaryBtn, pressed && { backgroundColor: '#111' }]}>
                            <Text style={s.secondaryBtnText}>[ESC] BACK</Text>
                        </Pressable>
                        <Pressable onPress={calculate} style={({ pressed }) => [s.primaryBtn, pressed && { backgroundColor: '#111' }]}>
                            <Text style={s.primaryBtnText}>[RUN] CALCULATE  ▸</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </TerminalScreen>
        );
    }

    // ═══ RESULTS ═══
    const r = results || {};
    const band = bandFor(r.overall || 0);
    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <SysBar online={null} identity={`${userTag}.FIT-TEST`} clock={clock} />
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

                <Fade style={s.header}>
                    <Text style={s.prompt}>{'> fitness-test --results'}</Text>
                    <Text style={s.title}>ASSESSMENT COMPLETE</Text>
                </Fade>

                <Fade delay={60}>
                    <Panel>
                        <Header title="OVERALL SCORE" right={<HdrMeta color={r.color || band.color}>[L{r.level || band.level}] {(r.label || band.label || '').toUpperCase()}</HdrMeta>} />
                        <View style={s.scoreBody}>
                            <Text style={[s.scoreBig, { color: r.color || band.color }]}>
                                {String(r.overall || 0).padStart(3, '0')}
                            </Text>
                            <View style={s.scoreRight}>
                                <Text style={s.scoreMax}>/ 100.00</Text>
                                <Text style={[s.scoreBand, { color: r.color || band.color }]}>
                                    [{(r.label || '').toUpperCase()}]
                                </Text>
                            </View>
                        </View>
                    </Panel>
                </Fade>

                <Fade delay={100}>
                    <Panel>
                        <Header title="COMPONENT BREAKDOWN" />
                        <DistBar label="BMI"     value={Math.round(r.bmiScore || 0)}  total={100} color={(r.bmiScore || 0)  >= 70 ? C.good : C.warn} pct={r.bmiScore || 0} />
                        <DistBar label="FLEX"    value={Math.round(r.flexScore || 0)} total={100} color={(r.flexScore || 0) >= 70 ? C.good : C.warn} pct={r.flexScore || 0} />
                        <DistBar label="STAMINA" value={Math.round(r.runScore || 0)}  total={100} color={(r.runScore || 0)  >= 70 ? C.good : C.warn} pct={r.runScore || 0} />
                        <Rule />
                        <FieldRow label="BMI.......... BODY MASS INDEX" value={`${bmi || '--'} · ${bmiCategory(bmi)}`} color={bmiColor(bmi)} />
                        <FieldRow label="REACH........ SIT & REACH (CM)" value={reachCm || '--'} color={C.text} />
                        <FieldRow label="TIME......... 600M (MM:SS)"
                            value={(() => {
                                const t = runSeconds || parseFloat(runInput) || 0;
                                return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                            })()}
                            color={C.text}
                        />
                    </Panel>
                </Fade>

                <View style={s.btnRow}>
                    <Pressable onPress={() => setStep('input')} style={({ pressed }) => [s.secondaryBtn, pressed && { backgroundColor: '#111' }]}>
                        <Text style={s.secondaryBtnText}>[RETRY]</Text>
                    </Pressable>
                    <Pressable onPress={saveResults} disabled={saving} style={({ pressed }) => [s.primaryBtn, pressed && { backgroundColor: '#111' }, saving && { opacity: 0.5 }]}>
                        <Text style={s.primaryBtnText}>[SAVE] {saving ? 'SAVING...' : 'COMMIT RESULTS'}  ▸</Text>
                    </Pressable>
                </View>

                <Footer lines={[
                    { text: `END OF ASSESSMENT · ${nowISO()}` },
                    { text: `ATHLETE ${userTag} · SCORE ${r.overall || 0}/100 · L${r.level || 0}`, color: r.color || band.color },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    header:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    prompt:    { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    title:     { fontSize: 22, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1, marginTop: 8 },
    subtitle:  { fontSize: 11, color: C.textMid, fontFamily: T.MONO, marginTop: 6, letterSpacing: 1 },

    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#0C0C0C',
    },
    inputLabel: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.5, width: 100 },
    input: {
        flex: 1, color: C.text, fontFamily: T.MONO, fontSize: 14, fontWeight: '700',
        borderWidth: 1, borderColor: C.border,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    inputHint: { fontSize: 10, color: C.muted, fontFamily: T.MONO, fontStyle: 'italic' },

    hdrToggle: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1 },

    timerBox:    { paddingVertical: 20, alignItems: 'center' },
    timerClock:  { fontSize: 48, fontFamily: T.MONO, color: '#E8E8E8', fontWeight: '700', letterSpacing: -2 },
    timerBtnRow: { flexDirection: 'row', marginTop: 16 },
    timerBtn:    { borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 7, marginHorizontal: 6 },
    timerBtnText:{ color: C.text, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

    startBtn:    { margin: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.text },
    startBtnText:{ color: C.text, fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

    btnRow:    { flexDirection: 'row', margin: 16 },
    primaryBtn:   { flex: 2, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.text, marginLeft: 8 },
    primaryBtnText:{ color: C.text, fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
    secondaryBtn:  { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    secondaryBtnText:{ color: C.textMid, fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

    scoreBody:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    scoreBig:   { fontSize: 80, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -4, lineHeight: 74 },
    scoreRight: { marginLeft: 12, marginBottom: 4, flex: 1 },
    scoreMax:   { fontSize: 14, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    scoreBand:  { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
});
