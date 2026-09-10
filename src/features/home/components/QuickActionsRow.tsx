import React from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Camera, CloudSun, Megaphone, Tag, type Icon } from 'phosphor-react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { DuotoneIcon } from '../../../shared/ui/DuotoneIcon';
import { Text } from '../../../shared/ui/Text';

type Action = {
  label: string;
  icon: Icon;
  route: Href;
  /** Spoken instead of the label where the label alone is ambiguous out of
   * context — a screen reader announces these without the icon beside them. */
  a11yLabel?: string;
};

const ACTIONS: Action[] = [
  // Names its timescale rather than relying on Daily being the default:
  // the Forecasts tab stays mounted, so a tile that asks for nothing in
  // particular lands on whatever the outlook tile last opened.
  { label: 'Forecast', icon: CloudSun, route: '/(tabs)/forecasts?segment=daily' },
  { label: 'Advisories', icon: Megaphone, route: '/(tabs)/advisories' },
  // A camera, not a leaf: diagnosis is driven by photographing the crop, and
  // it matches both the web header's icon and the Diagnose screen's own.
  { label: 'Diagnose Crop', icon: Camera, route: '/diagnose' },
  // Same destination as the Farm Tools "Market prices" tile, surfaced on Home
  // where more people will find it. Shares its Tag icon so the two entry points
  // read as one feature.
  { label: 'Market prices', icon: Tag, route: '/market' },
];

/**
 * Four shortcuts under the conditions card.
 *
 * Two of them — Forecast and Advisories — also sit in the tab bar a thumb's
 * width below. That duplication is deliberate and stays: a tile with a label
 * and an icon at content size is a much easier target than a tab bar glyph for
 * someone who does not yet know the app, and Home is where they start. What was
 * removed is duplication that pointed at nothing distinct.
 */
export function QuickActionsRow() {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => router.push(action.route)}
          accessibilityRole="button"
          accessibilityLabel={action.a11yLabel ?? action.label}
          // Layout stays on the Pressable — it is the flex child of the grid.
          // Only the painted chrome moves inside.
          style={{ flexBasis: '47%', flexGrow: 1 }}
        >
          {({ pressed }) => (
            // Chrome on a nested View, never on the Pressable: Android drops a
            // Pressable's own background and border while still drawing its
            // children, and a pressed state makes the style a function, which
            // is the case that breaks. Button.tsx documents it.
            <View
              style={{
                width: '100%',
                minHeight: theme.minTouchTarget + 12,
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                paddingVertical: theme.spacing.md,
                opacity: pressed ? 0.7 : 1,
              }}
            >
              <DuotoneIcon icon={action.icon} size={26} />
              <Text variant="caption" style={{ textAlign: 'center' }} numberOfLines={1}>
                {action.label}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
