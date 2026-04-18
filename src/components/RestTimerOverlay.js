import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Speech from 'expo-speech';

const BG = '#0a0e1a';
const MUTED = '#9ca3af';
const ACCENT = '#06b6d4';
const TEXT = '#f9fafb';
const SURFACE = '#1f2937';

const SPEECH_OPTS = { rate: 0.85, pitch: 1.0, language: 'en' };

export default function RestTimerOverlay({ visible, sport, restSeconds = 60, onComplete, onStopSession }) {
    const [remaining, setRemaining] = useState(restSeconds);
    const intervalRef = useRef(null);
    const completedRef = useRef(false);
    const speechFailedRef = useRef(false);

    const safeSpeak = (text) => {
        if (speechFailedRef.current) return;
        try {
            Speech.stop();
            Speech.speak(text, {
                ...SPEECH_OPTS,
                onError: () => { speechFailedRef.current = true; },
            });
        } catch (_) {
            speechFailedRef.current = true;
        }
    };

    useEffect(() => {
        if (!visible) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            completedRef.current = false;
            setRemaining(restSeconds);
            return;
        }

        completedRef.current = false;
        speechFailedRef.current = false;
        setRemaining(restSeconds);

        intervalRef.current = setInterval(() => {
            setRemaining((prev) => {
                const next = prev - 1;
                return next;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [visible, restSeconds]);

    useEffect(() => {
        if (!visible) return;

        if (remaining === 30) safeSpeak('thirty seconds');
        else if (remaining === 10) safeSpeak('ten seconds');
        else if (remaining === 5) safeSpeak('five');
        else if (remaining === 4) safeSpeak('four');
        else if (remaining === 3) safeSpeak(`Next set: ${sport}`);
        else if (remaining === 2) safeSpeak('two');
        else if (remaining === 1) safeSpeak('one');
        else if (remaining === 0 && !completedRef.current) {
            completedRef.current = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            safeSpeak('begin');
            setTimeout(() => onComplete?.(), 500);
        }
    }, [remaining, visible]);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={false}
            statusBarTranslucent
            onRequestClose={() => {}}
        >
            <View style={s.root}>
                <View style={s.timerWrap}>
                    <Text style={s.countdown}>{remaining > 0 ? remaining : 0}</Text>
                    <Text style={s.label}>REST</Text>
                </View>

                <View style={s.stopWrap}>
                    <TouchableOpacity style={s.stopBtn} onPress={onStopSession} activeOpacity={0.9}>
                        <Text style={s.stopText}>stop session</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        justifyContent: 'space-between',
    },
    timerWrap: {
        flex: 0.7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdown: {
        color: ACCENT,
        fontSize: 220,
        fontWeight: '900',
        lineHeight: 230,
        includeFontPadding: false,
    },
    label: {
        color: MUTED,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 4,
        marginTop: 8,
    },
    stopWrap: {
        flex: 0.3,
        paddingHorizontal: 16,
        paddingBottom: 24,
        justifyContent: 'center',
    },
    stopBtn: {
        flex: 1,
        backgroundColor: SURFACE,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopText: {
        color: TEXT,
        fontSize: 18,
        fontWeight: '800',
        textTransform: 'lowercase',
    },
});
