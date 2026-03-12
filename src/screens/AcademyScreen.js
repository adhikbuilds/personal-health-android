// AcademyScreen (Production-Fixed)
// Fixes: gap→margin, navigation.navigate instead of direct props
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { SPORTS_ACADEMY } from '../data/constants';

const C = { bg: '#0f172a', surf: '#1e293b', cyan: '#06b6d4', orange: '#f97316', green: '#22c55e', muted: '#64748b', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)' };

const SPORT_KEYS = Object.keys(SPORTS_ACADEMY);

function ModuleCard({ module, onAiDrillPress }) {
    const isVideo = module.type === 'video';
    const borderColor = isVideo ? C.orange : C.cyan;

    const handlePress = () => {
        if (module.locked) return;
        if (isVideo && module.videoId) {
            Linking.openURL(`https://www.youtube.com/watch?v=${module.videoId}`).catch(console.warn);
        } else if (!isVideo) {
            onAiDrillPress(module);
        }
    };

    return (
        <TouchableOpacity
            style={[s.moduleCard, { borderLeftColor: borderColor, opacity: module.locked ? 0.4 : 1 }]}
            onPress={handlePress}
            activeOpacity={0.8}
            disabled={module.locked}
        >
            <View style={s.moduleRow}>
                <View style={[s.moduleTypeTag, { backgroundColor: (isVideo ? C.orange : C.cyan) + '18' }]}>
                    <Text style={[s.moduleTypeText, { color: isVideo ? C.orange : C.cyan }]}>
                        {isVideo ? '▶ VIDEO' : '🤖 AI DRILL'}
                    </Text>
                </View>
                {module.locked && <Text style={s.lockTag}>🔒 LOCKED</Text>}
            </View>
            <Text style={s.moduleTitle}>{module.title}</Text>
            {module.duration && <Text style={s.moduleMeta}>{`⏱ ${module.duration}`}</Text>}
            {module.focus && <Text style={s.moduleMeta}>{`🎯 ${module.focus}`}</Text>}
            <View style={s.tagRow}>
                {(module.tags || []).map((t, i) => (
                    <View key={t} style={[s.tag, i > 0 && { marginLeft: 6 }]}>
                        <Text style={s.tagText}>{t}</Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );
}

export default function AcademyScreen({ navigation, showToast }) {
    const [activeSport, setActiveSport] = useState(SPORT_KEYS[0]);
    const sport = SPORTS_ACADEMY[activeSport];

    const handleDrillPress = (module) => {
        showToast(`🎯 Starting drill: ${module.title}`);
        navigation?.navigate('Camera');
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topbar}>
                <Text style={s.title}>Sports Academy</Text>
            </View>

            {/* Sport selector (horizontal scroll) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sportScroll}>
                {SPORT_KEYS.map((key, i) => {
                    const sp = SPORTS_ACADEMY[key];
                    const isActive = activeSport === key;
                    return (
                        <TouchableOpacity
                            key={key}
                            style={[s.sportChip, isActive && s.sportChipActive, i > 0 && { marginLeft: 12 }]}
                            onPress={() => setActiveSport(key)}
                        >
                            <Text style={s.sportChipIcon}>{sp.icon}</Text>
                            <Text style={[s.sportChipLabel, isActive && { color: C.cyan }]}>{sp.title}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
                {/* Mastery Progress */}
                <View style={s.progressCard}>
                    <View style={s.progressHeader}>
                        <Text style={s.progressLabel}>{`${sport.title} Mastery`}</Text>
                        <Text style={[s.progressPct, { color: sport.progress >= 70 ? C.green : C.orange }]}>{`${sport.progress}%`}</Text>
                    </View>
                    <View style={s.progressBarWrap}>
                        <View style={[s.progressFill, { width: `${sport.progress}%`, backgroundColor: sport.progress >= 70 ? C.green : C.orange }]} />
                    </View>
                </View>

                <Text style={s.sectionLabel}>TRAINING MODULES</Text>
                {sport.modules.map(m => (
                    <ModuleCard key={m.id} module={m} onAiDrillPress={handleDrillPress} />
                ))}

                <View style={s.comingSoon}>
                    <Text style={s.comingSoonText}>{'🚀 More modules unlock as you train. Keep going!'}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    topbar: { padding: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 20, fontWeight: '900', color: C.text },
    sportScroll: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 16 },
    sportChip: { width: 90, height: 90, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surf, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    sportChipActive: { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.4)', borderWidth: 2 },
    sportChipIcon: { fontSize: 26, marginBottom: 8 },
    sportChipLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textAlign: 'center' },
    scroll: { flex: 1 },
    progressCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressLabel: { fontSize: 12, fontWeight: '700', color: C.text },
    progressPct: { fontSize: 14, fontWeight: '900' },
    progressBarWrap: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 99 },
    sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
    moduleCard: { backgroundColor: C.surf, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3 },
    moduleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    moduleTypeTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    moduleTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    lockTag: { fontSize: 10, color: C.muted, fontWeight: '700' },
    moduleTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 },
    moduleMeta: { fontSize: 11, color: C.muted, marginBottom: 3 },
    tagRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
    tag: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 9, color: C.muted, fontWeight: '700' },
    comingSoon: { marginTop: 12, backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
    comingSoonText: { fontSize: 12, color: '#818cf8', fontWeight: '600', textAlign: 'center' },
});
