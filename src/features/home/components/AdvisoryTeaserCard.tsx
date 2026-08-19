import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import type { AgroAdvisory } from '../../../shared/domain/advisory';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { SeverityBadge } from '../../../shared/ui/SeverityBadge';
import { Text } from '../../../shared/ui/Text';

type Props = {
  advisory: AgroAdvisory | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/** Reuses SeverityBadge — the same component AlertBanner and
 * AlertDetailsScreen use — since AgroAdvisory.severity is the same
 * AlertSeverity type as WeatherAlert.severity. */
export function AdvisoryTeaserCard({ advisory, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry}>
      {advisory ? (
        <Pressable
          onPress={() => router.push('/(tabs)/advisories')}
          accessibilityRole="button"
          accessibilityLabel={`Advisory: ${advisory.title}`}
        >
          <Card style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text variant="caption" muted>
                Latest advisory
              </Text>
              <SeverityBadge severity={advisory.severity} size="sm" />
            </View>
            <Text variant="h3" numberOfLines={2}>
              {advisory.title}
            </Text>
            <Text variant="body" muted numberOfLines={2}>
              {advisory.summary}
            </Text>
            {advisory.crops.length > 0 ? (
              <Text variant="caption" color={theme.colors.teal}>
                {advisory.crops.join(', ')}
              </Text>
            ) : null}
            <MockDataTag />
          </Card>
        </Pressable>
      ) : null}
    </AsyncStateView>
  );
}
