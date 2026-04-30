import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
    ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const ORANGE = '#FC4C02';
const DARK   = '#242428';
const GRAY   = '#6D6D78';
const DIM    = '#9CA3AF';
const LIGHT  = '#F7F7FA';
const BORDER = '#E6E6EA';
const BG     = '#FFFFFF';
const RED    = '#DC2626';

function isEmail(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();
    const [name,     setName]     = useState('');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [busy,     setBusy]     = useState(false);
    const [error,    setError]    = useState(null);
    const [showPass, setShowPass] = useState(false);

    const canSubmit = name.trim().length >= 1 && isEmail(email) && password.length >= 8 && !busy;

    const onSubmit = async () => {
        setError(null);
        if (!canSubmit) { setError('Name, valid email, and 8+ character password required.'); return; }
        setBusy(true);
        try {
            await register(email.trim(), password, name.trim());
        } catch (e) {
            setError(e?.message || 'Registration failed. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color={DARK} />
                    </TouchableOpacity>

                    <View style={s.header}>
                        <Text style={s.eyebrow}>PERSONAL HEALTH</Text>
                        <Text style={s.title}>Create account</Text>
                        <Text style={s.sub}>Your bio-passport. Your data. Your progress.</Text>
                    </View>

                    <View style={s.card}>
                        <View style={s.field}>
                            <Text style={s.label}>Full Name</Text>
                            <TextInput
                                style={s.input}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                placeholder="Arjun Singh"
                                placeholderTextColor={DIM}
                                editable={!busy}
                                maxLength={80}
                            />
                        </View>
                        <View style={s.field}>
                            <Text style={s.label}>Email</Text>
                            <TextInput
                                style={s.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                placeholder="you@example.com"
                                placeholderTextColor={DIM}
                                editable={!busy}
                            />
                        </View>
                        <View style={[s.field, { marginBottom: 0 }]}>
                            <Text style={s.label}>Password <Text style={{ color: DIM, fontWeight: '500' }}>(min 8 chars)</Text></Text>
                            <View style={s.inputRow}>
                                <TextInput
                                    style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPass}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="••••••••"
                                    placeholderTextColor={DIM}
                                    editable={!busy}
                                    onSubmitEditing={onSubmit}
                                />
                                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass((v) => !v)}>
                                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={GRAY} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {error && (
                        <View style={s.errBox}>
                            <Ionicons name="alert-circle-outline" size={14} color={RED} />
                            <Text style={s.errText}>{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[s.cta, !canSubmit && s.ctaDisabled]}
                        onPress={onSubmit}
                        disabled={!canSubmit}
                        activeOpacity={0.85}
                    >
                        {busy
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.ctaText}>Create Account</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Login')}>
                        <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Sign in</Text></Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: BG },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

    header:  { marginTop: 24, marginBottom: 28 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 1.2, marginBottom: 8 },
    title:   { fontSize: 28, fontWeight: '800', color: DARK, letterSpacing: -0.5 },
    sub:     { fontSize: 14, color: GRAY, marginTop: 6 },

    card:    { backgroundColor: LIGHT, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
    field:   { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
    label:   { fontSize: 11, fontWeight: '700', color: GRAY, letterSpacing: 0.5, marginBottom: 6 },
    input:   { fontSize: 15, color: DARK, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: BG },
    inputRow:{ flexDirection: 'row' },
    eyeBtn:  { width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderTopRightRadius: 8, borderBottomRightRadius: 8 },

    errBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
    errText: { flex: 1, fontSize: 13, color: RED, fontWeight: '600' },

    cta:         { backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
    ctaDisabled: { backgroundColor: DIM },
    ctaText:     { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

    link:     { alignItems: 'center', paddingVertical: 10 },
    linkText: { fontSize: 13, color: GRAY },
    linkBold: { color: ORANGE, fontWeight: '700' },
});
