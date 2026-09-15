import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  expanded: boolean;
  /** Fired with the sheet's own new state — from the handle, from a drag,
   * and from a scroll gesture that pushes the sheet past its collapsed
   * height. Replaces the old `onToggle`: once the sheet can change itself
   * (by being dragged or scrolled open), the caller needs to be told which
   * way it moved rather than just "something happened, flip your flag". */
  onExpandedChange: (expanded: boolean) => void;
  /** The filter controls, scrolled in the space above the footer. Rendered
   * always, not just while expanded: unmounting on every collapse was what
   * made a scroll gesture unable to reveal them, since there was nothing
   * there yet to scroll to. */
  children: React.ReactNode;
  /** A pinned footer, not part of the scroll — the legend, per the reference
   * screenshots (visible whether the drawer is expanded or collapsed, and
   * never carried away by scrolling the controls above it). */
  persistentContent: React.ReactNode;
};

/**
 * A bottom drawer overlaid on a full-bleed map, matching the reference
 * screenshots' interaction: expanded shows every filter control above the
 * legend; collapsed shows just the legend, leaving the map mostly visible.
 *
 * Built on `@gorhom/bottom-sheet` rather than a plain View: a farmer
 * scrolling the filter list expects the sheet itself to rise to meet the
 * gesture (as Google/Apple Maps' sheets do) before the list starts
 * scrolling inside it, and getting that gesture handoff right — a drag on
 * the handle, a scroll that should expand the sheet first and only scroll
 * its content once fully open, a scroll-to-top that should collapse it
 * again — is exactly what this library exists to do correctly across iOS
 * and Android. A hand-rolled PanGestureHandler chasing the same behaviour
 * would be re-solving a solved problem, worse.
 */
const EXPANDED_SNAP_POINT = '85%';
// Used for exactly one frame, before the handle and footer have measured
// themselves for real (see `collapsedHeight` below) — close enough that
// nothing visibly jumps once the real number replaces it.
const COLLAPSED_FALLBACK_HEIGHT = 140;

export function Drawer({ expanded, onExpandedChange, children, persistentContent }: Props) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  // Collapsed must show the handle and the legend and *nothing else* — a
  // reader complained the search field was peeking in under a guessed
  // constant. The legend's own height isn't a constant (tercile vs.
  // continuous mode render a different number of lines), so it and the
  // handle measure themselves via onLayout instead, and their sum is the
  // exact height that has room for the two of them and nothing more.
  const [handleHeight, setHandleHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const collapsedHeight = handleHeight && footerHeight ? Math.ceil(handleHeight + footerHeight) : COLLAPSED_FALLBACK_HEIGHT;
  const snapPoints = useMemo(() => [collapsedHeight, EXPANDED_SNAP_POINT], [collapsedHeight]);

  // The sheet is driven imperatively (gorhom's documented pattern for a
  // controlled index) rather than via a reactive `index` prop, so a
  // programmatic change (selecting a place on the map, tapping past its
  // edge to dismiss it) and a gesture-driven one (dragging the handle,
  // scrolling the list open) go through the same snapToIndex call and can
  // never fight each other over what the "real" index is. Re-runs once the
  // real `collapsedHeight` replaces the fallback, so a still-collapsed sheet
  // adopts the corrected height rather than sitting at the guess forever.
  useEffect(() => {
    sheetRef.current?.snapToIndex(expanded ? 1 : 0);
  }, [expanded, collapsedHeight]);

  const handleSheetChange = useCallback(
    (index: number) => onExpandedChange(index >= 1),
    [onExpandedChange],
  );

  // Read from a ref rather than closed over directly, so `handleComponent`
  // below can be created once and never remounted — see its own comment.
  const latest = useRef({ expanded, onExpandedChange });
  latest.current = { expanded, onExpandedChange };

  const handleComponent = useCallback(
    (props: BottomSheetHandleProps) => (
      <Handle
        {...props}
        expanded={latest.current.expanded}
        onPress={() => latest.current.onExpandedChange(!latest.current.expanded)}
        onLayout={(event: LayoutChangeEvent) => setHandleHeight(event.nativeEvent.layout.height)}
      />
    ),
    [],
  );

  // A footer, not the top of the scroll content: gorhom pins this to the
  // bottom of the sheet and pads the scrollable area above it by exactly its
  // height automatically, so the legend never scrolls out of view and the
  // controls never render underneath it.
  const footerComponent = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View
          onLayout={(event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height)}
          style={{
            backgroundColor: theme.colors.bg,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          {persistentContent}
        </View>
      </BottomSheetFooter>
    ),
    [persistentContent, theme],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={expanded ? 1 : 0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      handleComponent={handleComponent}
      footerComponent={footerComponent}
      // A visible top edge, not just a corner radius: collapsed, the sheet is
      // now only as tall as the handle and the legend, and without its own
      // stroke that shrunk panel read as bare text floating on the map
      // rather than a sheet sitting over it.
      backgroundStyle={{
        backgroundColor: theme.colors.bg,
        borderTopLeftRadius: theme.radii.xl,
        borderTopRightRadius: theme.radii.xl,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        // Restrained on purpose: this sheet sits over a map, and a large soft
        // shadow there smears the imagery it is supposed to let you read.
        boxShadow: theme.raised('md'),
      }}
      // The search field inside `children` needs the sheet to ride up with
      // the keyboard rather than sit behind it — gorhom's own handling here
      // replaces what used to be a bespoke iOS-only keyboard-height listener.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Off by default: without it the scroll content's own bottom padding
        // stays whatever `contentContainerStyle` says, the footer is drawn
        // on top of it regardless, and the last control ends up underneath
        // the legend. This measures the footer and adds its height to the
        // padding automatically, so scrolling to the end lands content above
        // the footer rather than behind it.
        enableFooterMarginAdjustment
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

/**
 * The collapse affordance is a plain drag-handle bar (the standard pattern
 * for this — iOS/Android/most bottom sheets use exactly this, not a chevron
 * icon), tappable across its full row for a comfortable touch target on top
 * of the drag gesture gorhom's own handle container already attaches around
 * whatever `handleComponent` renders.
 */
function Handle({
  expanded,
  onPress,
  onLayout,
}: BottomSheetHandleProps & { expanded: boolean; onPress: () => void; onLayout: (event: LayoutChangeEvent) => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Collapse map controls' : 'Expand map controls'}
      accessibilityState={{ expanded }}
      style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md }}
    >
      {/* A groove cut into the sheet, matching OptionSheet's handle. */}
      <View
        style={{
          width: 40,
          height: 5,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.bg,
          boxShadow: theme.sunken('sm'),
        }}
      />
    </Pressable>
  );
}
