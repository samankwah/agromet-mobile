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

/**
 * The frame the three teaser skeletons share, matching `TeaserCard`.
 *
 * The cards were given one frame; if the skeletons kept three, they would each
 * resolve into a card of a different height — the layout shift this file exists
 * to avoid, reintroduced by the change that tidied the cards.
 */
function TeaserSkeletonFrame({
  trailing,
  hasNotice,
  children,
}: {
  trailing?: number;
  hasNotice?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={92} height={10} />
        {trailing ? <Skeleton width={trailing} height={trailing === 72 ? 20 : 10} radius={theme.radii.sm} /> : null}
      </View>
      {children}
      <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {hasNotice ? <Skeleton width={104} height={10} /> : <View />}
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

/** Severity pill, a two-line title, then the crop chips. */
export function AdvisoryTeaserSkeleton() {
  const theme = useTheme();

  return (
    <TeaserSkeletonFrame trailing={72} hasNotice>
      <SkeletonText lines={2} lastWidth="55%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginTop: 2 }}>
        <Skeleton width={86} height={22} radius={theme.radii.sm} />
        <Skeleton width={70} height={22} radius={theme.radii.sm} />
      </View>
    </TeaserSkeletonFrame>
  );
}

/** Timestamp, then a two-line headline. */
export function NewsTeaserSkeleton() {
  return (
    <TeaserSkeletonFrame trailing={64} hasNotice>
      <SkeletonText lines={2} lastWidth="65%" />
    </TeaserSkeletonFrame>
  );
}
