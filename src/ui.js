// Shared UI primitives — used across all screens.
// Tap feedback, fade-in animation, haptic touch, typography helpers.

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Platform, StyleSheet, Text, View, Vibration } from 'react-native';

let Haptics;
try { Haptics = require('expo-haptics'); } catch (_) {}

const CONDENSED = Platform.OS === 'android' ? 'sans-serif-condensed' : 'HelveticaNeue-CondensedBold';
const MONO = Platform.OS === 'android' ? 'monospace' : 'Courier';

// ── Tap with spring scale + haptic ──────────────────────────────────────────

export function Tap({ onPress, children, style, haptic = true }) {
    const scale = useRef(new Animated.Value(1)).current;
    const onIn = () => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
        if (haptic && Haptics) {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
        }
    };
    const onOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    };
    return (
        <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
            <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
        </Pressable>
    );
}

// ── Fade-in on mount (staggered) ────────────────────────────────────────────

export function Fade({ delay = 0, distance = 24, duration = 650, children, style }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(distance)).current;
    useEffect(() => {
        const anim = Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: duration + 50, delay, useNativeDriver: true }),
        ]);
        anim.start();
        return () => anim.stop();
    }, []);
    return (
        <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
            {children}
        </Animated.View>
    );
}

// ── Animated number counter ─────────────────────────────────────────────────

export function CountUp({ to, duration = 800, delay = 0, style }) {
    const val = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = React.useState(0);
    useEffect(() => {
        const listener = val.addListener(({ value }) => setDisplay(Math.round(value)));
        Animated.timing(val, { toValue: to, duration, delay, useNativeDriver: false }).start();
        return () => val.removeListener(listener);
    }, [to]);
    return <Text style={style}>{display || '—'}</Text>;
}

// ── Section label ───────────────────────────────────────────────────────────

export function SectionLabel({ children }) {
    return <Text style={ui.sectionLabel}>{children}</Text>;
}

// ── Action row (Nike-style text + arrow) ────────────────────────────────────

export function ActionRow({ label, color, onPress }) {
    return (
        <Tap onPress={onPress} style={ui.actionRow}>
            <View style={ui.actionLeft}>
                {color && <View style={[ui.actionDot, { backgroundColor: color }]} />}
                <Text style={ui.actionTitle}>{label}</Text>
            </View>
            <Text style={ui.actionArrow}>›</Text>
        </Tap>
    );
}

// ── Thin divider ────────────────────────────────────────────────────────────

export function Divider({ thick }) {
    return <View style={[ui.divider, thick && ui.dividerThick]} />;
}

// ── Progress ring ───────────────────────────────────────────────────────────

export { default as Svg, Circle } from 'react-native-svg';

export function ProgressRing({ pct, color, size = 140, stroke = 6 }) {
    const Svg = require('react-native-svg').default;
    const Circle = require('react-native-svg').Circle;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <Svg width={size} height={size}>
            <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth={stroke} />
            <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, (pct||0)/100))}
                strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        </Svg>
    );
}

// ── Shared styles ───────────────────────────────────────────────────────────

const ui = StyleSheet.create({
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#4b5563', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
    actionLeft: { flexDirection: 'row', alignItems: 'center' },
    actionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 14 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 2 },
    actionArrow: { fontSize: 22, color: '#4b5563', fontWeight: '300' },
    divider: { height: 1, backgroundColor: '#1a1a1a' },
    dividerThick: { height: 2, backgroundColor: '#111' },
});

export { CONDENSED, MONO };
export default ui;
