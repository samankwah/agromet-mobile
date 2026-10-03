import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EMPTY_ADVISORY_FILTERS, type AdvisoryFilterState, type AdvisoryKind } from '../../../shared/domain/weeklyAdvisory';
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

  const { status, error, refetch, advisory, activities, fallback, usingCachedFallback, isExample } = useWeeklyAdvisory(
    kind,
    filter,
    advisoryId,
  );

  /* Nothing narrowed yet, so what is on screen is whatever was published most
     recently anywhere in the country. */
  const isNational = filter.region === '' && filter.district === '' && filter.subject === '';

  // A new search is a new bulletin; keeping the old index would land on a
  // different activity than the one highlighted.
  useEffect(() => setActivityIndex(0), [filter.region, filter.district, filter.subject]);

  const copy = COPY[kind];
  // The fallback path has content only if the older template produced some.
  const hasGuidance = (advisory?.recommendations.length ?? 0) > 0 || Object.keys(advisory?.managementMetrics ?? {}).length > 0;

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

      {isNational && advisory && !isExample ? (
        <Text variant="caption" muted>
          Showing the latest bulletin published anywhere in Ghana. Tap any field above to narrow it to your own district.
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
            {usingCachedFallback ? <SavedCopyNotice /> : null}
            {isExample ? <ExampleAdvisoryNotice kind={kind} scope={scopeFor(filter)} /> : null}

            {/* What was uploaded decides the layout, not which kind of bulletin
                this is. Crop and poultry advisories are authored on the same
                district template — one worksheet per activity, each with the
                nine-parameter forecast band — so a poultry bulletin that parsed
                gets the same table a crop one does. This used to branch on
                `kind`, which sent every poultry bulletin to the guidance card
                even when it had a full set of worksheets behind it. */}
            {activities.length > 0 ? (
              <>
                <ActivityPicker activities={activities} selectedIndex={activityIndex} onSelect={setActivityIndex} />
                {activity ? (
                  <>
                    <ForecastTable rows={activity.rows} />
                    <AdvisorySummary activity={activity} />
                  </>
                ) : null}
              </>
            ) : hasGuidance ? (
              /* The older generated poultry template: management targets and a
                 list of recommended actions, with no forecast band to table. */
              <PoultryGuidance advisory={advisory} />
            ) : (
              /* Nothing parsed either way. That means the upload could not be
                 read, not that the week was quiet, and saying so is more use
                 than an empty table. */
              <EmptyState
                icon="document-outline"
                title="This bulletin has no activity detail"
                message="The published file could not be read into weekly activities. Ask your district office to re-upload it."
              />
            )}
          </View>
        ) : fallback === 'empty' ? (
          /* The server answered and has nothing here. Offline never reaches
             this branch: it fails the query, so AsyncStateView shows the saved
             copy or "Could not reach the AgroMet server" with a Retry. */
          <Card>
            <EmptyState
              icon="document-outline"
              title="No advisory yet"
              message={`No advisory has been published ${scopeFor(filter)} yet.`}
            />
          </Card>
        ) : null}
      </AsyncStateView>
    </Screen>
  );
}

/**
 * Where an empty search looked, in the words the empty state uses.
 *
 * With nothing narrowed there is no district to name, and saying "published
 * for  in  yet" would read as a bug.
 */
function scopeFor(filter: AdvisoryFilterState): string {
  return filter.district === '' && filter.subject === ''
    ? 'anywhere in Ghana'
    : `for ${filter.subject || 'your crop'} in ${filter.district || 'your district'}`;
}

/**
 * Says the advisory on screen is an example, every time one is shown.
 *
 * Clients asked for the screen never to be empty before the first upload, so
 * the example appears instead. A farmer must not plan work from it, so the
 * notice sits above it in the warning colour and says so in plain words.
 */
function ExampleAdvisoryNotice({ kind, scope }: { kind: AdvisoryKind; scope: string }) {
  const theme = useTheme();
  const noun = kind === 'poultry' ? 'poultry' : 'crop';

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
      <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text variant="bodyStrong">Example advisory</Text>
        <Text variant="caption" muted>
          {`No ${noun} advisory has been published ${scope} yet. This example shows what a weekly advisory looks like. Do not plan your farm work from it.`}
        </Text>
      </View>
    </Card>
  );
}

/**
 * Says the bulletin on screen is the copy saved on this phone, not a fresh one.
 *
 * The only notice left. "Nothing published" and "offline with nothing saved"
 * no longer sit above a stand-in bulletin: there is no stand-in, so each is the
 * whole of what the screen shows.
 */
function SavedCopyNotice() {
  const theme = useTheme();

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
      <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.warning} style={{ marginTop: 2 }} />
      <Text variant="caption" muted style={{ flex: 1 }}>
        Showing the copy saved on this phone. The server could not be reached.
      </Text>
    </Card>
  );
}
