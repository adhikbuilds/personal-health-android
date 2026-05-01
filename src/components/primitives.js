// Design primitives — every screen composes from these, not ad-hoc Views.
//
// Card      → flat surface on bg, 16pt radius, hairline border. No shadows,
//             no gradient backgrounds. Optional left accent stroke.
// StatCell  → label above a tabular mono number, optional delta below.
// StatTriad → three StatCells with vertical hairline dividers (Strava pattern).
// Chip      → pill-shaped status/category marker.
// Divider   → horizontal hairline; never a gradient, never thick.
// SectionHead → uppercase letterspaced section title + optional trailing link.
//
// Typography: pass the rendered content using {T.foo} from styles/colors; these
// primitives just handle layout + surface, not type.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { C, T } from '../styles/colors';

// ─── Card ──────────────────────────────────────────────────────────────────

export function Card({ children, style, accent, padding = 20 }) {
    return (
        <View style={[s.card, { padding }, style]}>
            {accent && <View style={[s.cardAccent, { backgroundColor: accent }]} />}
            {children}
        </View>
    );
}

// ─── SectionHead ───────────────────────────────────────────────────────────

export function SectionHead({ title, right }) {
    return (
        <View style={s.sectionHead}>
            <Text style={T.label}>{title}</Text>
            {right && <View>{right}</View>}
        </View>
    );
}

// ─── StatCell ──────────────────────────────────────────────────────────────

export function StatCell({ label, value, caption, color = C.text, align = 'left', size = 'stat' }) {
    const valStyle = size === 'xl' ? T.statXL : size === 'sm' ? T.statSm : T.stat;
    return (
        <View style={align === 'center' ? s.statCenter : align === 'right' ? s.statRight : s.statLeft}>
            <Text style={T.micro}>{label}</Text>
            <Text style={[valStyle, { color, marginTop: 4 }]}>{value}</Text>
            {caption && <Text style={[s.caption, { color }]}>{caption}</Text>}
        </View>
    );
}

// ─── StatTriad ─────────────────────────────────────────────────────────────

export function StatTriad({ items = [] }) {
    // items: [{ label, value, caption, color }]
    return (
        <View style={s.triadRow}>
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    <View style={s.triadCell}>
                        <StatCell {...it} align={i === 0 ? 'left' : i === items.length - 1 ? 'right' : 'center'} />
                    </View>
                    {i < items.length - 1 && <View style={s.triadDivider} />}
                </React.Fragment>
            ))}
        </View>
    );
}

// ─── Chip ──────────────────────────────────────────────────────────────────

export function Chip({ label, color = C.accent, bg = 'rgba(198,255,61,0.10)', style }) {
    return (
        <View style={[s.chip, { backgroundColor: bg, borderColor: color + '44' }, style]}>
            <Text style={[s.chipText, { color }]}>{label}</Text>
        </View>
    );
}

// ─── Divider ───────────────────────────────────────────────────────────────

export function Divider({ style }) {
    return <View style={[s.divider, style]} />;
}

// ─── TextButton ────────────────────────────────────────────────────────────

export function TextButton({ label, onPress, color = C.accent }) {
    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <Text style={[s.textBtn, { color }]}>{label}</Text>
        </Pressable>
    );
}

// ─── ListRow ───────────────────────────────────────────────────────────────
// Tap row with optional left accent stroke + two-line content + chevron.

export function ListRow({ title, caption, accent, onPress, right }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [s.listRow, pressed && { opacity: 0.7 }]}>
            {accent && <View style={[s.rowStroke, { backgroundColor: accent }]} />}
            <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{title}</Text>
                {caption && <Text style={s.rowCaption}>{caption}</Text>}
            </View>
            {right ? (
                right
            ) : (
                <Text style={[s.rowArrow, { color: accent || C.textMid }]}>→</Text>
            )}
        </Pressable>
    );
}

// ─── Stylesheet ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    card: {
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
    },
    cardAccent: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    },

    sectionHead: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
    },

    statLeft:   { alignItems: 'flex-start' },
    statCenter: { alignItems: 'center' },
    statRight:  { alignItems: 'flex-end' },
    caption: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' },

    triadRow: { flexDirection: 'row', alignItems: 'center' },
    triadCell: { flex: 1 },
    triadDivider: { width: 1, height: 40, backgroundColor: C.border },

    chip: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 16, borderWidth: 1,
        alignSelf: 'flex-start',
    },
    chipText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

    divider: { height: 1, backgroundColor: C.border },

    textBtn: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

    listRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    rowStroke: { width: 3, height: 28, borderRadius: 2, marginRight: 14 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.2 },
    rowCaption: { fontSize: 12, fontWeight: '400', color: C.textMid, marginTop: 3 },
    rowArrow: { fontSize: 18, fontWeight: '700' },
});
