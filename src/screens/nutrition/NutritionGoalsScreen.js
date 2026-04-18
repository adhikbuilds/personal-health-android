// NutritionGoalsScreen — WN-19
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { C } from '../../styles/colors';
import api from '../../services/api';

const FIELDS = [
    { key: 'daily_calories', label: 'Daily Calories', unit: 'kcal', min: 800, max: 6000 },
    { key: 'protein_g', label: 'Protein', unit: 'g', min: 1, max: 500 },
    { key: 'carbs_g', label: 'Carbohydrates', unit: 'g', min: 1, max: 1000 },
    { key: 'fat_g', label: 'Fat', unit: 'g', min: 1, max: 400 },
    { key: 'fiber_g', label: 'Fiber', unit: 'g', min: 1, max: 100 },
];

export default function NutritionGoalsScreen({ navigation, route }) {
    const athleteId = route.params?.athleteId || 'athlete_01';
    const [values, setValues] = useState({
        daily_calories: '2400', protein_g: '120', carbs_g: '300', fat_g: '60', fiber_g: '30',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get(`/athlete/${athleteId}/nutrition/goals`);
                const d = res?.data || {};
                if (d.daily_calories) {
                    setValues({
                        daily_calories: String(Math.round(d.daily_calories)),
                        protein_g: String(Math.round(d.protein_g || 120)),
                        carbs_g: String(Math.round(d.carbs_g || 300)),
                        fat_g: String(Math.round(d.fat_g || 60)),
                        fiber_g: String(Math.round(d.fiber_g || 30)),
                    });
                }
            } catch { }
            setLoading(false);
        })();
    }, [athleteId]);

    const handleSave = async () => {
        for (const f of FIELDS) {
            const v = parseFloat(values[f.key]);
            if (isNaN(v) || v < f.min || v > f.max) {
                Alert.alert('Validation', `${f.label} must be ${f.min}–${f.max} ${f.unit}`);
                return;
            }
        }
        setSaving(true);
        try {
            await api.post(`/athlete/${athleteId}/nutrition/goals`, {
                daily_calories: parseFloat(values.daily_calories),
                protein_g: parseFloat(values.protein_g),
                carbs_g: parseFloat(values.carbs_g),
                fat_g: parseFloat(values.fat_g),
                fiber_g: parseFloat(values.fiber_g),
            });
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to save goals');
        }
        setSaving(false);
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Nutrition Goals</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
                    <Text style={[s.saveText, saving && { opacity: 0.4 }]}>{saving ? '...' : 'Save'}</Text>
                </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} /> : (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <Text style={s.hint}>Set your daily macro targets. Sport-specific defaults are pre-filled if you haven't set custom goals.</Text>
                    {FIELDS.map(f => (
                        <View key={f.key} style={s.fieldCard}>
                            <Text style={s.fieldLabel}>{f.label}</Text>
                            <View style={s.inputRow}>
                                <TextInput
                                    style={s.input}
                                    value={values[f.key]}
                                    onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                                    keyboardType="numeric"
                                    selectTextOnFocus
                                />
                                <Text style={s.unit}>{f.unit}</Text>
                            </View>
                            <Text style={s.range}>Range: {f.min}–{f.max} {f.unit}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 60 },
    backText: { color: C.cyan, fontSize: 14 },
    title: { color: C.text, fontSize: 17, fontWeight: '700' },
    saveBtn: { width: 60, alignItems: 'flex-end' },
    saveText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
    hint: { color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 },
    fieldCard: { backgroundColor: C.surf, borderRadius: 12, padding: 14, marginBottom: 10 },
    fieldLabel: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: C.text, fontSize: 18, fontWeight: '700', borderWidth: 1, borderColor: C.border },
    unit: { color: C.muted, fontSize: 14, width: 44 },
    range: { color: C.muted, fontSize: 11, marginTop: 6 },
});
