import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';
import { Text } from './Text';

type Variant = 'tab' | 'pill';

type Props = {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  accessibilityLabel: string;
  /**
   * 'tab' (default) — compact, subtle, for page-level navigation (the
   * Forecasts tab's timescale switch).
   * 'pill' — chunkier, fully-rounded, high-contrast selected state; for a
   * prominent filter/form control (the spatial outlook drawer's Forecast
   * View / Geography toggles). Same underlying behavior either way — one
   * component, a themed appearance, not two parallel implementations.
   */
  variant?: Variant;
  /**
   * Forces every segment to the same width instead of sizing to its own
   * label. Off by default — content-sizing means a short/long pair ("All"
   * vs. a long district name) both stay legible, which is the more common
   * shape in this app. Opt in where the highlighted segment's own size is
   * what a reader compares across adjacent controls (the spatial outlook
   * drawer's Geography/Variable row): without it, "Region" and "Rainfall"
   * highlight at two different widths for no reason a reader can see, since
   * each track only ever sizes itself off its own two labels. Only safe
   * where the control itself sits in a definite-width container already —
   * it does not fix an unbounded control's own width, only how its
   * segments split whatever width it has.
   */
  equalWidth?: boolean;
};

export function SegmentedControl({ segments, selectedIndex, onChange, accessibilityLabel, variant = 'tab', equalWidth = false }: Props) {
  const theme = useTheme();
  const isPill = variant === 'pill';

  const trackRadius = isPill ? theme.radii.pill : theme.radii.md;
  const segmentRadius = isPill ? theme.radii.pill : theme.radii.sm;

  return (
    // The track is a well and the selected segment is a tile lifted out of
    // it — the clearest statement of the depth language anywhere in the app.
    // The track fills with `bg` rather than `surface` so it reads as a groove
    // cut into the card it sits on, not as one more panel laid on top.
    <Surface
      depth="sunken"
      level="sm"
      radius={trackRadius}
      background={theme.colors.bg}
      bordered={!isPill}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: isPill ? 4 : 3,
        gap: isPill ? 6 : 3,
      }}
    >
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={segment}
            style={{
              // Content-sized by default, then sharing leftover space
              // equally (flexBasis 'auto' + flexGrow), rather than a rigid
              // equal split. With uneven labels an equal split forces the
              // longest one to dictate the type size for every segment —
              // this way a long label simply takes the room it needs and
              // all of them stay legible at full size. `equalWidth` opts
              // into the rigid split instead, once the caller has decided
              // that trade is the right one here.
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: equalWidth ? 0 : 'auto',
            }}
          >
            {/* Chrome on a nested View, never on the Pressable — Android
                drops a Pressable's own background while still drawing its
                children, which leaves the selected segment unstyled. */}
            <Surface
              depth={isSelected ? 'raised' : 'flat'}
              level="sm"
              radius={segmentRadius}
              bordered={false}
              background={isSelected ? (isPill ? theme.colors.focus : theme.colors.accent) : 'transparent'}
              style={{
                minHeight: isPill ? theme.minTouchTarget + 8 : theme.minTouchTarget - 6,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.sm,
              }}
            >
              <Text
                variant="bodyStrong"
                color={isSelected ? (isPill ? theme.colors.onFocus : theme.colors.onAccent) : theme.colors.muted}
                numberOfLines={1}
                // Safety net only — with content-based sizing the labels
                // normally render at full size; this keeps a very long label
                // or an extra-large text-size setting from clipping, and the
                // floor stops it shrinking to something unreadable.
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                style={{ textAlign: 'center' }}
              >
                {segment}
              </Text>
            </Surface>
          </Pressable>
        );
      })}
    </Surface>
  );
}
