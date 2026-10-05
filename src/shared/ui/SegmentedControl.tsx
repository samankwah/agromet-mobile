import React from 'react';
import { Pressable } from 'react-native';

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
   * 'tab' (default) — compact, for page-level navigation (the Forecasts
   * tab's timescale switch).
   * 'pill' — taller target; for a prominent filter/form control (the flood
   * and drought screen's hazard switch, the reminder form). The map drawers
   * use 'tab': stacked three deep, the taller size crowded the sheet. Same underlying
   * behavior either way — one component, not two parallel implementations.
   *
   * The two used to differ in shape and colour as well. They no longer do:
   * every switch in the app is the same glass capsule, so the variants now
   * differ only in size.
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

  // A flat glass capsule: a faint see-through track with the selected segment
  // a brighter pill inside it, no rims and no shadows. The Forecasts header
  // lays it over a photograph, where a sunken well and its white highlight
  // would fog the picture behind it. Both fills are the text colour at low
  // opacity, so the same control reads on a photo, a dark card and a light one.
  //
  // Translucent on purpose: the control is flat, so there is no Android
  // elevation shadow for the see-through fill to let show (see theme/blend.ts).
  const trackFill = theme.colors.text + '1F';
  const selectedFill = theme.colors.text + '3D';
  const segmentHeight = isPill ? theme.minTouchTarget + 8 : theme.minTouchTarget - 6;

  return (
    <Surface
      depth="flat"
      level="sm"
      radius={theme.radii.pill}
      background={trackFill}
      bordered={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 2,
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
            {/* Keyed on the selection so a newly selected segment is a fresh
                view. Android drew a segment square once its fill changed in
                place (the header's Subseasonal-to-Seasonal tap), while the
                same pill came out round whenever it was first mounted. */}
            <Surface
              key={isSelected ? 'selected' : 'idle'}
              depth="flat"
              level="sm"
              radius={segmentHeight / 2}
              bordered={false}
              background={isSelected ? selectedFill : 'transparent'}
              style={{
                minHeight: segmentHeight,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.sm,
              }}
            >
              <Text
                variant="bodyStrong"
                color={theme.colors.text}
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
