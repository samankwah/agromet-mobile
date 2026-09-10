import { useCallback, useEffect } from 'react';
import { LogBox, Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NotoSans_400Regular, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';

import { Text } from '../src/shared/ui/Text';
import { queryClient } from '../src/shared/api/queryClient';
import { useOnboardingStore } from '../src/shared/state/onboardingStore';
import { WelcomeScreen } from '../src/features/onboarding/WelcomeScreen';
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

  // Held until the first-run flag is read back, not just until the fonts load.
  // `(tabs)/index` redirects to /welcome when the flag is false, and before
  // hydration it is false for everyone — so lifting the splash early would show
  // Home and the tab bar for a frame before the welcome screen replaced them,
  // on every cold start of every install.
  const onboardingHydrated = useOnboardingStore((state) => state.hasHydrated);
  const ready = (fontsLoaded || fontError) && onboardingHydrated;

  const hideSplash = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  if (!ready) {
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

/**
 * The app's one `headerRight`, on the diagnose route.
 *
 * Icon *and* word: this is the only way back to an earlier diagnosis, and the
 * only place a queued submission's answer appears once it syncs, so it is not
 * somewhere to make a farmer guess at a glyph. No background — a header button
 * is chrome the header already provides — which also keeps it clear of the
 * rule that a Pressable's own fill goes unrendered on Android.
 */
function PastDiagnosesButton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/diagnosis-history')}
      accessibilityRole="button"
      accessibilityLabel="Past diagnoses"
      hitSlop={12}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 }}>
          <Ionicons name="time-outline" size={18} color={theme.colors.accent} />
          <Text variant="caption" color={theme.colors.accent}>
            Past
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const navigationTheme = useNavigationTheme();
  const hasSeenWelcome = useOnboardingStore((state) => state.hasSeenWelcome);
  // Mounted here rather than on the reminders screen: a notification tapped
  // from a cold start has to route somewhere before that screen exists.
  useReminderNotifications();

  // The welcome screen stands in for the whole navigator rather than sitting on
  // top of it as a route. Leaving it is then a state change, not a navigation —
  // which is the point: as a route it could only be left by replacing the top of
  // the stack with a route already below it, and that rendered blank. Hydration
  // is guaranteed here, because RootLayout holds the splash until it completes.
  if (!hasSeenWelcome) {
    return <WelcomeScreen />;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 17 },
            /*
             * A bare chevron, no word beside it.
             *
             * iOS labels the back button with the *previous* route's title, and
             * every route here is pushed from `(tabs)`, which has no title —
             * so it fell back to the route name and the button read
             * "< (tabs)" on every screen in the app. Giving `(tabs)` a title
             * would only trade that for "< Home" on routes reached from
             * Forecasts or Advisories, and says nothing at all when a deep
             * link opens one with no stack beneath it. The chevron is
             * unambiguous everywhere.
             */
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="alert/[id]" options={{ title: 'Alert details' }} />
          <Stack.Screen name="saved-districts" options={{ title: 'Saved districts', presentation: 'modal' }} />
          {/* The title is a placeholder: DiagnoseScreen is a two-step flow and
              renames the header as the farmer moves through it. `headerRight`
              stays put, because past diagnoses is reachable from every step and
              is the only route back to a queued submission's answer. */}
          <Stack.Screen name="diagnose" options={{ title: 'Add a photo', headerRight: () => <PastDiagnosesButton /> }} />
          <Stack.Screen name="diagnosis-history" options={{ title: 'Past diagnoses' }} />
          <Stack.Screen name="calendars/[kind]" options={{ title: 'Calendars' }} />
          <Stack.Screen name="calendar/[id]" options={{ title: 'Calendar' }} />
          <Stack.Screen name="market" options={{ title: 'Market prices' }} />
          <Stack.Screen name="commodity/[slug]" options={{ title: 'Commodity' }} />
          <Stack.Screen name="reminders" options={{ title: 'Farm reminders' }} />
          <Stack.Screen name="advisory/[kind]" options={{ title: 'Weekly advisory' }} />
          <Stack.Screen name="advisory-archive" options={{ title: 'Advisory archive' }} />
          <Stack.Screen name="flood-drought" options={{ title: 'Flood & drought' }} />
          {/* No header: the map is full-bleed and carries its own close control,
              which also works when the route is opened by a deep link and there
              is no stack to go back through. */}
          <Stack.Screen name="rain-map" options={{ headerShown: false }} />
          <Stack.Screen name="hazard/[region]" options={{ title: 'Region reading' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="about" options={{ title: 'About AgroMet' }} />
          <Stack.Screen name="contact" options={{ title: 'Contact us' }} />
          {/* One route for both documents: the backend serves the same shape
              for each, so a second screen would be this one with a different
              slug. The header title follows the document. */}
          <Stack.Screen name="legal/[slug]" options={{ title: 'Legal' }} />
          <Stack.Screen name="forecast-day/[date]" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </NavigationThemeProvider>
  );
}
