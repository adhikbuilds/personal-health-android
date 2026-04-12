// ScoreCardScreen — Post-session shareable score card
// Displayed after a session ends. Shows form score, key stats, and share button.
// VISION.md GTM Step 2: "Every session produces shareable output."

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, ActivityIndicator, Share, Alert,
} from 'react-native';
import { C } from '../styles/colors';
import api from '../services/api';

const SCORE_COLORS = {
    elite:   C.green,
    great:   C.cyan,
    okay:    C.orange,
    poor:    C.red,
};

function scoreColor(score) {
    if (score >= 80) return SCORE_COLORS.elite;
    if (score >= 65) return SCORE_COLORS.great;
    if (score >= 50) return SCORE_COLORS.okay;
    return SCORE_COLORS.poor;
}

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatBox({ label, value, unit, color }) {
    return (
        <View style={s.statBox}>
            <Text style={s.statLabel}>{label}</Text>
            <Text style={[s.statValue, color && { color }]}>{value}</Text>
            {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
        </View>
    );
}

function QualityBar({ dist }) {
    const total = (dist.elite || 0) + (dist.good || 0) + (dist.average || 0) + (dist.poor || 0);
    if (total === 0) return null;
    const pct = (k) => Math.round(((dist[k] || 0) / total) * 100);
    return (
        <View style={s.qualBar}>
            {pct('elite') > 0 && <View style={[s.qualSeg, { flex: pct('elite'), backgroundColor: C.green }]} />}
            {pct('good') > 0 && <View style={[s.qualSeg, { flex: pct('good'), backgroundColor: C.cyan }]} />}
            {pct('average') > 0 && <View style={[s.qualSeg, { flex: pct('average'), backgroundColor: C.orange }]} />}
            {pct('poor') > 0 && <View style={[s.qualSeg, { flex: pct('poor'), backgroundColor: C.red }]} />}
        </View>
    );
}

export default function ScoreCardScreen({ navigation, route }) {
    const sessionId = route?.params?.sessionId;
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) return;
        api.getScorecard(sessionId).then(data => {
            setCard(data);
            setLoading(false);
        });
    }, [sessionId]);

    const handleShare = async () => {
        if (!card) return;
        const sc = card.avg_form_score;
        const msg = [
            `ActiveBharat Session Score: ${sc.toFixed(1)}`,
            `Sport: ${(card.sport || '').replace('_', ' ')}`,
            `Peak Jump: ${card.peak_jump_height_cm?.toFixed(1) || '—'} cm`,
            `XP Earned: +${card.xp_earned}`,
            `Symmetry: ${((card.avg_symmetry || 0) * 100).toFixed(0)}%`,
            '',
            'Train smarter with ActiveBharat',
        ].join('\n');

        try {
            await Share.share({ message: msg, title: 'My Training Score Card' });
        } catch (err) {
            Alert.alert('Share failed', err.message);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <ActivityIndicator size="large" color={C.cyan} style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!card) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.empty}>
                    <Text style={s.emptyText}>Score card not available.</Text>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const sc = card.avg_form_score || 0;
    const color = scoreColor(sc);
    const dist = card.quality_distribution || {};

    return (
        <SafeAreaView style={s.container}>
            <ScrollView contentContainerStyle={s.scroll}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
                        <Text style={s.headerBackText}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Score Card</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Branding */}
                <Text style={s.brand}>ActiveBharat</Text>
                <Text style={s.sport}>{(card.sport || '').replace('_', ' ').toUpperCase()}</Text>

                {/* Big Score Circle */}
                <View style={[s.scoreCircle, { borderColor: color }]}>
                    <Text style={[s.scoreNum, { color }]}>{sc.toFixed(1)}</Text>
                    <Text style={s.scoreLabel}>Form Score</Text>
                </View>

                {/* Stats Grid */}
                <View style={s.statsGrid}>
                    <StatBox label="Peak Jump" value={card.peak_jump_height_cm?.toFixed(1) || '—'} unit="cm" color={C.cyan} />
                    <StatBox label="Symmetry" value={`${((card.avg_symmetry || 0) * 100).toFixed(0)}%`} color={card.avg_symmetry >= 0.95 ? C.green : C.orange} />
                    <StatBox label="XP Earned" value={`+${card.xp_earned || 0}`} color={C.yellow} />
                    <StatBox label="Duration" value={formatDuration(card.duration_seconds || 0)} />
                    <StatBox label="Reps" value={card.rep_count || '—'} />
                    <StatBox label="Frames" value={card.total_frames || '—'} />
                </View>

                {/* Quality Bar */}
                <Text style={s.sectionTitle}>Quality Distribution</Text>
                <QualityBar dist={dist} />
                <View style={s.qualLegend}>
                    <Text style={[s.qualLegendItem, { color: C.green }]}>Elite {dist.elite || 0}</Text>
                    <Text style={[s.qualLegendItem, { color: C.cyan }]}>Good {dist.good || 0}</Text>
                    <Text style={[s.qualLegendItem, { color: C.orange }]}>Avg {dist.average || 0}</Text>
                    <Text style={[s.qualLegendItem, { color: C.red }]}>Poor {dist.poor || 0}</Text>
                </View>

                {/* Athlete Info */}
                <View style={s.athleteInfo}>
                    <Text style={s.athleteName}>{card.athlete_name || card.athlete_id}</Text>
                    <Text style={s.athleteMeta}>{card.tier} · BPI {card.bpi?.toLocaleString()}</Text>
                </View>

                {/* Share Button */}
                <TouchableOpacity style={[s.shareBtn, { backgroundColor: color }]} onPress={handleShare} activeOpacity={0.8}>
                    <Text style={s.shareBtnText}>Share Score Card</Text>
                </TouchableOpacity>

                <Text style={s.watermark}>activebharat.in</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
    headerBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surf, alignItems: 'center', justifyContent: 'center' },
    headerBackText: { color: C.text, fontSize: 18, fontWeight: '600' },
    headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 16, fontWeight: '700' },

    brand: { color: C.cyan, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    sport: { color: C.muted, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 24 },

    scoreCircle: {
        width: 160, height: 160, borderRadius: 80, borderWidth: 4,
        alignItems: 'center', justifyContent: 'center', marginBottom: 28,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    scoreNum: { fontSize: 48, fontWeight: '900', fontFamily: 'monospace' },
    scoreLabel: { color: C.muted, fontSize: 11, fontWeight: '600', marginTop: -2 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 24, width: '100%' },
    statBox: {
        width: '30%', backgroundColor: C.surf, borderRadius: 12, padding: 14, alignItems: 'center',
        borderWidth: 1, borderColor: C.border,
    },
    statLabel: { color: C.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    statValue: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
    statUnit: { color: C.muted, fontSize: 10, marginTop: 2 },

    sectionTitle: { color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    qualBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', width: '100%', marginBottom: 8 },
    qualSeg: { height: '100%' },
    qualLegend: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    qualLegendItem: { fontSize: 10, fontWeight: '600' },

    athleteInfo: { alignItems: 'center', marginBottom: 24 },
    athleteName: { color: C.text, fontSize: 16, fontWeight: '700' },
    athleteMeta: { color: C.muted, fontSize: 12, marginTop: 4 },

    shareBtn: {
        width: '100%', paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', marginBottom: 16,
    },
    shareBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

    watermark: { color: C.muted, fontSize: 10, opacity: 0.5 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: C.muted, fontSize: 14, marginBottom: 16 },
    backBtn: { backgroundColor: C.cyan, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    backBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
