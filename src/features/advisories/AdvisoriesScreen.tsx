import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useLocationStore } from '../../shared/state/locationStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { AlertBanner } from './weather-alerts/components/AlertBanner';
import { useAlerts } from './weather-alerts/useAlerts';
import { useHazardSummary } from './flood-drought/useHazards';

/**
 * Composed screen. Weather Alerts is live inline, from the flood/drought index;
 * everything else is a card that routes out to its own screen — the weekly crop
 * and poultry advisories, the flood and drought monitor, and the archive.
 *
 * Every row here now goes somewhere. The last two were placeholders holding
 * their place in the information architecture until the features existed,
 * which they now do.
 */
export function AdvisoriesScreen() {
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const alerts = useAlerts(savedDistrictIds, hasHydrated);
  // Same query key as the alerts banner and the monitor screen, so TanStack
  // serves all three from one request.
  const hazards = useHazardSummary();

  return (
    <Screen>
      <Text variant="h1">Advisories</Text>

      <View>
        <Text variant="h3" style={{ marginBottom: 8 }}>
          Weather Alerts
        </Text>
        <AlertBanner
          alerts={alerts.alerts}
          status={alerts.status}
          error={alerts.error}
          onRetry={alerts.refetch}
          hasSavedDistricts={savedDistrictIds.length > 0}
          usingCachedFallback={alerts.usingCachedFallback}
          cachedAt={alerts.cachedAt}
        />
      </View>

      <AdvisoryCard
        icon="leaf-outline"
        title="Crop advisory"
        message="This week’s weather for your crop and district, what it means, and what to do about it."
        actionLabel="Open crop advisory"
        route="/advisory/crop"
      />
      <AdvisoryCard
        icon="egg-outline"
        title="Poultry advisory"
        message="Management targets and recommended actions for your flock this week."
        actionLabel="Open poultry advisory"
        route="/advisory/poultry"
      />
      <AdvisoryCard
        icon="water-outline"
        title="Flood & drought"
        message="Current flood and drought conditions across Ghana's sixteen regions, measured against a thirty-year baseline."
        hint={
          hazards.national
            ? `${hazards.national.floodElevated} on flood alert · ${hazards.national.droughtElevated} in drought stress`
            : undefined
        }
        actionLabel="Open flood & drought"
        route="/flood-drought"
      />
      <AdvisoryCard
        icon="archive-outline"
        title="Advisory archive"
        message="Every advisory published for your region. Search by activity, or narrow it to a district and year."
        actionLabel="Open the archive"
        route="/advisory-archive"
      />
    </Screen>
  );
}

/** One section of the tab: an icon, a sentence, an optional live figure, and a
 * button through to the feature. */
function AdvisoryCard({
  icon,
  title,
  message,
  actionLabel,
  route,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel: string;
  route: '/advisory/crop' | '/advisory/poultry' | '/flood-drought' | '/advisory-archive';
  /** A live figure from the section itself, when there is one worth showing
   * before the reader taps through. */
  hint?: string;
}) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
        <Text variant="h3">{title}</Text>
      </View>
      <Text variant="body" muted>
        {message}
      </Text>
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
      <Button label={actionLabel} variant="outline" onPress={() => router.push(route)} />
    </Card>
  );
}
