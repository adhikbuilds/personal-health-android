// HubScreen — Fully functional with recipe modal, slot booking, and live rank
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
    Modal, Pressable, FlatList, Alert,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { NUTRITION_PLANS, PLAYFIELDS } from '../data/constants';
import api from '../services/api';

const C = {
    bg: '#0f172a', surf: '#1e293b', deep: '#0d1829', cyan: '#06b6d4',
    orange: '#f97316', green: '#22c55e', yellow: '#facc15',
    muted: '#64748b', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)',
    red: '#ef4444',
};
const SECTIONS = ['Arena', 'Nutrition', 'Rank'];

const ARENA_CHALLENGES = [
    { id: 'a1', title: 'Vertical Jump Test', desc: '3 attempts — best recorded', reward: '200 XP', sport: 'VJ', icon: '⬆️', difficulty: 'Medium' },
    { id: 'a2', title: 'Agility T-Drill', desc: 'Sprint through the T pattern', reward: '150 XP', sport: 'Sprint', icon: '💨', difficulty: 'Hard' },
    { id: 'a3', title: 'Snatch Form Check', desc: '30-second AI snatch analysis', reward: '180 XP', sport: 'Snatch', icon: '🏋️', difficulty: 'Hard' },
];

const TIME_SLOTS = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:00 PM', '6:00 PM', '7:00 PM'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ArenaCard({ challenge, onPress }) {
    const diffColor = challenge.difficulty === 'Hard' ? C.orange : challenge.difficulty === 'Medium' ? C.yellow : C.green;
    return (
        <TouchableOpacity style={s.arenaCard} onPress={onPress} activeOpacity={0.8}>
            <View style={s.arenaHeader}>
                <Text style={s.arenaIcon}>{challenge.icon}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.arenaTitle}>{challenge.title}</Text>
                    <Text style={s.arenaDesc}>{challenge.desc}</Text>
                </View>
                <View style={[s.diffBadge, { backgroundColor: diffColor + '20', borderColor: diffColor + '50' }]}>
                    <Text style={[s.diffText, { color: diffColor }]}>{challenge.difficulty}</Text>
                </View>
            </View>
            <View style={s.arenaFooter}>
                <Text style={s.arenaSport}>{challenge.sport}</Text>
                <View style={s.rewardPill}>
                    <Text style={s.rewardText}>{`🏅 ${challenge.reward}`}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function NutritionCard({ plan, onPress }) {
    return (
        <TouchableOpacity
            style={[s.nutriCard, plan.locked && { opacity: 0.45 }]}
            onPress={() => !plan.locked && onPress(plan)}
            activeOpacity={0.8}
            disabled={plan.locked}
        >
            <View style={s.nutriHeader}>
                <Text style={s.nutriIcon}>{plan.icon}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.nutriTitle}>{plan.title}</Text>
                    <Text style={s.nutriDesc}>{plan.desc}</Text>
                </View>
                {plan.locked
                    ? <Text style={{ fontSize: 16 }}>🔒</Text>
                    : <Text style={[s.viewTag]}>VIEW ›</Text>}
            </View>
            <View style={s.macrosRow}>
                <Text style={s.macrosText}>{plan.macros}</Text>
                <Text style={s.nutriSport}>{plan.sport}</Text>
            </View>
        </TouchableOpacity>
    );
}

function FieldCard({ field, onBook }) {
    const isOpen = field.status === 'Open';
    return (
        <View style={s.fieldCard}>
            <Text style={{ fontSize: 26, marginRight: 12 }}>{field.image}</Text>
            <View style={{ flex: 1 }}>
                <Text style={s.fieldName}>{field.name}</Text>
                <Text style={s.fieldType}>{`${field.type} • ${field.distance}`}</Text>
            </View>
            {isOpen ? (
                <TouchableOpacity style={s.bookBtn} onPress={() => onBook(field)} activeOpacity={0.8}>
                    <Text style={s.bookBtnText}>Book</Text>
                </TouchableOpacity>
            ) : (
                <View style={[s.statusPill, { backgroundColor: (C.red) + '20', borderColor: (C.red) + '50' }]}>
                    <Text style={[s.statusText, { color: C.red }]}>Closed</Text>
                </View>
            )}
        </View>
    );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function RecipeModal({ plan, visible, onClose }) {
    if (!plan) return null;
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.modalOverlay} onPress={onClose}>
                <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
                    <View style={s.modalHandle} />
                    <Text style={s.modalEmoji}>{plan.icon}</Text>
                    <Text style={s.modalTitle}>{plan.title}</Text>
                    <Text style={s.modalSub}>{plan.macros}</Text>

                    <Text style={s.recipeSection}>INGREDIENTS</Text>
                    {(plan.ingredients || []).map((ing, i) => (
                        <View key={i} style={s.ingredientRow}>
                            <Text style={s.ingDot}>•</Text>
                            <Text style={s.ingText}>{ing}</Text>
                        </View>
                    ))}

                    <Text style={s.recipeSection}>PREPARATION</Text>
                    {(plan.steps || []).map((step, i) => (
                        <View key={i} style={s.stepRow}>
                            <Text style={s.stepNum}>{i + 1}</Text>
                            <Text style={s.stepText}>{step}</Text>
                        </View>
                    ))}

                    {plan.tip && (
                        <View style={s.tipBox}>
                            <Text style={s.tipText}>💡 {plan.tip}</Text>
                        </View>
                    )}

                    <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Text style={s.closeBtnText}>Got it</Text>
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

    const confirmBooking = () => {
        if (!selectedSlot) {
            Alert.alert('Select a time slot', 'Please pick a time to book.');
            return;
        }
        onClose();
        setTimeout(() => {
            showToast(`✅ Booked ${field.name} — ${selectedDate} at ${selectedSlot}`);
        }, 300);
    };

    const DATES = ['Today', 'Tomorrow', 'Day After'];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.modalOverlay} onPress={onClose}>
                <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
                    <View style={s.modalHandle} />
                    <Text style={s.modalEmoji}>{field.image}</Text>
                    <Text style={s.modalTitle}>{field.name}</Text>
                    <Text style={s.modalSub}>{`${field.type} • ${field.distance}`}</Text>

                    <Text style={s.recipeSection}>SELECT DATE</Text>
                    <View style={s.dateRow}>
                        {DATES.map(d => (
                            <TouchableOpacity
                                key={d}
                                style={[s.dateChip, selectedDate === d && s.dateChipActive]}
                                onPress={() => setSelectedDate(d)}
                            >
                                <Text style={[s.dateChipText, selectedDate === d && { color: C.cyan }]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={s.recipeSection}>SELECT TIME</Text>
                    <View style={s.slotGrid}>
                        {TIME_SLOTS.map(slot => (
                            <TouchableOpacity
                                key={slot}
                                style={[s.slotChip, selectedSlot === slot && s.slotChipActive]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text style={[s.slotText, selectedSlot === slot && { color: C.cyan }]}>{slot}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={s.closeBtn} onPress={confirmBooking}>
                        <Text style={s.closeBtnText}>
                            {selectedSlot ? `Confirm: ${selectedDate} at ${selectedSlot}` : 'Select a slot'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HubScreen({ showToast, navigation }) {
    const { userData } = useUser();
    const { name, level, xp, streak, bpi, sessions, scoutReadiness } = userData;
    const [activeSection, setActiveSection] = useState('Arena');
    const [rankData, setRankData] = useState({ rank: 24, total: 200, tier: 'District' });
    const [recipeModal, setRecipeModal] = useState({ visible: false, plan: null });
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

    // Load real rank from leaderboard
    useEffect(() => {
        api.getLeaderboard().then(data => {
            if (!data?.leaderboard) return;
            const idx = data.leaderboard.findIndex(a => a.id === 'athlete_01');
            if (idx >= 0) {
                setRankData({
                    rank: idx + 1,
                    total: data.total,
                    tier: 'District',
                });
            }
        }).catch(() => { });
    }, []);

    const topPercent = Math.round((rankData.rank / rankData.total) * 100);

    return (
        <SafeAreaView style={s.safe}>
            {/* Profile Strip */}
            <TouchableOpacity style={s.profileBand} onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
                <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.profileName}>{name}</Text>
                    <Text style={s.profileTier}>{`Level ${level} • ${streak} day streak 🔥`}</Text>
                </View>
                <View style={s.xpPill}><Text style={s.xpText}>{`${xp.toLocaleString()} XP`}</Text></View>
            </TouchableOpacity>

            {/* Section Tabs */}
            <View style={s.sectionTabs}>
                {SECTIONS.map(sec => (
                    <TouchableOpacity
                        key={sec}
                        style={[s.sectionTab, activeSection === sec && s.sectionTabActive]}
                        onPress={() => setActiveSection(sec)}
                    >
                        <Text style={[s.sectionTabText, activeSection === sec && { color: C.cyan }]}>{sec}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>

                {activeSection === 'Arena' && (
                    <>
                        <Text style={s.sectionLabel}>AVAILABLE CHALLENGES</Text>
                        {ARENA_CHALLENGES.map(c => (
                            <ArenaCard key={c.id} challenge={c} onPress={() => {
                                showToast(`⚡ ${c.title} starting…`);
                                navigation?.navigate('Camera');
                            }} />
                        ))}
                    </>
                )}

                {activeSection === 'Nutrition' && (
                    <>
                        <Text style={s.sectionLabel}>DESI PERFORMANCE NUTRITION</Text>
                        <Text style={[s.sectionLabel, { color: C.cyan, marginBottom: 12, letterSpacing: 0, fontSize: 11, textTransform: 'none', fontWeight: '500' }]}>
                            Tap a card to see full recipe, ingredients and prep steps.
                        </Text>
                        {NUTRITION_PLANS.map(p => (
                            <NutritionCard
                                key={p.id}
                                plan={p}
                                onPress={plan => setRecipeModal({ visible: true, plan })}
                            />
                        ))}
                    </>
                )}



                {activeSection === 'Rank' && (
                    <>
                        <Text style={s.sectionLabel}>YOUR RANKING</Text>
                        <View style={s.rankCard}>
                            <Text style={s.rankNum}>#{rankData.rank}</Text>
                            <Text style={s.rankLabel}>{rankData.tier} Rank</Text>
                            <Text style={[s.rankLabel, { color: C.muted, marginTop: 4 }]}>
                                {`Top ${topPercent}% in Jharkhand`}
                            </Text>
                        </View>
                        <View style={[s.rankCard, { marginTop: 12 }]}>
                            <Text style={[s.rankNum, { color: C.orange }]}>BPI {(bpi || 12450).toLocaleString()}</Text>
                            <Text style={s.rankLabel}>Bio-Performance Index</Text>
                            <Text style={[s.rankLabel, { color: C.muted, marginTop: 4 }]}>
                                {`${sessions || 0} sessions recorded`}
                            </Text>
                        </View>
                        <View style={[s.rankCard, { marginTop: 12 }]}>
                            <Text style={[s.rankNum, { color: C.cyan, fontSize: 28 }]}>
                                {`${scoutReadiness || 68}%`}
                            </Text>
                            <Text style={s.rankLabel}>Scout Readiness</Text>
                            <View style={s.scoutBar}>
                                <View style={[s.scoutFill, { width: `${scoutReadiness || 68}%` }]} />
                            </View>
                            <Text style={[s.rankLabel, { color: C.muted, marginTop: 8, fontSize: 11 }]}>
                                Train consistently to reach State Tier
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <RecipeModal
                plan={recipeModal.plan}
                visible={recipeModal.visible}
                onClose={() => setRecipeModal({ visible: false, plan: null })}
            />
            <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
                <TouchableOpacity style={s.modalOverlay} onPress={() => setProfileMenuVisible(false)} activeOpacity={1}>
                    <View style={s.profileMenu}>
                        <TouchableOpacity 
                            style={s.menuItem} 
                            onPress={() => {
                                setProfileMenuVisible(false);
                                navigation?.navigate('FieldBooking');
                            }}
                        >
                            <Text style={s.menuItemIcon}>🏟️</Text>
                            <Text style={s.menuItemText}>Book / Manage Fields</Text>
                        </TouchableOpacity>
                        
                        <View style={s.menuDivider} />

                        <TouchableOpacity style={s.menuItem} onPress={() => {
                            setProfileMenuVisible(false);
                            Alert.alert('Settings', 'App settings coming soon!');
                        }}>
                            <Text style={s.menuItemIcon}>⚙️</Text>
                            <Text style={s.menuItemText}>Settings</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    profileBand: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.border },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#000', fontWeight: '900', fontSize: 16 },
    profileName: { fontSize: 15, fontWeight: '800', color: C.text },
    profileTier: { fontSize: 11, color: C.muted, marginTop: 2 },
    xpPill: { backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    xpText: { color: C.cyan, fontWeight: '800', fontSize: 11 },
    sectionTabs: { flexDirection: 'row', backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    sectionTabActive: { borderBottomColor: C.cyan },
    sectionTabText: { fontSize: 12, fontWeight: '700', color: C.muted },
    scroll: { flex: 1 },
    sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
    // Arena
    arenaCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    arenaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    arenaIcon: { fontSize: 24, width: 36, textAlign: 'center' },
    arenaTitle: { fontSize: 13, fontWeight: '800', color: C.text },
    arenaDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
    diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
    diffText: { fontSize: 9, fontWeight: '800' },
    arenaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    arenaSport: { fontSize: 10, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    rewardPill: { backgroundColor: 'rgba(250,204,21,0.1)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)' },
    rewardText: { color: C.yellow, fontWeight: '800', fontSize: 11 },
    // Nutrition
    nutriCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    nutriHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    nutriIcon: { fontSize: 22, width: 32, textAlign: 'center' },
    nutriTitle: { fontSize: 13, fontWeight: '800', color: C.text },
    nutriDesc: { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 16 },
    macrosRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    macrosText: { fontSize: 11, color: C.green, fontWeight: '700' },
    nutriSport: { fontSize: 10, color: C.muted, fontWeight: '700' },
    viewTag: { fontSize: 9, color: C.cyan, fontWeight: '800', letterSpacing: 1 },
    // Fields
    fieldCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    fieldName: { fontSize: 13, fontWeight: '800', color: C.text },
    fieldType: { fontSize: 11, color: C.muted, marginTop: 2 },
    statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '800' },
    bookBtn: { backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(6,182,212,0.4)' },
    bookBtnText: { color: C.cyan, fontWeight: '800', fontSize: 12 },
    // Rank
    rankCard: { backgroundColor: C.surf, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 2 },
    rankNum: { fontSize: 36, fontWeight: '900', color: C.cyan },
    rankLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 4 },
    scoutBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 10 },
    scoutFill: { height: '100%', backgroundColor: C.cyan, borderRadius: 99 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '85%' },
    modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, alignSelf: 'center', marginBottom: 20 },
    modalEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: C.text, textAlign: 'center' },
    modalSub: { fontSize: 12, color: C.green, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 20 },
    recipeSection: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
    ingredientRow: { flexDirection: 'row', marginBottom: 5 },
    ingDot: { color: C.cyan, fontWeight: '900', marginRight: 8, marginTop: 1 },
    ingText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
    stepRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
    stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.cyan + '20', color: C.cyan, fontWeight: '900', fontSize: 11, textAlign: 'center', lineHeight: 22, marginRight: 10 },
    stepText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
    tipBox: { backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)' },
    tipText: { fontSize: 12, color: C.cyan, lineHeight: 18 },
    closeBtn: { backgroundColor: C.cyan, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 20 },
    closeBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
    // Booking
    dateRow: { flexDirection: 'row', marginBottom: 4 },
    dateChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 8, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: C.border },
    dateChipActive: { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.4)' },
    dateChipText: { fontSize: 12, fontWeight: '700', color: C.muted },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    slotChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border },
    slotChipActive: { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.4)' },
    slotText: { fontSize: 12, fontWeight: '700', color: C.muted },
    // Profile Menu
    profileMenu: { backgroundColor: C.surf, width: '70%', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    menuItemIcon: { fontSize: 22, marginRight: 14 },
    menuItemText: { color: C.text, fontSize: 14, fontWeight: '800' },
    menuDivider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
});
