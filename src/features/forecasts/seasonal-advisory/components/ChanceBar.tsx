import React from 'react';
import { View } from 'react-native';

import type { TercileProbabilities } from '../../../../shared/domain/subseasonalOutlook';
import type { SeasonalVariableId } from '../../../../shared/domain/seasonalOutlook';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { categoryLabels, paletteForVariable } from '../../seasonal/cells';

const ORDER = ['below', 'normal', 'above'] as const;

/**
 * The three chances as one bar, in the map's own colours, with each share
 * written under it. The likeliest third is the one in bold, so the bar reads
 * at a glance and the numbers are there for whoever wants them.
 */
export function ChanceBar({ variable, probabilities }: { variable: SeasonalVariableId; probabilities: TercileProbabilities }) {
  const theme = useTheme();
  const palette = paletteForVariable(variable);
  // Index 1 and 3 are the moderate shades either side of the neutral middle.
  const colors = [palette[1].color, palette[2].color, palette[3].color];
  const labels = categoryLabels(variable);
  const top = ORDER.reduce((best, key) => (probabilities[key] > probabilities[best] ? key : best), 'normal' as (typeof ORDER)[number]);
  const pct = (share: number) => Math.round(share * 100);

  return (
    <View
      style={{ gap: theme.spacing.sm }}
      accessible
      accessibilityLabel={ORDER.map((key, index) => `${labels[index]} ${pct(probabilities[key])}%`).join(', ')}
    >
      <View style={{ flexDirection: 'row', height: 12, borderRadius: theme.radii.pill, overflow: 'hidden', gap: 2 }}>
        {ORDER.map((key, index) => (
          <View key={key} style={{ flex: Math.max(probabilities[key], 0.02), backgroundColor: colors[index] }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {ORDER.map((key, index) => (
          <View key={key} style={{ flex: 1, alignItems: index === 0 ? 'flex-start' : index === 1 ? 'center' : 'flex-end' }}>
            <Text variant={key === top ? 'bodyStrong' : 'body'} muted={key !== top}>
              {pct(probabilities[key])}%
            </Text>
            <Text variant="caption" muted style={{ textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right' }}>
              {labels[index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
