import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

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
/**
 * How much of the screen the drawer may take when expanded.
 *
 * Expanded, it is a sheet the reader asked for, so it takes the room it needs
 * to show its content in one piece rather than as a cramped scroll. What it
 * must not do is take the whole thing: the strip of map left showing is both
 * the reminder of what is underneath and the target for the tap that puts the
 * sheet away.
 *
 * A percentage, not a computed number, because it has to resolve against the
 * drawer's own containing block. Measuring the *window* instead was wrong by
 * exactly the height of the screen header: the cap came out taller than the
 * space the drawer actually sits in, so it never bound and the sheet covered
 * the map completely, leaving nothing to tap to dismiss it.
 */
const DRAWER_MAX_HEIGHT = '85%';

export function Drawer({ expanded, onToggle, children, persistentContent }: Props) {
  const theme = useTheme();
  const keyboardHeight = useKeyboardHeight();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: keyboardHeight,
        maxHeight: DRAWER_MAX_HEIGHT,
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

      {expanded ? <View style={{ gap: theme.spacing.lg, flexShrink: 1 }}>{children}</View> : null}
      {persistentContent}
    </View>
  );
}

/**
 * How far the keyboard currently intrudes.
 *
 * The drawer is anchored to the bottom of the screen, and React Native does not
 * move an absolutely positioned view for the keyboard the way it does a
 * scrolling form. So the search field inside it, and the results list under
 * that, ended up behind the keyboard the moment anyone tapped to type: the box
 * looked broken because the thing it produced was never visible.
 *
 * Listening rather than using `KeyboardAvoidingView`, which pads a container
 * from the bottom and would fight the absolute positioning instead of
 * cooperating with it.
 *
 * iOS only, and that is the whole subtlety: Expo's Android default is
 * `softwareKeyboardLayoutMode: "resize"`, so the window itself shrinks and
 * `bottom: 0` is already above the keyboard. Offsetting there too would lift
 * the sheet by the keyboard's height twice and strand it mid-screen. iOS
 * overlays the keyboard without resizing, so it needs the offset.
 */
function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // `Will` rather than `Did`, so the sheet travels with the keyboard instead
    // of snapping into place after it has finished.
    const show = Keyboard.addListener('keyboardWillShow', (event) => setKeyboardHeight(event.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
}
