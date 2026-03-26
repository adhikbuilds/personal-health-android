// LearnSportsScreen — Full Sports Library
// View A: 18-sport grid
// View B: Video gallery for selected sport (passed as route.params.sport)
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, FlatList, Linking, Dimensions,
} from 'react-native';
import { C } from '../styles/colors';
import { SPORTS_LIBRARY } from '../data/constants';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

// ─── Sport Grid Card ──────────────────────────────────────────────────────────
function SportCard({ sport, onPress }) {
    return (
        <TouchableOpacity style={[sg.sportCard, { borderColor: sport.color + '40' }]} onPress={() => onPress(sport)} activeOpacity={0.82}>
            <View style={[sg.sportIconWrap, { backgroundColor: sport.color + '18' }]}>
                <Text style={sg.sportEmoji}>{sport.emoji}</Text>
            </View>
            <Text style={sg.sportName}>{sport.name}</Text>
            <Text style={sg.sportCount}>{sport.videoCount} videos</Text>
        </TouchableOpacity>
    );
}

// ─── Video Thumbnail Card ─────────────────────────────────────────────────────
function VideoCard({ video, sport, onPress }) {
    return (
        <TouchableOpacity style={[vg.videoCard, { borderColor: sport.color + '30' }]} onPress={() => onPress(video)} activeOpacity={0.85}>
            <View style={[vg.thumb, { backgroundColor: sport.color + '20' }]}>
                <Text style={vg.thumbEmoji}>{sport.emoji}</Text>
                <View style={vg.playBtn}>
                    <Text style={vg.playIcon}>▶</Text>
                </View>
                <View style={[vg.durationBadge, { backgroundColor: sport.color }]}>
                    <Text style={vg.durationText}>{video.duration}</Text>
                </View>
                <TouchableOpacity style={vg.starBtn}>
                    <Text style={{ fontSize: 14 }}>☆</Text>
                </TouchableOpacity>
            </View>
            <Text style={vg.videoTitle} numberOfLines={2}>{video.title}</Text>
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LearnSportsScreen({ navigation, route }) {
    const selectedSport = route?.params?.sport || null;
    const [viewingSport, setViewingSport] = useState(selectedSport);

    const handleSportPress = (sport) => {
        setViewingSport(sport);
    };

    const handleVideoPress = (video) => {
        if (video.youtubeId) {
            Linking.openURL(`https://www.youtube.com/watch?v=${video.youtubeId}`).catch(() => {});
        }
    };

    // ── Sport Grid View ────────────────────────────────────────────────────
    if (!viewingSport) {
        return (
            <SafeAreaView style={sg.safe}>
                <View style={sg.topbar}>
                    <TouchableOpacity style={sg.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={sg.backText}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={sg.title}>Learn Sports</Text>
                    <View style={{ width: 60 }} />
                </View>
                <FlatList
                    data={SPORTS_LIBRARY}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={sg.grid}
                    columnWrapperStyle={{ gap: 12 }}
                    renderItem={({ item }) => (
                        <SportCard sport={item} onPress={handleSportPress} />
                    )}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        );
    }

    // ── Video Gallery View ─────────────────────────────────────────────────
    const videos = viewingSport.videos || generateMockVideos(viewingSport);

    return (
        <SafeAreaView style={sg.safe}>
            <View style={sg.topbar}>
                <TouchableOpacity style={sg.backBtn} onPress={() => setViewingSport(null)}>
                    <Text style={sg.backText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={sg.title}>{viewingSport.name}</Text>
                <View style={[sg.countBadge, { backgroundColor: viewingSport.color + '20' }]}>
                    <Text style={[sg.countText, { color: viewingSport.color }]}>
                        {viewingSport.videoCount} videos
                    </Text>
                </View>
            </View>

            <FlatList
                data={videos}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={sg.grid}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                    <VideoCard video={item} sport={viewingSport} onPress={handleVideoPress} />
                )}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// Generate placeholder videos for sports without real data
function generateMockVideos(sport) {
    const titles = [
        `${sport.name} — Basics & Fundamentals`,
        `${sport.name} — Beginner Techniques`,
        `${sport.name} — Intermediate Skills`,
        `${sport.name} — Advanced Drills`,
        `${sport.name} — Fitness & Conditioning`,
        `${sport.name} — Match Strategy`,
        `${sport.name} — Common Mistakes`,
        `${sport.name} — Pro Tips`,
    ];
    return titles.map((title, i) => ({
        id: `${sport.id}_v${i + 1}`,
        title,
        duration: `${Math.floor(Math.random() * 8) + 2}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        youtubeId: null,
    }));
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sg = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: C.bg },
    topbar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
    backBtn:   { padding: 4 },
    backText:  { color: C.cyan, fontSize: 16, fontWeight: '700' },
    title:     { fontSize: 18, fontWeight: '900', color: C.text },
    countBadge:{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { fontSize: 11, fontWeight: '800' },
    grid:      { padding: 16, paddingBottom: 30 },

    // Sport cards
    sportCard:   { width: CARD_W, backgroundColor: C.surf, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1 },
    sportIconWrap:{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    sportEmoji:  { fontSize: 32 },
    sportName:   { fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 4 },
    sportCount:  { fontSize: 10, color: C.muted, fontWeight: '600' },
});

const vg = StyleSheet.create({
    videoCard:  { width: CARD_W, backgroundColor: C.surf, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    thumb:      { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    thumbEmoji: { fontSize: 40, opacity: 0.5 },
    playBtn:    { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    playIcon:   { color: '#fff', fontSize: 14, marginLeft: 2 },
    durationBadge: { position: 'absolute', bottom: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    durationText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
    starBtn:       { position: 'absolute', bottom: 6, right: 6 },
    videoTitle: { fontSize: 11, color: C.textSub, fontWeight: '600', padding: 8, lineHeight: 15 },
});
