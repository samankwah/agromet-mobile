import React from 'react';
import { View } from 'react-native';

import type { AgroAdvisory } from '../../../shared/domain/advisory';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { SeverityBadge } from '../../../shared/ui/SeverityBadge';
import { Text } from '../../../shared/ui/Text';
import { AdvisoryTeaserSkeleton } from './HomeSkeletons';
import { TeaserCard } from './TeaserCard';

type Props = {
  advisory: AgroAdvisory | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * This week's guidance, in the two lines it takes to decide whether to open it.
 *
 * The two-line summary is gone. It restated the title in longer words — "Coastal
 * districts: favorable conditions for fieldwork" above "Conditions along the
 * coast remain settled this week with no significant rainfall expected, a go…" —
 * and paid for the restatement with an ellipsis in the middle of a word. What a
 * farmer needs before deciding to tap is how urgent it is, what it is about, and
 * whether it touches their crop. That is the badge, the title and the chips. The
 * prose is one tap away and does not need previewing.
 *
 * Three other things changed. It goes to `/advisory/crop` — the advisory itself —
 * rather than the Advisories tab, which is where the news card also landed, so
 * two cards no longer share one destination. Its crops are chips instead of a
 * teal comma-list that read as a link and was not one. And the dev-only "Mock
 * data" flask at the foot of the card is now a notice that survives a release
 * build, because this content is invented and the flask was about to stop
 * saying so in the pilot APK.
 *
 * `SeverityBadge` is the same component AlertBanner and AlertDetailsScreen use —
 * `AgroAdvisory.severity` is the same `AlertSeverity` type.
 */
export function AdvisoryTeaserCard({ advisory, status, error, onRetry }: Props) {
  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<AdvisoryTeaserSkeleton />}>
      {advisory ? (
        <TeaserCard
          label="This week's advisory"
          trailing={<SeverityBadge severity={advisory.severity} size="sm" />}
          href="/advisory/crop"
          action="Read advisory"
          accessibilityLabel={`This week's advisory: ${advisory.title}. ${advisory.summary}`}
        >
          <Text variant="h3" numberOfLines={2}>
            {advisory.title}
          </Text>
          {advisory.crops.length > 0 ? <CropChips crops={advisory.crops} /> : null}
        </TeaserCard>
      ) : null}
    </AsyncStateView>
  );
}

/** The crops the advisory speaks to. Chips rather than prose: a farmer scans
 * for their own crop and stops, which a comma-separated sentence makes them
 * read instead. */
function CropChips({ crops }: { crops: string[] }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: 2 }}>
      {crops.map((crop) => (
        <View
          key={crop}
          style={{
            paddingVertical: 3,
            paddingHorizontal: theme.spacing.md,
            // Pill and a shallow lift, matching SeverityBadge — a chip sits on
            // its card rather than in it.
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.teal + '1A', // ~10% tint, matching SeverityBadge's treatment
            boxShadow: theme.raised('sm'),
          }}
        >
          <Text variant="caption" color={theme.colors.teal}>
            {crop}
          </Text>
        </View>
      ))}
    </View>
  );
}
