import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ArchivedAdvisory } from '../../../../shared/domain/weeklyAdvisory';
import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { formatRelativeTime } from '../../../../shared/utils/formatRelativeTime';

type Props = {
  entry: ArchivedAdvisory;
  /** Divider above every row but the first in its year. */
  first: boolean;
  /** Activity names that matched the search, shown as evidence. Empty while
   * browsing, which keeps a third line off every row. */
  matched: string[];
  /** False when the list is already scoped to one region and the summary line
   * says so — repeating it on every row would be noise. True while browsing
   * nationally, where a district alone does not place the advisory. */
  showRegion: boolean;
  onOpen: (entry: ArchivedAdvisory) => void;
};

/**
 * One advisory in the archive.
 *
 * A divider-separated row inside its year's card, not a card of its own. Seven
 * floating cards with gaps between them read as seven unrelated things; rows
 * under one hairline read as a list you can run your eye down, which is what an
 * archive is for. Same reasoning as the flood/drought region list.
 *
 * The date says **published**. `createdAt` is when the spreadsheet was
 * uploaded, not the period the advisory covers — that window lives inside each
 * activity's metadata, which this endpoint does not return. Calling it "valid"
 * would be a quiet lie about which weeks the guidance applies to.
 */
export function ArchiveRow({ entry, first, matched, showRegion, onOpen }: Props) {
  const theme = useTheme();

  const coverage =
    entry.activityCount > 0
      ? `${entry.activityCount} ${entry.activityCount === 1 ? 'activity' : 'activities'}`
      : null;
  const facts = [
    showRegion ? [entry.district, entry.region].filter(Boolean).join(', ') : entry.district,
    entry.subject,
    coverage,
  ]
    .filter(Boolean)
    .join(' · ');
  const published = entry.createdAt ? `Published ${formatRelativeTime(entry.createdAt)}` : null;

  return (
    <Pressable
      onPress={() => onOpen(entry)}
      accessibilityRole="button"
      // The region is always spoken, even when it is left off the visible line
      // to avoid repeating it down a scoped list — a screen reader gets no
      // benefit from that de-duplication and does need the place.
      accessibilityLabel={
        `${entry.title}.` +
        ` ${[entry.district, entry.region].filter(Boolean).join(', ')}.` +
        (entry.subject ? ` ${entry.subject}.` : '') +
        (coverage ? ` ${coverage}.` : '') +
        (published ? ` ${published}.` : '') +
        (matched.length > 0 ? ` Matched ${matched.join(', ')}.` : '') +
        ' Opens the full advisory.'
      }
    >
      {({ pressed }) => (
        // Chrome on the nested View, never on the Pressable — Button.tsx
        // documents why: Android drops a Pressable's own padding, border and
        // flex direction while still drawing its children.
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: theme.minTouchTarget,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderTopWidth: first ? 0 : 1,
            borderTopColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.bg : 'transparent',
          }}
        >
          {/* A quiet kind marker. Crop and poultry advisories are structurally
              different documents, and telling them apart at a glance saves
              opening the wrong one. */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: theme.radii.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tint(theme.colors.teal, theme.colors.surface, 0.12),
            }}
          >
            <Ionicons
              name={entry.kind === 'poultry' ? 'egg-outline' : 'leaf-outline'}
              size={16}
              color={theme.colors.teal}
            />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {entry.title}
            </Text>

            <Text variant="caption" muted numberOfLines={1}>
              {facts}
            </Text>

            {/* Only while searching, and only the activities that actually
                matched — so a result says why it is here rather than leaving
                the reader to scan nine activity names for the word. */}
            {matched.length > 0 ? (
              <Text variant="caption" color={theme.colors.accent} numberOfLines={1}>
                {matched.join(', ')}
              </Text>
            ) : published ? (
              <Text variant="caption" muted numberOfLines={1}>
                {published}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </View>
      )}
    </Pressable>
  );
}
