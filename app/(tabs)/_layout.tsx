import { Tabs } from 'expo-router';
// Two icon families, uniquely in this file: Ionicons dresses the four content
// tabs, and MaterialCommunityIcons is imported for one glyph Ionicons does not
// have — a robot, for the assistant.
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../src/shared/theme/ThemeProvider';
import { TabBarBackground } from '../../src/shared/ui/TabBarBackground';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_INSET,
  TAB_BAR_PADDING,
  TabBarClearanceProvider,
  tabBarBottomOffset,
} from '../../src/shared/ui/tabBarLayout';

/** The 5-tab bottom navigator: Home / Forecasts / Advisories / Farm Tools /
 * AgroMet AI. All five are built. Advisories and Farm Tools are composed screens
 * that route out to their own features; AgroMet AI is the assistant, on the slot
 * Library used to hold.
 *
 * Known gap: `tabBarLabelStyle` pins fontSize 11, so these labels are the one
 * piece of text in the app that ignores the user's text-size preference.
 * Changing it affects all five tabs and the bar's height. */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TabBarClearanceProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.muted,
          // The bar is a floating, chamfered panel with an accent-tinted rim
          // (see ui/TabBarBackground). The surface and outline are painted there,
          // so the bar itself is transparent and drops its top divider.
          //
          // Inset with margins rather than `position: 'absolute'` on purpose: the
          // navigator keeps measuring the bar's full box, so each tab screen's
          // scene still ends above it. Going absolute would float the bar over
          // the scene and hide the last item of every scrolling screen.
          tabBarBackground: () => <TabBarBackground />,
          // Absolutely positioned so content passes behind it, as in the
          // reference. Laid out with left/right/bottom rather than margins so the
          // bar's box *is* the chamfered shape — TabBarBackground then fills it
          // exactly and needs no insets of its own.
          //
          // Screens get their bottom room back from useTabBarClearance; see
          // ui/tabBarLayout for why the navigator can no longer provide it.
          tabBarStyle: {
            position: 'absolute',
            // Margin, not left/right — see TAB_BAR_INSET for why those two do
            // not survive on Android.
            marginHorizontal: TAB_BAR_INSET,
            bottom: tabBarBottomOffset(insets.bottom),
            height: TAB_BAR_HEIGHT,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            // Keeps the icon/label group off the chamfered outline; the extra
            // TAB_BAR_HEIGHT is what pays for it.
            paddingTop: TAB_BAR_PADDING,
            paddingBottom: TAB_BAR_PADDING,
            paddingHorizontal: TAB_BAR_PADDING,
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
          name="chat"
          options={{
            title: 'AgroMet AI',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons name={focused ? 'robot' : 'robot-outline'} size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'AgroMet AI',
          }}
        />
      </Tabs>
    </TabBarClearanceProvider>
  );
}
