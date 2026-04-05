// AcademyScreen — Sports Academy Directory
// Entry point to the full 18-sport library.
// Tapping a sport navigates to LearnSportsScreen with that sport's video gallery.
import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, FlatList, Dimensions, TextInput,
} from 'react-native';
import { C } from '../styles/colors';
import { SPORTS_LIBRARY, SPORTS_ACADEMY } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const CATEGORIES = ['All', 'team', 'court', 'combat', 'track', 'aquatic', 'precision'];
const CAT_LABELS  = { All: 'All', team: 'Team', court: 'Court', combat: 'Combat', track: 'Track', aquatic: 'Aquatic', precision: 'Precision' };

function SportTile({ sport, onPress }) {
    return (
        <TouchableOpacity style={[st.tile, { borderColor: sport.color + '35' }]} onPress={() => onPress(sport)} activeOpacity={0.82}>
            <View style={[st.iconWrap, { backgroundColor: sport.color + '18' }]}>
                <Text style={st.emoji}>{sport.emoji}</Text>
            </View>
            <Text style={st.name} numberOfLines={1}>{sport.name}</Text>
            <Text style={st.count}>{sport.videoCount} videos</Text>
        </TouchableOpacity>
    );
}

export default function AcademyScreen({ navigation, showToast }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const filtered = (activeCategory === 'All'
        ? SPORTS_LIBRARY
        : SPORTS_LIBRARY.filter(s => s.category === activeCategory)
    ).filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSportPress = (sport) => {
        navigation.navigate('LearnSports', { sport });
    };

    return (
        <SafeAreaView style={s.safe}>
            {/* Top bar */}
            <View style={s.topbar}>
                <Text style={s.title}>Sports Academy</Text>
                <TouchableOpacity style={s.searchBtn} onPress={() => { setShowSearch(v => !v); setSearchQuery(''); }}>
                    <Text style={{ fontSize: 18 }}>{showSearch ? '✕' : '🔍'}</Text>
                </TouchableOpacity>
            </View>

            {showSearch && (
                <TextInput
                    style={s.searchInput}
                    placeholder="Search sports..."
                    placeholderTextColor={C.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
            )}

            {/* Category filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.catScroll}
            >
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[s.catChip, activeCategory === cat && s.catChipActive]}
                        onPress={() => setActiveCategory(cat)}
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
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={s.grid}
                columnWrapperStyle={{ gap: 10 }}
                renderItem={({ item }) => (
                    <SportTile sport={item} onPress={handleSportPress} />
                )}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => (
                    <View style={s.footer}>
                        <Text style={s.footerText}>More sports and drills unlocking soon 🚀</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:          { flex: 1, backgroundColor: C.bg },
    topbar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, paddingBottom: 8 },
    title:         { fontSize: 20, fontWeight: '900', color: C.text },
    searchBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surf, alignItems: 'center', justifyContent: 'center' },
    searchInput:   { marginHorizontal: 16, backgroundColor: C.surf, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    catScroll:     { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    catChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: C.surf, borderWidth: 1, borderColor: C.border },
    catChipActive: { backgroundColor: C.cyan, borderColor: C.cyan },
    catChipText:   { fontSize: 12, fontWeight: '700', color: C.muted },
    catChipTextActive: { color: C.bg },
    grid:          { padding: 16, paddingTop: 8, paddingBottom: 30 },
    footer:        { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
    footerText:    { fontSize: 12, color: '#818cf8', fontWeight: '600', textAlign: 'center' },
});

const st = StyleSheet.create({
    tile:     { flex: 1, backgroundColor: C.surf, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, marginBottom: 10 },
    iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emoji:    { fontSize: 26 },
    name:     { fontSize: 11, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 3 },
    count:    { fontSize: 9, color: C.muted, fontWeight: '600' },
});
