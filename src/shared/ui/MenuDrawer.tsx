import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { useTheme } from '../theme/ThemeProvider';
import { drawerPanelPath } from './drawerShape';
import { Text } from './Text';

export type MenuRow = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  rows: MenuRow[];
  title: string;
};

/*
 * Row metrics, measured off the reference at ~1.45px/dp and expressed as
 * offsets from the panel's left edge:
 *
 *   37  divider starts (and so does each row)
 *   54  icon centre
 *   81  label starts
 *
 * They are derived rather than written out so they cannot drift apart: the icon
 * slot is sized to *centre* the glyph on 54, which is what a slot narrower than
 * the glyph got wrong — a 23dp icon in a 17dp slot overhangs both sides and
 * lands its centre 9dp early, which reads as a wide, ragged gap before the label.
 */
const ROW_LEFT = 37;
const ICON_CENTRE = 54;
const LABEL_LEFT = 81;
const ICON_SIZE = 23;
const ICON_SLOT = (ICON_CENTRE - ROW_LEFT) * 2;
const LABEL_GAP = LABEL_LEFT - ROW_LEFT - ICON_SLOT;
const DIVIDER_RIGHT = 18;

const ROW_HEIGHT = 70;
const RULE_WIDTH = 135;
const RULE_HEIGHT = 3;

const SLIDE_MS = 220;
/** Total run of the row cascade, panel slide included. */
const LIST_MS = 460;
/** Share of the cascade spent starting rows, leaving the rest for the last one. */
const STAGGER_SPAN = 0.55;
const ROW_FADE = 1 - STAGGER_SPAN;
/** How far a row travels in, in dp. Small — this is a settle, not a fly-in. */
const ROW_SHIFT = 16;

/**
 * The fill under a row being hovered or held. The depth itself comes from the
 * theme now — this used to carry its own `shadowColor`/`elevation` block as a
 * documented local exception to the flat rule, and that rule is gone, so the
 * exception is too.
 *
 * Hover only fires on web and desktop; touch devices get the press state
 * instead, since there is no cursor to hover with.
 */
const HOVER_FILL = 'rgba(255,255,255,0.06)';

/**
 * The app menu: a panel that slides in from the right, its two left corners cut
 * away on a shallow diagonal, with the rows cascading in behind it.
 *
 * Named `MenuDrawer`, not `Drawer` — `ui/Drawer.tsx` is already the map's
 * bottom panel and has nothing to do with this.
 *
 * The silhouette is an SVG path whose two left corners are cut on a shallow
 * diagonal, because no `borderRadius` cuts a corner straight, let alone at ~35
 * degrees. It is measured with `onLayout` and repainted only on a real size
 * change; see `ui/drawerShape.ts` for the geometry.
 *
 * This shape was dropped during the soft-UI rebuild in favour of a rounded
 * corner and is back by request, matched to the design reference. The one thing
 * that did not come back with it is the panel's cast shadow: a box shadow
 * follows the view's rectangle, so beside a diagonal edge it drew a straight
 * one. The scrim and the accent rim on the path do the separating instead.
 *
 * Animated with React Native's own `Animated`, not Framer Motion — that is a DOM
 * library and does not run on native. The native equivalent would be Moti or
 * Reanimated; Reanimated is installed here but no source file imports it, and
 * `Animated` already drives every other animation in this app, so a cascade of
 * six rows is not worth a new dependency. Tap-to-open only: swipe would need
 * `react-native-gesture-handler`, which is absent.
 *
 * One driver for everything. The rows read their own slice of it through
 * `interpolate` with a clamped input range, so a six-row cascade costs one
 * `Animated.Value` and stays on the native driver rather than six values
 * sequenced on the JS thread.
 */
export function MenuDrawer({ visible, onClose, rows, title }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width: screenWidth } = useWindowDimensions();

  const panelWidth = Math.min(screenWidth * theme.drawerShape.widthRatio, theme.drawerShape.maxWidth);

  // The Modal has to outlive `visible` so the panel can slide back out before it
  // unmounts; closing it on the same tick would make the drawer vanish.
  const cut = panelWidth * theme.drawerShape.cutRatio;

  const [mounted, setMounted] = useState(visible);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const cascade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);

    if (reduceMotion) {
      // Same contract as ui/Skeleton.tsx: the component still works, it just
      // holds still. Jumping to the end state is the point.
      progress.setValue(visible ? 1 : 0);
      cascade.setValue(visible ? 1 : 0);
      if (!visible) setMounted(false);
      return;
    }

    const animation = Animated.parallel([
      Animated.timing(progress, { toValue: visible ? 1 : 0, duration: SLIDE_MS, useNativeDriver: true }),
      // Closing snaps the cascade back rather than reversing it: a farmer who
      // taps a row wants the panel gone, not six rows leaving one by one.
      Animated.timing(cascade, {
        toValue: visible ? 1 : 0,
        duration: visible ? LIST_MS : 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [visible, reduceMotion, progress, cascade]);

  if (!mounted) return null;

  // Built from the measured box, so it is null for the first frame. The panel
  // is off-screen then anyway — it starts translated fully right — so nothing
  // ever shows unpainted.
  const path = size
    ? drawerPanelPath({ width: size.width, height: size.height, topCut: cut, bottomCut: cut, radius: theme.radii.lg })
    : null;

  /** The slice of the cascade belonging to row `index`. */
  const rowRange = (index: number) => {
    const start = rows.length > 1 ? (index / (rows.length - 1)) * STAGGER_SPAN : 0;
    return [start, start + ROW_FADE];
  };

  return (
    <Modal
      visible
      transparent
      // We animate the panel ourselves, so the Modal must not also fade.
      animationType="none"
      onRequestClose={onClose}
      // The panel runs the full height, behind the status bar, as in the
      // reference. AlertPopup.tsx sets this for the same reason.
      statusBarTranslucent
    >
      {/* The modal region is the whole overlay, scrim included. On the panel
          alone it marked its own sibling — the dismiss button — as hidden,
          which left a screen-reader user no way out but the hardware back. */}
      <View accessibilityViewIsModal style={{ flex: 1 }}>
        {/* The tint fades; the dismiss target does not live inside it. Putting
            the Pressable under the animated opacity made it untappable for the
            length of the entrance — and invisible to assistive tech, which
            treats a fully transparent ancestor as hidden. */}
        <Animated.View
          pointerEvents="none"
          // Heavier than OptionSheet's #00000066 on purpose: this panel covers
          // most of the screen, and at 40% the content behind it still competed
          // with the menu for attention.
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000000A6', opacity: progress }]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" />

        <Animated.View
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            // Repaint only on a real size change. `onLayout` fires on every
            // slide frame otherwise, and rebuilding the path string each frame
            // is what makes a drawer stutter on a cheap phone.
            setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: panelWidth,
            /*
             * Transparent, and no border, radius or shadow: the panel is an SVG
             * path now, and paints its own fill and rim below.
             *
             * Its two left corners are cut on a shallow diagonal, which no
             * `borderRadius` can do. That also rules out the `cast('right')`
             * shadow this carried until now — a box shadow follows the *view's*
             * rectangle, so it would have drawn a straight-edged shadow beside
             * a diagonal panel, which is worse than none. Separation comes from
             * the scrim behind and the accent rim on the path, which is how the
             * reference does it too.
             */
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [panelWidth, 0] }) }],
          }}
        >
          {size && path ? (
            <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
              <Path d={path} fill={theme.colors.chrome} stroke={theme.colors.accentStrong} strokeWidth={1} />
            </Svg>
          ) : null}
          <View
            accessibilityRole="menu"
            style={{
              flex: 1,
              /* Clear of the top diagonal, not merely of the status bar. The
                 cut runs `cut` dp down the panel's left edge, so a title that
                 only cleared the inset would sit in the sliced-off corner. */
              paddingTop: Math.max(insets.top, cut) + theme.spacing.lg,
              paddingBottom: Math.max(insets.bottom, cut * 0.35) + theme.spacing.lg,
            }}
          >
            <Text variant="h2" style={{ textAlign: 'center' }}>
              {title}
            </Text>
            <View
              style={{
                width: RULE_WIDTH,
                height: RULE_HEIGHT,
                borderRadius: RULE_HEIGHT / 2,
                backgroundColor: theme.colors.accentStrong,
                alignSelf: 'center',
                marginTop: theme.spacing.md,
                marginBottom: theme.spacing.sm,
              }}
            />

            {rows.map((row, index) => {
              const inputRange = rowRange(index);

              return (
                <Animated.View
                  key={row.id}
                  style={{
                    opacity: cascade.interpolate({ inputRange, outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [
                      {
                        translateX: cascade.interpolate({
                          inputRange,
                          outputRange: [ROW_SHIFT, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => {
                      onClose();
                      row.onPress();
                    }}
                    onHoverIn={() => setHovered(row.id)}
                    onHoverOut={() => setHovered((current) => (current === row.id ? null : current))}
                    accessibilityRole="menuitem"
                    accessibilityLabel={row.label}
                  >
                    {({ pressed }) => (
                      /* Chrome on a nested View, never on the Pressable: Android
                         drops the Pressable's own padding and border while still
                         drawing the children, which renders the rows as an
                         undivided stack. Function children so the lift can read
                         `pressed` — the touch equivalent of hover, which never
                         fires on a phone. */
                      <View
                        style={{
                          minHeight: ROW_HEIGHT,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                          marginLeft: ROW_LEFT,
                          marginRight: DIVIDER_RIGHT,
                          // A row being touched presses into the panel, the
                          // same way every other control in the app does.
                          ...(hovered === row.id || pressed ? { backgroundColor: HOVER_FILL, boxShadow: theme.sunken('sm') } : null),
                        }}
                      >
                        <View style={{ width: ICON_SLOT, alignItems: 'center' }}>
                          <Ionicons name={row.icon} size={ICON_SIZE} color={theme.colors.text} />
                        </View>
                        <Text variant="bodyStrong" style={{ flex: 1, marginLeft: LABEL_GAP }}>
                          {row.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
