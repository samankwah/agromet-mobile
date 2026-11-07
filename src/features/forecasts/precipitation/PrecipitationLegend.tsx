import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { RAIN_STOPS } from '../../../shared/utils/colorScale';
import { MAP_CHROME, type MapChrome } from './mapChrome';

/**
 * Four words, heaviest at the top, as the phone's own weather app labels its
 * key. A farmer deciding whether to move a drying crop wants to know how hard
 * it is raining, not to convert a rate.
 */
const BANDS = ['Extreme', 'Heavy', 'Moderate', 'Light'];

/** The ramp top to bottom, so the bar reads heaviest at the top. */
const GRADIENT = RAIN_STOPS.slice()
  .reverse()
  .map(([, [r, g, b]]) => `rgb(${r},${g},${b})`) as [string, string, ...string[]];

/**
 * The key, as a panel floating over the map: one continuous colour bar beside
 * the four words, built from the same `RAIN_STOPS` the map paints with, so the
 * two cannot disagree about what a colour means. White glass by day, dark glass
 * at night, with the rest of the map's controls.
 */
export function PrecipitationLegend({ chrome = MAP_CHROME.dark }: { chrome?: MapChrome }) {
  return (
    <Card
      translucent
      style={{ paddingVertical: 10, paddingHorizontal: 12, gap: 8, backgroundColor: chrome.card, borderColor: chrome.border }}
    >
      <Text variant="caption" color={chrome.text} style={{ fontWeight: '600' }}>
        Precipitation
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, height: 120 }}>
        <LinearGradient colors={GRADIENT} style={{ width: 6, borderRadius: 3 }} />
        <View style={{ justifyContent: 'space-between' }}>
          {BANDS.map((band) => (
            <Text key={band} variant="caption" color={chrome.muted}>
              {band}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}
