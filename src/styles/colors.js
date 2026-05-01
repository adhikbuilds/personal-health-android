// Personal Health — Shared Color System
// Strava-aligned light theme. New code should import from './tokens.js'.
// The legacy `C` shim below remaps every old key to a new Strava palette
// value WITHOUT changing the key names — so all 600+ existing references
// across screens keep compiling and just render the new theme.

export { COLORS, STATUS_COLORS, TIER_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOW, EASING, ANIM } from './tokens';

// ─── Strava palette ──────────────────────────────────
const STRAVA_ORANGE  = '#FC4C02';
const STRAVA_DARK    = '#242428';
const STRAVA_GRAY    = '#6D6D78';
const STRAVA_DIM     = '#9CA3AF';
const STRAVA_LIGHT   = '#F7F7FA';
const STRAVA_BORDER  = '#E6E6EA';
const STRAVA_WHITE   = '#FFFFFF';
const STRAVA_CREAM   = '#FBFBF8';

// ─── Legacy `C` export — keys preserved, values remapped to Strava ──
//
// Old key                  Old purpose            New value (Strava theme)
// bg, bg2                  page backgrounds       cream / white
// surf, surf2              card surfaces          white / soft gray
// border, border2          divider lines          light gray
// text, textSub, muted     text scale             dark → gray → dim
// cyan                     "brand" (135 usages!)  orange  ← key remap
// orange                   warm accent            kept as orange (same as brand)
// green/yellow/red         status                 status-tuned for light bg
// purple/indigo/pink       extra accents          tuned for light bg
//
// WARNING: do NOT add new color usages via `C` — use `COLORS` from tokens.
export const C = {
    // Backgrounds (now light)
    bg:      STRAVA_CREAM,
    bg2:     STRAVA_LIGHT,
    surf:    STRAVA_WHITE,
    surf2:   STRAVA_LIGHT,
    border:  STRAVA_BORDER,
    border2: 'rgba(36, 36, 40, 0.12)',

    // Text (now dark on light)
    text:    STRAVA_DARK,
    textSub: STRAVA_GRAY,
    muted:   STRAVA_DIM,

    // Brand — remap `cyan` to Strava orange (preserves 135 call sites)
    cyan:    STRAVA_ORANGE,
    orange:  STRAVA_ORANGE,

    // Status — light-bg tuned
    green:   '#16A34A',
    yellow:  '#CA8A04',
    red:     '#DC2626',

    // Extra accents (kept available for screens that use them as accents)
    purple:  '#7C3AED',
    indigo:  '#4F46E5',
    pink:    '#DB2777',

    // Some screens reference C.warning / C.surface — alias safely
    warning: '#EA580C',
    surface: STRAVA_WHITE,
};

// Fitness level band colors (L1 → L7) — light-bg tuned
export const LEVEL_COLORS = {
    1: '#DC2626',  // Work Harder — red
    2: '#EA580C',  // Must Improve — orange-red
    3: '#CA8A04',  // Can do better — amber
    4: '#16A34A',  // Good — green
    5: '#15803D',  // Very Good — deep green
    6: STRAVA_ORANGE, // Athletic — Strava orange (was cyan)
    7: '#7C3AED',  // Excellent — purple
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
