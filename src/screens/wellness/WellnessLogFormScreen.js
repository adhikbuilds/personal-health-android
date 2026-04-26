// WellnessLogFormScreen — WN-21 (morning check-in input form)
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { C } from '../../styles/colors';
import api from '../../services/api';

function SliderRow({ label, value, onChange, min = 1, max = 10, lowLabel = '', highLabel = '' }) {
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
        <View style={sf.sliderRow}>
            <View style={sf.sliderHeader}>
                <Text style={sf.sliderLabel}>{label}</Text>
                <Text style={[sf.sliderValue, { color: C.cyan }]}>{value}</Text>
            </View>
            <View style={sf.sliderTrack}>
                {steps.map(step => (
                    <TouchableOpacity
                        key={step}
                        onPress={() => onChange(step)}
                        style={[sf.sliderDot, value >= step && { backgroundColor: C.cyan }]}
                    />
                ))}
            </View>
            {(lowLabel || highLabel) && (
                <View style={sf.endLabels}>
                    <Text style={sf.endLabel}>{lowLabel}</Text>
                    <Text style={sf.endLabel}>{highLabel}</Text>
                </View>
            )}
        </View>
    );
}

export default function WellnessLogFormScreen({ navigation, route }) {
    const athleteId = route.params?.athleteId || 'athlete_01';
    const prefill = route.params?.prefill;
    const [saving, setSaving] = useState(false);

    const [bedtime, setBedtime] = useState(prefill?.sleep?.bedtime || '23:00');
    const [wakeTime, setWakeTime] = useState(prefill?.sleep?.wake_time || '07:00');
    const [sleepQuality, setSleepQuality] = useState(prefill?.sleep?.quality || 3);
    const [interruptions, setInterruptions] = useState(prefill?.sleep?.interruptions || 0);
    const [waterMl, setWaterMl] = useState(String(prefill?.hydration?.water_ml || 1500));
    const [mood, setMood] = useState(prefill?.mental?.mood || 5);
    const [stress, setStress] = useState(prefill?.mental?.stress || 5);
    const [energy, setEnergy] = useState(prefill?.mental?.energy || 5);
    const [soreness, setSoreness] = useState(prefill?.physical?.soreness || 3);
    const [bodyWeight, setBodyWeight] = useState(String(prefill?.physical?.body_weight_kg || ''));
    const [journal, setJournal] = useState(prefill?.mental?.journal_note || '');

    const WATER_PRESETS = [1000, 1500, 2000, 2500, 3000];

    const handleSave = async () => {
        if (!bedtime.match(/^\d{2}:\d{2}$/) || !wakeTime.match(/^\d{2}:\d{2}$/)) {
            Alert.alert('Invalid time', 'Enter times in HH:MM format (e.g. 23:00)');
            return;
        }
        const waterNum = parseInt(waterMl, 10);
        if (isNaN(waterNum) || waterNum < 0) {
            Alert.alert('Invalid water intake', 'Enter a positive number');
            return;
        }
        setSaving(true);
        try {
            await api.post(`/athlete/${athleteId}/wellness`, {
                sleep: { bedtime, wake_time: wakeTime, quality: sleepQuality, interruptions },
                hydration: { water_ml: waterNum },
                mental: { mood, stress, energy, journal_note: journal.slice(0, 200) || null },
                physical: {
                    soreness,
                    body_weight_kg: bodyWeight ? parseFloat(bodyWeight) : null,
                },
            });
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to save wellness check-in');
        }
        setSaving(false);
    };

    return (
        <SafeAreaView style={sf.safe}>
            <View style={sf.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={sf.backBtn}>
                    <Text style={sf.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={sf.title}>Morning Check-In</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={sf.saveBtn}>
                    <Text style={[sf.saveText, saving && { opacity: 0.4 }]}>{saving ? '...' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
                {/* Sleep */}
                <Text style={sf.sectionTitle}>1. Sleep</Text>
                <View style={sf.card}>
                    <View style={sf.timeRow}>
                        <Text style={sf.timeLabel}>Bedtime</Text>
                        <TextInput style={sf.timeInput} value={bedtime} onChangeText={setBedtime}
                            placeholder="23:00" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" maxLength={5} />
                    </View>
                    <View style={sf.timeRow}>
                        <Text style={sf.timeLabel}>Wake time</Text>
                        <TextInput style={sf.timeInput} value={wakeTime} onChangeText={setWakeTime}
                            placeholder="07:00" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" maxLength={5} />
                    </View>
                    <SliderRow label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} min={1} max={5} lowLabel="Poor" highLabel="Excellent" />
                    <View style={sf.sliderRow}>
                        <Text style={sf.sliderLabel}>Interruptions</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            {[0, 1, 2, 3].map(n => (
                                <TouchableOpacity key={n} onPress={() => setInterruptions(n)}
                                    style={[sf.interBtn, interruptions === n && { backgroundColor: C.cyan, borderColor: C.cyan }]}>
                                    <Text style={[sf.interText, interruptions === n && { color: '#FBFBF8' }]}>{n === 3 ? '3+' : n}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Hydration */}
                <Text style={sf.sectionTitle}>2. Hydration</Text>
                <View style={sf.card}>
                    <Text style={sf.sliderLabel}>Water intake</Text>
                    <View style={sf.presetsRow}>
                        {WATER_PRESETS.map(ml => (
                            <TouchableOpacity key={ml} onPress={() => setWaterMl(String(ml))}
                                style={[sf.presetBtn, waterMl === String(ml) && { backgroundColor: C.cyan, borderColor: C.cyan }]}>
                                <Text style={[sf.presetText, waterMl === String(ml) && { color: '#FBFBF8' }]}>
                                    {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={sf.inputRow}>
                        <TextInput style={sf.numInput} value={waterMl} onChangeText={setWaterMl} keyboardType="numeric" selectTextOnFocus />
                        <Text style={sf.unit}>ml</Text>
                    </View>
                </View>

                {/* Mental */}
                <Text style={sf.sectionTitle}>3. Mental</Text>
                <View style={sf.card}>
                    <SliderRow label="Mood" value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" />
                    <SliderRow label="Stress" value={stress} onChange={setStress} lowLabel="Calm" highLabel="Stressed" />
                    <SliderRow label="Energy" value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Energized" />
                    <Text style={sf.sliderLabel}>Journal (optional)</Text>
                    <TextInput style={sf.journalInput} multiline
                        placeholder="How are you feeling today?" placeholderTextColor={C.muted}
                        value={journal} onChangeText={t => setJournal(t.slice(0, 200))} maxLength={200} />
                    <Text style={sf.charCount}>{journal.length}/200</Text>
                </View>

                {/* Physical */}
                <Text style={sf.sectionTitle}>4. Physical</Text>
                <View style={sf.card}>
                    <SliderRow label="Soreness" value={soreness} onChange={setSoreness} lowLabel="None" highLabel="Severe" />
                    <Text style={sf.sliderLabel}>Body weight (optional)</Text>
                    <View style={sf.inputRow}>
                        <TextInput style={sf.numInput} value={bodyWeight} onChangeText={setBodyWeight}
                            keyboardType="decimal-pad" placeholder="—" placeholderTextColor={C.muted} selectTextOnFocus />
                        <Text style={sf.unit}>kg</Text>
                    </View>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const sf = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 60 },
    backText: { color: C.muted, fontSize: 14 },
    title: { color: C.text, fontSize: 17, fontWeight: '700' },
    saveBtn: { width: 60, alignItems: 'flex-end' },
    saveText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
    sectionTitle: { color: C.cyan, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 4 },
    card: { backgroundColor: C.surf, borderRadius: 12, padding: 14, marginBottom: 12 },
    sliderRow: { marginBottom: 14 },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sliderLabel: { color: C.text, fontSize: 14, fontWeight: '500' },
    sliderValue: { fontSize: 16, fontWeight: '700' },
    sliderTrack: { flexDirection: 'row', gap: 4 },
    sliderDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
    endLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    endLabel: { color: C.muted, fontSize: 10 },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    timeLabel: { color: C.text, fontSize: 14, fontWeight: '500' },
    timeInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, color: C.text, fontSize: 16, fontWeight: '600', minWidth: 90, textAlign: 'center', borderWidth: 1, borderColor: C.border },
    presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 10 },
    presetBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    presetText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    numInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border },
    unit: { color: C.muted, fontSize: 14, width: 30 },
    interBtn: { width: 46, height: 38, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    interText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
    journalInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, color: C.text, fontSize: 13, minHeight: 64, borderWidth: 1, borderColor: C.border, marginTop: 8 },
    charCount: { color: C.muted, fontSize: 10, textAlign: 'right', marginTop: 4 },
});
