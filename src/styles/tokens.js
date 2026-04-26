// Personal Health Design Language v2 — Tokens
// Style: Strava-aligned (matches frontend web app)
// Background: white / cream · Brand: orange #FC4C02 · Text: dark #242428
//
// Only the VALUES of these tokens changed in the Strava migration.
// All keys (COLORS.brand, COLORS.surface, etc.) remain identical so screens
// don't need to be edited.

import { Easing } from 'react-native';

// ─── Strava-style palette ──────────────────────────────
const STRAVA_ORANGE = '#FC4C02';
const STRAVA_DARK   = '#242428';
const STRAVA_GRAY   = '#6D6D78';
const STRAVA_LIGHT  = '#F7F7FA';
const STRAVA_BORDER = '#E6E6EA';
const STRAVA_WHITE  = '#FFFFFF';
const STRAVA_CREAM  = '#FBFBF8';

export const COLORS = {
    // Backgrounds — light theme
    bgDeep:     STRAVA_LIGHT,        // outermost wrapper
    bgBase:     STRAVA_CREAM,        // primary screen bg
    bgElevated: STRAVA_WHITE,        // cards, sheets
    surface:    STRAVA_WHITE,        // (was translucent white-on-dark; now solid)
    surface2:   STRAVA_LIGHT,
    border:     STRAVA_BORDER,
    border2:    'rgba(36, 36, 40, 0.12)',

    // Brand — Strava orange
    brand:      STRAVA_ORANGE,
    brandGlow:  'rgba(252, 76, 2, 0.18)',
    brandDeep:  '#E04200',

    // Performance — keep amber for personal-best (works on light too)
    pb:         '#F59E0B',
    pbGlow:     'rgba(245, 158, 11, 0.20)',

    // Status — adjusted for light bg contrast
    success:     '#16A34A',
    successGlow: 'rgba(22, 163, 74, 0.15)',
    caution:     '#EA580C',
    cautionGlow: 'rgba(234, 88, 12, 0.15)',
    alert:       '#DC2626',
    alertGlow:   'rgba(220, 38, 38, 0.18)',
    info:        '#7C3AED',
    infoGlow:    'rgba(124, 58, 237, 0.15)',

    // Text — dark on light bg
    text:        STRAVA_DARK,
    textMuted:   STRAVA_GRAY,
    textDim:     '#9CA3AF',
};

// Status maps for InsightCard / StatCard typing
export const STATUS_COLORS = {
    success: { color: COLORS.success, glow: COLORS.successGlow, bg: 'rgba(22, 163, 74, 0.10)' },
    caution: { color: COLORS.caution, glow: COLORS.cautionGlow, bg: 'rgba(234, 88, 12, 0.10)' },
    alert:   { color: COLORS.alert,   glow: COLORS.alertGlow,   bg: 'rgba(220, 38, 38, 0.10)' },
    info:    { color: COLORS.info,    glow: COLORS.infoGlow,    bg: 'rgba(124, 58, 237, 0.10)' },
    brand:   { color: COLORS.brand,   glow: COLORS.brandGlow,   bg: 'rgba(252, 76, 2, 0.10)' },
    pb:      { color: COLORS.pb,      glow: COLORS.pbGlow,      bg: 'rgba(245, 158, 11, 0.12)' },
};

// Tier badge colors — light-bg variants
export const TIER_COLORS = {
    Block:    { bg: 'rgba(107, 114, 128, 0.12)', color: '#4B5563' },
    District: { bg: 'rgba(252, 76, 2, 0.10)',    color: STRAVA_ORANGE },
    State:    { bg: 'rgba(245, 158, 11, 0.12)',  color: '#B45309' },
    National: { bg: 'rgba(124, 58, 237, 0.12)',  color: '#6D28D9' },
    Elite:    { bg: STRAVA_DARK,                 color: STRAVA_ORANGE },
};

export const TYPOGRAPHY = {
    display:  'System',
    body:     'System',
    mono:     'System',

    sizes: {
        xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 40,
    },

    weights: {
        regular:  '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        heavy:    '800',
    },
};

export const SPACING = {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64,
};

export const RADIUS = {
    sm: 8, md: 12, lg: 16, xl: 20, pill: 999,
};

// Lighter shadows for light-theme cards
export const SHADOW = {
    sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
    lg: { shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 6 },
    glowBrand: { shadowColor: COLORS.brand, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 5 },
    glowPb:    { shadowColor: COLORS.pb,    shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 5 },
};

export const EASING = {
    out:    Easing.bezier(0.16, 1, 0.3, 1),
    inOut:  Easing.bezier(0.4, 0, 0.2, 1),
};

export const ANIM = {
    micro:    200,
    enter:    400,
    duration: 300,
};

export default { COLORS, STATUS_COLORS, TIER_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOW, EASING, ANIM };
