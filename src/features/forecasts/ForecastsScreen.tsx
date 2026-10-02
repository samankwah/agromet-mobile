import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '../../shared/theme/ThemeProvider';
import { AppHeader } from '../../shared/ui/AppHeader';
import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useTabBarClearance } from '../../shared/ui/tabBarLayout';
import { Screen } from '../../shared/ui/Screen';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED, WeatherBackdrop } from '../../shared/ui/WeatherBackdrop';
import { SubseasonalSection } from './components/SubseasonalSection';
import { TodaySection } from './components/TodaySection';
import { WeekSection } from './components/WeekSection';
import { useForecastsData } from './useForecastsData';
import { ForecastSectionSkeleton } from './components/ForecastSkeletons';

/** The four standard forecast timescales, in parallel construction — and,
 * deliberately, ordered from deterministic (Daily, Weekly) to probabilistic
 * (Subseasonal, Seasonal), so the boundary between "what the weather will
 * do" and "what the climate is likely to do" falls in an obvious place. */
const SEGMENTS = ['Daily', 'Weekly', 'Subseasonal', 'Seasonal'];

/**
 * The segments another screen can deep-link to, by name rather than by index.
 *
 * Home's forecast and outlook tiles point here. Naming the target means
 * reordering `SEGMENTS` cannot silently send a tile to the wrong timescale — the
 * failure a bare `?segment=2` would have.
 */
export type ForecastSegment = 'daily' | 'weekly' | 'subseasonal' | 'seasonal';

const SEGMENT_INDEX: Record<ForecastSegment, number> = {
  daily: 0,
  weekly: 1,
  subseasonal: 2,
  seasonal: 3,
};

export function forecastSegmentIndex(segment: string | undefined): number {
  return SEGMENT_INDEX[segment as ForecastSegment] ?? 0;
}
const SUBSEASONAL_INDEX = 2;

function combineStatus(...statuses: ('pending' | 'error' | 'success')[]): 'pending' | 'error' | 'success' {
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('error')) return 'error';
  return 'success';
}

type Props = {
  /**
   * Which timescale the caller is asking for. Home's forecast tile passes
   * 'daily' and its outlook tile 'subseasonal'.
   *
   * Requested, not initial: this screen is a tab, so it stays mounted after its
   * first visit and reading the value once at mount would leave every later tap
   * on whichever segment was last open. Absent (the tab bar, which asks for no
   * particular timescale) leaves the reader where they were.
   */
  requestedSegment?: string;
};

export function ForecastsScreen({ requestedSegment }: Props = {}) {
  const theme = useTheme();
  const [segmentIndex, setSegmentIndex] = useState(() => forecastSegmentIndex(requestedSegment));

  // A tile taps its way here with a segment named; the tab bar arrives with
  // none. Only the first should move the reader, which is what the guard buys:
  // the route file clears the param once it has been handed over, so this fires
  // on the tap and not on the clearing render that follows it.
  useEffect(() => {
    if (requestedSegment) setSegmentIndex(forecastSegmentIndex(requestedSegment));
  }, [requestedSegment]);

  const { locationName, conditions, hourly, weekly, subseasonal, subseasonalSet } = useForecastsData();

  const todayStatus = combineStatus(conditions.status, hourly.status, weekly.status);
  const todayError = conditions.error ?? hourly.error ?? weekly.error;
  const today = weekly.data?.days[0];
  const isSubseasonal = segmentIndex === SUBSEASONAL_INDEX;

  // The tab bar floats over this screen, so every scroll container here owns
  // its own bottom clearance (Screen cannot add it: these all pass
  // `padded={false}`).
  const tabBarClearance = useTabBarClearance();
  const insets = useSafeAreaInsets();

  const renderHeader = (onBackdrop: boolean) => (
    <>
      <AppHeader
        title="Forecasts"
        subtitle={locationName}
        onBackdrop={onBackdrop ? { title: ON_BACKDROP_COLOR, subtitle: ON_BACKDROP_MUTED } : undefined}
      />
      <SegmentedControl
        segments={SEGMENTS}
        selectedIndex={segmentIndex}
        onChange={setSegmentIndex}
        accessibilityLabel="Forecast timescale"
      />
    </>
  );
  const header = renderHeader(false);

  // Subseasonal is a full-bleed spatial view with its own bottom drawer, so it
  // manages its own layout instead of sitting inside the shared scroll
  // container Daily and Weekly use.
  if (isSubseasonal) {
    return (
      <Screen scroll={false} padded={false}>
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.lg }}>{header}</View>
        <View style={{ flex: 1, marginTop: theme.spacing.lg, paddingBottom: tabBarClearance }}>
          <SubseasonalSection
            outlook={subseasonal.data}
            set={subseasonalSet.data}
            status={subseasonalSet.status}
            error={subseasonalSet.error}
            onRetry={subseasonalSet.refetch}
            outlookStatus={subseasonal.status}
            outlookError={subseasonal.error}
            onRetryOutlook={subseasonal.refetch}
          />
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
        <Screen scroll={false} padded={false} fullBleed>
          <WeatherBackdrop condition={conditions.data.condition} observedAt={conditions.data.observedAt}>
            <ThemeProvider forceScheme="dark">
              <ScrollView
                contentContainerStyle={{
                  padding: theme.spacing.lg,
                  // fullBleed released the top inset so the photograph runs
                  // behind the status bar; the hero text still has to clear it.
                  paddingTop: insets.top + theme.spacing.lg,
                  paddingBottom: theme.spacing.lg + tabBarClearance,
                  gap: theme.spacing.lg,
                }}
              >
                {renderHeader(true)}
                {segmentIndex === 0 ? (
                  <TodaySection conditions={conditions.data} today={today!} hourly={hourly.data!} />
                ) : (
                  <WeekSection forecast={weekly.data!} />
                )}
              </ScrollView>
            </ThemeProvider>
          </WeatherBackdrop>
        </Screen>
      );
    }

    return (
      <Screen scroll={false} padded={false}>
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.lg + tabBarClearance,
            gap: theme.spacing.lg,
          }}
        >
          {header}
          <AsyncStateView status={sectionStatus} error={sectionError} onRetry={retry} skeleton={<ForecastSectionSkeleton />}>
            {null}
          </AsyncStateView>
        </ScrollView>
      </Screen>
    );
  }

  // Seasonal. There is no seasonal source yet: the map that used to sit here
  // drew a made-up grid, and a farmer cannot tell a made-up outlook from a real
  // one. So the segment stays (deep links name it, and it is where the outlook
  // will land) but says plainly that nothing has been published.
  // SpatialOutlookView is kept for when a real feed exists; it is not mounted.
  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.lg + tabBarClearance,
          gap: theme.spacing.lg,
        }}
      >
        {header}
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="Seasonal outlook coming soon"
            message="The seasonal outlook for the rainy season will show here when it is published."
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
