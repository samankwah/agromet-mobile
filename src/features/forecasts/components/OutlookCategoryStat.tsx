import React from 'react';
import { View } from 'react-native';

import type { OutlookCategory } from '../../../shared/domain/subseasonalOutlook';
import { Text } from '../../../shared/ui/Text';

const CATEGORY_LABEL: Record<OutlookCategory, string> = {
  'below-normal': 'Below normal',
  normal: 'Normal',
  'above-normal': 'Above normal',
};

/** Shared by both outlook cards — feature-scoped rather than promoted to
 * shared/ui since `OutlookCategory` is a forecast-specific vocabulary, not
 * a general-purpose one yet. */
export function OutlookCategoryStat({ label, category, pct }: { label: string; category: OutlookCategory; pct: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="bodyStrong">{CATEGORY_LABEL[category]}</Text>
      <Text variant="caption" muted>
        {pct}% likely
      </Text>
    </View>
  );
}
