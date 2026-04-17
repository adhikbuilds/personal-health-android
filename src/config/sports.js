// Sports config — single source of truth for every sport-specific constant.
//
// Previously SPORTS, SPORT_LABELS (data/constants.js), and the TrainScreen
// locals SPORT_RANGES + REP_TRANSITIONS lived in separate files. Adding a new
// sport meant editing multiple files. This module merges everything so
// adding a sport is one append.
//
// Matches the backend's services/sports_catalog.py — keep sport_index in sync
// if you change the backend.

export const SPORTS = {
    general:       { key: 'general',       label: 'GENERAL',  displayLabel: 'General',       sportIndex: 0, hasJumpHeight: false, repFrom: 'descent', repTo: 'setup' },
    vertical_jump: { key: 'vertical_jump', label: 'VJ',       displayLabel: 'Vertical Jump', sportIndex: 0, hasJumpHeight: true,  repFrom: 'descent', repTo: 'takeoff' },
    squat:         { key: 'squat',         label: 'SQUAT',    displayLabel: 'Squat',         sportIndex: 0, hasJumpHeight: false, repFrom: 'descent', repTo: 'setup' },
    push_up:       { key: 'push_up',       label: 'PUSH UP',  displayLabel: 'Push-up',       sportIndex: 0, hasJumpHeight: false, repFrom: 'descent', repTo: 'setup' },
    pull_up:       { key: 'pull_up',       label: 'PULL UP',  displayLabel: 'Pull-up',       sportIndex: 0, hasJumpHeight: false, repFrom: 'descent', repTo: 'setup' },
    sprint:        { key: 'sprint',        label: 'SPRINT',   displayLabel: 'Sprint',        sportIndex: 2, hasJumpHeight: false, repFrom: 'drive',   repTo: 'flight' },
    snatch:        { key: 'snatch',        label: 'SNATCH',   displayLabel: 'Olympic Snatch', sportIndex: 1, hasJumpHeight: false, repFrom: 'descent', repTo: 'catch' },
    javelin:       { key: 'javelin',       label: 'JAVELIN',  displayLabel: 'Javelin',       sportIndex: 3, hasJumpHeight: false, repFrom: 'wind_up', repTo: 'release' },
    cricket_bat:   { key: 'cricket_bat',   label: 'CRICKET',  displayLabel: 'Cricket Bat',   sportIndex: 4, hasJumpHeight: false, repFrom: 'backswing', repTo: 'contact' },
};

// Typical joint-angle ranges used for the TrainScreen simulation fallback
// and for client-side form hints. Backend has its own richer ranges.
export const SPORT_RANGES = {
    vertical_jump: { knee: [85, 110],  hip: [80, 110],  trunk: [8, 18],  sym: 0.94, jh: [32, 65] },
    snatch:        { knee: [95, 125],  hip: [85, 100],  trunk: [18, 30], sym: 0.95, jh: [0, 0]  },
    sprint:        { knee: [85, 115],  hip: [42, 62],   trunk: [12, 22], sym: 0.88, jh: [0, 0]  },
    javelin:       { knee: [140, 165], hip: [105, 125], trunk: [28, 45], sym: 0.76, jh: [0, 0]  },
    cricket_bat:   { knee: [132, 158], hip: [118, 145], trunk: [18, 30], sym: 0.82, jh: [0, 0]  },
    squat:         { knee: [75, 110],  hip: [75, 105],  trunk: [0, 25],  sym: 0.92, jh: [0, 0]  },
    push_up:       { knee: [165, 180], hip: [165, 180], trunk: [0, 8],   sym: 0.92, jh: [0, 0]  },
    pull_up:       { knee: [140, 180], hip: [140, 180], trunk: [0, 15],  sym: 0.90, jh: [0, 0]  },
    general:       { knee: [85, 170],  hip: [60, 170],  trunk: [0, 30],  sym: 0.90, jh: [0, 0]  },
};

// Which accent color each sport gets — used for sport-scoped UI surfaces.
export const SPORT_COLORS = {
    general:       '#64748b',
    vertical_jump: '#06b6d4',
    squat:         '#8b5cf6',
    push_up:       '#ec4899',
    pull_up:       '#f97316',
    sprint:        '#ef4444',
    snatch:        '#f59e0b',
    javelin:       '#10b981',
    cricket_bat:   '#3b82f6',
};

export const SPORT_KEYS = Object.keys(SPORTS);

export function getSport(key) {
    return SPORTS[key] || SPORTS.general;
}

export function sportLabel(key) {
    return getSport(key).displayLabel;
}

export function sportTabLabel(key) {
    return getSport(key).label;
}

export function sportRange(key) {
    return SPORT_RANGES[key] || SPORT_RANGES.general;
}

export function sportColor(key) {
    return SPORT_COLORS[key] || SPORT_COLORS.general;
}

export function repTransition(key) {
    const s = getSport(key);
    return [s.repFrom, s.repTo];
}

// Back-compat: many files still import SPORT_LABELS from data/constants.js.
// data/constants.js now re-exports from here so deletes of this map work.
export const SPORT_LABELS = Object.fromEntries(
    Object.values(SPORTS).map(s => [s.key, s.displayLabel])
);
