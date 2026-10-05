import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { FallbackReason } from '../../../../shared/api/calendarService';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

/** Exported so tests pin the exact words. */
export const REFERENCE_CALENDAR_MESSAGE = 'Reference calendar. Not yet published for your district.';

/**
 * Says what kind of calendar is on screen, and whether the server answered.
 *
 * Two separate facts, each shown only when true:
 *
 *   - `isReference`: a bundled reference calendar, not one this district has
 *     published. The schedules are real ones, transcribed from published
 *     calendars, but they were written for somewhere else, and a farmer
 *     should know that before following one.
 *   - `reason === 'offline'`: the server could not be reached, which is the
 *     one fallback the farmer can act on. It is also what stops a
 *     misconfigured API address from looking like a working app.
 */
export function SampleDataNotice({ reason, isReference = false }: { reason: FallbackReason; isReference?: boolean }) {
  const theme = useTheme();
  const offline = reason === 'offline';
  if (!offline && !isReference) return null;

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      {isReference ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name="book-outline" size={18} color={theme.colors.muted} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            {REFERENCE_CALENDAR_MESSAGE}
          </Text>
        </View>
      ) : null}
      {offline ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.muted} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            Could not reach the AgroMet server. Check your connection.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
