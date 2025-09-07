import React from 'react';
import { NavigationContainer, DarkTheme as RNDark, DefaultTheme as RNLight } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '@features/auth/screens/LoginScreen';
import BannedScreen from '@features/auth/screens/BannedScreen';
import PlayerTagOnboardingScreen from '@features/auth/screens/PlayerTagOnboardingScreen';
import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import MessagesScreen from '@features/messages/screens/MessagesScreen';
import MessageDetailScreen from '@features/messages/screens/MessageDetailScreen';
import ScoutScreen from '@features/scout/screens/ScoutScreen';
import StatsScreen from '@features/stats/screens/StatsScreen';
import SettingsScreen from '@features/settings/screens/SettingsScreen';
import { useTheme } from '@theme/index';
import { LoadingSpinner } from '@components/index';
import { View } from 'react-native';
import { linking } from './linking';
import { useAuthStore } from '@store/auth.store';

const AuthStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const AppTabs = createBottomTabNavigator();

function MessagesNavigator() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen name="MessagesHome" component={MessagesScreen} options={{ title: 'Messages' }} />
      <MessagesStack.Screen name="MessageDetail" component={MessageDetailScreen} options={{ title: 'Thread' }} />
    </MessagesStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppTabs.Navigator>
      <AppTabs.Screen name="Dashboard" component={DashboardScreen} />
      <AppTabs.Screen name="Messages" component={MessagesNavigator} options={{ headerShown: false }} />
      <AppTabs.Screen name="Scout" component={ScoutScreen} />
      <AppTabs.Screen name="Stats" component={StatsScreen} />
      <AppTabs.Screen name="Settings" component={SettingsScreen} />
    </AppTabs.Navigator>
  );
}

export function RootNavigator() {
  const { isDark, colors } = useTheme();
  const { isAuthenticated, hasPlayerTag, loadUserProfile, isInitialized, initializeAuth } = useAuthStore();
  
  // Initialize auth on mount
  React.useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  const showApp = isAuthenticated && hasPlayerTag;
  const showOnboarding = isAuthenticated && !hasPlayerTag;

  return (
    <NavigationContainer
      linking={linking}
      theme={isDark ? { ...RNDark, colors: { ...RNDark.colors, background: colors.background, text: colors.text } } : { ...RNLight, colors: { ...RNLight.colors, background: colors.background, text: colors.text } }}
    >
      {showApp ? (
        <AppNavigator />
      ) : showOnboarding ? (
        <AuthStack.Navigator>
          <AuthStack.Screen 
            name="PlayerTagOnboarding" 
            options={{ title: 'Complete Setup' }}
          >
            {() => <PlayerTagOnboardingScreen onComplete={() => loadUserProfile()} />}
          </AuthStack.Screen>
        </AuthStack.Navigator>
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Banned" component={BannedScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
