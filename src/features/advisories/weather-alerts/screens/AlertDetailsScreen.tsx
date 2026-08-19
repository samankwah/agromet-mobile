import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { getAlertById } from '../../../../shared/api/alertsService';
import type { WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../../shared/ui/BulletList';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { DetailRow } from '../../../../shared/ui/DetailRow';
import { Screen } from '../../../../shared/ui/Screen';
import { SeverityBadge } from '../../../../shared/ui/SeverityBadge';
import { Text } from '../../../../shared/ui/Text';
import { formatRelativeTime } from '../../../../shared/utils/formatRelativeTime';

type Props = { alertId: string };

export function AlertDetailsScreen({ alertId }: Props) {
  const query = useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => getAlertById(alertId),
  });

  return (
    <Screen>
      <AsyncStateView status={query.status} error={query.error} onRetry={query.refetch}>
        {query.data ? <AlertDetails alert={query.data} /> : null}
      </AsyncStateView>
    </Screen>
  );
}

function AlertDetails({ alert }: { alert: WeatherAlert }) {
  const theme = useTheme();
  const issued = new Date(alert.issuedAt);
  const expires = new Date(alert.expiresAt);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card style={{ gap: theme.spacing.sm }}>
        <SeverityBadge severity={alert.severity} />
        <Text variant="h1">{alert.headline}</Text>
        <Text variant="body" muted>
          {alert.district}, {alert.region} · {alert.hazardType}
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.xs }}>
        <DetailRow
          label="Issued"
          value={`${issued.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (${formatRelativeTime(alert.issuedAt)})`}
        />
        <DetailRow
          label="Expires"
          value={`${expires.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (${formatRelativeTime(alert.expiresAt)})`}
        />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">Expected impacts</Text>
        <BulletList items={alert.expectedImpacts} />
      </Card>

      <Card style={{ gap: theme.spacing.sm }} raised>
        <Text variant="h3">What to do</Text>
        <BulletList items={alert.farmerActions} accent />
      </Card>

      <Card style={{ gap: theme.spacing.xs }}>
        <Text variant="caption" muted>
          Source: {alert.source}
        </Text>
      </Card>

      <Button label="Manage my districts" variant="outline" onPress={() => router.push('/saved-districts')} />
    </View>
  );
}
