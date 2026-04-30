// LearnSportsScreen — Video gallery for a selected sport
// Opened from AcademyScreen with route.params.sport pre-selected.
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView,
    TouchableOpacity, FlatList, Linking, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPORTS_LIBRARY } from '../../data/constants';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

const ORANGE = '#FC4C02';
const DARK   = '#242428';
const GRAY   = '#6D6D78';
const DIM    = '#9CA3AF';
const LIGHT  = '#F7F7FA';
const BORDER = '#E6E6EA';
const BG     = '#FFFFFF';

// ─── Video Thumbnail Card ─────────────────────────────────────────────────────
function VideoCard({ video, onPress }) {
    return (
        <TouchableOpacity style={vg.videoCard} onPress={() => onPress(video)} activeOpacity={0.85}>
            <View style={vg.thumb}>
                <Ionicons name="videocam-outline" size={32} color={DIM} />
                <View style={vg.playBtn}>
                    <Ionicons name="play" size={14} color="#fff" />
                </View>
                <View style={vg.durationBadge}>
                    <Text style={vg.durationText}>{video.duration}</Text>
                </View>
            </View>
            <Text style={vg.videoTitle} numberOfLines={2}>{video.title}</Text>
        </TouchableOpacity>
    );
}

export default function LearnSportsScreen({ navigation, route }) {
    const sport = route?.params?.sport || null;

    // If opened without a sport context, go back — Academy tab is the entry point
    if (!sport) {
        return (
            <SafeAreaView style={s.safe}>
                <StatusBar barStyle="dark-content" />
                <View style={s.topbar}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color={DARK} />
                    </TouchableOpacity>
                    <Text style={s.title}>Sports Library</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={s.empty}>
                    <Ionicons name="library-outline" size={36} color={DIM} />
                    <Text style={s.emptyText}>Browse sports from the Academy tab</Text>
                </View>
            </SafeAreaView>
        );
    }

    const videos = sport.videos || generateMockVideos(sport);

    const handleVideoPress = (video) => {
        if (video.youtubeId) {
            Linking.openURL(`https://www.youtube.com/watch?v=${video.youtubeId}`).catch(() => {});
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" />

            <View style={s.topbar}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color={DARK} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.eyebrow}>{sport.category?.toUpperCase() || 'SPORT'}</Text>
                    <Text style={s.title}>{sport.name}</Text>
                </View>
                <View style={s.countBadge}>
                    <Text style={s.countText}>{sport.videoCount} videos</Text>
                </View>
            </View>

            <FlatList
                data={videos}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={s.grid}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                    <VideoCard video={item} onPress={handleVideoPress} />
                )}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => (
                    <View style={s.footer}>
                        <Text style={s.footerText}>More drills & videos coming soon</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

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

const s = StyleSheet.create({
    safe:    { flex: 1, backgroundColor: BG },
    topbar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
    title:   { fontSize: 20, fontWeight: '800', color: DARK, letterSpacing: -0.4 },
    countBadge: { backgroundColor: LIGHT, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
    countText:  { fontSize: 11, fontWeight: '700', color: GRAY },
    grid:    { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 100 },
    empty:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 14, color: GRAY, fontWeight: '600' },
    footer:  { marginTop: 16, backgroundColor: LIGHT, borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed' },
    footerText: { fontSize: 12, color: GRAY, fontWeight: '600' },
});

const vg = StyleSheet.create({
    videoCard:  { width: CARD_W, backgroundColor: BG, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, marginBottom: 0 },
    thumb:      { width: '100%', height: 90, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    playBtn:    { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    durationBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: ORANGE, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
    durationText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
    videoTitle: { fontSize: 11, color: DARK, fontWeight: '600', padding: 8, lineHeight: 15 },
});
