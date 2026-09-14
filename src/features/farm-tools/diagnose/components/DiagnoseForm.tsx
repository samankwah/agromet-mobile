import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { TextField } from '../../../../shared/ui/TextField';

const CROPS = ['Maize', 'Cassava', 'Tomato', 'Rice', 'Cocoa', 'Other'];
const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Maturity'];

type Props = {
  crop: string;
  growthStage: string;
  symptoms: string;
  onChangeCrop: (crop: string) => void;
  onChangeGrowthStage: (stage: string) => void;
  onChangeSymptoms: (symptoms: string) => void;
};

/**
 * What the farmer is looking at, and what is wrong with it.
 *
 * Laid out as sections on the page rather than inside a card. The card was
 * drawing a box around "the form" — a boundary that told the reader nothing,
 * since the whole screen is the form. Cards are kept for the result, where
 * they mean "this is the answer".
 */
export function DiagnoseForm({
  crop,
  growthStage,
  symptoms,
  onChangeCrop,
  onChangeGrowthStage,
  onChangeSymptoms,
}: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <Field label="Which crop?">
        <ChipGrid options={CROPS} columns={3} selected={crop} onSelect={onChangeCrop} groupLabel="Crop" />
      </Field>

      <Field label="What stage is it at?">
        <ChipGrid
          options={GROWTH_STAGES}
          columns={2}
          selected={growthStage}
          onSelect={onChangeGrowthStage}
          groupLabel="Growth stage"
        />
      </Field>

      <Field label="What do you see?">
        <TextField
          value={symptoms}
          onChangeText={onChangeSymptoms}
          placeholder="Small holes in the leaves, yellowing near the veins…"
          multiline
          accessibilityLabel="Describe the crop symptoms"
        />
        <Text variant="caption" muted>
          The more you describe, the more useful the answer.
        </Text>
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">{label}</Text>
      {children}
    </View>
  );
}

/**
 * A fixed-column grid of choices.
 *
 * Equal-width cells rather than content-width chips that wrap where they
 * land. Six crops used to break 4-then-2 and four stages 3-then-1, leaving
 * orphans on the second row — tidy is not decoration here, a ragged block is
 * genuinely harder to scan for the one option you want.
 *
 * Everything stays on screen. A horizontal scroller would look neater still
 * and hide half the crops behind a gesture nobody is told about.
 */
function ChipGrid({
  options,
  columns,
  selected,
  onSelect,
  groupLabel,
}: {
  options: string[];
  columns: number;
  selected: string;
  onSelect: (value: string) => void;
  groupLabel: string;
}) {
  const theme = useTheme();

  // Chunked into explicit rows of equal `flex: 1` cells rather than wrapping
  // percentage widths. Percentages plus a gap overflow the row — the gap is
  // added on top of a width that already totals 100% — and the fix people
  // reach for (negative margins) breaks at the edges. Rows are exact.
  const rows: string[][] = [];
  for (let index = 0; index < options.length; index += columns) {
    rows.push(options.slice(index, index + columns));
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={groupLabel} style={{ gap: theme.spacing.sm }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {row.map((option) => {
            const isSelected = option === selected;

            return (
              <Pressable
                key={option}
                onPress={() => onSelect(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  // Chrome on a View, never on the Pressable — Button.tsx
                  // documents why: Android drops a Pressable's own background
                  // and border while still drawing its children.
                  <View
                    style={{
                      minHeight: theme.minTouchTarget,
                      paddingHorizontal: theme.spacing.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.accent + '1a' : theme.colors.surface,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Text
                      variant={isSelected ? 'bodyStrong' : 'body'}
                      color={isSelected ? theme.colors.accent : theme.colors.text}
                      numberOfLines={1}
                    >
                      {option}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* Keeps the last row's cells the same width as every other row's
              when the options do not divide evenly. */}
          {row.length < columns
            ? Array.from({ length: columns - row.length }, (_, index) => <View key={`pad-${index}`} style={{ flex: 1 }} />)
            : null}
        </View>
      ))}
    </View>
  );
}
