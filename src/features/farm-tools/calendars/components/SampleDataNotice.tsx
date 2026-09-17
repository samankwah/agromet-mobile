import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { FallbackReason } from '../../../../shared/api/calendarService';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

/**
 * Says when the server could not be reached, which is the one fallback the
 * farmer can act on. It is also what stops a misconfigured API address from
 * looking like a working app. Nothing is shown when the server simply has no
 * calendars published.
 */
export function SampleDataNotice({ reason }: { reason: FallbackReason }) {
  const theme = useTheme();
  if (reason !== 'offline') return null;

  return (
    <Card style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.muted} />
      <Text variant="caption" muted style={{ flex: 1 }}>
        Could not reach the AgroMet server. Check your connection.
      </Text>
    </Card>
  );
}
