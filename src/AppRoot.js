// ActiveBharat — App Root
// 4 tabs: Home, Train, Progress, Profile
// 6 stacks: GhostSkeleton, HeartRate, TrainingPlan, ScoreCard, FitnessTest, Nutrition
//
// Required lazily by App.js AFTER the active theme has been applied so all
// screen modules below capture the right token values in their StyleSheets.

import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from './context/UserContext';
import ErrorBoundary from './ErrorBoundary';
import { C, T, P } from './styles/colors';

import HomeScreen from './screens/HomeScreen';
import TrainScreen from './screens/TrainScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProfileScreen from './screens/ProfileScreen';

import GhostSkeletonScreen from './screens/GhostSkeletonScreen';
import RPPGScreen from './screens/RPPGScreen';
import TrainingPlanScreen from './screens/TrainingPlanScreen';
import ScoreCardScreen from './screens/ScoreCardScreen';
import FitnessTestScreen from './screens/FitnessTestScreen';
import NutritionScreen from './screens/NutritionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_LABELS = { Home: 'HOME', Train: 'TRAIN', Progress: 'PROGRESS', Profile: 'YOU' };

function ToastOverlay({ message }) {
    const insets = useSafeAreaInsets();
    if (!message) return null;
    return (
        <View style={[styles.toast, { bottom: 80 + insets.bottom }]} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
        </View>
    );
}

function TabLabel({ focused, name }) {
    return (
        <View style={styles.tabLabelWrap}>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {TAB_LABELS[name]}
            </Text>
            <View style={[styles.tabUnderline, focused && styles.tabUnderlineActive]} />
        </View>
    );
}

function TabNavigator({ showToast }) {
    const insets = useSafeAreaInsets();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: () => null,
                tabBarLabel: ({ focused }) => <TabLabel focused={focused} name={route.name} />,
                tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) + 4, height: 56 + Math.max(insets.bottom, 8) }],
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

function AppNavigator({ showToast }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs">
                {(props) => <TabNavigator {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen name="GhostSkeleton" component={GhostSkeletonScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="HeartRate" component={RPPGScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="TrainingPlan" component={TrainingPlanScreen}
                options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ScoreCard" component={ScoreCardScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="FitnessTest" component={FitnessTestScreen}
                options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Nutrition" component={NutritionScreen}
                options={{ animation: 'slide_from_right' }} />
        </Stack.Navigator>
    );
}

export default function AppRoot() {
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

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: P.tabBarBg,
        borderTopColor: P.tabBarBrd,
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 6,
        paddingTop: 6,
        elevation: 0,
    },
    tabLabelWrap:    { alignItems: 'center', justifyContent: 'center' },
    tabLabel:        { fontSize: 10, fontWeight: '700', color: P.tabBarOff, letterSpacing: 1.5, fontFamily: T.MONO },
    tabLabelActive:  { color: P.tabBarOn },
    tabUnderline:    { height: 2, width: 18, marginTop: 4, backgroundColor: 'transparent' },
    tabUnderlineActive: { backgroundColor: P.tabBarOn },
    toast: {
        position: 'absolute', left: 16, right: 16,
        backgroundColor: P.toastBg,
        borderWidth: 1, borderColor: P.toastBrd,
        padding: 12, alignItems: 'center',
        elevation: 99,
    },
    toastText: { color: P.toastFg, fontWeight: '700', fontSize: 11, letterSpacing: 1.5, fontFamily: T.MONO },
});
