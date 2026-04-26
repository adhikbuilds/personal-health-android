// AcademyScreen — Strava-clean rewrite
// Sports library directory · single orange accent · no rainbow palette.

import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, FlatList, TextInput, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPORTS_LIBRARY } from '../../data/constants';

// ─── Strava palette ─────────────────────────
const ORANGE = '#FC4C02';
const DARK   = '#242428';
const GRAY   = '#6D6D78';
const DIM    = '#9CA3AF';
const LIGHT  = '#F7F7FA';
const BORDER = '#E6E6EA';
const BG     = '#FFFFFF';

const CATEGORIES = ['All', 'team', 'court', 'combat', 'track', 'aquatic', 'precision'];
const CAT_LABELS = { All: 'All', team: 'Team', court: 'Court', combat: 'Combat', track: 'Track', aquatic: 'Aquatic', precision: 'Precision' };

function SportTile({ sport, onPress }) {
    return (
        <TouchableOpacity style={st.tile} activeOpacity={0.7} onPress={() => onPress(sport)}>
            <View style={st.iconWrap}>
                <Text style={st.emoji}>{sport.emoji}</Text>
            </View>
            <Text style={st.name} numberOfLines={1}>{sport.name}</Text>
            <Text style={st.count}>{sport.videoCount} videos</Text>
        </TouchableOpacity>
    );
}

export default function AcademyScreen({ navigation }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const filtered = (activeCategory === 'All'
        ? SPORTS_LIBRARY
        : SPORTS_LIBRARY.filter((sp) => sp.category === activeCategory)
    ).filter((sp) => !searchQuery || sp.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSportPress = (sport) => {
        navigation.navigate('LearnSports', { sport });
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" />

            {/* Top bar */}
            <View style={s.topbar}>
                <View>
                    <Text style={s.eyebrow}>BROWSE BY SPORT</Text>
                    <Text style={s.title}>Sports Academy</Text>
                </View>
                <TouchableOpacity
                    style={s.searchBtn}
                    onPress={() => { setShowSearch((v) => !v); setSearchQuery(''); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name={showSearch ? 'close' : 'search'} size={18} color={DARK} />
                </TouchableOpacity>
            </View>

            {showSearch && (
                <TextInput
                    style={s.searchInput}
                    placeholder="Search sports..."
                    placeholderTextColor={DIM}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
            )}

            {/* Category pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.catScroll}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[s.catChip, activeCategory === cat && s.catChipActive]}
                        onPress={() => setActiveCategory(cat)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.catChipText, activeCategory === cat && s.catChipTextActive]}>
                            {CAT_LABELS[cat]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Sport grid */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={s.grid}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                    <SportTile sport={item} onPress={handleSportPress} />
                )}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => (
                    <View style={s.footer}>
                        <Text style={s.footerText}>More sports & drills unlocking soon</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    topbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
    title: { fontSize: 22, fontWeight: '800', color: DARK, marginTop: 2, letterSpacing: -0.5 },
    searchBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },

    searchInput: {
        marginHorizontal: 20,
        backgroundColor: LIGHT,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: DARK,
        fontSize: 14,
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 8,
    },

    // Category pills (Strava-style underline-on-active is tricky for pills, use filled)
    catScroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    catChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 50,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
    },
    catChipActive: { backgroundColor: DARK, borderColor: DARK },
    catChipText: { fontSize: 12, fontWeight: '700', color: GRAY, letterSpacing: 0.3 },
    catChipTextActive: { color: '#fff' },

    grid: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },

    footer: {
        marginTop: 16,
        backgroundColor: LIGHT,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
        borderStyle: 'dashed',
    },
    footerText: { fontSize: 12, color: GRAY, fontWeight: '600' },
});

const st = StyleSheet.create({
    tile: {
        flex: 1,
        backgroundColor: BG,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 8,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emoji: { fontSize: 24 },
    name: { fontSize: 12, fontWeight: '700', color: DARK, textAlign: 'center', marginBottom: 2 },
    count: { fontSize: 9, color: GRAY, fontWeight: '600', letterSpacing: 0.3 },
});
