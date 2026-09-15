import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { commodityImage } from '../../../shared/data/commodityImages';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { formatCedi, type ResolvedCommodity } from '../../../shared/utils/marketInsights';
import { Sparkline } from './Sparkline';
import { TrendBadge } from './MarketBadges';

type Props = {
  resolved: ResolvedCommodity;
  /** Measured by the list screen. See the note on sizing below. */
  width: number;
  onQuickView: (slug: string) => void;
};

/**
 * One commodity in the market list.
 *
 * Two targets, and only two: the card opens the commodity screen, and the
 * small eye button opens the quick view. Everything else that used to
 * compete for the tap — a description line, a demand row, an add-to-cart
 * button — belongs on one of those two surfaces instead. This mirrors the
 * web card exactly (frontend/src/components/Market/CommodityCard.jsx).
 *
 * The eye button is a sibling of the card Pressable rather than a child:
 * nesting pressables means the outer one still fires on Android.
 *
 * Chrome — surface, border, radius, absolute placement — lives on plain
 * Views, never on the Pressables themselves. Button.tsx documents why: on
 * Android, styling a Pressable directly leaves its background, border and
 * padding unrendered while its children still draw. Here that stripped the
 * card of its surface entirely and dropped the quick-view button out of its
 * absolute position into normal flow at the foot of the card.
 *
 * Sizing is an explicit pixel width handed down from the list, not `flex: 1`
 * plus a percentage-width image with an aspect ratio. The latter left the
 * image's height depending on a parent width Yoga had not resolved yet, which
 * on device produced overflowing photographs and a grid that collapsed to one
 * ragged column. The detail screen measures for its chart for the same
 * reason.
 */
export function CommodityCard({ resolved, width, onQuickView }: Props) {
  const theme = useTheme();
  const { entry, market, series, change, price } = resolved;
  const image = commodityImage(entry.slug);

  const imageHeight = Math.round(width * 0.75); // 4:3

  return (
    <View style={{ width }}>
      <Pressable
        onPress={() => router.push(`/commodity/${entry.slug}`)}
        accessibilityRole="button"
        accessibilityLabel={`${entry.name}, ${price != null ? formatCedi(price) : 'price unavailable'}`}
      >
        {({ pressed }) => (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            // Clips the photo to the rounded corner, which also means this
            // card cannot cast from a child — the shadow has to live here.
            overflow: 'hidden',
            boxShadow: pressed ? theme.sunken('sm') : theme.raised('md'),
          }}
        >
        {image ? <Image source={image} style={{ width, height: imageHeight }} resizeMode="cover" /> : null}

        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {entry.name}
          </Text>

          {price != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.xs }}>
              <View style={{ flexShrink: 1 }}>
                <Text variant="h3">{formatCedi(price)}</Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {market?.unit ?? 'per bag'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Sparkline data={series} width={72} height={28} />
                {change && change.direction !== 'flat' ? (
                  <Text
                    variant="caption"
                    color={change.direction === 'up' ? theme.colors.accent : theme.colors.danger}
                  >
                    {change.pct >= 0 ? '+' : ''}
                    {change.pct.toFixed(1)}%
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text variant="caption" muted>
              Price unavailable
            </Text>
          )}
        </View>
        </View>
        )}
      </Pressable>

      {market ? (
        <View style={{ position: 'absolute', top: theme.spacing.sm, left: theme.spacing.sm }}>
          <TrendBadge trend={market.trend} size="sm" onImage />
        </View>
      ) : null}

      <View style={{ position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm }}>
        <Pressable
          onPress={() => onQuickView(entry.slug)}
          accessibilityRole="button"
          accessibilityLabel={`Quick view of ${entry.name} prices`}
          hitSlop={8}
        >
          {({ pressed }) => (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radii.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                // Sits on the photograph, so it needs its own lift to stay
                // legible against whatever is behind it.
                boxShadow: pressed ? theme.sunken('sm') : theme.raised('sm'),
              }}
            >
              <Ionicons name="eye-outline" size={17} color={theme.colors.text} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
