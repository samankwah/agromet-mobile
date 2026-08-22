import React, { useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { HazardKind } from '../../../shared/domain/hazard';
import { useLocationStore } from '../../../shared/state/locationStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { HazardChoropleth } from './components/HazardChoropleth';
import { HazardLegend } from './components/HazardLegend';
import { FloodDroughtSkeleton } from './components/HazardSkeletons';
import { RegionRiskRow } from './components/RegionRiskRow';
import { RegionSeverityStrip } from './components/RegionSeverityStrip';
import { YourAreaCard } from './components/YourAreaCard';
import { regionsForDistricts, splitByAttention } from './hazardSelectors';
import { useHazardSummary } from './useHazards';

const HAZARDS: HazardKind[] = ['flood', 'drought'];

/** A section heading with an optional count. */
function SectionHeading({ title, count }: { title: string; count?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
      <Text variant="h3" style={{ flex: 1 }}>
        {title}
      </Text>
      {count !== undefined ? (
        <Text variant="caption" muted>
          {count}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Flood and drought across the sixteen regions.
 *
 * Ordered by who is asking and why, rather than by what the desktop page shows
 * first:
 *
 *   1. your own area, because that is the question that opened the app
 *   2. the national picture in one strip, for orientation
 *   3. the regions that need attention, each with its reason
 *   4. everything else, folded away — thirteen rows of "normal" is reassurance,
 *      not information
 *   5. the map, which locates what the lists have already said
 *
 * The lists precede the map deliberately: a ranked list answers "who is worst
 * off", and it is also the accessible equivalent of the choropleth, which
 * carries nothing to a screen reader.
 */
export function FloodDroughtScreen() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [hazardIndex, setHazardIndex] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const hazard = HAZARDS[hazardIndex];

  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const summary = useHazardSummary();

  const openRegion = (region: string) =>
    // Object form, never a template string: region names contain spaces.
    router.push({ pathname: '/hazard/[region]', params: { region, hazard } });

  const { attention, rest } = useMemo(
    () => splitByAttention(summary.regions, hazard),
    [summary.regions, hazard],
  );

  const mine = useMemo(
    () => regionsForDistricts(summary.regions, savedDistrictIds, hazard),
    [summary.regions, savedDistrictIds, hazard],
  );

  return (
    <Screen>
      {/* No h1 — this is a pushed screen and the stack header already carries
          the title. */}
      <Text variant="body" muted>
        Conditions across Ghana&apos;s sixteen regions, measured against a thirty-year baseline.
      </Text>

      {summary.computedAt ? (
        <Text variant="caption" muted>
          Updated {formatRelativeTime(summary.computedAt)}
          {summary.baseline ? ` · ${summary.baseline}` : ''}
        </Text>
      ) : null}

      <SegmentedControl
        segments={['Flood', 'Drought']}
        selectedIndex={hazardIndex}
        onChange={setHazardIndex}
        accessibilityLabel="Hazard shown"
        variant="pill"
      />

      <AsyncStateView
        status={summary.status}
        error={summary.error}
        onRetry={summary.refetch}
        skeleton={<FloodDroughtSkeleton />}
      >
        {summary.regions.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Readings are not available yet"
            message="The weather and river services could not be reached. Nothing is shown here rather than an estimate."
          />
        ) : (
          <View style={{ gap: theme.spacing.xl }}>
            {summary.usingCachedFallback ? (
              <Text variant="caption" muted>
                Showing readings saved{' '}
                {summary.cachedAt ? formatRelativeTime(summary.cachedAt) : 'earlier'}
              </Text>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeading title="Your area" />
              <YourAreaCard entries={mine} hazard={hazard} onOpen={openRegion} />
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeading title="Across Ghana" />
              <RegionSeverityStrip regions={summary.regions} hazard={hazard} />
            </View>

            {attention.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeading title="Needs attention" count={attention.length} />
                <Card
                  style={{
                    // Horizontal padding lives on the rows, so the dividers
                    // still span the full card width.
                    paddingHorizontal: 0,
                    paddingVertical: theme.spacing.sm,
                    overflow: 'hidden',
                  }}
                >
                  {attention.map((region, index) => (
                    <RegionRiskRow
                      key={region.region}
                      region={region}
                      hazard={hazard}
                      first={index === 0}
                      onPress={openRegion}
                    />
                  ))}
                </Card>
              </View>
            ) : (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Ionicons name="checkmark-circle" size={20} color={theme.severityColors.normal} />
                <Text variant="body" style={{ flex: 1 }}>
                  No region is above normal {hazard} risk today.
                </Text>
              </Card>
            )}

            {/* Folded by default. On an ordinary day this is a dozen rows all
                saying "normal" — but it stays reachable, because "is my region
                in there" is a fair question. */}
            {rest.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Pressable
                  onPress={() => setShowAll((open) => !open)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAll }}
                  accessibilityLabel={`${showAll ? 'Hide' : 'Show'} the ${rest.length} calmer regions`}
                >
                  {/* Chrome on the nested View, per shared/ui/Button.tsx: a
                      Pressable styled directly loses its padding and flex
                      direction on Android. */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      minHeight: theme.minTouchTarget,
                    }}
                  >
                    <Text variant="h3" style={{ flex: 1 }}>
                      Calmer regions
                    </Text>
                    <Text variant="caption" muted>
                      {rest.length}
                    </Text>
                    <Ionicons
                      name={showAll ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.muted}
                    />
                  </View>
                </Pressable>

                {showAll ? (
                  <Card
                    style={{
                      paddingHorizontal: 0,
                      paddingVertical: theme.spacing.sm,
                      overflow: 'hidden',
                    }}
                  >
                    {rest.map((region, index) => (
                      <RegionRiskRow
                        key={region.region}
                        region={region}
                        hazard={hazard}
                        first={index === 0}
                        onPress={openRegion}
                        compact
                      />
                    ))}
                  </Card>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeading title="Map" />
              {/* A map tap selects rather than navigates: Greater Accra and
                  Ahafo are ~20px shapes at phone width, far under the 44px
                  touch target, and hitSlop does not apply to SVG paths. */}
              <Card style={{ padding: theme.spacing.sm, gap: theme.spacing.sm }}>
                <HazardChoropleth
                  regions={summary.regions}
                  hazard={hazard}
                  // Screen gutter plus this card's own padding — without it the
                  // SVG is wider than the card and clips on the right.
                  width={windowWidth - theme.spacing.lg * 2 - theme.spacing.sm * 2}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
                <HazardLegend />
                {selectedRegion ? (
                  <Pressable
                    onPress={() => openRegion(selectedRegion)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open the ${selectedRegion} reading`}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        minHeight: theme.minTouchTarget,
                        paddingHorizontal: theme.spacing.sm,
                      }}
                    >
                      <Text variant="bodyStrong" color={theme.colors.accent} style={{ flex: 1 }}>
                        Open {selectedRegion}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
                    </View>
                  </Pressable>
                ) : null}
              </Card>
            </View>

            <Text variant="caption" muted>
              Regional indicators, not a substitute for official warnings. In an emergency follow
              NADMO instructions for your district.
            </Text>
          </View>
        )}
      </AsyncStateView>
    </Screen>
  );
}
