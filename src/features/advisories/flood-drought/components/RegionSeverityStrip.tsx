import React from 'react';
import { View } from 'react-native';

import type { HazardKind, HazardRegion } from '../../../../shared/domain/hazard';
import { getHazardBandMeta, hazardBandColor, isElevatedBand } from '../../../../shared/domain/hazardBand';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { rankRegions } from '../hazardSelectors';

type Props = {
  regions: HazardRegion[];
  hazard: HazardKind;
};

/**
 * The whole country in one line.
 *
 * One bar per region, worst on the left. It answers "how bad is it nationally"
 * in a glance and in about forty pixels — where the alternative is reading
 * sixteen list rows and holding the tally in your head.
 *
 * Height carries severity as well as colour, so the shape of the strip is
 * readable in greyscale and the ordering survives a colour-blind read. The
 * sentence beneath is the same information in words, which is what a screen
 * reader gets.
 */
export function RegionSeverityStrip({ regions, hazard }: Props) {
  const theme = useTheme();
  if (regions.length === 0) return null;

  const ranked = rankRegions(regions, hazard);
  const elevated = ranked.filter((region) => isElevatedBand(region[hazard].band));
  const worst = ranked[0];

  const summary =
    elevated.length === 0
      ? `No region is above normal ${hazard} risk today.`
      : `${elevated.length} of ${regions.length} regions above normal ${hazard} risk. ` +
        `Highest is ${worst.region}, ${getHazardBandMeta(worst[hazard].band).label.toLowerCase()}.`;

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 34 }}
      >
        {ranked.map((region) => {
          const meta = getHazardBandMeta(region[hazard].band);
          return (
            <View
              key={region.region}
              style={{
                flex: 1,
                // 6px for normal up to 34 for extreme — the strip has a visible
                // silhouette even before colour is considered.
                height: 6 + meta.steps * 5.5,
                borderRadius: 2,
                backgroundColor: hazardBandColor(region[hazard].band, theme),
              }}
            />
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        {/* Siblings rather than nested Text: nesting splits the count across
            text nodes, which reads fine but is awkward to assert on and can
            wrap oddly at large text sizes. */}
        <Text variant="bodyStrong">{`${elevated.length} of ${regions.length}`}</Text>
        <Text variant="caption" muted style={{ flex: 1 }}>
          above normal
        </Text>
        <Text variant="caption" muted>
          worst to calmest
        </Text>
      </View>
    </Card>
  );
}
