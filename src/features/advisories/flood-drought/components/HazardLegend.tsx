import React from 'react';
import { View } from 'react-native';

import { getHazardBandMeta, hazardBandColor, type HazardBand } from '../../../../shared/domain/hazardBand';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';

const LEGEND_BANDS: HazardBand[] = ['normal', 'watch', 'moderate', 'severe', 'extreme'];

/**
 * The five bands, as discrete swatches.
 *
 * Discrete rather than a gradient bar for the reason `colorScale.ts` gives for
 * its own classed legend: a smooth ramp cannot be matched back from the map to
 * the legend. Blocks can.
 *
 * Sits beneath the map rather than floating over it — an overlay would cover
 * whichever corner of the country it landed on.
 */
export function HazardLegend() {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Map key: bands run from normal through watch, moderate and severe to extreme."
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, alignItems: 'center' }}
    >
      {LEGEND_BANDS.map((band) => {
        const meta = getHazardBandMeta(band);
        return (
          <View key={band} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: hazardBandColor(band, theme),
                // At these fills the swatch alone misses the 3:1 minimum for a
                // non-text indicator, so the outline defines the shape.
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
            <Text variant="caption">{meta.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
