// ActiveBharat — Shared Color System
// Import this in every screen instead of duplicating the C object.
// To change the theme, edit here once.

export const C = {
    bg:      '#0b1121',     // slightly warmer background
    bg2:     '#050813',
    surf:    '#1e293b',
    surf2:   '#263248',
    card:    'rgba(22, 32, 56, 0.72)',     // glassmorphism base
    cardHi:  'rgba(37, 55, 92, 0.82)',     // highlighted glass
    border:  'rgba(255,255,255,0.09)',
    border2: 'rgba(255,255,255,0.15)',
    text:    '#f1f5f9',
    textSub: '#cbd5e1',
    muted:   '#94a3b8',
    cyan:    '#06b6d4',
    orange:  '#f97316',
    green:   '#22c55e',
    yellow:  '#facc15',
    purple:  '#8b5cf6',
    red:     '#ef4444',
    indigo:  '#6366f1',
    pink:    '#ec4899',
    teal:    '#14b8a6',
    amber:   '#f59e0b',
    rose:    '#f43f5e',
    violet:  '#a855f7',
};

// Chunky gradient pairs — used as hero backgrounds, CTAs, metric cards.
// Each is [from, to] stop pair for expo-linear-gradient.
export const GRADIENTS = {
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
};

// Zone colors shared across HR + training-zone surfaces.
export const ZONES = {
    recovery:  '#38bdf8',
    endurance: '#22c55e',
    tempo:     '#facc15',
    threshold: '#f97316',
    anaerobic: '#ef4444',
};

// Fitness level band colors (L1 → L7)
export const LEVEL_COLORS = {
    1: '#ef4444',  // Work Harder — red
    2: '#f97316',  // Must Improve — orange
    3: '#eab308',  // Can do better — yellow
    4: '#84cc16',  // Good — lime
    5: '#22c55e',  // Very Good — green
    6: '#06b6d4',  // Athletic — cyan
    7: '#8b5cf6',  // Excellent — purple
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
