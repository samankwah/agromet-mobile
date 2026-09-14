import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonScreen, SkeletonText } from '../../../../shared/ui/Skeleton';

/** Loading placeholders for the weather-alert surfaces. */

/*
 * `AlertBannerSkeleton` used to live here. It is gone with the banner's empty
 * state: the banner now renders nothing when there is no alert, so a
 * placeholder would promise a card that almost never arrives and then collapse.
 * The details screen below still has one, because opening `/alert/[id]` is a
 * deliberate act with a result guaranteed to follow.
 */

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
