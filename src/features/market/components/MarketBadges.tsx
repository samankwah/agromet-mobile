import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { MarketDemand, MarketTrendDirection } from '../../../shared/domain/market';
import { useTheme, type Theme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import type { TimingTone } from '../../../shared/utils/marketInsights';

/**
 * Price-trend and demand chips.
 *
 * Follows SeverityBadge's rule: colour is never the only signal, so every
 * chip pairs its colour with an icon and a word.
 */

type TrendMeta = { icon: keyof typeof Ionicons.glyphMap; label: string; color: (theme: Theme) => string };

const TREND_META: Record<MarketTrendDirection, TrendMeta> = {
  rising: { icon: 'trending-up', label: 'Rising', color: (t) => t.colors.accent },
  falling: { icon: 'trending-down', label: 'Falling', color: (t) => t.colors.danger },
  stable: { icon: 'remove-outline', label: 'Stable', color: (t) => t.colors.muted },
  volatile: { icon: 'pulse-outline', label: 'Volatile', color: (t) => t.colors.warning },
  seasonal: { icon: 'calendar-outline', label: 'Seasonal', color: (t) => t.colors.teal },
};

export function TrendBadge({
  trend,
  size = 'md',
  onImage,
}: {
  trend: MarketTrendDirection | undefined;
  size?: 'sm' | 'md';
  /**
   * Sitting on a photograph rather than a card.
   *
   * The default 13% tint reads fine on a solid theme surface, which is where
   * SeverityBadge established it — but over a photo there is no predictable
   * backdrop, and both the tint and the label wash out. Pale soybeans behind
   * grey "Stable" text was effectively invisible. This swaps to an opaque
   * surface pill so contrast no longer depends on what the picture happens
   * to contain.
   */
  onImage?: boolean;
}) {
  const theme = useTheme();
  const meta = TREND_META[trend ?? 'stable'];
  const color = meta.color(theme);

  return (
    <View
      accessibilityLabel={`Price trend: ${meta.label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.xs,
        paddingVertical: size === 'sm' ? 2 : theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.sm,
        backgroundColor: onImage ? theme.colors.surface : color + '22',
        borderWidth: onImage ? 1 : 0,
        borderColor: color + '55',
        ...(onImage ? theme.elevation.card : null),
      }}
    >
      <Ionicons name={meta.icon} size={size === 'sm' ? 12 : 16} color={color} />
      <Text variant="caption" color={color}>
        {meta.label}
      </Text>
    </View>
  );
}

const DEMAND_LABEL: Record<MarketDemand, string> = {
  'very-high': 'Very high',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  growing: 'Growing',
  export: 'Export',
};

export function DemandRow({ demand }: { demand: MarketDemand | undefined }) {
  const theme = useTheme();
  const label = DEMAND_LABEL[demand ?? 'moderate'];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Ionicons name="people-outline" size={13} color={theme.colors.muted} />
      <Text variant="caption" muted>
        {label} demand
      </Text>
    </View>
  );
}

/** The colour a timing verdict is drawn in. */
export function timingColor(theme: Theme, tone: TimingTone): string {
  if (tone === 'sell') return theme.colors.accent;
  if (tone === 'hold') return theme.colors.danger;
  return theme.colors.warning;
}

export function timingIcon(tone: TimingTone): keyof typeof Ionicons.glyphMap {
  if (tone === 'sell') return 'trending-up';
  if (tone === 'hold') return 'time-outline';
  return 'eye-outline';
}
