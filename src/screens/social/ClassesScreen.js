// ClassesScreen — PE Classes with Teacher Feedback
// Shows class details, teacher rating, student rating, previous classes carousel
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, FlatList, Dimensions,
} from 'react-native';
import { C } from '../../styles/colors';
import { PE_CLASSES } from '../../data/constants';
import { useUser } from '../../context/UserContext';
import api from '../../services/api';

const { width: SW } = Dimensions.get('window');

function StarRow({ rating, max = 5, onRate, editable = false }) {
    return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: max }).map((_, i) => (
                <TouchableOpacity
                    key={i}
                    onPress={() => editable && onRate && onRate(i + 1)}
                    disabled={!editable}
                    activeOpacity={editable ? 0.7 : 1}
                >
                    <Text style={{ fontSize: 18, color: i < rating ? C.yellow : C.muted }}>
                        {i < rating ? '★' : '☆'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function ClassCard({ cls, onRate, expanded, onExpand }) {
    const [myRating, setMyRating] = useState(cls.studentRating || 0);

    const handleRate = (r) => {
        setMyRating(r);
        onRate?.(cls.id, r);
    };

    return (
        <View style={cc.card}>
            {/* Header */}
            <View style={[cc.colorBar, { backgroundColor: cls.color }]} />
            <View style={cc.body}>
                <TouchableOpacity onPress={onExpand} activeOpacity={0.8}>
                    <View style={cc.titleRow}>
                        <View style={cc.sportBadge}>
                            <Text style={cc.sportText}>{cls.thumbnail} {cls.sport}</Text>
                        </View>
                        <Text style={cc.chevron}>{expanded ? '▲' : '▼'}</Text>
                    </View>
                    <Text style={cc.classTitle}>{cls.title}</Text>
                    <Text style={cc.classMeta}>{cls.date} · {cls.period}</Text>
                </TouchableOpacity>

                {expanded && (
                    <>
                        <View style={cc.divider} />

                        {/* Teacher Feedback */}
                        <Text style={cc.sectionLabel}>Teacher's Feedback</Text>
                        <View style={cc.teacherRow}>
                            <View style={[cc.teacherAvatar, { backgroundColor: cls.color }]}>
                                <Text style={cc.teacherInitials}>
                                    {cls.teacherName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={cc.teacherName}>{cls.teacherName}</Text>
                                <StarRow rating={cls.teacherRating} />
                            </View>
                        </View>
                        <Text style={cc.feedbackText}>{cls.teacherFeedback}</Text>

                        <View style={cc.divider} />

                        {/* Student Rating */}
                        <Text style={cc.sectionLabel}>How did you like the class?</Text>
                        <StarRow rating={myRating} max={5} editable onRate={handleRate} />
                        {myRating > 0 && (
                            <Text style={cc.ratedText}>
                                You rated this {myRating === 5 ? 'Excellent! 🎉' : myRating >= 4 ? 'Great 👍' : myRating >= 3 ? 'Good' : 'Okay'}
                            </Text>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

function PreviousClassCard({ cls }) {
    return (
        <View style={prev.card}>
            <View style={[prev.thumb, { backgroundColor: cls.color + '20' }]}>
                <Text style={{ fontSize: 28 }}>{cls.thumbnail}</Text>
            </View>
            <Text style={prev.title} numberOfLines={1}>{cls.title}</Text>
            <Text style={prev.meta}>{cls.date.split(' ').slice(0, 2).join(' ')}</Text>
        </View>
    );
}

export default function ClassesScreen({ navigation }) {
    const { userData } = useUser();
    const [classes, setClasses]   = useState(PE_CLASSES);
    const [expanded, setExpanded] = useState(PE_CLASSES[0]?.id || null);

    useEffect(() => {
        api.getClasses(userData.avatarId).then(data => {
            const arr = Array.isArray(data) ? data : data?.classes;
            if (arr?.length) setClasses(arr);
        });
    }, [userData.avatarId]);

    const handleRate = (classId, rating) => {
        setClasses(prev => prev.map(c => c.id === classId ? { ...c, studentRating: rating } : c));
    };

    const current = classes[0];
    const previous = classes.slice(1);

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topbar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={s.back}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Classes</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                {/* Current/Latest Class */}
                {current && (
                    <ClassCard
                        cls={current}
                        expanded={expanded === current.id}
                        onExpand={() => setExpanded(expanded === current.id ? null : current.id)}
                        onRate={handleRate}
                    />
                )}

                {/* Previous Classes */}
                {previous.length > 0 && (
                    <View style={s.prevSection}>
                        <Text style={s.prevTitle}>Previous Classes</Text>
                        <FlatList
                            horizontal
                            data={previous}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => <PreviousClassCard cls={item} />}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12 }}
                        />
                    </View>
                )}

                {/* All Classes (expandable) */}
                {previous.map(cls => (
                    <ClassCard
                        key={cls.id}
                        cls={cls}
                        expanded={expanded === cls.id}
                        onExpand={() => setExpanded(expanded === cls.id ? null : cls.id)}
                        onRate={handleRate}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.bg },
    topbar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
    back:       { color: C.cyan, fontSize: 16, fontWeight: '700' },
    title:      { fontSize: 18, fontWeight: '900', color: C.text },
    content:    { padding: 16, paddingBottom: 40 },
    prevSection:{ marginVertical: 16 },
    prevTitle:  { fontSize: 11, color: C.muted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
});

const cc = StyleSheet.create({
    card:        { backgroundColor: C.surf, borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: C.border },
    colorBar:    { height: 4 },
    body:        { padding: 16 },
    titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sportBadge:  { backgroundColor: C.bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    sportText:   { fontSize: 11, color: C.muted, fontWeight: '700' },
    chevron:     { color: C.muted, fontSize: 12 },
    classTitle:  { fontSize: 17, fontWeight: '900', color: C.text, marginBottom: 4 },
    classMeta:   { fontSize: 11, color: C.muted },
    divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },
    sectionLabel:{ fontSize: 11, color: C.muted, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    teacherRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    teacherAvatar:{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    teacherInitials:{ color: '#fff', fontWeight: '900', fontSize: 13 },
    teacherName: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 4 },
    feedbackText:{ fontSize: 13, color: C.textSub, lineHeight: 20, fontStyle: 'italic' },
    ratedText:   { fontSize: 11, color: C.green, marginTop: 8, fontWeight: '700' },
});

const prev = StyleSheet.create({
    card:  { width: 100, backgroundColor: C.surf, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
    thumb: { height: 70, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 10, fontWeight: '700', color: C.text, padding: 8, paddingBottom: 2 },
    meta:  { fontSize: 9, color: C.muted, paddingHorizontal: 8, paddingBottom: 8 },
});
