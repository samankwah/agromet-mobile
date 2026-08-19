import React from 'react';
import { View } from 'react-native';

import type { SubseasonalOutlook } from '../../../shared/domain/subseasonalOutlook';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { SubseasonalOutlookCard } from './SubseasonalOutlookCard';

type Props = {
  outlook: SubseasonalOutlook | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * The weeks 2-4 outlook, now its own timescale segment between 7-Day and
 * Outlook — so the four segments read as a clean progression from
 * deterministic (Today, 7-Day) to probabilistic (Subseasonal, Outlook),
 * which is exactly the distinction farmers need to not confuse the two.
 */
export function SubseasonalSection({ outlook, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Text variant="caption" muted>
        A probability-based outlook for the next 2–4 weeks — not a day-to-day forecast. Use it to plan ahead, and follow the Today and 7-Day
        sections for immediate decisions.
      </Text>
      <SubseasonalOutlookCard outlook={outlook} status={status} error={error} onRetry={onRetry} />
    </View>
  );
}
