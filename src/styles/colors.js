// ActiveBharat — Design Tokens (Bloomberg Terminal direction)
// -----------------------------------------------------------------------------
// References: Bloomberg Terminal, IEX/trader terminals, Unix system monitors.
// Full mono typography, amber + phosphor green on pure black, bracket syntax,
// aligned numeric columns, ALL CAPS headers, time-stamped data. Utilitarian.

export const C = {
    // Canvas — dead black, phosphor screen.
    bg:        '#000000',
    page:      '#000000',
    bg2:       '#060606',
    surf:      '#0A0A0A',
    surfHi:    '#111111',
    card:      '#0A0A0A',
    cardHi:    '#111111',

    // Hairline grid lines
    border:    '#1C1C1C',
    border2:   '#2A2A2A',

    // Terminal text — amber primary (Bloomberg), green for positives.
    text:      '#FFAA00',   // primary terminal amber
    textSub:   '#E69900',   // dim amber
    textMid:   '#997300',   // dimmer amber
    muted:     '#5C4600',   // darkest amber (secondary labels)

    // White text for cap headers + key numbers
    white:     '#E8E8E8',

    // Accent — treat cyan as the "command" colour (like Bloomberg's field indicators)
    accent:    '#00E5FF',
    accentDim: '#00B8D9',

    // Signal colours — trader semantics.
    good:      '#00E676',   // up / in range (phosphor green)
    warn:      '#FFB300',   // warning amber
    bad:       '#FF3B30',   // down / out of range (red)
    info:      '#00E5FF',   // neutral info (cyan)

    // Back-compat (so other screens don't explode)
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
};

export const ZONES = {
    recovery:  '#00B8D9',
    endurance: '#00E676',
    tempo:     '#FFD600',
    threshold: '#FFB300',
    anaerobic: '#FF3B30',
};

export const LEVEL_COLORS = {
    1: '#FF3B30',
    2: '#FFB300',
    3: '#FFD600',
    4: '#C6FF00',
    5: '#00E676',
    6: '#00E5FF',
    7: '#E040FB',
};

export const LEVEL_LABELS = {
    1: 'WORK HARDER',
    2: 'MUST IMPROVE',
    3: 'CAN DO BETTER',
    4: 'GOOD',
    5: 'VERY GOOD',
    6: 'ATHLETIC',
    7: 'EXCELLENT',
};

export const GRADIENTS = {
    terminal: ['#FFAA00', '#FFD600'],
    phosphor: ['#00E676', '#00E5FF'],
    alert:    ['#FFB300', '#FF3B30'],
    // back-compat
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
};

import { Platform } from 'react-native';

// Everything is mono. That's the whole point.
const MONO = Platform.OS === 'android' ? 'monospace' : 'Menlo';
const DISPLAY = MONO;
const UI = MONO;

export const T = {
    // "Display" here is still mono — it's big but not heavy.
    display: { fontSize: 56, fontWeight: '600', fontFamily: MONO, letterSpacing: -1, color: '#E8E8E8' },

    h1: { fontSize: 20, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, color: '#E8E8E8', textTransform: 'uppercase' },
    h2: { fontSize: 14, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, color: '#E8E8E8', textTransform: 'uppercase' },
    h3: { fontSize: 12, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, color: C.text, textTransform: 'uppercase' },

    // Numeric
    stat:   { fontSize: 18, fontWeight: '600', fontFamily: MONO, color: '#E8E8E8' },
    statXL: { fontSize: 36, fontWeight: '700', fontFamily: MONO, letterSpacing: -1, color: '#E8E8E8' },
    statSm: { fontSize: 13, fontWeight: '600', fontFamily: MONO, color: '#E8E8E8' },

    body:    { fontSize: 12, fontWeight: '400', fontFamily: MONO, color: C.textSub, lineHeight: 18 },
    caption: { fontSize: 10, fontWeight: '400', fontFamily: MONO, color: C.textMid },

    label:   { fontSize: 10, fontWeight: '700', fontFamily: MONO, color: C.textMid, letterSpacing: 1, textTransform: 'uppercase' },
    micro:   { fontSize: 9,  fontWeight: '700', fontFamily: MONO, color: C.textMid, letterSpacing: 0.8, textTransform: 'uppercase' },

    MONO, DISPLAY, UI,
};

export default C;
