// NutritionScreen — Bloomberg terminal.
// Capture meal photo → POST to vision backend → render macros as terminal
// distribution bars.

import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Animated,
    StatusBar, Pressable, ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import api from '../services/api';

import { C, T } from '../styles/colors';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, DistBar,
    TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, nowISO,
} from '../components/terminal';

const NUTRIENT_COLORS = {
    calories:  C.warn,
    protein_g: C.good,
    carbs_g:   C.info,
    fat_g:     C.amber,
    fiber_g:   C.mauve || C.info,
};

const NUTRIENT_LABELS = {
    calories:  'CAL',
    protein_g: 'PROTEIN',
    carbs_g:   'CARBS',
    fat_g:     'FAT',
    fiber_g:   'FIBER',
};

const NUTRIENT_UNITS = {
    calories:  'KCAL',
    protein_g: 'G',
    carbs_g:   'G',
    fat_g:     'G',
    fiber_g:   'G',
};

const NUTRIENT_MAX = {
    calories:  800,
    protein_g: 60,
    carbs_g:   100,
    fat_g:     40,
    fiber_g:   20,
};

const ORDER = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

export default function NutritionScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const clock = useLiveClock();
    const { userData } = useUser();
    const userTag = (userData?.avatarId || 'ath').toUpperCase();

    const [permission, requestPermission] = Camera.useCameraPermissions();
    const cameraRef = useRef(null);

    const [screen, setScreen] = useState('camera'); // camera | analyzing | result
    const [result, setResult] = useState(null);
    const [err, setErr] = useState('');

    const capture = useCallback(async () => {
        if (!cameraRef.current) return;
        try {
            setScreen('analyzing');
            setErr('');
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.6, skipProcessing: true, shutterSound: false,
            });
            if (!photo?.base64) { setErr('CAPTURE FAILED'); setScreen('camera'); return; }
            const res = await api.analyzeFood(userData?.avatarId || 'athlete_01', photo.base64);
            if (!res) { setErr('ANALYSIS FAILED'); setScreen('camera'); return; }
            setResult(res);
            setScreen('result');
        } catch (e) {
            setErr('CAPTURE ERROR: ' + (e.message || 'UNKNOWN').toUpperCase());
            setScreen('camera');
        }
    }, [userData]);

    // No permission
    if (!permission) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={C.text} />
                <Text style={{ color: C.textMid, fontFamily: T.MONO, fontSize: 11, letterSpacing: 2, marginTop: 14, fontWeight: '700' }}>
                    REQUESTING CAMERA ACCESS...
                </Text>
            </View>
        );
    }
    if (!permission.granted) {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity={`${userTag}.NUTR-AI`} clock={clock} />
                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> nutrition --init'}</Text>
                    <Text style={s.title}>CAMERA PERMISSION REQUIRED</Text>
                </View>
                <Pressable onPress={requestPermission} style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnText}>[A] ALLOW CAMERA  ▸</Text>
                </Pressable>
                <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.btnSecondary, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnSecondaryText}>[ESC] RETURN</Text>
                </Pressable>
            </TerminalScreen>
        );
    }

    // ═══ CAMERA ═══
    if (screen === 'camera') {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={null} identity={`${userTag}.NUTR-AI`} clock={clock} />

                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> nutrition --capture'}</Text>
                    <Text style={s.title}>MEAL CAPTURE</Text>
                    <Text style={s.subtitle}>POINT CAMERA AT MEAL · TRIGGER TO ANALYSE</Text>
                </View>

                <View style={s.camWrap}>
                    <View style={s.camBorder}>
                        <CameraView
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            facing="back"
                            shutterSound={false}
                            animateShutter={false}
                        />
                        {/* Crosshair overlay */}
                        <View style={s.crosshair} pointerEvents="none">
                            <View style={[s.cornerTL]} />
                            <View style={[s.cornerTR]} />
                            <View style={[s.cornerBL]} />
                            <View style={[s.cornerBR]} />
                        </View>
                    </View>
                </View>

                {!!err && (
                    <View style={{ paddingHorizontal: 16 }}>
                        <Text style={s.errText}>[ERR] {err}</Text>
                    </View>
                )}

                <Pressable onPress={capture} style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnText}>[SPACE] CAPTURE & ANALYSE  ▸</Text>
                </Pressable>
                <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.btnSecondary, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnSecondaryText}>[ESC] RETURN</Text>
                </Pressable>
            </TerminalScreen>
        );
    }

    // ═══ ANALYSING ═══
    if (screen === 'analyzing') {
        return (
            <TerminalScreen style={{ paddingTop: ins.top }}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
                <SysBar online={true} identity={`${userTag}.NUTR-AI`} clock={clock} />
                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> nutrition --analyse'}</Text>
                    <Text style={s.title}>PROCESSING</Text>
                </View>
                <Panel>
                    <Header title="PIPELINE" />
                    <FieldRow label="01............ CAPTURE"       value="[OK]"       color={C.good} />
                    <FieldRow label="02............ COMPRESS"      value="[OK]"       color={C.good} />
                    <FieldRow label="03............ POST TO VISION" value="[RUNNING]" color={C.text} />
                    <FieldRow label="04............ PARSE MACROS"  value="[PENDING]"  color={C.muted} dim />
                    <FieldRow label="05............ COACHING"      value="[PENDING]"  color={C.muted} dim />
                </Panel>
                <View style={s.analysingBox}>
                    <Text style={s.analysingTxt}>SCANNING MEAL VIA VISION MODEL.....</Text>
                </View>
            </TerminalScreen>
        );
    }

    // ═══ RESULT ═══
    const nutrients = result?.nutrients || {};
    const foodItems = result?.food_items || [];
    const mealScore = result?.meal_score || 0;
    const coaching = result?.coaching || result?.recommendation || '';

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
            <SysBar online={true} identity={`${userTag}.NUTR-AI`} clock={clock} />

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ padding: 16 }}>
                    <Text style={s.prompt}>{'> nutrition --result'}</Text>
                    <Text style={s.title}>MEAL ANALYSIS</Text>
                </View>

                {/* Meal score */}
                <Panel>
                    <Header title="MEAL SCORE" right={<HdrMeta color={mealScore >= 70 ? C.good : mealScore >= 50 ? C.warn : C.bad}>
                        [{mealScore >= 70 ? 'GOOD' : mealScore >= 50 ? 'OK' : 'LOW'}]
                    </HdrMeta>} />
                    <View style={s.scoreBody}>
                        <Text style={[s.scoreBig, { color: mealScore >= 70 ? C.good : mealScore >= 50 ? C.warn : C.bad }]}>
                            {String(Math.round(mealScore)).padStart(3, '0')}
                        </Text>
                        <View style={s.scoreRight}>
                            <Text style={s.scoreMax}>/ 100</Text>
                            <Text style={[s.scoreCaption, { color: C.muted }]}>NUTRIENT DENSITY</Text>
                        </View>
                    </View>
                </Panel>

                {/* Macros */}
                <Panel>
                    <Header title="MACROS · AGGREGATE" />
                    {ORDER.map(key => {
                        const v = Number(nutrients[key] || 0);
                        const max = NUTRIENT_MAX[key] || 100;
                        const pct = Math.min(100, (v / max) * 100);
                        return (
                            <DistBar
                                key={key}
                                label={`${NUTRIENT_LABELS[key]} (${NUTRIENT_UNITS[key]})`}
                                value={Math.round(v)}
                                total={max}
                                color={NUTRIENT_COLORS[key] || C.text}
                                pct={pct}
                            />
                        );
                    })}
                </Panel>

                {/* Food items */}
                {foodItems.length > 0 && (
                    <Panel>
                        <Header title="DETECTED ITEMS" right={<HdrMeta>N={fmtInt(foodItems.length)}</HdrMeta>} />
                        {foodItems.slice(0, 10).map((item, i) => {
                            const name = (item.name || item.item || '').toUpperCase();
                            const confidence = item.confidence ?? item.score ?? 1;
                            return (
                                <FieldRow
                                    key={i}
                                    label={`I${String(i + 1).padStart(2, '0')}.......... ${name.slice(0, 18)}`}
                                    value={fmt(confidence * 100, 0) + '%'}
                                    color={confidence > 0.7 ? C.good : confidence > 0.5 ? C.warn : C.muted}
                                    size="sm"
                                />
                            );
                        })}
                    </Panel>
                )}

                {/* Coaching */}
                {coaching && (
                    <Panel>
                        <Header title="COACH NOTE" />
                        <View style={{ padding: 12 }}>
                            <Text style={s.body}>{String(coaching).toUpperCase()}</Text>
                        </View>
                    </Panel>
                )}

                <Pressable onPress={() => { setResult(null); setScreen('camera'); }} style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnText}>[N] NEW CAPTURE  ▸</Text>
                </Pressable>
                <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.btnSecondary, pressed && { backgroundColor: '#111' }]}>
                    <Text style={s.btnSecondaryText}>[ESC] RETURN</Text>
                </Pressable>

                <Footer lines={[
                    { text: `END OF ANALYSIS · ${nowISO()}` },
                    { text: `VISION MODEL · CLAUDE · ${fmtInt(Object.values(nutrients).reduce((a, b) => a + b, 0))} G AGG` },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    prompt:    { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    title:     { fontSize: 22, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1, marginTop: 8 },
    subtitle:  { fontSize: 10, color: C.textMid, fontFamily: T.MONO, marginTop: 8, letterSpacing: 1 },
    body:      { fontSize: 11, color: C.textSub, fontFamily: T.MONO, lineHeight: 17, letterSpacing: 0.3 },

    camWrap:   { marginHorizontal: 16, marginTop: 14, height: 360 },
    camBorder: { flex: 1, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    crosshair: { ...StyleSheet.absoluteFillObject },
    cornerTL:  { position: 'absolute', top: 12, left: 12,  width: 20, height: 20, borderLeftWidth: 2, borderTopWidth: 2,    borderColor: C.text },
    cornerTR:  { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRightWidth: 2, borderTopWidth: 2,   borderColor: C.text },
    cornerBL:  { position: 'absolute', bottom: 12, left: 12,  width: 20, height: 20, borderLeftWidth: 2, borderBottomWidth: 2,  borderColor: C.text },
    cornerBR:  { position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderRightWidth: 2, borderBottomWidth: 2, borderColor: C.text },

    errText:   { color: C.bad, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 10 },

    analysingBox: { padding: 16, alignItems: 'center' },
    analysingTxt: { color: C.text, fontFamily: T.MONO, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },

    scoreBody:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    scoreBig:    { fontSize: 72, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -3, lineHeight: 66 },
    scoreRight:  { marginLeft: 12, marginBottom: 4, flex: 1 },
    scoreMax:    { fontSize: 13, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    scoreCaption:{ fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    btn:          { margin: 16, marginTop: 20, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.text },
    btnText:      { color: C.text, fontFamily: T.MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
    btnSecondary: { marginHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    btnSecondaryText: { color: C.textMid, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
});
