import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ForecastMapLayer } from '../../../shared/domain/forecastMap';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';

type Props = {
  layers: ForecastMapLayer[] | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * A deliberately honest, lightweight map card — not an interactive map.
 * The mock ForecastMapLayer's `imageUrl` isn't a real image
 * (`placeholder://...`), and no map library is installed this pass (maps
 * stay non-mandatory and low-bandwidth per the product brief). Shows the
 * layer's real metadata (legend, source, update time) and says plainly
 * that imagery is coming later — never fakes a map render.
 */
export function MapPreviewCard({ layers, status, error, onRetry }: Props) {
  const theme = useTheme();
  const layer = layers?.[0];

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} isEmpty={layers?.length === 0} emptyTitle="No map layers available">
      {layer ? (
        <Card translucent style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="map-outline" size={18} color={theme.colors.accent} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {layer.label}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {layer.legend.map((entry) => (
              <View key={entry.label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: entry.color }} />
                <Text variant="caption" muted>
                  {entry.label}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="caption" muted>
            {layer.source} · Updated {formatRelativeTime(layer.updatedAt)}
          </Text>
          <Text variant="caption" muted style={{ fontStyle: 'italic' }}>
            Live map imagery is coming in a future update.
          </Text>
        </Card>
      ) : null}
    </AsyncStateView>
  );
}
