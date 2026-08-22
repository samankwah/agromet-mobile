import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { synthesiseAlerts } from '../../../../shared/domain/hazardAlerts';
import type { WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { useHazardSummary } from '../../flood-drought/useHazards';
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
import { AlertDetailsSkeleton } from '../components/AlertSkeletons';
import { RemindMeButton } from '../../../farm-tools/reminders/components/RemindMeButton';
import { atTimeOfDay } from '../../../../shared/utils/dates';

type Props = { alertId: string };

export function AlertDetailsScreen({ alertId }: Props) {
  // Re-derived from the same national summary the banner used, rather than
  // fetched per alert. Two consequences worth having: this screen now opens
  // offline from the cached snapshot, and it always shows the current reading
  // rather than whatever the band was when the row was tapped.
  const query = useHazardSummary();
  const alert = useMemo(
    () => synthesiseAlerts(query.data, []).find((entry) => entry.id === alertId),
    [query.data, alertId],
  );

  return (
    <Screen>
      <AsyncStateView
        status={query.status}
        error={query.error}
        onRetry={query.refetch}
        skeleton={<AlertDetailsSkeleton />}
        isEmpty={query.status === 'success' && !alert}
        emptyTitle="This alert is no longer active"
        emptyMessage="Conditions have changed since it was issued. Open the flood and drought monitor for the current reading."
      >
        {alert ? <AlertDetails alert={alert} /> : null}
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
          {alert.district ? `${alert.district}, ` : ''}
          {alert.region} · {alert.hazardType}
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

      {alert.evidence.length > 0 ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">What the reading shows</Text>
          {/* Muted, not accent: these are the measurements behind the score,
              not actions and not predicted impacts. */}
          <BulletList items={alert.evidence} />
          <Text variant="caption" muted>
            A regional indicator, not a district forecast.
          </Text>
        </Card>
      ) : null}

      <Card style={{ gap: theme.spacing.md }} raised>
        <Text variant="h3">What to do</Text>
        <BulletList items={alert.farmerActions} accent />

        {/* Reading the advice and remembering to act on it are different
            things. Due tomorrow morning, but never after the alert itself has
            expired — a reminder about a passed hazard is just noise. */}
        <RemindMeButton
          seed={{
            title: alert.headline,
            note: alert.farmerActions.join(' · '),
            dueAt: reminderDueAt(alert.expiresAt).toISOString(),
            repeat: 'none',
            source: 'weather-alert',
            sourceRef: { alertId: alert.id },
          }}
        />
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

/**
 * When to be reminded about an alert: tomorrow at 07:00, pulled earlier if the
 * alert expires before then. Clamped to an hour from now at the very least, so
 * an alert expiring imminently still produces a reminder that can fire.
 */
function reminderDueAt(expiresAt: string): Date {
  const tomorrowMorning = atTimeOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000), 7);
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() > tomorrowMorning.getTime()) return tomorrowMorning;

  const anHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  return expiry.getTime() > anHourFromNow.getTime() ? expiry : anHourFromNow;
}
