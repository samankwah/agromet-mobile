import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { FallbackReason } from '../../../../shared/api/calendarService';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

/**
 * Says, in words, why what's on screen isn't live.
 *
 * The MockDataTag alone is a dev-only marker and disappears in a release
 * build. This is the user-facing half, and it exists as much for the
 * developer as the farmer: "couldn't reach the server" on screen is what
 * stops a misconfigured API address from looking like a working app.
 */
export function SampleDataNotice({ reason }: { reason: FallbackReason }) {
  const theme = useTheme();
  if (!reason) return null;

  const offline = reason === 'offline';

  return (
    <Card style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name={offline ? 'cloud-offline-outline' : 'information-circle-outline'} size={18} color={theme.colors.muted} />
      <Text variant="caption" muted style={{ flex: 1 }}>
        {offline
          ? 'Could not reach the AgroMet server, so these are sample calendars. Check your connection — the published calendars for your district may differ.'
          : 'No calendars have been published for this yet, so these are samples to show what a calendar looks like.'}
      </Text>
    </Card>
  );
}
