// DrillTile — ST-05: Reusable drill tile with video thumbnail (looping)
// Used by OnboardingScreen step 1, DrillPickerScreen, and web PlanPage

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';
import { C } from '../styles/colors';
import { API_BASE } from '../constants';

function resolveVideoUrl(url) {
    if (!url) return null;
    if (/^https?:/i.test(url)) return url;
    return `${API_BASE}${url}`;
}

const BG = C.bg;
const SURF = C.surf;
const TEXT = C.text;
const MUTED = C.muted;
const ACCENT = C.cyan;

export default function DrillTile({ drill, onPress, showSportChip = true, selectedSport = null }) {
    const [videoFailed, setVideoFailed] = useState(false);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(drill.key);
    };

    const isPrimary = selectedSport === drill.key;
    const videoSource = !videoFailed ? resolveVideoUrl(drill.video_url) : null;

    return (
        <TouchableOpacity
            style={s.tile}
            activeOpacity={0.85}
            onPress={handlePress}
        >
            <View style={[s.videoWrap, { backgroundColor: SURF }]}>
                {videoSource ? (
                    <Video
                        source={{ uri: videoSource }}
                        style={StyleSheet.absoluteFill}
                        shouldPlay
                        isMuted
                        isLooping
                        resizeMode={ResizeMode.COVER}
                        onError={() => setVideoFailed(true)}
                    />
                ) : (
                    <Text style={s.videoPlaceholder}>▶</Text>
                )}
                <Text style={s.videoDuration}>3s</Text>
            </View>

            <Text style={[s.label, isPrimary && { color: ACCENT }]}>
                {drill.label}
            </Text>

            {drill.cues && drill.cues.length > 0 && (
                <Text style={s.cue} numberOfLines={1}>
                    {drill.cues[0]}
                </Text>
            )}

            {showSportChip && isPrimary && (
                <View style={s.chip}>
                    <Text style={s.chipText}>your sport</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    tile: {
        flex: 1,
        margin: 5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    videoWrap: {
        width: '100%',
        height: 120,
        backgroundColor: SURF,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    videoPlaceholder: {
        fontSize: 40,
        color: ACCENT,
        opacity: 0.4,
    },
    videoDuration: {
        position: 'absolute',
        bottom: 6,
        right: 8,
        fontSize: 11,
        color: MUTED,
        fontWeight: '700',
    },
    label: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    cue: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 16,
    },
    chip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(6,182,212,0.12)',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
    },
    chipText: {
        color: ACCENT,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
});
