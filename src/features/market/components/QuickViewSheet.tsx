import React from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { commodityImage } from '../../../shared/data/commodityImages';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import { Text } from '../../../shared/ui/Text';
import { formatCedi, getTimingSignal, type ResolvedCommodity } from '../../../shared/utils/marketInsights';
import { DemandRow, TrendBadge, timingColor, timingIcon } from './MarketBadges';
import { Sparkline } from './Sparkline';

type Props = {
  resolved: ResolvedCommodity | null;
  region: string;
  onClose: () => void;
  onAddToCart: (resolved: ResolvedCommodity) => void;
};

/**
 * The lightweight intelligence layer.
 *
 * A glance, not a report: the price here and now, how far it has moved, and
 * one line on whether to sell. The seasonal calendar, the market-centre
 * comparison and the price chart are all on the commodity screen, and the
 * link at the bottom is how you get there — if something wants adding here,
 * it almost certainly belongs there instead.
 */
export function QuickViewSheet({ resolved, region, onClose, onAddToCart }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!resolved) return null;

  const { entry, market, trend, series, change, basePrice, price } = resolved;
  const timing = getTimingSignal(trend, new Date().getMonth() + 1);
  const tone = timingColor(theme, timing.tone);
  const image = commodityImage(entry.slug);
  const showRegional = Boolean(region) && price != null && basePrice != null && price !== basePrice;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close quick view"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            // Slides up over the whole screen, so it takes the deepest lift.
            boxShadow: theme.cast('bottom', 'lg'),
            padding: theme.spacing.lg,
            // The sheet is a sibling of the screen, not a child, so it does
            // not inherit SafeAreaView's insets — without this the action row
            // sits under the Android gesture bar.
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            gap: theme.spacing.md,
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.bg,
              boxShadow: theme.sunken('sm'),
              alignSelf: 'center',
            }}
          />

          {/* Identity */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            {image ? <Image source={image} style={{ width: 48, height: 48, borderRadius: theme.radii.sm }} resizeMode="cover" /> : null}
            <View style={{ flex: 1 }}>
              <Text variant="h3" numberOfLines={1}>
                {entry.name}
              </Text>
              <Text variant="caption" muted>
                {entry.category}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radii.sm, padding: theme.spacing.md }}>
              <Text variant="caption" muted>
                National
              </Text>
              <Text variant="h2">{formatCedi(basePrice)}</Text>
              <Text variant="caption" muted>
                {market?.unit ?? 'per bag'}
              </Text>
            </View>
            {showRegional ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.teal + '1a',
                  borderRadius: theme.radii.sm,
                  padding: theme.spacing.md,
                }}
              >
                <Text variant="caption" color={theme.colors.teal} numberOfLines={1}>
                  {region}
                </Text>
                <Text variant="h2">{formatCedi(price)}</Text>
                <Text variant="caption" muted>
                  {price! > basePrice! ? '+' : ''}
                  {(((price! - basePrice!) / basePrice!) * 100).toFixed(0)}% vs national
                </Text>
              </View>
            ) : null}
          </View>

          {/* Six-month movement */}
          {series && change ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <View>
                <Text variant="caption" muted>
                  6-month change
                </Text>
                <Text variant="bodyStrong" color={change.direction === 'down' ? theme.colors.danger : theme.colors.accent}>
                  {change.delta >= 0 ? '+' : '−'}
                  {formatCedi(Math.abs(change.delta))} ({change.pct >= 0 ? '+' : ''}
                  {change.pct.toFixed(1)}%)
                </Text>
              </View>
              <Sparkline data={series} width={96} height={36} />
            </View>
          ) : null}

          {/* Standing */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <TrendBadge trend={market?.trend} />
            <DemandRow demand={market?.demand} />
          </View>

          {/* One-line verdict */}
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              backgroundColor: tone + '1a',
              borderRadius: theme.radii.sm,
              padding: theme.spacing.md,
            }}
          >
            <Ionicons name={timingIcon(timing.tone)} size={18} color={tone} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={tone}>
                {timing.title}
              </Text>
              <Text variant="caption" muted>
                {timing.detail}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Add to cart"
                disabled={price == null}
                onPress={() => {
                  onAddToCart(resolved);
                  onClose();
                }}
                icon={<Ionicons name="cart-outline" size={16} color={theme.colors.onAccent} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Full analysis"
                variant="outline"
                onPress={() => {
                  onClose();
                  router.push(`/commodity/${entry.slug}`);
                }}
                icon={<Ionicons name="arrow-forward" size={16} color={theme.colors.accent} />}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
