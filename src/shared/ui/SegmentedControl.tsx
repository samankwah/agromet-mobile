import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
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
};

export function SegmentedControl({ segments, selectedIndex, onChange, accessibilityLabel, variant = 'tab' }: Props) {
  const theme = useTheme();
  const isPill = variant === 'pill';

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: isPill ? 999 : theme.radii.md,
        borderWidth: isPill ? 0 : 1,
        borderColor: theme.colors.border,
        padding: isPill ? 4 : 3,
        gap: isPill ? 6 : 3,
        ...(isPill ? theme.elevation.card : null),
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
              // Content-sized, then sharing leftover space equally
              // (flexBasis 'auto' + flexGrow), rather than a rigid equal
              // split. With uneven labels an equal split forces the
              // longest one to dictate the type size for every segment —
              // this way a long label simply takes the room it needs and
              // all of them stay legible at full size.
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: 'auto',
              minHeight: isPill ? theme.minTouchTarget + 8 : theme.minTouchTarget - 6,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.sm,
              borderRadius: isPill ? 999 : theme.radii.sm,
              backgroundColor: isSelected ? (isPill ? theme.colors.focus : theme.colors.accent) : 'transparent',
              ...(isPill && isSelected ? theme.elevation.card : null),
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
          </Pressable>
        );
      })}
    </View>
  );
}
