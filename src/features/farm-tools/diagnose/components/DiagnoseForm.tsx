import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

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
 * The crop + growth stage + symptoms form. A single cohesive component
 * rather than three separate ones — each field is a couple of lines with
 * no independent logic, so splitting them further would just add files to
 * navigate between for no benefit.
 */
export function DiagnoseForm({ crop, growthStage, symptoms, onChangeCrop, onChangeGrowthStage, onChangeSymptoms }: Props) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.lg }}>
      <FieldGroup label="Crop">
        <ChipRow options={CROPS} selected={crop} onSelect={onChangeCrop} />
      </FieldGroup>

      <FieldGroup label="Growth stage">
        <ChipRow options={GROWTH_STAGES} selected={growthStage} onSelect={onChangeGrowthStage} />
      </FieldGroup>

      <FieldGroup label="Describe what you're seeing">
        <TextInput
          value={symptoms}
          onChangeText={onChangeSymptoms}
          placeholder="e.g. small holes in the leaves, yellowing near the veins…"
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={4}
          accessibilityLabel="Describe the crop symptoms"
          style={{
            minHeight: 96,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.sm,
            padding: theme.spacing.md,
            color: theme.colors.text,
            fontFamily: theme.fontFamily.body,
            fontSize: theme.typeScale.body.fontSize,
          }}
        />
      </FieldGroup>
    </Card>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (value: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option}
            style={{
              minHeight: theme.minTouchTarget,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
              backgroundColor: isSelected ? theme.colors.accent + '1a' : 'transparent',
            }}
          >
            <Text variant="body" color={isSelected ? theme.colors.accent : theme.colors.text}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
