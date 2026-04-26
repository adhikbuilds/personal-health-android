import React, { useRef, useEffect, useState } from 'react';
import {
    View, StyleSheet, SafeAreaView, Text, TouchableOpacity, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { PLAYFIELDS } from '../../data/constants';
import { API_BASE } from '../../services/api';

// Map served from the proxy-server /map route (no Live Server needed)
const DEV_MAP_URL = `${API_BASE}/map`;

const C = { bg: '#FBFBF8', cyan: '#FC4C02', text: '#242428', muted: '#9CA3AF', surf: '#FFFFFF' };

const FILTER_PILLS = [
    { label: 'Challenges', icon: '⚡', action: 'showChallenges' },
    { label: 'Fields', icon: '🏟️', action: 'showFields' },
    { label: 'Events', icon: '🏆', action: 'showEvents' },
    { label: 'Athletes', icon: '👤', action: 'showAthletes' },
    { label: 'Clans', icon: '🛡️', action: 'showClans' },
    { label: 'Friends', icon: '👥', action: 'showFriends' },
];

export default function MapScreen() {
    const webRef = useRef(null);
    const [gpsStatus, setGpsStatus] = useState('idle'); // idle | granted | denied | active
    const [lastCoords, setLastCoords] = useState(null);
    const locationSub = useRef(null);

    // Request GPS permission and start watching position
    useEffect(() => {
        let alive = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setGpsStatus('denied');
                return;
            }
            setGpsStatus('granted');

            // Subscribe to continuous position updates
            locationSub.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 5,   // update every 5m moved
                    timeInterval: 10000, // or every 10s, whichever first
                },
                (loc) => {
                    if (!alive) return;
                    const { latitude, longitude } = loc.coords;
                    setLastCoords({ lat: latitude, lng: longitude });
                    setGpsStatus('active');

                    // Send real position to the WebView map
                    if (webRef.current) {
                        webRef.current.postMessage(JSON.stringify({
                            type: 'gps',
                            lat: latitude,
                            lng: longitude,
                        }));
                    }
                }
            );
        })();

        return () => {
            alive = false;
            locationSub.current?.remove();
        };
    }, []);

    // When map loads, seed it with playfield pins and current location
    const onMapLoad = () => {
        if (!webRef.current) return;
        // Send all playfields for the map to render as pins
        webRef.current.postMessage(JSON.stringify({
            type: 'initPins',
            fields: PLAYFIELDS.map(f => ({
                name: f.name, type: f.type, status: f.status,
                lat: f.coords.lat, lng: f.coords.lng,
            })),
        }));
        // If we already have a fix, push it immediately
        if (lastCoords) {
            webRef.current.postMessage(JSON.stringify({
                type: 'gps', lat: lastCoords.lat, lng: lastCoords.lng,
            }));
        }
    };

    const sendToMap = (action) => {
        if (webRef.current) {
            webRef.current.postMessage(JSON.stringify({ type: 'filter', action }));
        }
    };

    const gpsDot = gpsStatus === 'active' ? C.cyan
        : gpsStatus === 'granted' ? '#facc15'
            : gpsStatus === 'denied' ? '#ef4444'
                : C.muted;

    return (
        <SafeAreaView style={s.safe}>
            {/* Floating top bar */}
            <View style={s.topBar}>
                <View style={s.titleRow}>
                    <Text style={s.title}>Playfield Map</Text>
                    <View style={s.gpsBadge}>
                        <View style={[s.gpsDot, { backgroundColor: gpsDot }]} />
                        <Text style={[s.gpsText, { color: gpsDot }]}>
                            {gpsStatus === 'active' ? `GPS: ${lastCoords?.lat?.toFixed(5)}, ${lastCoords?.lng?.toFixed(5)}`
                                : gpsStatus === 'granted' ? 'Getting GPS fix...'
                                    : gpsStatus === 'denied' ? 'GPS denied'
                                        : 'GPS pending'}
                        </Text>
                    </View>
                </View>
                <View style={s.pills}>
                    {FILTER_PILLS.map(p => (
                        <TouchableOpacity key={p.action} style={s.pill} onPress={() => sendToMap(p.action)} activeOpacity={0.8}>
                            <Text style={s.pillText}>{`${p.icon} ${p.label}`}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <WebView
                ref={webRef}
                source={{ uri: DEV_MAP_URL }}
                style={s.webview}
                javaScriptEnabled
                domStorageEnabled
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                geolocationEnabled
                mixedContentMode="always"
                onLoad={onMapLoad}
                onMessage={(event) => {
                    try {
                        const msg = JSON.parse(event.nativeEvent.data);
                        console.log('[MapScreen ←]', msg);
                    } catch { }
                }}
                onError={(e) => console.warn('[WebView Error]', e.nativeEvent.description)}
                onHttpError={(e) => console.warn('[WebView HTTP Error]', e.nativeEvent.statusCode)}
                renderLoading={() => (
                    <View style={s.loadingView}>
                        <Text style={s.loadingText}>🗺️ Loading Playfield Map...</Text>
                        <Text style={s.loadingHint}>
                            {'Make sure VS Code Live Server is running on port 5500,\nor: npx serve . --port 5500'}
                        </Text>
                    </View>
                )}
                startInLoadingState
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    topBar: {
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { color: C.text, fontWeight: '900', fontSize: 18 },
    gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    gpsDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
    gpsText: { fontSize: 9, fontWeight: '700' },
    pills: { flexDirection: 'row', flexWrap: 'wrap' },
    pill: {
        backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: 99,
        paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)',
        marginRight: 8, marginBottom: 4,
    },
    pillText: { color: C.cyan, fontWeight: '700', fontSize: 11 },
    webview: { flex: 1 },
    loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFBF8', padding: 24 },
    loadingText: { color: C.cyan, fontWeight: '700', fontSize: 16, marginBottom: 12 },
    loadingHint: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 18 },
});
