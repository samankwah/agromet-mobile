// NativeWind's global stylesheet — must be imported once, at the app root.
import '../global.css';

import { useCallback, useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NotoSans_400Regular, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';

import { queryClient } from '../src/shared/api/queryClient';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';
import { OfflineBanner } from '../src/shared/ui/OfflineBanner';
import { useReminderNotifications } from '../src/features/farm-tools/reminders/useReminderNotifications';

/*
 * expo-notifications logs a red LogBox error on every launch in Expo Go,
 * about *remote push* being unavailable there since SDK 53. Farm reminders
 * use local scheduled notifications only and never touch push, so the message
 * is inapplicable — and it renders over the tab bar, making the app harder to
 * use than it would be without it.
 *
 * Suppressed by exact text rather than broadly: the genuine limitation is
 * surfaced in the app itself, on the reminders screen, where a farmer can
 * actually read it.
 */
LogBox.ignoreLogs(['expo-notifications: Android Push notifications (remote notifications)']);

SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: if the splash screen is already hidden (e.g. fast refresh),
  // this rejects harmlessly.
});

/**
 * Root layout — the one place providers are composed for the whole app:
 * SafeAreaProvider → ThemeProvider → QueryClientProvider, wrapping a Stack
 * that hosts the tab navigator plus the non-tab routes (alert details,
 * saved districts, diagnose, calendars, market, reminders, day forecast
 * detail). Also owns font loading, gating the splash
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

/**
 * React Navigation keeps its own theme, and it does not read ours. Left alone it
 * stays on `DefaultTheme` in both schemes, so every surface the navigator paints
 * itself — the container behind a screen, the gap around the floating tab bar,
 * the ground briefly visible mid-transition — comes out light grey (#f2f2f2)
 * even in dark mode. Only `background` and `card` are overridden; every other
 * navigator colour in this app is already set explicitly (header, tab tints), so
 * widening this would be changing values nothing reads.
 */
function useNavigationTheme() {
  const theme = useTheme();
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: { ...base.colors, background: theme.colors.bg, card: theme.colors.surface },
  };
}

function RootNavigator() {
  const theme = useTheme();
  const navigationTheme = useNavigationTheme();
  // Mounted here rather than on the reminders screen: a notification tapped
  // from a cold start has to route somewhere before that screen exists.
  useReminderNotifications();

  return (
    <NavigationThemeProvider value={navigationTheme}>
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
          <Stack.Screen name="diagnose" options={{ title: 'Diagnose a crop' }} />
          <Stack.Screen name="calendars/[kind]" options={{ title: 'Calendars' }} />
          <Stack.Screen name="calendar/[id]" options={{ title: 'Calendar' }} />
          <Stack.Screen name="market" options={{ title: 'Market prices' }} />
          <Stack.Screen name="commodity/[slug]" options={{ title: 'Commodity' }} />
          <Stack.Screen name="reminders" options={{ title: 'Farm reminders' }} />
          <Stack.Screen name="advisory/[kind]" options={{ title: 'Weekly advisory' }} />
          <Stack.Screen name="advisory-archive" options={{ title: 'Advisory archive' }} />
          <Stack.Screen name="flood-drought" options={{ title: 'Flood & drought' }} />
          <Stack.Screen name="hazard/[region]" options={{ title: 'Region reading' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="forecast-day/[date]" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </NavigationThemeProvider>
  );
}
