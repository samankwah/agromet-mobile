import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonText } from '../../../../shared/ui/Skeleton';

/** Shaped like the real screen, so nothing jumps when the data lands. */
export function FloodDroughtSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Skeleton width="55%" height={12} />
      <Skeleton width="100%" height={40} radius={theme.radii.lg} />

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <SkeletonCard gap={theme.spacing.sm}>
          <Skeleton width="70%" height={10} />
          <Skeleton width="45%" height={20} />
        </SkeletonCard>
        <SkeletonCard gap={theme.spacing.sm}>
          <Skeleton width="70%" height={10} />
          <Skeleton width="45%" height={20} />
        </SkeletonCard>
      </View>

      <SkeletonCard gap={theme.spacing.lg}>
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Skeleton width={4} height={32} radius={2} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="45%" height={13} />
              <Skeleton width="65%" height={10} />
            </View>
            <Skeleton width={28} height={16} />
          </View>
        ))}
      </SkeletonCard>

      <Skeleton width="100%" height={320} radius={theme.radii.lg} />
    </SkeletonScreen>
  );
}

export function RegionHazardSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Skeleton width="50%" height={22} />
      <Skeleton width="35%" height={12} />

      <SkeletonCard gap={theme.spacing.md}>
        <Skeleton width="40%" height={14} />
        <SkeletonText lines={3} />
      </SkeletonCard>

      <SkeletonCard gap={theme.spacing.md}>
        <Skeleton width="55%" height={12} />
        <SkeletonText lines={4} />
      </SkeletonCard>

      <Skeleton width="100%" height={200} radius={theme.radii.lg} />
    </SkeletonScreen>
  );
}
