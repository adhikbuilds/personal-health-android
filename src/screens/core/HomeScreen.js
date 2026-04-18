// HomeScreen — Production v3
// Full redesign: Fitness Score card, Daily Tracker, Content Grid,
// AI Trainer banner, Featured banners, Influencer section
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import api from '../../services/api';
import { C } from '../../styles/colors';
import StatCard from '../../components/StatCard';
import InsightCard from '../../components/InsightCard';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';
import {
    DAILY_TRACKER_DEFAULTS,
    HOME_CONTENT_GRID,
    FEATURED_BANNERS,
    TRENDING_CREATORS,
} from '../../data/constants';

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
    const [unreadCount, setUnreadCount] = useState(0);
    const [wellnessScore, setWellnessScore] = useState(null);  // WN-24
    const [waterModalVisible, setWaterModalVisible] = useState(false);  // WN-25

    // WN-24: Load wellness score on mount
    useEffect(() => {
        getOrCreateAnonymousAthleteId().then(id => {
            api.get(`/athlete/${id}/wellness/score`).then(data => {
                if (data) setWellnessScore(data);
            }).catch(() => {});
        }).catch(() => {});
    }, []);

    // Load daily tracker from cache
    useEffect(() => {
        AsyncStorage.getItem(TODAY_KEY).then(raw => {
            if (raw) { try { setTracker(JSON.parse(raw)); } catch (_) {} }
        });
        api.ping().then(ok => setApiStatus(ok ? 'online' : 'offline'));
        api.getTrendingCreators().then(data => {
            const arr = Array.isArray(data) ? data : data?.creators;
            if (arr?.length) setCreators(arr);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            getOrCreateAnonymousAthleteId().then(id => {
                api.getNotifications(id, true).then(data => {
                    if (data) setUnreadCount(data.unread_count || 0);
                });
            }).catch(() => {});
        }, [])
    );

    // Persist tracker changes to AsyncStorage
    useEffect(() => {
        AsyncStorage.setItem(TODAY_KEY, JSON.stringify(tracker)).catch(() => {});
    }, [tracker]);

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
                            <TouchableOpacity style={sc.headerIcon} onPress={() => navigation.jumpTo('Camera')}>
                                <Text style={{ fontSize: 18 }}>🎙️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={sc.headerIcon}
                                onPress={() => navigation.navigate('Notifications')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="notifications-outline" size={24} color={C.muted} />
                                {unreadCount > 0 && <View style={sc.notifBadge} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Fitness Score Card */}
                    <FitnessScoreCard fitnessScore={fitnessScore} streak={streak} />

                    {/* WN-24: Wellness Score Widget */}
                    <TouchableOpacity
                        style={sc.wellnessWidget}
                        onPress={async () => {
                            const id = await getOrCreateAnonymousAthleteId().catch(() => 'athlete_01');
                            navigation.navigate('Wellness', { athleteId: id });
                        }}
                        activeOpacity={0.82}
                    >
                        {wellnessScore?.wellness_score != null ? (
                            <View style={sc.wellnessWidgetInner}>
                                <View style={[sc.wellnessCircle, {
                                    borderColor: wellnessScore.wellness_score >= 70 ? C.green : (wellnessScore.wellness_score >= 50 ? C.yellow : C.red),
                                }]}>
                                    <Text style={[sc.wellnessNum, {
                                        color: wellnessScore.wellness_score >= 70 ? C.green : (wellnessScore.wellness_score >= 50 ? C.yellow : C.red),
                                    }]}>{wellnessScore.wellness_score}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={sc.wellnessTitle}>Wellness Score</Text>
                                    <Text style={sc.wellnessSub}>{wellnessScore.recovery_ready ? 'Ready to Train' : 'Recovery Needed'}</Text>
                                </View>
                                <Text style={sc.wellnessChevron}>›</Text>
                            </View>
                        ) : (
                            <View style={sc.wellnessWidgetInner}>
                                <Text style={sc.wellnessEmpty}>Log your morning check-in →</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </LinearGradient>

                {/* PH-V2-A-05: Premium 2x2 KPI grid using StatCard */}
                <View style={sc.section}>
                    <Text style={sc.sectionTitle}>TODAY'S SNAPSHOT</Text>
                    <View style={sc.statGrid}>
                        <View style={sc.statGridItem}>
                            <StatCard
                                label="BPI"
                                value={user?.bpi?.toLocaleString() || '0'}
                                icon="trending-up"
                                color="brand"
                            />
                        </View>
                        <View style={sc.statGridItem}>
                            <StatCard
                                label="Sessions"
                                value={user?.sessions || '0'}
                                icon="calendar"
                                color="info"
                            />
                        </View>
                        <View style={sc.statGridItem}>
                            <StatCard
                                label="Form Score"
                                value={fitnessScore?.score || '—'}
                                icon="pulse"
                                color="pb"
                            />
                        </View>
                        <View style={sc.statGridItem}>
                            <StatCard
                                label="Streak"
                                value={`${streak}d`}
                                icon="flame"
                                color="caution"
                            />
                        </View>
                    </View>
                </View>

                {/* PH-V2-A-05: Optional InsightCard surface */}
                {fitnessScore?.score >= 75 && (
                    <View style={sc.section}>
                        <InsightCard
                            type="success"
                            title="Strong Form Today"
                            message={`Your form score of ${fitnessScore.score} puts you in the top tier. Keep this consistency through the week.`}
                        />
                    </View>
                )}
                {fitnessScore?.score > 0 && fitnessScore?.score < 55 && (
                    <View style={sc.section}>
                        <InsightCard
                            type="caution"
                            title="Form Needs Attention"
                            message="Your recent sessions show room for improvement. Consider reviewing fundamentals before your next hard session."
                        />
                    </View>
                )}

                {/* ── Daily Tracker ── */}
                <View style={sc.section}>
                    <View style={sc.sectionHeader}>
                        <Text style={sc.sectionTitle}>MY DAILY TRACKER</Text>
                        <TouchableOpacity onPress={() => showToast('Customise Plan coming soon!')}>
                            <Text style={sc.customiseBtn}>Customise Plan ›</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={sc.trackerCard}>
                        {trackerItems.map((item, i) => {
                            const isWater = item.label?.toLowerCase().includes('water') || item.label?.toLowerCase().includes('hydra');
                            return isWater ? (
                                <TouchableOpacity key={i} onPress={() => setWaterModalVisible(true)} activeOpacity={0.8}>
                                    <TrackerRow icon={item.icon} label={item.label} current={item.current} goal={item.goal} unit={item.unit} />
                                </TouchableOpacity>
                            ) : (
                                <TrackerRow key={i} icon={item.icon} label={item.label} current={item.current} goal={item.goal} unit={item.unit} />
                            );
                        })}
                    </View>

                    {/* WN-25: Hydration Quick-Log bottom sheet */}
                    <Modal visible={waterModalVisible} transparent animationType="slide" onRequestClose={() => setWaterModalVisible(false)}>
                        <TouchableOpacity style={sc.modalOverlay} activeOpacity={1} onPress={() => setWaterModalVisible(false)}>
                            <View style={sc.bottomSheet}>
                                <Text style={sc.bsTitle}>Log Water Intake</Text>
                                <Text style={sc.bsSub}>Tap to add to today's intake</Text>
                                <View style={sc.bsRow}>
                                    {[250, 500, 1000].map(ml => (
                                        <TouchableOpacity key={ml} style={sc.bsBtn} onPress={async () => {
                                            const waterItem = trackerItems.find(it => it.label?.toLowerCase().includes('water') || it.label?.toLowerCase().includes('hydra'));
                                            const current = waterItem?.current || 0;
                                            const updated = current + ml;
                                            setTracker(t => {
                                                const keys = Object.keys(t);
                                                const waterKey = keys.find(k => t[k].label?.toLowerCase().includes('water') || t[k].label?.toLowerCase().includes('hydra'));
                                                if (!waterKey) return t;
                                                return { ...t, [waterKey]: { ...t[waterKey], current: updated } };
                                            });
                                            setWaterModalVisible(false);
                                            try {
                                                const id = await getOrCreateAnonymousAthleteId();
                                                await api.post(`/athlete/${id}/wellness`, { hydration: { water_ml: updated } });
                                            } catch (_) {}
                                        }}>
                                            <Text style={sc.bsBtnText}>+{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity style={sc.bsClose} onPress={() => setWaterModalVisible(false)}>
                                    <Text style={{ color: C.muted }}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
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
                    <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('DrillPicker')}>
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
    notifBadge:    { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#06b6d4', borderWidth: 1.5, borderColor: '#1a1040' },

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

    // PH-V2-A-05: 2x2 stat grid
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    statGridItem: {
        width: '50%',
        paddingHorizontal: 6,
        paddingBottom: 12,
    },
    // WN-24: Wellness widget
    wellnessWidget: { marginHorizontal: 16, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    wellnessWidgetInner: { flexDirection: 'row', alignItems: 'center' },
    wellnessCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    wellnessNum: { fontSize: 14, fontWeight: '800' },
    wellnessTitle: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
    wellnessSub: { color: '#64748b', fontSize: 11, marginTop: 1 },
    wellnessChevron: { color: '#64748b', fontSize: 22, marginLeft: 8 },
    wellnessEmpty: { color: '#06b6d4', fontSize: 13, fontWeight: '500' },
    // WN-25: Hydration modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: C.surf, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    bsTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    bsSub: { color: C.muted, fontSize: 12, marginBottom: 16 },
    bsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    bsBtn: { flex: 1, backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    bsBtnText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
    bsClose: { alignItems: 'center', padding: 8 },
});
