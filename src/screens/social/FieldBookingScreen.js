import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';

const C = {
    bg: '#0f172a', surf: '#1e293b', deep: '#0d1829', cyan: '#06b6d4',
    orange: '#f97316', green: '#22c55e', red: '#ef4444',
    muted: '#64748b', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)',
};

const DUMMY_FIELDS = [
    { id: 'f1', name: 'Ranchi Sports Complex', type: 'Turf', distance: '2.4 km', time: '5:00 PM - 6:00 PM', image: '🏟️' },
    { id: 'f2', name: 'JRD Tata Sports Complex', type: 'Hardcourt', distance: '5.1 km', time: '7:00 AM - 8:00 AM', image: '🏀' },
    { id: 'f3', name: 'Morabadi Ground', type: 'Grass', distance: '1.2 km', time: '6:00 PM - 7:00 PM', image: '⚽' },
];

export default function FieldBookingScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    
    const handleBook = (field) => {
        if (bookings.find(b => b.id === field.id)) {
            Alert.alert("Already Booked", "You have already booked this field.");
            return;
        }
        setBookings([...bookings, field]);
    };

    const handleCancel = (fieldId) => {
        setBookings(bookings.filter(b => b.id !== fieldId));
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topbar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Field Booking</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {bookings.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>MY BOOKINGS</Text>
                        {bookings.map(b => (
                            <View key={`b-${b.id}`} style={[s.card, { borderColor: C.green + '50', borderWidth: 1 }]}>
                                <View style={s.cardRow}>
                                    <Text style={s.icon}>{b.image}</Text>
                                    <View style={s.cardInfo}>
                                        <Text style={s.name}>{b.name}</Text>
                                        <Text style={s.details}>{`${b.type} • ${b.time}`}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(b.id)}>
                                    <Text style={s.cancelText}>Cancel Booking</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={s.section}>
                    <Text style={s.sectionTitle}>AVAILABLE FIELDS</Text>
                    {DUMMY_FIELDS.map(f => {
                        const isBooked = bookings.some(b => b.id === f.id);
                        return (
                            <View key={f.id} style={s.card}>
                                <View style={s.cardRow}>
                                    <Text style={s.icon}>{f.image}</Text>
                                    <View style={s.cardInfo}>
                                        <Text style={s.name}>{f.name}</Text>
                                        <Text style={s.details}>{`${f.type} • ${f.distance}`}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={[s.bookBtn, isBooked && s.bookBtnDisabled]} 
                                    onPress={() => handleBook(f)}
                                    disabled={isBooked}
                                >
                                    <Text style={[s.bookText, isBooked && { color: C.muted }]}>
                                        {isBooked ? 'Booked' : 'Book Slot'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: C.surf, borderBottomWidth: 1, borderBottomColor: C.border },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
    backText: { color: C.text, fontSize: 13, fontWeight: '700' },
    title: { color: C.text, fontSize: 18, fontWeight: '900' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
    card: { backgroundColor: C.surf, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    icon: { fontSize: 28, marginRight: 12 },
    cardInfo: { flex: 1 },
    name: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 2 },
    details: { fontSize: 11, color: C.muted },
    bookBtn: { backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
    bookBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'transparent' },
    bookText: { color: C.cyan, fontWeight: '800', fontSize: 13 },
    cancelBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    cancelText: { color: C.red, fontWeight: '800', fontSize: 13 },
});
