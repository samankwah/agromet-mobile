import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  EMPTY_ADVISORY_FILTERS,
  type AdvisoryFilterState,
  type AdvisoryKind,
} from '../../../shared/domain/weeklyAdvisory';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Screen } from '../../../shared/ui/Screen';
import { Skeleton, SkeletonScreen } from '../../../shared/ui/Skeleton';
import { Text } from '../../../shared/ui/Text';
import { ActivityPicker } from './components/ActivityPicker';
import { AdvisorySummary, PoultryGuidance } from './components/AdvisoryPanels';
import { AdvisorySelectionPanel } from './components/AdvisorySelectionPanel';
import { ForecastTable } from './components/ForecastTable';
import { useWeeklyAdvisory } from './useWeeklyAdvisory';

type Props = {
  kind: AdvisoryKind;
  /** Set when opened from the archive: that record is shown rather than the
   * newest one matching the filters. */
  advisoryId?: number;
};

const COPY: Record<AdvisoryKind, { title: string; blurb: string }> = {
  crop: {
    title: 'Crop advisory',
    blurb: 'This week’s weather for your crop and district, what it means, and what to do about it.',
  },
  poultry: {
    title: 'Poultry advisory',
    blurb: 'This week’s management targets and recommended actions for your birds.',
  },
};

/**
 * The weekly agrometeorological advisory for one district.
 *
 * Crop and poultry share this shell but not their bodies, because they are not
 * the same data. A crop bulletin is a per-activity forecast with advice for
 * each weather parameter; a poultry bulletin is a table of management targets
 * and a list of actions, with no forecast anywhere in it. Rendering an empty
 * forecast table for poultry would imply data that failed to load rather than
 * data that was never collected.
 */
export function WeeklyAdvisoryScreen({ kind, advisoryId }: Props) {
  const theme = useTheme();
  const [filter, setFilter] = useState<AdvisoryFilterState>(EMPTY_ADVISORY_FILTERS);
  const [activityIndex, setActivityIndex] = useState(0);

  const { status, error, refetch, advisory, activities, fallback, usingCachedFallback } =
    useWeeklyAdvisory(kind, filter, advisoryId);

  /* Nothing narrowed yet, so what is on screen is whatever was published most
     recently anywhere in the country. */
  const isNational = filter.region === '' && filter.district === '' && filter.subject === '';

  // A new search is a new bulletin; keeping the old index would land on a
  // different activity than the one highlighted.
  useEffect(() => setActivityIndex(0), [filter.region, filter.district, filter.subject]);

  const copy = COPY[kind];
  const activity = activities[Math.min(activityIndex, Math.max(activities.length - 1, 0))] ?? null;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="h1">{copy.title}</Text>
        <Text variant="body" muted>
          {copy.blurb}
        </Text>
      </View>

      <AdvisorySelectionPanel
        kind={kind}
        filter={filter}
        onFilterChange={setFilter}
        activities={activities}
        activityIndex={activityIndex}
        onActivityChange={setActivityIndex}
      />

      {isNational ? (
        <Text variant="caption" muted>
          Showing the latest bulletin published anywhere in Ghana. Tap any field above to narrow it to your own
          district.
        </Text>
      ) : null}

      <AsyncStateView
        status={status}
        error={error}
        onRetry={refetch}
        skeleton={
          <SkeletonScreen>
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={180} radius={theme.radii.lg} />
            <Skeleton width="100%" height={120} radius={theme.radii.lg} />
          </SkeletonScreen>
        }
      >
        {advisory ? (
          <View style={{ gap: theme.spacing.lg }}>
            <FallbackNotice
              fallback={fallback}
              usingCache={usingCachedFallback}
              filter={filter}
              sampleFrom={advisory.district}
            />

            {kind === 'poultry' ? (
              <PoultryGuidance advisory={advisory} />
            ) : activities.length === 0 ? (
              /* A crop bulletin with no parsed worksheets. Rare, but it means
                 the upload failed to parse rather than that the week was
                 quiet, and saying so is more use than an empty table. */
              <EmptyState
                icon="document-outline"
                title="This bulletin has no activity detail"
                message="The published file could not be read into weekly activities. Ask your district office to re-upload it."
              />
            ) : (
              <>
                <ActivityPicker
                  activities={activities}
                  selectedIndex={activityIndex}
                  onSelect={setActivityIndex}
                />
                {activity ? (
                  <>
                    <ForecastTable rows={activity.rows} />
                    <AdvisorySummary activity={activity} />
                  </>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </AsyncStateView>
    </Screen>
  );
}

/**
 * Says where what is on screen came from.
 *
 * The three cases are genuinely different and a farmer acts differently on
 * each: nothing has ever been published for their district, the phone is
 * offline, or this is a saved copy from earlier. Collapsing them into one
 * "sample data" line would hide, permanently, the fact that no bulletin has
 * ever been uploaded.
 */
function FallbackNotice({
  fallback,
  usingCache,
  filter,
  sampleFrom,
}: {
  fallback: 'empty' | 'offline' | null;
  usingCache: boolean;
  filter: AdvisoryFilterState;
  /** The district the sample bulletin was written for. */
  sampleFrom: string;
}) {
  const theme = useTheme();

  if (!fallback && !usingCache) return null;

  /* The sample is written for somewhere else, and the weeks and dates in the
     panel above are its own. Naming the district it came from is the
     difference between an honest stand-in and a bulletin a farmer might act
     on believing it was written for them. */
  const origin = sampleFrom.trim() === '' ? 'another district' : sampleFrom;

  /* With nothing narrowed there is no district to name, and saying "published
     for  in  yet" would read as a bug. */
  const scope =
    filter.district === '' && filter.subject === ''
      ? 'anywhere in Ghana'
      : `for ${filter.subject || 'your crop'} in ${filter.district || 'your district'}`;

  const message = usingCache
    ? 'Showing the copy saved on this phone. The server could not be reached.'
    : fallback === 'offline'
      ? `The AgroMet server could not be reached, so this is a sample bulletin from ${origin}. It is here to show the layout, not to advise your farm.`
      : `No advisory has been published ${scope} yet. Below is a sample written for ${origin}, so you can see what one looks like.`;

  return (
    <Card
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
      }}
    >
      <Ionicons
        name={fallback === 'empty' ? 'document-outline' : 'cloud-offline-outline'}
        size={18}
        color={theme.colors.warning}
        style={{ marginTop: 2 }}
      />
      <Text variant="caption" muted style={{ flex: 1 }}>
        {message}
      </Text>
    </Card>
  );
}
