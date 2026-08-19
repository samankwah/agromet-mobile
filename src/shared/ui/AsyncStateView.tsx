import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

type Props = {
  /** Maps directly onto TanStack Query's `status` — pass it straight
   * through from useQuery, no translation needed. */
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry?: () => void;
  /** For a successful-but-empty result (e.g. no advisory for a district) —
   * distinct from `error` because it isn't a failure. */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  children: React.ReactNode;
};

/**
 * The one loading/empty/retry/error wrapper in the app. Every card backed
 * by a query renders through this instead of hand-rolling its own spinner
 * and error branch, so those four states look and behave the same
 * everywhere.
 */
export function AsyncStateView({ status, error, onRetry, isEmpty, emptyTitle = 'Nothing here yet', emptyMessage, children }: Props) {
  const theme = useTheme();

  if (status === 'pending') {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
        style={{ alignItems: 'center', paddingVertical: theme.spacing['2xl'] }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Couldn't load this"
        message={error instanceof Error ? error.message : 'Something went wrong. Check your connection and try again.'}
      >
        {onRetry ? <Button label="Retry" variant="outline" onPress={onRetry} /> : null}
      </EmptyState>
    );
  }

  if (isEmpty) {
    return <EmptyState icon="information-circle-outline" title={emptyTitle} message={emptyMessage} />;
  }

  return <>{children}</>;
}
