import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { ThemeProvider, useTheme } from '@theme/index';
import { RootNavigator } from '@navigation/RootNavigator';

function Shell() {
  const { isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
