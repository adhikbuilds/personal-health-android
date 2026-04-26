// Personal Health — Root App with Navigation
// 6 tabs + stack screens organised by domain: core/, fitness/, social/, wellness/
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { UserProvider } from './src/context/UserContext';
import { registerForPushNotifications, addNotificationTapListener } from './src/services/pushNotifications';
import { getOrCreateAnonymousAthleteId, ensureDeviceAuth } from './src/services/deviceIdentity';

// Core tabs
import HomeScreen         from './src/screens/core/HomeScreen';
import MetricsScreen      from './src/screens/core/MetricsScreen';
import AcademyScreen      from './src/screens/core/AcademyScreen';
import HubScreen          from './src/screens/core/HubScreen';

// Fitness domain
import TrainScreen         from './src/screens/fitness/TrainScreen';
import GhostSkeletonScreen from './src/screens/fitness/GhostSkeletonScreen';
import RPPGScreen          from './src/screens/fitness/RPPGScreen';
import FitnessTestScreen   from './src/screens/fitness/FitnessTestScreen';
import OnboardingScreen    from './src/screens/fitness/OnboardingScreen';
import PlacementWizardScreen from './src/screens/fitness/PlacementWizardScreen';
import DrillPickerScreen   from './src/screens/fitness/DrillPickerScreen';
import FirstScoreScreen    from './src/screens/fitness/FirstScoreScreen';
import ShareCardScreen     from './src/screens/fitness/ShareCardScreen';
import InjuryRiskScreen    from './src/screens/fitness/InjuryRiskScreen';
import ParentConsentScreen from './src/screens/fitness/ParentConsentScreen';

// Social domain
import MapScreen           from './src/screens/social/MapScreen';
import FieldBookingScreen  from './src/screens/social/FieldBookingScreen';
import LearnSportsScreen   from './src/screens/social/LearnSportsScreen';
import GetActiveScreen     from './src/screens/social/GetActiveScreen';
import ClassesScreen       from './src/screens/social/ClassesScreen';
import SocialFeedScreen    from './src/screens/social/SocialFeedScreen';
import CoachInboxScreen    from './src/screens/social/CoachInboxScreen';
import InviteJoinScreen    from './src/screens/core/InviteJoinScreen';

// Wellness domain
import WellnessScreen            from './src/screens/wellness/WellnessScreen';
import WellnessLogFormScreen     from './src/screens/wellness/WellnessLogFormScreen';

// Nutrition domain
import NutritionScreen     from './src/screens/nutrition/NutritionScreen';
import MealLogScreen       from './src/screens/nutrition/MealLogScreen';
import NutritionGoalsScreen from './src/screens/nutrition/NutritionGoalsScreen';
import NotificationsScreen from './src/screens/core/NotificationsScreen';
import { hasCompletedOnboarding } from './src/services/deviceIdentity';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Strava theme — matches frontend web app
const ORANGE = '#FC4C02';
const DARK   = '#242428';
const MUTED  = '#9CA3AF';
const BG     = '#FFFFFF';
const CREAM  = '#FBFBF8';
const BORDER = '#E6E6EA';
// Legacy alias kept so any inline reference still resolves to brand
const CYAN   = ORANGE;

// AN-04: Vector tab icons (Ionicons), no emojis
const TAB_ICONS = {
    Home:    'home-outline',
    Lab:     'analytics-outline',
    Camera:  'videocam-outline',
    Academy: 'library-outline',
    Hub:     'person-outline',
    Map:     'map-outline',
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
// PH-V2-A-06: BlurView background + haptic feedback on tab press
function TabNavigator({ showToast }) {
    return (
        <Tab.Navigator
            screenListeners={{
                tabPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                },
            }}
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => (
                    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                        <Ionicons
                            name={TAB_ICONS[route.name] || 'ellipse-outline'}
                            size={22}
                            color={focused ? ORANGE : MUTED}
                        />
                    </View>
                ),
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{route.name}</Text>
                ),
                tabBarStyle:  styles.tabBar,
                tabBarBackground: () => (
                    <BlurView intensity={70} tint="light" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.95)' }} />
                ),
                tabBarActiveTintColor: ORANGE,
                tabBarInactiveTintColor: MUTED,
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

function LaunchScreen({ navigation }) {
    useEffect(() => {
        let alive = true;
        hasCompletedOnboarding().then((done) => {
            if (!alive) return;
            navigation.reset({ index: 0, routes: [{ name: done ? 'Tabs' : 'Onboarding' }] });
        });
        return () => { alive = false; };
    }, [navigation]);

    return (
        <View style={[styles.launch, { backgroundColor: BG }]}>
            <Text style={{ color: ORANGE, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
                PERSONAL HEALTH
            </Text>
        </View>
    );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
function AppNavigator({ showToast }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Launch" component={LaunchScreen} />
            <Stack.Screen name="Onboarding">
                {(props) => <OnboardingScreen {...props} showToast={showToast} />}
            </Stack.Screen>
            {/* Main tab flow */}
            <Stack.Screen name="Tabs">
                {(props) => <TabNavigator {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen
                name="DrillPicker"
                component={DrillPickerScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="PlacementWizard">
                {(props) => <PlacementWizardScreen {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen name="CameraSession">
                {(props) => <TrainScreen {...props} showToast={showToast} />}
            </Stack.Screen>
            <Stack.Screen name="FirstScore" component={FirstScoreScreen} />
            <Stack.Screen name="ShareCard">
                {(props) => <ShareCardScreen {...props} showToast={showToast} />}
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
            <Stack.Screen
                name="CoachInbox"
                component={CoachInboxScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Wellness domain — WN-20/21 */}
            <Stack.Screen
                name="Wellness"
                component={WellnessScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="WellnessLogForm"
                component={WellnessLogFormScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            {/* Nutrition domain — WN-15/16/19 */}
            <Stack.Screen
                name="Nutrition"
                component={NutritionScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="MealLog"
                component={MealLogScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
                name="NutritionGoals"
                component={NutritionGoalsScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Flow 13: Injury Risk — private, no share */}
            <Stack.Screen
                name="InjuryRisk"
                component={InjuryRiskScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Flow 14: Re-engagement Push UI */}
            <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Flow 15: Parent Access — athlete manages parent consent */}
            <Stack.Screen
                name="ParentConsent"
                component={ParentConsentScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* Invite deep-link — personalhealth://invite/:token */}
            <Stack.Screen
                name="InviteJoin"
                component={InviteJoinScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal', gestureEnabled: false }}
            />
        </Stack.Navigator>
    );
}

// ─── Deep linking config ───────────────────────────────────────────────────────
const linking = {
    prefixes: ['personalhealth://', 'https://personalhealth.app'],
    config: {
        screens: {
            InviteAccept: 'invite/:token',
            Tabs: 'home',
        },
    },
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
    const [toastMsg, setToastMsg] = useState('');
    const navigationRef = useRef(null);

    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3500);
    }, []);

    useEffect(() => {
        // 1. Make sure the device has a backend JWT before any authed API call
        // 2. Register Expo push token (does its own internal athlete_id fetch)
        // 3. Wire notification-tap → navigation
        ensureDeviceAuth()
            .then(() => getOrCreateAnonymousAthleteId())
            .then(athleteId => registerForPushNotifications(athleteId))
            .catch((e) => console.warn('[App] device auth/push bootstrap failed', e?.message));

        const sub = addNotificationTapListener(navigationRef);
        return () => sub.remove();
    }, []);

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" backgroundColor={BG} />
            <UserProvider>
                <NavigationContainer ref={navigationRef} linking={linking}>
                    <AppNavigator showToast={showToast} />
                </NavigationContainer>
                <ToastOverlay message={toastMsg} />
            </UserProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    launch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBar: {
        backgroundColor: 'transparent',                  // BlurView paints the bg
        borderTopColor:  BORDER,
        borderTopWidth:  StyleSheet.hairlineWidth,
        height:          76,                              // taller — clears safe-area on most phones
        paddingBottom:   12,
        paddingTop:      8,
        elevation:       8,
        shadowColor:     '#000',
        shadowOpacity:   0.06,
        shadowOffset:    { width: 0, height: -2 },
        shadowRadius:    8,
    },
    tabIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tabIconActive: { backgroundColor: 'rgba(252, 76, 2, 0.10)' },
    tabIconText:   { fontSize: 18 },
    tabLabel:      { fontSize: 10, fontWeight: '700', color: MUTED, marginTop: 2, letterSpacing: 0.3 },
    tabLabelActive:{ color: ORANGE },
    toast: {
        position:        'absolute',
        left:            20,
        right:           20,
        backgroundColor: ORANGE,
        borderRadius:    8,
        padding:         14,
        alignItems:      'center',
        elevation:       99,
        shadowColor:     ORANGE,
        shadowOpacity:   0.4,
        shadowOffset:    { width: 0, height: 4 },
        shadowRadius:    14,
    },
    toastText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
});
