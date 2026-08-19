import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarActivity } from '../../../shared/domain/calendar';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Divider } from '../../../shared/ui/Divider';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { ActivityDetailSheet } from './components/ActivityDetailSheet';
import { CycleProgressCard } from './components/CycleProgressCard';
import { StartCycleForm } from './components/StartCycleForm';
import { SampleDataNotice } from './components/SampleDataNotice';
import { ActivityList } from './components/ActivityList';
import { CalendarGrid } from './components/CalendarGrid';
import { buildMonthBands, buildWeekBlockBands, resolveWeekOneDate, type GridDensity } from './gridGeometry';
import { useCalendarDetail } from './useCalendars';
import { useProductionCycle } from './useProductionCycle';

const VIEWS = ['Season', 'Weeks', 'List'];

type Props = { id: string };

export function CalendarDetailScreen({ id }: Props) {
  const theme = useTheme();
  const [viewIndex, setViewIndex] = useState(0);
  const [selected, setSelected] = useState<CalendarActivity | null>(null);
  const [startingCycle, setStartingCycle] = useState(false);

  const { status, error, calendar, activities, fallback, usingCachedFallback, cachedAt, refetch } = useCalendarDetail(id);
  const { cycle, start, isStarting, startError, resetStartError, setStatus, isUpdating } = useProductionCycle(id);

  // A running cycle is what turns week numbers into dates a farmer can act
  // on; without one the calendar is a relative schedule and stays that way.
  const weekOneDate = useMemo(
    () => resolveWeekOneDate({ cycleStartDate: cycle?.startDate ?? null, seasonStartMonth: null, year: calendar?.year ?? null }),
    [calendar?.year, cycle?.startDate],
  );
  const currentWeek = cycle?.currentWeek ?? null;

  const totalWeeks = calendar?.totalWeeks ?? 0;

  const bands = useMemo(
    () => (weekOneDate ? buildMonthBands(totalWeeks, weekOneDate) : buildWeekBlockBands(totalWeeks)),
    [totalWeeks, weekOneDate],
  );

  const density: GridDensity = viewIndex === 0 ? 'fit' : 'wide';

  return (
    <Screen>
      {usingCachedFallback ? (
        <Text variant="caption" muted>
          Showing the copy saved {formatRelativeTime(cachedAt!)} — the server could not be reached.
        </Text>
      ) : null}

      <AsyncStateView status={status} error={error} onRetry={refetch}>
        {calendar ? (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="h1">{calendar.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                <Text variant="caption" muted>
                  {[calendar.district, calendar.region].filter(Boolean).join(', ')}
                </Text>
                <Text variant="caption" muted>
                  ·
                </Text>
                <Text variant="caption" muted>
                  {totalWeeks} weeks
                </Text>
                {calendar.breedType ? (
                  <>
                    <Text variant="caption" muted>
                      ·
                    </Text>
                    <Text variant="caption" muted>
                      {calendar.breedType}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            {calendar.description ? (
              <Text variant="body" muted>
                {calendar.description}
              </Text>
            ) : null}

            {cycle ? (
              <CycleProgressCard
                cycle={cycle}
                activities={activities}
                totalWeeks={totalWeeks}
                onSetStatus={setStatus}
                isUpdating={isUpdating}
              />
            ) : (
              <Button
                label={calendar.calendarType === 'cycle' ? 'Start a flock cycle' : 'Start a planting'}
                variant="outline"
                onPress={() => setStartingCycle(true)}
              />
            )}

            <Divider />

            <SegmentedControl segments={VIEWS} selectedIndex={viewIndex} onChange={setViewIndex} accessibilityLabel="Calendar view" />

            {viewIndex === 2 ? (
              <ActivityList
                activities={activities}
                totalWeeks={totalWeeks}
                weekOneDate={weekOneDate}
                currentWeek={currentWeek}
                onSelect={setSelected}
              />
            ) : (
              <View style={{ gap: theme.spacing.sm }}>
                <CalendarGrid
                  totalWeeks={totalWeeks}
                  activities={activities}
                  bands={bands}
                  weekOneDate={weekOneDate}
                  currentWeek={currentWeek}
                  density={density}
                  selectedActivityId={selected?.id ?? null}
                  onSelectActivity={setSelected}
                />
                <Text variant="caption" muted>
                  {density === 'fit'
                    ? 'The whole cycle at a glance. Tap any activity for its weeks and dates.'
                    : 'Swipe the chart sideways to see later weeks.'}
                </Text>
              </View>
            )}

            {fallback ? (
              <>
                <SampleDataNotice reason={fallback} />
                <MockDataTag />
              </>
            ) : null}

            {/* Said once, plainly. A production calendar is a planning guide
                built from a district's own schedule — it is not a forecast,
                and it does not know this season's weather. */}
            <Card>
              <Text variant="caption" muted>
                {weekOneDate
                  ? 'Dates come from your cycle start date. This is a planning guide — use it alongside the weekly forecast rather than instead of it.'
                  : 'Week numbers are counted from the start of the cycle, not from a date in the year. Start a cycle to see them as dates.'}
              </Text>
            </Card>
          </View>
        ) : null}
      </AsyncStateView>

      {calendar ? (
        <StartCycleForm
          visible={startingCycle}
          subject={calendar.commodity}
          isCycle={calendar.calendarType === 'cycle'}
          isSubmitting={isStarting}
          error={startError}
          onSubmit={(values) => {
            start(
              { calendarId: id, ...values },
              {
                onSuccess: () => setStartingCycle(false),
              },
            );
          }}
          onClose={() => {
            resetStartError();
            setStartingCycle(false);
          }}
        />
      ) : null}

      <ActivityDetailSheet
        activity={selected}
        totalWeeks={totalWeeks}
        weekOneDate={weekOneDate}
        currentWeek={currentWeek}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
