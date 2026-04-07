// HomeScreen — Production v3
// Full redesign: Fitness Score card, Daily Tracker, Content Grid,
// AI Trainer banner, Featured banners, Influencer section
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { C } from '../styles/colors';
import {
    DAILY_TRACKER_DEFAULTS,
    HOME_CONTENT_GRID,
    FEATURED_BANNERS,
    TRENDING_CREATORS,
} from '../data/constants';

const { width: SW } = Dimensions.get('window');
const TODAY_KEY = `@daily_tracker_${new Date().toISOString().slice(0, 10)}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FitnessScoreCard({ fitnessScore, streak }) {
    const level     = fitnessScore?.level || 0;
    const score     = fitnessScore?.score || 0;
    const label     = fitnessScore?.label || 'Not Tested';
    const bandColor = fitnessScore?.color || C.muted;

    return (
        <View style={sc.scoreCard}>
            <View style={sc.scoreLeft}>
                <Text style={sc.scoreTitle}>My Fitness</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                    <Text style={[sc.scorePts, { color: bandColor }]}>{score}</Text>
                    <Text style={sc.scorePtsSuffix}> pts</Text>
                </View>
                <View style={[sc.levelBadge, { backgroundColor: bandColor + '25', borderColor: bandColor + '60' }]}>
                    <Text style={[sc.levelText, { color: bandColor }]}>
                        {level > 0 ? `L${level} · ${label}` : 'Take Fitness Test →'}
                    </Text>
                </View>
            </View>
            <View style={sc.scoreRight}>
                <View style={[sc.ring, { borderColor: bandColor + '60' }]}>
                    <Text style={[sc.ringNum, { color: bandColor }]}>{level > 0 ? `L${level}` : '—'}</Text>
                </View>
                <View style={sc.streakPill}>
                    <Text style={sc.streakText}>🔥 {streak}d</Text>
                </View>
            </View>
        </View>
    );
}

function TrackerRow({ icon, label, current, goal, unit }) {
    const pct = goal > 0 ? Math.min(1, current / goal) : 0;
    const isOver = current >= goal;
    const barColor = isOver ? C.green : C.cyan;

    return (
        <View style={sc.trackerRow}>
            <Text style={sc.trackerIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <View style={sc.trackerLabelRow}>
                    <Text style={sc.trackerLabel}>{label}</Text>
                    <Text style={[sc.trackerVal, { color: isOver ? C.green : C.text }]}>
                        {typeof current === 'number' && current % 1 !== 0
                            ? current.toFixed(2)
                            : current
                        }
                        <Text style={sc.trackerUnit}> / {goal} {unit}</Text>
                    </Text>
                </View>
                <View style={sc.trackerBarBg}>
                    <View style={[sc.trackerBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                </View>
            </View>
        </View>
    );
}

function ContentTile({ item, onPress }) {
    return (
        <TouchableOpacity style={sc.tile} onPress={() => onPress(item)} activeOpacity={0.82}>
            <View style={[sc.tileIcon, { backgroundColor: item.color + '22' }]}>
                <Text style={sc.tileEmoji}>{item.emoji}</Text>
            </View>
            <Text style={sc.tileLabel}>{item.label}</Text>
        </TouchableOpacity>
    );
}

function FeaturedBanner({ banner, onPress }) {
    return (
        <TouchableOpacity
            style={sc.bannerWrap}
            activeOpacity={0.85}
            onPress={() => banner.route && onPress(banner.route)}
        >
            <LinearGradient colors={banner.colors} style={sc.bannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {banner.badge && (
                    <View style={sc.bannerBadge}>
                        <Text style={sc.bannerBadgeText}>{banner.badge}</Text>
                    </View>
                )}
                <Text style={sc.bannerTitle}>{banner.title}</Text>
                <Text style={sc.bannerSub}>{banner.subtitle}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

function CreatorCard({ creator, followed, onFollow }) {
    return (
        <View style={sc.creatorCard}>
            <View style={[sc.creatorAvatar, { backgroundColor: creator.color }]}>
                <Text style={sc.creatorInitials}>{creator.initials}</Text>
            </View>
            <Text style={sc.creatorName} numberOfLines={1}>{creator.name}</Text>
            <Text style={sc.creatorHandle} numberOfLines={1}>{creator.handle}</Text>
            <TouchableOpacity
                style={[sc.followBtn, followed && sc.followBtnActive]}
                onPress={() => onFollow(creator.id)}
                activeOpacity={0.8}
            >
                <Text style={[sc.followBtnText, followed && { color: C.bg }]}>
                    {followed ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, showToast }) {
    const { userData, fitnessScore } = useUser();
    const { name, level, xp, xpRequired, streak } = userData;

    const [apiStatus, setApiStatus]   = useState('checking');
    const [tracker, setTracker]       = useState(DAILY_TRACKER_DEFAULTS);
    const [followed, setFollowed]     = useState({});
    const [creators, setCreators]     = useState(TRENDING_CREATORS);

    // Load daily tracker from cache
    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then(raw => {
            if (raw) { try { setTracker(JSON.parse(raw)); } catch (_) {} }
        });
        api.ping().then(ok => setApiStatus(ok ? 'online' : 'offline'));
        api.getTrendingCreators().then(data => { if (data?.length) setCreators(data); });
    }, []);

    const handleTilePress = useCallback((item) => {
        if (!item.route) {
            showToast('Coming soon!');
            return;
        }
        if (item.routeParams) {
            navigation.navigate(item.route, item.routeParams);
        } else {
            navigation.navigate(item.route);
        }
    }, [navigation, showToast]);

    const handleFollow = useCallback((creatorId) => {
        setFollowed(prev => ({ ...prev, [creatorId]: !prev[creatorId] }));
    }, []);

    const trackerItems = Object.values(tracker);

    return (
        <SafeAreaView style={sc.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

                {/* ── Header ── */}
                <LinearGradient colors={['#1a1040', '#0f172a']} style={sc.header}>
                    {/* API status */}
                    <View style={[sc.apiBadge, {
                        backgroundColor: apiStatus === 'online' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        borderColor:     apiStatus === 'online' ? 'rgba(34,197,94,0.3)'  : 'rgba(239,68,68,0.3)',
                    }]}>
                        <View style={[sc.apiDot, { backgroundColor: apiStatus === 'online' ? C.green : apiStatus === 'checking' ? C.yellow : C.red }]} />
                        <Text style={[sc.apiText, { color: apiStatus === 'online' ? C.green : apiStatus === 'checking' ? C.yellow : C.red }]}>
                            {apiStatus === 'checking' ? 'Connecting…' : apiStatus === 'online' ? 'AI Server Online' : 'Offline Mode'}
                        </Text>
                    </View>

                    {/* Greeting row */}
                    <View style={sc.greetRow}>
                        <View>
                            <Text style={sc.greeting}>Hi, {name.split(' ')[0]} 👋</Text>
                            <Text style={sc.greetSub}>Level {level} · {xp.toLocaleString()} XP</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={sc.headerIcon} onPress={() => navigation.navigate('FitnessTest')}>
                                <Text style={{ fontSize: 18 }}>🏆</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={sc.headerIcon} onPress={() => navigation.navigate('Camera')}>
                                <Text style={{ fontSize: 18 }}>🎙️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Fitness Score Card */}
                    <FitnessScoreCard fitnessScore={fitnessScore} streak={streak} />
                </LinearGradient>

                {/* ── Daily Tracker ── */}
                <View style={sc.section}>
                    <View style={sc.sectionHeader}>
                        <Text style={sc.sectionTitle}>MY DAILY TRACKER</Text>
                        <TouchableOpacity>
                            <Text style={sc.customiseBtn}>Customise Plan ›</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={sc.trackerCard}>
                        {trackerItems.map((item, i) => (
                            <TrackerRow
                                key={i}
                                icon={item.icon}
                                label={item.label}
                                current={item.current}
                                goal={item.goal}
                                unit={item.unit}
                            />
                        ))}
                    </View>
                </View>

                {/* ── Content Grid ── */}
                <View style={sc.section}>
                    <Text style={sc.sectionTitle}>EXPLORE</Text>
                    <View style={sc.grid}>
                        {HOME_CONTENT_GRID.map(item => (
                            <ContentTile key={item.id} item={item} onPress={handleTilePress} />
                        ))}
                    </View>
                </View>

                {/* ── AI Trainer Banner ── */}
                <View style={[sc.section, { paddingBottom: 0 }]}>
                    <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('Camera')}>
                        <LinearGradient
                            colors={['#312e81', '#0e7490']}
                            style={sc.aiTrainerBanner}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View>
                                <View style={sc.aiTag}>
                                    <Text style={sc.aiTagText}>🤖 AI TRAINER</Text>
                                </View>
                                <Text style={sc.aiTitle}>Real-time Biomechanics</Text>
                                <Text style={sc.aiSub}>Analyse your form with MediaPipe AI</Text>
                            </View>
                            <View style={sc.aiBtn}>
                                <Text style={sc.aiBtnText}>Start →</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── Featured Banners ── */}
                <View style={sc.section}>
                    <Text style={sc.sectionTitle}>FEATURED</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {FEATURED_BANNERS.map(banner => (
                            <FeaturedBanner
                                key={banner.id}
                                banner={banner}
                                onPress={(route) => navigation.navigate(route)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ── Trending Creators / Influencers ── */}
                <View style={sc.section}>
                    <View style={sc.sectionHeader}>
                        <Text style={sc.sectionTitle}>INFLUENCER</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SocialFeed')}>
                            <Text style={sc.customiseBtn}>See All ›</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {creators.map(c => (
                            <CreatorCard
                                key={c.id}
                                creator={c}
                                followed={!!followed[c.id]}
                                onFollow={handleFollow}
                            />
                        ))}
                    </ScrollView>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
    safe:          { flex: 1, backgroundColor: C.bg },
    header:        { padding: 20, paddingTop: 14, paddingBottom: 24 },

    // API badge
    apiBadge:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginBottom: 16 },
    apiDot:        { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    apiText:       { fontSize: 10, fontWeight: '700' },

    // Greeting
    greetRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    greeting:      { fontSize: 22, fontWeight: '900', color: C.text },
    greetSub:      { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '600' },
    headerIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

    // Fitness Score Card
    scoreCard:     { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.border2 },
    scoreLeft:     { flex: 1 },
    scoreTitle:    { fontSize: 11, color: C.muted, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    scorePts:      { fontSize: 36, fontWeight: '900' },
    scorePtsSuffix:{ fontSize: 14, color: C.muted, fontWeight: '600' },
    levelBadge:    { alignSelf: 'flex-start', marginTop: 8, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    levelText:     { fontSize: 11, fontWeight: '800' },
    scoreRight:    { alignItems: 'center', gap: 10 },
    ring:          { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
    ringNum:       { fontSize: 18, fontWeight: '900' },
    streakPill:    { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
    streakText:    { color: C.orange, fontSize: 11, fontWeight: '800' },

    // Sections
    section:       { padding: 20, paddingBottom: 0 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle:  { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase' },
    customiseBtn:  { fontSize: 11, color: C.cyan, fontWeight: '700' },

    // Daily Tracker
    trackerCard:   { backgroundColor: C.surf, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border },
    trackerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    trackerIcon:   { fontSize: 18, width: 30, textAlign: 'center', marginRight: 10 },
    trackerLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    trackerLabel:  { fontSize: 11, color: C.muted, fontWeight: '600' },
    trackerVal:    { fontSize: 11, fontWeight: '800' },
    trackerUnit:   { fontSize: 10, color: C.muted, fontWeight: '600' },
    trackerBarBg:  { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
    trackerBarFill:{ height: '100%', borderRadius: 99 },

    // Content Grid
    grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    tile:          { width: (SW - 56) / 4, alignItems: 'center', marginBottom: 4 },
    tileIcon:      { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    tileEmoji:     { fontSize: 26 },
    tileLabel:     { fontSize: 9, color: C.textSub, fontWeight: '700', textAlign: 'center', lineHeight: 12 },

    // AI Trainer banner
    aiTrainerBanner: { borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    aiTag:           { backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
    aiTagText:       { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 1 },
    aiTitle:         { fontSize: 16, fontWeight: '900', color: '#fff' },
    aiSub:           { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
    aiBtn:           { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    aiBtnText:       { color: '#fff', fontWeight: '900', fontSize: 13 },

    // Featured banners
    bannerWrap:    { width: SW * 0.72, borderRadius: 16, overflow: 'hidden' },
    bannerGrad:    { padding: 16, minHeight: 90, justifyContent: 'space-between' },
    bannerBadge:   { backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
    bannerBadgeText:{ fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 1 },
    bannerTitle:   { fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 18 },
    bannerSub:     { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

    // Creator cards
    creatorCard:   { width: 110, backgroundColor: C.surf, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    creatorAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    creatorInitials:{ color: '#fff', fontWeight: '900', fontSize: 18 },
    creatorName:   { fontSize: 10, color: C.text, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
    creatorHandle: { fontSize: 9, color: C.muted, textAlign: 'center', marginBottom: 8 },
    followBtn:     { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.4)' },
    followBtnActive:{ backgroundColor: C.orange },
    followBtnText: { fontSize: 10, color: C.orange, fontWeight: '800' },
});
