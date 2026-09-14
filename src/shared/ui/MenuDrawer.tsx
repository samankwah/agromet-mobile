import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { useTheme } from '../theme/ThemeProvider';
import { drawerPanelPath } from './cardShape';
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
 * Hover feedback for the rows.
 *
 * A deliberate, local exception to the flat rule in `theme/tokens.ts`, which
 * zeroes every elevation preset and says to strengthen the border instead. That
 * rule is about *resting* surfaces: a card should not float. A row under the
 * cursor is not resting, and the shadow is the thing that says so. It is scoped
 * to this one transient state and never applies to the panel itself.
 *
 * `shadowColor` drives iOS and web, `elevation` drives Android. Hover only fires
 * on web and desktop; touch devices get the press state below instead, since
 * there is no cursor to hover with.
 */
const HOVER_LIFT = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 6,
} as const;

/**
 * The app menu: a panel that slides in from the right, its two left corners cut
 * away on a shallow diagonal, with the rows cascading in behind it.
 *
 * Named `MenuDrawer`, not `Drawer` — `ui/Drawer.tsx` is already the map's
 * bottom panel and has nothing to do with this.
 *
 * The silhouette is an SVG path (`drawerPanelPath`), for the same reason `Card`
 * paints its own background: no `borderRadius` cuts a corner straight, let alone
 * at 35 degrees. Measured with `onLayout` and repainted only on a real size
 * change.
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
  const cut = panelWidth * theme.drawerShape.cutRatio;

  // The Modal has to outlive `visible` so the panel can slide back out before it
  // unmounts; closing it on the same tick would make the drawer vanish.
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

  const path = size
    ? drawerPanelPath({ width: size.width, height: size.height, topCut: cut, bottomCut: cut })
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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />

        <Animated.View
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setSize((prev) =>
              prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
                ? prev
                : { width, height },
            );
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: panelWidth,
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [panelWidth, 0] }) },
            ],
          }}
        >
          {size && path ? (
            <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
              <Path d={path} fill={theme.colors.chrome} stroke={theme.colors.border} strokeWidth={1} />
            </Svg>
          ) : null}

          <View
            accessibilityRole="menu"
            style={{
              flex: 1,
              /* Clear of the top diagonal, not merely clear of the status bar.
                 The cut runs `cut` dp down the panel's left edge, so anything
                 above that line is sliding underneath it — which is exactly how
                 the first version came out misaligned. `max` because on a short
                 panel the status bar is the taller of the two. */
              paddingTop: Math.max(insets.top, cut) + theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.lg,
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
                          ...(hovered === row.id || pressed ? HOVER_LIFT : null),
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
