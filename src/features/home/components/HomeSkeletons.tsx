import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonText } from '../../../shared/ui/Skeleton';

/**
 * Loading placeholders for the Home cards.
 *
 * Each is shaped like the card it stands in for, because Home is the launch
 * screen: cards resolving into differently-sized cards is the most visible
 * layout shift in the app. Each card owns its own query, so each skeleton
 * announces its own "Loading" rather than the screen announcing one for all.
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

/**
 * The teaser frame, matching `TeaserCard`.
 *
 * If the skeleton drew a frame of its own it would resolve into a card of a
 * different height, the layout shift this file exists to avoid.
 */
function TeaserSkeletonFrame({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={92} height={10} />
      </View>
      {children}
      <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs }} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Skeleton width={96} height={10} />
      </View>
    </SkeletonCard>
  );
}

/** Summary line, then the seven day columns. */
export function FeaturedForecastSkeleton() {
  const theme = useTheme();

  return (
    <TeaserSkeletonFrame>
      <SkeletonText lines={2} lastWidth="70%" />
      <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs }}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <Skeleton width={28} height={9} />
            <Skeleton width={17} height={17} radius={9} />
            <Skeleton width={26} height={13} />
            <Skeleton width={22} height={9} />
          </View>
        ))}
      </View>
    </TeaserSkeletonFrame>
  );
}
