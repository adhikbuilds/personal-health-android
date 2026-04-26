// HubScreen — Strava-clean rewrite
// Profile band · 3 tabs (Arena/Nutrition/Rank) · simple cards.
// Preserves useUser, api.getLeaderboard, NUTRITION_PLANS, PLAYFIELDS, modals.

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
    Modal, Pressable, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { NUTRITION_PLANS, PLAYFIELDS } from '../../data/constants';
import api from '../../services/api';

// ─── Strava palette ─────────────────────────
const ORANGE  = '#FC4C02';
const DARK    = '#242428';
const GRAY    = '#6D6D78';
const DIM     = '#9CA3AF';
const LIGHT   = '#F7F7FA';
const BORDER  = '#E6E6EA';
const BG      = '#FFFFFF';
const SUCCESS = '#16A34A';
const AMBER   = '#CA8A04';

const SECTIONS = ['Arena', 'Nutrition', 'Rank'];

const ARENA_CHALLENGES = [
    { id: 'a1', title: 'Vertical Jump Test',  desc: '3 attempts — best recorded',     reward: '200 XP', sport: 'VJ',     icon: 'trending-up-outline',   difficulty: 'Medium' },
    { id: 'a2', title: 'Agility T-Drill',     desc: 'Sprint through the T pattern',   reward: '150 XP', sport: 'Sprint', icon: 'flash-outline',         difficulty: 'Hard'   },
    { id: 'a3', title: 'Snatch Form Check',   desc: '30-second AI snatch analysis',   reward: '180 XP', sport: 'Snatch', icon: 'barbell-outline',       difficulty: 'Hard'   },
];

const TIME_SLOTS = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:00 PM', '6:00 PM', '7:00 PM'];

// ─── Sub-components ─────────────────────────

function ArenaCard({ challenge, onPress }) {
    const diffColor = challenge.difficulty === 'Hard' ? '#DC2626'
        : challenge.difficulty === 'Medium' ? AMBER : SUCCESS;
    return (
        <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
            <View style={s.cardHead}>
                <View style={s.iconCircle}>
                    <Ionicons name={challenge.icon} size={20} color={ORANGE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cardTitle}>{challenge.title}</Text>
                    <Text style={s.cardSub}>{challenge.desc}</Text>
                </View>
                <View style={[s.diffPill, { backgroundColor: diffColor + '15' }]}>
                    <Text style={[s.diffText, { color: diffColor }]}>{challenge.difficulty}</Text>
                </View>
            </View>
            <View style={s.cardFoot}>
                <Text style={s.cardSport}>{challenge.sport}</Text>
                <View style={s.rewardPill}>
                    <Ionicons name="ribbon-outline" size={11} color={DARK} />
                    <Text style={s.rewardText}>{challenge.reward}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function NutritionRow({ plan, onPress }) {
    return (
        <TouchableOpacity
            style={[s.card, plan.locked && { opacity: 0.45 }]}
            activeOpacity={0.7}
            onPress={() => !plan.locked && onPress(plan)}
            disabled={plan.locked}
        >
            <View style={s.cardHead}>
                <View style={s.iconCircle}>
                    <Ionicons name="restaurant-outline" size={20} color={ORANGE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cardTitle}>{plan.title}</Text>
                    <Text style={s.cardSub}>{plan.macros}</Text>
                </View>
                {plan.locked ? (
                    <Ionicons name="lock-closed-outline" size={16} color={DIM} />
                ) : (
                    <Ionicons name="chevron-forward" size={18} color={GRAY} />
                )}
            </View>
        </TouchableOpacity>
    );
}

function FieldRow({ field, onPress }) {
    return (
        <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => onPress(field)}>
            <View style={s.cardHead}>
                <View style={s.iconCircle}>
                    <Ionicons name="location-outline" size={20} color={ORANGE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cardTitle}>{field.name}</Text>
                    <Text style={s.cardSub}>{`${field.type} · ${field.distance}`}</Text>
                </View>
                <Text style={s.bookText}>BOOK →</Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Modals (kept simple, Strava sheet style) ─

function RecipeModal({ plan, visible, onClose }) {
    if (!plan) return null;
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.modalOverlay} onPress={onClose}>
                <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
                    <View style={s.modalHandle} />
                    <Text style={s.modalTitle}>{plan.title}</Text>
                    <Text style={s.modalSub}>{plan.macros}</Text>

                    <Text style={s.modalSection}>INGREDIENTS</Text>
                    {(plan.ingredients || []).map((ing, i) => (
                        <View key={i} style={s.row}>
                            <Text style={s.bulletDot}>•</Text>
                            <Text style={s.ingText}>{ing}</Text>
                        </View>
                    ))}

                    <Text style={s.modalSection}>PREPARATION</Text>
                    {(plan.steps || []).map((step, i) => (
                        <View key={i} style={s.row}>
                            <View style={s.stepNumWrap}><Text style={s.stepNum}>{i + 1}</Text></View>
                            <Text style={s.stepText}>{step}</Text>
                        </View>
                    ))}

                    {plan.tip && (
                        <View style={s.tipBox}>
                            <Ionicons name="bulb-outline" size={14} color={ORANGE} />
                            <Text style={s.tipText}>{plan.tip}</Text>
                        </View>
                    )}

                    <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Text style={s.closeBtnText}>GOT IT</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function BookingModal({ field, visible, onClose, showToast }) {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedDate, setSelectedDate] = useState('Tomorrow');
    if (!field) return null;

    const DATES = ['Today', 'Tomorrow', 'Day After'];
    const confirmBooking = () => {
        if (!selectedSlot) {
            Alert.alert('Select a time slot', 'Please pick a time to book.');
            return;
        }
        onClose();
        setTimeout(() => showToast?.(`Booked ${field.name} — ${selectedDate} at ${selectedSlot}`), 300);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.modalOverlay} onPress={onClose}>
                <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
                    <View style={s.modalHandle} />
                    <Text style={s.modalTitle}>{field.name}</Text>
                    <Text style={s.modalSub}>{`${field.type} · ${field.distance}`}</Text>

                    <Text style={s.modalSection}>SELECT DATE</Text>
                    <View style={s.chipRow}>
                        {DATES.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[s.miniChip, selectedDate === d && s.miniChipActive]}
                                onPress={() => setSelectedDate(d)}
                            >
                                <Text style={[s.miniChipText, selectedDate === d && { color: '#fff' }]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={s.modalSection}>SELECT TIME</Text>
                    <View style={s.slotGrid}>
                        {TIME_SLOTS.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[s.miniChip, selectedSlot === slot && s.miniChipActive]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text style={[s.miniChipText, selectedSlot === slot && { color: '#fff' }]}>{slot}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={s.closeBtn} onPress={confirmBooking}>
                        <Text style={s.closeBtnText}>
                            {selectedSlot ? `CONFIRM: ${selectedDate.toUpperCase()} · ${selectedSlot}` : 'SELECT A SLOT'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Main Screen ────────────────────────────

export default function HubScreen({ showToast, navigation }) {
    const { userData = {} } = useUser();
    const { name = 'Athlete', level = 1, xp = 0, streak = 0 } = userData;

    const [activeSection, setActiveSection] = useState('Arena');
    const [rankData, setRankData] = useState({ rank: 24, total: 200, tier: 'District' });
    const [recipeModal, setRecipeModal] = useState({ visible: false, plan: null });
    const [bookingModal, setBookingModal] = useState({ visible: false, field: null });

    const initials = String(name).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    useEffect(() => {
        api.getLeaderboard?.().then((data) => {
            if (!data?.leaderboard) return;
            const idx = data.leaderboard.findIndex((a) => a.id === 'athlete_01');
            if (idx >= 0) {
                setRankData({ rank: idx + 1, total: data.total || data.leaderboard.length, tier: 'District' });
            }
        }).catch(() => {});
    }, []);

    const topPercent = Math.round((rankData.rank / Math.max(rankData.total, 1)) * 100);

    const renderSection = useCallback(() => {
        if (activeSection === 'Arena') {
            return ARENA_CHALLENGES.map((c) => (
                <ArenaCard
                    key={c.id}
                    challenge={c}
                    onPress={() => showToast?.(`Starting ${c.title}…`)}
                />
            ));
        }
        if (activeSection === 'Nutrition') {
            return (NUTRITION_PLANS || []).map((p) => (
                <NutritionRow
                    key={p.id}
                    plan={p}
                    onPress={(plan) => setRecipeModal({ visible: true, plan })}
                />
            ));
        }
        // Rank tab
        return (
            <>
                <View style={[s.card, { padding: 24, alignItems: 'center' }]}>
                    <Text style={s.rankEyebrow}>YOUR RANK · {rankData.tier.toUpperCase()}</Text>
                    <Text style={s.rankNum}>#{rankData.rank}</Text>
                    <Text style={s.rankSub}>of {rankData.total} athletes</Text>
                    <View style={s.rankPill}>
                        <Text style={s.rankPillText}>TOP {topPercent}%</Text>
                    </View>
                </View>
                <Text style={s.sectionLabel}>NEARBY PLAYFIELDS</Text>
                {(PLAYFIELDS || []).slice(0, 5).map((f) => (
                    <FieldRow
                        key={f.id}
                        field={f}
                        onPress={(field) => setBookingModal({ visible: true, field })}
                    />
                ))}
            </>
        );
    }, [activeSection, rankData, showToast, topPercent]);

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Profile band */}
                <View style={s.profileBand}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.profileName}>{name}</Text>
                        <Text style={s.profileTier}>
                            Level {level} · {streak}-day streak
                        </Text>
                    </View>
                    <View style={s.xpPill}>
                        <Text style={s.xpText}>{Number(xp).toLocaleString()} XP</Text>
                    </View>
                </View>

                {/* Section tabs */}
                <View style={s.tabRow}>
                    {SECTIONS.map((sec) => (
                        <TouchableOpacity
                            key={sec}
                            style={[s.tab, activeSection === sec && s.tabActive]}
                            onPress={() => setActiveSection(sec)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.tabText, activeSection === sec && s.tabTextActive]}>{sec}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Section body */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                    {renderSection()}
                </View>
            </ScrollView>

            <RecipeModal
                plan={recipeModal.plan}
                visible={recipeModal.visible}
                onClose={() => setRecipeModal({ visible: false, plan: null })}
            />
            <BookingModal
                field={bookingModal.field}
                visible={bookingModal.visible}
                onClose={() => setBookingModal({ visible: false, field: null })}
                showToast={showToast}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    // Profile band
    profileBand: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: ORANGE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    profileName: { fontSize: 18, fontWeight: '800', color: DARK, letterSpacing: -0.3 },
    profileTier: { fontSize: 12, color: GRAY, marginTop: 2 },
    xpPill: {
        backgroundColor: LIGHT,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 50,
    },
    xpText: { fontSize: 11, fontWeight: '800', color: DARK, letterSpacing: 0.3 },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    tab: { paddingVertical: 12, paddingHorizontal: 12, marginRight: 8 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: ORANGE, marginBottom: -1 },
    tabText: { fontSize: 13, fontWeight: '600', color: GRAY, letterSpacing: 0.3 },
    tabTextActive: { color: DARK, fontWeight: '800' },

    // Card
    card: {
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(252, 76, 2, 0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: DARK },
    cardSub: { fontSize: 11, color: GRAY, marginTop: 2 },
    cardFoot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: LIGHT,
    },
    cardSport: { fontSize: 10, fontWeight: '800', color: GRAY, letterSpacing: 0.5 },
    diffPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
    diffText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
    rewardPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: LIGHT,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 50,
    },
    rewardText: { fontSize: 10, fontWeight: '700', color: DARK },

    bookText: { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 0.5 },

    sectionLabel: { fontSize: 11, fontWeight: '800', color: GRAY, letterSpacing: 0.8, marginTop: 16, marginBottom: 12 },

    // Rank
    rankEyebrow: { fontSize: 10, fontWeight: '800', color: GRAY, letterSpacing: 0.8 },
    rankNum: { fontSize: 56, fontWeight: '800', color: ORANGE, letterSpacing: -2, marginTop: 8 },
    rankSub: { fontSize: 12, color: GRAY, marginTop: 4 },
    rankPill: {
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 50,
        backgroundColor: ORANGE,
    },
    rankPillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Modal sheet
    modalOverlay: { flex: 1, backgroundColor: 'rgba(36, 36, 40, 0.5)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: BG,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        paddingBottom: 28,
    },
    modalHandle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: BORDER,
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: DARK, letterSpacing: -0.3 },
    modalSub: { fontSize: 12, color: GRAY, marginTop: 4 },
    modalSection: { fontSize: 11, fontWeight: '800', color: GRAY, letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },

    row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    bulletDot: { color: ORANGE, fontSize: 14, marginRight: 8, fontWeight: '800', lineHeight: 20 },
    ingText: { color: DARK, fontSize: 13, flex: 1, lineHeight: 20 },
    stepNumWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(252, 76, 2, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    stepNum: { color: ORANGE, fontSize: 11, fontWeight: '800' },
    stepText: { color: DARK, fontSize: 13, flex: 1, lineHeight: 20 },

    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(252, 76, 2, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(252, 76, 2, 0.20)',
        padding: 12,
        borderRadius: 6,
        marginTop: 14,
    },
    tipText: { color: DARK, fontSize: 12, flex: 1, lineHeight: 18 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    miniChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: BG,
    },
    miniChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
    miniChipText: { color: DARK, fontSize: 12, fontWeight: '600' },

    closeBtn: {
        backgroundColor: ORANGE,
        paddingVertical: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
    },
    closeBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    cancelText: { color: GRAY, fontSize: 12 },
});
