import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { HazardKind, HazardRegion } from '../../../../shared/domain/hazard';
import { getHazardBandMeta, hazardBandColor } from '../../../../shared/domain/hazardBand';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { HazardBandMeter } from './HazardBandBadge';

type Props = {
  region: HazardRegion;
  hazard: HazardKind;
  /** Divider above every row but the first. */
  first: boolean;
  onPress: (region: string) => void;
  /** Slightly tighter, for the calm regions behind the disclosure. */
  compact?: boolean;
};

/**
 * One region in a list, matching the desktop row anatomy:
 *
 *   [rule]  Name                     Score   [meter]
 *           Band · Agro-zone         OF 100
 *
 * A full-width divider makes each row a discrete object; real vertical padding
 * gives the divider something to separate; and the fixed-width right column
 * stops the meter drifting with the length of whatever precedes it, so the
 * numbers line up down the list.
 *
 * Severity is carried three ways and never by colour alone: the rule, the band
 * word, and the step meter.
 */
export function RegionRiskRow({ region, hazard, first, onPress, compact = false }: Props) {
  const theme = useTheme();
  const block = region[hazard];
  const meta = getHazardBandMeta(block.band);
  const color = hazardBandColor(block.band, theme);

  return (
    <Pressable
      onPress={() => onPress(region.region)}
      accessibilityRole="button"
      accessibilityLabel={
        `${region.region}, ${meta.label} ${hazard} risk, ${Math.round(block.score)} out of 100` +
        (block.overridden ? '. A published bulletin is in force' : '') +
        '. Open region details.'
      }
    >
      {({ pressed }) => (
        /* The chrome lives on this nested View, not on the Pressable — the same
           reason shared/ui/Button.tsx does it: styling a Pressable directly
           leaves the padding, border and flex direction unrendered on Android
           while the text still draws, which collapsed this row into a bare
           vertical stack. A plain View has no such ambiguity.
           Note it also renders correctly under react-test-renderer either way,
           so a test asserting the Pressable's own style passes while the device
           is broken — which is how this survived a green suite. */
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.lg,
            minHeight: theme.minTouchTarget,
            // The card contributes no horizontal padding, so the divider below
            // spans its full width and the row owns the inset.
            paddingHorizontal: theme.spacing['2xl'],
            paddingVertical: compact ? theme.spacing.md : theme.spacing.lg,
            borderTopWidth: first ? 0 : 1,
            borderTopColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.bg : 'transparent',
          }}
        >
          <View style={{ width: 3, height: 30, borderRadius: 2, backgroundColor: color }} />

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {region.region}
              </Text>
              {block.overridden ? (
                <Ionicons name="document-text-outline" size={13} color={theme.colors.accent} />
              ) : null}
            </View>
            <Text variant="caption" muted numberOfLines={1}>
              <Text variant="caption" color={color}>
                {meta.label}
              </Text>
              {` · ${region.agroZone}`}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', minWidth: 34 }}>
            <Text variant="bodyStrong">{Math.round(block.score)}</Text>
            <Text variant="caption" muted style={{ fontSize: 9, letterSpacing: 0.4 }}>
              OF 100
            </Text>
          </View>

          <HazardBandMeter band={block.band} score={block.score} standalone={false} />
        </View>
      )}
    </Pressable>
  );
}
