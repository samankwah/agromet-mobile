import React from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';

import type { NewsUpdate } from '../../../shared/domain/news';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { NewsTeaserSkeleton } from './HomeSkeletons';

type Props = {
  news: NewsUpdate | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/** Presentational only — data comes from useHomeData, same pattern as
 * every other Home card. */
export function NewsTeaserCard({ news, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<NewsTeaserSkeleton />}>
      {news ? (
        // Was Library, which no longer exists — that slot is the AgroMet AI
        // tab now. Advisories rather than the assistant: the README already
        // settles that bulletins and news reach farmers as the weekly advisory
        // and its archive, and a chat screen cannot show a news item.
        <Pressable onPress={() => router.push('/(tabs)/advisories')} accessibilityRole="button" accessibilityLabel={`News: ${news.title}`}>
          <Card style={{ gap: theme.spacing.xs }}>
            <Text variant="caption" muted>
              Latest news
            </Text>
            <Text variant="h3" numberOfLines={2}>
              {news.title}
            </Text>
            <Text variant="body" muted numberOfLines={2}>
              {news.summary}
            </Text>
            <Text variant="caption" muted>
              {formatRelativeTime(news.publishedAt)}
            </Text>
            <MockDataTag />
          </Card>
        </Pressable>
      ) : null}
    </AsyncStateView>
  );
}
