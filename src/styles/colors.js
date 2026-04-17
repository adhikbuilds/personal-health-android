// ActiveBharat — Design Tokens
// -----------------------------------------------------------------------------
// Guiding references: Linear (structure), Whoop (restraint), Strava (stat triad),
// Apple Fitness (ring hierarchy), Arc Browser (depth without shadows).
//
// Rules:
//   1. No gradient card backgrounds. Elevation comes from color steps.
//   2. One accent (VOLT) per screen. Signal colors ONLY for state.
//   3. Numbers use the MONO token (tabular nums, no jitter on update).
//   4. 16pt corner radius, 1pt BORDER hairlines — no drop shadows on dark UI.
//   5. No emoji next to labels. Typography + one accent colour carry meaning.

export const C = {
    // Surfaces — three discrete elevation steps, flat colour not shadows.
    bg:        '#0B0D0F',   // base canvas (near-black, slightly cool)
    bg2:       '#0F1217',
    surf:      '#15181C',   // cards, elevated
    surfHi:    '#1E2227',   // nested / inputs
    surf2:     '#15181C',   // back-compat alias
    card:      '#15181C',
    cardHi:    '#1E2227',

    // Hairlines
    border:    '#262B31',
    border2:   '#353A42',

    // Text
    text:      '#F5F7FA',   // hi
    textSub:   '#C9D1DB',
    textMid:   '#8A929C',
    muted:     '#4A5058',   // lo / dividers with text

    // Accent — volt green, the single "brand" colour. Reserved for primary
    // actions + the one hero highlight per screen.
    accent:    '#C6FF3D',
    accentDim: '#8CB82C',

    // Signal colours — meaning only. Never decorative.
    good:      '#3DDC97',   // good biomech / form
    warn:      '#FFB547',   // drift / watch
    bad:       '#FF5A5F',   // injury risk / spike
    info:      '#6B8AFE',   // neutral data viz

    // Legacy palette — kept so screens mid-migration don't break. New code
    // should prefer the named tokens above.
    cyan:      '#06B6D4',
    orange:    '#F97316',
    green:     '#22C55E',
    yellow:    '#FACC15',
    purple:    '#8B5CF6',
    red:       '#EF4444',
    indigo:    '#6366F1',
    pink:      '#EC4899',
    teal:      '#14B8A6',
    amber:     '#F59E0B',
    rose:      '#F43F5E',
    violet:    '#A855F7',
};

// Training-zone colours — used on HR and training-load surfaces only.
export const ZONES = {
    recovery:  '#38BDF8',
    endurance: '#3DDC97',
    tempo:     '#FACC15',
    threshold: '#F97316',
    anaerobic: '#FF5A5F',
};

// Fitness level band colours (L1 → L7). Kept for legacy screens; new code
// should pick from the signal colours above when possible.
export const LEVEL_COLORS = {
    1: '#FF5A5F',
    2: '#F97316',
    3: '#EAB308',
    4: '#84CC16',
    5: '#3DDC97',
    6: '#06B6D4',
    7: '#A855F7',
};

export const LEVEL_LABELS = {
    1: 'Work Harder',
    2: 'Must Improve',
    3: 'Can do better',
    4: 'Good',
    5: 'Very Good',
    6: 'Athletic',
    7: 'Excellent',
};

// Minimal gradient set — only ever used INSIDE a chart's fill area or the
// single hero arc stroke per screen. Never on card backgrounds.
export const GRADIENTS = {
    volt:   ['#C6FF3D', '#8CB82C'],
    signal: ['#3DDC97', '#06B6D4'],
    warn:   ['#FFB547', '#F97316'],
    bad:    ['#FF5A5F', '#EF4444'],
    // Back-compat
    cyan:   ['#06B6D4', '#3B82F6'],
    sunset: ['#F97316', '#EC4899'],
    forest: ['#22C55E', '#14B8A6'],
    amber:  ['#FACC15', '#F97316'],
    violet: ['#8B5CF6', '#EC4899'],
    rose:   ['#F43F5E', '#8B5CF6'],
    ocean:  ['#0EA5E9', '#6366F1'],
    gold:   ['#FBBF24', '#F59E0B'],
    lime:   ['#84CC16', '#22C55E'],
    flame:  ['#EF4444', '#F97316'],
};

// Typography tokens — import {T} and pass T.display / T.h1 / T.stat / T.label
// so every screen shares the same scale. Numbers use the mono family for
// tabular stability (no horizontal jitter when a digit rolls over).
import { Platform } from 'react-native';

const MONO = Platform.OS === 'android' ? 'monospace' : 'Menlo';
const DISPLAY = Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold';

export const T = {
    // Hero score only — one per screen.
    display: { fontSize: 72, fontWeight: '300', letterSpacing: -1, fontFamily: DISPLAY, color: C.text },

    // Screen titles.
    h1:    { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: C.text },

    // Card titles.
    h2:    { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, color: C.text },

    // Tabular numbers.
    stat:  { fontSize: 28, fontWeight: '600', fontFamily: MONO, letterSpacing: 0, color: C.text },
    statXL: { fontSize: 44, fontWeight: '700', fontFamily: MONO, letterSpacing: -0.5, color: C.text },
    statSm: { fontSize: 18, fontWeight: '600', fontFamily: MONO, color: C.text },

    // Body / captions.
    body:     { fontSize: 15, fontWeight: '400', color: C.textSub, lineHeight: 22 },
    caption:  { fontSize: 12, fontWeight: '400', color: C.textMid },

    // Labels — UPPERCASE with letter spacing. Use UPPER wrapper when rendering.
    label:    { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: C.textMid, textTransform: 'uppercase' },
    micro:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.textMid, textTransform: 'uppercase' },

    // Back-compat aliases.
    MONO, DISPLAY,
};

export default C;
