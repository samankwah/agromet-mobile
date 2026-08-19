import React from 'react';
import { View } from 'react-native';

import { useLocationStore } from '../../shared/state/locationStore';
import { ComingSoonCard } from '../../shared/ui/ComingSoonCard';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { AlertBanner } from './weather-alerts/components/AlertBanner';
import { useAlerts } from './weather-alerts/useAlerts';

/**
 * Composed screen: Weather Alerts is a fully working relocated feature and
 * gets a real, live section here (not hidden behind a generic stub);
 * crop-specific advisory, flood/drought monitoring, and the advisory
 * archive are future-milestone sections, shown as ComingSoonCard rows so
 * their place in the IA is visible now.
 */
export function AdvisoriesScreen() {
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const alerts = useAlerts(savedDistrictIds, hasHydrated);

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

      <ComingSoonCard
        icon="leaf-outline"
        title="Crop-specific advisory"
        message="Filter advisories by crop, growth stage, and district — planting, fertilizer, irrigation, and harvest guidance."
      />
      <ComingSoonCard
        icon="water-outline"
        title="Flood & Drought monitoring"
        message="Dedicated flood-risk and drought-risk bulletins for your district."
      />
      <ComingSoonCard icon="archive-outline" title="Advisory archive & search" message="Browse and search past advisories." />
    </Screen>
  );
}
