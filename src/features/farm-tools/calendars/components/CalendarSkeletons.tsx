import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Skeleton, SkeletonCard, SkeletonScreen, SkeletonText } from '../../../../shared/ui/Skeleton';

/** Loading placeholders for the crop and poultry calendar screens. */

/** The filter dropdowns above a run of calendar rows. */
export function CalendarListSkeleton({ rows = 3 }: { rows?: number }) {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <View style={{ gap: theme.spacing.md }}>
        {[0, 1, 2, 3].map((field) => (
          <View key={field} style={{ gap: theme.spacing.xs }}>
            <Skeleton width={70} height={10} />
            <Skeleton width="100%" height={48} radius={theme.radii.sm} />
          </View>
        ))}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        {Array.from({ length: rows }, (_, row) => (
          <SkeletonCard key={row} gap={theme.spacing.sm}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width={16} height={16} radius={8} />
            </View>
            <Skeleton width={120} height={10} />
            <SkeletonText lines={2} lastWidth="50%" height={10} />
          </SkeletonCard>
        ))}
      </View>
    </SkeletonScreen>
  );
}

/**
 * One calendar: title and meta, then the activity grid.
 *
 * The grid is a single wide block rather than a lattice of small ones — it
 * scrolls horizontally and its column count depends on the calendar's own
 * length, so a fixed lattice would promise a shape the real grid may not
 * have.
 */
export function CalendarDetailSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width="75%" height={26} />
        <Skeleton width="55%" height={12} />
      </View>
      <Skeleton width="100%" height={72} radius={theme.radii.lg} />
      <Skeleton width="100%" height={260} radius={theme.radii.lg} />
      <View style={{ gap: theme.spacing.md }}>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Skeleton width={28} height={28} radius={14} />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Skeleton width="65%" height={14} />
              <Skeleton width="40%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}
