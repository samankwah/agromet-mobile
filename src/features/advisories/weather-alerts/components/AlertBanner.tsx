import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { compareSeverityDesc, getSeverityMeta } from '../../../../shared/domain/alertSeverity';
import type { WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { formatRelativeTime } from '../../../../shared/utils/formatRelativeTime';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../../shared/ui/AsyncStateView';
import { Card } from '../../../../shared/ui/Card';
import { SeverityBadge } from '../../../../shared/ui/SeverityBadge';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  alerts: WeatherAlert[];
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
  hasSavedDistricts: boolean;
  usingCachedFallback?: boolean;
  cachedAt?: string;
};

function highestSeverityAlert(alerts: WeatherAlert[]): WeatherAlert {
  return [...alerts].sort((a, b) => compareSeverityDesc(a.severity, b.severity))[0];
}

/**
 * Home's most prominent card — shows the highest-severity active alert for
 * the farmer's saved districts, or a calm "no active alerts" state.
 * Reused as-is (not duplicated) by any future "all alerts" list, since it
 * only needs a list of alerts and a few status flags to render.
 */
export function AlertBanner({ alerts, status, error, onRetry, hasSavedDistricts, usingCachedFallback, cachedAt }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry}>
      {alerts.length === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.severityColors.normal} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {hasSavedDistricts ? 'No active alerts for your saved districts' : 'No active alerts'}
            </Text>
          </View>
          {!hasSavedDistricts ? (
            <Pressable
              onPress={() => router.push('/saved-districts')}
              accessibilityRole="button"
              style={{ marginTop: theme.spacing.sm, minHeight: theme.minTouchTarget, justifyContent: 'center' }}
            >
              <Text variant="body" color={theme.colors.accent}>
                Save your districts to get alerts that matter to you →
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <AlertBannerCard alert={highestSeverityAlert(alerts)} usingCachedFallback={usingCachedFallback} cachedAt={cachedAt} />
      )}
    </AsyncStateView>
  );
}

function AlertBannerCard({
  alert,
  usingCachedFallback,
  cachedAt,
}: {
  alert: WeatherAlert;
  usingCachedFallback?: boolean;
  cachedAt?: string;
}) {
  const theme = useTheme();
  const meta = getSeverityMeta(alert.severity);
  const color = theme.severityColors[meta.colorToken];

  return (
    <Pressable
      onPress={() => router.push(`/alert/${alert.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.a11yLabel}. ${alert.headline}, ${alert.district}. View details.`}
    >
      <Card raised style={{ borderLeftWidth: 4, borderLeftColor: color, gap: theme.spacing.xs }}>
        <SeverityBadge severity={alert.severity} />
        <Text variant="h3" numberOfLines={2}>
          {alert.headline}
        </Text>
        <Text variant="body" muted numberOfLines={1}>
          {alert.district}, {alert.region}
        </Text>
        {usingCachedFallback ? (
          <Text variant="caption" muted>
            Showing alerts saved {cachedAt ? formatRelativeTime(cachedAt) : 'earlier'}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
