// ActiveBharat — Theme Catalog
// Two complete themes: 'bloomberg' (default, terminal-style) and 'classic'
// (the previous Linear/Whoop/Strava-inspired premium look).
//
// The active theme is loaded synchronously at boot in App.js BEFORE any
// screen module is imported, so that StyleSheet.create() in each screen
// captures the right token values.
import { Platform } from 'react-native';

const MONO = Platform.OS === 'android' ? 'monospace' : 'Menlo';
const SANS = Platform.OS === 'android' ? 'sans-serif' : 'System';
const SANS_BOLD = Platform.OS === 'android' ? 'sans-serif-medium' : 'System';

// ─── BLOOMBERG ─────────────────────────────────────────────────────────────

const BLOOMBERG = {
    id: 'bloomberg',
    label: 'Bloomberg Terminal',
    blurb: 'Mono · amber · phosphor green · all-caps · pure black',
    C: {
        bg:        '#000000',
        page:      '#000000',
        bg2:       '#060606',
        surf:      '#0A0A0A',
        surfHi:    '#111111',
        card:      '#0A0A0A',
        cardHi:    '#111111',

        border:    '#1C1C1C',
        border2:   '#2A2A2A',

        text:      '#FFAA00',
        textSub:   '#E69900',
        textMid:   '#997300',
        muted:     '#5C4600',

        white:     '#E8E8E8',

        accent:    '#00E5FF',
        accentDim: '#00B8D9',

        good:      '#00E676',
        warn:      '#FFB300',
        bad:       '#FF3B30',
        info:      '#00E5FF',

        // Back-compat aliases
        cyan:      '#00E5FF',
        orange:    '#FFB300',
        green:     '#00E676',
        yellow:    '#FFD600',
        purple:    '#E040FB',
        red:       '#FF3B30',
        indigo:    '#536DFE',
        pink:      '#FF4081',
        teal:      '#1DE9B6',
        amber:     '#FFAA00',
        rose:      '#FF3B30',
        violet:    '#E040FB',
    },
    T: {
        display: { fontSize: 56, fontWeight: '600', fontFamily: MONO, letterSpacing: -1, color: '#E8E8E8' },
        h1:      { fontSize: 20, fontWeight: '700', fontFamily: MONO, letterSpacing: 1,  color: '#E8E8E8', textTransform: 'uppercase' },
        h2:      { fontSize: 14, fontWeight: '700', fontFamily: MONO, letterSpacing: 1,  color: '#E8E8E8', textTransform: 'uppercase' },
        h3:      { fontSize: 12, fontWeight: '700', fontFamily: MONO, letterSpacing: 1,  color: '#FFAA00', textTransform: 'uppercase' },
        stat:    { fontSize: 18, fontWeight: '600', fontFamily: MONO, color: '#E8E8E8' },
        statXL:  { fontSize: 36, fontWeight: '700', fontFamily: MONO, letterSpacing: -1, color: '#E8E8E8' },
        statSm:  { fontSize: 13, fontWeight: '600', fontFamily: MONO, color: '#E8E8E8' },
        body:    { fontSize: 12, fontWeight: '400', fontFamily: MONO, color: '#E69900', lineHeight: 18 },
        caption: { fontSize: 10, fontWeight: '400', fontFamily: MONO, color: '#997300' },
        label:   { fontSize: 10, fontWeight: '700', fontFamily: MONO, color: '#997300', letterSpacing: 1,   textTransform: 'uppercase' },
        micro:   { fontSize: 9,  fontWeight: '700', fontFamily: MONO, color: '#997300', letterSpacing: 0.8, textTransform: 'uppercase' },
        MONO, DISPLAY: MONO, UI: MONO, SANS, SANS_BOLD,
    },
    ZONES: {
        recovery:  '#00B8D9',
        endurance: '#00E676',
        tempo:     '#FFD600',
        threshold: '#FFB300',
        anaerobic: '#FF3B30',
    },
    LEVEL_COLORS: {
        1: '#FF3B30', 2: '#FFB300', 3: '#FFD600', 4: '#C6FF00',
        5: '#00E676', 6: '#00E5FF', 7: '#E040FB',
    },
    LEVEL_LABELS: {
        1: 'WORK HARDER', 2: 'MUST IMPROVE', 3: 'CAN DO BETTER', 4: 'GOOD',
        5: 'VERY GOOD',   6: 'ATHLETIC',     7: 'EXCELLENT',
    },
    GRADIENTS: {
        terminal: ['#FFAA00', '#FFD600'],
        phosphor: ['#00E676', '#00E5FF'],
        alert:    ['#FFB300', '#FF3B30'],
        cyan:   ['#00E5FF', '#00B8D9'],
        forest: ['#00E676', '#00B8D9'],
        amber:  ['#FFD600', '#FFB300'],
        violet: ['#E040FB', '#00E5FF'],
        ocean:  ['#00E5FF', '#536DFE'],
        gold:   ['#FFD600', '#FFAA00'],
        lime:   ['#C6FF00', '#00E676'],
        flame:  ['#FF3B30', '#FFB300'],
        volt:   ['#C6FF00', '#00E676'],
        signal: ['#00E676', '#00E5FF'],
        rose:   ['#FF3B30', '#E040FB'],
        bad:    ['#FF3B30', '#FFB300'],
        sunset: ['#FFB300', '#FF3B30'],
    },
    // Per-theme primitive overrides — read by terminal.js so panels/headers
    // honour the canvas colour instead of hardcoding black.
    P: {
        screenBg: '#000000',
        panelBg:  '#000000',
        headerBg: '#080808',
        rowAltBg: '#0A0A0A',
        tickerBg: '#050505',
        tblHeadBg:'#060606',
        // Header/Field labels keep brackets in Bloomberg
        bracketLabels: true,
        uppercaseHeaders: true,
        // Tab bar
        tabBarBg:    '#000000',
        tabBarBrd:   '#262B31',
        tabBarOff:   '#5C4600',
        tabBarOn:    '#FFAA00',
        toastBg:     '#000000',
        toastBrd:    '#FFAA00',
        toastFg:     '#FFAA00',
    },
};

// ─── CLASSIC (Linear/Whoop/Strava-inspired) ────────────────────────────────

const CLASSIC = {
    id: 'classic',
    label: 'Classic Premium',
    blurb: 'Sans · cool white · volt accents · glass cards · mixed case',
    C: {
        bg:        '#0b1121',
        page:      '#0b1121',
        bg2:       '#050813',
        surf:      '#1e293b',
        surfHi:    '#263248',
        card:      '#162038',
        cardHi:    '#25375C',

        border:    'rgba(255,255,255,0.09)',
        border2:   'rgba(255,255,255,0.15)',

        text:      '#f1f5f9',
        textSub:   '#cbd5e1',
        textMid:   '#94a3b8',
        muted:     '#64748b',

        white:     '#ffffff',

        accent:    '#C6FF3D',
        accentDim: '#9ACD32',

        good:      '#3DDC97',
        warn:      '#facc15',
        bad:       '#ef4444',
        info:      '#06b6d4',

        // Back-compat
        cyan:      '#06b6d4',
        orange:    '#f97316',
        green:     '#22c55e',
        yellow:    '#facc15',
        purple:    '#8b5cf6',
        red:       '#ef4444',
        indigo:    '#6366f1',
        pink:      '#ec4899',
        teal:      '#14b8a6',
        amber:     '#f59e0b',
        rose:      '#f43f5e',
        violet:    '#a855f7',
    },
    T: {
        display: { fontSize: 64, fontWeight: '800', fontFamily: SANS_BOLD, letterSpacing: -1.5, color: '#f1f5f9' },
        h1:      { fontSize: 22, fontWeight: '800', fontFamily: SANS_BOLD, letterSpacing: -0.3, color: '#f1f5f9' },
        h2:      { fontSize: 16, fontWeight: '700', fontFamily: SANS_BOLD, letterSpacing: -0.1, color: '#f1f5f9' },
        h3:      { fontSize: 13, fontWeight: '700', fontFamily: SANS_BOLD, letterSpacing: 0,    color: '#cbd5e1' },
        stat:    { fontSize: 20, fontWeight: '700', fontFamily: MONO, color: '#f1f5f9' },
        statXL:  { fontSize: 44, fontWeight: '800', fontFamily: MONO, letterSpacing: -1, color: '#f1f5f9' },
        statSm:  { fontSize: 13, fontWeight: '600', fontFamily: MONO, color: '#f1f5f9' },
        body:    { fontSize: 13, fontWeight: '400', fontFamily: SANS, color: '#cbd5e1', lineHeight: 19 },
        caption: { fontSize: 11, fontWeight: '400', fontFamily: SANS, color: '#94a3b8' },
        label:   { fontSize: 10, fontWeight: '700', fontFamily: SANS_BOLD, color: '#94a3b8', letterSpacing: 1.2, textTransform: 'uppercase' },
        micro:   { fontSize: 9,  fontWeight: '700', fontFamily: SANS_BOLD, color: '#94a3b8', letterSpacing: 1,   textTransform: 'uppercase' },
        MONO, DISPLAY: SANS_BOLD, UI: SANS, SANS, SANS_BOLD,
    },
    ZONES: {
        recovery:  '#38bdf8',
        endurance: '#22c55e',
        tempo:     '#facc15',
        threshold: '#f97316',
        anaerobic: '#ef4444',
    },
    LEVEL_COLORS: {
        1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16',
        5: '#22c55e', 6: '#06b6d4', 7: '#8b5cf6',
    },
    LEVEL_LABELS: {
        1: 'Work Harder', 2: 'Must Improve', 3: 'Can do better', 4: 'Good',
        5: 'Very Good',   6: 'Athletic',     7: 'Excellent',
    },
    GRADIENTS: {
        terminal: ['#C6FF3D', '#3DDC97'],
        phosphor: ['#3DDC97', '#06b6d4'],
        alert:    ['#f97316', '#ef4444'],
        cyan:   ['#06b6d4', '#3b82f6'],
        sunset: ['#f97316', '#ec4899'],
        forest: ['#22c55e', '#14b8a6'],
        amber:  ['#facc15', '#f97316'],
        violet: ['#8b5cf6', '#ec4899'],
        rose:   ['#f43f5e', '#8b5cf6'],
        ocean:  ['#0ea5e9', '#6366f1'],
        gold:   ['#fbbf24', '#f59e0b'],
        lime:   ['#84cc16', '#22c55e'],
        flame:  ['#ef4444', '#f97316'],
        volt:   ['#C6FF3D', '#22c55e'],
        signal: ['#3DDC97', '#06b6d4'],
        bad:    ['#ef4444', '#f97316'],
    },
    P: {
        screenBg: '#0b1121',
        panelBg:  '#162038',
        headerBg: '#1e2a47',
        rowAltBg: '#1a2440',
        tickerBg: '#0e1628',
        tblHeadBg:'#1a2440',
        bracketLabels: false,
        uppercaseHeaders: false,
        tabBarBg:    '#0b1121',
        tabBarBrd:   'rgba(255,255,255,0.09)',
        tabBarOff:   '#64748b',
        tabBarOn:    '#C6FF3D',
        toastBg:     '#162038',
        toastBrd:    '#C6FF3D',
        toastFg:     '#f1f5f9',
    },
};

export const THEMES = {
    bloomberg: BLOOMBERG,
    classic:   CLASSIC,
};

export const THEME_LIST = [BLOOMBERG, CLASSIC];

export const DEFAULT_THEME = 'bloomberg';

export const THEME_STORAGE_KEY = '@active_theme';

// Feature flag — when true, TrainScreen uses react-native-vision-camera
// (newer / faster pipeline) instead of expo-camera. Stored in AsyncStorage,
// toggled from Profile → APPEARANCE. Defaults off so a regression in the
// VC integration doesn't brick the camera flow.
export const CAMERA_ENGINE_KEY = '@camera_engine';
export const CAMERA_ENGINES = {
    EXPO:   'expo-camera',
    VISION: 'vision-camera',
};
export const DEFAULT_CAMERA_ENGINE = CAMERA_ENGINES.EXPO;
