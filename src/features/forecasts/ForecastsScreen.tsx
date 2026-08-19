import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ThemeProvider, useTheme } from '../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { Screen } from '../../shared/ui/Screen';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { Text } from '../../shared/ui/Text';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED, WeatherBackdrop } from '../../shared/ui/WeatherBackdrop';
import { SubseasonalSection } from './components/SubseasonalSection';
import { TodaySection } from './components/TodaySection';
import { WeekSection } from './components/WeekSection';
import { SpatialOutlookView } from './spatial-outlook/SpatialOutlookView';
import { useForecastsData } from './useForecastsData';

/** The four standard forecast timescales, in parallel construction — and,
 * deliberately, ordered from deterministic (Daily, Weekly) to probabilistic
 * (Subseasonal, Seasonal), so the boundary between "what the weather will
 * do" and "what the climate is likely to do" falls in an obvious place. */
const SEGMENTS = ['Daily', 'Weekly', 'Subseasonal', 'Seasonal'];
const OUTLOOK_INDEX = 3;

function combineStatus(...statuses: ('pending' | 'error' | 'success')[]): 'pending' | 'error' | 'success' {
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('error')) return 'error';
  return 'success';
}

export function ForecastsScreen() {
  const theme = useTheme();
  const [segmentIndex, setSegmentIndex] = useState(0);
  const { locationName, conditions, hourly, weekly, subseasonal, seasonal, mapLayers } = useForecastsData();

  const todayStatus = combineStatus(conditions.status, hourly.status, weekly.status);
  const todayError = conditions.error ?? hourly.error ?? weekly.error;
  const today = weekly.data?.days[0];
  const isOutlook = segmentIndex === OUTLOOK_INDEX;

  const renderHeader = (onBackdrop: boolean) => (
    <>
      <View>
        <Text variant="h1" color={onBackdrop ? ON_BACKDROP_COLOR : undefined}>
          Forecasts
        </Text>
        <Text variant="body" color={onBackdrop ? ON_BACKDROP_MUTED : undefined} muted={!onBackdrop}>
          {locationName}
        </Text>
      </View>
      <SegmentedControl
        segments={SEGMENTS}
        selectedIndex={segmentIndex}
        onChange={setSegmentIndex}
        accessibilityLabel="Forecast timescale"
      />
    </>
  );
  const header = renderHeader(false);

  // Outlook is a full-bleed spatial view with its own bottom drawer, so it
  // manages its own layout instead of sitting inside the shared scroll
  // container the other three segments use.
  if (isOutlook) {
    return (
      <Screen scroll={false} padded={false}>
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.lg }}>{header}</View>
        <View style={{ flex: 1, marginTop: theme.spacing.lg }}>
          <SpatialOutlookView seasonal={seasonal.data} />
        </View>
      </Screen>
    );
  }

  // Daily and Weekly are rendered full-bleed over a photograph of the
  // current sky, so the backdrop sits behind the header and segments too —
  // not just the content. The subtree is pinned to the dark palette because
  // that ground is always dark, whatever light/dark preference is set
  // elsewhere.
  //
  // The backdrop only exists once the conditions have loaded, so the
  // loading/error path falls back to the plain layout — and critically
  // still renders the header and segments, so a slow load never traps the
  // user on a tab they cannot switch away from.
  const isBackdropSegment = segmentIndex === 0 || segmentIndex === 1;

  if (isBackdropSegment) {
    const dailyReady = Boolean(conditions.data && hourly.data && today && weekly.data);
    const weeklyReady = Boolean(conditions.data && weekly.data);
    const ready = segmentIndex === 0 ? dailyReady : weeklyReady;

    const sectionStatus = segmentIndex === 0 ? todayStatus : combineStatus(conditions.status, weekly.status);
    const sectionError = segmentIndex === 0 ? todayError : (conditions.error ?? weekly.error);
    const retry = () => {
      conditions.refetch();
      if (segmentIndex === 0) hourly.refetch();
      weekly.refetch();
    };

    if (ready && conditions.data) {
      return (
        <Screen scroll={false} padded={false}>
          <WeatherBackdrop condition={conditions.data.condition} observedAt={conditions.data.observedAt}>
            <ThemeProvider forceScheme="dark">
              <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
                {renderHeader(true)}
                {segmentIndex === 0 ? (
                  <TodaySection
                    conditions={conditions.data}
                    today={today!}
                    hourly={hourly.data!}
                    actionCard={weekly.data!.farmerActionCard}
                  />
                ) : (
                  <WeekSection
                    forecast={weekly.data!}
                    mapLayers={mapLayers.data}
                    mapStatus={mapLayers.status}
                    mapError={mapLayers.error}
                    onRetryMap={mapLayers.refetch}
                  />
                )}
              </ScrollView>
            </ThemeProvider>
          </WeatherBackdrop>
        </Screen>
      );
    }

    return (
      <Screen scroll={false} padded={false}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          {header}
          <AsyncStateView status={sectionStatus} error={sectionError} onRetry={retry}>
            {null}
          </AsyncStateView>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        {header}

        {segmentIndex === 2 ? (
          <SubseasonalSection
            outlook={subseasonal.data}
            status={subseasonal.status}
            error={subseasonal.error}
            onRetry={subseasonal.refetch}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
