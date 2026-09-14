import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonScreen } from '../../../shared/ui/Skeleton';

/** Four collapsed rows, so the list does not jump when the answers land. */
export function LibrarySkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <SkeletonCard gap={theme.spacing.lg}>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Skeleton width={`${70 - row * 5}%`} height={14} />
            <View style={{ flex: 1 }} />
            <Skeleton width={14} height={14} radius={7} />
          </View>
        ))}
      </SkeletonCard>
    </SkeletonScreen>
  );
}
