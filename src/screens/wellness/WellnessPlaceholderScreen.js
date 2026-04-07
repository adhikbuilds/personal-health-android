// Personal Health — Wellness Placeholder
// Coming soon — interns are building NutritionScreen, WellnessScreen, etc.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CYAN  = '#06b6d4';
const BG    = '#0a0e1a';
const CARD  = '#111827';
const TEXT  = '#f1f5f9';
const MUTED = '#94a3b8';
const DIM   = '#64748b';

export default function WellnessPlaceholderScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                    <Ionicons name="arrow-back" size={22} color={TEXT} />
                </Pressable>
                <Text style={styles.headerTitle}>Wellness</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <Ionicons name="heart-outline" size={56} color={CYAN} />
                </View>

                <Text style={styles.title}>Coming Soon</Text>
                <Text style={styles.subtitle}>
                    Nutrition tracking, sleep analysis, and recovery scoring are being built by the team.
                </Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="restaurant-outline" size={18} color={CYAN} />
                        <Text style={styles.featureText}>Meal logging with Indian food database</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="moon-outline" size={18} color={CYAN} />
                        <Text style={styles.featureText}>Sleep quality tracking and trends</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="pulse-outline" size={18} color={CYAN} />
                        <Text style={styles.featureText}>Recovery readiness before every session</Text>
                    </View>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.backHomeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backHomeText}>Back to Home</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(51,65,85,0.4)',
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    iconBox: {
        width: 96, height: 96, borderRadius: 24,
        backgroundColor: 'rgba(6,182,212,0.1)',
        borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    title: { color: TEXT, fontSize: 22, fontWeight: '900', marginBottom: 8 },
    subtitle: { color: MUTED, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28, maxWidth: 300 },
    featureList: { width: '100%', maxWidth: 320, marginBottom: 32 },
    featureItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: CARD, borderWidth: 1, borderColor: 'rgba(51,65,85,0.4)',
        borderRadius: 12, padding: 14, marginBottom: 8,
    },
    featureText: { color: MUTED, fontSize: 13, flex: 1 },
    backHomeBtn: {
        backgroundColor: 'rgba(6,182,212,0.15)',
        borderWidth: 1, borderColor: 'rgba(6,182,212,0.35)',
        borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    backHomeText: { color: CYAN, fontSize: 14, fontWeight: '700' },
});
