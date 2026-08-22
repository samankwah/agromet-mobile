import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonText } from '../../../../shared/ui/Skeleton';

/** Loading placeholders for the weather-alert surfaces. */

/**
 * The Home/Advisories alert banner.
 *
 * One compact card either way: the loaded state is either an "all clear" row
 * or a severity banner, and both occupy about the same height, so the
 * placeholder does not have to guess which is coming.
 */
export function AlertBannerSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonCard gap={theme.spacing.sm}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Skeleton width={20} height={20} radius={10} />
        <Skeleton width="70%" height={14} />
      </View>
      <Skeleton width="45%" height={10} />
    </SkeletonCard>
  );
}

/** A full alert: severity, headline, body, and the advice list. */
export function AlertDetailsSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Skeleton width={110} height={24} radius={theme.radii.sm} />
      <Skeleton width="85%" height={26} />
      <Skeleton width="50%" height={12} />
      <SkeletonText lines={3} lastWidth="60%" />
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width="40%" height={16} />
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
            <Skeleton width={6} height={6} radius={3} />
            <Skeleton width="80%" height={12} />
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}
