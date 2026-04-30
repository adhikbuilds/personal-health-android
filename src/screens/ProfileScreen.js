// ProfileScreen — Bloomberg terminal.
// Athlete identity, system info, session log table. All mono, no cards.

import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput,
    Dimensions, StatusBar, ActivityIndicator, RefreshControl,
    Pressable, Alert, DevSettings,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Fade } from '../ui';
import { Sparkline } from '../components/charts';
import { C, T, LEVEL_COLORS, LEVEL_LABELS, getActiveTheme } from '../styles/colors';
import { THEME_LIST, THEME_STORAGE_KEY, CAMERA_ENGINE_KEY, CAMERA_ENGINES, DEFAULT_CAMERA_ENGINE } from '../styles/themes';
import { sportLabel, SPORT_LABELS } from '../config/sports';
import {
    Panel, Header, HdrMeta, Rule, FieldRow, Triad, SysBar, Ticker, DistBar, Table,
    TerminalScreen, Footer, useLiveClock,
    fmt, fmtInt, signPct, trendColor, bandColor, nowISO,
} from '../components/terminal';

const { width: W } = Dimensions.get('window');

function scoreColor(v) {
    if (v >= 75) return C.good;
    if (v >= 50) return C.warn;
    return C.bad;
}

function fmtDate(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ProfileScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const { userData, fitnessScore, dataMode, refreshUser } = useUser();
    const { user: authUser, logout } = useAuth();
    const athleteId = userData?.avatarId || authUser?.athlete_id || 'athlete_01';

    const handleLogout = useCallback(() => {
        Alert.alert(
            'Sign out?',
            'You will need to sign in again with your email and password.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: () => { logout(); },
                },
            ],
        );
    }, [logout]);
    const userTag = athleteId.toUpperCase();
    const sportTag = (userData?.sport || 'general').toUpperCase().replace('_', '-');
    const clock = useLiveClock();

    const [sessions, setSessions] = useState([]);
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [advanced, setAdvanced] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editSport, setEditSport] = useState('');
    const [editHeight, setEditHeight] = useState('');
    const [saving, setSaving] = useState(false);

    const startEdit = useCallback(() => {
        setEditName(userData?.name || '');
        setEditSport(userData?.sport || 'vertical_jump');
        setEditHeight(String(userData?.height_cm || '170'));
        setEditing(true);
    }, [userData]);

    const saveProfile = useCallback(async () => {
        setSaving(true);
        try {
            const body = {};
            if (editName.trim()) body.name = editName.trim();
            if (editSport) body.sport = editSport;
            const h = parseFloat(editHeight);
            if (h > 0) body.height_cm = h;
            await api.patch(`/athlete/${encodeURIComponent(athleteId)}`, body);
            refreshUser();
            setEditing(false);
            Alert.alert('Saved', 'Profile updated.');
        } catch (e) {
            Alert.alert('Error', 'Could not save profile.');
        } finally {
            setSaving(false);
        }
    }, [athleteId, editName, editSport, editHeight, refreshUser]);

    const [activeTheme, setActiveThemeName] = useState(getActiveTheme());
    const [cameraEngine, setCameraEngineState] = useState(DEFAULT_CAMERA_ENGINE);
    useEffect(() => {
        AsyncStorage.getItem(CAMERA_ENGINE_KEY).then((v) => {
            if (v && Object.values(CAMERA_ENGINES).includes(v)) setCameraEngineState(v);
        }).catch(() => {});
    }, []);

    const switchCameraEngine = useCallback((id) => {
        if (id === cameraEngine) return;
        AsyncStorage.setItem(CAMERA_ENGINE_KEY, id).then(() => {
            setCameraEngineState(id);
            Alert.alert(
                'Camera engine changed',
                'The change takes effect the next time you start a training session.',
            );
        }).catch(() => Alert.alert('Could not save', 'Try again.'));
    }, [cameraEngine]);

    const switchTheme = useCallback((id) => {
        if (id === activeTheme) return;
        AsyncStorage.setItem(THEME_STORAGE_KEY, id).then(() => {
            setActiveThemeName(id);
            try {
                if (DevSettings && typeof DevSettings.reload === 'function') {
                    DevSettings.reload();
                    return;
                }
            } catch (_) { /* fall through */ }
            Alert.alert('Theme saved', 'Restart the app to apply the new theme.');
        }).catch(() => {
            Alert.alert('Could not save theme', 'Try again.');
        });
    }, [activeTheme]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sess, ping, adv] = await Promise.all([
                api.getSessions(athleteId, 15),
                api.ping(),
                api.getAdvancedMetrics(athleteId, 60),
            ]);
            setSessions(sess?.sessions || sess || []);
            setOnline(!!ping);
            setAdvanced(adv);
        } finally {
            setLoading(false);
        }
    }, [athleteId]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    const sessionList = Array.isArray(sessions) ? sessions : [];
    const sport = sportLabel(userData?.sport || 'vertical_jump');
    const lvl = userData?.level || 1;
    const fs = fitnessScore?.score || 0;

    const tickerItems = [
        { label: 'BPI',    value: fmtInt(userData?.bpi || 0) },
        { label: 'FITSCR', value: String(fs).padStart(3, '0'), color: fitnessScore?.color || C.text },
        { label: 'LVL',    value: `L${lvl}`, color: LEVEL_COLORS[lvl] || C.text },
        { label: 'SESS',   value: fmtInt(userData?.sessions || 0) },
        { label: 'STRK',   value: fmtInt(userData?.streak || 0) + 'D', color: C.good },
        { label: 'DATA',   value: (dataMode || 'mock').toUpperCase(), color: dataMode === 'real' ? C.good : dataMode === 'hybrid' ? C.warn : C.muted },
    ];

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

            <SysBar online={online} identity={`${userTag}.${sportTag}.PROF`} clock={clock} />
            <Ticker items={tickerItems} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} colors={[C.text]} progressBackgroundColor={C.bg} />}
            >

                {/* Identity */}
                <Fade style={s.identity}>
                    <Text style={s.prompt}>{'> whoami'}</Text>
                    <Text style={s.name}>{(userData?.name || 'ATHLETE').toUpperCase()}</Text>
                    <Text style={s.ident}>
                        ID {userTag} · L{lvl} · {(userData?.tier || 'District').toUpperCase()} · {sport.toUpperCase()}
                    </Text>
                    <Text style={s.code}>
                        HASH: {userTag}.{sportTag}.{(userData?.bpi || 0).toString(16).toUpperCase().padStart(4, '0')}
                    </Text>
                </Fade>

                {/* Athlete card */}
                <Fade delay={60}>
                    <Panel>
                        <Header title="ATHLETE" right={<HdrMeta color={LEVEL_COLORS[lvl] || C.text}>[L{lvl}] {(LEVEL_LABELS[lvl] || 'UNRATED').toUpperCase()}</HdrMeta>} />
                        <FieldRow label="NAME.......... FULL NAME" value={(userData?.name || '--').toUpperCase()} color="#E8E8E8" />
                        <FieldRow label="AID........... ATHLETE ID" value={userTag} color={C.text} />
                        <FieldRow label="SPT........... SPORT" value={sport.toUpperCase()} color={C.info} />
                        <FieldRow label="TIR........... TIER" value={(userData?.tier || '--').toUpperCase()} color={C.text} />
                        <FieldRow label="LVL........... FIT INDIA BAND" value={`L${lvl} · ${(LEVEL_LABELS[lvl] || '').toUpperCase()}`} color={LEVEL_COLORS[lvl] || C.text} />
                    </Panel>
                </Fade>

                {/* Edit profile */}
                <Fade delay={80}>
                    <Panel>
                        <Header title="EDIT PROFILE" right={
                            !editing
                                ? <Pressable onPress={startEdit}><Text style={{ color: C.info, fontSize: 11, fontFamily: T.mono }}>[ EDIT ]</Text></Pressable>
                                : <Pressable onPress={() => setEditing(false)}><Text style={{ color: C.muted, fontSize: 11, fontFamily: T.mono }}>[ CANCEL ]</Text></Pressable>
                        } />
                        {editing ? (
                            <View style={{ gap: 10, paddingTop: 4 }}>
                                <View style={s.editRow}>
                                    <Text style={s.editLabel}>NAME</Text>
                                    <TextInput style={s.editInput} value={editName} onChangeText={setEditName} placeholderTextColor={C.muted} maxLength={60} />
                                </View>
                                <View style={s.editRow}>
                                    <Text style={s.editLabel}>SPORT</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                                        {Object.entries(SPORT_LABELS).map(([key, label]) => (
                                            <Pressable key={key} onPress={() => setEditSport(key)}
                                                style={[s.sportChip, editSport === key && s.sportChipActive]}>
                                                <Text style={[s.sportChipText, editSport === key && { color: C.bg }]}>{label.toUpperCase()}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={s.editRow}>
                                    <Text style={s.editLabel}>HEIGHT CM</Text>
                                    <TextInput style={[s.editInput, { width: 80 }]} value={editHeight} onChangeText={setEditHeight} keyboardType="numeric" placeholderTextColor={C.muted} maxLength={5} />
                                </View>
                                <Pressable onPress={saveProfile} disabled={saving}
                                    style={[s.saveBtn, saving && { opacity: 0.5 }]}>
                                    <Text style={s.saveBtnText}>{saving ? 'SAVING...' : 'SAVE PROFILE'}</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Text style={{ color: C.muted, fontSize: 11, fontFamily: T.mono }}>TAP EDIT TO MODIFY NAME, SPORT, OR HEIGHT</Text>
                        )}
                    </Panel>
                </Fade>

                {/* Fitness test */}
                <Fade delay={100}>
                    <Panel>
                        <Header title="FIT INDIA · LATEST" right={fitnessScore?.lastTested ? <HdrMeta>{fmtDate(fitnessScore.lastTested)}</HdrMeta> : <HdrMeta>[UNTESTED]</HdrMeta>} />
                        <View style={s.fsBody}>
                            <Text style={[s.fsBig, { color: fitnessScore?.color || C.muted }]}>{String(fs).padStart(3, '0')}</Text>
                            <View style={s.fsRight}>
                                <Text style={s.fsMax}>/ 100.00</Text>
                                <Text style={[s.fsBand, { color: fitnessScore?.color || C.muted }]}>
                                    [{(fitnessScore?.label || 'NOT TESTED').toUpperCase()}]
                                </Text>
                            </View>
                        </View>
                    </Panel>
                </Fade>

                {/* 60d summary */}
                {advanced && (
                    <Fade delay={140}>
                        <Panel>
                            <Header title="PERF SUMMARY · 60D" />
                            <Triad items={[
                                { label: 'AVG.FORM',  value: fmt(advanced.aggregate?.avg_form_score, 1), color: scoreColor(advanced.aggregate?.avg_form_score || 0) },
                                { label: 'READY',     value: String(Math.round(advanced.readiness?.score || 0)).padStart(3, '0'), color: bandColor(advanced.readiness?.band) },
                                { label: 'SESS',      value: fmtInt(advanced.aggregate?.total_sessions || 0), color: C.text },
                            ]} />
                            {advanced.form_trend_series?.length > 1 && (
                                <>
                                    <Rule />
                                    <View style={s.sparkWrap}>
                                        <View style={s.sparkHead}>
                                            <Text style={s.sparkLabel}>FORM TRAJECTORY</Text>
                                            <Text style={[s.sparkTrend, { color: trendColor(advanced.trend_pct || 0) }]}>
                                                {signPct(advanced.trend_pct || 0)}
                                            </Text>
                                        </View>
                                        <Sparkline
                                            data={advanced.form_trend_series.map(t => t.score)}
                                            width={W - 32} height={42}
                                            color={trendColor(advanced.momentum || 0) === C.textMid ? C.text : trendColor(advanced.momentum || 0)}
                                            stroke={1.5}
                                        />
                                    </View>
                                </>
                            )}
                            {advanced.aggregate?.quality_distribution && (
                                <>
                                    <Rule />
                                    <View style={{ paddingTop: 8, paddingBottom: 4 }}>
                                        {Object.entries(advanced.aggregate.quality_distribution).map(([q, n]) => {
                                            const total = Object.values(advanced.aggregate.quality_distribution).reduce((a, b) => a + b, 0) || 1;
                                            const col = q === 'elite' ? C.good : q === 'good' ? C.info : q === 'average' ? C.warn : C.bad;
                                            return <DistBar key={q} label={q} value={n} total={total} color={col} />;
                                        })}
                                    </View>
                                </>
                            )}
                        </Panel>
                    </Fade>
                )}

                {/* Session log table */}
                <Fade delay={180}>
                    <Panel>
                        <Header title="SESSION LOG" right={<HdrMeta>N={sessionList.length}</HdrMeta>} />
                        {loading ? (
                            <View style={s.loadingWrap}><ActivityIndicator size="small" color={C.text} /></View>
                        ) : sessionList.length === 0 ? (
                            <Text style={s.emptyText}>NO SESSIONS RECORDED</Text>
                        ) : (
                            <Table
                                cols={[
                                    { label: 'DATE',  flex: 3, align: 'left' },
                                    { label: 'SPORT', flex: 2, align: 'left' },
                                    { label: 'SCR',   flex: 1, align: 'right' },
                                    { label: 'XP',    flex: 1, align: 'right' },
                                ]}
                                rows={sessionList.map(sess => {
                                    const fscore = sess.summary?.avg_form_score ?? sess.avg_form_score ?? sess.form_score ?? 0;
                                    const xp = sess.summary?.xp_earned ?? sess.xp_earned ?? sess.xp ?? 0;
                                    const sportKey = sess.sport || 'general';
                                    return {
                                        onPress: () => {
                                            const sid = sess.session_id || sess.id;
                                            if (sid) navigation.navigate('ScoreCard', { sessionId: sid });
                                        },
                                        cells: [
                                            { value: fmtDate(sess.ended_at || sess.started_at) },
                                            { value: (SPORT_LABELS[sportKey] || sportKey).toUpperCase().slice(0, 10), color: C.info },
                                            { value: String(Math.round(fscore)).padStart(3, '0'), color: scoreColor(fscore) },
                                            { value: '+' + fmtInt(xp), color: C.warn },
                                        ],
                                    };
                                })}
                            />
                        )}
                    </Panel>
                </Fade>

                {/* Appearance / Theme picker */}
                <Fade delay={210}>
                    <Panel>
                        <Header title="APPEARANCE" right={<HdrMeta color={C.text}>{activeTheme.toUpperCase()}</HdrMeta>} />
                        {THEME_LIST.map((th, idx) => {
                            const sel = th.id === activeTheme;
                            return (
                                <Pressable
                                    key={th.id}
                                    onPress={() => switchTheme(th.id)}
                                    style={({ pressed }) => [
                                        s.themeRow,
                                        idx < THEME_LIST.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                                        pressed && { backgroundColor: C.surf },
                                    ]}
                                >
                                    <View style={s.themeRowL}>
                                        <View style={s.themeSwatchWrap}>
                                            <View style={[s.themeSwatch, { backgroundColor: th.P.screenBg, borderColor: th.C.border }]}>
                                                <View style={[s.themeSwatchA, { backgroundColor: th.C.text }]} />
                                                <View style={[s.themeSwatchB, { backgroundColor: th.C.good }]} />
                                                <View style={[s.themeSwatchC, { backgroundColor: th.C.accent }]} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.themeName}>{th.label.toUpperCase()}</Text>
                                            <Text style={s.themeBlurb} numberOfLines={1}>{th.blurb}</Text>
                                        </View>
                                    </View>
                                    <Text style={[s.themeMark, { color: sel ? C.good : C.muted }]}>
                                        {sel ? '[ACTIVE]' : '[ ]'}
                                    </Text>
                                </Pressable>
                            );
                        })}
                        <Text style={s.themeNote}>App reloads on switch · preference persists across launches</Text>
                    </Panel>
                </Fade>

                {/* Camera engine — experimental Vision Camera toggle */}
                <Fade delay={213}>
                    <Panel>
                        <Header title="CAMERA ENGINE" right={<HdrMeta color={cameraEngine === CAMERA_ENGINES.VISION ? C.warn : C.good}>{cameraEngine === CAMERA_ENGINES.VISION ? 'EXPERIMENTAL' : 'STABLE'}</HdrMeta>} />
                        {[
                            { id: CAMERA_ENGINES.EXPO,   label: 'EXPO CAMERA',   blurb: 'Stable · 0.3 fps shutter capture · default' },
                            { id: CAMERA_ENGINES.VISION, label: 'VISION CAMERA', blurb: 'Experimental · v5 + Nitrogen · faster pipeline' },
                        ].map((eng) => {
                            const sel = eng.id === cameraEngine;
                            return (
                                <Pressable
                                    key={eng.id}
                                    onPress={() => switchCameraEngine(eng.id)}
                                    style={({ pressed }) => [
                                        s.themeRow,
                                        pressed && { backgroundColor: C.surf },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.themeName}>{eng.label}</Text>
                                        <Text style={s.themeBlurb} numberOfLines={1}>{eng.blurb}</Text>
                                    </View>
                                    <Text style={[s.themeMark, { color: sel ? C.good : C.muted }]}>
                                        {sel ? '[ACTIVE]' : '[ ]'}
                                    </Text>
                                </Pressable>
                            );
                        })}
                        <Text style={s.themeNote}>Affects the next training session · falls back to Expo Camera if Vision Camera native side fails to load</Text>
                    </Panel>
                </Fade>

                {/* Account */}
                <Fade delay={215}>
                    <Panel>
                        <Header title="ACCOUNT" right={<HdrMeta color={C.good}>SIGNED IN</HdrMeta>} />
                        <FieldRow
                            label="USR........... USER ID"
                            value={(authUser?.id || '--').toUpperCase().slice(0, 18)}
                            color={C.text}
                        />
                        <FieldRow
                            label="EML........... EMAIL"
                            value={(authUser?.email || '--').toLowerCase()}
                            color={C.textSub}
                            size="sm"
                        />
                        <FieldRow
                            label="ROL........... ROLE"
                            value={(authUser?.role || 'athlete').toUpperCase()}
                            color={C.info}
                        />
                        <Pressable
                            onPress={handleLogout}
                            style={({ pressed }) => [s.logoutBtn, pressed && { backgroundColor: C.surf }]}
                        >
                            <Text style={s.logoutText}>[ESC] SIGN OUT</Text>
                        </Pressable>
                    </Panel>
                </Fade>

                {/* System */}
                <Fade delay={220}>
                    <Panel>
                        <Header title="SYSTEM" />
                        <FieldRow
                            label="CONN.......... BACKEND STATUS"
                            value={online ? 'CONNECTED' : 'OFFLINE'}
                            color={online ? C.good : C.bad}
                        />
                        <FieldRow
                            label="DATA.......... DATA MODE"
                            value={(dataMode || 'mock').toUpperCase()}
                            color={dataMode === 'real' ? C.good : dataMode === 'hybrid' ? C.warn : C.muted}
                        />
                        <FieldRow label="THEME......... ACTIVE" value={activeTheme.toUpperCase()} color={C.text} />
                        <FieldRow label="VER........... BUILD" value="2.3.0" color={C.text} />
                        <FieldRow label="AUTH.......... PROTOCOL" value="JWT BEARER" color={C.text} />
                        <FieldRow label="ENG........... POSE ENGINE" value="MEDIAPIPE" color={C.text} />
                        <FieldRow label="PRTO.......... TRANSPORT" value="HTTP/WS" color={C.textSub} dim />
                    </Panel>
                </Fade>

                <Footer lines={[
                    { text: `END OF PROFILE · ${nowISO()}` },
                    { text: `ATHLETE ${userTag} · ${sportTag} · L${lvl}` },
                ]} />
            </ScrollView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    identity:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    prompt:    { fontSize: 12, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    name:      { fontSize: 26, fontWeight: '700', color: '#E8E8E8', fontFamily: T.MONO, letterSpacing: 1, marginTop: 6 },
    ident:     { fontSize: 11, color: C.textMid, fontFamily: T.MONO, letterSpacing: 1, marginTop: 6 },
    code:      { fontSize: 10, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5, marginTop: 3 },

    fsBody:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 14 },
    fsBig:    { fontSize: 64, fontWeight: '700', fontFamily: T.MONO, letterSpacing: -3, lineHeight: 58 },
    fsRight:  { marginLeft: 12, marginBottom: 4, flex: 1 },
    fsMax:    { fontSize: 13, color: C.muted, fontFamily: T.MONO, fontWeight: '600' },
    fsBand:   { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: 1 },

    sparkWrap:  { paddingHorizontal: 0, paddingVertical: 10 },
    sparkHead:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 6 },
    sparkLabel: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, letterSpacing: 1, fontWeight: '700' },
    sparkTrend: { fontSize: 11, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.5 },

    loadingWrap: { paddingVertical: 20, alignItems: 'center' },
    emptyText:   { paddingVertical: 14, textAlign: 'center', color: C.muted, fontFamily: T.MONO, fontSize: 11, letterSpacing: 1 },

    themeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
    themeRowL:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
    themeSwatchWrap: { marginRight: 12 },
    themeSwatch:     { width: 36, height: 36, borderWidth: 1, padding: 4, justifyContent: 'space-between' },
    themeSwatchA:    { height: 4 },
    themeSwatchB:    { height: 4, width: '70%' },
    themeSwatchC:    { height: 4, width: '50%' },
    themeName:       { fontSize: 12, color: C.white, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1 },
    themeBlurb:      { fontSize: 10, color: C.textMid, fontFamily: T.MONO, marginTop: 2, letterSpacing: 0.3 },
    themeMark:       { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1, marginLeft: 8 },
    themeNote:       { fontSize: 9, color: C.muted, fontFamily: T.MONO, paddingHorizontal: 12, paddingVertical: 8, letterSpacing: 0.3, textAlign: 'center' },

    logoutBtn:  { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border },
    logoutText: { color: C.bad, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 2 },

    editRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editLabel: { fontSize: 10, color: C.muted, fontFamily: T.MONO, fontWeight: '700', width: 76, letterSpacing: 0.5 },
    editInput: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, color: C.text, fontFamily: T.MONO, fontSize: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 0 },
    sportChip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border, marginRight: 6 },
    sportChipActive: { backgroundColor: C.info, borderColor: C.info },
    sportChipText: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', color: C.text, letterSpacing: 0.5 },
    saveBtn:   { marginTop: 6, backgroundColor: C.info, paddingVertical: 10, alignItems: 'center' },
    saveBtnText: { color: C.bg, fontFamily: T.MONO, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
});
