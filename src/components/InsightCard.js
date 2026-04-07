// PH-V2-A-03: Reusable InsightCard component
// Status-aware card with halo effect (success/caution/alert/info).
// Used for post-session insights, injury warnings, achievements.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STATUS_COLORS, RADIUS, SPACING } from '../styles/tokens';

const ICON_BY_TYPE = {
    success: 'checkmark-circle',
    caution: 'warning',
    alert:   'alert-circle',
    info:    'information-circle',
};

const BORDER_BY_TYPE = {
    success: 'rgba(16,185,129,0.25)',
    caution: 'rgba(245,158,11,0.25)',
    alert:   'rgba(239,68,68,0.25)',
    info:    'rgba(139,92,246,0.25)',
};

export default function InsightCard({
    type = 'info',  // success | caution | alert | info
    title,
    message,
    ctaLabel,
    onPress,
}) {
    const status = STATUS_COLORS[type] || STATUS_COLORS.info;
    const iconName = ICON_BY_TYPE[type] || 'information-circle';
    const borderColor = BORDER_BY_TYPE[type] || COLORS.border;

    return (
        <View style={[styles.card, { borderColor }]}>
            {/* Halo blob — top right corner */}
            <View
                style={[
                    styles.halo,
                    { backgroundColor: status.glow },
                ]}
            />

            <View style={styles.content}>
                <View style={[styles.iconBox, { backgroundColor: status.bg }]}>
                    <Ionicons name={iconName} size={22} color={status.color} />
                </View>

                <View style={styles.textBlock}>
                    <Text style={styles.title}>{title}</Text>
                    {message ? <Text style={styles.message}>{message}</Text> : null}
                </View>

                {ctaLabel && onPress && (
                    <Pressable
                        onPress={onPress}
                        style={({ pressed }) => [
                            styles.cta,
                            { borderColor: status.color, opacity: pressed ? 0.7 : 1 },
                        ]}
                    >
                        <Text style={[styles.ctaLabel, { color: status.color }]}>{ctaLabel}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: COLORS.bgElevated,
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: SPACING[5],
        overflow: 'hidden',
        marginBottom: SPACING[3],
    },
    halo: {
        position: 'absolute',
        top: -48,
        right: -48,
        width: 160,
        height: 160,
        borderRadius: 80,
        opacity: 0.6,
    },
    content: {
        position: 'relative',
        zIndex: 1,
    },
    iconBox: {
        width: 44, height: 44,
        borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING[3],
    },
    textBlock: {
        marginBottom: SPACING[2],
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING[1],
        letterSpacing: -0.2,
    },
    message: {
        fontSize: 13,
        fontWeight: '400',
        color: COLORS.textMuted,
        lineHeight: 19,
    },
    cta: {
        alignSelf: 'flex-start',
        marginTop: SPACING[3],
        paddingHorizontal: SPACING[4],
        paddingVertical: SPACING[2],
        borderRadius: RADIUS.md,
        borderWidth: 1,
    },
    ctaLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
});
