import React, { useMemo } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { isCurrent, synthesiseAlerts } from '../../../../shared/domain/hazardAlerts';
import {
  alertAttribution,
  alertUrgencyLabel,
  type WeatherAlert,
} from '../../../../shared/domain/weatherAlert';
import { useHazardSummary } from '../../flood-drought/useHazards';
import { effectiveDistrictIds, useLocationStore } from '../../../../shared/state/locationStore';
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
  // Scoped to the reader's own districts first, then unscoped.
  //
  // This used to pass `[]` unconditionally, which made `synthesiseAlerts` cover
  // every region and name no district at all — so the place line here silently
  // lost the district the banner had just shown.
  //
  // But scoping *only* to the reader's districts would break the other
  // direction: a reminder saved months ago, or a link shared between
  // neighbours, points at a region the reader may not have, and that alert
  // would read "no longer active" while it was still in force. So the scoped
  // pass supplies the district when there is one, and the unscoped pass
  // guarantees the alert resolves either way.
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const detectedDistrictId = useLocationStore((state) => state.detectedDistrictId);
  const districtIds = useMemo(
    () => effectiveDistrictIds(savedDistrictIds, detectedDistrictId),
    [savedDistrictIds, detectedDistrictId],
  );
  const alert = useMemo(() => {
    // Lapsed alerts are excluded here too, so a reminder that fires after the
    // hazard has passed opens the "no longer active" state rather than a warning
    // about weather that is over.
    const matches = (entry: WeatherAlert) => entry.id === alertId && isCurrent(entry);
    return (
      synthesiseAlerts(query.data, districtIds).find(matches) ??
      synthesiseAlerts(query.data, []).find(matches)
    );
  }, [query.data, districtIds, alertId]);

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

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card style={{ gap: theme.spacing.sm }}>
        <SeverityBadge severity={alert.severity} />
        <Text variant="h1">{alert.headline}</Text>
        <Text variant="body" muted>
          {alert.district ? `${alert.district}, ` : ''}
          {alert.region} · {alert.hazardType}
        </Text>
        {/* CAP urgency and certainty. Certainty is absent on a bulletin — a
            forecaster's confidence is not something this app can compute — so
            the line reads "Happening now" alone in that case. */}
        <Text variant="body" muted>
          {alertUrgencyLabel(alert)}
          {alert.certainty ? ` · ${alert.certainty}` : ''}
        </Text>
      </Card>

      {/* Stacked, not side by side. A timestamp with its relative form, and a
          full source attribution, are both wider than a phone leaves beside a
          label — laid out as rows they squeezed every label until it broke
          mid-word. */}
      <Card style={{ gap: theme.spacing.sm }}>
        <DetailRow stacked label="Issued" value={stamp(alert.issuedAt)} />
        <DetailRow stacked label="Expires" value={stamp(alert.expiresAt)} />
        {/* CAP `sender`, given a row of its own beside the timings rather than
            a muted caption at the foot of the screen. Whether a human issued
            this or a model computed it is among the most important things on
            the page, and it used to carry the weakest emphasis on it. */}
        <DetailRow
          stacked
          label={alert.provenance === 'issued' ? 'Issued by' : 'Computed by'}
          // The full attribution, datasets and all — this row replaces the
          // muted "Source:" caption that used to close the screen.
          value={alert.source}
        />
        {alert.sourceUrl ? (
          <Pressable
            onPress={() => Linking.openURL(alert.sourceUrl as string)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${alertAttribution(alert)} data source`}
            style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}
          >
            <Text variant="caption" color={theme.colors.accent}>
              About the data behind this reading →
            </Text>
          </Pressable>
        ) : null}
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

      <Button label="Manage my districts" variant="outline" onPress={() => router.push('/saved-districts')} />
    </View>
  );
}

/**
 * A timestamp and how long ago it was, on one line.
 *
 * No year: an alert is valid for a day at most, and `formatRelativeTime` already
 * says "3 days ago" if a cached snapshot is older than it looks. Four characters
 * of "2026" were the difference between this fitting a phone and not.
 */
function stamp(iso: string): string {
  const at = new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${at} · ${formatRelativeTime(iso)}`;
}

/**
 * When to be reminded about an alert: tomorrow at 07:00, pulled earlier if the
 * alert expires before then. Clamped to an hour from now at the very least, so
 * an alert expiring imminently still produces a reminder that can fire.
 *
 * That floor now always wins for a computed reading, whose window is ten minutes
 * (`HAZARD_ALERT_VALIDITY_MINUTES`) — so the reminder fires about fifty minutes
 * after the alert has come off the banner. Deliberate: a notification scheduled
 * for eight minutes' time is one a farmer is still holding the phone for, which
 * is no reminder at all. The alert stays reachable at `/alert/[id]`, and the
 * screen says "no longer active" if conditions have since eased.
 */
function reminderDueAt(expiresAt: string): Date {
  const tomorrowMorning = atTimeOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000), 7);
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() > tomorrowMorning.getTime()) return tomorrowMorning;

  const anHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  return expiry.getTime() > anHourFromNow.getTime() ? expiry : anHourFromNow;
}
