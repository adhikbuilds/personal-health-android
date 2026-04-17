// ActiveBharat — Minimal App
// 4 tabs: Home, Train, Progress, Profile
// 5 stacks: GhostSkeleton, HeartRate, TrainingPlan, ScoreCard, FitnessTest

import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from './src/context/UserContext';
import ErrorBoundary from './src/ErrorBoundary';

// Tabs
import HomeScreen from './src/screens/HomeScreen';
import TrainScreen from './src/screens/TrainScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Stacks
import GhostSkeletonScreen from './src/screens/GhostSkeletonScreen';
import RPPGScreen from './src/screens/RPPGScreen';
import TrainingPlanScreen from './src/screens/TrainingPlanScreen';
import ScoreCardScreen from './src/screens/ScoreCardScreen';
import FitnessTestScreen from './src/screens/FitnessTestScreen';
import NutritionScreen from './src/screens/NutritionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CYAN = '#06b6d4';
const MUTED = '#4b5563';
const BG = '#000';

const TAB_LABELS = { Home: 'HOME', Train: 'TRAIN', Progress: 'PROGRESS', Profile: 'YOU' };

// ─── Toast ──────────────────────────────────────────────────────────────────

function ToastOverlay({ message }) {
    const insets = useSafeAreaInsets();
    if (!message) return null;
    return (
        <View style={[styles.toast, { bottom: 80 + insets.bottom }]} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
        </View>
    );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function TabNavigator({ showToast }) {
    const insets = useSafeAreaInsets();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: () => null,
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                        {TAB_LABELS[route.name]}
                    </Text>
                ),
                tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) + 4, height: 52 + Math.max(insets.bottom, 8) }],
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home">
                {(props) => <HomeScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Train">
                {(props) => <TrainScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Progress" component={ProgressScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

// ─── Root Stack ─────────────────────────────────────────────────────────────

function AppNavigator({ showToast }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs">
                {(props) => <TabNavigator {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen
                name="GhostSkeleton"
                component={GhostSkeletonScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
                name="HeartRate"
                component={RPPGScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
                name="TrainingPlan"
                component={TrainingPlanScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="ScoreCard"
                component={ScoreCardScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
                name="FitnessTest"
                component={FitnessTestScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="Nutrition"
                component={NutritionScreen}
                options={{ animation: 'slide_from_right' }}
            />
        </Stack.Navigator>
    );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function App() {
    const [toastMsg, setToastMsg] = useState('');
    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3500);
    }, []);

    return (
        <SafeAreaProvider>
            <StatusBar style="light" backgroundColor="transparent" translucent />
            <ErrorBoundary>
                <UserProvider>
                    <NavigationContainer>
                        <AppNavigator showToast={showToast} />
                    </NavigationContainer>
                    <ToastOverlay message={toastMsg} />
                </UserProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === 'android' ? 'monospace' : 'Menlo';

const styles = StyleSheet.create({
    // Terminal-style tab bar: dead black, mono labels, amber accent when active.
    tabBar: {
        backgroundColor: '#000',
        borderTopColor: '#262B31',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 6,
        paddingTop: 6,
        elevation: 0,
    },
    tabLabel: { fontSize: 10, fontWeight: '700', color: '#5C4600', letterSpacing: 1.5, fontFamily: MONO_FONT },
    tabLabelActive: { color: '#FFAA00' },
    toast: {
        position: 'absolute', left: 16, right: 16,
        backgroundColor: '#000',
        borderWidth: 1, borderColor: '#FFAA00',
        padding: 12, alignItems: 'center',
        elevation: 99,
    },
    toastText: { color: '#FFAA00', fontWeight: '700', fontSize: 11, letterSpacing: 1.5, fontFamily: MONO_FONT },
});
