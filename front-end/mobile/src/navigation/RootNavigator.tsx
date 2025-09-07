import { NavigationContainer, DarkTheme as RNDark, DefaultTheme as RNLight } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '@features/auth/screens/LoginScreen';
import BannedScreen from '@features/auth/screens/BannedScreen';
import DashboardScreen from '@features/dashboard/screens/DashboardScreen';
import MessagesScreen from '@features/messages/screens/MessagesScreen';
import MessageDetailScreen from '@features/messages/screens/MessageDetailScreen';
import ScoutScreen from '@features/scout/screens/ScoutScreen';
import StatsScreen from '@features/stats/screens/StatsScreen';
import SettingsScreen from '@features/settings/screens/SettingsScreen';
import { useTheme } from '@theme/index';
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
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const showApp = isAuthed;

  return (
    <NavigationContainer
      linking={linking}
      theme={isDark ? { ...RNDark, colors: { ...RNDark.colors, background: colors.background, text: colors.text } } : { ...RNLight, colors: { ...RNLight.colors, background: colors.background, text: colors.text } }}
    >
      {showApp ? (
        <AppNavigator />
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Banned" component={BannedScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
