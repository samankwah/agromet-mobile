import React from 'react';
import { View } from 'react-native';

import { formatDriverMeasurement } from '../../../../shared/domain/hazard';
import type { HazardDriver } from '../../../../shared/domain/hazard';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

/**
 * The measurements a score is built from.
 *
 * A composite index that will not show its working is only an assertion, and a
 * farmer has no way to judge whether to act on an assertion. Each row carries
 * the value, its unit, and the backend's plain-English gloss.
 *
 * The gloss is *evidence* ("Higher than 89% of daily flows on this reach since
 * 1995"), not a prediction of impact — it is deliberately never presented as
 * "what will happen".
 */
export function HazardDrivers({ drivers, note }: { drivers: HazardDriver[]; note?: string | null }) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">What the score is built from</Text>

      {drivers.length === 0 ? (
        <Text variant="body" muted>
          No measurements are available for this region right now.
        </Text>
      ) : (
        drivers.map((driver, index) => (
          <View
            key={driver.key}
            style={{
              gap: theme.spacing.xs,
              paddingTop: index === 0 ? 0 : theme.spacing.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <Text variant="body" style={{ flexShrink: 1 }}>
                {driver.label}
              </Text>
              <DriverMeasurement value={driver.value} unit={driver.unit} />
            </View>

            {driver.gloss ? (
              <Text variant="caption" muted>
                {driver.gloss}
              </Text>
            ) : null}

            {driver.percentile !== null && driver.percentile !== undefined ? (
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: theme.colors.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 3,
                    width: `${Math.max(2, Math.min(100, driver.percentile))}%`,
                    borderRadius: 2,
                    backgroundColor: theme.colors.muted,
                  }}
                />
              </View>
            ) : null}
          </View>
        ))
      )}

      {note ? (
        <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
          {note}
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * One measurement, at two weights: the figure prominent, its unit quiet beside
 * it.
 *
 * Split out because the value and the unit are one formatting decision made in
 * `formatDriverMeasurement` but two Text nodes on screen, and inlining that made
 * the row unreadable.
 */
function DriverMeasurement({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return <Text variant="bodyStrong">—</Text>;

  const measurement = formatDriverMeasurement(value, unit);
  return (
    <Text variant="bodyStrong">
      {measurement.value}
      {measurement.unit ? (
        <Text variant="caption" muted>
          {measurement.unit === '%' ? '' : ' '}
          {measurement.unit}
        </Text>
      ) : null}
    </Text>
  );
}
