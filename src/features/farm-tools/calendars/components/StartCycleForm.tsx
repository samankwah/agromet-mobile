import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { FieldLabel } from '../../../../shared/ui/FieldLabel';
import { Text } from '../../../../shared/ui/Text';

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

/** ISO date (YYYY-MM-DD) in local time — `toISOString` would shift the day
 * backwards for anyone west of UTC, which is most of Ghana's neighbours. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

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
  const [showPicker, setShowPicker] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [quantity, setQuantity] = useState('');

  const trimmedName = batchName.trim();
  // Named so a farmer running several batches can tell them apart; defaulted
  // so nobody is blocked by a naming decision.
  const resolvedName = trimmedName || `${subject} — ${formatDate(startDate)}`;

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
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />

          <View style={{ gap: 2 }}>
            <Text variant="h3">Start a cycle</Text>
            <Text variant="caption" muted>
              {isCycle
                ? 'Track a flock against this calendar and see which week it is in.'
                : 'Track this planting and see which week of the calendar you are in.'}
            </Text>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <FieldLabel>{isCycle ? 'Day-old chicks arrived' : 'Planting date'}</FieldLabel>
            <Pressable
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${isCycle ? 'Arrival date' : 'Planting date'}: ${formatDate(startDate)}. Change it.`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text variant="body">{formatDate(startDate)}</Text>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.muted} />
            </Pressable>
            <Text variant="caption" muted>
              Week 1 starts on this date.
            </Text>
          </View>

          {showPicker ? (
            <DateTimePicker
              value={startDate}
              mode="date"
              // A cycle can be backdated — a farmer often sets this up days
              // after planting — but not started in the future.
              maximumDate={new Date()}
              onChange={(_event, selected) => {
                setShowPicker(false);
                if (selected) setStartDate(selected);
              }}
            />
          ) : null}

          <View style={{ gap: theme.spacing.xs }}>
            <FieldLabel>Batch name</FieldLabel>
            <TextInput
              value={batchName}
              onChangeText={setBatchName}
              placeholder={resolvedName}
              placeholderTextColor={theme.colors.muted}
              accessibilityLabel="Batch name, optional"
              style={{
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                fontFamily: theme.fontFamily.body,
                fontSize: theme.typeScale.body.fontSize,
              }}
            />
          </View>

          {isCycle ? (
            <View style={{ gap: theme.spacing.xs }}>
              <FieldLabel>Number of birds</FieldLabel>
              <TextInput
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                accessibilityLabel="Number of birds, optional"
                style={{
                  minHeight: theme.minTouchTarget,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.typeScale.body.fontSize,
                }}
              />
            </View>
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
