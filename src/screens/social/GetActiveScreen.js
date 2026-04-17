// GetActiveScreen — Age-Segmented Workout Categories
// Three tabs: For Children | For Adult | For Senior
// Real-time pose feedback via Camera tab (AI Vision)
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, FlatList, Dimensions,
} from 'react-native';
import { C } from '../../styles/colors';
import { GET_ACTIVE_CATEGORIES } from '../../data/constants';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;
const AGE_GROUPS = ['Children', 'Adult', 'Senior'];

export default function GetActiveScreen({ navigation, showToast }) {
    const [ageGroup, setAgeGroup] = useState('Adult');
    const [selected, setSelected] = useState(null);

    const filtered = GET_ACTIVE_CATEGORIES.filter(c => c.ageGroups.includes(ageGroup));

    const handlePress = (cat) => {
        if (cat.aiEnabled) {
            setSelected(cat);
        } else {
            showToast?.(`Starting ${cat.label}…`);
        }
    };

    if (selected) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.topbar}>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                        <Text style={s.back}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>{selected.emoji} {selected.label}</Text>
                    <View style={{ width: 60 }} />
                </View>
                <ScrollView contentContainerStyle={s.detailContent}>
                    <View style={[s.categoryHero, { backgroundColor: C.cyan + '15' }]}>
                        <Text style={s.heroEmoji}>{selected.emoji}</Text>
                        <Text style={s.heroTitle}>{selected.label}</Text>
                        <Text style={s.heroSub}>Recommended for {selected.ageGroups.join(', ')}</Text>
                    </View>

                    <View style={s.exerciseList}>
                        {getExercises(selected.id).map((ex, i) => (
                            <View key={i} style={s.exerciseItem}>
                                <View style={s.exerciseDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.exerciseName}>{ex.name}</Text>
                                    <Text style={s.exerciseDesc}>{ex.desc}</Text>
                                </View>
                                <Text style={s.exerciseDuration}>{ex.duration}</Text>
                            </View>
                        ))}
                    </View>

                    {selected.aiEnabled && (
                        <TouchableOpacity
                            style={s.aiBtn}
                            onPress={() => navigation.navigate('Camera')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.aiBtnIcon}>🤖</Text>
                            <View>
                                <Text style={s.aiBtnTitle}>Live AI Feedback</Text>
                                <Text style={s.aiBtnSub}>Get real-time pose analysis</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={s.startBtn} onPress={() => {
                        showToast?.(`Starting ${selected.label} session…`);
                        navigation.navigate('Tabs', { screen: 'Camera' });
                    }}>
                        <Text style={s.startBtnText}>Start Session →</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topbar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={s.back}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Get Active</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Age group tabs */}
            <View style={s.tabBar}>
                {AGE_GROUPS.map(g => (
                    <TouchableOpacity
                        key={g}
                        style={[s.tab, ageGroup === g && s.tabActive]}
                        onPress={() => setAgeGroup(g)}
                    >
                        <Text style={[s.tabText, ageGroup === g && s.tabTextActive]}>{g}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={s.grid}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[s.catCard, item.aiEnabled && { borderColor: C.cyan + '40' }]}
                        onPress={() => handlePress(item)}
                        activeOpacity={0.82}
                    >
                        <View style={[s.catIconWrap, { backgroundColor: item.aiEnabled ? C.cyan + '18' : C.surf2 }]}>
                            <Text style={s.catEmoji}>{item.emoji}</Text>
                        </View>
                        <Text style={s.catLabel}>{item.label}</Text>
                        {item.aiEnabled && (
                            <View style={s.aiTag}>
                                <Text style={s.aiTagText}>🤖 AI</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

function getExercises(categoryId) {
    const map = {
        balance:     [{ name: 'Single Leg Stand', desc: 'Stand on one foot for 30 seconds', duration: '1 min' }, { name: 'Tree Pose', desc: 'Yoga balance posture', duration: '2 min' }, { name: 'Heel-Toe Walk', desc: 'Walk in a straight line, heel to toe', duration: '2 min' }],
        abs:         [{ name: 'Crunches', desc: '3 sets × 15 reps', duration: '5 min' }, { name: 'Leg Raises', desc: 'Lying flat, raise legs to 90°', duration: '3 min' }, { name: 'Plank', desc: 'Hold for 30–60 seconds', duration: '3 min' }],
        muscular:    [{ name: 'Push-Ups', desc: '3 sets × 10–15 reps', duration: '6 min' }, { name: 'Squats', desc: '3 sets × 20 reps', duration: '5 min' }, { name: 'Lunges', desc: 'Alternating legs, 3 sets × 10', duration: '5 min' }],
        cardio:      [{ name: 'Jumping Jacks', desc: '3 sets × 30 reps', duration: '4 min' }, { name: 'High Knees', desc: 'Sprint in place, 30 seconds', duration: '3 min' }, { name: 'Burpees', desc: '3 sets × 10 reps', duration: '5 min' }],
        flexibility: [{ name: 'Hamstring Stretch', desc: 'Sit and reach, hold 30s', duration: '3 min' }, { name: 'Hip Flexor Stretch', desc: 'Lunge position, lean forward', duration: '2 min' }, { name: 'Shoulder Circles', desc: 'Roll forward and back, 10 each', duration: '2 min' }],
        yoga:        [{ name: 'Surya Namaskar', desc: '5 rounds of sun salutation', duration: '10 min' }, { name: 'Downward Dog', desc: 'Hold for 30 seconds, 3 sets', duration: '3 min' }, { name: 'Warrior I & II', desc: 'Hold each pose 30 seconds', duration: '5 min' }],
        warmup:      [{ name: 'Neck Rolls', desc: 'Slow circles, 5 each direction', duration: '1 min' }, { name: 'Arm Swings', desc: 'Cross-body swings, 10 reps', duration: '1 min' }, { name: 'Leg Swings', desc: 'Forward/back swings, 10 each', duration: '2 min' }],
        cooldown:    [{ name: 'Walk & Breathe', desc: 'Slow walk for 5 minutes', duration: '5 min' }, { name: 'Standing Quad Stretch', desc: 'Hold ankle, 30s each side', duration: '2 min' }, { name: 'Child\'s Pose', desc: 'Rest and breathe, 60 seconds', duration: '1 min' }],
    };
    return map[categoryId] || [];
}

const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.bg },
    topbar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
    back:       { color: C.cyan, fontSize: 16, fontWeight: '700' },
    title:      { fontSize: 18, fontWeight: '900', color: C.text },

    // Tabs
    tabBar:     { flexDirection: 'row', backgroundColor: C.surf, marginHorizontal: 16, borderRadius: 12, padding: 3, marginBottom: 8 },
    tab:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    tabActive:  { backgroundColor: C.cyan },
    tabText:    { fontSize: 13, fontWeight: '800', color: C.muted },
    tabTextActive:{ color: C.bg },

    // Grid
    grid:       { padding: 16, paddingBottom: 30 },
    catCard:    { width: CARD_W, backgroundColor: C.surf, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    catIconWrap:{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    catEmoji:   { fontSize: 32 },
    catLabel:   { fontSize: 12, fontWeight: '800', color: C.text, textAlign: 'center' },
    aiTag:      { backgroundColor: C.cyan + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
    aiTagText:  { fontSize: 9, color: C.cyan, fontWeight: '800' },

    // Detail view
    detailContent: { padding: 20, paddingBottom: 40 },
    categoryHero:  { borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 20 },
    heroEmoji:     { fontSize: 52, marginBottom: 8 },
    heroTitle:     { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 4 },
    heroSub:       { fontSize: 12, color: C.muted },

    exerciseList:  { backgroundColor: C.surf, borderRadius: 16, padding: 16, marginBottom: 16, gap: 14, borderWidth: 1, borderColor: C.border },
    exerciseItem:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    exerciseDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan },
    exerciseName:  { fontSize: 13, fontWeight: '700', color: C.text },
    exerciseDesc:  { fontSize: 11, color: C.muted, marginTop: 2 },
    exerciseDuration:{ fontSize: 11, color: C.cyan, fontWeight: '800' },

    aiBtn:         { backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)', marginBottom: 14 },
    aiBtnIcon:     { fontSize: 28 },
    aiBtnTitle:    { fontSize: 14, fontWeight: '800', color: C.cyan },
    aiBtnSub:      { fontSize: 11, color: C.muted, marginTop: 2 },

    startBtn:      { backgroundColor: C.cyan, borderRadius: 16, padding: 18, alignItems: 'center' },
    startBtnText:  { fontSize: 15, fontWeight: '900', color: C.bg },
});
