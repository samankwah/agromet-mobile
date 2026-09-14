import React from 'react';
import { View } from 'react-native';

import type { LegalSlug } from '../../shared/domain/legal';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { BulletList } from '../../shared/ui/BulletList';
import { Card } from '../../shared/ui/Card';
import { Screen } from '../../shared/ui/Screen';
import { Skeleton, SkeletonCard, SkeletonScreen } from '../../shared/ui/Skeleton';
import { Text } from '../../shared/ui/Text';
import { formatRelativeTime } from '../../shared/utils/formatRelativeTime';
import { useLegalDocument } from './useLegalDocument';

/** Three stubbed sections, so the page does not jump when the prose lands. */
function LegalSkeleton() {
  const theme = useTheme();

  return (
    <SkeletonScreen>
      <Skeleton width="55%" height={12} />
      {[0, 1, 2].map((section) => (
        <SkeletonCard key={section} gap={theme.spacing.md}>
          <Skeleton width={`${60 - section * 8}%`} height={16} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="92%" height={12} />
          <Skeleton width="70%" height={12} />
        </SkeletonCard>
      ))}
    </SkeletonScreen>
  );
}

/**
 * A legal document — Terms of Service or Privacy Policy — rendered natively.
 *
 * One component for both, because they differ only in their content: the
 * backend serves the same `{title, summary, updated, sections}` shape for each
 * (see `LEGAL_DOCUMENTS` in `backend/app/main.py`), so a second screen would be
 * the same file with a different slug.
 *
 * Native rather than a link out to the website. Terms a farmer can only read
 * with a signal are terms they cannot read where they farm, and the offline
 * cache in `useLegalDocument` is what makes them readable in a field.
 *
 * No `h1`: the stack header already carries the title, the convention
 * `SettingsScreen` follows.
 */
export function LegalScreen({ slug }: { slug: LegalSlug }) {
  const theme = useTheme();
  const { document, status, error, refetch, usingCachedFallback, cachedAt } = useLegalDocument(slug);

  return (
    <Screen wallpaper>
      <AsyncStateView status={status} error={error} onRetry={refetch} skeleton={<LegalSkeleton />}>
        {document ? (
          <>
            <View style={{ gap: theme.spacing.xs }}>
              {document.summary ? <Text variant="body">{document.summary}</Text> : null}
              {document.updated ? (
                <Text variant="caption" muted>
                  Last updated {document.updated}
                </Text>
              ) : null}
              {/* Same caption the advisory archive uses when it falls back to
                  disk — the reader should know this came from the last time the
                  app could reach the server, not from just now. */}
              {usingCachedFallback ? (
                <Text variant="caption" muted>
                  Saved {cachedAt ? formatRelativeTime(cachedAt) : 'earlier'}, shown offline
                </Text>
              ) : null}
            </View>

            {document.sections.map((section) => (
              <Card key={section.title} style={{ gap: theme.spacing.sm }}>
                <Text variant="h3">{section.title}</Text>
                {section.body ? <Text variant="body">{section.body}</Text> : null}
                {section.items ? <BulletList items={section.items} /> : null}
              </Card>
            ))}
          </>
        ) : null}
      </AsyncStateView>
    </Screen>
  );
}
