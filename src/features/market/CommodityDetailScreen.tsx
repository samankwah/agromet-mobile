import React, { useState } from 'react';
import { Image, Linking, Pressable, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { commodityImage } from '../../shared/data/commodityImages';
import { relatedCommodities } from '../../shared/data/commodityCatalogue';
import { useCartStore } from '../../shared/state/cartStore';
import { useMarketRegionStore } from '../../shared/state/marketRegionStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Dropdown } from '../../shared/ui/Dropdown';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LineAreaChart } from '../../shared/ui/LineAreaChart';
import { Screen } from '../../shared/ui/Screen';
import { ArrowDown, ArrowUp, TrendDown, TrendUp } from 'phosphor-react-native';

import { StatTile } from '../../shared/ui/StatTile';
import { Text } from '../../shared/ui/Text';
import { buildMarketOrderUrl, canPlaceOrder } from '../../shared/utils/buildMarketOrderText';
import { MONTH_NAMES, formatCedi, formatMonths, getRegionalPrices, getTimingSignal } from '../../shared/utils/marketInsights';
import { DemandRow, TrendBadge, timingColor, timingIcon } from './components/MarketBadges';
import { CommodityDetailSkeleton } from './components/MarketSkeletons';
import { useResolvedCommodity } from './useMarket';

type Props = { slug: string };

/**
 * One commodity, in full.
 *
 * The authoritative surface, and where a card tap lands. Everything the
 * quick view leaves out is here: the price history proper, the seasonal
 * calendar, what the same bag costs at each market centre, and what that
 * means for when to sell.
 */
export function CommodityDetailScreen({ slug }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [quantity, setQuantity] = useState(1);

  const { status, error, refetch, entry, resolved, centers } = useResolvedCommodity(slug);
  const region = useMarketRegionStore((state) => state.region);
  const setRegion = useMarketRegionStore((state) => state.setRegion);
  const add = useCartStore((state) => state.add);

  if (!entry) {
    return (
      <Screen>
        <EmptyState icon="help-circle-outline" title="Unknown commodity" message="This commodity is not in the market catalogue.">
          <Button label="Back to market" variant="outline" onPress={() => router.push('/market')} />
        </EmptyState>
      </Screen>
    );
  }

  const image = commodityImage(entry.slug);
  const currentMonth = new Date().getMonth() + 1;
  // Same arithmetic the body uses, hoisted so the skeleton reserves exactly
  // the space the chart will occupy.
  const chartWidth = Math.max(width - theme.spacing.lg * 4, 200);

  return (
    <Screen>
      <AsyncStateView status={status} error={error} onRetry={refetch} skeleton={<CommodityDetailSkeleton chartWidth={chartWidth} />}>
        {resolved ? (
          <ChartAndDetail
            resolved={resolved}
            region={region}
            setRegion={setRegion}
            centers={centers}
            currentMonth={currentMonth}
            width={width}
            quantity={quantity}
            setQuantity={setQuantity}
            image={image}
            theme={theme}
            onAdd={add}
          />
        ) : null}
      </AsyncStateView>
    </Screen>
  );
}

/**
 * Split out purely so the loading branch above stays readable — the detail
 * body is long, and nesting it inside AsyncStateView's children inline made
 * the screen hard to follow.
 */
function ChartAndDetail({
  resolved,
  region,
  setRegion,
  centers,
  currentMonth,
  width,
  quantity,
  setQuantity,
  image,
  theme,
  onAdd,
}: {
  resolved: NonNullable<ReturnType<typeof useResolvedCommodity>['resolved']>;
  region: string;
  setRegion: (region: string) => void;
  centers: ReturnType<typeof useResolvedCommodity>['centers'];
  currentMonth: number;
  width: number;
  quantity: number;
  setQuantity: (next: number) => void;
  image: ReturnType<typeof commodityImage>;
  theme: ReturnType<typeof useTheme>;
  onAdd: ReturnType<typeof useCartStore.getState>['add'];
}) {
  const { entry, market, trend, series, change, basePrice, price } = resolved;
  const timing = getTimingSignal(trend, currentMonth);
  const tone = timingColor(theme, timing.tone);
  const regionalPrices = getRegionalPrices(basePrice, centers);
  const related = relatedCommodities(entry);

  // The chart sits inside the Screen's padding and a Card's padding.
  const chartWidth = Math.max(width - theme.spacing.lg * 2 - theme.spacing.lg * 2, 200);

  const points = (series ?? []).map((value, index) => ({ x: index, y: value }));
  const xLabels = (series ?? []).map((_, index) => ({
    at: index,
    label: MONTH_NAMES[(currentMonth - (series?.length ?? 0) + index + 12) % 12],
  }));
  const yTicks = series ? [Math.min(...series), (Math.min(...series) + Math.max(...series)) / 2, Math.max(...series)] : [];

  const orderUrl = buildMarketOrderUrl(
    [{ slug: entry.slug, name: entry.name, price: price ?? 0, unit: market?.unit ?? 'per bag', qty: quantity }],
    region,
  );

  return (
    <>
      {/* Hero */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {image ? <Image source={image} style={{ width: '100%', height: 180 }} resizeMode="cover" /> : null}
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text variant="caption" muted>
            {entry.category}
          </Text>
          <Text variant="h1">{entry.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <TrendBadge trend={market?.trend} />
            <DemandRow demand={market?.demand} />
          </View>
          <Text variant="body" muted>
            {entry.about}
          </Text>
        </View>
      </Card>

      {/* Price and order */}
      <Card style={{ gap: theme.spacing.md }}>
        <Dropdown
          label="Prices for"
          options={[{ id: '', label: 'National average' }, ...centers.map((center) => ({ id: center.region, label: center.region }))]}
          selectedId={region}
          onSelect={setRegion}
        />

        {price != null ? (
          <>
            <View>
              <Text variant="h1">{formatCedi(price)}</Text>
              <Text variant="caption" muted>
                {market?.unit ?? 'per bag'}
                {region && basePrice != null && price !== basePrice
                  ? ` · ${price > basePrice ? '+' : ''}${(((price - basePrice) / basePrice) * 100).toFixed(0)}% vs national`
                  : ''}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Text variant="caption" muted>
                Quantity
              </Text>
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                accessibilityRole="button"
                accessibilityLabel="Reduce quantity"
                hitSlop={10}
              >
                <Ionicons name="remove-circle-outline" size={26} color={theme.colors.muted} />
              </Pressable>
              <Text variant="bodyStrong">{quantity}</Text>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                hitSlop={10}
              >
                <Ionicons name="add-circle-outline" size={26} color={theme.colors.muted} />
              </Pressable>
              <Text variant="bodyStrong" style={{ marginLeft: 'auto' }}>
                {formatCedi(price * quantity)}
              </Text>
            </View>

            <Button
              label="Add to cart"
              onPress={() => onAdd({ slug: entry.slug, name: entry.name, price, unit: market?.unit ?? 'per bag' }, quantity)}
              icon={<Ionicons name="cart-outline" size={16} color={theme.colors.onAccent} />}
            />
            {canPlaceOrder() && orderUrl ? (
              <Button
                label="Order on WhatsApp"
                variant="outline"
                onPress={() => Linking.openURL(orderUrl)}
                icon={<Ionicons name="logo-whatsapp" size={16} color={theme.colors.accent} />}
              />
            ) : null}
          </>
        ) : (
          <Text variant="body" muted>
            No price is published for this commodity yet.
          </Text>
        )}
      </Card>

      {/* Price history */}
      {series && series.length >= 2 ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text variant="h3">6-month price trend</Text>
          <LineAreaChart
            points={points}
            width={chartWidth}
            height={200}
            color={theme.colors.chartRain}
            yTicks={yTicks}
            formatY={(value) => `GH₵${Math.round(value)}`}
            xLabels={xLabels}
          />
          {change ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <StatTile icon="market" label="Current" value={formatCedi(change.last)} />
              <StatTile
                icon={change.direction === 'down' ? TrendDown : TrendUp}
                label="6-month change"
                value={`${change.delta >= 0 ? '+' : '−'}${formatCedi(Math.abs(change.delta))}`}
              />
              <StatTile icon={ArrowUp} label="Period high" value={formatCedi(change.high)} />
              <StatTile icon={ArrowDown} label="Period low" value={formatCedi(change.low)} />
            </View>
          ) : null}
          <Text variant="caption" muted>
            National average price per {market?.unit?.replace('per ', '') ?? 'bag'}, over the six months ending this month. Regional prices
            apply each market centre&apos;s premium to this line.
          </Text>
        </Card>
      ) : null}

      {/* Timing */}
      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="h3">Market timing</Text>
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            backgroundColor: tone + '1a',
            borderRadius: theme.radii.md,
            // A tinted block nested in a card is inlaid into it, not laid on it.
            boxShadow: theme.sunken('sm'),
            padding: theme.spacing.md,
          }}
        >
          <Ionicons name={timingIcon(timing.tone)} size={20} color={tone} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={tone}>
              {timing.title}
            </Text>
            <Text variant="caption" muted>
              {timing.detail}
            </Text>
          </View>
        </View>

        {trend ? (
          <>
            {trend.seasonalPattern ? <Text variant="body">{trend.seasonalPattern}</Text> : null}
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.accent + '1a',
                  borderRadius: theme.radii.md,
                  // A tinted block nested in a card is inlaid into it, not laid on it.
                  boxShadow: theme.sunken('sm'),
                  padding: theme.spacing.md,
                }}
              >
                <Text variant="caption" color={theme.colors.accent}>
                  Peak months
                </Text>
                <Text variant="bodyStrong">{formatMonths(trend.peakMonths)}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.warning + '1a',
                  borderRadius: theme.radii.md,
                  // A tinted block nested in a card is inlaid into it, not laid on it.
                  boxShadow: theme.sunken('sm'),
                  padding: theme.spacing.md,
                }}
              >
                <Text variant="caption" color={theme.colors.warning}>
                  Low months
                </Text>
                <Text variant="bodyStrong">{formatMonths(trend.lowMonths)}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text variant="body" muted>
            No seasonal history is published for this commodity yet.
          </Text>
        )}
      </Card>

      {/* Market centres */}
      {regionalPrices.length > 0 ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">Price by market centre</Text>
          {regionalPrices.map((row) => {
            const selected = row.region === region;
            return (
              <Pressable
                key={row.region}
                onPress={() => setRegion(selected ? '' : row.region)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${row.region}, ${formatCedi(row.price)}`}
              >
                {/* Chrome on a View, not the Pressable — see CommodityCard's
                    note: Android drops a Pressable's own background and
                    border while still drawing its children. */}
                {({ pressed }) => (
                  <View
                    style={{
                      backgroundColor: selected ? theme.colors.focus : theme.colors.bg,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      borderColor: selected ? theme.colors.focusRim : 'transparent',
                      // The chosen region stays pressed in, and keeps its
                      // highlight fill and rim so the state never rests on
                      // the shadow alone.
                      boxShadow: selected || pressed ? theme.sunken('sm') : theme.raised('sm'),
                      padding: theme.spacing.md,
                      gap: 2,
                      minHeight: theme.minTouchTarget,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                      <Text variant="bodyStrong">{row.region}</Text>
                      <Text variant="bodyStrong">{formatCedi(row.price)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                      <Text variant="caption" muted style={{ flex: 1 }} numberOfLines={1}>
                        {row.majorMarkets.join(' · ')}
                      </Text>
                      <Text variant="caption" color={row.premiumPct >= 0 ? theme.colors.accent : theme.colors.danger}>
                        {row.premiumPct >= 0 ? '+' : ''}
                        {row.premiumPct.toFixed(0)}%
                      </Text>
                    </View>
                    <Text variant="caption" muted>
                      {row.transportAccess} transport access
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Text variant="caption" muted>
            Select a centre to price the whole market against it.
          </Text>
        </Card>
      ) : null}

      {/* Related */}
      {related.length > 0 ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">More in {entry.category}</Text>
          {related.map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => router.push(`/commodity/${item.slug}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                minHeight: theme.minTouchTarget,
              })}
            >
              <Text variant="body" style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </>
  );
}
