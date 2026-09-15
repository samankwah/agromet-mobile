import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COMMODITY_CATEGORIES } from '../../shared/data/commodityCatalogue';
import { cartCount, useCartStore } from '../../shared/state/cartStore';
import { useMarketRegionStore } from '../../shared/state/marketRegionStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { Dropdown } from '../../shared/ui/Dropdown';
import { MockDataTag } from '../../shared/ui/MockDataTag';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { formatRelativeTime } from '../../shared/utils/formatRelativeTime';
import type { ResolvedCommodity } from '../../shared/utils/marketInsights';
import { CartSheet } from './components/CartSheet';
import { CommodityCard } from './components/CommodityCard';
import { MarketGridSkeleton } from './components/MarketSkeletons';
import { QuickViewSheet } from './components/QuickViewSheet';
import { useResolvedCatalogue } from './useMarket';

/**
 * The market list.
 *
 * A grid of commodity cards over a search box and two filters, and nothing
 * else — the intelligence lives in the quick view a card can open and in the
 * commodity screen a card navigates to. Filtering is in memory, as on the
 * calendar list screen: the whole catalogue is eighteen entries, so a
 * round-trip per keystroke would be slower and would fail offline.
 */
export function MarketScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const { status, error, refetch, resolved, usingCachedFallback, cachedAt, data, centers } = useResolvedCatalogue();
  const region = useMarketRegionStore((state) => state.region);
  const setRegion = useMarketRegionStore((state) => state.setRegion);
  const items = useCartStore((state) => state.items);
  const add = useCartStore((state) => state.add);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return resolved.filter(({ entry }) => {
      const matchesSearch =
        !term || entry.name.toLowerCase().includes(term) || entry.description.toLowerCase().includes(term);
      return matchesSearch && (category === 'All' || entry.category === category);
    });
  }, [resolved, search, category]);

  const quickViewed = quickViewSlug ? (resolved.find((item) => item.entry.slug === quickViewSlug) ?? null) : null;
  const count = cartCount(items);

  const addToCart = (item: ResolvedCommodity) => {
    add({
      slug: item.entry.slug,
      name: item.entry.name,
      price: item.price ?? 0,
      unit: item.market?.unit ?? 'per bag',
    });
  };

  // Two columns inside the Screen's horizontal padding, with one gap between
  // them. Computed here rather than left to flex so each card knows its own
  // width before it lays its photograph out.
  const cardWidth = Math.floor((width - theme.spacing.lg * 2 - theme.spacing.md) / 2);

  const regionOptions = [
    { id: '', label: 'National average' },
    ...centers.map((center) => ({ id: center.region, label: center.region })),
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Market prices</Text>
          <Text variant="body" muted>
            Commodity prices, trends and selling advice across Ghana.
          </Text>
        </View>
        <Pressable
          onPress={() => setCartOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Open cart, ${count} items` : 'Open cart'}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            minWidth: theme.minTouchTarget,
            minHeight: theme.minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="cart-outline" size={26} color={theme.colors.text} />
          {count > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 0,
                minWidth: 18,
                height: 18,
                paddingHorizontal: 4,
                borderRadius: 9,
                backgroundColor: theme.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" color={theme.colors.onAccent}>
                {count}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {usingCachedFallback ? (
        <Text variant="caption" muted>
          Showing the prices saved {formatRelativeTime(cachedAt!)}. You are offline.
        </Text>
      ) : null}
      {/* Both fallback reasons mean the same thing on screen: these are the
          seeded prices, not live ones. Saying so beats silently passing them
          off as current. */}
      {data?.fallback ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <MockDataTag />
          <Text variant="caption" muted style={{ flex: 1 }}>
            {data.fallback === 'offline'
              ? 'Showing sample prices. The AgroMet server could not be reached.'
              : data.fallback === 'partial'
                ? 'Some prices are samples. The server has not published every commodity yet.'
                : 'Showing sample prices. The server has no market data published yet.'}
          </Text>
        </View>
      ) : null}

      {/* Filters */}
      <View style={{ gap: theme.spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            // A well, matching ui/SearchField — this row is a hand-rolled
            // copy of it, so it has to read the same way.
            backgroundColor: theme.colors.bg,
            boxShadow: theme.sunken('sm'),
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            minHeight: theme.minTouchTarget,
          }}
        >
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search commodities"
            placeholderTextColor={theme.colors.muted}
            accessibilityLabel="Search commodities"
            style={{ flex: 1, color: theme.colors.text, fontFamily: theme.fontFamily.body, paddingVertical: theme.spacing.sm }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Dropdown
              label="Category"
              options={COMMODITY_CATEGORIES.map((name) => ({ id: name, label: name }))}
              selectedId={category}
              onSelect={setCategory}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Dropdown label="Prices for" options={regionOptions} selectedId={region} onSelect={setRegion} />
          </View>
        </View>
      </View>

      <AsyncStateView
        status={status}
        error={error}
        onRetry={refetch}
        skeleton={<MarketGridSkeleton cardWidth={cardWidth} />}
        isEmpty={visible.length === 0}
        emptyTitle="Nothing matches"
        emptyMessage="Try a different search or category."
      >
        <Text variant="caption" muted>
          {visible.length} {visible.length === 1 ? 'commodity' : 'commodities'}
          {region ? ` · ${region} pricing` : ''}
        </Text>

        {/* Two columns, paired up in rows — the grid is small and fixed, so a
            FlatList's virtualisation would cost more than it saves. */}
        <View style={{ gap: theme.spacing.md }}>
          {Array.from({ length: Math.ceil(visible.length / 2) }, (_, row) => {
            const pair = visible.slice(row * 2, row * 2 + 2);
            return (
              <View key={row} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                {pair.map((item) => (
                  <CommodityCard
                    key={item.entry.slug}
                    resolved={item}
                    width={cardWidth}
                    onQuickView={setQuickViewSlug}
                  />
                ))}
                {/* Keeps a lone last card in the left column. */}
                {pair.length === 1 ? <View style={{ width: cardWidth }} /> : null}
              </View>
            );
          })}
        </View>
      </AsyncStateView>

      {quickViewed ? (
        <QuickViewSheet
          resolved={quickViewed}
          region={region}
          onClose={() => setQuickViewSlug(null)}
          onAddToCart={addToCart}
        />
      ) : null}

      {cartOpen ? <CartSheet region={region} onClose={() => setCartOpen(false)} /> : null}
    </Screen>
  );
}
