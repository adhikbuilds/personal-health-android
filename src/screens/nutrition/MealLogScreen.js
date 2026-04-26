// MealLogScreen — WN-16 (food search & add)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../../styles/colors';
import api from '../../services/api';

const RECENT_KEY = '@meal_recent_foods';
const MAX_RECENT = 20;

export default function MealLogScreen({ navigation, route }) {
    const { athleteId = 'athlete_01', date, slot, quickFoodId, quickQty } = route.params || {};
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [recentFoods, setRecentFoods] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState(null);
    const [qty, setQty] = useState('100');
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(RECENT_KEY);
                const list = raw ? JSON.parse(raw) : [];
                setRecentFoods(list);
                // Handle quick-add prefill
                if (quickFoodId) {
                    const prefilled = list.find(f => f.food_id === quickFoodId);
                    if (prefilled) { setSelected(prefilled); setQty(String(quickQty || prefilled.serving_g || 100)); }
                    else {
                        const foodRes = await api.get(`/foods/${quickFoodId}`);
                        if (foodRes) { setSelected(foodRes); setQty(String(quickQty || foodRes.serving_g || 100)); }
                    }
                }
            } catch { }
        })();
    }, [quickFoodId, quickQty]);

    const search = useCallback(async (q) => {
        if (!q.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            const res = await api.get(`/foods?q=${encodeURIComponent(q)}&limit=20`);
            setResults(res?.foods || []);
        } catch { setResults([]); }
        setSearching(false);
    }, []);

    const handleQueryChange = (text) => {
        setQuery(text);
        clearTimeout(debounceRef.current);
        if (!text.trim()) { setResults([]); return; }
        debounceRef.current = setTimeout(() => search(text), 300);
    };

    const computeMacros = (food, qtyG) => {
        const factor = qtyG / 100;
        const p = food.per_100g || {};
        return {
            calories: Math.round((p.calories || 0) * factor),
            protein_g: Math.round((p.protein_g || 0) * factor * 10) / 10,
            carbs_g: Math.round((p.carbs_g || 0) * factor * 10) / 10,
            fat_g: Math.round((p.fat_g || 0) * factor * 10) / 10,
        };
    };

    const handleSave = async () => {
        const qtyNum = parseFloat(qty);
        if (!selected) { Alert.alert('Select a food first'); return; }
        if (!qtyNum || qtyNum <= 0) { Alert.alert('Enter a quantity greater than 0'); return; }
        setSaving(true);
        try {
            await api.post(`/athlete/${athleteId}/meals`, {
                date,
                slot,
                items: [{ food_id: selected.food_id, qty_g: qtyNum }],
            });
            // Update recent foods
            const raw = await AsyncStorage.getItem(RECENT_KEY);
            const prev = raw ? JSON.parse(raw) : [];
            const updated = [selected, ...prev.filter(f => f.food_id !== selected.food_id)].slice(0, MAX_RECENT);
            await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
            // Update per-slot recent (for quick add)
            const slotKey = `@recent_meals_${slot}`;
            const macros = computeMacros(selected, qtyNum);
            const slotEntry = { label: selected.name, calories: macros.calories, food_id: selected.food_id, qty_g: qtyNum };
            const rawSlot = await AsyncStorage.getItem(slotKey);
            const prevSlot = rawSlot ? JSON.parse(rawSlot) : [];
            const updatedSlot = [slotEntry, ...prevSlot.filter(f => f.food_id !== selected.food_id)].slice(0, 20);
            await AsyncStorage.setItem(slotKey, JSON.stringify(updatedSlot));
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to log meal');
        }
        setSaving(false);
    };

    const displayList = query.trim() ? results : recentFoods;
    const qtyNum = parseFloat(qty) || 0;
    const macros = selected ? computeMacros(selected, qtyNum) : null;
    const slotLabel = slot ? slot.charAt(0).toUpperCase() + slot.slice(1) : 'Meal';

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={s.title}>Add to {slotLabel}</Text>
                <TouchableOpacity onPress={handleSave} disabled={!selected || saving} style={s.saveBtn}>
                    <Text style={[s.saveText, (!selected || saving) && { opacity: 0.4 }]}>
                        {saving ? '...' : 'Add'}
                    </Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={s.searchInput}
                placeholder="Search food (e.g. poha, rice, banana)"
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
                returnKeyType="search"
            />

            {selected && (
                <View style={s.selectedCard}>
                    <Text style={s.selectedName}>{selected.name}</Text>
                    <View style={s.qtyRow}>
                        <TouchableOpacity onPress={() => setQty(q => String(Math.max(25, (parseFloat(q) || 100) - 25)))} style={s.qtyBtn}>
                            <Text style={s.qtyBtnText}>-25g</Text>
                        </TouchableOpacity>
                        <TextInput style={s.qtyInput} value={qty} onChangeText={setQty} keyboardType="numeric" selectTextOnFocus />
                        <Text style={s.qtyUnit}>g</Text>
                        <TouchableOpacity onPress={() => setQty(q => String((parseFloat(q) || 100) + 25))} style={s.qtyBtn}>
                            <Text style={s.qtyBtnText}>+25g</Text>
                        </TouchableOpacity>
                    </View>
                    {macros && (
                        <View style={s.macroRow}>
                            <Text style={s.macroItem}>{macros.calories} kcal</Text>
                            <Text style={s.macroItem}>P: {macros.protein_g}g</Text>
                            <Text style={s.macroItem}>C: {macros.carbs_g}g</Text>
                            <Text style={s.macroItem}>F: {macros.fat_g}g</Text>
                        </View>
                    )}
                </View>
            )}

            {searching && <ActivityIndicator color={C.cyan} style={{ marginVertical: 12 }} />}

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 12 }}>
                {!query.trim() && displayList.length > 0 && <Text style={s.sectionLabel}>Recent Foods</Text>}
                {query.trim() && displayList.length === 0 && !searching && (
                    <Text style={s.emptyText}>No results for "{query}"</Text>
                )}
                {displayList.map((food, i) => (
                    <TouchableOpacity
                        key={food.food_id || i}
                        style={[s.foodItem, selected?.food_id === food.food_id && s.foodItemSelected]}
                        onPress={() => { setSelected(food); setQty(String(food.serving_g || 100)); }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={s.foodName}>{food.name}</Text>
                            <Text style={s.foodMeta}>
                                {food.cuisine || ''}{food.cuisine ? ' · ' : ''}{food.per_100g?.calories || 0} kcal/100g
                                {food.serving_g ? ` · ${food.serving_g}g serving` : ''}
                            </Text>
                        </View>
                        {selected?.food_id === food.food_id && <Text style={{ color: C.cyan, marginLeft: 8 }}>✓</Text>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 60 },
    backText: { color: C.muted, fontSize: 14 },
    title: { color: C.text, fontSize: 17, fontWeight: '700' },
    saveBtn: { width: 60, alignItems: 'flex-end' },
    saveText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
    searchInput: { marginHorizontal: 14, marginBottom: 8, backgroundColor: C.surf, borderRadius: 10, padding: 12, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
    selectedCard: { margin: 12, backgroundColor: C.surf, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    selectedName: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 10 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    qtyBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    qtyBtnText: { color: C.cyan, fontSize: 13, fontWeight: '600' },
    qtyInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: C.border },
    qtyUnit: { color: C.muted, fontSize: 13 },
    macroRow: { flexDirection: 'row', gap: 12 },
    macroItem: { color: C.textSub, fontSize: 12, fontWeight: '500' },
    sectionLabel: { color: C.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    emptyText: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 32 },
    foodItem: { backgroundColor: C.surf, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    foodItemSelected: { borderColor: C.cyan },
    foodName: { color: C.text, fontSize: 14, fontWeight: '500' },
    foodMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
});
