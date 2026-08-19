// NativeWind's global stylesheet — must be imported once, at the app root.
import '../global.css';

import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NotoSans_400Regular, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';

import { queryClient } from '../src/shared/api/queryClient';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';
import { OfflineBanner } from '../src/shared/ui/OfflineBanner';

SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: if the splash screen is already hidden (e.g. fast refresh),
  // this rejects harmlessly.
});

/**
 * Root layout — the one place providers are composed for the whole app:
 * SafeAreaProvider → ThemeProvider → QueryClientProvider, wrapping a Stack
 * that hosts the tab navigator plus four non-tab routes (alert details,
 * saved districts, diagnose, day forecast detail). Also owns font loading, gating the splash
 * screen until the brand fonts are ready so there's no flash of the
 * system font on a slow first load.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    NotoSans_400Regular,
    NotoSans_600SemiBold,
  });

  const hideSplash = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 17 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="alert/[id]" options={{ title: 'Alert details' }} />
        <Stack.Screen name="saved-districts" options={{ title: 'Saved districts', presentation: 'modal' }} />
        <Stack.Screen name="diagnose" options={{ title: 'Diagnose a Crop' }} />
        <Stack.Screen name="calendars/[kind]" options={{ title: 'Calendars' }} />
        <Stack.Screen name="calendar/[id]" options={{ title: 'Calendar' }} />
        <Stack.Screen name="forecast-day/[date]" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}
