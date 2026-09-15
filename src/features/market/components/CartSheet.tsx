import React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cartTotal, useCartStore } from '../../../shared/state/cartStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Text } from '../../../shared/ui/Text';
import { buildMarketOrderUrl, canPlaceOrder } from '../../../shared/utils/buildMarketOrderText';
import { formatCedi } from '../../../shared/utils/marketInsights';

type Props = {
  region: string;
  onClose: () => void;
};

/** The cart, as a bottom sheet. Reads the store, so both market screens share it. */
export function CartSheet({ region, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const remove = useCartStore((state) => state.remove);

  const total = cartTotal(items);
  const orderUrl = buildMarketOrderUrl(items, region);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close cart"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            // Slides up over the whole screen, so it takes the deepest lift.
            boxShadow: theme.raised('lg'),
            padding: theme.spacing.lg,
            // The sheet is a sibling of the screen, not a child, so it does
            // not inherit SafeAreaView's insets — without this the action row
            // sits under the Android gesture bar.
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            gap: theme.spacing.md,
            maxHeight: '80%',
          }}
        >
          <View style={{ width: 40, height: 5, borderRadius: theme.radii.pill, backgroundColor: theme.colors.bg, boxShadow: theme.sunken('sm'), alignSelf: 'center' }} />

          <Text variant="h2">Cart</Text>

          {items.length === 0 ? (
            <EmptyState icon="cart-outline" title="Your cart is empty" message="Add a commodity to start an order." />
          ) : (
            <>
              <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: theme.spacing.sm }}>
                {items.map((item) => (
                  <View
                    key={item.slug}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.sm,
                      padding: theme.spacing.md,
                      gap: theme.spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="bodyStrong">{formatCedi(item.price * item.qty)}</Text>
                    </View>
                    <Text variant="caption" muted>
                      {formatCedi(item.price)} {item.unit}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                      <Pressable
                        onPress={() => updateQty(item.slug, item.qty - 1)}
                        accessibilityRole="button"
                        accessibilityLabel={`Reduce ${item.name} quantity`}
                        hitSlop={10}
                      >
                        <Ionicons name="remove-circle-outline" size={24} color={theme.colors.muted} />
                      </Pressable>
                      <Text variant="bodyStrong">{item.qty}</Text>
                      <Pressable
                        onPress={() => updateQty(item.slug, item.qty + 1)}
                        accessibilityRole="button"
                        accessibilityLabel={`Increase ${item.name} quantity`}
                        hitSlop={10}
                      >
                        <Ionicons name="add-circle-outline" size={24} color={theme.colors.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => remove(item.slug)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                        hitSlop={10}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Text variant="caption" color={theme.colors.danger}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body" muted>
                  Subtotal
                </Text>
                <Text variant="h3">{formatCedi(total)}</Text>
              </View>
              {region ? (
                <Text variant="caption" muted>
                  Prices reflect {region} market rates.
                </Text>
              ) : null}

              {canPlaceOrder() && orderUrl ? (
                <Button
                  label="Place order on WhatsApp"
                  onPress={() => Linking.openURL(orderUrl)}
                  icon={<Ionicons name="logo-whatsapp" size={16} color={theme.colors.onAccent} />}
                />
              ) : (
                /* An honest notice beats a button that opens an empty compose
                   window addressed to nobody. */
                <View
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                    backgroundColor: theme.colors.warning + '1a',
                    borderRadius: theme.radii.sm,
                    padding: theme.spacing.md,
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning} />
                  <Text variant="caption" muted style={{ flex: 1 }}>
                    No order desk is configured yet. Set EXPO_PUBLIC_MARKET_WHATSAPP to enable ordering.
                  </Text>
                </View>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
