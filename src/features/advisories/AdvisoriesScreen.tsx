import React from 'react';
import { View } from 'react-native';
import { Archive, Drop, Egg, Leaf } from 'phosphor-react-native';

import { useLocationStore } from '../../shared/state/locationStore';
import { HubGrid, HubTile } from '../../shared/ui/HubGrid';
import { AppHeader } from '../../shared/ui/AppHeader';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { AlertBanner, alertBannerHasContent } from './weather-alerts/components/AlertBanner';
import { useWeatherAlerts } from './weather-alerts/useWeatherAlerts';
import { useDetectedDistrict } from './weather-alerts/useDetectedDistrict';
import { useHazardSummary } from './flood-drought/useHazards';

/**
 * Composed screen. Weather Alerts is live inline, the day's severe weather for
 * the reader's town; everything else is a tile in the grid below, routing out to
 * its own screen — the weekly crop and poultry advisories, the flood and drought
 * monitor (where the flood/drought index now lives in full), and the archive.
 *
 * Every tile here goes somewhere. The last two were placeholders holding their
 * place in the information architecture until the features existed, which they
 * now do.
 *
 * The tiles carry no description. They used to, and it mostly restated the
 * title in a longer form while pushing the fourth destination off the bottom of
 * the screen. What survives is the live figure under Flood & drought, which is
 * data the reader could not have guessed.
 */
export function AdvisoriesScreen() {
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);

  // Ask for location and pick the nearest town the first time Advisories mounts
  // with nothing chosen. No-ops on every later mount (and on Home's copy).
  useDetectedDistrict();

  // Shares the `['weeklyForecast', locationId]` query with Home and the
  // Forecasts tab, so this section costs no extra request.
  const alerts = useWeatherAlerts(locationId, hasHydrated);
  // The Flood & drought tile's live figure.
  const hazards = useHazardSummary();

  return (
    // `wallpaper`: same page ground as Home and the chat — see Screen's prop.
    <Screen wallpaper>
      <AppHeader title="Advisories" />
      {/* Heading and card together, or neither. The banner renders nothing when
          there is no alert to raise, and a "Weather Alerts" heading standing
          over an empty gap reads as a section that failed to load.

          Full width, above the grid: it is a live alert, not a destination. */}
      {alertBannerHasContent({
        status: alerts.status,
        alerts: alerts.alerts,
        locationPrompt: alerts.locationPrompt,
      }) ? (
        <View>
          <Text variant="h3" style={{ marginBottom: 8 }}>
            Weather Alerts
          </Text>
          <AlertBanner
            alerts={alerts.alerts}
            status={alerts.status}
            error={alerts.error}
            onRetry={alerts.refetch}
            locationPrompt={alerts.locationPrompt}
            locationPermission={alerts.locationPermission}
          />
        </View>
      ) : null}

      <HubGrid>
        <HubTile icon={Leaf} title="Crop advisory" linkLabel="Read advisory" actionLabel="Open crop advisory" route="/advisory/crop" />
        <HubTile
          icon={Egg}
          title="Poultry advisory"
          linkLabel="Read advisory"
          actionLabel="Open poultry advisory"
          route="/advisory/poultry"
        />
        <HubTile
          icon={Drop}
          title="Flood & drought"
          hint={
            hazards.national
              ? `${hazards.national.floodElevated} on flood alert · ${hazards.national.droughtElevated} in drought stress`
              : undefined
          }
          linkLabel="See conditions"
          actionLabel="Open flood & drought"
          route="/flood-drought"
        />
        <HubTile
          icon={Archive}
          title="Advisory archive"
          linkLabel="Browse archive"
          actionLabel="Open the archive"
          route="/advisory-archive"
        />
      </HubGrid>
    </Screen>
  );
}
