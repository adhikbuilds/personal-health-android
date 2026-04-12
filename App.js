// ActiveBharat — Minimal App
// 4 tabs: Home, Train, Progress, Profile
// 5 stacks: GhostSkeleton, HeartRate, TrainingPlan, ScoreCard, FitnessTest

import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from './src/context/UserContext';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CYAN = '#06b6d4';
const MUTED = '#64748b';
const BG = '#0f172a';

const TAB_ICONS = { Home: '●', Train: '◉', Progress: '◈', Profile: '○' };
const TAB_LABELS = { Home: 'Home', Train: 'Train', Progress: 'Progress', Profile: 'Profile' };

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
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => (
                    <View style={[styles.tabDot, focused && styles.tabDotActive]}>
                        <Text style={[styles.tabDotText, focused && { color: CYAN }]}>
                            {TAB_ICONS[route.name]}
                        </Text>
                    </View>
                ),
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                        {TAB_LABELS[route.name]}
                    </Text>
                ),
                tabBarStyle: styles.tabBar,
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
            <StatusBar style="light" backgroundColor={BG} />
            <UserProvider>
                <NavigationContainer>
                    <AppNavigator showToast={showToast} />
                </NavigationContainer>
                <ToastOverlay message={toastMsg} />
            </UserProvider>
        </SafeAreaProvider>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: BG,
        borderTopColor: 'rgba(255,255,255,0.06)',
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 0,
    },
    tabDot: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    tabDotActive: { backgroundColor: 'rgba(6,182,212,0.12)' },
    tabDotText: { fontSize: 14, color: MUTED, fontWeight: '600' },
    tabLabel: { fontSize: 9, fontWeight: '700', color: MUTED, marginTop: 1 },
    tabLabelActive: { color: CYAN },
    toast: {
        position: 'absolute', left: 20, right: 20,
        backgroundColor: 'rgba(6,182,212,0.95)',
        borderRadius: 14, padding: 14, alignItems: 'center',
        elevation: 99,
    },
    toastText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
