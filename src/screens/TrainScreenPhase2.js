import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

/**
 * Phase 2 Edge AI Training Screen.
 * Uses react-native-vision-camera + C++ Frame Processors to extract 
 * MediaPipe landmarks natively at 60fps with ZERO bridge latency.
 * Streams ONLY the pure float arrays to the FastAPI WebSocket.
 * 
 * NOTE: This requires compiling the app natively (Android Studio / Xcode).
 * It will not work in the standard Expo Go client.
 */
export default function TrainScreenPhase2({ route, navigation }) {
    const { session_id, sport } = route.params;
    const device = useCameraDevice('front');
    const [metrics, setMetrics] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        // Connect to FastAPI Phase-Space WebSocket Stream
        wsRef.current = api.connectLiveStream(
            session_id,
            (newMetrics) => {
                // Update React UI at 60fps with kinematics computed in Python
                setMetrics(newMetrics);
            },
            (err) => console.error("WS Error:", err),
            () => console.log("WS Closed")
        );

        return () => {
            if (wsRef.current) wsRef.current.close();
            api.endSession(session_id);
        };
    }, []);

    // The function that runs on the JS thread to handle data from the C++ thread
    const handlePointsFromCPP = Worklets.createRunOnJS((points) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Push the 528 bytes of float data straight out the socket
            wsRef.current.send(JSON.stringify({ points }));
        }
    });

    // Native C++ Frame Processor Interceptor hook (Runs on Worklet Thread)
    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        // Calls the JNI Native Module we wrote in C++
        // @ts-ignore
        const result = extractPose(frame);

        if (result && result.points) {
            // Marshall back to JS thread smoothly
            handlePointsFromCPP(result.points);
        }
    }, []);

    if (device == null) return <Text>Loading Edge AI Camera...</Text>;

    return (
        <View style={StyleSheet.absoluteFill}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                frameProcessor={frameProcessor}
                frameProcessorFps={60} // Run inference at 60 FPS
            />

            {/* Live Telemetry Overlay */}
            <View style={styles.telemetryOverlay}>
                <Text style={styles.title}>PHASE 2: EDGE AI METRICS</Text>
                {metrics ? (
                    <>
                        <Text style={styles.metric}>Form Score: {metrics.form_score.toFixed(1)}/100</Text>
                        <Text style={styles.metric}>Phase Space DM: {metrics.phase_space_dm.toFixed(3)}</Text>
                        <Text style={styles.metric}>Torsion Err: {metrics.torsion_error.toFixed(1)}°</Text>
                        <Text style={styles.metric}>Dimensionless Jerk: {metrics.dimensionless_jerk.toFixed(4)}</Text>
                        <Text style={styles.metric}>Status: {metrics.phase}</Text>

                        {metrics.primary_feedback && (
                            <View style={styles.feedbackBox}>
                                <Text style={styles.feedbackText}>{metrics.primary_feedback}</Text>
                            </View>
                        )}
                    </>
                ) : (
                    <Text style={styles.metric}>Waiting for telemetry stream...</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    telemetryOverlay: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#00F0FF',
    },
    title: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
    metric: { color: '#00F0FF', fontSize: 18, fontFamily: 'monospace', marginVertical: 4 },
    feedbackBox: { backgroundColor: '#FF3366', padding: 10, borderRadius: 8, marginTop: 15 },
    feedbackText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }
});
