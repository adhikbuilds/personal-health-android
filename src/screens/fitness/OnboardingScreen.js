// OnboardingScreen — FH-05: 3-step onboarding: sport pick → drill → score
// Step 0: sport picker (saves to athlete profile)
// Step 1: drill picker (existing flow → PlacementWizard)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateAnonymousAthleteId, markOnboardingComplete } from '../../services/deviceIdentity';
import { scheduleDailyReminder } from '../../services/notifications';
import { fetchDrillsCatalog } from '../../services/drillsCatalog';
import api from '../../services/api';
import DrillTile from '../../components/DrillTile';
import { C } from '../../styles/colors';

const BG     = C.bg;
const SURF   = C.surf;
const TEXT   = C.text;
const MUTED  = C.muted;
const ACCENT = C.cyan;

const SPORTS_META = [
    { key: 'sprint',        label: 'Sprint',         icon: 'flash-outline',         description: '100m / 200m speed' },
    { key: 'vertical_jump', label: 'Vertical Jump',  icon: 'arrow-up-outline',      description: 'Explosive power' },
    { key: 'push_up',       label: 'Push-up',        icon: 'body-outline',          description: 'Upper body strength' },
    { key: 'squat',         label: 'Squat',          icon: 'barbell-outline',       description: 'Lower body depth' },
    { key: 'javelin',       label: 'Javelin',        icon: 'navigate-outline',      description: 'Throw mechanics' },
    { key: 'cricket_bat',   label: 'Cricket Bat',    icon: 'baseball-outline',      description: 'Batting technique' },
    { key: 'football',      label: 'Football',       icon: 'football-outline',      description: 'Kick + sprint' },
    { key: 'swimming',      label: 'Swimming',       icon: 'water-outline',         description: 'Stroke efficiency' },
];

const DRILLS = [
    { key: 'sprint',        label: 'Sprint',        motion: 'A-skip drill' },
    { key: 'vertical_jump', label: 'Vertical Jump', motion: 'Countermovement' },
    { key: 'push_up',       label: 'Push-up',       motion: 'Full range' },
    { key: 'squat',         label: 'Squat',         motion: 'Depth + control' },
    { key: 'javelin',       label: 'Javelin',       motion: 'Plant + release' },
    { key: 'cricket_bat',   label: 'Cricket Bat',   motion: 'Front-foot drive' },
];

const DRILL_RELEVANCE = {
    sprint:        ['sprint', 'squat', 'push_up', 'plank'],
    vertical_jump: ['vertical_jump', 'squat', 'push_up', 'plank'],
    push_up:       ['push_up', 'squat', 'plank'],
    squat:         ['squat', 'vertical_jump', 'push_up'],
    javelin:       ['javelin', 'push_up', 'squat'],
    cricket_bat:   ['cricket_bat', 'squat', 'push_up'],
    football:      ['sprint', 'squat', 'push_up', 'vertical_jump'],
    swimming:      ['push_up', 'squat', 'plank'],
};

function SportCard({ sport, selected, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
    };

    return (
        <Animated.View style={{ transform: [{ scale }], width: '48%' }}>
            <TouchableOpacity
                style={[s.sportCard, selected && s.sportCardSelected]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <View style={[s.sportIconWrap, selected && { backgroundColor: 'rgba(6,182,212,0.18)' }]}>
                    <Ionicons name={sport.icon} size={24} color={selected ? ACCENT : MUTED} />
                </View>
                <Text style={[s.sportLabel, selected && { color: ACCENT }]}>{sport.label}</Text>
                <Text style={s.sportDesc}>{sport.description}</Text>
                {selected && (
                    <View style={s.sportCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function OnboardingScreen({ navigation }) {
    const [step, setStep]               = useState(0); // 0 = sport, 1 = drill
    const [athleteId, setAthleteId]     = useState(null);
    const [selectedSport, setSelected]  = useState(null);
    const [saving, setSaving]           = useState(false);
    const [catalog, setCatalog]         = useState(null);

    const fadeAnim  = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        getOrCreateAnonymousAthleteId()
            .then(id => setAthleteId(id))
            .catch(() => setAthleteId('athlete_01'));
        fetchDrillsCatalog()
            .then(drills => setCatalog(drills && drills.length ? drills : null))
            .catch(() => setCatalog(null));
    }, []);

    const transitionTo = (nextStep) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setStep(nextStep), 150);
    };

    // Jump straight to the main dashboard. Used by "Skip setup" on both steps.
    // We mark onboarding as complete so the LaunchScreen doesn't send the
    // user back here on the next app open.
    const skipToDashboard = async () => {
        try { await markOnboardingComplete(); } catch {}
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    };

    const handleSportContinue = async () => {
        if (!selectedSport) return;
        setSaving(true);
        try {
            if (athleteId) {
                await api.patch(`/athlete/${athleteId}`, { primary_sport: selectedSport });
            }
            // Best-effort: schedule daily wellness reminder
            scheduleDailyReminder().catch(() => {});
        } catch {}
        setSaving(false);
        transitionTo(1);
    };

    const handleDrillSelect = (drillKey) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        navigation.replace('PlacementWizard', {
            sport: drillKey,
            athleteId: athleteId || 'athlete_01',
            onboardingMode: true,
            overrideAfterSeconds: 10,
        });
    };

    const relevantDrills = useMemo(() => {
        const source = catalog && catalog.length ? catalog : DRILLS;
        if (!selectedSport) return source;
        const sportRelevance = DRILL_RELEVANCE[selectedSport];
        if (!sportRelevance) return source;

        const relevant = source.filter(d => sportRelevance.includes(d.key));
        const primary = relevant.find(d => d.key === selectedSport);
        const rest = relevant.filter(d => d.key !== selectedSport);

        if (relevant.length < 3) {
            const neutralKeys = ['push_up', 'plank', 'squat'];
            const neutral = source.filter(d => !relevant.find(r => r.key === d.key) && neutralKeys.includes(d.key));
            return primary ? [primary, ...rest, ...neutral] : [...relevant, ...neutral];
        }

        return primary ? [primary, ...rest] : relevant;
    }, [selectedSport, catalog]);

    return (
        <SafeAreaView style={s.safe}>
            {/* Step dots */}
            <View style={s.stepDots}>
                {[0, 1].map(i => (
                    <View key={i} style={[s.dot, step === i && s.dotActive, step > i && s.dotDone]} />
                ))}
            </View>

            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                {step === 0 ? (
                    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
                        <Text style={s.kicker}>Step 1 of 2</Text>
                        <Text style={s.title}>What's your sport?</Text>
                        <Text style={s.sub}>We'll tune the AI model and form grading to match.</Text>

                        <View style={s.sportGrid}>
                            {SPORTS_META.map(sport => (
                                <SportCard
                                    key={sport.key}
                                    sport={sport}
                                    selected={selectedSport === sport.key}
                                    onPress={() => setSelected(sport.key)}
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[s.continueBtn, !selectedSport && s.continueBtnDisabled]}
                            onPress={handleSportContinue}
                            disabled={!selectedSport || saving}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.continueBtnText, !selectedSport && { color: MUTED }]}>
                                {saving ? 'Saving…' : 'Continue'}
                            </Text>
                            {selectedSport && !saving && (
                                <Ionicons name="arrow-forward" size={18} color="#0a0e1a" style={{ marginLeft: 8 }} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={s.skipLink} onPress={skipToDashboard}>
                            <Text style={s.skipText}>Skip setup — take me to the dashboard</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
                        <Text style={s.kicker}>Step 2 of 2</Text>
                        <Text style={s.title}>Pick one drill.</Text>
                        <Text style={s.sub}>Place your phone. Do 3 reps. Get your first score.</Text>

                        <View style={s.drillGrid}>
                            {relevantDrills.map(drill => (
                                <View key={drill.key} style={{ width: '48%' }}>
                                    <DrillTile
                                        drill={drill}
                                        selectedSport={selectedSport}
                                        onPress={() => handleDrillSelect(drill.key)}
                                    />
                                </View>
                            ))}
                        </View>

                        <Text style={s.foot}>No email. No paywall. First score first.</Text>

                        <TouchableOpacity style={s.skipLink} onPress={skipToDashboard}>
                            <Text style={s.skipText}>Skip — take me to the dashboard</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:            { flex: 1, backgroundColor: BG },
    wrap:            { padding: 24, paddingBottom: 40 },

    stepDots:        { flexDirection: 'row', gap: 6, padding: 24, paddingBottom: 0 },
    dot:             { width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    dotActive:       { backgroundColor: ACCENT, width: 44 },
    dotDone:         { backgroundColor: 'rgba(6,182,212,0.4)' },

    kicker:          { color: ACCENT, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
    title:           { color: TEXT, fontSize: 34, fontWeight: '900', letterSpacing: -0.8, lineHeight: 40, marginBottom: 10 },
    sub:             { color: MUTED, fontSize: 16, lineHeight: 23, marginBottom: 28 },

    sportGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    sportCard:       { backgroundColor: SURF, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', position: 'relative' },
    sportCardSelected: { borderColor: ACCENT, backgroundColor: 'rgba(6,182,212,0.05)' },
    sportIconWrap:   { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    sportLabel:      { color: TEXT, fontSize: 15, fontWeight: '800', marginBottom: 3 },
    sportDesc:       { color: MUTED, fontSize: 12, lineHeight: 16 },
    sportCheck:      { position: 'absolute', top: 10, right: 10 },

    continueBtn:     { flexDirection: 'row', backgroundColor: ACCENT, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    continueBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
    continueBtnText: { color: '#FBFBF8', fontSize: 16, fontWeight: '800' },
    skipLink:        { alignItems: 'center', padding: 16, marginTop: 4 },
    skipText:        { color: MUTED, fontSize: 14 },

    drillGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    foot:            { color: MUTED, fontSize: 15, marginTop: 8 },
});
