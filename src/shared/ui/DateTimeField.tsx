import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { FieldLabel } from './FieldLabel';
import { Text } from './Text';
import { formatDate, formatTime } from '../utils/dates';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

/**
 * A tappable field that opens the platform date or time picker.
 *
 * Generalises the pattern StartCycleForm already used for its planting date —
 * a Pressable styled as a field, with the picker rendered only while open. The
 * picker is not left mounted: on Android it is a modal dialog, so a permanently
 * mounted one reopens itself every render.
 *
 * `mode="time"` is new to this app. Reminders need both halves, because a due
 * date without a time cannot be scheduled — and defaulting the time to midnight
 * would fire alerts nobody is awake for.
 */
export function DateTimeField({ label, mode, value, onChange, minimumDate, maximumDate }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const display = mode === 'date' ? formatDate(value) : formatTime(value);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <FieldLabel>{label}</FieldLabel>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}. Change it.`}
      >
        {({ pressed }) => (
          // Chrome on a View, never on the Pressable — Button.tsx documents why:
          // Android drops a Pressable's own background and border while still
          // drawing its children, leaving an invisible field.
          <View
            style={{
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
              minHeight: theme.minTouchTarget,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="body">{display}</Text>
            <Ionicons
              name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
              size={18}
              color={theme.colors.muted}
            />
          </View>
        )}
      </Pressable>

      {open ? (
        <DateTimePicker
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_event, selected) => {
            setOpen(false);
            if (selected) onChange(selected);
          }}
        />
      ) : null}
    </View>
  );
}
