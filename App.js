// ActiveBharat — Root App with Navigation
// 6 tabs + 9 stack screens (modals + full-screen flows)
import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from './src/context/UserContext';

// Tabs
import HomeScreen         from './src/screens/HomeScreen';
import MetricsScreen      from './src/screens/MetricsScreen';
import TrainScreen        from './src/screens/TrainScreen';
import AcademyScreen      from './src/screens/AcademyScreen';
import HubScreen          from './src/screens/HubScreen';
import MapScreen          from './src/screens/MapScreen';

// Stack screens
import GhostSkeletonScreen from './src/screens/GhostSkeletonScreen';
import RPPGScreen          from './src/screens/RPPGScreen';
import FieldBookingScreen  from './src/screens/FieldBookingScreen';
import LearnSportsScreen   from './src/screens/LearnSportsScreen';
import FitnessTestScreen   from './src/screens/FitnessTestScreen';
import GetActiveScreen     from './src/screens/GetActiveScreen';
import ClassesScreen       from './src/screens/ClassesScreen';
import SocialFeedScreen    from './src/screens/SocialFeedScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CYAN  = '#06b6d4';
const MUTED = '#64748b';
const BG    = '#0f172a';

const TAB_ICONS = {
    Home:    '🏠',
    Lab:     '📊',
    Camera:  '📷',
    Academy: '📚',
    Hub:     '👤',
    Map:     '🗺️',
};

// ─── Toast Overlay ────────────────────────────────────────────────────────────
function ToastOverlay({ message }) {
    const insets = useSafeAreaInsets();
    if (!message) return null;
    return (
        <View style={[styles.toast, { bottom: 80 + insets.bottom }]} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
        </View>
    );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────
function TabNavigator({ showToast }) {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => (
                    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                        <Text style={styles.tabIconText}>{TAB_ICONS[route.name] || '•'}</Text>
                    </View>
                ),
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{route.name}</Text>
                ),
                tabBarStyle:  styles.tabBar,
                headerShown:  false,
            })}
        >
            <Tab.Screen name="Home">
                {(props) => <HomeScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Lab" component={MetricsScreen} />
            <Tab.Screen name="Camera">
                {(props) => <TrainScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Academy">
                {(props) => <AcademyScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Hub">
                {(props) => <HubScreen {...props} showToast={showToast} />}
            </Tab.Screen>
            <Tab.Screen name="Map" component={MapScreen} />
        </Tab.Navigator>
    );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
function AppNavigator({ showToast }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Main tab flow */}
            <Stack.Screen name="Tabs">
                {(props) => <TabNavigator {...props} showToast={showToast} />}
            </Stack.Screen>

            {/* Existing modal flows */}
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
                name="FieldBooking"
                component={FieldBookingScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* New feature screens — all launched from HomeScreen content grid */}
            <Stack.Screen
                name="LearnSports"
                component={LearnSportsScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="FitnessTest"
                component={FitnessTestScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="GetActive">
                {(props) => <GetActiveScreen {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen
                name="Classes"
                component={ClassesScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="SocialFeed"
                component={SocialFeedScreen}
                options={{ animation: 'slide_from_right' }}
            />
        </Stack.Navigator>
    );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
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

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: BG,
        borderTopColor:  'rgba(255,255,255,0.08)',
        borderTopWidth:  1,
        height:          68,
        paddingBottom:   8,
        paddingTop:      6,
        elevation:       20,
        shadowColor:     '#000',
        shadowOpacity:   0.5,
        shadowOffset:    { width: 0, height: -4 },
        shadowRadius:    12,
    },
    tabIconWrap:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tabIconActive: { backgroundColor: 'rgba(6,182,212,0.15)' },
    tabIconText:   { fontSize: 18 },
    tabLabel:      { fontSize: 9, fontWeight: '700', color: MUTED, marginTop: 2 },
    tabLabelActive:{ color: CYAN },
    toast: {
        position:        'absolute',
        left:            20,
        right:           20,
        backgroundColor: 'rgba(6,182,212,0.96)',
        borderRadius:    14,
        padding:         14,
        alignItems:      'center',
        elevation:       99,
        shadowColor:     CYAN,
        shadowOpacity:   0.5,
        shadowOffset:    { width: 0, height: 4 },
        shadowRadius:    10,
    },
    toastText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
