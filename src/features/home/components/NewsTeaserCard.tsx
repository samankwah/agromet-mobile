import React from 'react';

import type { NewsUpdate } from '../../../shared/domain/news';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { NewsTeaserSkeleton } from './HomeSkeletons';
import { TeaserCard } from './TeaserCard';

type Props = {
  news: NewsUpdate | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * The latest GMet update.
 *
 * A headline is already a complete sentence — "GMet extends farmer field visits
 * to three more districts" leaves nothing a two-line standfirst would add before
 * the tap, and the standfirst broke mid-word to say it. So the card is the
 * headline and its age, which is what a news teaser is.
 *
 * The published date moves from a loose caption under the body to the label
 * row, which is where every other card on Home puts its trailing metadata — and
 * on a news item the age is part of the headline's meaning, not a footnote to
 * it.
 *
 * It still lands on the Advisories tab rather than the item itself, because
 * there is no news detail route in the app: `NewsUpdate` has no screen of its
 * own. That is a gap worth closing, not something to paper over with a link
 * that goes nowhere useful — so the action says where it actually goes.
 */
export function NewsTeaserCard({ news, status, error, onRetry }: Props) {
  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<NewsTeaserSkeleton />}>
      {news ? (
        <TeaserCard
          label="Latest news"
          trailing={
            <Text variant="caption" muted numberOfLines={1}>
              {formatRelativeTime(news.publishedAt)}
            </Text>
          }
          href="/(tabs)/advisories"
          action="More updates"
          accessibilityLabel={`Latest news, ${formatRelativeTime(news.publishedAt)}: ${news.title}. ${news.summary}`}
        >
          <Text variant="h3" numberOfLines={2}>
            {news.title}
          </Text>
        </TeaserCard>
      ) : null}
    </AsyncStateView>
  );
}
