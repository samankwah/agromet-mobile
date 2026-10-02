import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';

/** Said wherever a price is on screen. Exported so tests pin the exact words. */
export const EXAMPLE_PRICES_MESSAGE =
  "Example prices. These are not today's market prices. Check with your local market before you buy or sell.";

/**
 * Says the prices are examples, not quotes.
 *
 * The market figures are illustrative: the backend serves seeded numbers and
 * the app falls back to its own when it cannot reach it. A farmer who took one
 * for today's price could sell under value, so this is shown every time, not
 * only when a fallback is in play. Informative, not a warning: the screen is
 * still useful for comparing crops and seeing seasonal movement.
 *
 * `inline` drops the card, for a surface that is already a card (the quick
 * view sheet), where a card inside a card would read as a second control.
 */
export function ExamplePricesNotice({ inline = false }: { inline?: boolean }) {
  const theme = useTheme();

  const body = (
    <>
      <Ionicons name="information-circle-outline" size={18} color={theme.colors.teal} style={{ marginTop: 1 }} />
      <Text variant="caption" muted style={{ flex: 1 }}>
        {EXAMPLE_PRICES_MESSAGE}
      </Text>
    </>
  );

  if (inline) {
    return <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>{body}</View>;
  }

  return (
    <Card
      style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
        alignItems: 'flex-start',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.teal,
      }}
    >
      {body}
    </Card>
  );
}
