// LoginScreen — theme-aware (Bloomberg + Classic both supported via the
// shared C/T/P tokens). Email + password, single submit, server error
// surfacing, link to register.

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

export default function LoginScreen({ navigation }) {
    const ins = useSafeAreaInsets();
    const clock = useLiveClock();
    const { login } = useAuth();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy]         = useState(false);
    const [error, setError]       = useState(null);

    const canSubmit = isEmail(email) && password.length >= 8 && !busy;

    const onSubmit = async () => {
        setError(null);
        if (!canSubmit) {
            setError('Enter a valid email and an 8+ character password.');
            return;
        }
        setBusy(true);
        try {
            await login(email, password);
            // AuthGate will swap to the main stack automatically.
        } catch (e) {
            setError(e?.message || 'Login failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <TerminalScreen style={{ paddingTop: ins.top }}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
            <SysBar online={null} identity="AUTH.LOGIN" clock={clock} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 40 }} keyboardShouldPersistTaps="handled">
                    <View style={s.hero}>
                        <Text style={s.prompt}>{'> auth --login'}</Text>
                        <Text style={s.title}>SIGN IN</Text>
                        <Text style={s.sub}>BIO-PASSPORT · ATHLETE TERMINAL</Text>
                    </View>

                    <Panel>
                        <Header title="CREDENTIALS" />
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
                                returnKeyType="next"
                            />
                        </View>
                        <View style={s.field}>
                            <Text style={s.label}>PASSWORD</Text>
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
                                returnKeyType="go"
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
                            <Text style={[s.ctaText, !canSubmit && { color: C.muted }]}>[SPACE] SIGN IN  ▸</Text>
                        )}
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate('Register')} style={s.altLink}>
                        <Text style={s.altText}>NEW HERE? <Text style={{ color: C.text }}>CREATE ACCOUNT</Text></Text>
                    </Pressable>

                    <Footer lines={[
                        { text: `BUILD.2.3.0 · ${nowISO()}` },
                        { text: 'PROTOCOL HTTPS · BCRYPT(12) · JWT HS256', color: C.muted },
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
