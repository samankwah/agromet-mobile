import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getSeverityMeta } from '../domain/alertSeverity';
import type { AlertSeverity } from '../domain/alertSeverity';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  severity: AlertSeverity;
  size?: 'sm' | 'md';
};

/**
 * The one severity-rendering component in the app — used by AlertBanner,
 * AlertDetailsScreen, Home's AdvisoryTeaserCard, and (going forward)
 * crop-advisory/flood-drought sections in the Advisories tab. Promoted
 * from the weather-alerts feature to shared/ui once a second, unrelated
 * consumer needed it — one implementation, not several near-identical
 * ones. Always pairs an icon and a text label with the severity color —
 * color is never the only signal.
 */
export function SeverityBadge({ severity, size = 'md' }: Props) {
  const theme = useTheme();
  const meta = getSeverityMeta(severity);
  const color = theme.severityColors[meta.colorToken];
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <View
      accessibilityLabel={meta.a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.xs,
        paddingVertical: size === 'sm' ? 2 : theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.sm,
        backgroundColor: color + '22', // ~13% opacity tint of the severity color
      }}
    >
      <Ionicons name={meta.icon} size={iconSize} color={color} />
      <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={color}>
        {meta.label}
      </Text>
    </View>
  );
}
