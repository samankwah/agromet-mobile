import React from 'react';
import { View } from 'react-native';

import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { buildFixedClasses, IMERG_STOPS, PRECIP_RATE_BREAKS } from '../../../shared/utils/colorScale';

/**
 * Four words for a scale that is really seven classes.
 *
 * The reference app labels its key Light through Extreme rather than in
 * millimetres, and it is right to: a farmer deciding whether to move a drying
 * crop wants to know how hard it is raining, not to convert a rate. The numbers
 * stay beside the words rather than being dropped, because this is a
 * meteorological agency's app and the quantity behind the word should be
 * checkable.
 */
const BANDS = [
  { label: 'Extreme', from: 20 },
  { label: 'Heavy', from: 10 },
  { label: 'Moderate', from: 2 },
  { label: 'Light', from: 0.1 },
];

/**
 * The key, as a panel floating over the map.
 *
 * Vertical rather than the horizontal `ColorScaleLegend` the other maps use:
 * this one shares its screen with a full-bleed map and a playback bar, and a
 * horizontal key would have to span the width and compete with both. It is
 * built from the same `buildFixedClasses` call the map's fill uses, so the two
 * cannot disagree about what a colour means.
 */
export function PrecipitationLegend() {
  // Reversed, because a vertical scale reads heaviest at the top.
  const classes = buildFixedClasses(PRECIP_RATE_BREAKS, IMERG_STOPS).slice().reverse();

  return (
    <Card translucent style={{ paddingVertical: 10, paddingHorizontal: 12, gap: 6 }}>
      <Text variant="caption" color="rgba(255,255,255,0.92)">
        Precipitation
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 6, borderRadius: 3, overflow: 'hidden' }}>
          {classes.map((entry) => (
            <View key={entry.from} style={{ flex: 1, backgroundColor: entry.color }} />
          ))}
        </View>

        <View style={{ justifyContent: 'space-between', paddingVertical: 1 }}>
          {BANDS.map((band) => (
            <View key={band.label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Text variant="caption" color="rgba(255,255,255,0.82)">
                {band.label}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.45)">
                {band.from}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text variant="caption" color="rgba(255,255,255,0.6)">
        mm per hour
      </Text>
    </Card>
  );
}
