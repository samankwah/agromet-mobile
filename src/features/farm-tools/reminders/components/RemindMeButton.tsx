import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ReminderDraft } from '../../../../shared/domain/farmReminder';
import { useReminderStore } from '../../../../shared/state/reminderStore';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Text } from '../../../../shared/ui/Text';
import { ReminderForm, type ReminderFormSeed } from './ReminderForm';

type Props = {
  /** Prefilled values — the caller knows what this reminder is about. */
  seed: ReminderFormSeed;
  label?: string;
  /**
   * Why a reminder cannot be created from here yet, if it cannot.
   *
   * Rendered instead of the button. Hiding the control silently would leave
   * the farmer wondering whether the feature exists; saying what is missing
   * tells them how to get it.
   */
  disabledReason?: string | null;
};

/**
 * "Remind me about this", droppable anywhere.
 *
 * Owns its own sheet and writes straight to the store, so adding a reminder
 * from a calendar activity or a weather alert costs the host screen exactly
 * one line and no new state. The farmer still sees the form before anything is
 * saved — a prefilled reminder is a suggestion, not a decision made for them.
 */
export function RemindMeButton({ seed, label = 'Remind me about this', disabledReason }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const add = useReminderStore((state) => state.add);

  if (disabledReason) {
    return (
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={16} color={theme.colors.muted} style={{ marginTop: 2 }} />
        <Text variant="caption" muted style={{ flex: 1 }}>
          {disabledReason}
        </Text>
      </View>
    );
  }

  const submit = (draft: ReminderDraft) => {
    add(draft);
    setOpen(false);
    setSaved(true);
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Button
        label={saved ? 'Reminder set' : label}
        variant="outline"
        onPress={() => {
          setSaved(false);
          setOpen(true);
        }}
        icon={
          <Ionicons
            name={saved ? 'checkmark-circle-outline' : 'alarm-outline'}
            size={16}
            color={theme.colors.accent}
          />
        }
      />

      <ReminderForm visible={open} seed={seed} onSubmit={submit} onClose={() => setOpen(false)} />
    </View>
  );
}
