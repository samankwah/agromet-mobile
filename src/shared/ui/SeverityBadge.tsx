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
        paddingHorizontal: theme.spacing.md,
        // Pill, not a soft rectangle. A badge is the one element the reference
        // designs always round fully, which is what separates a status chip
        // from a small panel at a glance.
        borderRadius: theme.radii.pill,
        backgroundColor: color + '22', // ~13% opacity tint of the severity color
        // The tint is translucent, so an inset pair would darken unevenly over
        // whatever it sits on. A shallow lift is the honest reading anyway: a
        // badge sits on its card rather than in it.
        boxShadow: theme.raised('sm'),
      }}
    >
      <Ionicons name={meta.icon} size={iconSize} color={color} />
      <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={color}>
        {meta.label}
      </Text>
    </View>
  );
}
