// RegisterScreen — name + email + password.
// Same theme primitives as LoginScreen. On success, AuthContext flips
// status to 'authed' and AuthGate swaps to the main stack.

import React, { useState } from 'react';
import {
    View, Text, TextInput, Pressable, StyleSheet,
    StatusBar, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, P } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { TerminalScreen, Panel, Header, useLiveClock, SysBar, Footer, nowISO } from '../../components/terminal';

function isEmail(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function RegisterScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const clock = useLiveClock();
    const { register } = useAuth();
    const [name, setName]         = useState('');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy]         = useState(false);
    const [error, setError]       = useState(null);

    const canSubmit =
        name.trim().length >= 1 &&
        isEmail(email) &&
        password.length >= 8 &&
        !busy;

    const onSubmit = async () => {
        setError(null);
        if (!canSubmit) {
            setError('Name, valid email, and 8+ character password are required.');
            return;
        }
        setBusy(true);
        try {
            await register(email, password, name.trim());
        } catch (e) {
            setError(e?.message || 'Registration failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
            <SysBar online={null} identity="AUTH.REGISTER" clock={clock} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 40 }} keyboardShouldPersistTaps="handled">
                    <View style={s.hero}>
                        <Text style={s.prompt}>{'> auth --register'}</Text>
                        <Text style={s.title}>CREATE ACCOUNT</Text>
                        <Text style={s.sub}>NEW BIO-PASSPORT · OWN YOUR DATA</Text>
                    </View>

                    <Panel>
                        <Header title="PROFILE" />
                        <View style={s.field}>
                            <Text style={s.label}>NAME</Text>
                            <TextInput
                                style={s.input}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                placeholder="Full name"
                                placeholderTextColor={C.muted}
                                editable={!busy}
                                maxLength={80}
                            />
                        </View>
                        <View style={s.field}>
                            <Text style={s.label}>EMAIL</Text>
                            <TextInput
                                style={s.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                placeholder="you@example.com"
                                placeholderTextColor={C.muted}
                                editable={!busy}
                            />
                        </View>
                        <View style={s.field}>
                            <Text style={s.label}>PASSWORD · MIN 8 CHARS</Text>
                            <TextInput
                                style={s.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="••••••••"
                                placeholderTextColor={C.muted}
                                editable={!busy}
                                onSubmitEditing={onSubmit}
                            />
                        </View>
                        {error && (
                            <View style={s.errBox}>
                                <Text style={s.errText}>[ERR] {error}</Text>
                            </View>
                        )}
                    </Panel>

                    <Pressable
                        onPress={onSubmit}
                        disabled={!canSubmit}
                        style={({ pressed }) => [s.cta, !canSubmit && s.ctaDisabled, pressed && canSubmit && { backgroundColor: C.surf }]}
                    >
                        {busy ? (
                            <ActivityIndicator size="small" color={C.text} />
                        ) : (
                            <Text style={[s.ctaText, !canSubmit && { color: C.muted }]}>[SPACE] CREATE ACCOUNT  ▸</Text>
                        )}
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate('Login')} style={s.altLink}>
                        <Text style={s.altText}>HAVE AN ACCOUNT? <Text style={{ color: C.text }}>SIGN IN</Text></Text>
                    </Pressable>

                    <Footer lines={[
                        { text: `BUILD.2.3.0 · ${nowISO()}` },
                        { text: 'WE NEVER SHARE YOUR DATA · YOUR BIO-PASSPORT IS YOURS', color: C.muted },
                    ]} />
                </ScrollView>
            </KeyboardAvoidingView>
        </TerminalScreen>
    );
}

const s = StyleSheet.create({
    hero:    { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 },
    prompt:  { fontSize: 11, color: C.textMid, fontFamily: T.MONO, fontWeight: '600' },
    title:   { fontSize: 28, fontWeight: '700', color: C.white, fontFamily: T.MONO, letterSpacing: 1, marginTop: 8 },
    sub:     { fontSize: 11, color: C.textMid, fontFamily: T.MONO, marginTop: 6, letterSpacing: 1 },

    field:   { paddingHorizontal: 12, paddingVertical: 8 },
    label:   { fontSize: 10, color: C.textMid, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    input:   {
        fontSize: 14, color: C.white, fontFamily: T.MONO,
        borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 10,
        backgroundColor: P.headerBg,
    },

    errBox:  { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: P.headerBg },
    errText: { fontSize: 11, color: C.bad, fontFamily: T.MONO, fontWeight: '700', letterSpacing: 0.5 },

    cta:        { margin: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.text },
    ctaDisabled:{ borderColor: C.border },
    ctaText:    { color: C.text, fontFamily: T.MONO, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },

    altLink:    { paddingVertical: 8, alignItems: 'center' },
    altText:    { color: C.muted, fontFamily: T.MONO, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
});
