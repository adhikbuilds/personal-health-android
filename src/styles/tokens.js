// Personal Health Design Language v2 — Tokens
// Style: Modern Dark (Cinema Mobile) — sourced from UI/UX Pro Max
// Typography: Barlow Condensed + Barlow — sourced from UI/UX Pro Max sport pairing

import { Easing } from 'react-native';

export const COLORS = {
    // Backgrounds
    bgDeep:     '#020203',
    bgBase:     '#050506',
    bgElevated: '#0a0a0c',
    surface:    'rgba(255,255,255,0.05)',
    surface2:   'rgba(255,255,255,0.08)',
    border:     'rgba(255,255,255,0.08)',
    border2:    'rgba(255,255,255,0.16)',

    // Brand
    brand:      '#06b6d4',
    brandGlow:  'rgba(6,182,212,0.20)',
    brandDeep:  '#0891b2',

    // Performance — warm amber for personal-best
    pb:         '#f59e0b',
    pbGlow:     'rgba(245,158,11,0.18)',

    // Status
    success:     '#10b981',
    successGlow: 'rgba(16,185,129,0.18)',
    caution:     '#f59e0b',
    cautionGlow: 'rgba(245,158,11,0.18)',
    alert:       '#ef4444',
    alertGlow:   'rgba(239,68,68,0.20)',
    info:        '#8b5cf6',
    infoGlow:    'rgba(139,92,246,0.18)',

    // Text
    text:        '#ededef',
    textMuted:   '#8a8f98',
    textDim:     '#5a5e66',
};

// Status maps for InsightCard / StatCard typing
export const STATUS_COLORS = {
    success: { color: COLORS.success, glow: COLORS.successGlow, bg: 'rgba(16,185,129,0.15)' },
    caution: { color: COLORS.caution, glow: COLORS.cautionGlow, bg: 'rgba(245,158,11,0.15)' },
    alert:   { color: COLORS.alert,   glow: COLORS.alertGlow,   bg: 'rgba(239,68,68,0.15)' },
    info:    { color: COLORS.info,    glow: COLORS.infoGlow,    bg: 'rgba(139,92,246,0.15)' },
    brand:   { color: COLORS.brand,   glow: COLORS.brandGlow,   bg: 'rgba(6,182,212,0.15)' },
    pb:      { color: COLORS.pb,      glow: COLORS.pbGlow,      bg: 'rgba(245,158,11,0.15)' },
};

// Tier badge colors
export const TIER_COLORS = {
    Block:    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    District: { bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    State:    { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    National: { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa' },
    Elite:    { bg: '#f59e0b',                color: '#1a0f00' },
};

export const TYPOGRAPHY = {
    // Barlow Condensed for display, Barlow for body, JetBrains Mono for numerics.
    // Note: load fonts via expo-font in App.js if Barlow is not available; fallback to system.
    display:  'System',  // 'Barlow Condensed' once loaded
    body:     'System',  // 'Barlow' once loaded
    mono:     'System',  // 'JetBrains Mono' once loaded — falls back to monospace

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

export const SHADOW = {
    sm: { shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: '#000', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#000', shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 32, elevation: 12 },
    glowBrand: { shadowColor: COLORS.brand, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8 },
    glowPb:    { shadowColor: COLORS.pb,    shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8 },
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

// Default export for convenience
export default { COLORS, STATUS_COLORS, TIER_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOW, EASING, ANIM };
