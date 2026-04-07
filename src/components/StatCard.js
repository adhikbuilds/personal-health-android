// PH-V2-A-02: Reusable StatCard component
// Premium KPI tile matching the frontend ph-stat-card design.

import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STATUS_COLORS, RADIUS, SPACING } from '../styles/tokens';

export default function StatCard({
    label,
    value,
    icon = 'pulse',
    color = 'brand',  // brand | pb | success | caution | alert | info
    delta,
    onPress,
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const status = STATUS_COLORS[color] || STATUS_COLORS.brand;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    };

    const Wrapper = onPress ? Pressable : View;
    const wrapperProps = onPress
        ? { onPress, onPressIn: handlePressIn, onPressOut: handlePressOut }
        : {};

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Wrapper {...wrapperProps} style={styles.card}>
                {/* Inset top edge highlight */}
                <View style={styles.topEdge} />

                {/* Icon box */}
                <View style={[styles.iconBox, { backgroundColor: status.bg }]}>
                    <Ionicons name={icon} size={20} color={status.color} />
                </View>

                {/* Label */}
                <Text style={styles.label}>{label}</Text>

                {/* Value */}
                <Text style={[styles.value, { color: color === 'pb' ? COLORS.pb : COLORS.text }]}>
                    {value ?? '—'}
                </Text>

                {/* Optional delta */}
                {delta != null && (
                    <Text style={[styles.delta, { color: delta >= 0 ? COLORS.success : COLORS.alert }]}>
                        {delta >= 0 ? '+' : ''}{delta}
                    </Text>
                )}
            </Wrapper>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: COLORS.bgElevated,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: SPACING[5],
        overflow: 'hidden',
    },
    topEdge: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    iconBox: {
        width: 40, height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING[3],
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING[1],
    },
    value: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
    },
    delta: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: SPACING[1],
    },
});
