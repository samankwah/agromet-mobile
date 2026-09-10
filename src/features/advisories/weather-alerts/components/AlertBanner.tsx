import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { compareSeverityDesc, getSeverityMeta } from '../../../../shared/domain/alertSeverity';
import { alertProvenanceLine, type WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { formatRelativeTime } from '../../../../shared/utils/formatRelativeTime';
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
  /** True when alerts are scoped to something — a saved district or one that
   * geolocation resolved. */
  hasDistrictScope: boolean;
  /** True when there is no scope and location detection has finished trying,
   * so the card should invite the farmer to turn location on or pick manually. */
  locationPrompt: boolean;
  locationPermission?: LocationPermissionState;
  usingCachedFallback?: boolean;
  cachedAt?: string;
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
 * The highest-severity active alert, or nothing.
 *
 * **There is no "no active alerts" state any more, on any surface.** A computed
 * reading stands for ten minutes (`HAZARD_ALERT_VALIDITY_MINUTES`) against a
 * model that refreshes every six hours, so that card was what both Home and
 * Advisories displayed almost all of the time: a permanent, prominent report
 * that there was no news. An alert announces itself when there is one — through
 * this card and through `AlertPopup` — and silence needs no announcement.
 *
 * The skeleton went with it. A placeholder promises content, and here the
 * content usually never comes, so a card-shaped shimmer collapsing a second
 * later is a worse flicker than the card it stood in for.
 *
 * The error case is handled here rather than by `AsyncStateView`, which is the
 * house pattern everywhere else. `AsyncStateView` swaps its whole region for a
 * "Couldn't load this" panel, and on Home that panel lands *above* a screen
 * whose weather, carousel and forecast have all loaded fine — implying the app
 * is down when only one section is. In districts where the connection drops
 * routinely, that is the first thing a farmer sees on a bad morning.
 *
 * So a failure degrades to one muted line instead. Not knowing is not the same
 * as nothing, which is why that line survives when the calm state did not. The
 * loud panel is still right on FloodDroughtScreen, where hazards are the whole
 * page and an error is the correct headline.
 *
 * Deliberately no mock fallback: inventing a flood warning is far worse than
 * saying nothing. hazardsService's own docblock argues the same.
 */
export function AlertBanner({
  alerts,
  status,
  error,
  onRetry,
  locationPrompt,
  locationPermission,
  usingCachedFallback,
  cachedAt,
}: Props) {
  if (status === 'error') {
    return <AlertsUnavailable onRetry={onRetry} />;
  }

  if (!alertBannerHasContent({ status, alerts, locationPrompt })) return null;

  // Alerts are not localised yet and detection has finished trying. Rendered
  // outside `AsyncStateView` on purpose: it describes the reader's own settings,
  // not the state of the alerts query, so it should not wait on a fetch to say
  // something already known.
  if (alerts.length === 0) return <LocationPrompt permission={locationPermission} />;

  return <AlertBannerCard alert={highestSeverityAlert(alerts)} usingCachedFallback={usingCachedFallback} cachedAt={cachedAt} />;
}

/**
 * The one empty state left: alerts are not tied to anywhere yet.
 *
 * The app tries to place the farmer from their location on its own; this shows
 * when that could not happen — permission refused, or no fix. It leads with
 * turning location on (the path that needs no typing) and keeps the manual
 * district picker as the second option.
 */
function LocationPrompt({ permission }: { permission?: LocationPermissionState }) {
  const theme = useTheme();
  const denied = permission === 'denied';

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          Alerts for where you are
        </Text>
      </View>
      <Text variant="body" muted style={{ marginTop: theme.spacing.xs }}>
        {denied
          ? 'Turn on location and AgroMet will send alerts for your area.'
          : 'AgroMet could not find your area. Turn on location, or choose your districts by hand.'}
      </Text>
      {denied ? (
        <Pressable
          onPress={openLocationSettings}
          accessibilityRole="button"
          style={{ marginTop: theme.spacing.sm, minHeight: theme.minTouchTarget, justifyContent: 'center' }}
        >
          <Text variant="body" color={theme.colors.accent}>
            Open settings →
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push('/saved-districts')}
        accessibilityRole="button"
        style={{ marginTop: theme.spacing.xs, minHeight: theme.minTouchTarget, justifyContent: 'center' }}
      >
        <Text variant="body" color={theme.colors.accent}>
          Choose districts manually →
        </Text>
      </Pressable>
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
  // These readings are regional; a district is named only when one of the
  // reader's saved districts pins it. Interpolating it unguarded rendered
  // "undefined, Northern" — visibly, and in the accessibility label.
  const place = alert.district ? `${alert.district}, ${alert.region}` : alert.region;

  return (
    <Pressable
      onPress={() => router.push(`/alert/${alert.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.a11yLabel}. ${alert.headline}, ${place}. ${alertProvenanceLine(alert)}. View details.`}
    >
      <Card raised style={{ borderLeftWidth: 4, borderLeftColor: color, gap: theme.spacing.xs }}>
        <SeverityBadge severity={alert.severity} />
        <Text variant="h3" numberOfLines={2}>
          {alert.headline}
        </Text>
        <Text variant="body" muted numberOfLines={1}>
          {place}
        </Text>
        {/* CAP's urgency, certainty and sender, on the card rather than one tap
            away: "Expected · possible · AgroMet hazard model" and "Happening
            now · Ghana Meteorological Agency (GMet)" call for different
            responses, and a reader should not have to open anything to tell a
            model index from a forecaster's bulletin. */}
        <Text variant="caption" muted numberOfLines={1}>
          {alertProvenanceLine(alert)}
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
