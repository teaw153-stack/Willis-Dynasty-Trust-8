import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from './lib/supabase';
import { Colors } from './constants/Colors';
import { initGooglePlayBilling, setupPurchaseListener, cleanupGooglePlayBilling } from './lib/googlePlayBilling';
import { configureGoogleSignIn } from './lib/googleSignIn';
import { logScreenView, logEvent, AnalyticsEvents, setUserId } from './lib/analytics';

// Screens
import Login          from './screens/Login';
import Onboarding     from './screens/Onboarding';
import Dashboard      from './screens/Dashboard';
import Pricing        from './screens/Pricing';
import StrategyDetail from './screens/StrategyDetail';
import Profile        from './screens/Profile';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const paperTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: Colors.neonPink, background: Colors.background },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.neonPink,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'view-dashboard',
            Pricing:   'star-circle',
            Profile:   'account-circle',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Pricing"   component={Pricing} />
      <Tab.Screen name="Profile"   component={Profile} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Google integrations on app launch
    if (Platform.OS === 'android') {
      // Configure Google Sign-In
      const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
      if (webClientId && webClientId !== 'YOUR_GOOGLE_WEB_CLIENT_ID') {
        configureGoogleSignIn(webClientId);
      }

      // Initialize Google Play Billing + purchase listener
      initGooglePlayBilling();
      setupPurchaseListener(async ({ tier, purchaseToken }) => {
        console.log('[App] Purchase completed:', tier);
        // Reload profile after successful purchase
        if (session?.user) await loadProfile(session.user.id);
      });
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
        setUserId(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
        setUserId(session.user.id);
        logEvent(AnalyticsEvents.LOGIN, { method: 'session_restore' });
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      cleanupGooglePlayBilling();
    };
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  if (loading) return null;

  const showOnboarding = session && (!profile?.onboarding_done);

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!session ? (
            <Stack.Screen name="Login"      component={Login} />
          ) : showOnboarding ? (
            <Stack.Screen name="Onboarding" component={Onboarding} />
          ) : (
            <Stack.Screen name="Main"       component={MainTabs} />
          )}
          {/* Always reachable modals */}
          <Stack.Screen name="Pricing"        component={Pricing} />
          <Stack.Screen name="StrategyDetail" component={StrategyDetail} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
