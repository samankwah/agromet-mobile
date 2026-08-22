import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonScreen } from '../../../../shared/ui/Skeleton';

/** Shaped like the archive, so nothing jumps when the list arrives. */
export function ArchiveSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      {/* No search-field placeholder: the real one sits above this, outside the
          AsyncStateView, so it is on screen throughout the load. Drawing a
          second would stack two search boxes. */}
      <Skeleton width="100%" height={theme.minTouchTarget + 8} radius={999} />

      {[0, 1, 2, 3].map((row) => (
        <SkeletonCard key={row} gap={theme.spacing.sm}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Skeleton width="60%" height={14} />
            <View style={{ flex: 1 }} />
            <Skeleton width={16} height={16} radius={8} />
          </View>
          <Skeleton width="45%" height={10} />
          <Skeleton width="70%" height={10} />
        </SkeletonCard>
      ))}
    </SkeletonScreen>
  );
}
