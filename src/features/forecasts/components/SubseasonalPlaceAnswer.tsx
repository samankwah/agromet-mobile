import React from 'react';
import { View } from 'react-native';

import type { SubseasonalVariable, SubseasonalVariableId, TercileCategory } from '../../../shared/domain/subseasonalOutlook';
import { unitFor } from '../../../shared/domain/subseasonalOutlook';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { Text } from '../../../shared/ui/Text';
import { SIGNAL_STRONG_SHARE, paletteFor } from '../../../shared/utils/tercilePalette';

type Props = {
  reading: SubseasonalVariable;
  variable: SubseasonalVariableId;
  /** The server's own name for the baseline record, e.g. "ERA5 1995-2024". */
  baseline?: string | null;
};

const WORDS: Record<SubseasonalVariableId, Record<TercileCategory, string>> = {
  rainfall: { below: 'Drier than normal', normal: 'Near normal', above: 'Wetter than normal' },
  temperature: { below: 'Cooler than normal', normal: 'Near normal', above: 'Warmer than normal' },
};

const SHORT: Record<SubseasonalVariableId, Record<TercileCategory, string>> = {
  rainfall: { below: 'Drier', normal: 'Near normal', above: 'Wetter' },
  temperature: { below: 'Cooler', normal: 'Near normal', above: 'Warmer' },
};

const ORDER: TercileCategory[] = ['below', 'normal', 'above'];

/** Shares are stored as fractions and read as whole percents. */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** "44 mm", "31°C": a space before a word unit, none before a degree sign. */
function amount(value: number, variable: SubseasonalVariableId): string {
  const unit = unitFor(variable);
  return unit.startsWith('°') ? `${Math.round(value)}${unit}` : `${Math.round(value)} ${unit}`;
}

/**
 * The answer to "what does the shade I tapped mean", before anything else.
 *
 * Laid out the way the big weather apps lead a place: the outcome as a
 * headline, how likely and how sure beside it, then one picture of the whole
 * split and the plain amounts. It replaces a five-row table and a paragraph
 * that said the same 87% twice.
 *
 * A split with no winner is not dressed up as one. A no-signal or low
 * confidence reading heads "No clear signal", because "Near normal" would
 * read as a forecast of an ordinary month.
 */
export function SubseasonalPlaceAnswer({ reading, variable, baseline }: Props) {
  const theme = useTheme();
  const probabilities = reading.probabilities;
  const unclear = reading.noSignal || reading.confidence === 'low' || !reading.category;

  const headline = !probabilities
    ? `${amount(reading.value, variable)} expected`
    : unclear
      ? 'No clear signal'
      : WORDS[variable][reading.category!];
  const likelihood =
    !probabilities || !reading.category
      ? null
      : reading.noSignal
        ? 'Usually a dry time of year here'
        : unclear
          ? 'The forecasts are split'
          : `${pct(probabilities[reading.category])} chance`;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="h1">{headline}</Text>
        {likelihood || reading.confidence ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {likelihood ? (
              <Text variant="body" muted>
                {likelihood}
              </Text>
            ) : null}
            {reading.confidence && probabilities ? <ConfidenceBadge level={reading.confidence} /> : null}
          </View>
        ) : null}
      </View>

      {probabilities ? <ProbabilityBar reading={reading} variable={variable} /> : null}

      {probabilities && reading.normal !== null ? (
        <Text variant="bodyStrong">
          {amount(reading.value, variable)} {variable === 'rainfall' ? 'expected' : 'average high'}
          <Text variant="body" muted>
            {'  ·  '}usually {amount(reading.normal, variable)}
          </Text>
        </Text>
      ) : null}

      <Text variant="caption" muted>
        {probabilities
          ? `From ${reading.members} forecast runs, against the ${baseline ?? 'long-term'} average for these weeks.`
          : `The average of ${reading.members} forecast runs. This area has no long-term record yet, so there is nothing to compare it with.`}
      </Text>
    </View>
  );
}

/**
 * The three chances as one bar, in the map's own colours, so the panel and the
 * shade under the reader's finger plainly belong together. The winning side
 * takes the map's strong colour when it would on the map (70% and up).
 */
function ProbabilityBar({ reading, variable }: { reading: SubseasonalVariable; variable: SubseasonalVariableId }) {
  const theme = useTheme();
  const palette = paletteFor(variable);
  const probabilities = reading.probabilities!;

  const colorOf = (category: TercileCategory): string => {
    if (category === 'normal') return palette[2].color;
    const strong = reading.category === category && probabilities[category] >= SIGNAL_STRONG_SHARE;
    return category === 'below' ? palette[strong ? 0 : 1].color : palette[strong ? 4 : 3].color;
  };

  const summary = ORDER.map((category) => `${SHORT[variable][category]} ${pct(probabilities[category])}`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
        {ORDER.map((category) => (
          <View
            key={category}
            style={{
              // A sliver stays visible: a 3% chance is still a chance.
              flexGrow: Math.max(probabilities[category], 0.03),
              flexBasis: 0,
              backgroundColor: colorOf(category),
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ORDER.map((category, index) => (
          <Text
            key={category}
            variant="caption"
            muted={reading.category !== category}
            style={{
              flex: 1,
              textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right',
              fontFamily: reading.category === category ? theme.fontFamily.bodySemiBold : undefined,
            }}
          >
            {SHORT[variable][category]} {pct(probabilities[category])}
          </Text>
        ))}
      </View>
    </View>
  );
}
