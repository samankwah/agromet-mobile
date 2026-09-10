import React, { useCallback, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import type { DiagnosisResult } from '../../../shared/domain/diagnosis';
import { listDiagnosisHistory } from '../../../shared/storage/diagnosisHistory';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { formatConfidenceRange } from '../../../shared/utils/formatConfidenceRange';
import { DiagnosisResultCard } from './components/DiagnosisResultCard';

/**
 * Every diagnosis this device has had an answer for.
 *
 * Local, not from the backend's history endpoints: those sit behind a login
 * this app deliberately does not have, and putting a farmer's own past photos
 * behind an account, reachable only with the connection that was missing when
 * they queued the thing, would be a poor trade.
 *
 * This is also where an offline submission's answer arrives. The queue used to
 * sync, resolve a result, and drop it, so submitting without signal produced a
 * badge that cleared and nothing else.
 */
export function DiagnosisHistoryScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [open, setOpen] = useState<DiagnosisResult | null>(null);

  // On focus rather than on mount: a diagnosis made after this screen was last
  // rendered, or synced from the queue while it sat in the stack, must show up
  // on the way back rather than only after a restart.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listDiagnosisHistory().then((entries) => {
        if (active) setHistory(entries);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  if (open) {
    return (
      <Screen>
        <Pressable
          onPress={() => setOpen(null)}
          accessibilityRole="button"
          accessibilityLabel="Back to all diagnoses"
        >
          {/* Chrome on the nested View: Android drops a Pressable's own. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
            <Text variant="caption" color={theme.colors.accent}>
              All diagnoses
            </Text>
          </View>
        </Pressable>

        <DiagnosisResultCard result={open} />
      </Screen>
    );
  }

  if (history.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="leaf-outline"
          title="No diagnoses yet"
          message="Crops you photograph are kept here so you can look back at what was found, and what you were told to do about it."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {history.map((entry) => (
        <HistoryRow key={entry.id} entry={entry} onOpen={() => setOpen(entry)} />
      ))}

      <Text variant="caption" muted>
        Kept on this phone only, so it works without a connection.
      </Text>
    </Screen>
  );
}

function HistoryRow({ entry, onOpen }: { entry: DiagnosisResult; onOpen: () => void }) {
  const theme = useTheme();
  const when = new Date(entry.diagnosedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${entry.likelyIssue}, ${when}`}>
      <Card style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        {entry.imageUri ? (
          <Image
            source={{ uri: entry.imageUri }}
            style={{ width: 56, height: 56, borderRadius: theme.radii.sm }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {entry.likelyIssue}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            {formatConfidenceRange(entry.confidenceBand, entry.confidenceRangePct)}
          </Text>
          <Text variant="caption" muted>
            {when}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Card>
    </Pressable>
  );
}
