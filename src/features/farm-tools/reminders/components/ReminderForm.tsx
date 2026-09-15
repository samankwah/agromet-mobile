import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REPEAT_LABELS, type FarmReminder, type ReminderDraft, type ReminderRepeat } from '../../../../shared/domain/farmReminder';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { DateTimeField } from '../../../../shared/ui/DateTimeField';
import { SegmentedControl } from '../../../../shared/ui/SegmentedControl';
import { Text } from '../../../../shared/ui/Text';
import { TextField } from '../../../../shared/ui/TextField';

/** Everything a caller may prefill. Absent fields fall back to sensible defaults. */
export type ReminderFormSeed = Partial<ReminderDraft> & { id?: string };

type Props = {
  visible: boolean;
  /** Present when editing; absent when creating. */
  seed?: ReminderFormSeed;
  onSubmit: (draft: ReminderDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const REPEAT_ORDER: ReminderRepeat[] = ['none', 'daily', 'weekly'];

/**
 * Tomorrow at 07:00.
 *
 * Farm work starts early, and a default of "right now" would produce a reminder
 * that has already passed by the time it is saved.
 */
export function defaultDueAt(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(7, 0, 0, 0);
  return date;
}

/** Seed for editing an existing reminder. */
export function seedFromReminder(reminder: FarmReminder): ReminderFormSeed {
  return {
    id: reminder.id,
    title: reminder.title,
    note: reminder.note,
    dueAt: reminder.dueAt,
    repeat: reminder.repeat,
    crop: reminder.crop,
    source: reminder.source,
    sourceRef: reminder.sourceRef,
  };
}

/**
 * Create or edit a reminder.
 *
 * One sheet for both, because the fields are identical and two near-copies
 * would drift. The only difference is the delete action, which appears solely
 * when there is something to delete.
 *
 * Date and time are separate pickers rather than one combined control: the
 * platform pickers are single-mode, and a farmer changing "same task, an hour
 * later" should not have to walk back through a calendar to do it.
 */
export function ReminderForm({ visible, seed, onSubmit, onDelete, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState(() => defaultDueAt());
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');
  const [touched, setTouched] = useState(false);

  // Reset from the seed each time the sheet opens, so an edit never shows the
  // previous reminder's text and a fresh create never inherits an edit.
  useEffect(() => {
    if (!visible) return;
    setTitle(seed?.title ?? '');
    setNote(seed?.note ?? '');
    setDue(seed?.dueAt ? new Date(seed.dueAt) : defaultDueAt());
    setRepeat(seed?.repeat ?? 'none');
    setTouched(false);
  }, [visible, seed]);

  const trimmedTitle = title.trim();
  const isValid = trimmedTitle.length > 0;
  const isEditing = Boolean(seed?.id);

  const submit = () => {
    setTouched(true);
    if (!isValid) return;

    onSubmit({
      title: trimmedTitle,
      note: note.trim() || undefined,
      dueAt: due.toISOString(),
      repeat,
      crop: seed?.crop,
      source: seed?.source ?? 'manual',
      sourceRef: seed?.sourceRef,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close reminder form"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            // Slides up over the whole screen, so it takes the deepest lift.
            boxShadow: theme.cast('bottom', 'lg'),
            paddingTop: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            // The sheet is a sibling of the screen, so it inherits no safe-area
            // inset — without this the save button sits under the gesture bar.
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            gap: theme.spacing.md,
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.bg,
              boxShadow: theme.sunken('sm'),
              alignSelf: 'center',
            }}
          />

          <Text variant="h3">{isEditing ? 'Edit reminder' : 'New reminder'}</Text>

          <ScrollView
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: theme.spacing.xs }}>
              <TextField
                label="What needs doing"
                value={title}
                onChangeText={setTitle}
                placeholder="Top-dress the maize"
                accessibilityLabel="Reminder title"
              />
              {touched && !isValid ? (
                <Text variant="caption" color={theme.colors.danger}>
                  Give the reminder a name so you know what it is when it arrives.
                </Text>
              ) : null}
            </View>

            <TextField
              label="Notes"
              value={note}
              onChangeText={setNote}
              placeholder="Optional. Anything you want to remember"
              multiline
              accessibilityLabel="Reminder notes, optional"
            />

            <DateTimeField label="Date" mode="date" value={due} onChange={setDue} />
            <DateTimeField label="Time" mode="time" value={due} onChange={setDue} />

            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                Repeat
              </Text>
              <SegmentedControl
                segments={REPEAT_ORDER.map((option) => REPEAT_LABELS[option])}
                selectedIndex={REPEAT_ORDER.indexOf(repeat)}
                onChange={(index) => setRepeat(REPEAT_ORDER[index])}
                accessibilityLabel="How often this reminder repeats"
                variant="pill"
              />
            </View>
          </ScrollView>

          <Button label={isEditing ? 'Save changes' : 'Add reminder'} onPress={submit} />

          {onDelete ? (
            <Button
              label="Delete reminder"
              variant="outline"
              onPress={onDelete}
              icon={<Ionicons name="trash-outline" size={16} color={theme.colors.accent} />}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
