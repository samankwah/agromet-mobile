import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonText } from '../../../shared/ui/Skeleton';

/**
 * Loading placeholders for the four Home cards.
 *
 * Each is shaped like the card it stands in for, because Home is the launch
 * screen: four cards resolving into four differently-sized cards is the most
 * visible layout shift in the app. Each card owns its own query, so each
 * skeleton announces its own "Loading" rather than the screen announcing one
 * for all four.
 */

/** Big temperature, condition line, then a wrapped row of five stat tiles. */
export function CurrentConditionsSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonCard>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton width={110} height={28} />
          <Skeleton width={80} height={14} />
        </View>
        <Skeleton width={70} height={10} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md, columnGap: theme.spacing.lg }}>
        {[0, 1, 2, 3, 4].map((tile) => (
          <View key={tile} style={{ gap: theme.spacing.xs }}>
            <Skeleton width={64} height={10} />
            <Skeleton width={48} height={16} />
          </View>
        ))}
      </View>
    </SkeletonCard>
  );
}

/** Label row, a summary line, then three day columns. */
export function FeaturedForecastSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={80} height={10} />
        <Skeleton width={70} height={10} />
      </View>
      <SkeletonText lines={2} lastWidth="70%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        {[0, 1, 2].map((day) => (
          <View key={day} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Skeleton width={32} height={10} />
            <Skeleton width={40} height={16} />
            <Skeleton width={32} height={10} />
          </View>
        ))}
      </View>
    </SkeletonCard>
  );
}

/** Label plus severity pill, a two-line title, a two-line summary, crops. */
export function AdvisoryTeaserSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton width={90} height={10} />
        <Skeleton width={72} height={20} radius={theme.radii.sm} />
      </View>
      <Skeleton width="85%" height={18} />
      <SkeletonText lines={2} lastWidth="60%" />
      <Skeleton width={120} height={10} />
    </SkeletonCard>
  );
}

/** Label, two-line headline, two-line summary, timestamp. */
export function NewsTeaserSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <Skeleton width={80} height={10} />
      <Skeleton width="90%" height={18} />
      <SkeletonText lines={2} lastWidth="50%" />
      <Skeleton width={90} height={10} />
    </SkeletonCard>
  );
}
