import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/shared/theme/ThemeProvider';

/** The 5-tab bottom navigator: Home / Forecasts / Advisories / Farm Tools /
 * Library. Home is fully built; Advisories and Farm Tools are composed
 * screens (a real relocated feature + stub sections for what's still
 * future-milestone work); Forecasts and Library are ComingSoon
 * placeholders. */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.body, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="forecasts"
        options={{
          title: 'Forecasts',
          tabBarIcon: ({ color, size }) => <Ionicons name="cloud" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Forecasts',
        }}
      />
      <Tabs.Screen
        name="advisories"
        options={{
          title: 'Advisories',
          tabBarIcon: ({ color, size }) => <Ionicons name="megaphone" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Advisories',
        }}
      />
      <Tabs.Screen
        name="farm-tools"
        options={{
          title: 'Farm Tools',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Farm Tools',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Library',
        }}
      />
    </Tabs>
  );
}
