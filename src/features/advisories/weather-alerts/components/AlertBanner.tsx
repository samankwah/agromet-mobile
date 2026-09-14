import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { compareSeverityDesc, getSeverityMeta } from '../../../../shared/domain/alertSeverity';
import { alertProvenanceLine, type WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { openLocationSettings, type LocationPermissionState } from '../../../../shared/location/locationClient';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { SeverityBadge } from '../../../../shared/ui/SeverityBadge';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  alerts: WeatherAlert[];
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
  /** True when the banner is stuck on the default town because location was
   * refused, so it should offer to turn location on. */
  locationPrompt: boolean;
  locationPermission?: LocationPermissionState;
};

function highestSeverityAlert(alerts: WeatherAlert[]): WeatherAlert {
  return [...alerts].sort((a, b) => compareSeverityDesc(a.severity, b.severity))[0];
}

/**
 * Whether the banner will render anything at all.
 *
 * Exported because a caller needs to know before it draws a section heading
 * above one. `AdvisoriesScreen` puts "Weather Alerts" over this card, and a
 * heading with a void beneath it is worse than either the heading or the card
 * alone.
 *
 * The one asymmetry: when alerts are not localised yet there is still something
 * to say, because the reason no alert will arrive is worth a line. That is a
 * call to action, not a null result. While geolocation is still resolving,
 * though, there is nothing to say and nothing renders — no flash.
 */
export function alertBannerHasContent({
  status,
  alerts,
  locationPrompt,
}: {
  status: Props['status'];
  alerts: WeatherAlert[];
  locationPrompt: boolean;
}): boolean {
  if (status === 'error') return true;
  if (alerts.length > 0) return true;
  return locationPrompt;
}

/**
 * The highest-severity severe-weather alert for the reader's town, or nothing.
 *
 * **There is no "all clear" state.** The banner is empty on a calm day and
 * shows a card only when a storm, downpour, dangerous heat or damaging wind is
 * in the next day's forecast. It replaced the flood/drought index here, which
 * held several regions at "severe" every day of the rains and so was permanent
 * furniture (that index still lives, in full, on the Flood & Drought screen).
 *
 * The error case is handled here rather than by `AsyncStateView`: that swaps the
 * whole region for a "Couldn't load this" panel, and on Home it would land above
 * a screen whose weather and forecast loaded fine, implying the app is down when
 * one section is. So a failure degrades to one muted line instead.
 */
export function AlertBanner({ alerts, status, error, onRetry, locationPrompt, locationPermission }: Props) {
  if (status === 'error') {
    return <AlertsUnavailable onRetry={onRetry} />;
  }

  if (!alertBannerHasContent({ status, alerts, locationPrompt })) return null;

  if (alerts.length === 0) return <LocationPrompt permission={locationPermission} />;

  return <AlertBannerCard alert={highestSeverityAlert(alerts)} />;
}

/**
 * Shown only when the banner is stuck on the default town (Accra) because
 * location was refused and the farmer has not picked a town by hand. Everyone
 * else gets the alert or nothing.
 */
function LocationPrompt({ permission }: { permission?: LocationPermissionState }) {
  const theme = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          Weather alerts are for Accra
        </Text>
      </View>
      <Text variant="body" muted style={{ marginTop: theme.spacing.xs }}>
        Turn on location for alerts where you are, or tap a town above to choose one.
      </Text>
      {permission === 'denied' ? (
        <Pressable
          onPress={openLocationSettings}
          accessibilityRole="button"
          style={{ marginTop: theme.spacing.sm, minHeight: theme.minTouchTarget, justifyContent: 'center' }}
        >
          <Text variant="body" color={theme.colors.accent}>
            Open settings
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** One line, not a panel. Says what is missing, and that the rest of the page
 * is not. */
function AlertsUnavailable({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.muted} />
      <Text variant="caption" muted style={{ flex: 1 }}>
        Alerts need a connection to the AgroMet server. The weather below is up to date.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading alerts"
        // hitSlop rather than a 44dp box: a full-height button beside one line
        // of caption would reintroduce the visual weight this whole change is
        // removing. Same trade the chat composer's quiet buttons make.
        hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
      >
        {({ pressed }) => (
          <Text variant="caption" color={theme.colors.accent} style={{ opacity: pressed ? 0.6 : 1 }}>
            Retry
          </Text>
        )}
      </Pressable>
    </View>
  );
}

/** The day this alert is for, from its id (`weather:<town>:<hazard>:<date>`).
 * The banner opens that day's detail rather than a separate alert screen. */
function alertDate(alert: WeatherAlert): string {
  return alert.id.split(':')[3] ?? alert.issuedAt.slice(0, 10);
}

function AlertBannerCard({ alert }: { alert: WeatherAlert }) {
  const theme = useTheme();
  const meta = getSeverityMeta(alert.severity);
  const color = theme.severityColors[meta.colorToken];
  const place = alert.district ? `${alert.district}, ${alert.region}` : alert.region;

  return (
    <Pressable
      onPress={() => router.push(`/forecast-day/${alertDate(alert)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.a11yLabel}. ${alert.headline}, ${place}. ${alertProvenanceLine(alert)}. See the forecast.`}
    >
      <Card raised style={{ borderLeftWidth: 4, borderLeftColor: color, gap: theme.spacing.xs }}>
        <SeverityBadge severity={alert.severity} />
        <Text variant="h3" numberOfLines={2}>
          {alert.headline}
        </Text>
        <Text variant="body" muted numberOfLines={1}>
          {place}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {alertProvenanceLine(alert)}
        </Text>
      </Card>
    </Pressable>
  );
}
