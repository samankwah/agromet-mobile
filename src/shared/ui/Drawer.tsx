import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  expanded: boolean;
  onToggle: () => void;
  /** Rendered only while expanded — the filter controls. */
  children: React.ReactNode;
  /** Rendered in both states — the legend, per the reference screenshots
   * (visible whether the drawer is expanded or collapsed). */
  persistentContent: React.ReactNode;
};

/**
 * A bottom drawer overlaid on a full-bleed map, matching the reference
 * screenshots' interaction: expanded shows every filter control above an
 * always-visible legend; collapsed shows just the legend, leaving the map
 * fully visible. A lightweight custom View, not a bottom-sheet library —
 * this only needs a two-state toggle, not drag-gesture physics. The
 * collapse affordance is a plain drag-handle bar (the standard pattern for
 * this — iOS/Android/most bottom sheets use exactly this, not a chevron
 * icon), tappable across its full row for a comfortable touch target.
 */
export function Drawer({ expanded, onToggle, children, persistentContent }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.bg,
        borderTopLeftRadius: theme.radii.lg + 6,
        borderTopRightRadius: theme.radii.lg + 6,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
        gap: theme.spacing.lg,
        ...theme.elevation.raised,
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse map controls' : 'Expand map controls'}
        accessibilityState={{ expanded }}
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, marginTop: -theme.spacing.xs }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
      </Pressable>

      {expanded ? <View style={{ gap: theme.spacing.lg }}>{children}</View> : null}
      {persistentContent}
    </View>
  );
}
