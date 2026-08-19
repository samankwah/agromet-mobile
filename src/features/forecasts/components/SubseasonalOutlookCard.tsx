import React from 'react';
import { View } from 'react-native';

import type { SubseasonalOutlook } from '../../../shared/domain/subseasonalOutlook';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Text } from '../../../shared/ui/Text';
import { OutlookCategoryStat } from './OutlookCategoryStat';

type Props = {
  outlook: SubseasonalOutlook | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * A dashed border + ConfidenceBadge + the mandatory plainLanguageSummary
 * (rendered prominently, first, not buried) mark this as probabilistic —
 * visually distinct from the deterministic Today/7-Day sections, so it
 * can't be mistaken for a forecast.
 */
export function SubseasonalOutlookCard({ outlook, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry}>
      {outlook ? (
        <Card style={{ gap: theme.spacing.sm, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="h3">Next 2–4 weeks</Text>
            <ConfidenceBadge level={outlook.confidenceLevel} />
          </View>
          <Text variant="body">{outlook.plainLanguageSummary}</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <OutlookCategoryStat
              label="Rainfall"
              category={outlook.rainfallOutlook.category}
              pct={outlook.rainfallOutlook.probabilityPct}
            />
            <OutlookCategoryStat
              label="Temperature"
              category={outlook.temperatureOutlook.category}
              pct={outlook.temperatureOutlook.probabilityPct}
            />
          </View>
          <View>
            <Text variant="bodyStrong" style={{ marginBottom: theme.spacing.xs }}>
              {outlook.farmerActionCard.headline}
            </Text>
            <BulletList items={outlook.farmerActionCard.actions} accent />
          </View>
          <MockDataTag />
        </Card>
      ) : null}
    </AsyncStateView>
  );
}
