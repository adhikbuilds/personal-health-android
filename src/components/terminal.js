// Bloomberg Terminal primitives — shared across every screen so the whole
// app feels like one terminal. Use these instead of rolling ad-hoc Views.
//
//   Panel      — bordered box, black bg, hairline border, optional header.
//   Header     — [BRACKETED] title + optional right metadata.
//   FieldRow   — dot-filled label on left, mono value on right.
//   Triad      — three centred mono stats with vertical rule separators.
//   Rule       — 1pt horizontal hairline.
//   CmdRow     — [F1] ACTION / description / ▸ arrow — navigable command row.
//   SysBar     — top system bar with connection dot, identity, clock.
//   Ticker     — horizontal scrolling metrics row.
//   DistBar    — label + horizontal bar + count/pct, Bloomberg distribution style.
//   Table      — header row + data rows with aligned columns.
//   Sign       — helpers for formatted ±N / ±N% values.
//   Block      — the label|right value pair used everywhere.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { C, T } from '../styles/colors';

// ─── Formatting helpers ────────────────────────────────────────────────────

export function fmt(n, decimals = 2) {
    if (n == null || Number.isNaN(Number(n))) return '--.--';
    return Number(n).toFixed(decimals);
}

export function fmtInt(n) {
    if (n == null) return '---';
    return Number(n).toLocaleString('en-US');
}

export function signPct(v, decimals = 2) {
    if (v == null) return '--.--%';
    const n = Math.abs(v).toFixed(decimals);
    return v >= 0 ? `+${n}%` : `-${n}%`;
}

export function signVal(v, decimals = 2) {
    if (v == null) return '--.--';
    const n = Math.abs(v).toFixed(decimals);
    return v >= 0 ? `+${n}` : `-${n}`;
}

export function trendColor(v) {
    if (v == null) return C.textMid;
    if (v > 0) return C.good;
    if (v < 0) return C.bad;
    return C.textMid;
}

export function bandColor(band) {
    if (!band) return C.textMid;
    const b = String(band).toLowerCase();
    if (b === 'elite' || b === 'ready' || b === 'sweet spot' || b === 'fresh' || b === 'symmetrical') return C.good;
    if (b === 'caution' || b === 'high' || b === 'accumulating' || b === 'watch' || b === 'minor') return C.warn;
    if (b === 'recover' || b === 'fatigued' || b.startsWith('spike') || b.startsWith('flag')) return C.bad;
    if (b === 'under-loaded' || b === 'neutral') return C.info;
    return C.textMid;
}

export function nowHHMMSS() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function nowISO() {
    const d = new Date();
    return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// ─── Building blocks ───────────────────────────────────────────────────────

export function Panel({ children, style }) {
    return <View style={[s.panel, style]}>{children}</View>;
}

export function Header({ title, right, accent = C.text }) {
    return (
        <View style={s.header}>
            <Text style={[s.headerTitle, { color: accent }]}>[{title}]</Text>
            {right && <View>{right}</View>}
        </View>
    );
}

export function HdrMeta({ children, color }) {
    return <Text style={[s.hdrMeta, color && { color }]}>{children}</Text>;
}

export function Rule() {
    return <View style={s.rule} />;
}

export function FieldRow({ label, value, color = '#E8E8E8', delta, dim, onPress, size = 'md' }) {
    const content = (
        <View style={s.fieldRow}>
            <Text style={[s.fieldLabel, dim && { color: C.muted }]}>{label}</Text>
            <View style={s.fieldRight}>
                <Text style={[size === 'lg' ? s.fieldValueLg : size === 'sm' ? s.fieldValueSm : s.fieldValue, { color }]}>{value}</Text>
                {delta != null && (
                    <Text style={[s.fieldDelta, { color: trendColor(delta) }]}>{signPct(delta)}</Text>
                )}
            </View>
        </View>
    );
    return onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: '#0a0a0a' }}>
            {content}
        </Pressable>
    ) : content;
}

export function Triad({ items = [] }) {
    return (
        <View style={s.triadRow}>
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    <View style={[s.triadCell, i === 0 && { alignItems: 'flex-start' }, i === items.length - 1 && { alignItems: 'flex-end' }]}>
                        <Text style={s.triadLabel}>{it.label}</Text>
                        <Text style={[s.triadValue, { color: it.color || '#E8E8E8' }]}>{it.value}</Text>
                        {it.caption && <Text style={[s.triadCaption, { color: it.color || C.muted }]}>{it.caption}</Text>}
                    </View>
                    {i < items.length - 1 && <View style={s.triadRule} />}
                </React.Fragment>
            ))}
        </View>
    );
}

export function SysBar({ online, identity, clock }) {
    return (
        <View style={s.sysBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[s.sysDot, { backgroundColor: online ? C.good : online === false ? C.bad : C.warn }]} />
                <Text style={[s.sysText, { color: C.white }]}>ACTIVE</Text>
                <Text style={[s.sysText, { color: C.text }]}>.BHARAT</Text>
                {identity && (
                    <>
                        <Text style={s.sysSep}>|</Text>
                        <Text style={[s.sysText, { color: C.textMid }]}>{identity}</Text>
                    </>
                )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[s.sysText, { color: online ? C.good : online === false ? C.bad : C.warn }]}>
                    {online ? 'CONN' : online === false ? 'OFF ' : 'WAIT'}
                </Text>
                <Text style={s.sysSep}>|</Text>
                <Text style={[s.sysText, { color: C.textMid }]}>{clock || nowHHMMSS()}</Text>
            </View>
        </View>
    );
}

export function Ticker({ items = [] }) {
    return (
        <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.ticker}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 12 }}
        >
            {items.map((t, i) => (
                <View key={i} style={s.tickerCell}>
                    <Text style={s.tickerLabel}>{t.label}</Text>
                    <Text style={[s.tickerValue, t.color && { color: t.color }]}>{t.value}</Text>
                    {t.delta != null && (
                        <Text style={[s.tickerDelta, { color: trendColor(t.delta) }]}>
                            {t.delta >= 0 ? '▲' : '▼'}{Math.abs(t.delta).toFixed(1)}
                        </Text>
                    )}
                    {i < items.length - 1 && <Text style={s.tickerSep}>·</Text>}
                </View>
            ))}
        </ScrollView>
    );
}

export function DistBar({ label, value, total = 100, color = C.text, pct }) {
    const p = pct != null ? pct : (value / (total || 1)) * 100;
    return (
        <View style={s.distRow}>
            <Text style={s.distLabel}>{String(label).toUpperCase().padEnd(8, ' ')}</Text>
            <View style={s.distBarTrack}>
                <View style={[s.distBarFill, { backgroundColor: color, width: `${Math.min(100, p)}%` }]} />
            </View>
            <Text style={[s.distValue, { color }]}>
                {String(value).padStart(4, ' ')}  {fmt(p, 1).padStart(5, ' ')}%
            </Text>
        </View>
    );
}

export function Table({ cols = [], rows = [] }) {
    return (
        <View>
            <View style={s.tblHead}>
                {cols.map((c, i) => (
                    <Text key={i} style={[s.tblCol, { flex: c.flex || 1, textAlign: c.align || 'left' }]}>{c.label}</Text>
                ))}
            </View>
            {rows.map((row, ri) => (
                <Pressable
                    key={ri}
                    onPress={row.onPress}
                    style={({ pressed }) => [s.tblRow, pressed && { backgroundColor: '#0a0a0a' }]}
                >
                    {row.cells.map((cell, ci) => (
                        <Text key={ci} style={[
                            s.tblCell,
                            { flex: cols[ci]?.flex || 1, textAlign: cols[ci]?.align || 'left' },
                            cell.color && { color: cell.color },
                        ]}>
                            {cell.value}
                        </Text>
                    ))}
                </Pressable>
            ))}
        </View>
    );
}

export function CmdRow({ hotkey, label, desc, color = C.text, onPress, right }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [s.cmdRow, pressed && { backgroundColor: '#111' }]}
        >
            {hotkey && <Text style={[s.cmdKey, { color }]}>[{hotkey}]</Text>}
            <Text style={[s.cmdLabel, { color: '#E8E8E8' }]}>{label}</Text>
            {desc && <Text style={s.cmdDesc} numberOfLines={1}>{desc}</Text>}
            {right || <Text style={[s.cmdArrow, { color }]}>▸</Text>}
        </Pressable>
    );
}

export function Footer({ lines = [] }) {
    return (
        <View style={s.footer}>
            {lines.map((l, i) => (
                <Text key={i} style={[s.footerText, l.color && { color: l.color }]}>{l.text}</Text>
            ))}
        </View>
    );
}

// Screen background wrapper so every screen shares the dead-black canvas.
export function TerminalScreen({ children, style }) {
    return <View style={[s.screen, style]}>{children}</View>;
}

export function BlinkCursor({ color = C.text }) {
    const o = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(o, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.timing(o, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.Text style={{ opacity: o, color, fontFamily: T.MONO, fontSize: 24, fontWeight: '700' }}>_</Animated.Text>;
}

// Useful live-updating clock used in several screens.
export function useLiveClock(intervalMs = 1000) {
    const [c, setC] = useState(nowHHMMSS());
    useEffect(() => {
        const i = setInterval(() => setC(nowHHMMSS()), intervalMs);
        return () => clearInterval(i);
    }, [intervalMs]);
    return c;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    // Panel
    panel: {
        marginHorizontal: 16, marginTop: 14,
        borderWidth: 1, borderColor: C.border,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#080808',
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { fontSize: 11, fontWeight: '700', fontFamily: T.MONO, letterSpacing: 1.5 },
    hdrMeta: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    rule: { height: 1, backgroundColor: C.border, marginHorizontal: 12 },

    // Field row
    fieldRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: '#0C0C0C',
    },
    fieldLabel: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '600', letterSpacing: 0.5, flex: 1 },
    fieldRight: { flexDirection: 'row', alignItems: 'baseline' },
    fieldValue:   { fontSize: 13, fontFamily: T.MONO, fontWeight: '700' },
    fieldValueLg: { fontSize: 18, fontFamily: T.MONO, fontWeight: '700' },
    fieldValueSm: { fontSize: 11, fontFamily: T.MONO, fontWeight: '600' },
    fieldDelta: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginLeft: 8 },

    // Triad
    triadRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12 },
    triadCell: { flex: 1, alignItems: 'center' },
    triadLabel: { fontSize: 9, color: C.textMid, fontFamily: T.MONO, letterSpacing: 0.5, fontWeight: '700' },
    triadValue: { fontSize: 18, fontFamily: T.MONO, fontWeight: '700', marginTop: 4, letterSpacing: -0.5 },
    triadCaption: { fontSize: 9, fontFamily: T.MONO, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
    triadRule: { width: 1, backgroundColor: C.border, marginHorizontal: 4 },

    // System bar
    sysBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: '#000',
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    sysDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    sysText: { fontSize: 10, fontWeight: '700', fontFamily: T.MONO, letterSpacing: 1 },
    sysSep: { fontSize: 10, color: C.muted, marginHorizontal: 8, fontFamily: T.MONO },

    // Ticker
    ticker: {
        maxHeight: 32,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: '#050505',
    },
    tickerCell: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    tickerLabel: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.5 },
    tickerValue: { fontSize: 11, color: '#E8E8E8', fontFamily: T.MONO, fontWeight: '700', marginLeft: 6 },
    tickerDelta: { fontSize: 9, fontFamily: T.MONO, fontWeight: '700', marginLeft: 4 },
    tickerSep: { fontSize: 10, color: C.muted, fontFamily: T.MONO, marginHorizontal: 12 },

    // Distribution
    distRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4 },
    distLabel: { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.5 },
    distBarTrack: { flex: 1, height: 8, marginHorizontal: 8, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: C.border },
    distBarFill: { height: 6 },
    distValue: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', width: 96, textAlign: 'right' },

    // Table
    tblHead: {
        flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: '#060606',
    },
    tblCol: { fontSize: 9, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.8 },
    tblRow: {
        flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7,
        borderBottomWidth: 1, borderBottomColor: '#0A0A0A',
    },
    tblCell: { fontSize: 11, fontFamily: T.MONO, fontWeight: '600', color: '#E8E8E8' },

    // Command menu
    cmdRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#0A0A0A',
    },
    cmdKey: { fontSize: 10, fontFamily: T.MONO, fontWeight: '700', marginRight: 10, letterSpacing: 0.5 },
    cmdLabel: { fontSize: 12, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1, width: 110 },
    cmdDesc: { fontSize: 10, color: C.muted, fontFamily: T.MONO, flex: 1 },
    cmdArrow: { fontSize: 13, fontFamily: T.MONO, fontWeight: '700' },

    // Footer
    footer: { paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 },
    footerText: { fontSize: 10, color: C.muted, fontFamily: T.MONO, letterSpacing: 0.5, marginBottom: 3 },
});
