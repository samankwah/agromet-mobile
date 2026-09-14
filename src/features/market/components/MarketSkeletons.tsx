import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { Skeleton, SkeletonScreen } from '../../../shared/ui/Skeleton';

/**
 * Loading placeholders shaped like the market screens they stand in for.
 *
 * The shapes are not decorative: the card grid uses the same measured width
 * and 4:3 photograph box as the real cards, so when prices arrive the layout
 * does not jump. A skeleton that settles into a different shape is worse
 * than a spinner, because it promises a layout it then breaks.
 */

/** The commodity grid: two columns of image-over-text cards. */
export function MarketGridSkeleton({ cardWidth, rows = 3 }: { cardWidth: number; rows?: number }) {
  const theme = useTheme();
  const imageHeight = Math.round(cardWidth * 0.75); // matches CommodityCard

  return (
    <SkeletonScreen>
      <Skeleton width={120} height={12} />
      <View style={{ gap: theme.spacing.md }}>
        {Array.from({ length: rows }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {[0, 1].map((column) => (
              <View
                key={column}
                style={{
                  width: cardWidth,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  overflow: 'hidden',
                }}
              >
                <Skeleton width={cardWidth} height={imageHeight} radius={0} />
                <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
                  <Skeleton width="70%" height={13} />
                  <Skeleton width="45%" height={18} />
                  <Skeleton width="35%" height={10} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}

/** One commodity page: hero, price panel, chart, and the sections below it. */
export function CommodityDetailSkeleton({ chartWidth }: { chartWidth: number }) {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Skeleton width="100%" height={180} radius={0} />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Skeleton width={80} height={10} />
          <Skeleton width="60%" height={24} />
          <Skeleton width={140} height={20} radius={theme.radii.sm} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="85%" height={12} />
        </View>
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <Skeleton width={90} height={10} />
        <Skeleton width="100%" height={48} />
        <Skeleton width="45%" height={28} />
        <Skeleton width="100%" height={44} radius={theme.radii.md} />
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <Skeleton width={160} height={16} />
        <Skeleton width={chartWidth} height={200} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} width={70} height={48} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <Skeleton width={130} height={16} />
        <Skeleton width="100%" height={64} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Skeleton width="48%" height={56} />
          <Skeleton width="48%" height={56} />
        </View>
      </Card>
    </SkeletonScreen>
  );
}
