import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonText } from '../../../shared/ui/Skeleton';

/**
 * Loading placeholders for the Forecasts tab.
 *
 * Forecasts is the slowest part of the app to load — several queries fire
 * eagerly and the spatial view pulls a boundary file — so this is where a
 * skeleton earns the most over a spinner.
 */

/** The dashed-border subseasonal card: title + badge, summary, two stats, actions. */
export function SubseasonalOutlookSkeleton() {
  const theme = useTheme();

  return (
    <Card
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ gap: theme.spacing.sm, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton width={130} height={18} />
        <Skeleton width={80} height={20} radius={theme.radii.sm} />
      </View>
      <SkeletonText lines={2} lastWidth="65%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        {[0, 1].map((stat) => (
          <View key={stat} style={{ gap: theme.spacing.xs }}>
            <Skeleton width={72} height={10} />
            <Skeleton width={90} height={18} />
          </View>
        ))}
      </View>
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width="70%" height={14} />
        <SkeletonText lines={3} lastWidth="45%" height={10} />
      </View>
    </Card>
  );
}

/** The translucent map preview: icon + label, legend chips, two captions. */
export function MapPreviewSkeleton() {
  const theme = useTheme();

  return (
    <Card
      translucent
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ gap: theme.spacing.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Skeleton width={18} height={18} radius={9} />
        <Skeleton width="55%" height={14} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
        {[0, 1, 2, 3].map((entry) => (
          <View key={entry} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={10} height={10} radius={5} />
            <Skeleton width={54} height={10} />
          </View>
        ))}
      </View>
      <Skeleton width="65%" height={10} />
      <Skeleton width="45%" height={10} />
    </Card>
  );
}

/**
 * The choropleth. A single tall block: the map is one object, so breaking it
 * into smaller placeholders would suggest a structure that is not there.
 */
export function SpatialOutlookSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Skeleton width="100%" height={520} radius={theme.radii.lg} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={90} height={12} />
        <Skeleton width={120} height={12} />
      </View>
    </SkeletonScreen>
  );
}

/** One day's detail: the day strip, a metric switcher, the chart, then rows. */
export function DayDetailSkeleton({ chartWidth }: { chartWidth: number }) {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <View key={day} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={28} height={10} />
            <Skeleton width={28} height={28} radius={14} />
          </View>
        ))}
      </View>
      <Skeleton width="100%" height={36} radius={theme.radii.sm} />
      <Skeleton width={chartWidth} height={200} radius={theme.radii.lg} />
      <View style={{ gap: theme.spacing.md }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width={90} height={14} />
            <Skeleton width={60} height={14} />
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}

/**
 * A whole forecast section, for the tab's shared loading shell — it does not
 * know which section is coming, so this stays deliberately generic.
 */
export function ForecastSectionSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <SkeletonCard>
        <Skeleton width="45%" height={18} />
        <SkeletonText lines={2} lastWidth="60%" />
      </SkeletonCard>
      <SkeletonCard>
        <Skeleton width="35%" height={14} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          {[0, 1, 2].map((column) => (
            <View key={column} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <Skeleton width={32} height={10} />
              <Skeleton width={40} height={16} />
              <Skeleton width={32} height={10} />
            </View>
          ))}
        </View>
      </SkeletonCard>
    </SkeletonScreen>
  );
}
