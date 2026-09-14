import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getHazardBandMeta, hazardBandColor, type HazardBand } from '../../../../shared/domain/hazardBand';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';

type BadgeProps = {
  band: HazardBand | string;
  size?: 'sm' | 'md';
};

/**
 * A hazard band chip.
 *
 * Deliberately the same shape as `shared/ui/SeverityBadge` — icon, then word,
 * on a tint of its own colour — so the two read as one system even though they
 * carry different types. Follows the same hard rule: colour is never the only
 * signal, the word is always there.
 *
 * `extreme` is the one band that gets a filled treatment rather than a tint.
 * On an ordinary day most of the sixteen regions sit at normal, so reserving
 * the loudest style for the top band is what lets the eye find the one region
 * that matters.
 */
export function HazardBandBadge({ band, size = 'md' }: BadgeProps) {
  const theme = useTheme();
  const meta = getHazardBandMeta(band);
  const color = hazardBandColor(band, theme);
  const filled = meta.band === 'extreme';
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <View
      accessibilityLabel={meta.a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.xs,
        paddingVertical: size === 'sm' ? 2 : theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.sm,
        backgroundColor: filled ? color : color + '22',
      }}
    >
      <Ionicons name={meta.icon} size={iconSize} color={filled ? theme.colors.onDanger : color} />
      <Text
        variant={size === 'sm' ? 'caption' : 'bodyStrong'}
        color={filled ? theme.colors.onDanger : color}
      >
        {meta.label}
      </Text>
    </View>
  );
}

/** Five segments — one per real band. `unavailable` fills none of them, which
 * is the honest rendering of "we do not know". */
const METER_SEGMENTS = [0, 1, 2, 3, 4];

type MeterProps = {
  band: HazardBand | string;
  score?: number | null;
  /** Announce the reading itself. Off inside a row that already labels it. */
  standalone?: boolean;
};

/**
 * A five-segment step meter — the redundant, non-colour encoding of a band.
 *
 * This is what makes the screen readable in greyscale and to a screen reader:
 * the number of filled segments carries the severity independently of hue, and
 * `accessibilityRole="meter"` gives assistive technology the same reading in
 * words via `accessibilityValue.text`.
 */
export function HazardBandMeter({ band, score, standalone = true }: MeterProps) {
  const theme = useTheme();
  const meta = getHazardBandMeta(band);
  const color = hazardBandColor(band, theme);
  const filled = meta.steps;

  const readout =
    score === null || score === undefined
      ? meta.label
      : `${meta.label}, ${Math.round(score)} out of 100`;

  return (
    <View
      accessible={standalone}
      accessibilityRole={standalone ? 'progressbar' : undefined}
      accessibilityValue={standalone ? { text: readout } : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
    >
      {METER_SEGMENTS.map((_, index) => (
        <View
          key={index}
          style={{
            width: 5,
            height: 12,
            borderRadius: 2,
            backgroundColor: index < filled ? color : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}
