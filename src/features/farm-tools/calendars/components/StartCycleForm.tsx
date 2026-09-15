import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { DateTimeField } from '../../../../shared/ui/DateTimeField';
import { TextField } from '../../../../shared/ui/TextField';
import { Text } from '../../../../shared/ui/Text';
import { formatDate, toIsoDate } from '../../../../shared/utils/dates';

export type StartCycleValues = { startDate: string; batchName: string; initialQuantity: number };

type Props = {
  visible: boolean;
  /** "Broiler", "Tomato" — used to word the form for what is being tracked. */
  subject: string;
  isCycle: boolean;
  isSubmitting: boolean;
  error: unknown;
  onSubmit: (values: StartCycleValues) => void;
  onClose: () => void;
};

/**
 * Starting a cycle is what turns a generic calendar into this farmer's
 * calendar — week 7 stops being an abstraction and becomes a date.
 *
 * Deliberately three fields. Every extra one is a reason not to finish, and
 * the backend only needs a start date to compute everything else.
 */
export function StartCycleForm({ visible, subject, isCycle, isSubmitting, error, onSubmit, onClose }: Props) {
  const theme = useTheme();

  const [startDate, setStartDate] = useState(() => new Date());
  const [batchName, setBatchName] = useState('');
  const [quantity, setQuantity] = useState('');

  const trimmedName = batchName.trim();
  // Named so a farmer running several batches can tell them apart; defaulted
  // so nobody is blocked by a naming decision.
  const resolvedName = trimmedName || `${subject}, ${formatDate(startDate)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            // Slides up over the whole screen, so it takes the deepest lift.
            boxShadow: theme.cast('bottom', 'lg'),
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
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

          <View style={{ gap: 2 }}>
            <Text variant="h3">Start a cycle</Text>
            <Text variant="caption" muted>
              {isCycle
                ? 'Track a flock against this calendar and see which week it is in.'
                : 'Track this planting and see which week of the calendar you are in.'}
            </Text>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <DateTimeField
              label={isCycle ? 'Day-old chicks arrived' : 'Planting date'}
              mode="date"
              value={startDate}
              onChange={setStartDate}
              // A cycle can be backdated — a farmer often sets this up days
              // after planting — but not started in the future.
              maximumDate={new Date()}
            />
            <Text variant="caption" muted>
              Week 1 starts on this date.
            </Text>
          </View>

          <TextField
            label="Batch name"
            value={batchName}
            onChangeText={setBatchName}
            placeholder={resolvedName}
            accessibilityLabel="Batch name, optional"
          />

          {isCycle ? (
            <TextField
              label="Number of birds"
              value={quantity}
              onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              accessibilityLabel="Number of birds, optional"
            />
          ) : null}

          {error ? (
            <Text variant="caption" color={theme.colors.danger}>
              Could not start the cycle. Check your connection and try again.
            </Text>
          ) : null}

          <Button
            label="Start cycle"
            loading={isSubmitting}
            onPress={() => onSubmit({ startDate: toIsoDate(startDate), batchName: resolvedName, initialQuantity: Number(quantity) || 0 })}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
