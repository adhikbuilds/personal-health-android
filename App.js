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

const CYAN  = '#06b6d4';
const MUTED = '#64748b';
const BG    = '#0f172a';

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
                            color={focused ? CYAN : MUTED}
                        />
                    </View>
                ),
                tabBarLabel: ({ focused }) => (
                    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{route.name}</Text>
                ),
                tabBarStyle:  styles.tabBar,
                tabBarBackground: () => (
                    <BlurView intensity={80} tint="dark" style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.85)' }} />
                ),
                tabBarActiveTintColor: CYAN,
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
            <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '800' }}>Personal Health</Text>
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
            <StatusBar style="light" backgroundColor={BG} />
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
